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
import org.springframework.test.web.servlet.ResultHandler;

import java.util.HashMap;
import java.util.Map;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultHandlers.print;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
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
    @Test
    public void testResetPasswordEndpoint_Success() throws Exception {
        // 1. SETUP: Mock the service call to do nothing (void)
        doNothing().when(authService).resetPassword("test@example.com", "123456", "newPass");

        // 2. Prepare JSON Request
        Map<String, String> requestMap = new HashMap<>();
        requestMap.put("email", "test@example.com");
        requestMap.put("otp", "123456");
        requestMap.put("newPassword", "newPass");

        String jsonContent = objectMapper.writeValueAsString(requestMap);

        // 3. ACTION: Hit the API
        mockMvc.perform(post("/api/auth/forgot-password/reset")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonContent))
                .andExpect(status().isOk()) // Expect 200 OK
                .andExpect(jsonPath("$.message").value("Password reset successfully. You can now login."));
    }
    @Test
    public void testRegister_DebugError() throws Exception {
        // 1. SETUP: Create JSON
        String jsonRequest = """
            {
                "username": "DebugUser",
                "email": "DebugUser@gmail.com",
                "password": "pass"
            }
        """;

        // ✅ FIX: Tell the Fake Service to return a String, not null
        when(authService.registerUser(any())).thenReturn("Verification code sent!");

        // 2. ACTION: Hit the API
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonRequest))
                .andExpect(status().isOk()); // Now it will be 200 OK
    }


}