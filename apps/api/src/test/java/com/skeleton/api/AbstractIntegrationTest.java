package com.skeleton.api;

import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;

/**
 * Base class for integration tests (*IT.java, run by failsafe in `mvn verify`).
 *
 * Default: starts a Testcontainers postgres:16 (requires Docker). The container
 * is shared across all IT classes and stopped by the Ryuk reaper.
 *
 * Docker-less machines: `mvn verify -Pit-local` sets -Dit.local=true and
 * -Dspring.profiles.active=it-local; the container is skipped and the datasource
 * comes from src/test/resources/application-it-local.yml (local skeleton_it DB).
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
public abstract class AbstractIntegrationTest {

    private static final boolean IT_LOCAL = Boolean.getBoolean("it.local");

    private static final PostgreSQLContainer<?> POSTGRES =
            IT_LOCAL ? null : new PostgreSQLContainer<>("postgres:16");

    static {
        if (POSTGRES != null) {
            POSTGRES.start();
        }
    }

    @DynamicPropertySource
    static void datasourceProperties(DynamicPropertyRegistry registry) {
        if (POSTGRES == null) {
            return; // it-local profile: application-it-local.yml supplies the datasource
        }
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
    }
}
