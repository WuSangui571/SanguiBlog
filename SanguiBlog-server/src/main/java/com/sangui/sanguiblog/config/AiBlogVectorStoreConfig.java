package com.sangui.sanguiblog.config;

import com.zaxxer.hikari.HikariDataSource;
import org.springframework.ai.embedding.EmbeddingModel;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.ai.vectorstore.pgvector.PgVectorStore;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.jdbc.DataSourceBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;

import javax.sql.DataSource;

@Configuration
@EnableConfigurationProperties(AiBlogRagProperties.class)
public class AiBlogVectorStoreConfig {

    @Bean(name = "aiBlogVectorStore")
    @ConditionalOnProperty(prefix = "ai.rag", name = "enabled", havingValue = "true")
    public VectorStore aiBlogVectorStore(
            ObjectProvider<EmbeddingModel> embeddingModelProvider,
            AiBlogRagProperties properties
    ) {
        EmbeddingModel embeddingModel = embeddingModelProvider.getIfAvailable();
        if (embeddingModel == null) {
            throw new IllegalStateException("未找到 DashScope EmbeddingModel，无法初始化博客 RAG 向量库");
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
}
