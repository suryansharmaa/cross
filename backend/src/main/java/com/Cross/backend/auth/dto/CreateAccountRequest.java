package com.Cross.backend.auth.dto;
import com.Cross.backend.auth.validation.BcryptPassword;
import jakarta.validation.constraints.*;
import java.util.Locale;

public record CreateAccountRequest(@NotBlank @Email @Size(max = 254) String email,
        @NotBlank @Size(min = 8, max = 72) @BcryptPassword String password) {

    public CreateAccountRequest {
        if (email != null) email = email.trim().toLowerCase(Locale.ROOT);
    }
}
