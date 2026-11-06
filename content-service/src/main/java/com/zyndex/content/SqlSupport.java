package com.zyndex.content;

import org.springframework.stereotype.Component;
import java.nio.file.Path;
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

    public Map<String, Object> mapResource(Map<String, Object> row) {
        String fileUrl = str(row.get("file_url"));
        String type = str(row.get("type")).toLowerCase();
        Map<String, Object> resource = new LinkedHashMap<>();
        resource.put("id", number(row.get("id")));
        resource.put("title", row.get("title"));
        resource.put("category", row.get("category"));
        resource.put("subject", row.get("author"));
        resource.put("author", row.get("author"));
        resource.put("type", type);
        resource.put("resourceType", type);
        resource.put("description", first(row.get("description"), ""));
        resource.put("fileName", fileUrl.isBlank() ? "" : Path.of(fileUrl).getFileName().toString());
        resource.put("fileUrl", fileUrl);
        resource.put("hasDownload", !fileUrl.isBlank());
        resource.put("isExternalFile", fileUrl.matches("(?i)^https?://.*"));
        resource.put("downloadCount", number(first(row.get("downloads_count"), 0)));
        resource.put("viewCount", number(first(row.get("view_count"), 0)));
        resource.put("featured", bool(row.get("approved")));
        resource.put("uploadedBy", row.get("uploaded_by"));
        resource.put("uploadedByName", row.get("uploader_name"));
        resource.put("createdAt", row.get("created_at"));
        resource.put("updatedAt", first(row.get("updated_at"), row.get("created_at")));
        resource.put("requiredPlan", first(row.get("required_plan"), "FREE"));
        resource.put("averageRating", row.get("rating") == null ? 0 : ((Number) row.get("rating")).doubleValue());
        resource.put("totalRatings", number(first(row.get("total_ratings"), 0)));
        return resource;
    }

    public static String dbType(String resourceType) {
        if ("article".equalsIgnoreCase(resourceType)) {
            return "PAPER";
        }
        if ("pdf".equalsIgnoreCase(resourceType)) {
            return "GUIDE";
        }
        return "TEXTBOOK";
    }

    public static int parseInt(String value, int fallback) {
        try {
            return value == null || value.isBlank() ? fallback : Integer.parseInt(value);
        } catch (NumberFormatException error) {
            return fallback;
        }
    }

    public static String str(Object value) {
        return value == null ? "" : String.valueOf(value);
    }

    public static long number(Object value) {
        return value == null ? 0 : ((Number) value).longValue();
    }

    public static Object first(Object value, Object fallback) {
        if (value == null) {
            return fallback;
        }
        if (value instanceof String text && text.isBlank()) {
            return fallback;
        }
        return value;
    }

    public static Boolean bool(Object value) {
        if (value == null) {
            return true;
        }
        if (value instanceof Boolean b) {
            return b;
        }
        if (value instanceof Number n) {
            return n.intValue() != 0;
        }
        return Boolean.parseBoolean(String.valueOf(value));
    }
}
