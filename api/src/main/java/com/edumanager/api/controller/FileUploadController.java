package com.edumanager.api.controller;

import com.edumanager.api.entity.StoredFile;
import com.edumanager.api.repository.StoredFileRepository;
import com.edumanager.api.security.RateLimiterService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.core.io.ByteArrayResource;
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
import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

@RestController
@RequestMapping("/api/files")
public class FileUploadController {

    private final Path uploadDir = Paths.get("uploads").toAbsolutePath().normalize();
    private final RateLimiterService rateLimiterService;
    private final StoredFileRepository storedFileRepository;

    // Danh sách trắng các định dạng tệp tin cho phép trong giáo dục (Whitelist)
    private static final Set<String> ALLOWED_EXTENSIONS = Set.of(
            // Tài liệu văn phòng
            ".pdf", ".docx", ".doc", ".pptx", ".ppt", ".xlsx", ".xls", ".txt", ".rtf",
            // Âm thanh bài tập nói & ghi âm
            ".mp3", ".wav", ".m4a", ".ogg", ".webm", ".aac",
            // Hình ảnh tài liệu & bài tập
            ".jpg", ".jpeg", ".png", ".gif", ".webp"
    );

    public FileUploadController(RateLimiterService rateLimiterService, StoredFileRepository storedFileRepository) {
        this.rateLimiterService = rateLimiterService;
        this.storedFileRepository = storedFileRepository;
        try {
            Files.createDirectories(uploadDir);
        } catch (IOException e) {
            throw new RuntimeException("Không thể tạo thư mục lưu trữ file: " + uploadDir, e);
        }
    }

    @PostMapping("/upload")
    public ResponseEntity<?> uploadFile(@RequestParam("file") MultipartFile file, HttpServletRequest servletRequest) {
        String clientIp = RateLimiterService.getClientIp(servletRequest);
        // Chống DoS upload tràn ổ đĩa: tối đa 20 file / 1 phút / IP
        if (rateLimiterService != null && !rateLimiterService.tryAcquire("upload:" + clientIp, 20, 60_000)) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body(Map.of("message", "Bạn đã tải lên quá nhiều tệp tin liên tiếp. Vui lòng chờ 1 phút trước khi tải tiếp."));
        }

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
            byte[] fileBytes = file.getBytes();
            Path targetLocation = this.uploadDir.resolve(storedName).normalize();

