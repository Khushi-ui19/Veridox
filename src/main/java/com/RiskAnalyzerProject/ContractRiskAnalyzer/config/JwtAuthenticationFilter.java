package com.RiskAnalyzerProject.ContractRiskAnalyzer.config;

import com.RiskAnalyzerProject.ContractRiskAnalyzer.service.TokenBlacklistService;
import com.RiskAnalyzerProject.ContractRiskAnalyzer.service.UserDetailsServiceImpl;
import com.RiskAnalyzerProject.ContractRiskAnalyzer.util.JwtUtil;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import jakarta.servlet.http.Cookie;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private UserDetailsServiceImpl userDetailsService;

    @Autowired
    private TokenBlacklistService  tokenBlacklistService;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        String username = null;
        String jwt = null;
        if (request.getCookies() != null) {
            for (Cookie cookie : request.getCookies()) {
                if ("jwtToken".equals(cookie.getName())) {
                    jwt = cookie.getValue();
                    break;
                }
            }
        }
        if (jwt == null) {
            final String authHeader = request.getHeader("Authorization");
            if (authHeader != null && authHeader.startsWith("Bearer ")) {
                jwt = authHeader.substring(7);
            }
        }
        // 1. Check if the header contains a Bearer Token
        if (jwt != null) {
            if (tokenBlacklistService.isBlacklisted(jwt)) {
                // Token is dead. Reject request immediately.
                response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                response.getWriter().write("Token is invalid (Logged out)");
                return;
            }
            try {
                // Wrap this in try-catch to prevent crashes on expired tokens
                username = jwtUtil.extractUsername(jwt);
            } catch (io.jsonwebtoken.ExpiredJwtException e) {
                System.out.println("JWT Token has expired: " + e.getMessage());
                // Do nothing. The user remains unauthenticated.
                // If the endpoint requires login, Spring Security will return 401 later.
            } catch (Exception e) {
                System.out.println("Error parsing JWT: " + e.getMessage());
            }
        }

        // 2. Validate Token and Load User (Only if we successfully extracted a username)
        if (username != null && SecurityContextHolder.getContext().getAuthentication() == null) {

            try { // <--- ADD THIS TRY BLOCK
                UserDetails userDetails = this.userDetailsService.loadUserByUsername(username);

                // Double check validity
                if (jwtUtil.validateToken(jwt, userDetails.getUsername())) {
                    UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                            userDetails, null, userDetails.getAuthorities());

                    authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

                    // 3. Authenticate the user in Spring Security Context
                    SecurityContextHolder.getContext().setAuthentication(authToken);
                }

            } catch (org.springframework.security.core.userdetails.UsernameNotFoundException e) {
                // --- NEW CATCH BLOCK ---
                // The token cryptographically passed, but the user was deleted from the database!
                System.out.println("User no longer exists in DB: " + e.getMessage());
                // By doing nothing here, SecurityContextHolder remains null.
                // Spring Security will automatically block the request and return a 401 Unauthorized.

            } catch (Exception e) {
                System.out.println("Token validation failed: " + e.getMessage());
            }
        }
        filterChain.doFilter(request, response);
    }
}