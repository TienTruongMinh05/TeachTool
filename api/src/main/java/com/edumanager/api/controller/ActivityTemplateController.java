package com.edumanager.api.controller;

import com.edumanager.api.entity.ActivityTemplate;
import com.edumanager.api.service.ActivityTemplateService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

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
    public ActivityTemplate createActivity(@RequestBody ActivityTemplate activity) {
        return service.createActivity(activity);
    }

    @PutMapping("/{id}")
    public ActivityTemplate updateActivity(@PathVariable Long id, @RequestBody ActivityTemplate activity) {
        return service.updateActivity(id, activity);
    }

    @DeleteMapping("/{id}")
    public void deleteActivity(@PathVariable Long id) {
        service.deleteActivity(id);
    }
}
