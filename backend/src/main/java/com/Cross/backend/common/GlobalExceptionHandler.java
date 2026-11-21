package com.Cross.backend.common;

import com.Cross.backend.auth.exception.DuplicateEmailException;
import com.Cross.backend.auth.exception.InvalidCredentialsException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.*;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

import java.util.List;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler extends ResponseEntityExceptionHandler {
    private static final Logger LOG = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(DuplicateEmailException.class)
    ProblemDetail duplicateEmail() {
        return ProblemDetails.create(HttpStatus.CONFLICT, "duplicate_email", "Email is already registered.");
    }

    @ExceptionHandler(InvalidCredentialsException.class)
    ProblemDetail invalidCredentials() {
        return ProblemDetails.create(HttpStatus.UNAUTHORIZED, "invalid_credentials", "Authentication failed.");
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    ProblemDetail dataConflict() {
        return ProblemDetails.create(HttpStatus.CONFLICT, "data_conflict", "The request conflicts with stored data.");
    }

    @ExceptionHandler(Exception.class)
    ProblemDetail unexpected(Exception exception) {
        LOG.error("Unexpected request failure ({})", exception.getClass().getName());
        return ProblemDetails.create(HttpStatus.INTERNAL_SERVER_ERROR, "internal_error", "An unexpected error occurred.");
    }

    @Override
    protected ResponseEntity<Object> handleMethodArgumentNotValid(MethodArgumentNotValidException exception,
            HttpHeaders headers, HttpStatusCode status, WebRequest request) {
        ProblemDetail problem = ProblemDetails.create(HttpStatus.BAD_REQUEST, "validation_failed", "Request validation failed.");
        List<Map<String, String>> fields = exception.getBindingResult().getFieldErrors().stream()
                .map(error -> Map.of("field", error.getField(), "message", error.getDefaultMessage()))
                .toList();
        problem.setProperty("fieldErrors", fields);
        return handleExceptionInternal(exception, problem, headers, status, request);
    }

    @Override
    protected ResponseEntity<Object> createResponseEntity(Object body, HttpHeaders headers, HttpStatusCode status,
            WebRequest request) {
        if (body instanceof ProblemDetail problem
                && (problem.getProperties() == null || !problem.getProperties().containsKey("code"))) {
            HttpStatus resolved = HttpStatus.valueOf(status.value());
            problem.setDetail(resolved.getReasonPhrase());
            problem.setProperty("code", switch (resolved) {
                case BAD_REQUEST -> "invalid_request";
                case METHOD_NOT_ALLOWED -> "method_not_allowed";
                case UNSUPPORTED_MEDIA_TYPE -> "unsupported_media_type";
                case NOT_FOUND -> "not_found";
                default -> "request_failed";
            });
        }
        return super.createResponseEntity(body, headers, status, request);
    }
}
