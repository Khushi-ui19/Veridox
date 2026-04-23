package com.RiskAnalyzerProject.ContractRiskAnalyzer.dto;

public class OAuth2CompleteRequest {
    private String email;
    private String username;
    private String password; // Optional
    private String tempToken; // To verify the email matches the Google login

    public OAuth2CompleteRequest() {}

    public OAuth2CompleteRequest(String email, String username, String password, String tempToken) {
        this.email = email;
        this.username = username;
        this.password = password;
        this.tempToken = tempToken;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public String getTempToken() {
        return tempToken;
    }

    public void setTempToken(String tempToken) {
        this.tempToken = tempToken;
    }
}
