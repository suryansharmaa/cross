package com.Cross.backend.subscription.controller;

import com.Cross.backend.common.SecurityProblemHandlers;
import com.Cross.backend.config.*;
import com.Cross.backend.subscription.dto.*;
import com.Cross.backend.subscription.entity.*;
import com.Cross.backend.subscription.service.SubscriptionService;
import com.Cross.backend.user.service.UserService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import java.util.*;
import tools.jackson.databind.json.JsonMapper;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(SubscriptionController.class)
@Import({SecurityConfig.class, JwtConfig.class, SecurityProblemHandlers.class})
@ActiveProfiles("test")
class SubscriptionControllerTests {
    private static final String PATH = "/api/v1/subscriptions";
    private final UUID owner = UUID.randomUUID();
    private final String item = PATH + "/" + UUID.randomUUID();
    @Autowired MockMvc mvc;
    @Autowired JsonMapper json;
    @Autowired org.springframework.security.oauth2.jwt.JwtEncoder encoder;
    @MockitoBean UserService users;
    @MockitoBean SubscriptionService subscriptions;

    @Test
    void requiresAuthenticationOnEveryRoute() throws Exception {
        for (var request : List.of(post(PATH), get(PATH), get(item), put(item), post(item + "/cancel"), delete(item))) {
            mvc.perform(request).andExpect(status().isUnauthorized())
                    .andExpect(jsonPath("$.code").value("invalid_credentials"));
        }
        verifyNoInteractions(subscriptions);
    }

    @Test
    void validatesPaginationAndPassesScopedStatusFilter() throws Exception {
        for (String query : List.of("?page=-1", "?size=0", "?size=51", "?page=x", "?size=x", "?status=UNKNOWN")) {
            mvc.perform(auth(get(PATH + query))).andExpect(status().isBadRequest());
        }
        verifyNoInteractions(subscriptions);
        when(subscriptions.list(eq(owner), eq(SubscriptionStatus.ACTIVE), any()))
                .thenReturn(new SubscriptionPageResponse(List.of(), 0, 20, 0, 0));
        mvc.perform(auth(get(PATH + "?status=ACTIVE"))).andExpect(status().isOk())
                .andExpect(jsonPath("$.size").value(20)).andExpect(jsonPath("$.items").isEmpty());
        verify(subscriptions).list(eq(owner), eq(SubscriptionStatus.ACTIVE),
                argThat(page -> page.getPageNumber() == 0 && page.getPageSize() == 20
                        && page.getSort().getOrderFor("createdAt").isDescending()));
    }

    @Test
    void validatesEveryEditableFieldOnBothWriteRoutes() throws Exception {
        var invalid = new LinkedHashMap<String, List<?>>();
        invalid.put("name", Arrays.asList(null, " ", "x".repeat(101)));
        invalid.put("category", Arrays.asList(null, "UNKNOWN"));
        invalid.put("amount", Arrays.asList(null, 0, -1, 10000000, 1.234, "bad"));
        invalid.put("billingCycle", Arrays.asList(null, "UNKNOWN"));
        invalid.put("startDate", Arrays.asList(null, "bad"));
        invalid.put("isTrial", Arrays.asList(null, "bad"));
        invalid.put("trialEndDate", List.of("2030-01-01", "bad"));
        invalid.put("notes", List.of("x".repeat(501)));
        for (var entry : invalid.entrySet()) {
            for (Object value : entry.getValue()) {
                var body = validBody();
                body.put(entry.getKey(), value);
                assertInvalidOnBothRoutes(body);
            }
        }
        for (String required : List.of("name", "category", "amount", "billingCycle", "startDate", "isTrial")) {
            var missing = validBody();
            missing.remove(required);
            assertInvalidOnBothRoutes(missing);
        }
        var trial = validBody();
        trial.put("isTrial", true);
        assertInvalidOnBothRoutes(trial);
        trial.put("trialEndDate", "2023-12-31");
        assertInvalidOnBothRoutes(trial);
        verifyNoInteractions(subscriptions);
    }

