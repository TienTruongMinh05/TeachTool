package com.edumanager.api.service;

import com.edumanager.api.dto.*;
import com.edumanager.api.entity.User;
import com.edumanager.api.repository.AttendanceRepository;
import com.edumanager.api.repository.ClassTeacherRepository;
import com.edumanager.api.repository.EnrollmentRepository;
import com.edumanager.api.repository.SubmissionRepository;
import com.edumanager.api.repository.UserRepository;
import com.edumanager.api.security.GoogleTokenVerifier;
import com.edumanager.api.security.JwtService;
import com.edumanager.api.security.PasswordHasher;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.Statement;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final SubmissionRepository submissionRepository;
    private final AttendanceRepository attendanceRepository;
    private final ClassTeacherRepository classTeacherRepository;
    private final PasswordHasher passwordHasher;
    private final JwtService jwtService;
    private final GoogleTokenVerifier googleTokenVerifier;
    private final DataSource dataSource;

    @PostConstruct
    public void initDatabaseSchema() {
        try (Connection conn = dataSource.getConnection();
             Statement stmt = conn.createStatement()) {
            // Tự động kiểm tra và thêm cột password nếu chưa có
            stmt.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS password VARCHAR(255)");
            log.info("Xác nhận cấu trúc bảng users: Cột password đã sẵn sàng.");
        } catch (Exception e) {
            log.warn("Lưu ý khi kiểm tra cấu trúc bảng users: {}", e.getMessage());
        }
    }

    public AuthResponseDTO register(RegisterRequest request) {
        if (request.getEmail() == null || request.getEmail().trim().isEmpty()) {
            throw new IllegalArgumentException("Địa chỉ email không được để trống");
        }

        String normalizedEmail = request.getEmail().trim().toLowerCase();
        if (!normalizedEmail.contains("@") || !normalizedEmail.contains(".")) {
            throw new IllegalArgumentException("Địa chỉ email không đúng định dạng");
        }

        if (userRepository.findByEmail(normalizedEmail).isPresent()) {
            throw new IllegalArgumentException("Email này đã được đăng ký trên hệ thống. Vui lòng đăng nhập hoặc sử dụng email khác.");
        }

        if (request.getPassword() == null || request.getPassword().trim().length() < 6) {
            throw new IllegalArgumentException("Mật khẩu phải có độ dài tối thiểu 6 ký tự để đảm bảo an toàn.");
        }

        String cleanRole = request.getRole() != null ? request.getRole().trim().toUpperCase() : "";
        if (!"TEACHER".equals(cleanRole) && !"STUDENT".equals(cleanRole)) {
            throw new IllegalArgumentException("Vai trò không hợp lệ. Vui lòng chọn 'TEACHER' (Giáo viên) hoặc 'STUDENT' (Học sinh).");
        }

        String fullName = (request.getFullName() != null && !request.getFullName().trim().isEmpty())
                ? request.getFullName().trim()
                : normalizedEmail.split("@")[0];

        String hashedPassword = passwordHasher.hash(request.getPassword().trim());

        User newUser = User.builder()
                .email(normalizedEmail)
                .fullName(fullName)
                .password(hashedPassword)
                .role(cleanRole)
                .avatarUrl(request.getAvatarUrl())
                .build();

        User savedUser = userRepository.save(newUser);
        String token = jwtService.generateToken(savedUser.getId(), savedUser.getEmail(), savedUser.getRole(), savedUser.getFullName());

        return AuthResponseDTO.builder()
                .user(UserResponseDTO.fromEntity(savedUser))
                .token(token)
                .tokenType("Bearer")
                .build();
    }

    public AuthResponseDTO login(LoginRequest request) {
        if (request.getEmail() == null || request.getEmail().trim().isEmpty()) {
            throw new IllegalArgumentException("Vui lòng nhập địa chỉ email");
        }
        if (request.getPassword() == null || request.getPassword().trim().isEmpty()) {
            throw new IllegalArgumentException("Vui lòng nhập mật khẩu");
        }

        String normalizedEmail = request.getEmail().trim().toLowerCase();
        User user = userRepository.findByEmail(normalizedEmail)
                .orElseThrow(() -> new IllegalArgumentException("Email hoặc mật khẩu không chính xác"));

        // Nếu tài khoản được tạo từ Google (chưa có mật khẩu), bắt buộc đăng nhập bằng Google
        if (user.getPassword() == null || user.getPassword().isEmpty()) {
            throw new IllegalArgumentException("Tài khoản này được liên kết qua Google. Vui lòng chọn 'Đăng nhập bằng Google' để tiếp tục.");
        }

        // Xác thực mật khẩu
        boolean matched = passwordHasher.verify(request.getPassword().trim(), user.getPassword());
        if (!matched) {
            throw new IllegalArgumentException("Email hoặc mật khẩu không chính xác");
        }

        String token = jwtService.generateToken(user.getId(), user.getEmail(), user.getRole(), user.getFullName());

        return AuthResponseDTO.builder()
                .user(UserResponseDTO.fromEntity(user))
                .token(token)
                .tokenType("Bearer")
                .build();
    }

    public AuthResponseDTO loginWithGoogle(String idToken) {
        if (idToken == null || idToken.trim().isEmpty()) {
            throw new IllegalArgumentException("Google ID Token không được để trống. Vui lòng đăng nhập qua Google.");
        }

        // Xác thực bảo mật 100% qua Google TokenInfo API
        GoogleTokenVerifier.GoogleUserInfo googleInfo = googleTokenVerifier.verify(idToken.trim());
        String normalizedEmail = googleInfo.email;
        String effectiveFullName = googleInfo.fullName;
        String effectiveAvatarUrl = googleInfo.avatarUrl;

        User user = userRepository.findByEmail(normalizedEmail)
                .map(existing -> {
                    boolean updated = false;
                    if (effectiveFullName != null && !effectiveFullName.trim().isEmpty() && !effectiveFullName.equals(existing.getFullName())) {
                        existing.setFullName(effectiveFullName.trim());
                        updated = true;
                    }
                    if (effectiveAvatarUrl != null && !effectiveAvatarUrl.equals(existing.getAvatarUrl())) {
                        existing.setAvatarUrl(effectiveAvatarUrl);
                        updated = true;
                    }
                    return updated ? userRepository.save(existing) : existing;
                })
                .orElseGet(() -> {
                    String name = (effectiveFullName != null && !effectiveFullName.trim().isEmpty())
                            ? effectiveFullName.trim()
                            : normalizedEmail.split("@")[0];
                    User newUser = User.builder()
                            .email(normalizedEmail)
                            .fullName(name)
                            .avatarUrl(effectiveAvatarUrl)
                            .role(null) // Người dùng mới cần chọn vai trò
                            .build();
                    return userRepository.save(newUser);
                });

        String token = jwtService.generateToken(user.getId(), user.getEmail(), user.getRole(), user.getFullName());

        return AuthResponseDTO.builder()
                .user(UserResponseDTO.fromEntity(user))
                .token(token)
                .tokenType("Bearer")
                .build();
    }

    public void changePassword(Long userId, String oldPassword, String newPassword) {
        if (newPassword == null || newPassword.trim().length() < 6) {
            throw new IllegalArgumentException("Mật khẩu mới phải có ít nhất 6 ký tự");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy tài khoản có ID: " + userId));

        if (user.getPassword() != null && !user.getPassword().isEmpty()) {
            if (oldPassword == null || !passwordHasher.verify(oldPassword.trim(), user.getPassword())) {
                throw new IllegalArgumentException("Mật khẩu hiện tại không chính xác");
            }
        }

        user.setPassword(passwordHasher.hash(newPassword.trim()));
        userRepository.save(user);
    }

    public AuthResponseDTO selectRole(Long userId, String role) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy tài khoản người dùng có ID: " + userId));

        // Kiểm tra điều kiện: Chỉ được chọn 1 lần duy nhất!
        if (user.getRole() != null && !user.getRole().trim().isEmpty()) {
            throw new IllegalStateException("Vai trò đã được thiết lập trước đó và không thể thay đổi trừ khi xóa tài khoản.");
        }

        String cleanRole = role != null ? role.trim().toUpperCase() : "";
        if (!"TEACHER".equals(cleanRole) && !"STUDENT".equals(cleanRole)) {
            throw new IllegalArgumentException("Vai trò không hợp lệ. Chỉ chấp nhận 'TEACHER' hoặc 'STUDENT'.");
        }

        user.setRole(cleanRole);
        User savedUser = userRepository.save(user);

        String token = jwtService.generateToken(savedUser.getId(), savedUser.getEmail(), savedUser.getRole(), savedUser.getFullName());

        return AuthResponseDTO.builder()
                .user(UserResponseDTO.fromEntity(savedUser))
                .token(token)
                .tokenType("Bearer")
                .build();
    }

    @Transactional
    public void deleteAccount(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy tài khoản có ID: " + userId));

        // 1. Xóa các bản ghi điểm danh
        attendanceRepository.deleteByStudentId(userId);

        // 2. Xóa các ghi danh của học sinh
        enrollmentRepository.deleteByStudentId(userId);

        // 3. Xóa các bài nộp của học sinh
        submissionRepository.deleteByStudentId(userId);

        // 4. Xóa phân công giáo viên nếu là giáo viên
        classTeacherRepository.deleteByTeacherId(userId);

        // 5. Xóa tài khoản
        userRepository.delete(user);
        userRepository.flush();
    }
}
