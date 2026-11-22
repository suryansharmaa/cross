package com.Cross.backend.notification.security;

import com.Cross.backend.common.SecurityProblemHandlers;
import jakarta.servlet.*;
import jakarta.servlet.http.*;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.*;
import org.springframework.http.HttpStatus;
import org.springframework.web.filter.OncePerRequestFilter;

public final class ReminderTriggerFilter extends OncePerRequestFilter {
    private final SecurityProblemHandlers problems;
    private final byte[] expectedDigest;

    public ReminderTriggerFilter(SecurityProblemHandlers problems, String token) {
        this.problems = problems;
        if (token != null && token.getBytes(StandardCharsets.UTF_8).length < 32) {
            throw new IllegalStateException("REMINDER_TRIGGER_TOKEN must contain at least 32 UTF-8 bytes");
        }
        expectedDigest = token == null ? null : digest(token);
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        if (!"POST".equals(request.getMethod())) {
            chain.doFilter(request, response);
            return;
        }
        if (expectedDigest == null) {
            problems.write(response, HttpStatus.NOT_FOUND, "reminder_trigger_disabled", "Reminder trigger not found.");
            return;
        }
        var headers = request.getHeaders("X-Reminder-Token");
        String supplied = headers.hasMoreElements() ? headers.nextElement() : null;
        if (supplied == null || headers.hasMoreElements() || !MessageDigest.isEqual(expectedDigest, digest(supplied))) {
            problems.write(response, HttpStatus.UNAUTHORIZED, "invalid_credentials", "Authentication failed.");
            return;
        }
        chain.doFilter(request, response);
    }

    private static byte[] digest(String value) {
        try {
            return MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8));
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 unavailable", exception);
        }
    }
}
