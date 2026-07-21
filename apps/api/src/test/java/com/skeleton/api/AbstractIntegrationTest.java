package com.skeleton.api;

import org.springframework.boot.resttestclient.autoconfigure.AutoConfigureTestRestTemplate;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.postgresql.PostgreSQLContainer;

/**
 * Base class for integration tests (*IT.java, run by failsafe in `mvn verify`).
 *
 * Default: starts a Testcontainers postgres:16 (requires Docker). The container
 * is shared across all IT classes and stopped by the Ryuk reaper.
 *
 * Boot 4: TestRestTemplate is no longer auto-configured by @SpringBootTest
 * alone; @AutoConfigureTestRestTemplate (spring-boot-resttestclient, test
 * scope via spring-boot-starter-webmvc-test) is required.
 *
 * Docker-less machines: `mvn verify -Pit-local` sets -Dit.local=true and
 * -Dspring.profiles.active=it-local; the container is skipped and the datasource
 * comes from src/test/resources/application-it-local.yml (local skeleton_it DB).
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureTestRestTemplate
public abstract class AbstractIntegrationTest {

    private static final boolean IT_LOCAL = Boolean.getBoolean("it.local");

    private static final PostgreSQLContainer POSTGRES =
            IT_LOCAL ? null : new PostgreSQLContainer("postgres:16");

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
