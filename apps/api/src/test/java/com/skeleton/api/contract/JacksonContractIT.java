package com.skeleton.api.contract;

import static org.assertj.core.api.Assertions.assertThat;

import com.skeleton.api.AbstractIntegrationTest;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.resttestclient.TestRestTemplate;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.servlet.function.RouterFunction;
import org.springframework.web.servlet.function.RouterFunctions;
import org.springframework.web.servlet.function.ServerResponse;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/**
 * Jackson 3 serialization contract for the Boot 4.1 baseline (Faz 8.3, R4-7/R5-3).
 *
 * Uses a typed record (String + enum + Instant) exposed by a TEST-ONLY endpoint:
 * the route and DTO live in src/test/java and are registered exclusively
 * through this class's @Import(ContractTestConfig) — they leak into no other
 * IT context and never into the production classpath. The endpoint is a
 * WebMvc.fn RouterFunction bean on purpose: a @RestController nested in test
 * sources would be picked up by the com.skeleton.api component scan and leak
 * into every IT context (and double-register here).
 *
 * Asserted contract: exact field names, enum rendered as its name, Instant
 * rendered as ISO-8601 UTC string, application/json content type, and a typed
 * round-trip (deserialized values equal the served record).
 */
@Import(JacksonContractIT.ContractTestConfig.class)
class JacksonContractIT extends AbstractIntegrationTest {

    enum SampleStatus { ACTIVE, PASSIVE }

    record ContractSample(String name, SampleStatus status, Instant createdAt) {}

    static final ContractSample SERVED =
            new ContractSample("skeleton", SampleStatus.ACTIVE, Instant.parse("2026-07-21T10:15:30Z"));

    @TestConfiguration(proxyBeanMethods = false)
    static class ContractTestConfig {

        @Bean
        RouterFunction<ServerResponse> contractSampleRoute() {
            return RouterFunctions.route()
                    .GET("/api/_contract/sample", request -> ServerResponse.ok().body(SERVED))
                    .build();
        }
    }

    private static final JsonMapper JSON = JsonMapper.builder().build();

    @Autowired
    private TestRestTemplate restTemplate;

    @Test
    void serializesRecordWithExactFieldNamesEnumNameAndIso8601Instant() {
        ResponseEntity<String> response =
                restTemplate.getForEntity("/api/_contract/sample", String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getHeaders().getContentType())
                .isNotNull()
                .satisfies(ct -> assertThat(ct.isCompatibleWith(MediaType.APPLICATION_JSON)).isTrue());

        JsonNode root = JSON.readTree(response.getBody());
        assertThat(List.copyOf(root.propertyNames()))
                .containsExactlyInAnyOrder("name", "status", "createdAt");
        assertThat(root.get("name").asString()).isEqualTo("skeleton");
        assertThat(root.get("status").asString()).isEqualTo("ACTIVE");
        // Jackson 3 / Boot 4 default: java.time as ISO-8601 string, not epoch.
        assertThat(root.get("createdAt").asString()).isEqualTo("2026-07-21T10:15:30Z");
        assertThat(Instant.parse(root.get("createdAt").asString()))
                .isEqualTo(SERVED.createdAt());
    }

    @Test
    void deserializesTypedRoundTripWithEqualValues() {
        ResponseEntity<ContractSample> response =
                restTemplate.getForEntity("/api/_contract/sample", ContractSample.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isEqualTo(SERVED);
    }
}
