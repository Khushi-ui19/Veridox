package com.RiskAnalyzerProject.ContractRiskAnalyzer;

import com.RiskAnalyzerProject.ContractRiskAnalyzer.exception.AppException;
import com.RiskAnalyzerProject.ContractRiskAnalyzer.model.User;
import com.RiskAnalyzerProject.ContractRiskAnalyzer.repository.UserRepository;
import com.RiskAnalyzerProject.ContractRiskAnalyzer.service.AuthService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class AuthServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private AuthService authService;

    @Test
    public void testResetPassword_Success() {
        // 1. SETUP: Create a valid user with valid OTP
        User user = new User();
        user.setEmail("test@example.com");
        user.setOtp("123456");
        user.setOtpExpiryTime(LocalDateTime.now().plusMinutes(5)); // Valid for 5 mins

        when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.encode("newPass123")).thenReturn("encodedPass");

        // 2. ACTION: Call the method
        authService.resetPassword("test@example.com", "123456", "newPass123");

        // 3. ASSERT: Verify password was updated and OTP cleared
        assertNull(user.getOtp());
        verify(userRepository).save(user);
    }

    @Test
    public void testResetPassword_NullOtp_ShouldThrowException() {
        // 1. SETUP: User exists but has NO OTP (The crash scenario)
        User user = new User();
        user.setEmail("test@example.com");
        user.setOtp(null); // <--- This caused your 500 error before
        user.setOtpExpiryTime(null);

        when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(user));

        // 2. ACTION & ASSERT: Expect an AppException (not NullPointerException)
        Exception exception = assertThrows(AppException.class, () -> {
            authService.resetPassword("test@example.com", "123456", "newPass");
        });

        assertEquals("Invalid request. Please request a new OTP.", exception.getMessage());
    }

    @Test
    public void testResetPassword_ExpiredOtp_ShouldThrowException() {
        // 1. SETUP: OTP expired 5 minutes ago
        User user = new User();
        user.setEmail("test@example.com");
        user.setOtp("123456");
        user.setOtpExpiryTime(LocalDateTime.now().minusMinutes(5));

        when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(user));

        // 2. ACTION & ASSERT
        Exception exception = assertThrows(AppException.class, () -> {
            authService.resetPassword("test@example.com", "123456", "newPass");
        });

        assertEquals("OTP has expired. Please request a new one.", exception.getMessage());
    }
}