            // 3. Kiểm tra chống Path Traversal
            if (!targetLocation.startsWith(this.uploadDir)) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Tên tệp không hợp lệ."));
            }

            // 4. Lưu vào ổ đĩa cục bộ (Cache đệm truy xuất tốc độ cao)
            Files.copy(file.getInputStream(), targetLocation, StandardCopyOption.REPLACE_EXISTING);

            // 5. Lưu vĩnh viễn vào Database PostgreSQL (Chống mất file khi Render restart / redeploy)
            String determinedContentType = file.getContentType();
            if (determinedContentType == null || determinedContentType.isBlank()) {
                determinedContentType = probeContentTypeFromExtension(extension);
            }

            StoredFile storedFile = StoredFile.builder()
                    .storedName(storedName)
                    .originalName(originalName != null ? originalName : storedName)
                    .contentType(determinedContentType)
                    .size(file.getSize())
                    .data(fileBytes)
                    .createdAt(LocalDateTime.now())
                    .build();
            storedFileRepository.save(storedFile);

            // 6. Sinh URL động theo máy chủ hiện tại (Localhost hoặc Domain production trên Render)
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

    @GetMapping(value = {"/download/{fileName:.+}", "/view/{fileName:.+}"})
    public ResponseEntity<?> serveFile(
            @PathVariable String fileName,
            @RequestParam(value = "download", defaultValue = "false") boolean forceDownload) {
        try {
            Path filePath = this.uploadDir.resolve(fileName).normalize();

            // Kiểm tra chống tấn công vượt quyền thư mục (Path Traversal Protection)
            if (!filePath.startsWith(this.uploadDir)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("message", "Truy cập tệp tin bị từ chối: Phát hiện đường dẫn bất hợp pháp."));
            }

            // 1. Nếu file đã có sẵn trên cache đĩa cục bộ
            if (Files.exists(filePath) && Files.isReadable(filePath)) {
                Resource resource = new UrlResource(filePath.toUri());
                String contentType = determineContentType(filePath, fileName);
                String dispositionType = forceDownload ? "attachment" : "inline";

                return ResponseEntity.ok()
                        .contentType(MediaType.parseMediaType(contentType))
                        .header(HttpHeaders.CONTENT_DISPOSITION, dispositionType + "; filename=\"" + resource.getFilename() + "\"")
                        .header("Accept-Ranges", "bytes")
                        .header("X-Content-Type-Options", "nosniff")
                        .body(resource);
            }

            // 2. Nếu file không có trên đĩa cục bộ (ví dụ sau khi Render khởi động lại hoặc redeploy)
            // Tự động khôi phục từ cơ sở dữ liệu PostgreSQL
            Optional<StoredFile> dbFileOpt = storedFileRepository.findByStoredName(fileName);
            if (dbFileOpt.isPresent()) {
                StoredFile dbFile = dbFileOpt.get();
                byte[] data = dbFile.getData();

                // Tái tạo tệp vào thư mục cache để phục vụ các lần gọi tiếp theo nhanh hơn
                try {
                    Files.write(filePath, data);
                } catch (IOException ignored) {}

                String contentType = dbFile.getContentType();
                if (contentType == null || contentType.isBlank()) {
                    contentType = determineContentType(filePath, fileName);
                }
                String dispositionType = forceDownload ? "attachment" : "inline";
                ByteArrayResource resource = new ByteArrayResource(data);

                return ResponseEntity.ok()
                        .contentType(MediaType.parseMediaType(contentType))
                        .header(HttpHeaders.CONTENT_DISPOSITION, dispositionType + "; filename=\"" + dbFile.getOriginalName() + "\"")
                        .header("Accept-Ranges", "bytes")
                        .header("X-Content-Type-Options", "nosniff")
                        .contentLength(data.length)
                        .body(resource);
            }

            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", "Không tìm thấy tệp tin: " + fileName + ". Tệp có thể đã bị xóa hoặc được tải lên trước khi kích hoạt cơ chế lưu trữ cơ sở dữ liệu. Vui lòng tải lại tệp tin."));

        } catch (MalformedURLException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", "Đường dẫn tệp không hợp lệ."));
        }
    }

    private String determineContentType(Path path, String fileName) {
        try {
            String probed = Files.probeContentType(path);
            if (probed != null && !probed.isBlank()) {
                return probed;
            }
        } catch (IOException ignored) {}

        String ext = "";
        if (fileName.contains(".")) {
            ext = fileName.substring(fileName.lastIndexOf(".")).toLowerCase().trim();
        }
        return probeContentTypeFromExtension(ext);
    }

    private String probeContentTypeFromExtension(String ext) {
        return switch (ext) {
            case ".pdf" -> "application/pdf";
            case ".png" -> "image/png";
            case ".jpg", ".jpeg" -> "image/jpeg";
            case ".gif" -> "image/gif";
            case ".webp" -> "image/webp";
            case ".mp3" -> "audio/mpeg";
            case ".wav" -> "audio/wav";
            case ".m4a" -> "audio/mp4";
            case ".ogg" -> "audio/ogg";
            case ".webm" -> "audio/webm";
            case ".docx" -> "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
            case ".xlsx" -> "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
            case ".pptx" -> "application/vnd.openxmlformats-officedocument.presentationml.presentation";
            case ".txt" -> "text/plain";
            default -> "application/octet-stream";
        };
    }
}
