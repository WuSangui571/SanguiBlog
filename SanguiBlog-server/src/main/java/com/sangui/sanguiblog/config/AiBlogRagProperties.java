package com.sangui.sanguiblog.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.util.StringUtils;

@Data
@ConfigurationProperties(prefix = "ai.rag")
public class AiBlogRagProperties {

    private boolean enabled;
    private int topK = 6;
    private double similarityThreshold = 0.72d;
    private boolean syncOnStartup = true;
    private PgVector pgvector = new PgVector();

    public boolean isConfigured() {
        return enabled
                && StringUtils.hasText(pgvector.getUrl())
                && StringUtils.hasText(pgvector.getUsername())
                && StringUtils.hasText(pgvector.getPassword());
    }

    @Data
    public static class PgVector {
        private String url;
        private String username;
        private String password;
        private String schema = "public";
        private String table = "vector_store";
        private boolean initializeSchema;
    }
}
