package com.zyndex.usage;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;

class UsageControllerTest {

    private JdbcTemplate jdbc;
    private UsageController controller;

    @BeforeEach
    void setUp() {
        jdbc = Mockito.mock(JdbcTemplate.class);
        controller = new UsageController(jdbc);
    }

    @Test
    void logEventThrowsBadRequestWhenParamsMissing() {
        assertThatThrownBy(() -> controller.logEvent(Map.of("eventType", "VIEW")))
                .isInstanceOf(ApiException.class)
                .hasFieldOrPropertyWithValue("status", HttpStatus.BAD_REQUEST);
    }

    @Test
    void logEventViewTriggersInsertIntoViews() {
        Map<String, Object> body = Map.of(
                "userId", 1L,
                "resourceId", 2L,
                "eventType", "VIEW"
        );
        controller.logEvent(body);
        verify(jdbc).update("INSERT INTO resource_views (resource_id, user_id, viewed_at) VALUES (?, ?, NOW())", 2L, 1L);
    }

    @Test
    void logEventDownloadTriggersInsertIntoDownloads() {
        Map<String, Object> body = Map.of(
                "userId", 1L,
                "resourceId", 2L,
                "eventType", "DOWNLOAD"
        );
        controller.logEvent(body);
        verify(jdbc).update("INSERT INTO downloads (resource_id, user_id, downloaded_at) VALUES (?, ?, NOW())", 2L, 1L);
    }
}
