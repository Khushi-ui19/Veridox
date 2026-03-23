package com.RiskAnalyzerProject.ContractRiskAnalyzer;

import com.RiskAnalyzerProject.ContractRiskAnalyzer.exception.AppException;
import com.RiskAnalyzerProject.ContractRiskAnalyzer.model.Contract;
import com.RiskAnalyzerProject.ContractRiskAnalyzer.model.User;
import com.RiskAnalyzerProject.ContractRiskAnalyzer.repository.ContractRepository;
import com.RiskAnalyzerProject.ContractRiskAnalyzer.repository.UserRepository;
import com.RiskAnalyzerProject.ContractRiskAnalyzer.service.AiAnalysis;
import com.RiskAnalyzerProject.ContractRiskAnalyzer.service.ContractService;
import com.RiskAnalyzerProject.ContractRiskAnalyzer.service.PdfService;
import com.RiskAnalyzerProject.ContractRiskAnalyzer.service.RateLimitingService;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.Collections;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
public class ContractServiceTest {

    @Mock
    private ContractRepository contractRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private PdfService pdfService;

    @Mock
    private AiAnalysis aiAnalysis;

    @Mock
    private RateLimitingService rateLimitingService;

    @InjectMocks
    private ContractService contractService;

    @Test
    public void initiateContractAnalysis_WhenFileExceeds20Mb_ShouldThrowAppException() {
        byte[] bytes = new byte[21 * 1024 * 1024];
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "oversized.pdf",
                "application/pdf",
                bytes
        );

        AppException ex = assertThrows(AppException.class, () ->
                contractService.initiateContractAnalysis(file, "testuser", "General", "General Contract")
        );

        assertEquals("File size exceeds 20MB limit. Please upload a PDF up to 20MB.", ex.getMessage());
        verify(rateLimitingService, never()).tryConsume(any());
        verify(contractRepository, never()).save(any());
    }

    @Test
    public void initiateContractAnalysis_WhenPdfExceeds15Pages_ShouldThrowAppException() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "too-many-pages.pdf",
                "application/pdf",
                createPdfWithPages(16)
        );

        AppException ex = assertThrows(AppException.class, () ->
                contractService.initiateContractAnalysis(file, "testuser", "General", "General Contract")
        );

        assertEquals("PDF exceeds 15-page limit. Please upload a PDF with up to 15 pages.", ex.getMessage());
        verify(rateLimitingService, never()).tryConsume(any());
        verify(contractRepository, never()).save(any());
    }

    @Test
    public void initiateContractAnalysis_WhenPdfWithinLimits_ShouldCreateProcessingContract() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "valid.pdf",
                "application/pdf",
                createPdfWithPages(2)
        );

        when(rateLimitingService.tryConsume("testuser")).thenReturn(true);
        when(contractRepository.save(any(Contract.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Contract saved = contractService.initiateContractAnalysis(file, "testuser", "General", "General Contract");

        assertEquals("PROCESSING", saved.getStatus());
        assertEquals(2, saved.getPageCount());
        assertEquals(file.getSize(), saved.getFileSize());
        verify(contractRepository).save(any(Contract.class));
    }

    @Test
    public void getAllContracts_ForNormalUser_ShouldUseVisibleStatusesOnly() {
        User user = new User();
        user.setUsername("testuser");
        user.setRole("USER");
        when(userRepository.findByUsername("testuser")).thenReturn(java.util.Optional.of(user));
        when(contractRepository.findByOwnerUsernameAndStatusIn(eq("testuser"), anyList())).thenReturn(Collections.emptyList());

        List<Contract> result = contractService.getAllContracts("testuser");

        assertEquals(0, result.size());
        verify(contractRepository).findByOwnerUsernameAndStatusIn(eq("testuser"), anyList());
        verify(contractRepository, never()).findByOwnerUsername("testuser");
    }

    @Test
    public void getAllContracts_ForAdmin_ShouldUseVisibleStatusesOnly() {
        User admin = new User();
        admin.setUsername("admin");
        admin.setRole("ADMIN");
        when(userRepository.findByUsername("admin")).thenReturn(java.util.Optional.of(admin));
        when(contractRepository.findByStatusIn(anyList())).thenReturn(Collections.emptyList());

        List<Contract> result = contractService.getAllContracts("admin");

        assertEquals(0, result.size());
        verify(contractRepository).findByStatusIn(anyList());
        verify(contractRepository, never()).findAll();
    }

    private byte[] createPdfWithPages(int pages) throws IOException {
        try (PDDocument document = new PDDocument(); ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {
            for (int i = 0; i < pages; i++) {
                document.addPage(new PDPage());
            }
            document.save(outputStream);
            return outputStream.toByteArray();
        }
    }
}
