package com.RiskAnalyzerProject.ContractRiskAnalyzer.controller;

import com.RiskAnalyzerProject.ContractRiskAnalyzer.dto.ChatRequest;
import com.RiskAnalyzerProject.ContractRiskAnalyzer.model.Contract;
import com.RiskAnalyzerProject.ContractRiskAnalyzer.service.ContractService;
import java.io.IOException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.security.Principal;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/contracts")
@CrossOrigin(origins = "*")
public class AnalyzerController {

    @Autowired
    private ContractService contractService;

    @Autowired
    private com.RiskAnalyzerProject.ContractRiskAnalyzer.service.PdfReportService pdfReportService;

    @Autowired
    private com.RiskAnalyzerProject.ContractRiskAnalyzer.service.RateLimitingService rateLimitingService;

    @GetMapping
    public List<Contract> getAllContracts( Principal principal) {
        return contractService.getAllContracts(principal.getName());
    }
    @GetMapping("/{id}")
    public ResponseEntity<Contract> getContractById(@PathVariable String id, Principal principal) {
            return contractService.getContractById(id,principal.getName())
                    .map(ResponseEntity::ok)
                    .orElse(ResponseEntity.status(403).build());
        }
    @GetMapping("/{id}/download-report")
    public ResponseEntity<byte[]> downloadReport(@PathVariable String id, Principal principal) throws IOException {
        Contract contract = contractService.getContractById(id, principal.getName())
                .orElseThrow(() -> new RuntimeException("Contract not found or access denied"));
        // 1. Generate PDF
        byte[] pdfBytes = pdfReportService.generateContractReport(contract);
        return ResponseEntity.ok()
                .header(org.springframework.http.HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=Analysis_Report_" + contract.getFilename() + ".pdf")
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdfBytes);
    }
    @GetMapping("/rate-limit")
    public ResponseEntity<Map<String, Object>> getRateLimit(Principal principal) {
        String username = principal.getName();
        long remaining = rateLimitingService.getRemainingTokens(username);
        long waitForRefillMs = rateLimitingService.getTimeUntilRefill(username);

        return ResponseEntity.ok(Map.of(
                "remaining", remaining,
                "isUnlimited", remaining > 100,
                // Send the absolute timestamp when the reset will happen
                "resetTime", System.currentTimeMillis() + waitForRefillMs
        ));
    }
    @GetMapping("/{id}/status")
    public ResponseEntity<Map<String, String>> getContractStatus(@PathVariable String id, Principal principal) {
        Contract contract = contractService.getContractById(id, principal.getName())
                .orElseThrow(() -> new RuntimeException("Contract not found"));

        return ResponseEntity.ok(Map.of(
                "status", contract.getStatus() != null ? contract.getStatus() : "UNKNOWN",
                "id", contract.getId()
        ));
    }

    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Contract> uploadContract(
            @RequestParam("file") MultipartFile file,
            Principal principal,
            @RequestParam(value = "jurisdiction", defaultValue = "General") String jurisdiction,
            @RequestParam(value = "contractType", defaultValue = "General Contract") String contractType) throws IOException {

        // Calls the FAST method now
        Contract savedContract = contractService.initiateContractAnalysis(file, principal.getName(), jurisdiction, contractType);
        return ResponseEntity.ok(savedContract);
    }
    @PostMapping("/chat")
    public ResponseEntity<Map<String, String>> chatWithAI(@RequestBody ChatRequest request , Principal principal) {
            // Call the single unified method
            String conversationId = request.getConversationId();
            if (conversationId == null || conversationId.isEmpty()) {
                conversationId = UUID.randomUUID().toString();
            }
            String secureConversationId = principal.getName() + "_" + conversationId;

            String response = contractService.chatWithAi(
                    request.getQuestion(),
                    request.getContractId(),
                    secureConversationId
            );
            return ResponseEntity.ok(Map.of(
                    "response", response,
                    "conversationId", conversationId
            ));
    }
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteContract(@PathVariable String id, Principal principal) {
            contractService.deleteContract(id, principal.getName());
            return ResponseEntity.ok(Map.of("message", "Contract deleted successfully"));
        }
}
