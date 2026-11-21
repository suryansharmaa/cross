package com.Cross.backend.user.controller;
import com.Cross.backend.user.dto.UserResponse;
import com.Cross.backend.user.service.UserService;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/users/me")
public class CurrentUserController {
    private final UserService users;

    public CurrentUserController(UserService users) {
        this.users = users;
    }

    @GetMapping
    public UserResponse get(@AuthenticationPrincipal Jwt jwt) {
        return users.get(UUID.fromString(jwt.getSubject()));
    }

    @DeleteMapping
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@AuthenticationPrincipal Jwt jwt) {
        users.delete(UUID.fromString(jwt.getSubject()));
    }
}
