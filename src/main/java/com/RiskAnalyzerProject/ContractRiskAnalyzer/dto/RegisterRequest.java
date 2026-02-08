package com.RiskAnalyzerProject.ContractRiskAnalyzer.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

@Data
public class RegisterRequest {
    @NotBlank(message = "Username is required")
    private String username;
    @NotBlank(message = "Email is required")
    @Email(message = "Please provide a valid email address")
    private  String email;
    @NotBlank(message = "Password is required")
    private String password;
    private String role; // Optional, defaults to USER if null
}