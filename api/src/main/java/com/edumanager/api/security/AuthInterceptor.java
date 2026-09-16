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

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        // 1. Cho phép OPTIONS preflight request qua mà không chặn
        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            return true;
        }

        String path = request.getRequestURI();
        String method = request.getMethod().toUpperCase();

        // 2. Danh sách trắng (Public Endpoints - Không yêu cầu đăng nhập)
        if (isPublicEndpoint(path)) {
            return true;
        }

        // 3. Yêu cầu bắt buộc phải có Authorization: Bearer <token>
        String authHeader = request.getHeader("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            sendErrorResponse(response, HttpServletResponse.SC_UNAUTHORIZED, "Vui lòng đăng nhập để truy cập tài nguyên này.");
            return false;
        }

        String token = authHeader.substring(7).trim();
        if (!jwtService.validateToken(token)) {
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

    private boolean isPublicEndpoint(String path) {
        return path.startsWith("/api/auth/login") ||
               path.startsWith("/api/auth/register") ||
               path.startsWith("/api/auth/google-login") ||
               path.startsWith("/api/files/download/") ||
               path.startsWith("/api/files/view/") ||
               path.startsWith("/swagger-ui") ||
               path.startsWith("/v3/api-docs") ||
               path.equals("/actuator/health") ||
               path.equals("/actuator/info") ||
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
                return false; // Cho phép học sinh tự rời lớp (EnrollmentController sẽ xác thực callerId == studentId)
            }
            if (path.equals("/api/classes/all-students") && "GET".equals(method)) {
                return true; // Chỉ giáo viên được xem danh sách toàn bộ học sinh
            }
            if ("POST".equals(method) || "PUT".equals(method) || "DELETE".equals(method)) {
                return true; // Tạo lớp, sửa lớp, xóa lớp, xóa học sinh khỏi lớp
            }
        }

        // Quản lý buổi học (Session)
        if (path.contains("/sessions")) {
            if ("POST".equals(method) || "PUT".equals(method) || "DELETE".equals(method)) {
                return true; // Tạo buổi học, sửa, xóa
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

        // Điểm danh cả lớp theo buổi
        if (path.contains("/attendance") && ("POST".equals(method) || "PUT".equals(method))) {
            return true;
        }

        // Quản lý thư viện hoạt động mẫu (Tạo, sửa, xóa hoạt động)
        if (path.startsWith("/api/activities") && ("POST".equals(method) || "PUT".equals(method) || "DELETE".equals(method))) {
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
