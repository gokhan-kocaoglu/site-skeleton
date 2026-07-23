package com.skeleton.api.health;

import static org.assertj.core.api.Assertions.assertThat;

import com.skeleton.api.AbstractIntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.resttestclient.TestRestTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

class HealthEndpointIT extends AbstractIntegrationTest {

    private static final JsonMapper JSON = JsonMapper.builder().build();

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    void liveReturns200UpAsJson() {
        ResponseEntity<String> response = restTemplate.getForEntity("/api/health/live", String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getHeaders().getContentType())
                .isNotNull()
                .satisfies(ct -> assertThat(ct.isCompatibleWith(MediaType.APPLICATION_JSON)).isTrue());
        JsonNode root = JSON.readTree(response.getBody());
        assertThat(root.get("status").asString()).isEqualTo("UP");
    }

    @Test
    void readyReturns200UpWhenDbAndFlywayHealthy() {
        ResponseEntity<String> response = restTemplate.getForEntity("/api/health/ready", String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        JsonNode root = JSON.readTree(response.getBody());
        assertThat(root.get("status").asString()).isEqualTo("UP");
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
