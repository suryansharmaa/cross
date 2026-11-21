package com.Cross.backend.common;

import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;

public final class ProblemDetails {
    private ProblemDetails() {}

    public static ProblemDetail create(HttpStatus status, String code, String detail) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(status, detail);
        problem.setProperty("code", code);
        return problem;
    }
}
