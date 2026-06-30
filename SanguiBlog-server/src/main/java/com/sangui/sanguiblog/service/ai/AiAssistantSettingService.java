package com.sangui.sanguiblog.service.ai;

import com.sangui.sanguiblog.config.AiBlogRagProperties;
import com.sangui.sanguiblog.model.dto.AiAssistantAdminSettingsDto;
import com.sangui.sanguiblog.model.dto.AiAssistantAdminSettingsUpdateRequest;
import com.sangui.sanguiblog.model.dto.SiteMetaDto;
import com.sangui.sanguiblog.model.entity.SiteSetting;
import com.sangui.sanguiblog.model.repository.SiteSettingRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.embedding.EmbeddingModel;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;

@Service
public class AiAssistantSettingService {

    private static final Logger log = LoggerFactory.getLogger(AiAssistantSettingService.class);

    public static final boolean DEFAULT_ENABLED = true;
    static final boolean DEFAULT_RAG_ADMIN_ENABLED = false;
    public static final String DEFAULT_ASSISTANT_NAME = "三桂";
    public static final String DEFAULT_TITLE = "三桂博客AI助理";
    public static final String DEFAULT_WELCOME_MESSAGE = "你好，我是三桂博客AI助理";
    public static final String DEFAULT_INPUT_PLACEHOLDER = "请输入你的问题...";
    public static final String DEFAULT_PENDING_REPLY = "...";
    public static final String DEFAULT_SYSTEM_PROMPT = """
            你是三桂博客的站内 AI 助理，名字叫三桂。
            你的回答面向博客访客，风格简洁、直接、专业。
            开场欢迎语已经由前端首屏单独展示，后续回答不要重复自我介绍，不要再说"我是三桂"或类似欢迎语，除非用户明确要求你介绍自己。
            直接回答用户问题，不要在每次回答开头重复寒暄。
            当系统提供"站内知识检索上下文"时，优先依据这些内容回答，不能与检索上下文冲突。
            如果检索上下文不足以支持结论，要明确说明"当前知识库没有提供足够信息"，不要编造站内事实。
            当问题与三桂博客、Spring Boot、React、Java、编程、博客创作相关时，可以基于通用知识给出帮助。
            除非用户明确要求，否则不要输出冗长说明，不要自称大型语言模型。
            """;

    private static final String UNSET_OPENAI_API_KEY = "__unset__";
    private static final String KEY_CHAT_ENABLED = "ai.chat.enabled";
    private static final String KEY_RAG_ADMIN_ENABLED = "ai.rag.admin_enabled";
    private static final String KEY_ASSISTANT_NAME = "ai.chat.assistant_name";
    private static final String KEY_TITLE = "ai.chat.title";
    private static final String KEY_WELCOME_MESSAGE = "ai.chat.welcome_message";
    private static final String KEY_INPUT_PLACEHOLDER = "ai.chat.input_placeholder";
    private static final String KEY_PENDING_REPLY = "ai.chat.pending_reply";
    private static final String KEY_SYSTEM_PROMPT = "ai.chat.system_prompt";

    private final SiteSettingRepository siteSettingRepository;
    private final String openaiBaseUrl;
    private final String chatModel;
    private final String openaiApiKey;
    private final String embeddingModelName;
    private final String embeddingApiKey;
    private final AiBlogRagProperties ragProperties;
    private final ObjectProvider<EmbeddingModel> embeddingModelProvider;
    private final ObjectProvider<VectorStore> vectorStoreProvider;

    public AiAssistantSettingService(
            SiteSettingRepository siteSettingRepository,
            @Value("${spring.ai.openai.base-url:https://api.openai.com}") String openaiBaseUrl,
            @Value("${spring.ai.openai.chat.options.model:}") String chatModel,
            @Value("${spring.ai.openai.api-key:}") String openaiApiKey,
            @Value("${spring.ai.openai.embedding.options.model:}") String embeddingModelName,
            @Value("${spring.ai.openai.embedding.api-key:${spring.ai.openai.api-key:}}") String embeddingApiKey,
            AiBlogRagProperties ragProperties,
            ObjectProvider<EmbeddingModel> embeddingModelProvider,
            ObjectProvider<VectorStore> vectorStoreProvider
    ) {
        this.siteSettingRepository = siteSettingRepository;
        this.openaiBaseUrl = openaiBaseUrl;
        this.chatModel = chatModel;
        this.openaiApiKey = openaiApiKey;
        this.embeddingModelName = embeddingModelName;
        this.embeddingApiKey = embeddingApiKey;
        this.ragProperties = ragProperties;
        this.embeddingModelProvider = embeddingModelProvider;
        this.vectorStoreProvider = vectorStoreProvider;
    }

    // ── public site meta ──

