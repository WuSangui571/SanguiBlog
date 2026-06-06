package com.sangui.sanguiblog.config;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.env.EnvironmentPostProcessor;
import org.springframework.core.Ordered;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.MapPropertySource;
import org.springframework.util.StringUtils;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.regex.Pattern;

/**
 * Accepts OpenAI-compatible endpoint values that include the common trailing /v1
 * segment while keeping Spring AI's own /v1 request paths intact.
 */
public class OpenAiCompatibleEndpointEnvironmentPostProcessor implements EnvironmentPostProcessor, Ordered {

    private static final String PROPERTY_SOURCE_NAME = "openAiCompatibleEndpointOverrides";
    private static final Pattern TRAILING_V1_PATH = Pattern.compile("(?i)/v1/?$");

    private static final String COMMON_BASE_URL_PROPERTY = "spring.ai.openai.base-url";
    private static final String CHAT_BASE_URL_PROPERTY = "spring.ai.openai.chat.base-url";
    private static final String EMBEDDING_BASE_URL_PROPERTY = "spring.ai.openai.embedding.base-url";

    @Override
    public void postProcessEnvironment(ConfigurableEnvironment environment, SpringApplication application) {
        Map<String, Object> overrides = new LinkedHashMap<>();
        normalizeProperty(environment, overrides, COMMON_BASE_URL_PROPERTY);
        normalizeProperty(environment, overrides, CHAT_BASE_URL_PROPERTY);
        normalizeProperty(environment, overrides, EMBEDDING_BASE_URL_PROPERTY);

        if (!overrides.isEmpty()) {
            environment.getPropertySources().addFirst(new MapPropertySource(PROPERTY_SOURCE_NAME, overrides));
        }
    }

    @Override
    public int getOrder() {
        return Ordered.LOWEST_PRECEDENCE;
    }

    private static void normalizeProperty(
            ConfigurableEnvironment environment,
            Map<String, Object> overrides,
            String propertyName
    ) {
        String configuredValue = environment.getProperty(propertyName);
        String normalizedValue = normalizeBaseUrl(configuredValue);
        if (normalizedValue != null && !normalizedValue.equals(configuredValue)) {
            overrides.put(propertyName, normalizedValue);
        }
    }

    static String normalizeBaseUrl(String baseUrl) {
        if (!StringUtils.hasText(baseUrl)) {
            return baseUrl;
        }
        String trimmed = baseUrl.trim();
        return TRAILING_V1_PATH.matcher(trimmed).replaceFirst("");
    }
}
