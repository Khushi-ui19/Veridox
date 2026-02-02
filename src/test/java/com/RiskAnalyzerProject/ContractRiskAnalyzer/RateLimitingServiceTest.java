package com.RiskAnalyzerProject.ContractRiskAnalyzer;

import com.RiskAnalyzerProject.ContractRiskAnalyzer.model.User;
import com.RiskAnalyzerProject.ContractRiskAnalyzer.repository.UserRepository;
import com.RiskAnalyzerProject.ContractRiskAnalyzer.service.RateLimitingService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class) // Enables Mockito
public class RateLimitingServiceTest {

    @Mock
    private UserRepository userRepository; // Fake Database

    @InjectMocks
    private RateLimitingService rateLimitingService; // Service we are testing

    @Test
    public void testUserQuotaConsumption() {
        // 1. SETUP: Create a fake user
        User user = new User();
        user.setUsername("testUser");
        user.setRole("USER");

        // Tell Mockito: "When repository is asked for 'testUser', return this user object"
        when(userRepository.findByUsername("testUser")).thenReturn(Optional.of(user));

        // 2. ACTION: Try to consume 1 credit
        boolean firstRequest = rateLimitingService.tryConsume("testUser");

        // 3. ASSERT: Should be allowed
        assertTrue(firstRequest, "First request should be allowed");

        // 4. ACTION: Try to consume AGAIN immediately
        boolean secondRequest = rateLimitingService.tryConsume("testUser");

        // 5. ASSERT: Should be blocked (Quota is 1)
        assertFalse(secondRequest, "Second request should be blocked immediately");
    }
}