package com.sangui.sanguiblog.config;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class AiBlogRagPropertiesTest {

    @Test
    void shouldReportEnvironmentDisabledWhenEnabledIsFalse() {
        AiBlogRagProperties properties = new AiBlogRagProperties();
        properties.setEnabled(false);

        assertFalse(properties.isRagEnvironmentEnabled());
        assertFalse(properties.isConfigured());
    }

    @Test
    void shouldReportEnvironmentEnabledWhenEnabledIsTrue() {
        AiBlogRagProperties properties = new AiBlogRagProperties();
        properties.setEnabled(true);

        assertTrue(properties.isRagEnvironmentEnabled());
        assertFalse(properties.isPgVectorConfigured());
        assertFalse(properties.isConfigured());
    }

    @Test
    void shouldReportPgVectorConfiguredWhenAllFieldsPresent() {
        AiBlogRagProperties properties = new AiBlogRagProperties();
        properties.setEnabled(true);
        AiBlogRagProperties.PgVector pg = new AiBlogRagProperties.PgVector();
        pg.setUrl("jdbc:postgresql://localhost:5432/test");
        pg.setUsername("user");
        pg.setPassword("pass");
        pg.setSchema("public");
        pg.setTable("vector_store");
        properties.setPgvector(pg);

        assertTrue(properties.isRagEnvironmentEnabled());
        assertTrue(properties.isPgVectorConfigured());
        assertTrue(properties.isConfigured());
    }

    @Test
    void shouldReportPgVectorNotConfiguredWhenUrlMissing() {
        AiBlogRagProperties properties = new AiBlogRagProperties();
        properties.setEnabled(true);
        AiBlogRagProperties.PgVector pg = new AiBlogRagProperties.PgVector();
        pg.setUsername("user");
        pg.setPassword("pass");
        properties.setPgvector(pg);

        assertTrue(properties.isRagEnvironmentEnabled());
        assertFalse(properties.isPgVectorConfigured());
        assertFalse(properties.isConfigured());
    }

    @Test
    void shouldReportPgVectorNotConfiguredWhenUserMissing() {
        AiBlogRagProperties properties = new AiBlogRagProperties();
        properties.setEnabled(true);
        AiBlogRagProperties.PgVector pg = new AiBlogRagProperties.PgVector();
        pg.setUrl("jdbc:postgresql://localhost:5432/test");
        pg.setPassword("pass");
        properties.setPgvector(pg);

        assertTrue(properties.isRagEnvironmentEnabled());
        assertFalse(properties.isPgVectorConfigured());
        assertFalse(properties.isConfigured());
    }

    @Test
    void shouldReportPgVectorNotConfiguredWhenPasswordMissing() {
        AiBlogRagProperties properties = new AiBlogRagProperties();
        properties.setEnabled(true);
        AiBlogRagProperties.PgVector pg = new AiBlogRagProperties.PgVector();
        pg.setUrl("jdbc:postgresql://localhost:5432/test");
        pg.setUsername("user");
        properties.setPgvector(pg);

        assertTrue(properties.isRagEnvironmentEnabled());
        assertFalse(properties.isPgVectorConfigured());
        assertFalse(properties.isConfigured());
    }

    @Test
    void isConfiguredShouldBeFalseWhenEnvDisabledButPgVectorConfigured() {
        AiBlogRagProperties properties = new AiBlogRagProperties();
        properties.setEnabled(false);
        AiBlogRagProperties.PgVector pg = new AiBlogRagProperties.PgVector();
        pg.setUrl("jdbc:postgresql://localhost:5432/test");
        pg.setUsername("user");
        pg.setPassword("pass");
        properties.setPgvector(pg);

        assertFalse(properties.isRagEnvironmentEnabled());
        assertTrue(properties.isPgVectorConfigured());
        assertFalse(properties.isConfigured());
    }

    @Test
    void isPgVectorConfiguredShouldUseDefaultSchemaAndTable() {
        AiBlogRagProperties properties = new AiBlogRagProperties();
        properties.setEnabled(true);
        AiBlogRagProperties.PgVector pg = new AiBlogRagProperties.PgVector();
        pg.setUrl("jdbc:postgresql://localhost:5432/test");
        pg.setUsername("user");
        pg.setPassword("pass");
        properties.setPgvector(pg);

        assertTrue(properties.isPgVectorConfigured());
        assertTrue(properties.isConfigured());
    }
}
