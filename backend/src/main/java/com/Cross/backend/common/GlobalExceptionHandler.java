package com.Cross.backend.common;

import com.Cross.backend.auth.exception.DuplicateEmailException;
import com.Cross.backend.auth.exception.InvalidCredentialsException;
import com.Cross.backend.subscription.exception.*;
import com.Cross.backend.notification.exception.NotificationNotFoundException;
import com.Cross.backend.notification.exception.ReminderRunInProgressException;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.web.method.annotation.HandlerMethodValidationException;
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

    @ExceptionHandler(NotificationNotFoundException.class)
    ProblemDetail notificationNotFound() {
        return ProblemDetails.create(HttpStatus.NOT_FOUND, "notification_not_found", "Notification not found.");
    }

    @ExceptionHandler(ReminderRunInProgressException.class)
    ProblemDetail reminderRunInProgress() {
        return ProblemDetails.create(HttpStatus.CONFLICT, "reminder_run_in_progress",
                "A reminder run is already in progress.");
    }

    @ExceptionHandler(DuplicateEmailException.class)
    ProblemDetail duplicateEmail() {
        return ProblemDetails.create(HttpStatus.CONFLICT, "duplicate_email", "Email is already registered.");
    }

    @ExceptionHandler(InvalidCredentialsException.class)
    ProblemDetail invalidCredentials() {
        return ProblemDetails.create(HttpStatus.UNAUTHORIZED, "invalid_credentials", "Authentication failed.");
    }

    @ExceptionHandler(SubscriptionNotFoundException.class)
    ProblemDetail subscriptionNotFound() {
        return ProblemDetails.create(HttpStatus.NOT_FOUND, "subscription_not_found", "Subscription was not found.");
    }

    @ExceptionHandler(SubscriptionCancelledException.class)
    ProblemDetail subscriptionCancelled() {
        return ProblemDetails.create(HttpStatus.CONFLICT, "subscription_cancelled", "Cancelled subscriptions cannot be updated.");
    }

    @ExceptionHandler(SubscriptionLimitExceededException.class)
    ProblemDetail subscriptionLimit() {
        return ProblemDetails.create(HttpStatus.CONFLICT, "subscription_limit_exceeded", "Subscription limit of 100 reached.");
    }

    @ExceptionHandler(OptimisticLockingFailureException.class)
    ProblemDetail optimisticLockConflict() {
        return ProblemDetails.create(HttpStatus.CONFLICT, "optimistic_lock_conflict", "The resource changed during this request.");
    }

    @ExceptionHandler(InvalidSubscriptionStartDateException.class)
    ProblemDetail invalidSubscriptionStartDate() {
        return validationProblem(List.of(Map.of("field", "startDate", "message",
                "Must be between 2000-01-01 and five years from today.")));
    }

    @Override
    protected ResponseEntity<Object> handleHandlerMethodValidationException(HandlerMethodValidationException exception,
            HttpHeaders headers, HttpStatusCode status, WebRequest request) {
        if (exception.isForReturnValue()) {
            return super.handleHandlerMethodValidationException(exception, headers, status, request);
        }
        List<Map<String, String>> fields = exception.getParameterValidationResults().stream()
                .flatMap(result -> result.getResolvableErrors().stream().map(error -> Map.of(
                        "field", result.getMethodParameter().getParameterName(),
                        "message", java.util.Objects.requireNonNullElse(error.getDefaultMessage(), "Invalid value."))))
                .toList();
        return handleExceptionInternal(exception, validationProblem(fields), headers, status, request);
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
        List<Map<String, String>> fields = exception.getBindingResult().getFieldErrors().stream()
                .map(error -> Map.of("field", error.getField(), "message", error.getDefaultMessage()))
                .toList();
        return handleExceptionInternal(exception, validationProblem(fields), headers, status, request);
    }

    private ProblemDetail validationProblem(List<Map<String, String>> fields) {
        ProblemDetail problem = ProblemDetails.create(HttpStatus.BAD_REQUEST, "validation_failed", "Request validation failed.");
        problem.setProperty("fieldErrors", fields);
        return problem;
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
