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

    // Read from application.properties: app.frontend.url=${APP_FRONTEND_URL:}
    // Empty by default → auto-detect from request. Set APP_FRONTEND_URL env var to override.
    @Value("${app.frontend.url:}")
    private String configuredFrontendUrl;

    /**
     * Determines the frontend URL dynamically from the incoming request.
     * Works for BOTH localhost and production without hardcoding.
     *
     * Priority:
     * 1. app.frontend.url property / APP_FRONTEND_URL env var (if set)
     * 2. Auto-detect from the actual HTTP request (scheme + host + port)
     */
    private String getFrontendUrl(HttpServletRequest request) {
        // 1. Use explicitly configured URL if provided
        if (configuredFrontendUrl != null && !configuredFrontendUrl.isBlank()) {
            return configuredFrontendUrl.replaceAll("/+$", "");
        }

        // 2. Auto-detect from the request
        String scheme = request.getScheme();
        String serverName = request.getServerName();
        int serverPort = request.getServerPort();

        // Respect forwarded headers from reverse proxies (Nginx, DigitalOcean, etc.)
        String forwardedProto = request.getHeader("X-Forwarded-Proto");
        if (forwardedProto != null && !forwardedProto.isBlank()) {
            scheme = forwardedProto;
        }
        String forwardedHost = request.getHeader("X-Forwarded-Host");
        if (forwardedHost != null && !forwardedHost.isBlank()) {
            serverName = forwardedHost.split(",")[0].trim();
            serverPort = "https".equalsIgnoreCase(scheme) ? 443 : 80;
        }

        // Safety: never redirect to Google domains (OAuth2 callback quirk)
        if (serverName.contains("google.com") || serverName.contains("googleapis.com")) {
            System.err.println("⚠️ getFrontendUrl() detected Google domain (" + serverName + "). "
                    + "Please set APP_FRONTEND_URL env variable.");
            // Try to extract base URL from the redirect_uri parameter
            String redirectUri = request.getParameter("redirect_uri");
            if (redirectUri != null && !redirectUri.isBlank()) {
                try {
                    java.net.URI uri = java.net.URI.create(redirectUri);
                    return uri.getScheme() + "://" + uri.getHost()
                            + (uri.getPort() > 0 && uri.getPort() != 443 && uri.getPort() != 80
                            ? ":" + uri.getPort() : "");
                } catch (Exception ignored) {}
            }
            return "http://localhost:8081";
        }

        // Build the URL
        StringBuilder url = new StringBuilder();
        url.append(scheme).append("://").append(serverName);

        // Append port only if non-standard
        boolean isStandardPort = ("http".equals(scheme) && serverPort == 80)
                || ("https".equals(scheme) && serverPort == 443);
        if (!isStandardPort && serverPort > 0) {
            url.append(":").append(serverPort);
        }

        return url.toString();
    }

    private boolean isSecureRequest(HttpServletRequest request) {
        // 1. Check Forwarded Protocol (Standard for Load Balancers/Proxies)
        String forwardedProto = request.getHeader("X-Forwarded-Proto");
        if (forwardedProto != null && !forwardedProto.isBlank()) {
            return "https".equalsIgnoreCase(forwardedProto);
        }

        // 2. Check current request status (Standard Spring/Servlet check)
        if (request.isSecure()) {
            return true;
        }

        // 3. Check Origin/Referer as fallback (Only if they are HTTPS)
        String origin = request.getHeader("Origin");
        if (origin != null && origin.startsWith("https://")) {
            return true;
        }

        String referer = request.getHeader("Referer");
        return referer != null && referer.startsWith("https://");
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

        Optional<User> existingUser = userRepository.findByEmailIgnoreCase(email);

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
                String targetUrl = getFrontendUrl(request) + "/register?error=account_not_found";
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
