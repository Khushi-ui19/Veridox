package com.veridox.service;

import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Value;
import sendinblue.ApiClient;
import sendinblue.Configuration;
import sendinblue.auth.ApiKeyAuth;
import sibApi.TransactionalEmailsApi;
import sibModel.SendSmtpEmail;
import sibModel.SendSmtpEmailSender;
import sibModel.SendSmtpEmailTo;
import java.util.List;

@Service
public class EmailService {

    @Value("${brevo.api.key}")
    private String brevoApiKey;

    @Value("${app.email.sender}")
    private String SENDER_EMAIL;

    @Value("${app.email.sender.name:Veridox}")
    private String SENDER_NAME;

    @Async
    public void sendEmail(String toEmail, String subject, String body) {
        try {
            if (brevoApiKey == null || brevoApiKey.isBlank() || "YOUR_BREVO_API_KEY_HERE".equals(brevoApiKey)) {
                System.err.println("❌ Brevo API key not configured. Please set brevo.api.key in application.properties");
                throw new RuntimeException("Email service not configured");
            }

            ApiClient defaultClient = Configuration.getDefaultApiClient();
            ApiKeyAuth apiKey = (ApiKeyAuth) defaultClient.getAuthentication("api-key");
            apiKey.setApiKey(brevoApiKey);

            TransactionalEmailsApi api = new TransactionalEmailsApi();
            SendSmtpEmail email = new SendSmtpEmail();
            
            email.sender(new SendSmtpEmailSender().email(SENDER_EMAIL).name(SENDER_NAME));
            email.to(List.of(new SendSmtpEmailTo().email(toEmail)));
            email.subject(subject);
            email.textContent(body);

            api.sendTransacEmail(email);
            System.out.println("✅ Email sent to " + toEmail + " via Brevo in thread: " + Thread.currentThread().getName());
        } catch (Exception e) {
            System.err.println("❌ Failed to send email via Brevo: " + e.getMessage());
            throw new RuntimeException("Failed to send email: " + e.getMessage());
        }
    }
    public void sendOtpEmail(String toEmail, String otp) {
        String subject = "Your Veridox OTP";
        String body = "Your verification code is: " + otp + "\n\nThis code expires in 1 minute.";
        sendEmail(toEmail, subject, body);
    }
    public void sendResetPasswordEmail(String toEmail, String otp) {
        String subject = ("Reset Your Password - Veridox");
        String body =  "You requested a password reset." +
                        "\n\nYour reset code is: " + otp +
                         "\n\nThis code expires in 1 minutes. " +
                         "If you did not request this, please ignore this email.";
        sendEmail(toEmail, subject, body);
    }
}