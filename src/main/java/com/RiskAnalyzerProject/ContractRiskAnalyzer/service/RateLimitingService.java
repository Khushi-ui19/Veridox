package com.RiskAnalyzerProject.ContractRiskAnalyzer.service;

import com.RiskAnalyzerProject.ContractRiskAnalyzer.model.User;
import com.RiskAnalyzerProject.ContractRiskAnalyzer.repository.UserRepository;
import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.Refill;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import io.github.bucket4j.EstimationProbe;
import java.util.concurrent.TimeUnit;

import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.scheduling.annotation.Scheduled;

@Service
public class RateLimitingService {

    @Autowired
    private UserRepository userRepository;

    // Cache buckets in memory (Map<Username, Bucket>)
    private final Map<String, Bucket> cache = new ConcurrentHashMap<>();

    public boolean tryConsume(String username) {
        Bucket bucket = cache.computeIfAbsent(username, this::createNewBucket);
        return bucket.tryConsume(1);
    }
    public long getRemainingTokens(String username) {
        Bucket bucket = cache.computeIfAbsent(username, this::createNewBucket);
        return bucket.getAvailableTokens();
    }
    public long getTimeUntilRefill(String username) {
        Bucket bucket = cache.computeIfAbsent(username, this::createNewBucket);
        // "Probe" the bucket: Can I consume 1 token?
        // If yes, wait time is 0. If no, it tells us exactly how long to wait.
        EstimationProbe probe = bucket.estimateAbilityToConsume(1);
        long nanos = probe.getNanosToWaitForRefill();
        return TimeUnit.NANOSECONDS.toMillis(nanos);
    }
    private Bucket createNewBucket(String username) {
        User user = userRepository.findByUsername(username).orElse(null);

        if (user != null && "ADMIN".equalsIgnoreCase(user.getRole())) {
            // ADMIN: Virtually unlimited (e.g., 10,000 requests per minute)
            return Bucket.builder()
                    .addLimit(Bandwidth.classic(10000, Refill.greedy(10000, Duration.ofMinutes(1))))
                    .build();
        } else {
            // USER: Limited to 2 uploads per 1 hour
            // Refill.intervally means "refill 2 tokens every 60 minutes"
            return Bucket.builder()
                    .addLimit(Bandwidth.classic(1, Refill.intervally(1, Duration.ofHours(1))))
                    .build();
        }
    }
    @Scheduled(fixedRate = 86400000)
    public void clearRateLimitCache() {
        cache.clear();
        System.out.println("Rate Limit Cache cleared to free up memory.");
    }

}