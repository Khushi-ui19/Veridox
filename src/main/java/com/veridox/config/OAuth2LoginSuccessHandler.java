package com.veridox.config;

import com.veridox.model.User;
import com.veridox.repository.UserRepository;
import com.veridox.util.JwtUtil;
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

    // Dynamically determine frontend URL based on request - works for any port/deployment
    private String getFrontendUrl(HttpServletRequest request) {
        // Check for forwarded host header (common in reverse proxy setups like Nginx, Cloudflare, etc.)
        String forwardedHost = request.getHeader("X-Forwarded-Host");
        if (forwardedHost != null && !forwardedHost.isBlank()) {
            String proto = request.getHeader("X-Forwarded-Proto");
            boolean isHttps = "https".equalsIgnoreCase(proto);
            return (isHttps ? "https://" : "http://") + forwardedHost;
        }

        // Check Origin header (from CORS requests)
        String origin = request.getHeader("Origin");
        if (origin != null && !origin.isBlank()) {
            return origin;
        }

        // Check Referer header
        String referer = request.getHeader("Referer");
        if (referer != null && !referer.isBlank()) {
            try {
                java.net.URL url = new java.net.URL(referer);
                return url.getProtocol() + "://" + url.getAuthority();
            } catch (Exception e) {
                // If URL parsing fails, fall through to other methods
            }
        }

        // Fallback to default configuration or localhost detection
        String configuredUrl = System.getProperty("app.frontend.url", 
                    System.getenv().getOrDefault("APP_FRONTEND_URL", 
                    "http://localhost:5173")); // Default to Vite dev server port
        return configuredUrl;
    }

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
                String targetUrl = getFrontendUrl(request) + "/login?error=user_exists";
                getRedirectStrategy().sendRedirect(request, response, targetUrl);
            } else {
                String jwt = jwtUtil.generateToken(existingUser.get().getUsername());
                ResponseCookie jwtCookie = buildJwtCookie(request, jwt);
                response.addHeader(HttpHeaders.SET_COOKIE, jwtCookie.toString());
                // Redirect to /login on the SAME domain
                String targetUrl = getFrontendUrl(request) + "/login?token=oauth2_success";
                getRedirectStrategy().sendRedirect(request, response, targetUrl);
            }
        } else {
            if ("login".equals(authIntent)) {
                String targetUrl = FRONTEND_URL + "/register?error=account_not_found";
                getRedirectStrategy().sendRedirect(request, response, targetUrl);
            } else {
                String tempToken = jwtUtil.generateToken(email);
                String targetUrl = getFrontendUrl(request) + "/complete-registration"
                        + "?email=" + URLEncoder.encode(email, StandardCharsets.UTF_8)
                        + "&name=" + URLEncoder.encode(name != null ? name : "", StandardCharsets.UTF_8)
                        + "&tempToken=" + tempToken;
                getRedirectStrategy().sendRedirect(request, response, targetUrl);
            }
        }
    }
}
