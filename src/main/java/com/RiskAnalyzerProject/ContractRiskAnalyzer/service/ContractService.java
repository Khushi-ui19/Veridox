package com.RiskAnalyzerProject.ContractRiskAnalyzer.service;

import com.RiskAnalyzerProject.ContractRiskAnalyzer.exception.ResourceNotFound;
import com.RiskAnalyzerProject.ContractRiskAnalyzer.model.Contract;
import com.RiskAnalyzerProject.ContractRiskAnalyzer.model.User;
import com.RiskAnalyzerProject.ContractRiskAnalyzer.repository.ContractRepository;

import ch.qos.logback.classic.Logger;

import com.RiskAnalyzerProject.ContractRiskAnalyzer.repository.UserRepository;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Async;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.Loader;

@Service
public class ContractService {

    private static final Logger logger = (Logger) LoggerFactory.getLogger(ContractService.class);

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
        // Rate Limit Check
        if (!rateLimitingService.tryConsume(username)) {
            throw new com.RiskAnalyzerProject.ContractRiskAnalyzer.exception.AppException(
                    "Upload limit exceeded! Free accounts are limited to 2 analysis requests per hour."
            );
        }

        // Create "Ticket" in DB
        Contract contract = new Contract();
        contract.setFilename(file.getOriginalFilename());
        contract.setUploadDate(LocalDateTime.now().toString());
        contract.setOwnerUsername(username);
        contract.setJurisdiction(jurisdiction);
        contract.setContractType(contractType);
        contract.setStatus("PROCESSING"); // <--- Set Status
        contract.setAnalysisProgress(0);
        contract.setFileSize(file.getSize());

        return contractRepository.save(contract);
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
            contract.setStatus("FAILED");
            if (contract.getAnalysisProgress() == null) {
                contract.setAnalysisProgress(0);
            }
            contractRepository.save(contract);
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
            return contractRepository.findAll(); // Admin sees everything
        }
        return contractRepository.findByOwnerUsername(username); // Normal user logic
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
