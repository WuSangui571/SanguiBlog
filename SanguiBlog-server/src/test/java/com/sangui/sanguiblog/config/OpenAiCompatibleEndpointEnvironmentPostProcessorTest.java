package com.sangui.sanguiblog.config;

import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;

import java.io.InputStream;
import java.net.URL;
import java.util.Enumeration;
import java.util.Properties;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class OpenAiCompatibleEndpointEnvironmentPostProcessorTest {

    @Test
    void shouldLeaveBlankAndRootBaseUrlsUnchanged() {
        assertNull(OpenAiCompatibleEndpointEnvironmentPostProcessor.normalizeBaseUrl(null));
        assertEquals("", OpenAiCompatibleEndpointEnvironmentPostProcessor.normalizeBaseUrl(""));
        assertEquals("https://api.openai.com",
                OpenAiCompatibleEndpointEnvironmentPostProcessor.normalizeBaseUrl("https://api.openai.com"));
    }

    @Test
    void shouldStripTrailingV1PathFromCompatibleEndpoint() {
        assertEquals("https://api.sanguicode.com",
                OpenAiCompatibleEndpointEnvironmentPostProcessor.normalizeBaseUrl("https://api.sanguicode.com/v1"));
        assertEquals("https://api.sanguicode.com",
                OpenAiCompatibleEndpointEnvironmentPostProcessor.normalizeBaseUrl(" https://api.sanguicode.com/v1/ "));
    }

    @Test
    void shouldStripTrailingV1PathWithoutRemovingProviderPathPrefix() {
        assertEquals("https://dashscope.aliyuncs.com/compatible-mode",
                OpenAiCompatibleEndpointEnvironmentPostProcessor.normalizeBaseUrl(
                        "https://dashscope.aliyuncs.com/compatible-mode/v1"));
    }

    @Test
    void shouldOverrideOnlyOpenAiBaseUrlsThatEndWithV1() {
        MockEnvironment environment = new MockEnvironment()
                .withProperty("spring.ai.openai.base-url", "https://api.sanguicode.com/v1")
                .withProperty("spring.ai.openai.chat.base-url", "https://chat.example.com")
                .withProperty("spring.ai.openai.embedding.base-url",
                        "https://dashscope.aliyuncs.com/compatible-mode/v1");

        new OpenAiCompatibleEndpointEnvironmentPostProcessor().postProcessEnvironment(environment, null);

        assertEquals("https://api.sanguicode.com", environment.getProperty("spring.ai.openai.base-url"));
        assertEquals("https://chat.example.com", environment.getProperty("spring.ai.openai.chat.base-url"));
        assertEquals("https://dashscope.aliyuncs.com/compatible-mode",
                environment.getProperty("spring.ai.openai.embedding.base-url"));
    }

    @Test
    void shouldBeRegisteredForSpringBootEnvironmentPostProcessing() throws Exception {
        Enumeration<URL> resources = getClass().getClassLoader().getResources("META-INF/spring.factories");
        boolean registered = false;
        while (resources.hasMoreElements()) {
            Properties properties = new Properties();
            try (InputStream input = resources.nextElement().openStream()) {
                properties.load(input);
            }
            String value = properties.getProperty("org.springframework.boot.env.EnvironmentPostProcessor", "");
            if (value.contains(OpenAiCompatibleEndpointEnvironmentPostProcessor.class.getName())) {
                registered = true;
                break;
            }
        }

        assertTrue(registered);
    }
}
