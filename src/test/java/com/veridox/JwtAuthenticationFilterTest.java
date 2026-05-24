package com.veridox;

import com.veridox.config.JwtAuthenticationFilter;
import com.veridox.service.TokenBlacklistService;
import com.veridox.service.UserDetailsServiceImpl;
import com.veridox.util.JwtUtil;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.context.SecurityContextHolder;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
public class JwtAuthenticationFilterTest {

    @Mock
    private JwtUtil jwtUtil;

    @Mock
    private UserDetailsServiceImpl userDetailsService;

    @Mock
    private TokenBlacklistService tokenBlacklistService;

    @InjectMocks
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @Test
    public void testBlacklistedCookieDoesNotBlockPublicRequest() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setMethod("POST");
        request.setRequestURI("/api/auth/login");
        request.setCookies(new Cookie("jwtToken", "stale-token"));

        MockHttpServletResponse response = new MockHttpServletResponse();
        MockFilterChain filterChain = new MockFilterChain();

        when(tokenBlacklistService.isBlacklisted("stale-token")).thenReturn(true);

        jwtAuthenticationFilter.doFilter(request, response, filterChain);

        assertEquals(200, response.getStatus());
        assertEquals("/api/auth/login", ((MockHttpServletRequest) filterChain.getRequest()).getRequestURI());
        assertNull(SecurityContextHolder.getContext().getAuthentication());
        verify(tokenBlacklistService).isBlacklisted("stale-token");
        verifyNoInteractions(jwtUtil, userDetailsService);
    }
}
