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
        // 1. Priority: Environment Variable (Explicitly set for production)
        String configuredUrl = System.getenv("APP_FRONTEND_URL");
        if (configuredUrl == null || configuredUrl.isBlank()) {
            configuredUrl = System.getProperty("app.frontend.url");
        }
        if (configuredUrl != null && !configuredUrl.isBlank()) {
            return configuredUrl.replaceAll("/+$", ""); // Remove trailing slashes
        }

        // 2. Check for forwarded host header (Digital Ocean, Nginx, etc.)
        String forwardedHost = request.getHeader("X-Forwarded-Host");
        if (forwardedHost != null && !forwardedHost.isBlank()) {
            String proto = request.getHeader("X-Forwarded-Proto");
            boolean isHttps = "https".equalsIgnoreCase(proto);
            return (isHttps ? "https://" : "http://") + forwardedHost;
        }

        // 3. Check Origin header - Ensure it's not Google
        String origin = request.getHeader("Origin");
        if (origin != null && !origin.isBlank() && !origin.contains("google.com")) {
            return origin.replaceAll("/+$", "");
        }

        // 4. Fallback: Reconstruct from current request (respecting Forwarded headers if enabled)
        String scheme = request.getScheme();
        String serverName = request.getServerName();
        int serverPort = request.getServerPort();

        // If we have a forwarded proto, use it
        String forwardedProto = request.getHeader("X-Forwarded-Proto");
        if (forwardedProto != null && !forwardedProto.isBlank()) {
            scheme = forwardedProto;
        }

        StringBuilder url = new StringBuilder();
        url.append(scheme).append("://").append(serverName);

        // Only append port if it's not standard and not the internal backend port unless on localhost
        if (("http".equals(scheme) && serverPort != 80) || ("https".equals(scheme) && serverPort != 443)) {
            if (serverPort != 8081 || "localhost".equals(serverName) || "127.0.0.1".equals(serverName)) {
                url.append(":").append(serverPort);
            }
        }

        String result = url.toString();

        // Safety: Never redirect to a Google domain (this can happen on OAuth2 callbacks)
        if (result.contains("google.com") || result.contains("googleapis.com")) {
            System.err.println("⚠️ getFrontendUrl() resolved to a Google domain (" + result + "). "
                    + "Please set the APP_FRONTEND_URL environment variable. Falling back to request URL.");
            // Last-resort fallback: use the OAuth2 redirect_uri's base if available
            String redirectUri = request.getParameter("redirect_uri");
            if (redirectUri != null && !redirectUri.isBlank()) {
                try {
                    java.net.URI uri = java.net.URI.create(redirectUri);
                    return uri.getScheme() + "://" + uri.getHost()
                            + (uri.getPort() > 0 && uri.getPort() != 443 && uri.getPort() != 80
                            ? ":" + uri.getPort() : "");
                } catch (Exception ignored) {}
            }
            // Absolute last resort - use the configured OAuth2 redirect base from Spring
            return "https://68.183.83.161.nip.io";
        }

        return result;
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
