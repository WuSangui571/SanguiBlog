package com.sangui.sanguiblog.config;

import com.zaxxer.hikari.HikariDataSource;
import org.springframework.ai.embedding.EmbeddingModel;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.ai.vectorstore.pgvector.PgVectorStore;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.jdbc.DataSourceBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.util.StringUtils;

import javax.sql.DataSource;

@Configuration
@EnableConfigurationProperties(AiBlogRagProperties.class)
public class AiBlogVectorStoreConfig {

    private static final String UNSET_OPENAI_API_KEY = "__unset__";

    private final String openAiApiKey;
    private final String embeddingApiKey;
    private final String embeddingModelName;

    public AiBlogVectorStoreConfig(
            @Value("${AI_OPENAI_API_KEY:}") String openAiApiKey,
            @Value("${spring.ai.openai.embedding.api-key:${spring.ai.openai.api-key:}}") String embeddingApiKey,
            @Value("${spring.ai.openai.embedding.options.model:}") String embeddingModelName
    ) {
        this.openAiApiKey = openAiApiKey;
        this.embeddingApiKey = embeddingApiKey;
        this.embeddingModelName = embeddingModelName;
    }

    @Bean(name = "aiBlogVectorStore")
    @ConditionalOnProperty(prefix = "ai.rag", name = "enabled", havingValue = "true")
    public VectorStore aiBlogVectorStore(
            ObjectProvider<EmbeddingModel> embeddingModelProvider,
            AiBlogRagProperties properties
    ) {
        if (!isConfiguredOpenAiApiKey(resolveEmbeddingApiKey())) {
            throw new IllegalStateException("AI RAG 已启用，但未配置 AI_OPENAI_EMBEDDING_API_KEY 或 AI_OPENAI_API_KEY，无法初始化博客 RAG 向量库。");
        }
        if (!StringUtils.hasText(embeddingModelName)) {
            throw new IllegalStateException("AI RAG 已启用，但未配置 AI_OPENAI_EMBEDDING_MODEL，无法初始化博客 RAG 向量库。");
        }

        EmbeddingModel embeddingModel = embeddingModelProvider.getIfAvailable();
        if (embeddingModel == null) {
            throw new IllegalStateException("未找到 EmbeddingModel，无法初始化博客 RAG 向量库。请检查 AI_OPENAI_EMBEDDING_MODEL 和 AI_OPENAI_API_KEY 配置。");
        }

        DataSource pgVectorDataSource = DataSourceBuilder.create()
                .type(HikariDataSource.class)
                .driverClassName("org.postgresql.Driver")
                .url(properties.getPgvector().getUrl())
                .username(properties.getPgvector().getUsername())
                .password(properties.getPgvector().getPassword())
                .build();

        JdbcTemplate jdbcTemplate = new JdbcTemplate(pgVectorDataSource);

        return PgVectorStore.builder(jdbcTemplate, embeddingModel)
                .schemaName(properties.getPgvector().getSchema())
                .vectorTableName(properties.getPgvector().getTable())
                .initializeSchema(properties.getPgvector().isInitializeSchema())
                .build();
    }

    static boolean isConfiguredOpenAiApiKey(String apiKey) {
        return StringUtils.hasText(apiKey) && !UNSET_OPENAI_API_KEY.equals(apiKey.trim());
    }

    private String resolveEmbeddingApiKey() {
        return StringUtils.hasText(embeddingApiKey) ? embeddingApiKey : openAiApiKey;
    }
}
