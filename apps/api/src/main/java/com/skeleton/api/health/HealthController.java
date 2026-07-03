package com.skeleton.api.health;

import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Hand-written health endpoints (no Actuator dependency by design —
 * the skeleton stays minimal; add Actuator per project if needed).
 */
@RestController
public class HealthController {

    private static final Logger log = LoggerFactory.getLogger(HealthController.class);

    private final JdbcTemplate jdbcTemplate;

    public HealthController(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    /** Liveness: always 200, no dependency check. */
    @GetMapping("/api/health/live")
    public Map<String, String> live() {
        return Map.of("status", "UP");
    }

    /** Readiness: DB reachable + at least one successful Flyway migration applied. */
    @GetMapping("/api/health/ready")
    public ResponseEntity<Map<String, String>> ready() {
        try {
            jdbcTemplate.queryForObject("SELECT 1", Integer.class);
            Integer appliedMigrations = jdbcTemplate.queryForObject(
                    "SELECT count(*) FROM flyway_schema_history WHERE success = true", Integer.class);

            if (appliedMigrations == null || appliedMigrations < 1) {
                log.warn("Readiness check failed: no successful Flyway migrations found");
                return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(Map.of("status", "DOWN"));
            }

            return ResponseEntity.ok(Map.of("status", "UP"));
        } catch (DataAccessException ex) {
            log.warn("Readiness check failed: database query error");
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(Map.of("status", "DOWN"));
        }
    }
}
