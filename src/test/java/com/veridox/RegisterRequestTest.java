package com.veridox;

import com.veridox.dto.RegisterRequest;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertEquals;

public class RegisterRequestTest {

    private Validator validator;

    @BeforeEach
    public void setUp() {
        ValidatorFactory factory = Validation.buildDefaultValidatorFactory();
        validator = factory.getValidator();
    }

    @Test
    public void testEmailValidation_WithCaps_ShouldWork() {
        // 1. Setup a request with Capital Letters (which failed your old regex)
        RegisterRequest request = new RegisterRequest();
        request.setUsername("testuser");
        request.setPassword("password123");
        request.setEmail("TestUser@gmail.com"); // Notice the Capital 'T'

        // 2. Validate
        Set<ConstraintViolation<RegisterRequest>> violations = validator.validate(request);

        // 3. Print Errors (if any)
        for (ConstraintViolation<RegisterRequest> violation : violations) {
            System.out.println("❌ Validation Error: " + violation.getMessage());
        }

        // 4. Assert: If violations is empty, the fix worked. If not, the old Regex is still there.
        assertTrue(violations.isEmpty(), "Email with caps should be allowed! Fix your DTO.");
    }

    @Test
    public void testEmailValidation_NonGmail_ShouldWork() {
        // 1. Setup a request with Yahoo (which failed your old regex)
        RegisterRequest request = new RegisterRequest();
        request.setUsername("testuser");
        request.setPassword("password123");
        request.setEmail("user@yahoo.com");

        // 2. Validate
        Set<ConstraintViolation<RegisterRequest>> violations = validator.validate(request);

        // 3. Print Errors
        for (ConstraintViolation<RegisterRequest> violation : violations) {
            System.out.println("❌ Validation Error: " + violation.getMessage());
        }

        // 4. Assert
        assertTrue(violations.isEmpty(), "Non-Gmail emails should be allowed! Fix your DTO.");
    }
}