package com.sangui.sanguiblog.service.ai;

import com.sangui.sanguiblog.config.AiBlogRagProperties;
import com.sangui.sanguiblog.model.dto.AiAssistantAdminSettingsDto;
import com.sangui.sanguiblog.model.dto.AiAssistantAdminSettingsUpdateRequest;
import com.sangui.sanguiblog.model.dto.SiteMetaDto;
import com.sangui.sanguiblog.model.entity.SiteSetting;
import com.sangui.sanguiblog.model.repository.SiteSettingRepository;
import org.junit.jupiter.api.Test;
import org.springframework.ai.embedding.EmbeddingModel;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.support.DefaultListableBeanFactory;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class AiAssistantSettingServiceTest {

    private static final String CONFIGURED_KEY = "sk-test-key";
    private static final String CONFIGURED_BASE_URL = "https://api.openai.com";
    private static final String CONFIGURED_CHAT_MODEL = "gpt-4o-mini";
    private static final String CONFIGURED_EMBEDDING_MODEL = "text-embedding-3-small";

    // ── helpers ──

    private static AiAssistantSettingService service(
            SiteSettingRepository repository,
            String baseUrl, String chatModel, String apiKey,
            String embeddingModelName, String embeddingApiKey,
            AiBlogRagProperties ragProperties,
            ObjectProvider<EmbeddingModel> embeddingModelProvider,
            ObjectProvider<VectorStore> vectorStoreProvider
    ) {
        return new AiAssistantSettingService(
                repository, baseUrl, chatModel, apiKey,
                embeddingModelName, embeddingApiKey,
                ragProperties, embeddingModelProvider, vectorStoreProvider
        );
    }

    private static AiAssistantSettingService configuredService(SiteSettingRepository repository) {
        AiBlogRagProperties rag = new AiBlogRagProperties();
        rag.setEnabled(true);
        AiBlogRagProperties.PgVector pg = new AiBlogRagProperties.PgVector();
        pg.setUrl("jdbc:postgresql://localhost:5432/test");
        pg.setUsername("user");
        pg.setPassword("pass");
        rag.setPgvector(pg);

        return service(
                repository,
                CONFIGURED_BASE_URL, CONFIGURED_CHAT_MODEL, CONFIGURED_KEY,
                CONFIGURED_EMBEDDING_MODEL, CONFIGURED_KEY,
                rag,
                availableEmbeddingModelProvider(),
                availableVectorStoreProvider()
        );
    }

    private static AiAssistantSettingService configuredServiceNoRag(SiteSettingRepository repository) {
        AiBlogRagProperties rag = new AiBlogRagProperties();
        rag.setEnabled(false);

        return service(
                repository,
                CONFIGURED_BASE_URL, CONFIGURED_CHAT_MODEL, CONFIGURED_KEY,
                "", "",
                rag,
                emptyEmbeddingModelProvider(),
                emptyVectorStoreProvider()
        );
    }

    private static AiAssistantSettingService noApiKeyService(SiteSettingRepository repository) {
        AiBlogRagProperties rag = new AiBlogRagProperties();
        rag.setEnabled(false);

        return service(
                repository,
                CONFIGURED_BASE_URL, CONFIGURED_CHAT_MODEL, "",
                "", "",
                rag,
                emptyEmbeddingModelProvider(),
                emptyVectorStoreProvider()
        );
    }

    private static ObjectProvider<EmbeddingModel> emptyEmbeddingModelProvider() {
        return new DefaultListableBeanFactory().getBeanProvider(EmbeddingModel.class);
    }

    private static ObjectProvider<VectorStore> emptyVectorStoreProvider() {
        return new DefaultListableBeanFactory().getBeanProvider(VectorStore.class);
    }

    @SuppressWarnings("unchecked")
    private static ObjectProvider<EmbeddingModel> availableEmbeddingModelProvider() {
        ObjectProvider<EmbeddingModel> provider = mock(ObjectProvider.class);
        when(provider.getIfAvailable()).thenReturn(mock(EmbeddingModel.class));
        return provider;
    }

    @SuppressWarnings("unchecked")
    private static ObjectProvider<VectorStore> availableVectorStoreProvider() {
        ObjectProvider<VectorStore> provider = mock(ObjectProvider.class);
        when(provider.getIfAvailable()).thenReturn(mock(VectorStore.class));
        return provider;
    }

    private static SiteSetting setting(String key, String value) {
        SiteSetting siteSetting = new SiteSetting();
        siteSetting.setSettingKey(key);
        siteSetting.setSettingValue(value);
        return siteSetting;
    }

    // ── existing / backward-compat tests ──

    @Test
    void shouldFallbackToDefaultsWhenSettingsMissing() {
        SiteSettingRepository repository = mock(SiteSettingRepository.class);
        when(repository.findBySettingKey("ai.chat.enabled")).thenReturn(Optional.empty());
        when(repository.findBySettingKey("ai.rag.admin_enabled")).thenReturn(Optional.empty());
        when(repository.findBySettingKey("ai.chat.title")).thenReturn(Optional.empty());
        when(repository.findBySettingKey("ai.chat.welcome_message")).thenReturn(Optional.empty());
        when(repository.findBySettingKey("ai.chat.input_placeholder")).thenReturn(Optional.empty());
        when(repository.findBySettingKey("ai.chat.system_prompt")).thenReturn(Optional.empty());

        AiAssistantSettingService service = configuredService(repository);

        assertTrue(service.siteConfig().isEnabled());
        assertEquals("三桂博客AI助理", service.siteConfig().getTitle());
        assertEquals("你好，我是三桂博客AI助理", service.siteConfig().getWelcomeMessage());
        assertEquals("请输入你的问题...", service.siteConfig().getInputPlaceholder());
        assertEquals("...", service.siteConfig().getPendingReply());
        assertEquals(AiAssistantSettingService.DEFAULT_SYSTEM_PROMPT, service.systemPrompt());
    }

    @Test
    void shouldUseSiteSettingsWhenConfigured() {
        SiteSettingRepository repository = mock(SiteSettingRepository.class);
        when(repository.findBySettingKey("ai.chat.enabled"))
                .thenReturn(Optional.of(setting("ai.chat.enabled", "false")));
        when(repository.findBySettingKey("ai.rag.admin_enabled")).thenReturn(Optional.empty());
        when(repository.findBySettingKey("ai.chat.title"))
                .thenReturn(Optional.of(setting("ai.chat.title", "站内问答助理")));
        when(repository.findBySettingKey("ai.chat.welcome_message"))
                .thenReturn(Optional.of(setting("ai.chat.welcome_message", "欢迎来到三桂博客。")));
        when(repository.findBySettingKey("ai.chat.input_placeholder"))
                .thenReturn(Optional.of(setting("ai.chat.input_placeholder", "请输入博客相关问题")));
        when(repository.findBySettingKey("ai.chat.system_prompt"))
                .thenReturn(Optional.of(setting("ai.chat.system_prompt", "你只回答本站相关问题。")));

        AiAssistantSettingService service = configuredService(repository);

        assertFalse(service.siteConfig().isEnabled());
        assertEquals("站内问答助理", service.siteConfig().getTitle());
        assertEquals("欢迎来到三桂博客。", service.siteConfig().getWelcomeMessage());
        assertEquals("请输入博客相关问题", service.siteConfig().getInputPlaceholder());
        String prompt = service.systemPrompt();
        assertTrue(prompt.contains(AiAssistantSettingService.DEFAULT_SYSTEM_PROMPT));
        assertTrue(prompt.contains("你只回答本站相关问题。"));
    }

    @Test
    void shouldRejectChatWhenAssistantDisabled() {
        SiteSettingRepository repository = mock(SiteSettingRepository.class);
        when(repository.findBySettingKey("ai.chat.enabled"))
                .thenReturn(Optional.of(setting("ai.chat.enabled", "false")));
        when(repository.findBySettingKey("ai.rag.admin_enabled")).thenReturn(Optional.empty());

        AiAssistantSettingService service = configuredService(repository);

        ResponseStatusException exception = assertThrows(ResponseStatusException.class, service::assertEnabled);
        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, exception.getStatusCode());
    }

    // ── capability tests ──

    @Test
    void shouldMarkChatIncapableWhenApiKeyMissing() {
        SiteSettingRepository repository = mock(SiteSettingRepository.class);
        when(repository.findBySettingKey("ai.chat.enabled")).thenReturn(Optional.empty());
        when(repository.findBySettingKey("ai.rag.admin_enabled")).thenReturn(Optional.empty());

        AiAssistantSettingService service = noApiKeyService(repository);

        assertFalse(service.isChatCapable());
        assertFalse(service.isChatEffectiveEnabled());
        assertFalse(service.isEnabled());
        assertFalse(service.isRagCapable());
        assertFalse(service.isRagEffectiveEnabled());

        SiteMetaDto.AiAssistantDto siteConfig = service.siteConfig();
        assertFalse(siteConfig.isEnabled());
        assertFalse(siteConfig.isCapable());
        assertFalse(siteConfig.isRagEnabled());
        assertFalse(siteConfig.isRagCapable());
        assertNotNull(siteConfig.getDisabledReason());
        assertTrue(siteConfig.getDisabledReason().contains("API key"));
    }

    @Test
    void shouldMarkChatIncapableWhenChatModelMissing() {
        SiteSettingRepository repository = mock(SiteSettingRepository.class);
        when(repository.findBySettingKey("ai.chat.enabled")).thenReturn(Optional.empty());
        when(repository.findBySettingKey("ai.rag.admin_enabled")).thenReturn(Optional.empty());

        AiAssistantSettingService service = service(
                repository,
                CONFIGURED_BASE_URL, "", CONFIGURED_KEY,
                "", "", new AiBlogRagProperties(),
                emptyEmbeddingModelProvider(), emptyVectorStoreProvider()
        );

        assertFalse(service.isChatCapable());
        assertTrue(service.siteConfig().getDisabledReason().contains("chat model"));
    }

    @Test
    void shouldMarkChatCapableWhenAllChatConfigPresent() {
        SiteSettingRepository repository = mock(SiteSettingRepository.class);
        when(repository.findBySettingKey("ai.chat.enabled")).thenReturn(Optional.empty());
        when(repository.findBySettingKey("ai.rag.admin_enabled")).thenReturn(Optional.empty());

        AiAssistantSettingService service = configuredService(repository);

        assertTrue(service.isChatCapable());
        assertTrue(service.isChatEffectiveEnabled());
        SiteMetaDto.AiAssistantDto siteConfig = service.siteConfig();
        assertTrue(siteConfig.isEnabled());
        assertTrue(siteConfig.isCapable());
        assertNull(siteConfig.getDisabledReason());
    }

    @Test
    void shouldMarkRagIncapableWhenEmbeddingModelMissing() {
        SiteSettingRepository repository = mock(SiteSettingRepository.class);
        when(repository.findBySettingKey("ai.chat.enabled")).thenReturn(Optional.empty());
        when(repository.findBySettingKey("ai.rag.admin_enabled")).thenReturn(Optional.empty());

        AiAssistantSettingService service = configuredServiceNoRag(repository);

        assertFalse(service.isRagCapable());
        assertFalse(service.isRagEffectiveEnabled());
        SiteMetaDto.AiAssistantDto siteConfig = service.siteConfig();
        assertFalse(siteConfig.isRagEnabled());
        assertFalse(siteConfig.isRagCapable());
    }

    @Test
    void shouldMarkRagIncapableWhenVectorStoreMissing() {
        SiteSettingRepository repository = mock(SiteSettingRepository.class);
        when(repository.findBySettingKey("ai.chat.enabled")).thenReturn(Optional.empty());
        when(repository.findBySettingKey("ai.rag.admin_enabled")).thenReturn(Optional.empty());

        AiBlogRagProperties rag = new AiBlogRagProperties();
        rag.setEnabled(true);
        AiBlogRagProperties.PgVector pg = new AiBlogRagProperties.PgVector();
        pg.setUrl("jdbc:postgresql://localhost:5432/test");
        pg.setUsername("user");
        pg.setPassword("pass");
        rag.setPgvector(pg);

        AiAssistantSettingService service = service(
                repository,
                CONFIGURED_BASE_URL, CONFIGURED_CHAT_MODEL, CONFIGURED_KEY,
                CONFIGURED_EMBEDDING_MODEL, CONFIGURED_KEY,
                rag,
                availableEmbeddingModelProvider(),
                emptyVectorStoreProvider()
        );

        assertFalse(service.isRagCapable());
        assertFalse(service.isRagEffectiveEnabled());
        assertTrue(service.siteConfig().getRagDisabledReason().contains("vector store"));
    }

    @Test
    void shouldMarkRagIncapableWhenPgVectorTableMissing() {
        SiteSettingRepository repository = mock(SiteSettingRepository.class);
        when(repository.findBySettingKey("ai.chat.enabled")).thenReturn(Optional.empty());
        when(repository.findBySettingKey("ai.rag.admin_enabled")).thenReturn(Optional.empty());

        AiBlogRagProperties rag = new AiBlogRagProperties();
        rag.setEnabled(true);
        AiBlogRagProperties.PgVector pg = new AiBlogRagProperties.PgVector();
        pg.setUrl("jdbc:postgresql://localhost:5432/test");
        pg.setUsername("user");
        pg.setPassword("pass");
        pg.setTable(" ");
        rag.setPgvector(pg);

        AiAssistantSettingService service = service(
                repository,
                CONFIGURED_BASE_URL, CONFIGURED_CHAT_MODEL, CONFIGURED_KEY,
                CONFIGURED_EMBEDDING_MODEL, CONFIGURED_KEY,
                rag,
                availableEmbeddingModelProvider(),
                availableVectorStoreProvider()
        );

        assertFalse(service.isRagCapable());
        assertTrue(service.siteConfig().getRagDisabledReason().contains("PgVector"));
    }

    @Test
    void shouldUseDedicatedEmbeddingApiKeyForRagCapability() {
        SiteSettingRepository repository = mock(SiteSettingRepository.class);
        when(repository.findBySettingKey("ai.chat.enabled")).thenReturn(Optional.empty());
        when(repository.findBySettingKey("ai.rag.admin_enabled")).thenReturn(Optional.empty());

        AiBlogRagProperties rag = new AiBlogRagProperties();
        rag.setEnabled(true);
        AiBlogRagProperties.PgVector pg = new AiBlogRagProperties.PgVector();
        pg.setUrl("jdbc:postgresql://localhost:5432/test");
        pg.setUsername("user");
        pg.setPassword("pass");
        rag.setPgvector(pg);

        AiAssistantSettingService service = service(
                repository,
                CONFIGURED_BASE_URL, CONFIGURED_CHAT_MODEL, "__unset__",
                CONFIGURED_EMBEDDING_MODEL, "embedding-key",
                rag,
                availableEmbeddingModelProvider(),
                availableVectorStoreProvider()
        );

        assertFalse(service.isChatCapable());
        assertTrue(service.isRagCapable());
        assertFalse(service.isRagEffectiveEnabled());
    }

    @Test
    void shouldReturnFullCapableWhenAllConfigPresent() {
        SiteSettingRepository repository = mock(SiteSettingRepository.class);
        when(repository.findBySettingKey("ai.chat.enabled")).thenReturn(Optional.empty());
        when(repository.findBySettingKey("ai.rag.admin_enabled")).thenReturn(Optional.empty());

        AiAssistantSettingService service = configuredService(repository);

        assertTrue(service.isChatCapable());
        assertTrue(service.isRagCapable());
        assertTrue(service.isChatEffectiveEnabled());
        SiteMetaDto.AiAssistantDto siteConfig = service.siteConfig();
        assertTrue(siteConfig.isEnabled());
        assertTrue(siteConfig.isCapable());
        assertTrue(siteConfig.isRagCapable());
        assertNull(siteConfig.getDisabledReason());
    }

    // ── effective state tests ──

    @Test
    void shouldMakeRagEffectiveFalseWhenChatAdminDisabled() {
        SiteSettingRepository repository = mock(SiteSettingRepository.class);
        when(repository.findBySettingKey("ai.chat.enabled"))
                .thenReturn(Optional.of(setting("ai.chat.enabled", "false")));
        when(repository.findBySettingKey("ai.rag.admin_enabled"))
                .thenReturn(Optional.of(setting("ai.rag.admin_enabled", "true")));
        when(repository.findBySettingKey("ai.chat.title")).thenReturn(Optional.empty());
        when(repository.findBySettingKey("ai.chat.welcome_message")).thenReturn(Optional.empty());
        when(repository.findBySettingKey("ai.chat.input_placeholder")).thenReturn(Optional.empty());
        when(repository.findBySettingKey("ai.chat.system_prompt")).thenReturn(Optional.empty());

        AiAssistantSettingService service = configuredService(repository);

        assertFalse(service.isChatEffectiveEnabled());
        assertFalse(service.isRagEffectiveEnabled());
        SiteMetaDto.AiAssistantDto siteConfig = service.siteConfig();
        assertFalse(siteConfig.isEnabled());
        assertFalse(siteConfig.isRagEnabled());
        assertTrue(siteConfig.isRagCapable());
        assertTrue(siteConfig.getRagDisabledReason().contains("chat is disabled"));
    }

    @Test
    void shouldMakeRagEffectiveTrueWhenAllEnabledAndCapable() {
        SiteSettingRepository repository = mock(SiteSettingRepository.class);
        when(repository.findBySettingKey("ai.chat.enabled"))
                .thenReturn(Optional.of(setting("ai.chat.enabled", "true")));
        when(repository.findBySettingKey("ai.rag.admin_enabled"))
                .thenReturn(Optional.of(setting("ai.rag.admin_enabled", "true")));
        when(repository.findBySettingKey("ai.chat.title")).thenReturn(Optional.empty());
        when(repository.findBySettingKey("ai.chat.welcome_message")).thenReturn(Optional.empty());
        when(repository.findBySettingKey("ai.chat.input_placeholder")).thenReturn(Optional.empty());
        when(repository.findBySettingKey("ai.chat.system_prompt")).thenReturn(Optional.empty());

        AiAssistantSettingService service = configuredService(repository);

        assertTrue(service.isChatEffectiveEnabled());
        assertTrue(service.isRagEffectiveEnabled());
        SiteMetaDto.AiAssistantDto siteConfig = service.siteConfig();
        assertTrue(siteConfig.isEnabled());
        assertTrue(siteConfig.isRagEnabled());
        assertNull(siteConfig.getRagDisabledReason());
    }

    @Test
    void shouldLeaveRagEffectiveFalseWhenRagAdminDisabled() {
        SiteSettingRepository repository = mock(SiteSettingRepository.class);
        when(repository.findBySettingKey("ai.chat.enabled")).thenReturn(Optional.empty());
        when(repository.findBySettingKey("ai.rag.admin_enabled")).thenReturn(Optional.empty());
        when(repository.findBySettingKey("ai.chat.title")).thenReturn(Optional.empty());
        when(repository.findBySettingKey("ai.chat.welcome_message")).thenReturn(Optional.empty());
        when(repository.findBySettingKey("ai.chat.input_placeholder")).thenReturn(Optional.empty());
        when(repository.findBySettingKey("ai.chat.system_prompt")).thenReturn(Optional.empty());

        AiAssistantSettingService service = configuredService(repository);

        assertTrue(service.isChatEffectiveEnabled());
        assertFalse(service.isRagEffectiveEnabled());
        SiteMetaDto.AiAssistantDto siteConfig = service.siteConfig();
        assertTrue(siteConfig.isEnabled());
        assertTrue(siteConfig.isRagCapable());
        assertFalse(siteConfig.isRagEnabled());
    }

    // ── admin settings DTO tests ──

    @Test
    void adminSettingsShouldReturnAllFields() {
        SiteSettingRepository repository = mock(SiteSettingRepository.class);
        when(repository.findBySettingKey("ai.chat.enabled")).thenReturn(Optional.empty());
        when(repository.findBySettingKey("ai.rag.admin_enabled")).thenReturn(Optional.empty());

        AiAssistantSettingService service = configuredService(repository);
        AiAssistantAdminSettingsDto dto = service.adminSettings();

        assertTrue(dto.isAiChatAdminEnabled());
        assertFalse(dto.isAiRagAdminEnabled());
        assertTrue(dto.isAiChatCapable());
        assertTrue(dto.isAiRagCapable());
        assertTrue(dto.isAiChatEffectiveEnabled());
        assertFalse(dto.isAiRagEffectiveEnabled());
        assertNull(dto.getAiChatDisabledReason());
        assertNotNull(dto.getAiRagDisabledReason());
        assertTrue(dto.getAiRagDisabledReason().contains("disabled by administrator"));
        assertTrue(dto.isEnabled());
    }

    // ── update validation tests ──

    @Test
    void shouldRejectEnableChatWhenCapabilityMissing() {
        SiteSettingRepository repository = mock(SiteSettingRepository.class);
        when(repository.findBySettingKey("ai.chat.enabled")).thenReturn(Optional.empty());
        when(repository.findBySettingKey("ai.rag.admin_enabled")).thenReturn(Optional.empty());

        AiAssistantSettingService service = noApiKeyService(repository);
        AiAssistantAdminSettingsUpdateRequest request = new AiAssistantAdminSettingsUpdateRequest();
        request.setAiChatAdminEnabled(true);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> service.updateSettings(request));
        assertTrue(ex.getMessage().contains("API key"));
    }

    @Test
    void shouldRejectEnableRagWhenChatNotEffective() {
        SiteSettingRepository repository = mock(SiteSettingRepository.class);
        when(repository.findBySettingKey("ai.chat.enabled"))
                .thenReturn(Optional.of(setting("ai.chat.enabled", "false")));
        when(repository.findBySettingKey("ai.rag.admin_enabled")).thenReturn(Optional.empty());

        AiAssistantSettingService service = configuredService(repository);
        AiAssistantAdminSettingsUpdateRequest request = new AiAssistantAdminSettingsUpdateRequest();
        request.setAiRagAdminEnabled(true);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> service.updateSettings(request));
        assertTrue(ex.getMessage().contains("chat is disabled"));
    }

    @Test
    void shouldRejectEnableRagWhenRagCapabilityMissing() {
        SiteSettingRepository repository = mock(SiteSettingRepository.class);
        when(repository.findBySettingKey("ai.chat.enabled")).thenReturn(Optional.empty());
        when(repository.findBySettingKey("ai.rag.admin_enabled")).thenReturn(Optional.empty());

        AiAssistantSettingService service = configuredServiceNoRag(repository);
        AiAssistantAdminSettingsUpdateRequest request = new AiAssistantAdminSettingsUpdateRequest();
        request.setAiRagAdminEnabled(true);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> service.updateSettings(request));
        assertTrue(ex.getMessage().contains("embedding"));
    }

    @Test
    void shouldAllowEnableChatWhenCapable() {
        SiteSettingRepository repository = mock(SiteSettingRepository.class);
        when(repository.findBySettingKey("ai.chat.enabled")).thenReturn(Optional.empty());
        when(repository.findBySettingKey("ai.rag.admin_enabled")).thenReturn(Optional.empty());
        when(repository.save(org.mockito.ArgumentMatchers.any())).thenAnswer(inv -> inv.getArgument(0));

        AiAssistantSettingService service = configuredService(repository);
        AiAssistantAdminSettingsUpdateRequest request = new AiAssistantAdminSettingsUpdateRequest();
        request.setAiChatAdminEnabled(true);

        AiAssistantAdminSettingsDto result = service.updateSettings(request);
        assertTrue(result.isAiChatEffectiveEnabled());
    }

    @Test
    void shouldAllowLegacyEnabledForBackwardCompat() {
        SiteSettingRepository repository = mock(SiteSettingRepository.class);
        when(repository.findBySettingKey("ai.chat.enabled")).thenReturn(Optional.empty());
        when(repository.findBySettingKey("ai.rag.admin_enabled")).thenReturn(Optional.empty());
        when(repository.save(org.mockito.ArgumentMatchers.any())).thenAnswer(inv -> inv.getArgument(0));

        AiAssistantSettingService service = configuredService(repository);
        AiAssistantAdminSettingsUpdateRequest request = new AiAssistantAdminSettingsUpdateRequest();
        request.setEnabled(true);

        AiAssistantAdminSettingsDto result = service.updateSettings(request);
        assertTrue(result.isAiChatEffectiveEnabled());
    }

    @Test
    void shouldPreferNewChatFieldOverLegacy() {
        SiteSettingRepository repository = mock(SiteSettingRepository.class);
        when(repository.findBySettingKey("ai.chat.enabled"))
                .thenReturn(Optional.of(setting("ai.chat.enabled", "true")));
        when(repository.findBySettingKey("ai.rag.admin_enabled")).thenReturn(Optional.empty());
        when(repository.save(org.mockito.ArgumentMatchers.any())).thenAnswer(inv -> inv.getArgument(0));

        AiAssistantSettingService service = configuredService(repository);
        AiAssistantAdminSettingsUpdateRequest request = new AiAssistantAdminSettingsUpdateRequest();
        request.setAiChatAdminEnabled(false);
        request.setEnabled(true);

        AiAssistantAdminSettingsDto result = service.updateSettings(request);
        assertFalse(result.isAiChatEffectiveEnabled());
    }
}
