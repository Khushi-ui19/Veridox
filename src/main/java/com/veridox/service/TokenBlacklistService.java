package com.veridox.service;

import com.veridox.util.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class TokenBlacklistService {
    @Autowired
    private JwtUtil jwtUtil;
    // A synchronized set to make it thread-safe
    private final Map<String, Date> blacklist = new ConcurrentHashMap<>();

    public void blacklistToken(String token) {
        try {
            // We only need to blacklist it until it expires naturally
            Date expiry = jwtUtil.extractExpiration(token);
            blacklist.put(token, expiry);
        } catch (Exception e) {
            // If we can't read the token, just ignore it or log it
            System.err.println("Could not blacklist invalid token: " + e.getMessage());
        }
    }

    public boolean isBlacklisted(String token) {
        return blacklist.containsKey(token);
    }
    @Scheduled(fixedRate = 600000)
    public void cleanupExpiredTokens() {
        Date now = new Date();
        blacklist.entrySet().removeIf(entry -> entry.getValue().before(now));
        // System.out.println("Cleaned up expired tokens from blacklist.");
    }
}