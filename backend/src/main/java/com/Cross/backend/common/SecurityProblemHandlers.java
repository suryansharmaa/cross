package com.Cross.backend.common;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.http.*;
import org.springframework.http.converter.json.JacksonJsonHttpMessageConverter;
import org.springframework.http.server.ServletServerHttpResponse;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.stereotype.Component;

@Component
public class SecurityProblemHandlers implements AuthenticationEntryPoint, AccessDeniedHandler {
    private final JacksonJsonHttpMessageConverter converter;

    public SecurityProblemHandlers(tools.jackson.databind.json.JsonMapper mapper) {
        this.converter = new JacksonJsonHttpMessageConverter(mapper);
    }

    @Override
    public void commence(HttpServletRequest request, HttpServletResponse response, AuthenticationException exception)
            throws IOException {
        response.setHeader(HttpHeaders.WWW_AUTHENTICATE, "Bearer");
        write(new ServletServerHttpResponse(response), HttpStatus.UNAUTHORIZED,
                "invalid_credentials", "Authentication failed.");
    }

    @Override
    public void handle(HttpServletRequest request, HttpServletResponse response, AccessDeniedException exception)
            throws IOException {
        forbidden(new ServletServerHttpResponse(response));
    }

    public void forbidden(org.springframework.http.server.ServerHttpResponse response) throws IOException {
        write(response, HttpStatus.FORBIDDEN, "access_denied", "Access denied.");
    }

    private void write(org.springframework.http.server.ServerHttpResponse response, HttpStatus status,
            String code, String message) throws IOException {
        response.setStatusCode(status);
        converter.write(ProblemDetails.create(status, code, message), MediaType.APPLICATION_PROBLEM_JSON, response);
    }
}
