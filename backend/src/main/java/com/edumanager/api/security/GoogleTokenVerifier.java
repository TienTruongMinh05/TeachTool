package com.edumanager.api.security;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

@Slf4j
@Component
public class GoogleTokenVerifier {

    @Value("${app.google.client-id:}")
    private String expectedClientId;

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(5))
            .build();
    private final ObjectMapper objectMapper = new ObjectMapper();

    public static class GoogleUserInfo {
        public String email;
        public String fullName;
        public String avatarUrl;
        public boolean emailVerified;
    }

    /**
     * Xác thực ID Token trực tiếp với máy chủ xác thực của Google (OAuth 2.0 TokenInfo)
     * Đảm bảo: Chữ ký số hợp lệ, email tồn tại thật và đã xác thực, chưa hết hạn
     */
    public GoogleUserInfo verify(String idToken) {
        if (idToken == null || idToken.trim().isEmpty()) {
            throw new IllegalArgumentException("Google ID Token không được để trống");
        }

        try {
            String url = "https://oauth2.googleapis.com/tokeninfo?id_token=" + idToken.trim();
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .timeout(Duration.ofSeconds(10))
                    .GET()
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() != 200) {
                log.warn("Google token verification failed with status {}: {}", response.statusCode(), response.body());
                throw new IllegalArgumentException("Token xác thực Google không hợp lệ hoặc đã hết hạn");
            }

            JsonNode node = objectMapper.readTree(response.body());

            // 1. Kiểm tra email_verified (Google đảm bảo email đã được xác minh)
            boolean emailVerified = node.path("email_verified").asBoolean(false) ||
                    "true".equalsIgnoreCase(node.path("email_verified").asText());
            if (!emailVerified) {
                throw new IllegalArgumentException("Tài khoản Gmail này chưa được xác minh qua máy chủ Google");
            }

            // 2. Nếu đã cấu hình expectedClientId, kiểm tra audience khớp
            if (expectedClientId != null && !expectedClientId.trim().isEmpty()) {
                String aud = node.path("aud").asText();
                if (!expectedClientId.trim().equals(aud)) {
                    log.warn("Audience mismatch: expected {} but got {}", expectedClientId, aud);
                    throw new IllegalArgumentException("Token Google không thuộc về ứng dụng này");
                }
            }

            GoogleUserInfo info = new GoogleUserInfo();
            info.email = node.path("email").asText().toLowerCase().trim();
            info.fullName = node.has("name") ? node.path("name").asText() : info.email.split("@")[0];
            info.avatarUrl = node.has("picture") ? node.path("picture").asText() : null;
            info.emailVerified = true;

            log.info("Xác thực Google thành công cho tài khoản: {}", info.email);
            return info;
        } catch (IllegalArgumentException e) {
            throw e;
        } catch (Exception e) {
            log.error("Lỗi khi kết nối đến máy chủ xác thực Google", e);
            throw new RuntimeException("Không thể kết nối đến máy chủ Google để xác thực: " + e.getMessage());
        }
    }
}
