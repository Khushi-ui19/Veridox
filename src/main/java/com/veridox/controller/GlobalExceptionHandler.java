package com.veridox.controller;

import com.veridox.exception.AppException;
import com.veridox.exception.ContractNotFoundException;
import com.veridox.exception.ResourceNotFound;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@ControllerAdvice
public class GlobalExceptionHandler {

    // Helper method to build response
    private ResponseEntity<Map<String, Object>> buildResponse(HttpStatus status, String error, String message) {
        Map<String, Object> body = new HashMap<>();
        body.put("timestamp", LocalDateTime.now());
        body.put("status", status.value());
        body.put("error", error);
        body.put("message", message);
        return new ResponseEntity<>(body, status);
    }

    // 1. Handle Custom Resource Not Found (e.g., Contract not found)
    @ExceptionHandler(ResourceNotFound.class)
    public ResponseEntity<Map<String, Object>> handleResourceNotFound(ResourceNotFound ex) {
        return buildResponse(HttpStatus.NOT_FOUND, "Not Found", ex.getMessage());
    }

    @ExceptionHandler(ContractNotFoundException.class)
    public ResponseEntity<Map<String, Object>> handleContractNotFound(ContractNotFoundException ex) {
        return buildResponse(HttpStatus.NOT_FOUND, "Not Found", ex.getMessage());
    }

    // 2. Handle Custom Business Logic Errors (e.g., Username taken)
    @ExceptionHandler(AppException.class)
    public ResponseEntity<Map<String, Object>> handleAppException(AppException ex) {
        return buildResponse(HttpStatus.BAD_REQUEST, "Application Error", ex.getMessage());
    }

    // 3. Handle Validation Errors (e.g., Invalid Email)
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidationErrors(MethodArgumentNotValidException ex) {
        StringBuilder errors = new StringBuilder();
        ex.getBindingResult().getAllErrors().forEach(error -> {
            errors.append(error.getDefaultMessage()).append("; ");
        });
        return buildResponse(HttpStatus.BAD_REQUEST, "Validation Error", errors.toString());
    }

    // 4. Handle File Upload Size Limit Exceeded
    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<Map<String, Object>> handleMaxSizeException(MaxUploadSizeExceededException exc) {
        return buildResponse(HttpStatus.PAYLOAD_TOO_LARGE, "File Too Large", "File size exceeds the allowable limit!");
    }

    // 5. Handle Security/Auth Errors
    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<Map<String, Object>> handleBadCredentials() {
        return buildResponse(HttpStatus.UNAUTHORIZED, "Unauthorized", "Invalid username or password");
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<Map<String, Object>> handleAccessDenied() {
        return buildResponse(HttpStatus.FORBIDDEN, "Forbidden", "You do not have permission to access this resource");
    }

    // 6. Handle Global/Unexpected Errors
    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleAllErrors(Exception ex) {
        return buildResponse(HttpStatus.INTERNAL_SERVER_ERROR, "Internal Server Error", ex.getMessage());
    }
}
