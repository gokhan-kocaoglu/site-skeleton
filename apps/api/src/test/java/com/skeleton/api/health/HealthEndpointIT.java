package com.skeleton.api.health;

import static org.assertj.core.api.Assertions.assertThat;

import com.skeleton.api.AbstractIntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;

class HealthEndpointIT extends AbstractIntegrationTest {

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    void liveReturns200Up() {
        ResponseEntity<String> response = restTemplate.getForEntity("/api/health/live", String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).contains("\"status\":\"UP\"");
    }

    @Test
    void readyReturns200UpWhenDbAndFlywayHealthy() {
        ResponseEntity<String> response = restTemplate.getForEntity("/api/health/ready", String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).contains("\"status\":\"UP\"");
    }

    @Test
    void flywayBaselineMigrationIsApplied() {
        Integer appliedMigrations = jdbcTemplate.queryForObject(
                "SELECT count(*) FROM flyway_schema_history WHERE success = true", Integer.class);
        assertThat(appliedMigrations).isGreaterThanOrEqualTo(1);

        Integer seedRows = jdbcTemplate.queryForObject(
                "SELECT count(*) FROM app_meta WHERE meta_key = 'schema.baseline'", Integer.class);
        assertThat(seedRows).isEqualTo(1);
    }
}
