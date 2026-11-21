package com.Cross.backend.auth.service;

import com.Cross.backend.auth.dto.*;
import com.Cross.backend.auth.exception.*;
import com.Cross.backend.user.entity.User;
import com.Cross.backend.user.repository.UserRepository;
import java.time.*;
import java.util.Optional;
import org.hibernate.exception.ConstraintViolationException;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class AuthServiceTests {
    private final UserRepository users = mock(UserRepository.class);
    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder(4);
    private final Instant now = Instant.parse("2026-01-01T00:00:00Z");
    private final AuthService auth = new AuthService(users, encoder, mock(JwtTokenService.class),
            Clock.fixed(now, ZoneOffset.UTC));

    @Test
    void storesNormalizedEmailAndBcryptHash() {
        when(users.saveAndFlush(any())).thenAnswer(invocation -> {
            User account = invocation.getArgument(0);
            assertThat(encoder.matches("password", account.getPasswordHash())).isTrue();
            return account;
        });
        var result = auth.register(new CreateAccountRequest(" USER@EXAMPLE.COM ", "password"));
        assertThat(result.email()).isEqualTo("user@example.com");
        assertThat(result.createdAt()).isEqualTo(now);
    }

    @Test
    void translatesNamedUniqueConstraint() {
        var violation = mock(ConstraintViolationException.class);
        when(violation.getConstraintName()).thenReturn("users_email_unique");
        when(users.saveAndFlush(any())).thenThrow(new DataIntegrityViolationException("duplicate", violation));
        assertThatThrownBy(() -> auth.register(new CreateAccountRequest("user@example.com", "password")))
                .isInstanceOf(DuplicateEmailException.class);
    }

    @Test
    void rejectsUnknownEmailAndWrongPasswordTheSameWay() {
        when(users.findByEmail("user@example.com")).thenReturn(Optional.empty(),
                Optional.of(new User("user@example.com", encoder.encode("password"), now)));
        var request = new LoginRequest(" USER@EXAMPLE.COM ", "incorrect");
        assertThatThrownBy(() -> auth.login(request)).isInstanceOf(InvalidCredentialsException.class);
        assertThatThrownBy(() -> auth.login(request)).isInstanceOf(InvalidCredentialsException.class);
    }
}
