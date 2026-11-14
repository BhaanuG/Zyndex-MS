package com.zyndex.content;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.client.RestTemplate;

import java.nio.file.Files;
import java.nio.file.Path;

import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
public class ContentIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private RestTemplate restTemplate;

    @Autowired
    private JdbcTemplate jdbc;

    private MockRestServiceServer mockServer;

    @BeforeEach
    void setUp() throws Exception {
        mockServer = MockRestServiceServer.createServer(restTemplate);
        
        jdbc.execute("DELETE FROM resources");
        jdbc.update("""
                INSERT INTO resources (id, approved, downloads_count, rating, uploaded_by, description, author, category, file_url, title, type)
                VALUES (1, 1, 0, 5.0, 10, 'Test Description', 'Test Author', 'Computer Science', 'uploads/test-file.txt', 'Test Title', 'TEXTBOOK')
                """);

        Path testFile = Path.of("target/test-uploads/test-file.txt");
        Files.createDirectories(testFile.getParent());
        Files.writeString(testFile, "Hello ScholarSphere content verification!");
    }

    private String getGatewaySecret() {
        return System.getenv("GATEWAY_SECRET") != null 
                ? System.getenv("GATEWAY_SECRET") 
                : "zyndex-gateway-secret-123";
    }

    @Test
    void testFlow2_AuthorizedPreview() throws Exception {
        mockServer.expect(requestTo("http://access-service/api/access/check?userId=10&resourceId=1&permission=READ&role=student&category=Computer+Science&type=TEXTBOOK&requiredPlan=FREE"))
                .andExpect(method(HttpMethod.GET))
                .andRespond(withSuccess("{\"authorized\": true}", MediaType.APPLICATION_JSON));

        mockServer.expect(requestTo("http://usage-service/api/usage/events"))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withSuccess("{\"message\": \"Usage event logged successfully.\"}", MediaType.APPLICATION_JSON));

        mockServer.expect(requestTo("http://auth-service/api/users/10/profile"))
                .andExpect(method(HttpMethod.GET))
                .andRespond(withSuccess("{\"id\": 10, \"name\": \"Test Student\", \"email\": \"student@zyndex.com\"}", MediaType.APPLICATION_JSON));

        mockMvc.perform(get("/api/resources/1/file")
                        .header("X-User-Id", "10")
                        .header("X-User-Role", "student")
                        .header("X-Gateway-Secret", getGatewaySecret()))
                .andExpect(status().isOk())
                .andExpect(content().string(containsString("Hello ScholarSphere content verification!")));

        mockServer.verify();
    }

    @Test
    void testFlow3_UnauthorizedPreview() throws Exception {
        mockServer.expect(requestTo("http://access-service/api/access/check?userId=10&resourceId=1&permission=READ&role=student&category=Computer+Science&type=TEXTBOOK&requiredPlan=FREE"))
                .andExpect(method(HttpMethod.GET))
                .andRespond(withSuccess("{\"authorized\": false, \"reason\": \"No active entitlement found.\"}", MediaType.APPLICATION_JSON));

        mockMvc.perform(get("/api/resources/1/file")
                        .header("X-User-Id", "10")
                        .header("X-User-Role", "student")
                        .header("X-Gateway-Secret", getGatewaySecret()))
                .andExpect(status().isForbidden())
                .andExpect(content().string(containsString("You do not have access entitlement to read this resource.")));

        mockServer.verify();
    }

    @Test
    void testFlow4_AuthorizedDownload() throws Exception {
        mockServer.expect(requestTo("http://access-service/api/access/check?userId=10&resourceId=1&permission=DOWNLOAD&role=admin&category=Computer+Science&type=TEXTBOOK&requiredPlan=FREE"))
                .andExpect(method(HttpMethod.GET))
                .andRespond(withSuccess("{\"authorized\": true}", MediaType.APPLICATION_JSON));

        mockServer.expect(requestTo("http://usage-service/api/usage/events"))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withSuccess("{\"message\": \"Usage event logged successfully.\"}", MediaType.APPLICATION_JSON));

        mockMvc.perform(get("/api/resources/1/download")
                        .header("X-User-Id", "10")
                        .header("X-User-Role", "admin")
                        .header("X-User-Email", "bhaanusai07@gmail.com")
                        .header("X-Gateway-Secret", getGatewaySecret()))
                .andExpect(status().isOk())
                .andExpect(content().string(containsString("Hello ScholarSphere content verification!")));

        mockServer.verify();
    }

    @Test
    void testDirectRequestWithoutGatewaySecretIsRejected() throws Exception {
        mockMvc.perform(get("/api/resources/1/file")
                        .header("X-User-Id", "10")
                        .header("X-User-Role", "student"))
                .andExpect(status().isForbidden())
                .andExpect(content().string(containsString("Direct access bypass attempt rejected.")));
    }

    @org.springframework.boot.test.context.TestConfiguration
    static class TestConfig {
        @org.springframework.context.annotation.Bean
        @org.springframework.context.annotation.Primary
        public RestTemplate restTemplate() {
            return new RestTemplate();
        }

        @org.springframework.context.annotation.Bean
        public org.springframework.mail.javamail.JavaMailSender javaMailSender() {
            return org.mockito.Mockito.mock(org.springframework.mail.javamail.JavaMailSender.class);
        }
    }
}
