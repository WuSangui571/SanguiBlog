package com.sangui.sanguiblog.service.ai;

import com.sangui.sanguiblog.model.dto.SiteMetaDto;
import com.sangui.sanguiblog.model.repository.SiteSettingRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Service
@RequiredArgsConstructor
public class AiAssistantSettingService {

    public static final String DEFAULT_ASSISTANT_NAME = "三桂";
    public static final String DEFAULT_TITLE = "三桂博客AI助理";
    public static final String DEFAULT_WELCOME_MESSAGE = "你好，我是三桂博客AI助理";
    public static final String DEFAULT_INPUT_PLACEHOLDER = "请输入你的问题...";
    public static final String DEFAULT_PENDING_REPLY = "三桂正在思考，请稍候...";
    public static final String DEFAULT_SYSTEM_PROMPT = """
            你是三桂博客的站内 AI 助理，名字叫三桂。
            你的回答面向博客访客，风格简洁、直接、专业。
            开场欢迎语已经由前端首屏单独展示，后续回答不要重复自我介绍，不要再说“我是三桂”或类似欢迎语，除非用户明确要求你介绍自己。
            直接回答用户问题，不要在每次回答开头重复寒暄。
            当前阶段你还没有接入 RAG 知识库，因此不要编造“来自站内文章”的具体事实。
            当问题与三桂博客、Spring Boot、React、Java、编程、博客创作相关时，可以基于通用知识给出帮助。
            当你无法确认与本站具体内容相关的事实时，要明确说明“当前还未接入站内知识库，无法确认该站点专属信息”。
            除非用户明确要求，否则不要输出冗长说明，不要自称大型语言模型。
            """;

    private static final String KEY_ASSISTANT_NAME = "ai.chat.assistant_name";
    private static final String KEY_TITLE = "ai.chat.title";
    private static final String KEY_WELCOME_MESSAGE = "ai.chat.welcome_message";
    private static final String KEY_INPUT_PLACEHOLDER = "ai.chat.input_placeholder";
    private static final String KEY_PENDING_REPLY = "ai.chat.pending_reply";
    private static final String KEY_SYSTEM_PROMPT = "ai.chat.system_prompt";

    private final SiteSettingRepository siteSettingRepository;

    public SiteMetaDto.AiAssistantDto siteConfig() {
        return SiteMetaDto.AiAssistantDto.builder()
                .assistantName(readSetting(KEY_ASSISTANT_NAME, DEFAULT_ASSISTANT_NAME))
                .title(readSetting(KEY_TITLE, DEFAULT_TITLE))
                .welcomeMessage(readSetting(KEY_WELCOME_MESSAGE, DEFAULT_WELCOME_MESSAGE))
                .inputPlaceholder(readSetting(KEY_INPUT_PLACEHOLDER, DEFAULT_INPUT_PLACEHOLDER))
                .pendingReply(readSetting(KEY_PENDING_REPLY, DEFAULT_PENDING_REPLY))
                .build();
    }

    public String systemPrompt() {
        String customPrompt = readSetting(KEY_SYSTEM_PROMPT, "");
        if (!StringUtils.hasText(customPrompt)) {
            return DEFAULT_SYSTEM_PROMPT;
        }
        return DEFAULT_SYSTEM_PROMPT + System.lineSeparator()
                + System.lineSeparator()
                + "附加站点指令：" + System.lineSeparator()
                + customPrompt;
    }

    private String readSetting(String key, String defaultValue) {
        return siteSettingRepository.findBySettingKey(key)
                .map(setting -> setting.getSettingValue())
                .map(String::trim)
                .filter(value -> !value.isEmpty())
                .orElse(defaultValue);
    }
}
