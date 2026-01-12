package com.fintrackerapp.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api")
public class HealthController {

    @GetMapping("/health")
    public Map<String, String> health() {
        return Map.of(
            "status", "UP",
            "message", "FinTracker Backend is running!"
        );
    }

    @GetMapping("/version")
    public Map<String, String> version() {
        return Map.of(
            "version", "1.0.0",
            "app", "FinTracker Backend"
        );
    }
}