    public SiteMetaDto.AiAssistantDto siteConfig() {
        boolean chatEffective = isChatEffectiveEnabled();
        boolean chatCapable = isChatCapable();
        boolean ragEffective = isRagEffectiveEnabled();
        boolean ragCapable = isRagCapable();

        return SiteMetaDto.AiAssistantDto.builder()
                .enabled(chatEffective)
                .capable(chatCapable)
                .ragEnabled(ragEffective)
                .ragCapable(ragCapable)
                .disabledReason(chatEffective ? null : buildChatDisabledReason())
                .ragDisabledReason(ragEffective ? null : buildRagDisabledReason(chatEffective))
                .assistantName(readSetting(KEY_ASSISTANT_NAME, DEFAULT_ASSISTANT_NAME))
                .title(readSetting(KEY_TITLE, DEFAULT_TITLE))
                .welcomeMessage(readSetting(KEY_WELCOME_MESSAGE, DEFAULT_WELCOME_MESSAGE))
                .inputPlaceholder(readSetting(KEY_INPUT_PLACEHOLDER, DEFAULT_INPUT_PLACEHOLDER))
                .pendingReply(readSetting(KEY_PENDING_REPLY, DEFAULT_PENDING_REPLY))
                .build();
    }

    // ── public admin settings ──

    public AiAssistantAdminSettingsDto adminSettings() {
        boolean chatAdmin = isChatAdminEnabled();
        boolean ragAdmin = isRagAdminEnabled();
        boolean chatCapable = isChatCapable();
        boolean ragCapable = isRagCapable();
        boolean chatEffective = isChatEffectiveEnabled();
        boolean ragEffective = isRagEffectiveEnabled();

        return AiAssistantAdminSettingsDto.builder()
                .aiChatAdminEnabled(chatAdmin)
                .aiRagAdminEnabled(ragAdmin)
                .aiChatCapable(chatCapable)
                .aiRagCapable(ragCapable)
                .aiChatEffectiveEnabled(chatEffective)
                .aiRagEffectiveEnabled(ragEffective)
                .aiChatDisabledReason(chatEffective ? null : buildChatDisabledReason())
                .aiRagDisabledReason(ragEffective ? null : buildRagDisabledReason(chatEffective))
                .enabled(chatEffective)
                .build();
    }

    // ── public state queries ──

    public boolean isChatAdminEnabled() {
        return siteSettingRepository.findBySettingKey(KEY_CHAT_ENABLED)
                .map(SiteSetting::getSettingValue)
                .map(String::trim)
                .filter(StringUtils::hasText)
                .map(this::parseEnabledValue)
                .orElse(DEFAULT_ENABLED);
    }

    public boolean isRagAdminEnabled() {
        return siteSettingRepository.findBySettingKey(KEY_RAG_ADMIN_ENABLED)
                .map(SiteSetting::getSettingValue)
                .map(String::trim)
                .filter(StringUtils::hasText)
                .map(this::parseEnabledValue)
                .orElse(DEFAULT_RAG_ADMIN_ENABLED);
    }

    public boolean isChatCapable() {
        return isConfiguredApiKey()
                && StringUtils.hasText(openaiBaseUrl)
                && StringUtils.hasText(chatModel);
    }

    public boolean isRagCapable() {
        return isConfiguredEmbeddingApiKey()
                && StringUtils.hasText(embeddingModelName)
                && ragProperties.isRagEnvironmentEnabled()
                && ragProperties.isPgVectorConfigured()
                && embeddingModelProvider.getIfAvailable() != null
                && vectorStoreProvider.getIfAvailable() != null;
    }

    public boolean isChatEffectiveEnabled() {
        return isChatCapable() && isChatAdminEnabled();
    }

    public boolean isRagEffectiveEnabled() {
        return isChatEffectiveEnabled() && isRagCapable() && isRagAdminEnabled();
    }

    public boolean isEnabled() {
        return isChatEffectiveEnabled();
    }

