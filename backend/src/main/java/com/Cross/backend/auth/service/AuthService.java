package com.Cross.backend.auth.service;
import com.Cross.backend.auth.dto.*;
import com.Cross.backend.auth.exception.*;
import com.Cross.backend.user.dto.UserResponse;
import com.Cross.backend.user.entity.User;
import com.Cross.backend.user.repository.UserRepository;
import java.time.Clock;
import java.util.UUID;
import org.hibernate.exception.ConstraintViolationException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {
    private final UserRepository users;
    private final PasswordEncoder passwords;
    private final JwtTokenService tokens;
    private final Clock clock;
    private final String dummyHash;

    public AuthService(UserRepository users, PasswordEncoder passwords, JwtTokenService tokens, Clock clock) {
        this.users = users;
        this.passwords = passwords;
        this.tokens = tokens;
        this.clock = clock;
        this.dummyHash = passwords.encode(UUID.randomUUID().toString());
    }

    @Transactional
    public UserResponse register(CreateAccountRequest request) {
        User user = new User(request.email(), passwords.encode(request.password()), clock.instant());
        try {
            return UserResponse.from(users.saveAndFlush(user));
        } catch (DataIntegrityViolationException exception) {
            if (exception.getCause() instanceof ConstraintViolationException violation
                    && "users_email_unique".equals(violation.getConstraintName())) {
                throw new DuplicateEmailException();
            }
            throw exception;
        }
    }

    @Transactional(readOnly = true)
    public LoginResponse login(LoginRequest request) {
        User user = users.findByEmail(request.email()).orElse(null);
        boolean matches = passwords.matches(request.password(), user == null ? dummyHash : user.getPasswordHash());
        if (!matches || user == null) throw new InvalidCredentialsException();
        return tokens.issue(user.getId());
    }
}
