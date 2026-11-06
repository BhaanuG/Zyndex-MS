package com.zyndex.auth;

import org.springframework.stereotype.Component;
import java.util.LinkedHashMap;
import java.util.Map;

@Component
public class SqlSupport {
    public Map<String, Integer> page(Map<String, String> query) {
        int page = Math.max(parseInt(query.get("page"), 0), 0);
        int size = Math.min(Math.max(parseInt(query.get("size"), 10), 1), 100);
        return Map.of("page", page, "size", size, "offset", page * size);
    }

    public Map<String, Object> pageResult(String key, Object items, long total, int page, int size) {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put(key, items);
        result.put("totalPages", (long) Math.ceil(total / (double) size));
        result.put("totalElements", total);
        result.put("currentPage", page);
        return result;
    }

    public static int parseInt(String value, int fallback) {
        try {
            return value == null || value.isBlank() ? fallback : Integer.parseInt(value);
        } catch (NumberFormatException error) {
            return fallback;
        }
    }
}
