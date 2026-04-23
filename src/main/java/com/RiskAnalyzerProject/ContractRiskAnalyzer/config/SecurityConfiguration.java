package com.RiskAnalyzerProject.ContractRiskAnalyzer.config;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;
import org.springframework.security.config.annotation.web.configuration.WebSecurityCustomizer;

@Configuration
@EnableWebSecurity
public class SecurityConfiguration {

    @Autowired
    private JwtAuthenticationFilter jwtFilter;

    @Autowired
    private OAuth2LoginSuccessHandler oAuth2LoginSuccessHandler;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .csrf(csrf -> csrf.disable())
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .authorizeHttpRequests(auth -> auth
                        // 1. Allow Static Resources (React build files)
                        .requestMatchers("/", "/index.html","/assets/**", "/static/**", "/*.js", "/*.css", "/*.ico", "/*.json", "/*.png", "/*.svg").permitAll()
                        // 2. Allow Public Backend Endpoints
                        .requestMatchers("/api/auth/**").permitAll()
                        .requestMatchers("/swagger-ui/**", "/v3/api-docs/**").permitAll()
                        // 3. Authenticate only the API routes
                        .requestMatchers("/api/**").authenticated()
                        // 4. Allow all other routes (handled by React Router: /login, /dashboard, etc.)
                        .anyRequest().permitAll()
                )
                .sessionManagement(sess -> sess.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .oauth2Login(oauth2 -> oauth2
                        .loginPage("/oauth2-login") // Prevent Spring's default login page from overriding React's /login route
                        .successHandler(oAuth2LoginSuccessHandler)
                )
                .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        // Accept localhost/Vercel/Koyeb origins while keeping credentialed requests enabled.
        configuration.setAllowedOriginPatterns(List.of(
                "http://localhost:*",
                "http://127.0.0.1:*",
                "https://contract-risk-analyzer-theta.vercel.app",
                "http://192.168.*.*:*",
                "https://*.koyeb.app"
        ));
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("*"));
        configuration.setExposedHeaders(List.of("Set-Cookie", "Authorization", "Content-Disposition"));
        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
    @Bean
    public WebSecurityCustomizer webSecurityCustomizer() {
        // Tells Spring Security to completely ignore these paths (static files + SPA routes)
        return (web) -> web.ignoring()
                .requestMatchers("/assets/**", "/favicon.ico", "/favicon.svg", "/index.html", "/", "/static/**", "/*.js", "/*.css")
                // SPA client-side routes — bypass security so SpaForwardingController serves index.html
                .requestMatchers("/login", "/register", "/dashboard", "/forgot-password",
                        "/complete-registration", "/settings", "/chat/**", "/contracts/**");
    }
}
