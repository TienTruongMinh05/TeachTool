package com.edumanager.api.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.io.IOException;
import java.util.Map;

@Slf4j
@Component
@RequiredArgsConstructor
public class AuthInterceptor implements HandlerInterceptor {

    private final JwtService jwtService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    // SSE endpoint cho phép ?token= trong URL (EventSource browser không hỗ trợ Authorization header)
    private static final String SSE_PATH_PATTERN = "/api/inquiries/threads/";
    private static final String SSE_SUFFIX = "/stream";

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        // [SECURITY M3] Content Security Policy - chống XSS hiện đại
        response.setHeader("Content-Security-Policy",
                "default-src 'self'; script-src 'self' 'unsafe-inline' https://accounts.google.com; " +
                "style-src 'self' 'unsafe-inline'; img-src 'self' data: https: blob:; " +
                "connect-src 'self' https://api.cloudinary.com https://accounts.google.com; " +
                "media-src 'self' blob: https:; frame-ancestors 'none'");
        // [SECURITY M4] HTTP Strict Transport Security - chống downgrade attack
        response.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
        response.setHeader("X-Content-Type-Options", "nosniff");
        response.setHeader("X-Frame-Options", "DENY");
        response.setHeader("X-XSS-Protection", "1; mode=block");
        response.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
        response.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

