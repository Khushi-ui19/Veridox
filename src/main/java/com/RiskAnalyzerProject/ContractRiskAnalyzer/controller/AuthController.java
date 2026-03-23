package com.RiskAnalyzerProject.ContractRiskAnalyzer.controller;

import com.RiskAnalyzerProject.ContractRiskAnalyzer.model.User;
import com.RiskAnalyzerProject.ContractRiskAnalyzer.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.RiskAnalyzerProject.ContractRiskAnalyzer.dto.LoginRequest;
import com.RiskAnalyzerProject.ContractRiskAnalyzer.dto.RegisterRequest;
import java.security.Principal;

import java.util.HashMap;
import java.util.Map;
import org.springframework.http.ResponseCookie;
import org.springframework.http.HttpHeaders;
import jakarta.servlet.http.Cookie;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = {"http://localhost:5173", "https://contract-risk-analyzer-theta.vercel.app"}, allowCredentials = "true")
public class AuthController {

    @Autowired
    private AuthService authService;
    @Autowired
    private com.RiskAnalyzerProject.ContractRiskAnalyzer.util.JwtUtil jwtUtil;


    @Valid
    @PostMapping("/register")
    public ResponseEntity<?> registerUser(@RequestBody RegisterRequest request) {
            User user = new User();
            user.setUsername(request.getUsername());
            user.setEmail(request.getEmail());
            user.setPassword(request.getPassword());
            user.setRole(request.getRole()); // Service handles default "USER" if null
            String result = authService.registerUser(user);
           return ResponseEntity.ok(Map.of("message", result));
    }
    @PostMapping("/register/verify")
    public ResponseEntity<?> verifyRegistration(@RequestBody Map<String, String> request) {
        String email = request.get("email");
        String otp = request.get("otp");
        authService.verifyRegistration(email, otp);
        return ResponseEntity.ok(Map.of("message", "Account Verified! Please Login."));
    }
    @PostMapping("/register/resend-otp")
    public ResponseEntity<?> resendRegistrationOtp(@RequestBody Map<String, String> request) {
        String email = request.get("email");
        authService.resendRegistrationOtp(email);
        return ResponseEntity.ok(Map.of("message", "Verification code resent successfully."));
    }
    @Valid
    @PostMapping("/login")
    public ResponseEntity<?> loginUser(@RequestBody LoginRequest loginRequest) {
            User user = new User();
            user.setUsername(loginRequest.getUsername());
            user.setPassword(loginRequest.getPassword());
            String message = authService.loginUser(user);
            Map<String, String> response = new HashMap<>();
            response.put("message", message);
            response.put("status", "OTP_Sent Successfully");
            return ResponseEntity.ok(response);
    }
    @PostMapping("/login/verify")
    public ResponseEntity<?> verifyLogin(@RequestParam String username, @RequestParam String otp) {
            Map<String, String> loginResult = authService.verifyLoginOtp(username, otp);
            String jwt = loginResult.get("jwt");
            ResponseCookie jwtCookie = ResponseCookie.from("jwtToken", jwt)
                .httpOnly(true)
                .secure(true) // Set to true for HTTPS (Koyeb/Prod)
                .path("/")    // Available to all endpoints
                .maxAge(24 * 60 * 60) // Expires in 1 day
                .sameSite("None") // Good for security
                .build();

            Map<String, Object> response = new HashMap<>();
            response.put("message", "Login Successful");
            response.put("user", Map.of(
                    "username", loginResult.get("username"),
                    "email", loginResult.get("email"),
                    "role", loginResult.get("role")
            ));
            return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, jwtCookie.toString())
                .body(response);
         }
    @PostMapping("/logout")
    public ResponseEntity<String> logoutUser(HttpServletRequest request, HttpServletResponse response) {
        authService.logOutUser(request, response);
        ResponseCookie deleteCookie = ResponseCookie.from("jwtToken", "")
                .httpOnly(true)
                .secure(true)
                .path("/")
                .maxAge(0) // 0 means delete immediately
                .sameSite("Lax")
                .build();
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, deleteCookie.toString())
                .body("Logout Successful");
    }

    @GetMapping("/profile")
    public ResponseEntity<?> getUserProfile(Principal principal) {
        User user = authService.getUserProfile(principal.getName());
        // Return only safe fields (avoid sending password/otp)
        Map<String, String> response = new HashMap<>();
        response.put("username", user.getUsername());
        response.put("email", user.getEmail());
        response.put("role", user.getRole());
        return ResponseEntity.ok(response);
    }

    @PostMapping("/forgot-password/send-otp")
    public ResponseEntity<?> forgotPassword(@RequestBody Map<String, String> request) {
        String email = request.get("email");
        authService.initiatePasswordReset(email);
        return ResponseEntity.ok(Map.of("message", "Reset Password Successfully"));
    }
    @PostMapping("/forgot-password/verify-otp")
    public ResponseEntity<?> verifyForgotOtp(@RequestBody Map<String, String> request) {
        String email = request.get("email");
        String otp = request.get("otp");
        authService.verifyOtp(email, otp);
        return ResponseEntity.ok(Map.of("message", "OTP Verified Successfully"));
    }
    @PostMapping("/forgot-password/reset")
    public ResponseEntity<?> resetPassword(@RequestBody Map<String, String> request) {
        String email = request.get("email");
        String otp = request.get("otp");
        String newPassword = request.get("newPassword");
        authService.resetPassword(email, otp, newPassword);
        return ResponseEntity.ok(Map.of("message", "Password reset successfully. You can now login."));
    }
    @PostMapping("/oauth-complete")
    public ResponseEntity<?> completeOAuthRegistration(@RequestBody com.RiskAnalyzerProject.ContractRiskAnalyzer.dto.OAuth2CompleteRequest request) {
        // 1. Verify the temp token matches the email (Security Check)
        if (!jwtUtil.validateToken(request.getTempToken(), request.getEmail())) {
            return ResponseEntity.status(401).body(Map.of("error", "Invalid or expired registration session."));
        }

        // 2. CHECK: If user already exists, just return the login token
        // (This handles the case where a previous attempt created the user but failed to redirect)
        if (authService.emailExists(request.getEmail())) { // You might need to add this method to AuthService or use UserRepository directly
            String token = jwtUtil.generateToken(request.getEmail()); // Use email or fetch actual username
            ResponseCookie existingUserCookie = ResponseCookie.from("jwtToken", token)
                    .httpOnly(true)
                    .secure(true) // NOTE: Change to false if testing on localhost HTTP!
                    .path("/")
                    .maxAge(24 * 60 * 60)
                    .sameSite("Lax")
                    .build();
            return ResponseEntity.ok()
                    .header(HttpHeaders.SET_COOKIE, existingUserCookie.toString())
                    .body(Map.of("message", "Login Successful"));
        }

        // 3. Determine Password (User provided OR Dummy)
        String finalPassword = (request.getPassword() != null && !request.getPassword().isEmpty())
                ? request.getPassword()
                : java.util.UUID.randomUUID().toString();

        // 4. Create User
        User user = new User();
        user.setUsername(request.getUsername());
        user.setEmail(request.getEmail());
        user.setPassword(finalPassword);
        user.setRole("USER");

        // 5. Save User
        authService.registerOAuthUser(user);

        // 6. Generate Real Login Token
        String token = jwtUtil.generateToken(user.getUsername());

        ResponseCookie newUserCookie = ResponseCookie.from("jwtToken", token)
                .httpOnly(true)
                .secure(true) // NOTE: Change to false if testing on localhost HTTP!
                .path("/")
                .maxAge(24 * 60 * 60)
                .sameSite("Lax")
                .build();

        // 8. Attach the cookie to the response
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, newUserCookie.toString())
                .body(Map.of("message", "Registration and Login Successful"));
    }
    @PostMapping("/delete-account")
    public ResponseEntity<?> deleteMyAccount(@RequestBody Map<String, String> request, Principal principal) {
        // Extract data
        String password = request.get("password");
        String username = principal.getName(); // Get the username securely from the JWT token

        try {
            // Call the service to perform the deletion
            authService.deleteUserAccount(username, password);

            return ResponseEntity.ok(Map.of("message", "Account deleted successfully."));
        } catch (RuntimeException e) {
            // Return 401 Unauthorized if password is wrong
            // We use 401 or 400 depending on the specific error, but 401 is good for auth failures
            return ResponseEntity.status(400).body(Map.of("message", e.getMessage()));
        }
    }
}
