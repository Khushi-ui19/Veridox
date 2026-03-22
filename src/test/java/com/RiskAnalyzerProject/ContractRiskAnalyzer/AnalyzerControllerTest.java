package com.RiskAnalyzerProject.ContractRiskAnalyzer;

import com.RiskAnalyzerProject.ContractRiskAnalyzer.controller.AnalyzerController;
import com.RiskAnalyzerProject.ContractRiskAnalyzer.model.Contract;
import com.RiskAnalyzerProject.ContractRiskAnalyzer.service.ContractService;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AnalyzerController.class)
@AutoConfigureMockMvc(addFilters = false) // Bypasses JWT security filters just for this unit test
public class AnalyzerControllerTest {

    @Autowired
    private MockMvc mockMvc;
    @MockitoBean
    private com.RiskAnalyzerProject.ContractRiskAnalyzer.service.RateLimitingService rateLimitingService;
    // ===========================================================
    // 1. CONTROLLER DEPENDENCIES (Everything Autowired in AnalyzerController)
    // ===========================================================
    @MockitoBean
    private ContractService contractService;

    @MockitoBean
    private com.RiskAnalyzerProject.ContractRiskAnalyzer.service.PdfReportService pdfReportService;


    // ===========================================================
    // 2. SECURITY DEPENDENCIES (Everything Autowired in JwtAuthenticationFilter)
    // ===========================================================
    @MockitoBean
    private com.RiskAnalyzerProject.ContractRiskAnalyzer.util.JwtUtil jwtUtil;

    @MockitoBean
    private com.RiskAnalyzerProject.ContractRiskAnalyzer.service.UserDetailsServiceImpl userDetailsService;

    @MockitoBean
    private com.RiskAnalyzerProject.ContractRiskAnalyzer.service.TokenBlacklistService tokenBlacklistService;

    // ===========================================================

    @Test
    @WithMockUser(username = "testuser") // Simulates a logged-in user
    public void testUploadContract_ReturnsInstantlyAndTriggersAsync() throws Exception {
        // 1. SETUP: Create a fake PDF file
        byte[] fakePdfContent = "Dummy PDF Content".getBytes();
        MockMultipartFile mockFile = new MockMultipartFile(
                "file",
                "test-contract.pdf",
                MediaType.APPLICATION_PDF_VALUE,
                fakePdfContent
        );

        // 2. MOCK: Define what the fast database save should return
        Contract mockPendingContract = new Contract();
        mockPendingContract.setId("ticket-123");
        mockPendingContract.setFilename("test-contract.pdf");
        mockPendingContract.setStatus("PROCESSING");
        mockPendingContract.setOwnerUsername("testuser");

        Mockito.when(contractService.initiateContractAnalysis(
                any(MockMultipartFile.class),
                eq("testuser"),
                eq("General"),
                eq("NDA")
        )).thenReturn(mockPendingContract);

        // Do nothing when the async method is called (since it runs on a background thread)
        Mockito.doNothing().when(contractService).processAsync(eq("ticket-123"), any(byte[].class));

        // 3. EXECUTE: Simulate the React frontend sending the multipart form request
        mockMvc.perform(multipart("/api/contracts/upload")
                        .file(mockFile)
                        .param("jurisdiction", "General")
                        .param("contractType", "NDA")
                        .principal(() -> "testuser"))

                // 4. ASSERT: Verify the HTTP response is blazing fast and correct!
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("ticket-123"))
                .andExpect(jsonPath("$.status").value("PROCESSING"));

        // 5. VERIFY: Ensure the async background thread was successfully triggered
        Mockito.verify(contractService, Mockito.times(1))
                .initiateContractAnalysis(any(), eq("testuser"), eq("General"), eq("NDA"));

        Mockito.verify(contractService, Mockito.times(1))
                .processAsync(eq("ticket-123"), any(byte[].class));
    }
}
