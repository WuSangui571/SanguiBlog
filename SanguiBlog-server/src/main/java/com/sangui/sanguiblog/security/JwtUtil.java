package com.sangui.sanguiblog.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.security.Key;
import java.time.Instant;
import java.util.Date;
import java.util.Map;
import java.util.function.Function;

@Component
public class JwtUtil {

    private final Key key;
    private final long expirationMinutes;
    private final String issuer;

    public JwtUtil(
            @Value("${jwt.secret}") String secret,
            @Value("${jwt.expiration-minutes:180}") long expirationMinutes,
            @Value("${jwt.issuer:sangui-blog}") String issuer) {
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.expirationMinutes = expirationMinutes;
        this.issuer = issuer;
    }

    public String generateToken(String username, Map<String, Object> claims) {
        Instant now = Instant.now();
        return Jwts.builder()
                .setClaims(claims)
                .setSubject(username)
                .setIssuer(issuer)
                .setIssuedAt(Date.from(now))
                .setExpiration(Date.from(now.plusSeconds(expirationMinutes * 60)))
                .signWith(key, SignatureAlgorithm.HS256)
                .compact();
    }

    public String extractUsername(String token) {
        return extractClaim(token, Claims::getSubject);
    }

    public <T> T extractClaim(String token, Function<Claims, T> claimsResolver) {
        final Claims claims = Jwts.parserBuilder()
                .setSigningKey(key)
                .build()
                .parseClaimsJws(token)
                .getBody();
        return claimsResolver.apply(claims);
    }
}
