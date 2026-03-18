package com.sangui.sanguiblog.service.ai;

import com.sangui.sanguiblog.model.dto.AiAssistantAdminSettingsDto;
import com.sangui.sanguiblog.model.dto.SiteMetaDto;
import com.sangui.sanguiblog.model.entity.SiteSetting;
import com.sangui.sanguiblog.model.repository.SiteSettingRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;

@Service
@RequiredArgsConstructor
public class AiAssistantSettingService {

    public static final boolean DEFAULT_ENABLED = true;
    public static final String DEFAULT_ASSISTANT_NAME = "三桂";
    public static final String DEFAULT_TITLE = "三桂博客AI助理";
    public static final String DEFAULT_WELCOME_MESSAGE = "你好，我是三桂博客AI助理";
    public static final String DEFAULT_INPUT_PLACEHOLDER = "请输入你的问题...";
    public static final String DEFAULT_PENDING_REPLY = "...";
    public static final String DEFAULT_SYSTEM_PROMPT = """
            你是三桂博客的站内 AI 助理，名字叫三桂。
            你的回答面向博客访客，风格简洁、直接、专业。
            开场欢迎语已经由前端首屏单独展示，后续回答不要重复自我介绍，不要再说“我是三桂”或类似欢迎语，除非用户明确要求你介绍自己。
            直接回答用户问题，不要在每次回答开头重复寒暄。
            当系统提供“站内知识检索上下文”时，优先依据这些内容回答，不能与检索上下文冲突。
            如果检索上下文不足以支持结论，要明确说明“当前知识库没有提供足够信息”，不要编造站内事实。
            当问题与三桂博客、Spring Boot、React、Java、编程、博客创作相关时，可以基于通用知识给出帮助。
            除非用户明确要求，否则不要输出冗长说明，不要自称大型语言模型。
            """;

    private static final String KEY_ENABLED = "ai.chat.enabled";
    private static final String KEY_ASSISTANT_NAME = "ai.chat.assistant_name";
    private static final String KEY_TITLE = "ai.chat.title";
    private static final String KEY_WELCOME_MESSAGE = "ai.chat.welcome_message";
    private static final String KEY_INPUT_PLACEHOLDER = "ai.chat.input_placeholder";
    private static final String KEY_PENDING_REPLY = "ai.chat.pending_reply";
    private static final String KEY_SYSTEM_PROMPT = "ai.chat.system_prompt";

    private final SiteSettingRepository siteSettingRepository;

    public SiteMetaDto.AiAssistantDto siteConfig() {
        return SiteMetaDto.AiAssistantDto.builder()
                .enabled(isEnabled())
                .assistantName(readSetting(KEY_ASSISTANT_NAME, DEFAULT_ASSISTANT_NAME))
                .title(readSetting(KEY_TITLE, DEFAULT_TITLE))
                .welcomeMessage(readSetting(KEY_WELCOME_MESSAGE, DEFAULT_WELCOME_MESSAGE))
                .inputPlaceholder(readSetting(KEY_INPUT_PLACEHOLDER, DEFAULT_INPUT_PLACEHOLDER))
                .pendingReply(readSetting(KEY_PENDING_REPLY, DEFAULT_PENDING_REPLY))
                .build();
    }

    public AiAssistantAdminSettingsDto adminSettings() {
        return AiAssistantAdminSettingsDto.builder()
                .enabled(isEnabled())
                .build();
    }

    public boolean isEnabled() {
        return siteSettingRepository.findBySettingKey(KEY_ENABLED)
                .map(SiteSetting::getSettingValue)
                .map(String::trim)
                .filter(StringUtils::hasText)
                .map(this::parseEnabledValue)
                .orElse(DEFAULT_ENABLED);
    }

    public void assertEnabled() {
        if (!isEnabled()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "AI 助理当前已关闭");
        }
    }

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

    @Transactional
    public AiAssistantAdminSettingsDto updateEnabled(boolean enabled) {
        saveSetting(
                KEY_ENABLED,
                Boolean.toString(enabled),
                "AI 助理总开关。关闭后前端入口隐藏，后端聊天接口停止提供服务。"
        );
        return adminSettings();
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
