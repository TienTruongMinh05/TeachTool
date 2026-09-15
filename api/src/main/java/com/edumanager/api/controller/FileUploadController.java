package com.edumanager.api.controller;

import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.io.IOException;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@RestController
@RequestMapping("/api/files")
public class FileUploadController {

    private final Path uploadDir = Paths.get("uploads").toAbsolutePath().normalize();

    // Danh sách trắng các định dạng tệp tin cho phép trong giáo dục (Whitelist)
    private static final Set<String> ALLOWED_EXTENSIONS = Set.of(
            // Tài liệu văn phòng
            ".pdf", ".docx", ".doc", ".pptx", ".ppt", ".xlsx", ".xls", ".txt", ".rtf",
            // Âm thanh bài tập nói & ghi âm
            ".mp3", ".wav", ".m4a", ".ogg", ".webm", ".aac",
            // Hình ảnh tài liệu & bài tập
            ".jpg", ".jpeg", ".png", ".gif", ".webp"
    );

    public FileUploadController() {
        try {
            Files.createDirectories(uploadDir);
        } catch (IOException e) {
            throw new RuntimeException("Không thể tạo thư mục lưu trữ file: " + uploadDir, e);
        }
    }

    @PostMapping("/upload")
    public ResponseEntity<?> uploadFile(@RequestParam("file") MultipartFile file) {
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Vui lòng chọn một tệp để tải lên."));
        }

        String originalName = file.getOriginalFilename();
        String extension = "";
        if (originalName != null && originalName.contains(".")) {
            extension = originalName.substring(originalName.lastIndexOf(".")).toLowerCase().trim();
        }

        // 1. Kiểm tra an toàn định dạng tệp tin
        if (extension.isEmpty() || !ALLOWED_EXTENSIONS.contains(extension)) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                    "message", "Định dạng tệp (" + extension + ") không được phép tải lên vì lý do an toàn. Chỉ chấp nhận tài liệu (.pdf, .docx, .xlsx, .pptx, .txt), âm thanh (.mp3, .wav, .webm, .m4a) hoặc hình ảnh (.jpg, .png, .webp)."
            ));
        }

        // 2. Tạo tên tệp ngẫu nhiên bằng UUID để chống ghi đè và ẩn danh
        String storedName = UUID.randomUUID().toString() + extension;

        try {
            Path targetLocation = this.uploadDir.resolve(storedName).normalize();

            // 3. Kiểm tra chống Path Traversal
            if (!targetLocation.startsWith(this.uploadDir)) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Tên tệp không hợp lệ."));
            }

            Files.copy(file.getInputStream(), targetLocation, StandardCopyOption.REPLACE_EXISTING);

            // 4. Sinh URL động theo máy chủ hiện tại (Localhost hoặc Domain production trên Render)
            String baseUrl = ServletUriComponentsBuilder.fromCurrentContextPath().build().toUriString();
            String downloadUrl = baseUrl + "/api/files/download/" + storedName;

            return ResponseEntity.ok(Map.of(
                    "fileName", originalName != null ? originalName : storedName,
                    "fileUrl", downloadUrl,
                    "relativeUrl", "/api/files/download/" + storedName
            ));
        } catch (IOException ex) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Không thể lưu trữ tệp tin: " + ex.getMessage()));
        }
    }

    @GetMapping("/download/{fileName:.+}")
    public ResponseEntity<?> downloadFile(@PathVariable String fileName) {
        try {
            Path filePath = this.uploadDir.resolve(fileName).normalize();

            // Kiểm tra chống tấn công vượt quyền thư mục (Path Traversal Protection)
            if (!filePath.startsWith(this.uploadDir)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("message", "Truy cập tệp tin bị từ chối: Phát hiện đường dẫn bất hợp pháp."));
            }

            Resource resource = new UrlResource(filePath.toUri());

            if (resource.exists() && resource.isReadable()) {
                // Xác định Content-Type an toàn
                String contentType = "application/octet-stream";
                try {
                    String probedType = Files.probeContentType(filePath);
                    if (probedType != null) {
                        contentType = probedType;
                    }
                } catch (IOException ignored) {}

                return ResponseEntity.ok()
                        .contentType(MediaType.parseMediaType(contentType))
                        .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + resource.getFilename() + "\"")
                        .body(resource);
            } else {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("message", "Không tìm thấy tệp tin: " + fileName));
            }
        } catch (MalformedURLException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", "Đường dẫn tệp không hợp lệ."));
        }
    }
}
