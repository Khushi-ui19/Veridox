package com.veridox;

import com.veridox.exception.AppException;
import com.veridox.model.User;
import com.veridox.repository.ContractRepository;
import com.veridox.repository.UserRepository;
import com.veridox.service.AuthService;
import com.veridox.service.EmailService;
import com.veridox.service.RateLimitingService;
import com.veridox.util.JwtUtil;
import org.springframework.ai.chat.memory.ChatMemoryRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;
import java.util.Arrays;
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
    private EmailService emailService;

    @Mock
    private ContractRepository contractRepository;

    @Mock
    private RateLimitingService rateLimitingService;

    @Mock
    private ChatMemoryRepository chatMemoryRepository;

    @Mock
    private JwtUtil jwtUtil;

    @InjectMocks
    private AuthService authService;

    @Test
    public void testResetPassword_Success() {
        // 1. SETUP: Create a valid user with valid OTP
        User user = new User();
        user.setEmail("test@example.com");
        user.setOtp("123456");
        user.setOtpExpiryTime(LocalDateTime.now().plusMinutes(5)); // Valid for 5 mins

        when(userRepository.findByEmailIgnoreCase("test@example.com")).thenReturn(Optional.of(user));
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

        when(userRepository.findByEmailIgnoreCase("test@example.com")).thenReturn(Optional.of(user));

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

        when(userRepository.findByEmailIgnoreCase("test@example.com")).thenReturn(Optional.of(user));

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

        when(userRepository.findByUsernameIgnoreCase("alice")).thenReturn(Optional.of(user));
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

        when(userRepository.findByUsernameIgnoreCase("alice")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("wrong-pass", "encoded-pass")).thenReturn(false);

        Exception exception = assertThrows(RuntimeException.class, () ->
                authService.deleteUserAccount("alice", "wrong-pass"));

        assertEquals("Incorrect password.", exception.getMessage());
        verifyNoInteractions(contractRepository, rateLimitingService, chatMemoryRepository);
        verify(userRepository, never()).delete(any());
    }

    @Test
    public void testLoginUser_AllowsEmailIdentifier() {
        User user = new User();
        user.setUsername("alice");
        user.setEmail("alice@example.com");
        user.setPassword("$2a$10$encodedHash");
        user.setVerified(true);

        when(userRepository.findByEmailIgnoreCase("alice@example.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("plain-pass", "$2a$10$encodedHash")).thenReturn(true);

        String result = authService.loginUser(new User(null, "ALICE@EXAMPLE.COM", null, "plain-pass", null, null, null, false));

        assertEquals("OTP sent to email", result);
        assertNotNull(user.getOtp());
        assertNotNull(user.getOtpExpiryTime());
        verify(userRepository).save(user);
        verify(emailService).sendOtpEmail(eq("alice@example.com"), anyString());
    }

    @Test
    public void testLoginUser_LegacyPlaintextPassword_IsUpgraded() {
        User user = new User();
        user.setUsername("legacy");
        user.setEmail("legacy@example.com");
        user.setPassword("plain-pass");
        user.setVerified(true);

        when(userRepository.findByUsernameIgnoreCase("legacy")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("plain-pass", "plain-pass")).thenReturn(false);
        when(passwordEncoder.encode("plain-pass")).thenReturn("$2a$10$newHash");

        String result = authService.loginUser(new User(null, "legacy", null, "plain-pass", null, null, null, false));

        assertEquals("OTP sent to email", result);
        assertEquals("$2a$10$newHash", user.getPassword());
        verify(userRepository, times(2)).save(user);
        verify(emailService).sendOtpEmail(eq("legacy@example.com"), anyString());
    }

    @Test
    public void testLoginUser_LegacyPersistedUserWithoutVerifiedFlag_IsAutoVerified() {
        User user = new User();
        user.setUsername("olduser");
        user.setEmail("olduser@example.com");
        user.setPassword("$2a$10$encodedHash");
        user.setVerified(false);

        when(userRepository.findByUsernameIgnoreCase("olduser")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("plain-pass", "$2a$10$encodedHash")).thenReturn(true);

        String result = authService.loginUser(new User(null, "olduser", null, "plain-pass", null, null, null, false));

        assertEquals("OTP sent to email", result);
        assertTrue(user.isVerified());
        assertNotNull(user.getOtp());
        assertNotNull(user.getOtpExpiryTime());
        verify(userRepository, times(2)).save(user);
        verify(emailService).sendOtpEmail(eq("olduser@example.com"), anyString());
    }

    @Test
    public void testLoginUser_LegacyPasswordWithTrailingWhitespace_StillMatches() {
        User user = new User();
        user.setUsername("spaceuser");
        user.setEmail("spaceuser@example.com");
        user.setPassword("$2a$10$encodedHash");
        user.setVerified(true);

        when(userRepository.findByUsernameIgnoreCase("spaceuser")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("plain-pass ", "$2a$10$encodedHash")).thenReturn(false);
        when(passwordEncoder.matches("plain-pass", "$2a$10$encodedHash")).thenReturn(true);

        String result = authService.loginUser(new User(null, "spaceuser", null, "plain-pass ", null, null, null, false));

        assertEquals("OTP sent to email", result);
        verify(userRepository).save(user);
        verify(emailService).sendOtpEmail(eq("spaceuser@example.com"), anyString());
    }

    @Test
    public void testVerifyLoginOtp_AllowsEmailIdentifier() {
        User user = new User();
        user.setUsername("alice");
        user.setEmail("alice@example.com");
        user.setRole("USER");
        user.setOtp("123456");
        user.setOtpExpiryTime(LocalDateTime.now().plusMinutes(1));

        when(userRepository.findByEmailIgnoreCase("alice@example.com")).thenReturn(Optional.of(user));
        when(jwtUtil.generateToken("alice")).thenReturn("jwt-token");

        var result = authService.verifyLoginOtp("ALICE@EXAMPLE.COM", "123456");

        assertEquals("jwt-token", result.get("jwt"));
        assertEquals("alice", result.get("username"));
        assertEquals("alice@example.com", result.get("email"));
        assertNull(user.getOtp());
        assertNull(user.getOtpExpiryTime());
        verify(userRepository).save(user);
    }
}
