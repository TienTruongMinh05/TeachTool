package com.edumanager.api.security;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.Base64;
import java.util.HashMap;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import java.util.Map;

@Slf4j
@Service
public class JwtService {

    private static final String HEADER_JSON = "{\"alg\":\"HS256\",\"typ\":\"JWT\"}";
    private static final String ENCODED_HEADER = Base64.getUrlEncoder().withoutPadding()
            .encodeToString(HEADER_JSON.getBytes(StandardCharsets.UTF_8));
    // [SECURITY M1] Giảm từ 7 ngày → 24 giờ để hạn chế rủi ro nếu token bị leak
    private static final long EXPIRATION_SECONDS = 24L * 60 * 60; // 24 giờ

    // [SECURITY C1] JWT Secret PHẢI được set qua APP_JWT_SECRET env var - không có default value an toàn
    @Value("${app.jwt.secret}")
    private String jwtSecret;

    @PostConstruct
    public void validateSecret() {
        if (jwtSecret == null || jwtSecret.length() < 32) {
            throw new IllegalStateException("[SECURITY] APP_JWT_SECRET chưa được cấu hình hoặc quá ngắn (tối thiểu 32 ký tự). Ứng dụng không thể khởi động.");
        }
        log.info("[SECURITY AUDIT] Khóa ký JWT được cấu hình từ biến môi trường hợp lệ (độ dài: {} ký tự).", jwtSecret.length());
    }

    private final ObjectMapper objectMapper = new ObjectMapper();

    public String generateToken(Long userId, String email, String role, String fullName) {
        try {
            long now = Instant.now().getEpochSecond();
            long exp = now + EXPIRATION_SECONDS;

            Map<String, Object> claims = new HashMap<>();
            claims.put("sub", String.valueOf(userId));
            claims.put("userId", userId);
            claims.put("email", email);
            claims.put("role", role != null ? role : "");
            claims.put("name", fullName != null ? fullName : "");
            claims.put("iat", now);
            claims.put("exp", exp);

            String payloadJson = objectMapper.writeValueAsString(claims);
            String encodedPayload = Base64.getUrlEncoder().withoutPadding()
                    .encodeToString(payloadJson.getBytes(StandardCharsets.UTF_8));

            String dataToSign = ENCODED_HEADER + "." + encodedPayload;
            String signature = sign(dataToSign, jwtSecret);

            return dataToSign + "." + signature;
        } catch (Exception e) {
            throw new RuntimeException("Lỗi sinh JWT token", e);
        }
    }

    public boolean validateToken(String token) {
        try {
            String[] parts = token.split("\\.");
            if (parts.length != 3) {
                return false;
            }

            String dataToSign = parts[0] + "." + parts[1];
            String expectedSignature = sign(dataToSign, jwtSecret);

            // Constant-time signature verification
            if (!MessageDigest.isEqual(parts[2].getBytes(StandardCharsets.UTF_8),
                    expectedSignature.getBytes(StandardCharsets.UTF_8))) {
                return false;
            }

            // Check expiration
            byte[] payloadBytes = Base64.getUrlDecoder().decode(parts[1]);
            JsonNode payloadNode = objectMapper.readTree(payloadBytes);
            long exp = payloadNode.path("exp").asLong(0);

            return Instant.now().getEpochSecond() < exp;
        } catch (Exception e) {
            return false;
        }
    }

    public Map<String, Object> extractClaims(String token) {
        try {
            String[] parts = token.split("\\.");
            if (parts.length < 2) {
                throw new IllegalArgumentException("Token không đúng định dạng JWT");
            }

            byte[] payloadBytes = Base64.getUrlDecoder().decode(parts[1]);
            return objectMapper.readValue(payloadBytes, Map.class);
        } catch (Exception e) {
            throw new RuntimeException("Không thể đọc thông tin từ Token", e);
        }
    }

    public Long extractUserId(String token) {
        Map<String, Object> claims = extractClaims(token);
        Object sub = claims.get("sub");
        if (sub != null) {
            return Long.parseLong(sub.toString());
        }
        Object userId = claims.get("userId");
        return userId != null ? Long.parseLong(userId.toString()) : null;
    }

    public String extractRole(String token) {
        Map<String, Object> claims = extractClaims(token);
        Object role = claims.get("role");
        return role != null ? role.toString() : null;
    }

    private String sign(String data, String secret) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            SecretKeySpec secretKey = new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
            mac.init(secretKey);
            byte[] rawHmac = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(rawHmac);
        } catch (Exception e) {
            throw new RuntimeException("Lỗi ký chữ ký số HMAC-SHA256", e);
        }
    }
}
