package com.RiskAnalyzerProject.ContractRiskAnalyzer;

import com.RiskAnalyzerProject.ContractRiskAnalyzer.controller.AuthController;
import com.RiskAnalyzerProject.ContractRiskAnalyzer.dto.LoginRequest;
import com.RiskAnalyzerProject.ContractRiskAnalyzer.model.User;
import com.RiskAnalyzerProject.ContractRiskAnalyzer.service.AuthService;
import com.RiskAnalyzerProject.ContractRiskAnalyzer.util.JwtUtil;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.HashMap;
import java.util.Map;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

//@SpringBootTest
@WebMvcTest(AuthController.class)
@AutoConfigureMockMvc(addFilters = false)
public class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc; // Simulates Postman

    @MockitoBean
    private AuthService authService; // Fake Service

    @Autowired
    private ObjectMapper objectMapper; // Converts Objects to JSON
    @MockitoBean
    private JwtUtil jwtUtil;
    @MockitoBean
    private com.RiskAnalyzerProject.ContractRiskAnalyzer.service.UserDetailsServiceImpl userDetailsService;

    @MockitoBean
    private com.RiskAnalyzerProject.ContractRiskAnalyzer.service.TokenBlacklistService tokenBlacklistService;
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
    public void testLoginVerify_ReturnsCookieAndUserPayload() throws Exception {
        Map<String, String> verifyResult = new HashMap<>();
        verifyResult.put("jwt", "mocked-jwt");
        verifyResult.put("username", "animesh");
        verifyResult.put("email", "animesh@example.com");
        verifyResult.put("role", "USER");

        when(authService.verifyLoginOtp(eq("animesh"), eq("123456"))).thenReturn(verifyResult);

        mockMvc.perform(post("/api/auth/login/verify")
                        .param("username", "animesh")
                        .param("otp", "123456"))
                .andExpect(status().isOk())
                .andExpect(cookie().exists("jwtToken"))
                .andExpect(cookie().value("jwtToken", "mocked-jwt"))
                .andExpect(jsonPath("$.message").value("Login Successful"))
                .andExpect(jsonPath("$.user.username").value("animesh"))
                .andExpect(jsonPath("$.user.email").value("animesh@example.com"))
                .andExpect(jsonPath("$.user.role").value("USER"));
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
    @Test
    public void testCompleteOAuthRegistration_NewUser_ReturnsHttpOnlyCookie() throws Exception {
        // 1. SETUP: Define the test data
        String tempToken = "dummy-temp-token";
        String email = "newuser@example.com";
        String username = "newuser";
        String expectedJwt = "secure-mocked-jwt-token";

        // Tell JwtUtil to accept the temp token as valid
        Mockito.when(jwtUtil.validateToken(tempToken, email)).thenReturn(true);

        // Tell AuthService this is a brand new user (doesn't exist yet)
        Mockito.when(authService.emailExists(email)).thenReturn(false);

        // Mock the final login JWT generation
        Mockito.when(jwtUtil.generateToken(username)).thenReturn(expectedJwt);

        // Do nothing when saving the user to the database (since we don't want to actually touch MongoDB)
        Mockito.doNothing().when(authService).registerOAuthUser(any(User.class));

        // Create the JSON payload that your React Complete Registration form would send
        String requestPayload = """
            {
                "tempToken": "dummy-temp-token",
                "email": "newuser@example.com",
                "username": "newuser",
                "password": "securepassword123"
            }
        """;

        // 2. EXECUTE & ASSERT
        mockMvc.perform(post("/api/auth/oauth-complete")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestPayload))

                // Verify the HTTP Status is 200 OK
                .andExpect(status().isOk())

                // Verify the JSON response body
                .andExpect(jsonPath("$.message").value("Registration and Login Successful"))

                // THE MOST IMPORTANT PART: Verify the HttpOnly Cookie is attached exactly right!
                .andExpect(cookie().exists("jwtToken"))
                .andExpect(cookie().value("jwtToken", expectedJwt))
                .andExpect(cookie().httpOnly("jwtToken", true))
                .andExpect(cookie().secure("jwtToken", true)); // ** NOTE: Change to false if your controller is currently set to false for local testing!

        // 3. VERIFY: Ensure the database save method was actually triggered
        Mockito.verify(authService, Mockito.times(1)).registerOAuthUser(any(User.class));
    }
}
