package com.zyndex.access;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

class AccessControllerTest {

    private JdbcTemplate jdbc;
    private RestTemplate restTemplate;
    private AccessController controller;

    @BeforeEach
    void setUp() {
        jdbc = Mockito.mock(JdbcTemplate.class);
        restTemplate = Mockito.mock(RestTemplate.class);
        controller = new AccessController(jdbc, restTemplate);
    }

    @Test
    void checkUserAdminIsAlwaysAuthorized() {
        Map<String, Object> res = controller.check(1L, 2L, "READ", "admin", "", "", "FREE");
        assertThat(res.get("authorized")).isEqualTo(true);
    }

    @Test
    void checkThrowsBadRequestWhenUserIdIsNull() {
        assertThatThrownBy(() -> controller.check(null, 2L, "READ", "user", "", "", "FREE"))
                .isInstanceOf(ApiException.class)
                .hasFieldOrPropertyWithValue("status", HttpStatus.BAD_REQUEST);
    }

    @Test
    void checkAuthorizedWhenEntitlementExists() {
        when(jdbc.queryForObject(any(String.class), eq(Integer.class), eq(1L), eq(2L), eq("READ")))
                .thenReturn(1);

        Map<String, Object> res = controller.check(1L, 2L, "READ", "user", "", "", "FREE");
        assertThat(res.get("authorized")).isEqualTo(true);
    }

    @Test
    void checkUnauthorizedWhenNoEntitlementExists() {
        when(jdbc.queryForObject(any(String.class), eq(Integer.class), eq(1L), eq(2L), eq("READ")))
                .thenReturn(0);

        Map<String, Object> res = controller.check(1L, 2L, "READ", "user", "", "", "FREE");
        assertThat(res.get("authorized")).isEqualTo(false);
        assertThat(res.get("reason")).asString().contains("requires a Student Basic or higher subscription plan");
    }
}
