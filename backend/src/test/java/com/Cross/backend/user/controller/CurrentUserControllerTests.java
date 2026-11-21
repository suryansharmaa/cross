package com.Cross.backend.user.controller;

import com.Cross.backend.common.SecurityProblemHandlers;
import com.Cross.backend.config.*;
import com.Cross.backend.user.dto.UserResponse;
import com.Cross.backend.user.service.UserService;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(CurrentUserController.class)
@Import({SecurityConfig.class, JwtConfig.class, SecurityProblemHandlers.class})
@ActiveProfiles("test")
class CurrentUserControllerTests {
    private static final String ME = "/api/v1/users/me";
    @Autowired MockMvc mvc;
    @Autowired JwtEncoder encoder;
    @MockitoBean UserService users;

    @Test
    void handlesAuthenticatedRequestsBySubject() throws Exception {
        UUID id = UUID.randomUUID();
        when(users.exists(id)).thenReturn(true);
        when(users.get(id)).thenReturn(new UserResponse(id, "user@example.com", Instant.EPOCH));
        String bearer = "Bearer " + sign(id.toString(), Instant.now().plusSeconds(60));
        mvc.perform(get(ME).header("Authorization", bearer)).andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(id.toString()));
        mvc.perform(delete(ME).header("Authorization", bearer)).andExpect(status().isNoContent());
        mvc.perform(put(ME).header("Authorization", bearer)).andExpect(status().isMethodNotAllowed());
        verify(users).delete(id);
    }

    @Test
    void rejectsMissingExpiredTamperedAndMalformedSubjectTokens() throws Exception {
        mvc.perform(get(ME)).andExpect(status().isUnauthorized()).andExpect(header().string("WWW-Authenticate", "Bearer"))
                .andExpect(jsonPath("$.code").value("invalid_credentials"));
        mvc.perform(delete(ME)).andExpect(status().isUnauthorized());
        String subject = UUID.randomUUID().toString();
        String valid = sign(subject, Instant.now().plusSeconds(60));
        int signature = valid.lastIndexOf('.') + 1;
        String tampered = valid.substring(0, signature) + (valid.charAt(signature) == 'A' ? 'B' : 'A')
                + valid.substring(signature + 1);
        for (String token : new String[] {sign(subject, Instant.now().minusSeconds(60)), tampered,
                sign("not-a-uuid", Instant.now().plusSeconds(60))}) {
            mvc.perform(get(ME).header("Authorization", "Bearer " + token))
                    .andExpect(status().isUnauthorized()).andExpect(jsonPath("$.code").value("invalid_credentials"));
        }
        verifyNoInteractions(users);
    }

    private String sign(String subject, Instant expiresAt) {
        return encoder.encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(),
                JwtClaimsSet.builder().subject(subject).expiresAt(expiresAt).build())).getTokenValue();
    }
}
