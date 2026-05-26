package com.veridox.service;

import com.veridox.exception.AppException;
import com.veridox.exception.ResourceNotFound;
import com.veridox.model.User;
import com.veridox.repository.ContractRepository;
import com.veridox.repository.UserRepository;
import com.veridox.util.JwtUtil;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.ai.chat.memory.ChatMemoryRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.authentication.logout.SecurityContextLogoutHandler;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Random;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class AuthService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private EmailService emailService;

    @Autowired
    private TokenBlacklistService tokenBlacklistService;

    @Autowired
    private ContractRepository contractRepository;

    @Autowired
    private RateLimitingService rateLimitingService;

    @Autowired
    private ChatMemoryRepository chatMemoryRepository;

    // --- TEMPORARY STORAGE (RAM) ---
    // Users stay here until they verify OTP. If server restarts, these are lost (which is fine).
    private final Map<String, User> pendingRegistrations = new ConcurrentHashMap<>();

    public boolean emailExists(String email) {
        return userRepository.existsByEmailIgnoreCase(normalizeEmail(email));
    }

    public User getUserByEmail(String email) {
        return userRepository.findByEmailIgnoreCase(normalizeEmail(email))
                .orElseThrow(() -> new ResourceNotFound("User not found"));
    }

    // STEP 1: Register (Save to RAM only)
    public String registerUser(User user) {
        if (user.getUsername() != null) user.setUsername(user.getUsername().trim());
        if (user.getEmail() != null) user.setEmail(normalizeEmail(user.getEmail()));
        if (user.getPassword() != null) user.setPassword(passwordEncoder.encode(user.getPassword().trim()));
        // 1. Check DB for existing users (Real MongoDB check)
        if (userRepository.existsByEmailIgnoreCase(user.getEmail())) {
            throw new AppException("Error: Email is already in use!");
        }
        if (userRepository.existsByUsernameIgnoreCase(user.getUsername())) {
            throw new AppException("Error: Username is already taken!");
        }

        // 2. Prepare User Object
        user.setVerified(false); // Not verified yet

        if (user.getRole() == null || user.getRole().isEmpty()) {
            user.setRole("USER");
        }

        // 3. Generate OTP
        String otp = String.valueOf(new Random().nextInt(900000) + 100000);
        user.setOtp(otp);
        user.setOtpExpiryTime(LocalDateTime.now().plusMinutes(1));

        // 4. Send Email FIRST
        // If this fails (e.g. fake email), code crashes here and nothing is saved anywhere.
        try {
            emailService.sendOtpEmail(user.getEmail(), otp);
        } catch (Exception e) {
            throw new AppException("Error: Could not send email. Please check the address.");
        }

        // 5. Save to Temporary Map (RAM) - NOT Database
        pendingRegistrations.put(user.getEmail(), user);

        return "Verification code sent to email";
    }

    // STEP 2: Verify OTP (Move from RAM -> MongoDB)
    public void verifyRegistration(String email, String otp) {
        String normalizedEmail = normalizeEmail(email);
        // 1. Look in RAM
        User pendingUser = pendingRegistrations.get(normalizedEmail);
        if (pendingUser == null) {
            // If not in RAM, maybe they verified already?
            if (userRepository.existsByEmailIgnoreCase(normalizedEmail)) {
                throw new AppException("User already registered. Please Login.");
            }
            throw new ResourceNotFound("Session expired or invalid email. Please register again.");
        }

        // 2. Validate OTP
        if (pendingUser.getOtpExpiryTime().isBefore(LocalDateTime.now())) {
            pendingRegistrations.remove(normalizedEmail);
            throw new AppException("OTP has expired. Please register again.");
        }

        if (!pendingUser.getOtp().equals(otp.trim())) {
            throw new BadCredentialsException("Invalid OTP");
        }

        // 3. Success! Save to Real Database
        pendingUser.setVerified(true);
        pendingUser.setOtp(null);

        userRepository.save(pendingUser); // <--- SAVED TO DB NOW

        // 4. Remove from RAM
        pendingRegistrations.remove(normalizedEmail);
    }

    // STEP 3: Resend OTP (Update RAM)
    public void resendRegistrationOtp(String email) {
        String normalizedEmail = normalizeEmail(email);
        User pendingUser = pendingRegistrations.get(normalizedEmail);

        if (pendingUser == null) {
            if (userRepository.existsByEmailIgnoreCase(normalizedEmail)) {
                throw new AppException("User already registered. Please Login.");
            }
            throw new ResourceNotFound("Session expired. Please register again.");
        }

        // Generate New OTP
        String newOtp = String.valueOf(new Random().nextInt(900000) + 100000);
        pendingUser.setOtp(newOtp);
        pendingUser.setOtpExpiryTime(LocalDateTime.now().plusMinutes(1));

        try {
            emailService.sendOtpEmail(pendingUser.getEmail(), newOtp);
        } catch (Exception e) {
            throw new AppException("Failed to resend email.");
        }

        // Update RAM
        pendingRegistrations.put(normalizedEmail, pendingUser);
    }
    public void registerOAuthUser(User user) {
        if (user.getUsername() != null) user.setUsername(user.getUsername().trim());
        if (user.getEmail() != null) user.setEmail(normalizeEmail(user.getEmail()));

        if (userRepository.existsByEmailIgnoreCase(user.getEmail())) {
            throw new AppException("Error: Email is already in use!");
        }
        if (userRepository.existsByUsernameIgnoreCase(user.getUsername())) {
            throw new AppException("Error: Username is already taken!");
        }

        user.setVerified(true); // Auto-verify OAuth users
        user.setPassword(passwordEncoder.encode(user.getPassword())); // Encode password
        if (user.getRole() == null || user.getRole().isEmpty()) {
            user.setRole("USER");
        }

        userRepository.save(user); // Save directly to DB, skipping OTP/RAM map
    }

    private String normalizeCredential(String value) {
        return value == null ? "" : value.trim();
    }

    private String normalizeEmail(String value) {
        return normalizeCredential(value).toLowerCase(Locale.ROOT);
    }

    private Optional<User> findUserByLoginIdentifierOptional(String loginIdentifier) {
        String normalizedIdentifier = normalizeCredential(loginIdentifier);
        if (normalizedIdentifier.isEmpty()) {
            return Optional.empty();
        }

        if (normalizedIdentifier.contains("@")) {
            String normalizedEmail = normalizeEmail(normalizedIdentifier);
            return userRepository.findByEmailIgnoreCase(normalizedEmail)
                    .or(() -> userRepository.findByUsernameIgnoreCase(normalizedIdentifier));
        }

        return userRepository.findByUsernameIgnoreCase(normalizedIdentifier)
                .or(() -> userRepository.findByEmailIgnoreCase(normalizedIdentifier));
    }

    private User findUserByLoginIdentifier(String loginIdentifier) {
        return findUserByLoginIdentifierOptional(loginIdentifier)
                .orElseThrow(() -> new BadCredentialsException("Invalid username or password"));
    }

    private void verifyPasswordOrUpgradeLegacyHash(User user, String rawPassword) {
        String exactPassword = rawPassword == null ? "" : rawPassword;
        String trimmedPassword = exactPassword.trim();
        String storedPassword = user.getPassword();

        if (storedPassword == null || storedPassword.isBlank()) {
            throw new BadCredentialsException("Invalid username or password");
        }

        if (passwordEncoder.matches(exactPassword, storedPassword)) {
            return;
        }

        if (!trimmedPassword.equals(exactPassword) && passwordEncoder.matches(trimmedPassword, storedPassword)) {
            return;
        }

        // Support older accounts created before password hashing was enforced.
        if (exactPassword.equals(storedPassword)) {
            user.setPassword(passwordEncoder.encode(exactPassword));
            userRepository.save(user);
            return;
        }

        if (!trimmedPassword.equals(exactPassword) && trimmedPassword.equals(storedPassword)) {
            user.setPassword(passwordEncoder.encode(trimmedPassword));
            userRepository.save(user);
            return;
        }

        throw new BadCredentialsException("Invalid username or password");
    }

    private void ensurePersistedUserVerified(User user) {
        if (user.isVerified()) {
            return;
        }

        // Compatibility path for legacy database records created before the verified
        // flag was stored reliably. Current registrations are only persisted after OTP
        // verification, so an existing DB user should be considered verified.
        user.setVerified(true);
        userRepository.save(user);
    }

    public String loginUser(User loginRequest) {
        User user = findUserByLoginIdentifier(loginRequest.getUsername());
        verifyPasswordOrUpgradeLegacyHash(user, loginRequest.getPassword());
        ensurePersistedUserVerified(user);

        String otp = String.valueOf(new Random().nextInt(900000) + 100000);
        user.setOtp(otp);
        user.setOtpExpiryTime(LocalDateTime.now().plusMinutes(1));
        userRepository.save(user);

        emailService.sendOtpEmail(user.getEmail(), otp);
        return "OTP sent to email";
    }

    public Map<String, String> verifyLoginOtp(String username, String otp) {
        User user = findUserByLoginIdentifier(username);

        if (user.getOtp() == null || user.getOtpExpiryTime() == null) {
            throw new AppException("No active OTP request. Please login again.");
        }

        if (user.getOtpExpiryTime().isBefore(LocalDateTime.now())) {
            throw new AppException("OTP has expired.");
        }
        if (!user.getOtp().equals(otp.trim())) {
            throw new BadCredentialsException("Invalid OTP");
        }

        user.setOtp(null);
        user.setOtpExpiryTime(null);
        userRepository.save(user);

        Map<String, String> result = new ConcurrentHashMap<>();
        result.put("jwt", jwtUtil.generateToken(user.getUsername()));
        result.put("username", user.getUsername());
        result.put("email", user.getEmail());
        result.put("role", user.getRole());
        return result;
    }

    public void logOutUser(HttpServletRequest request, HttpServletResponse response) {
        String authHeader = request.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);
            tokenBlacklistService.blacklistToken(token);
        }

        // Standard logout
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null) {
            new SecurityContextLogoutHandler().logout(request, response, authentication);
        }
    }

    public User getUserProfile(String username) {
        return userRepository.findByUsernameIgnoreCase(normalizeCredential(username))
                .or(() -> userRepository.findByEmailIgnoreCase(normalizeCredential(username)))
                .orElseThrow(() -> new ResourceNotFound("User not found"));
    }

    public void initiatePasswordReset(String email) {
        User user = getUserByEmail(email);
        String otp = String.valueOf(new Random().nextInt(900000) + 100000);
        user.setOtp(otp);
        user.setOtpExpiryTime(LocalDateTime.now().plusMinutes(1));
        userRepository.save(user);
        emailService.sendResetPasswordEmail(user.getEmail(), otp);
    }

    public void verifyOtp(String email, String otp) {
        User user = getUserByEmail(email);
        if (user.getOtpExpiryTime().isBefore(LocalDateTime.now())) throw new AppException("OTP expired");
        if (!user.getOtp().equals(otp)) throw new BadCredentialsException("Invalid OTP");
    }

    public void resetPassword(String email, String otp, String newPassword) {
        User user = getUserByEmail(email);

        if (user.getOtp() == null || user.getOtpExpiryTime() == null) {
            throw new AppException("Invalid request. Please request a new OTP.");
        }
        if (user.getOtpExpiryTime().isBefore(LocalDateTime.now())) {
            throw new AppException("OTP has expired. Please request a new one."); // GlobalExceptionHandler handles RuntimeException generally, or use AppException
        }

        if (!user.getOtp().equals(otp)) {
            throw new org.springframework.security.authentication.BadCredentialsException("Invalid OTP");
        }

        // Update Password
        user.setPassword(passwordEncoder.encode(newPassword));
        user.setOtp(null); // Clear used OTP
        user.setOtpExpiryTime(null); // Clean up the expiry time too
        userRepository.save(user);
    }

    public void deleteUserAccount(String username, String password) {
        User user = userRepository.findByUsernameIgnoreCase(normalizeCredential(username))
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (!passwordEncoder.matches(password, user.getPassword())) {
            throw new RuntimeException("Incorrect password.");
        }

        // 1) Delete all uploaded contracts owned by this user
        contractRepository.deleteByOwnerUsername(username);

        // 2) Delete all persisted chat memory conversations for this user
        // This app prefixes conversation IDs as "<username>_<uuid>".
        final String conversationPrefix = username + "_";
        chatMemoryRepository.findConversationIds().stream()
                .filter(conversationId -> conversationId != null && conversationId.startsWith(conversationPrefix))
                .forEach(chatMemoryRepository::deleteByConversationId);

        // 3) Drop in-memory rate-limit bucket for this user
        rateLimitingService.clearUserRateLimit(username);

        // 4) Remove any pending registration cache entries tied to this user/email
        pendingRegistrations.remove(normalizeEmail(user.getEmail()));
        pendingRegistrations.entrySet().removeIf(entry ->
                entry.getValue() != null && username.equalsIgnoreCase(entry.getValue().getUsername()));

        // 5) Finally delete user account
        userRepository.delete(user);
    }
}