    public void assertEnabled() {
        if (!isChatEffectiveEnabled()) {
            String reason = buildChatDisabledReason();
            log.warn("AI chat endpoint blocked: {}", reason);
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, reason);
        }
    }

    // ── system prompt ──

    public String systemPrompt() {
        String customPrompt = readSetting(KEY_SYSTEM_PROMPT, "");
        if (!StringUtils.hasText(customPrompt)) {
            return DEFAULT_SYSTEM_PROMPT;
        }
        return DEFAULT_SYSTEM_PROMPT
                + System.lineSeparator()
                + System.lineSeparator()
                + "附加站点指令："
                + System.lineSeparator()
                + customPrompt;
    }

    // ── admin update (replaces old updateEnabled) ──

    @Transactional
    public AiAssistantAdminSettingsDto updateSettings(AiAssistantAdminSettingsUpdateRequest request) {
        Boolean newChatAdmin = request.getAiChatAdminEnabled();
        Boolean newRagAdmin = request.getAiRagAdminEnabled();
        Boolean legacyEnabled = request.getEnabled();

        boolean targetChatAdmin = isChatAdminEnabled();
        boolean updateChat = false;
        if (newChatAdmin != null) {
            targetChatAdmin = newChatAdmin;
            updateChat = true;
        } else if (legacyEnabled != null) {
            targetChatAdmin = legacyEnabled;
            updateChat = true;
        }

        boolean targetRagAdmin = isRagAdminEnabled();
        boolean updateRag = false;
        if (newRagAdmin != null) {
            targetRagAdmin = newRagAdmin;
            updateRag = true;
        }

        if (updateChat && targetChatAdmin && !isChatCapable()) {
            throw new IllegalArgumentException(buildChatDisabledReason());
        }
        if (updateRag && targetRagAdmin) {
            boolean chatEffective = updateChat ? (isChatCapable() && targetChatAdmin) : isChatEffectiveEnabled();
            if (!chatEffective) {
                throw new IllegalArgumentException("AI chat is disabled, cannot enable RAG");
            }
            if (!isRagCapable()) {
                throw new IllegalArgumentException(buildRagDisabledReason(chatEffective));
            }
        }

        if (updateChat) {
            saveSetting(
                    KEY_CHAT_ENABLED,
                    Boolean.toString(targetChatAdmin),
                    "AI 聊天管理开关。关闭后前端入口隐藏，后端聊天接口停止提供服务。"
            );
        }
        if (updateRag) {
            saveSetting(
                    KEY_RAG_ADMIN_ENABLED,
                    Boolean.toString(targetRagAdmin),
                    "AI RAG 检索管理开关。关闭后向量检索不参与聊天。"
            );
        }

        return adminSettings();
    }

    @Transactional
    public AiAssistantAdminSettingsDto updateEnabled(boolean enabled) {
        AiAssistantAdminSettingsUpdateRequest request = new AiAssistantAdminSettingsUpdateRequest();
        request.setEnabled(enabled);
        return updateSettings(request);
    }

    // ── private helpers ──

    private boolean isConfiguredApiKey() {
        return StringUtils.hasText(openaiApiKey) && !UNSET_OPENAI_API_KEY.equals(openaiApiKey.trim());
    }

    private String resolveEmbeddingApiKey() {
        return StringUtils.hasText(embeddingApiKey) ? embeddingApiKey : openaiApiKey;
    }

    private boolean isConfiguredEmbeddingApiKey() {
        String key = resolveEmbeddingApiKey();
        return StringUtils.hasText(key) && !UNSET_OPENAI_API_KEY.equals(key.trim());
    }

    private String buildChatDisabledReason() {
        if (!isConfiguredApiKey()) {
            return "AI API key not configured";
        }
        if (!StringUtils.hasText(openaiBaseUrl)) {
            return "AI base URL not configured";
        }
        if (!StringUtils.hasText(chatModel)) {
            return "AI chat model not configured";
        }
        return "AI chat is disabled by administrator";
    }

    private String buildRagDisabledReason(boolean chatEffective) {
        if (!chatEffective) {
            return "AI chat is disabled";
        }
        if (!isConfiguredEmbeddingApiKey()) {
            return "embedding API key not configured";
        }
        if (!StringUtils.hasText(embeddingModelName)) {
            return "embedding model not configured";
        }
        if (!ragProperties.isRagEnvironmentEnabled()) {
            return "RAG disabled by environment";
        }
        if (!ragProperties.isPgVectorConfigured()) {
            return "PgVector not configured";
        }
        if (embeddingModelProvider.getIfAvailable() == null) {
            return "embedding model not available";
        }
        if (vectorStoreProvider.getIfAvailable() == null) {
            return "vector store not available";
        }
        return "RAG is disabled by administrator";
    }

    private boolean parseEnabledValue(String value) {
        String normalized = value.trim().toLowerCase();
        return !("false".equals(normalized) || "0".equals(normalized) || "off".equals(normalized));
    }

    private String readSetting(String key, String defaultValue) {
        return siteSettingRepository.findBySettingKey(key)
                .map(SiteSetting::getSettingValue)
                .map(String::trim)
                .filter(value -> !value.isEmpty())
                .orElse(defaultValue);
    }

    private void saveSetting(String key, String value, String description) {
        Instant now = Instant.now();
        SiteSetting setting = siteSettingRepository.findBySettingKey(key).orElseGet(SiteSetting::new);
        if (setting.getId() == null) {
            setting.setSettingKey(key);
            setting.setCreatedAt(now);
        }
        setting.setSettingValue(value);
        setting.setDescription(description);
        setting.setUpdatedAt(now);
        siteSettingRepository.save(setting);
    }
}
