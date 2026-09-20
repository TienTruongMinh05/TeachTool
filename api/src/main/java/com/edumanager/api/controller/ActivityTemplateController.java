package com.edumanager.api.controller;

import com.edumanager.api.entity.ActivityTemplate;
import com.edumanager.api.service.ActivityTemplateService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/activities")
@RequiredArgsConstructor
public class ActivityTemplateController {
    private final ActivityTemplateService service;

    @GetMapping
    public List<ActivityTemplate> getAllActivities() {
        return service.getAllActivities();
    }

    @PostMapping
    public ResponseEntity<?> createActivity(@RequestBody ActivityTemplate activity) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.createActivity(activity));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateActivity(@PathVariable Long id, @RequestBody ActivityTemplate activity) {
        try {
            return ResponseEntity.ok(service.updateActivity(id, activity));
        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", e.getMessage()));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteActivity(@PathVariable Long id) {
        try {
            service.deleteActivity(id);
            return ResponseEntity.ok(Map.of("message", "Đã xóa hoạt động thành công."));
        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", e.getMessage()));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", e.getMessage()));
        }
    }
}