    @Test
    void mapsOptimisticLockConflictsAndDateErrors() throws Exception {
        when(subscriptions.cancel(eq(owner), any())).thenThrow(
                new org.springframework.dao.OptimisticLockingFailureException("stale"));
        mvc.perform(auth(post(item + "/cancel"))).andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("optimistic_lock_conflict"));
        when(subscriptions.create(eq(owner), any())).thenThrow(
                new com.Cross.backend.subscription.exception.InvalidSubscriptionStartDateException());
        mvc.perform(auth(post(PATH)).contentType("application/json").content(json.writeValueAsString(validBody())))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("validation_failed"))
                .andExpect(jsonPath("$.fieldErrors[0].field").value("startDate"));
    }

    @Test
    void allowsPutPreflightOnlyFromConfiguredOrigin() throws Exception {
        String origin = "http://localhost:5173";
        mvc.perform(options(item).header("Origin", origin)
                .header("Access-Control-Request-Method", "PUT")
                .header("Access-Control-Request-Headers", "authorization,content-type"))
                .andExpect(status().isOk()).andExpect(header().string("Access-Control-Allow-Origin", origin))
                .andExpect(header().string("Access-Control-Allow-Methods", org.hamcrest.Matchers.containsString("PUT")));
        mvc.perform(options(item).header("Origin", "https://other.example")
                .header("Access-Control-Request-Method", "PUT"))
                .andExpect(status().isForbidden())
                .andExpect(content().contentTypeCompatibleWith("application/problem+json"))
                .andExpect(jsonPath("$.status").value(403)).andExpect(jsonPath("$.code").value("access_denied"));
        verifyNoInteractions(subscriptions);
    }

    @Test
    void rejectsMalformedRequestsAndUnsupportedMethodAndMediaType() throws Exception {
        String invalid = PATH + "/not-a-uuid";
        for (var request : List.of(get(invalid), put(invalid).contentType("application/json")
                .content(json.writeValueAsString(validBody())), post(invalid + "/cancel"), delete(invalid))) {
            mvc.perform(auth(request)).andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.code").value("invalid_request"));
        }
        mvc.perform(auth(post(PATH)).contentType("application/json").content("{"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("invalid_request"));
        mvc.perform(auth(patch(item))).andExpect(status().isMethodNotAllowed())
                .andExpect(jsonPath("$.code").value("method_not_allowed"));
        mvc.perform(auth(post(PATH)).contentType("text/plain").content("{}"))
                .andExpect(status().isUnsupportedMediaType())
                .andExpect(jsonPath("$.code").value("unsupported_media_type"));
    }

    @Test
    void acceptsTrimmedNameMaximumAmountAndSameDayTrialEndOnBothWrites() throws Exception {
        var body = validBody();
        body.put("name", " " + "x".repeat(100) + " ");
        body.put("amount", new java.math.BigDecimal("9999999.99"));
        body.put("isTrial", true);
        body.put("trialEndDate", body.get("startDate"));
        body.put("notes", "x".repeat(500));
        var id = UUID.fromString(item.substring(PATH.length() + 1));
        var response = new SubscriptionResponse(id, "x".repeat(100), SubscriptionCategory.MUSIC,
                new java.math.BigDecimal("9999999.99"), BillingCycle.MONTHLY,
                java.time.LocalDate.parse("2024-01-01"), true, java.time.LocalDate.parse("2024-01-01"),
                SubscriptionStatus.ACTIVE, "x".repeat(500), java.time.Instant.EPOCH, java.time.Instant.EPOCH, null,
                java.time.LocalDate.parse("2024-01-01"));
        when(subscriptions.create(eq(owner), any())).thenReturn(response);
        when(subscriptions.update(eq(owner), eq(id), any())).thenReturn(response);
        String payload = json.writeValueAsString(body);
        mvc.perform(auth(post(PATH)).contentType("application/json").content(payload))
                .andExpect(status().isCreated()).andExpect(header().string("Location", item))
                .andExpect(jsonPath("$.nextBillingDate").value("2024-01-01"));
        mvc.perform(auth(put(item)).contentType("application/json").content(payload)).andExpect(status().isOk())
                .andExpect(jsonPath("$.nextBillingDate").value("2024-01-01"));
        verify(subscriptions).create(eq(owner), argThat(request -> request.name().equals("x".repeat(100))));
        verify(subscriptions).update(eq(owner), eq(id), argThat(request -> request.name().equals("x".repeat(100))));
    }

    @Test
    void rejectsExpiredTamperedAndMalformedSubjectBearerTokens() throws Exception {
        var future = java.time.Instant.now().plusSeconds(60);
        String valid = sign(owner.toString(), future);
        int signature = valid.lastIndexOf('.') + 1;
        String tampered = valid.substring(0, signature) + (valid.charAt(signature) == 'A' ? "B" : "A")
                + valid.substring(signature + 1);
        for (String token : List.of(sign(owner.toString(), future.minusSeconds(120)),
                tampered, sign("not-a-uuid", future))) {
            mvc.perform(get(PATH).header("Authorization", "Bearer " + token))
                    .andExpect(status().isUnauthorized()).andExpect(jsonPath("$.code").value("invalid_credentials"));
        }
        verifyNoInteractions(subscriptions);
    }

    private String sign(String subject, java.time.Instant expiresAt) {
        var headers = org.springframework.security.oauth2.jwt.JwsHeader.with(
                org.springframework.security.oauth2.jose.jws.MacAlgorithm.HS256).build();
        var claims = org.springframework.security.oauth2.jwt.JwtClaimsSet.builder()
                .subject(subject).expiresAt(expiresAt).build();
        return encoder.encode(org.springframework.security.oauth2.jwt.JwtEncoderParameters.from(headers, claims))
                .getTokenValue();
    }

    private Map<String, Object> validBody() {
        return new HashMap<>(Map.of("name", "Music", "category", "MUSIC", "amount", 10,
                "billingCycle", "MONTHLY", "startDate", "2024-01-01", "isTrial", false));
    }

    private void assertInvalidOnBothRoutes(Map<String, Object> body) throws Exception {
        for (var request : List.of(post(PATH), put(item))) {
            mvc.perform(auth(request).contentType("application/json").content(json.writeValueAsString(body)))
                    .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").exists());
        }
    }

    private MockHttpServletRequestBuilder auth(MockHttpServletRequestBuilder request) {
        return request.with(jwt().jwt(token -> token.subject(owner.toString())));
    }
}
