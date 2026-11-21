package com.Cross.backend.user.service;
import com.Cross.backend.auth.exception.InvalidCredentialsException;
import com.Cross.backend.user.dto.UserResponse;
import com.Cross.backend.user.repository.UserRepository;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class UserService {
    private final UserRepository users;

    public UserService(UserRepository users) {
        this.users = users;
    }

    public boolean exists(UUID id) {
        return users.existsById(id);
    }

    public UserResponse get(UUID id) {
        return users.findById(id).map(UserResponse::from).orElseThrow(InvalidCredentialsException::new);
    }

    @Transactional
    public void delete(UUID id) {
        if (users.deleteAccount(id) == 0) throw new InvalidCredentialsException();
    }
}