        // 1. Cho phép OPTIONS preflight request qua mà không chặn
        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            return true;
        }

        String path = request.getRequestURI();
        String method = request.getMethod().toUpperCase();

        // 2. Danh sách trắng (Public Endpoints - Không yêu cầu đăng nhập)
        if (isPublicEndpoint(path, method)) {
            tryExtractOptionalToken(request);
            return true;
        }

        // 3. Trích xuất JWT Token
        // [SECURITY H2] ?token= chỉ được phép cho SSE endpoint, không phải toàn bộ API
        String token = null;
        String authHeader = request.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            token = authHeader.substring(7).trim();
        } else if (isSseEndpoint(path) && request.getParameter("token") != null && !request.getParameter("token").isBlank()) {
            // Chỉ chấp nhận ?token= param cho SSE stream endpoint (EventSource không hỗ trợ header)
            token = request.getParameter("token").trim();
        }

        if (token == null || !jwtService.validateToken(token)) {
            sendErrorResponse(response, HttpServletResponse.SC_UNAUTHORIZED, "Phiên đăng nhập đã hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại.");
            return false;
        }

        // 4. Trích xuất thông tin người dùng từ JWT
        Long userId;
        String role;
        String email;
        try {
            Map<String, Object> claims = jwtService.extractClaims(token);
            userId = jwtService.extractUserId(token);
            role = jwtService.extractRole(token);
            email = claims.get("email") != null ? claims.get("email").toString() : null;

            request.setAttribute("jwtClaims", claims);
            request.setAttribute("userId", userId);
            request.setAttribute("userRole", role);
            request.setAttribute("userEmail", email);
        } catch (Exception e) {
            log.warn("Lỗi khi giải mã thông tin từ JWT token: {}", e.getMessage());
            sendErrorResponse(response, HttpServletResponse.SC_UNAUTHORIZED, "Token không đúng định dạng.");
            return false;
        }

        // 5. Kiểm tra phân quyền RBAC (Role-Based Access Control)
        if ("STUDENT".equalsIgnoreCase(role)) {
            if (isTeacherOnlyEndpoint(path, method)) {
                log.warn("Học sinh (ID: {}) cố gắng truy cập endpoint của giáo viên: {} {}", userId, method, path);
                sendErrorResponse(response, HttpServletResponse.SC_FORBIDDEN, "Bạn không có quyền thực hiện thao tác này. Chức năng chỉ dành cho Giáo viên.");
                return false;
            }
        }

        return true;
    }

    /**
     * Kiểm tra đây có phải SSE stream endpoint không (được phép dùng ?token= query param)
     */
    private boolean isSseEndpoint(String path) {
        return path != null && path.startsWith(SSE_PATH_PATTERN) && path.endsWith(SSE_SUFFIX);
    }

    /**
     * Trích xuất thông tin người dùng từ JWT một cách tùy chọn (dành cho public endpoints).
     * Nếu client có gửi token hợp lệ, nạp userId, userRole vào request attribute; nếu không có hoặc lỗi thì bỏ qua.
     */
    private void tryExtractOptionalToken(HttpServletRequest request) {
        try {
            String token = null;
            String authHeader = request.getHeader("Authorization");
            if (authHeader != null && authHeader.startsWith("Bearer ")) {
                token = authHeader.substring(7).trim();
            } else if (request.getParameter("token") != null && !request.getParameter("token").isBlank()) {
                token = request.getParameter("token").trim();
            }

            if (token != null && jwtService.validateToken(token)) {
                Map<String, Object> claims = jwtService.extractClaims(token);
                Long userId = jwtService.extractUserId(token);
                String role = jwtService.extractRole(token);
                String email = claims.get("email") != null ? claims.get("email").toString() : null;

                request.setAttribute("jwtClaims", claims);
                request.setAttribute("userId", userId);
                request.setAttribute("userRole", role);
                request.setAttribute("userEmail", email);
            }
        } catch (Exception ignored) {
            // Bỏ qua lỗi token cho public endpoint
        }
    }

    private boolean isPublicEndpoint(String path, String method) {
        // Cho phép HEAD hoặc GET trên tệp tin tải xuống / phát trực tuyến (audio HTML5, image, video, tài liệu)
        // Lưu ý: Tệp tin được bảo vệ bởi UUID v4 128-bit không thể đoán trước, whitelist đuôi tệp, kiểm tra path traversal, và rate limiter
        if ("HEAD".equalsIgnoreCase(method) || "GET".equalsIgnoreCase(method)) {
            if (path.startsWith("/api/files/download/") || path.startsWith("/api/files/view/")) {
                return true;
            }
        }

        // Cho phép HEAD hoặc GET trên kho hoạt động mẫu /api/activities (UptimeRobot ping giữ ấm server)
        if ("HEAD".equalsIgnoreCase(method) || "GET".equalsIgnoreCase(method)) {
            if (path.equals("/api/activities") || path.startsWith("/api/activities/")) {
                return true;
            }
        }

        // [SECURITY C2] /api/system/database đã được bảo vệ - KHÔNG còn public
        // [SECURITY C3] Swagger endpoints không còn public - disabled on production
        return path.startsWith("/api/auth/login") ||
               path.startsWith("/api/auth/register") ||
               path.startsWith("/api/auth/google-login") ||
               path.equals("/api/health") ||
               path.equals("/health") ||
               path.equals("/actuator/health") ||
               path.equals("/error");
    }

    /**
     * Xác định các endpoint chỉ dành riêng cho Giáo viên (TEACHER)
     */
    private boolean isTeacherOnlyEndpoint(String path, String method) {
        // Thao tác chỉnh sửa / xóa / tạo lớp học (trừ học sinh nhập mã vào lớp POST /api/classes/join)
        if (path.startsWith("/api/classes")) {
            if (path.equals("/api/classes/join") && "POST".equals(method)) {
                return false; // Học sinh được phép tham gia lớp bằng mã
            }
            if (path.matches("^/api/classes/\\d+/students/\\d+$") && "DELETE".equals(method)) {
                return false; // Cho phép học sinh tự rời lớp
            }
            if (path.equals("/api/classes/all-students") && "GET".equals(method)) {
                return true; // Chỉ giáo viên được xem danh sách toàn bộ học sinh
            }
            if ("POST".equals(method) || "PUT".equals(method) || "DELETE".equals(method)) {
                return true; // Tạo lớp, sửa lớp, xóa lớp
            }
        }

        // Quản lý buổi học (Session)
        if (path.contains("/sessions")) {
            if ("POST".equals(method) || "PUT".equals(method) || "DELETE".equals(method)) {
                return true;
            }
        }

        // Quản lý kế hoạch giảng dạy (Teaching Plans): Chỉ dành riêng cho Giáo viên
        if (path.contains("/plans")) {
            return true;
        }

        // Quản lý bài tập (Tạo, sửa, xóa bài tập)
        if (path.contains("/assignments")) {
            if ("POST".equals(method) || "PUT".equals(method) || "DELETE".equals(method)) {
                return true;
            }
        }

        // Chấm điểm bài nộp & Xem toàn bộ bài nộp của lớp
        if (path.contains("/grade")) {
            return true;
        }
        if (path.matches("^/api/submissions/assignment/\\d+$") && "GET".equals(method)) {
            return true;
        }
        if (path.matches("^/api/submissions/class/\\d+$") && "GET".equals(method)) {
            return true;
        }

        // Điểm danh cả lớp theo buổi
        if (path.contains("/attendance") && ("POST".equals(method) || "PUT".equals(method))) {
            return true;
        }

        // Quản lý thư viện hoạt động mẫu (Tạo, sửa, xóa hoạt động)
        if (path.startsWith("/api/activities") && ("POST".equals(method) || "PUT".equals(method) || "DELETE".equals(method))) {
            return true;
        }

        // Quản lý câu hỏi thắc mắc của học viên phía giáo viên
        if (path.startsWith("/api/inquiries/teacher")) {
            return true;
        }

        // [SECURITY C2] Endpoint quản lý Database Cluster chỉ dành cho TEACHER (admin)
        if (path.startsWith("/api/system/database")) {
            return true;
        }

        return false;
    }

    private void sendErrorResponse(HttpServletResponse response, int statusCode, String message) throws IOException {
        response.setStatus(statusCode);
        response.setContentType("application/json;charset=UTF-8");
        Map<String, Object> body = Map.of(
                "status", statusCode,
                "message", message
        );
        response.getWriter().write(objectMapper.writeValueAsString(body));
    }
}
