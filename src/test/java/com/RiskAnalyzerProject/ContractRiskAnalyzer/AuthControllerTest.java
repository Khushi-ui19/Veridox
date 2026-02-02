package com.RiskAnalyzerProject.ContractRiskAnalyzer;

import com.RiskAnalyzerProject.ContractRiskAnalyzer.dto.LoginRequest;
import com.RiskAnalyzerProject.ContractRiskAnalyzer.service.AuthService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
public class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc; // Simulates Postman

    @MockitoBean
    private AuthService authService; // Fake Service

    @Autowired
    private ObjectMapper objectMapper; // Converts Objects to JSON

    @Test
    public void testLoginSuccess() throws Exception {
        // 1. SETUP: Prepare Request
        LoginRequest loginRequest = new LoginRequest();
        loginRequest.setUsername("animesh");
        loginRequest.setPassword("password123");

        // Mock the service response
        when(authService.loginUser(any())).thenReturn("OTP sent to email");

        // 2. ACTION & ASSERT: Perform POST request
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isOk()); // Expect HTTP 200 OK
    }
}