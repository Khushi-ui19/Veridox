package com.veridox.service;

import com.veridox.exception.AppException;
import com.veridox.exception.ResourceNotFound;
import com.veridox.model.Contract;
import com.veridox.model.User;
import com.veridox.repository.ContractRepository;

import ch.qos.logback.classic.Logger;

import com.veridox.repository.UserRepository;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Async;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.Loader;

@Service
public class ContractService {

    private static final Logger logger = (Logger) LoggerFactory.getLogger(ContractService.class);
    private static final long MAX_UPLOAD_SIZE_BYTES = 20L * 1024 * 1024;
    private static final int MAX_UPLOAD_PAGES = 15;
    private static final List<String> VISIBLE_STATUSES = Arrays.asList("PROCESSING", "COMPLETED");

    @Autowired
    private ContractRepository contractRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PdfService pdfService;

    @Autowired
    private AiAnalysis aiAnalysis;

    @Autowired
    private RateLimitingService rateLimitingService;

    // 1. FAST METHOD: Starts the process & returns immediately
    public Contract initiateContractAnalysis(MultipartFile file, String username, String jurisdiction, String contractType) throws IOException {
        long fileSize = file.getSize();
        if (fileSize > MAX_UPLOAD_SIZE_BYTES) {
            throw new AppException("File size exceeds 20MB limit. Please upload a PDF up to 20MB.");
        }

        int pageCount;
        try (PDDocument document = Loader.loadPDF(file.getBytes())) {
            pageCount = document.getNumberOfPages();
        } catch (IOException ex) {
            throw new AppException("Unable to read PDF. Please upload a valid PDF file.");
        }

        if (pageCount > MAX_UPLOAD_PAGES) {
            throw new AppException("PDF exceeds 15-page limit. Please upload a PDF with up to 15 pages.");
        }

        // Rate Limit Check
        if (!rateLimitingService.tryConsume(username)) {
            throw new AppException(
                    "Upload limit exceeded! Free accounts are limited to 2 analysis requests per hour."
            );
        }

        // Create "Ticket" in DB
        Contract contract = new Contract();
        String originalFilename = file.getOriginalFilename();
        contract.setFilename((originalFilename != null && !originalFilename.isBlank()) ? originalFilename : "unnamed-contract.pdf");
        contract.setUploadDate(LocalDateTime.now().toString());
        contract.setOwnerUsername(username);
        contract.setJurisdiction(jurisdiction);
        contract.setContractType(contractType);
        contract.setStatus("PROCESSING"); // <--- Set Status
        contract.setAnalysisProgress(0);
        contract.setFileSize(fileSize);
        contract.setPageCount(pageCount);

        return contractRepository.save(contract);
    }

    // Orchestrates upload safely so failed startup does not leave stale PROCESSING rows.
    public Contract startAnalysis(MultipartFile file, String username, String jurisdiction, String contractType) throws IOException {
        byte[] fileBytes = file.getBytes();
        Contract savedContract = initiateContractAnalysis(file, username, jurisdiction, contractType);

        try {
            processAsync(savedContract.getId(), fileBytes);
        } catch (Exception ex) {
            cleanupFailedContract(savedContract.getId());
            throw new AppException("Failed to start analysis. Please try uploading again.");
        }

        return savedContract;
    }

    // 2. SLOW METHOD: Runs in background
    @Async
    public void processAsync(String contractId, byte[] fileBytes) {
        Contract contract = contractRepository.findById(contractId).orElse(null);
        if (contract == null) return;

        try {
            updateProgress(contract, 10);

            // --- CALCULATE PAGE COUNT ---
            try (PDDocument doc = Loader.loadPDF(fileBytes)) {
                contract.setPageCount(doc.getNumberOfPages());
            } catch (Exception e) {
                logger.warn("Could not count pages for contract: " + contractId);
            }
            updateProgress(contract, 25);

            // Heavy Lifting (OCR + AI)
            String text = pdfService.extractTextFromBytes(fileBytes);
            contract.setRawText(text);
            updateProgress(contract, 60);

            String analysis = aiAnalysis.AnalysisContract(text, contract.getJurisdiction(), contract.getContractType());
            contract.setAnalysisJson(analysis);
            updateProgress(contract, 90);

            // Save Result
            contract.setStatus("COMPLETED");
            contract.setAnalysisProgress(100);
            contractRepository.save(contract);

        } catch (Exception e) {
            logger.error("Analysis failed for contract: " + contractId, e);
            cleanupFailedContract(contractId);
        }
    }

    private void cleanupFailedContract(String contractId) {
        try {
            contractRepository.findById(contractId).ifPresent(contract -> {
                contract.setStatus("FAILED");
                contract.setAnalysisProgress(0);
                contractRepository.save(contract);

                // Refund the credit (token) to the user
                if (contract.getOwnerUsername() != null) {
                    rateLimitingService.refundToken(contract.getOwnerUsername());
                }
            });
        } catch (Exception markFailedException) {
            logger.warn("Could not mark failed status for contract: {}", contractId, markFailedException);
        }
    }

    private void updateProgress(Contract contract, int progress) {
        contract.setAnalysisProgress(Math.max(0, Math.min(100, progress)));
        contractRepository.save(contract);
    }
    public String chatWithAi(String question , String contractId , String conversationId, String username){
        String contractText = null;
        if (contractId != null && !contractId.isEmpty() && !contractId.equalsIgnoreCase("general")) {
            Contract contract = contractRepository.findById(contractId)
                    .orElseThrow(() -> new RuntimeException("Contract not found"));
            contractText = contract.getExtractedText();
        }
        return aiAnalysis.chatWithAI(question, contractText, conversationId, username);
    }
    public Optional<Contract> getContractById(String id, String requestingUser) {
        Optional<Contract> contract = contractRepository.findById(id);
        if (contract.isPresent()) {
            User user = userRepository.findByUsername(requestingUser).orElse(null);
            Contract c = contract.get();

            // Allow if owner OR Admin
            if (!c.getOwnerUsername().equals(requestingUser) && (user == null || !"ADMIN".equalsIgnoreCase(user.getRole()))) {
                return Optional.empty();
            }
        }
        return contract;
    }

    public List<Contract> getAllContracts(String username)
    {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFound("User not found"));

        if ("ADMIN".equalsIgnoreCase(user.getRole())) {
            return contractRepository.findByStatusIn(VISIBLE_STATUSES); // Hide failed records by default
        }
        return contractRepository.findByOwnerUsernameAndStatusIn(username, VISIBLE_STATUSES); // Normal user logic
    }

    // DELETE METHOD
    public void deleteContract(String id, String username) {
        Contract contract = contractRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFound("Contract not found with id: " + id));

        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFound("User not found"));

        // Allow if owner OR if Admin
        if (!contract.getOwnerUsername().equals(username) && !"ADMIN".equalsIgnoreCase(user.getRole())) {
            throw new AccessDeniedException("You are not authorized to delete this contract");
        }
        contractRepository.deleteById(id);
    }
}
