package com.RiskAnalyzerProject.ContractRiskAnalyzer.config;

import com.RiskAnalyzerProject.ContractRiskAnalyzer.model.User;
import com.RiskAnalyzerProject.ContractRiskAnalyzer.repository.UserRepository;
import com.RiskAnalyzerProject.ContractRiskAnalyzer.util.JwtUtil;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Optional;

@Component
public class OAuth2LoginSuccessHandler extends SimpleUrlAuthenticationSuccessHandler {

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private UserRepository userRepository;

    // Use a relative path so it works on both localhost:8080 and localhost:5173
    // Or hardcode to 8080 if you are strictly testing Docker.
    // Ideally, use a property, but for now, let's point to the root (relative).
    @Value("${app.frontend.url:${APP_FRONTEND_URL:http://localhost:8080}}")
    private String FRONTEND_URL;

    private boolean isSecureRequest(HttpServletRequest request) {
        String forwardedProto = request.getHeader("X-Forwarded-Proto");
        if (forwardedProto != null && !forwardedProto.isBlank()) {
            return "https".equalsIgnoreCase(forwardedProto);
        }

        String origin = request.getHeader("Origin");
        if (origin != null && !origin.isBlank()) {
            return origin.startsWith("https://");
        }

        String referer = request.getHeader("Referer");
        if (referer != null && !referer.isBlank()) {
            return referer.startsWith("https://");
        }

        return request.isSecure();
    }

    private ResponseCookie buildJwtCookie(HttpServletRequest request, String token) {
        boolean secure = isSecureRequest(request);
        return ResponseCookie.from("jwtToken", token)
                .httpOnly(true)
                .secure(secure)
                .path("/")
                .maxAge(24 * 60 * 60)
                .sameSite(secure ? "None" : "Lax")
                .build();
    }

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response, Authentication authentication) throws IOException, ServletException {
        OAuth2User oAuth2User = (OAuth2User) authentication.getPrincipal();
        String email = oAuth2User.getAttribute("email");
        String name = oAuth2User.getAttribute("name");

        Optional<User> existingUser = userRepository.findByEmail(email);

        String authIntent = "login";
        if (request.getCookies() != null) {
            for (Cookie cookie : request.getCookies()) {
                if ("auth_intent".equals(cookie.getName())) {
                    authIntent = cookie.getValue();
                    break;
                }
            }
        }

        if (existingUser.isPresent()) {
            if ("register".equals(authIntent)) {
                // Redirect to /login on the SAME domain
                String targetUrl = FRONTEND_URL + "/login?error=user_exists";
                getRedirectStrategy().sendRedirect(request, response, targetUrl);
            } else {
                String jwt = jwtUtil.generateToken(existingUser.get().getUsername());
                ResponseCookie jwtCookie = buildJwtCookie(request, jwt);
                response.addHeader(HttpHeaders.SET_COOKIE, jwtCookie.toString());
                // Redirect to /login on the SAME domain
                String targetUrl = FRONTEND_URL + "/login?token=oauth2_success";
                getRedirectStrategy().sendRedirect(request, response, targetUrl);
            }
        } else {
            if ("login".equals(authIntent)) {
                String targetUrl = FRONTEND_URL + "/register?error=account_not_found";
                getRedirectStrategy().sendRedirect(request, response, targetUrl);
            } else {
                String tempToken = jwtUtil.generateToken(email);
                String targetUrl = FRONTEND_URL + "/complete-registration"
                        + "?email=" + URLEncoder.encode(email, StandardCharsets.UTF_8)
                        + "&name=" + URLEncoder.encode(name != null ? name : "", StandardCharsets.UTF_8)
                        + "&tempToken=" + tempToken;
                getRedirectStrategy().sendRedirect(request, response, targetUrl);
            }
        }
    }
}
