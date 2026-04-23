package com.RiskAnalyzerProject.ContractRiskAnalyzer.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

/**
 * Forwards all known React Router paths to index.html so client-side
 * routing works when served from Spring Boot.
 * Each path listed here corresponds to a <Route> in App.jsx.
 */
@Controller
public class SpaForwardingController {

    @GetMapping({
        "/login",
        "/oauth2-login",
        "/register",
        "/dashboard",
        "/forgot-password",
        "/complete-registration",
        "/settings",
        "/chat/{contractId}",
        "/contracts/{id}"
    })
    public String forwardSpaRoutes() {
        return "forward:/index.html";
    }
}
