package com.veridox.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(value = HttpStatus.BAD_REQUEST)
public class AppException extends RuntimeException{
    public AppException(String message){
        super(message);
    }
}
