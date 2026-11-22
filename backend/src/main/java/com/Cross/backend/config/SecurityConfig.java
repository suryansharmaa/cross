package com.Cross.backend.config;

import com.Cross.backend.common.SecurityProblemHandlers;
import com.Cross.backend.notification.controller.ReminderTriggerController;
import com.Cross.backend.notification.security.ReminderTriggerFilter;
import java.io.IOException;
import java.util.List;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.*;
import org.springframework.core.annotation.Order;
import org.springframework.core.env.Environment;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpHeaders;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.access.intercept.AuthorizationFilter;
import org.springframework.security.web.servlet.util.matcher.PathPatternRequestMatcher;
import org.springframework.web.cors.*;
import org.springframework.web.filter.CorsFilter;

@Configuration(proxyBeanMethods = false)
@EnableConfigurationProperties(CorsProperties.class)
public class SecurityConfig {
    @Bean
    @Order(1)
    SecurityFilterChain reminderTriggerChain(HttpSecurity http, SecurityProblemHandlers problems,
            Environment environment) throws Exception {
        String path = ReminderTriggerController.PATH;
        return http
                .securityMatcher(PathPatternRequestMatcher.withDefaults().matcher(path))
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .requestCache(AbstractHttpConfigurer::disable)
                .csrf(AbstractHttpConfigurer::disable)
                .cors(AbstractHttpConfigurer::disable)
                .formLogin(AbstractHttpConfigurer::disable)
                .httpBasic(AbstractHttpConfigurer::disable)
                .logout(AbstractHttpConfigurer::disable)
                .exceptionHandling(errors -> errors
                        .authenticationEntryPoint((request, response, failure) -> problems.handle(request, response,
                                new org.springframework.security.access.AccessDeniedException("Access denied")))
                        .accessDeniedHandler(problems))
                .addFilterBefore(new ReminderTriggerFilter(problems, environment.getProperty("REMINDER_TRIGGER_TOKEN")),
                        AuthorizationFilter.class)
                .authorizeHttpRequests(auth -> auth.requestMatchers(HttpMethod.POST, path).permitAll()
                        .anyRequest().denyAll())
                .build();
    }

    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http, SecurityProblemHandlers problems,
            CorsProperties properties) throws Exception {
        return http
                .addFilterAt(corsFilter(properties, problems), CorsFilter.class)
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .requestCache(AbstractHttpConfigurer::disable)
                .csrf(AbstractHttpConfigurer::disable)
                .formLogin(AbstractHttpConfigurer::disable)
                .httpBasic(AbstractHttpConfigurer::disable)
                .logout(AbstractHttpConfigurer::disable)
                .exceptionHandling(errors -> errors.authenticationEntryPoint(problems).accessDeniedHandler(problems))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.POST, "/api/v1/auth/register", "/api/v1/auth/login").permitAll()
                        .requestMatchers(HttpMethod.GET, "/actuator/health").permitAll()
                        .requestMatchers("/actuator", "/actuator/**").denyAll()
                        .anyRequest().authenticated())
                .oauth2ResourceServer(server -> server.authenticationEntryPoint(problems)
                        .accessDeniedHandler(problems).jwt(jwt -> {}))
                .build();
    }

    private CorsFilter corsFilter(CorsProperties properties, SecurityProblemHandlers problems) {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(List.of(properties.frontendOrigin()));
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE"));
        configuration.setAllowedHeaders(List.of(HttpHeaders.AUTHORIZATION, HttpHeaders.CONTENT_TYPE));
        configuration.setExposedHeaders(List.of(HttpHeaders.LOCATION));
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        CorsFilter filter = new CorsFilter(source);
        filter.setCorsProcessor(new DefaultCorsProcessor() {
            @Override
            protected void rejectRequest(ServerHttpResponse response) throws IOException {
                problems.forbidden(response);
            }
        });
        return filter;
    }
}
