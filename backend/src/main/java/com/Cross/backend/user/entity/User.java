package com.Cross.backend.user.entity;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;
import lombok.Getter;

@Entity
@Table(name = "users")
@Getter
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    private String email;
    private String passwordHash;
    private Instant createdAt;
    private Instant updatedAt;
    @Version
    private long version;

    protected User() {}

    public User(String email, String passwordHash, Instant now) {
        this.email = email;
        this.passwordHash = passwordHash;
        this.createdAt = now;
        this.updatedAt = now;
    }
}
