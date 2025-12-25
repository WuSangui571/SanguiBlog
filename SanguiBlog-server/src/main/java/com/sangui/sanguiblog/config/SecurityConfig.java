package com.sangui.sanguiblog.config;

import com.sangui.sanguiblog.security.JwtAuthenticationFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.util.StringUtils;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

@Configuration
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private static final List<String> DEFAULT_CORS_ALLOWED_ORIGINS = List.of(
            "https://sangui.top",
            "https://www.sangui.top",
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:5174",
            "http://127.0.0.1:5174",
            "http://localhost:8082",
            "http://127.0.0.1:8082",
            "http://localhost:3000",
            "http://127.0.0.1:3000"
    );

    @Value("${security.cors.allowed-origins:}")
    private String corsAllowedOrigins;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .cors(c -> c.configurationSource(corsConfigurationSource()))
                .csrf(csrf -> csrf.disable())
                .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(
                                "/api/auth/login",
                                "/api/auth/captcha",
                                "/api/site/meta",
                                "/api/categories/**",
                                "/api/tags/**",
                                "/api/about/**",
                                "/api/analytics/page-view",
                                "/api/analytics/client-ip",
                                "/api/games/**",
                                "/avatar/**",
                                "/contact/**",
                                "/swagger-ui.html",
                                "/swagger-ui/**",
                                "/api-docs/**",
                                "/v3/api-docs/**",
                                "/api-docs/**",
                                "/v3/api-docs/**",
                                "/uploads/**",
                                "/error")
                        .permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/posts/**", "/api/comments/**").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/site/broadcast").hasRole("SUPER_ADMIN")
                        .requestMatchers("/api/upload/**").authenticated()
                        .requestMatchers("/api/admin/**").authenticated()
                        .requestMatchers("/api/permissions/me").authenticated()
                        .anyRequest().authenticated())
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration configuration) throws Exception {
        return configuration.getAuthenticationManager();
    }

    private CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(resolveAllowedOrigins());
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("*"));
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    private List<String> resolveAllowedOrigins() {
        if (!StringUtils.hasText(corsAllowedOrigins)) {
            return DEFAULT_CORS_ALLOWED_ORIGINS;
        }
        List<String> parsed = Arrays.stream(corsAllowedOrigins.split(","))
                .map(String::trim)
                .filter(StringUtils::hasText)
                .toList();
        return parsed.isEmpty() ? DEFAULT_CORS_ALLOWED_ORIGINS : parsed;
    }
}
