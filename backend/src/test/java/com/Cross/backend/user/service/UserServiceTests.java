package com.Cross.backend.user.service;

import com.Cross.backend.auth.exception.InvalidCredentialsException;
import com.Cross.backend.user.entity.User;
import com.Cross.backend.user.repository.UserRepository;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class UserServiceTests {
    private final UserRepository users = mock(UserRepository.class);
    private final UserService service = new UserService(users);
    private final UUID id = UUID.randomUUID();

    @Test
    void readsAndDeletesByPrincipalId() {
        when(users.findById(id)).thenReturn(Optional.of(new User("user@example.com", "hash", Instant.EPOCH)));
        when(users.existsById(id)).thenReturn(true);
        when(users.deleteAccount(id)).thenReturn(1);
        assertThat(service.get(id).email()).isEqualTo("user@example.com");
        assertThat(service.exists(id)).isTrue();
        service.delete(id);
        verify(users).deleteAccount(id);
    }

    @Test
    void rejectsAUserDeletedAfterAuthentication() {
        assertThatThrownBy(() -> service.get(id)).isInstanceOf(InvalidCredentialsException.class);
        assertThatThrownBy(() -> service.delete(id)).isInstanceOf(InvalidCredentialsException.class);
    }
}
