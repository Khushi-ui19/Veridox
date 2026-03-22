package com.RiskAnalyzerProject.ContractRiskAnalyzer;

import com.RiskAnalyzerProject.ContractRiskAnalyzer.exception.AppException;
import com.RiskAnalyzerProject.ContractRiskAnalyzer.model.User;
import com.RiskAnalyzerProject.ContractRiskAnalyzer.repository.ContractRepository;
import com.RiskAnalyzerProject.ContractRiskAnalyzer.repository.UserRepository;
import com.RiskAnalyzerProject.ContractRiskAnalyzer.service.AuthService;
import com.RiskAnalyzerProject.ContractRiskAnalyzer.service.RateLimitingService;
import org.springframework.ai.chat.memory.ChatMemoryRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
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

    @Mock
    private ContractRepository contractRepository;

    @Mock
    private RateLimitingService rateLimitingService;

    @Mock
    private ChatMemoryRepository chatMemoryRepository;

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

    @Test
    public void testDeleteUserAccount_CascadeDataCleanup_Success() {
        User user = new User();
        user.setUsername("alice");
        user.setEmail("alice@example.com");
        user.setPassword("encoded-pass");

        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("plain-pass", "encoded-pass")).thenReturn(true);
        when(chatMemoryRepository.findConversationIds())
                .thenReturn(Arrays.asList("alice_111", "bob_222", null, "alice_333"));

        authService.deleteUserAccount("alice", "plain-pass");

        verify(contractRepository).deleteByOwnerUsername("alice");
        verify(chatMemoryRepository).deleteByConversationId("alice_111");
        verify(chatMemoryRepository).deleteByConversationId("alice_333");
        verify(chatMemoryRepository, never()).deleteByConversationId("bob_222");
        verify(rateLimitingService).clearUserRateLimit("alice");
        verify(userRepository).delete(user);
    }

    @Test
    public void testDeleteUserAccount_IncorrectPassword_ShouldNotDeleteAnything() {
        User user = new User();
        user.setUsername("alice");
        user.setEmail("alice@example.com");
        user.setPassword("encoded-pass");

        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("wrong-pass", "encoded-pass")).thenReturn(false);

        Exception exception = assertThrows(RuntimeException.class, () ->
                authService.deleteUserAccount("alice", "wrong-pass"));

        assertEquals("Incorrect password.", exception.getMessage());
        verifyNoInteractions(contractRepository, rateLimitingService, chatMemoryRepository);
        verify(userRepository, never()).delete(any());
    }
}
