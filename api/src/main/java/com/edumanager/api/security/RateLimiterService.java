package com.edumanager.api.security;

import org.springframework.stereotype.Service;

import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

@Service
public class RateLimiterService {

    private static class RequestCount {
        long windowStart;
        AtomicInteger count;

        RequestCount(long start) {
            this.windowStart = start;
            this.count = new AtomicInteger(1);
        }
    }

    private final ConcurrentHashMap<String, RequestCount> rateLimits = new ConcurrentHashMap<>();

    /**
     * Kiểm tra xem IP có vượt quá số lượt gọi cho phép trong khung thời gian hay không.
     *
     * @param key         Định danh (ví dụ: "login:" + ipAddress)
     * @param maxRequests Số lượt yêu cầu tối đa
     * @param windowMs    Độ dài cửa sổ thời gian (mili giây)
     * @return true nếu còn trong hạn mức, false nếu vượt quá
     */
    public boolean tryAcquire(String key, int maxRequests, long windowMs) {
        long now = System.currentTimeMillis();

        // Định kỳ dọn dẹp các IP đã hết hạn quá 5 phút để tránh rò rỉ bộ nhớ RAM
        if (rateLimits.size() > 5000) {
            rateLimits.entrySet().removeIf(entry -> now - entry.getValue().windowStart > 300_000);
        }

        RequestCount current = rateLimits.compute(key, (k, existing) -> {
            if (existing == null || (now - existing.windowStart) > windowMs) {
                return new RequestCount(now);
            }
            existing.count.incrementAndGet();
            return existing;
        });

        return current.count.get() <= maxRequests;
    }

    /**
     * Lấy IP thực tế của client kể cả khi đi qua reverse proxy (Cloudflare / Render)
     */
    public static String getClientIp(jakarta.servlet.http.HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isEmpty()) {
            return xForwardedFor.split(",")[0].trim();
        }
        String xRealIp = request.getHeader("X-Real-IP");
        if (xRealIp != null && !xRealIp.isEmpty()) {
            return xRealIp.trim();
        }
        return request.getRemoteAddr();
    }
}
