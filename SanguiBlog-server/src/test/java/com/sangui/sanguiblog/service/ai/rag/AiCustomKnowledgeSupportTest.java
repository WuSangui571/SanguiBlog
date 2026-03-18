package com.sangui.sanguiblog.service.ai.rag;

import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class AiCustomKnowledgeSupportTest {

    @Test
    void shouldBuildStableUuidVectorDocumentId() {
        String id = AiCustomKnowledgeSupport.buildVectorDocumentId(9L, 2);
        assertEquals(id, AiCustomKnowledgeSupport.buildVectorDocumentId(9L, 2));
        UUID.fromString(id);
    }

    @Test
    void shouldPreferExplicitTitleAndNormalizeImportedText() {
        String title = AiCustomKnowledgeSupport.deriveTitle("  自定义知识说明  ", "guide.md");
        String content = AiCustomKnowledgeSupport.normalizeImportedText("\uFEFF第一行\r\n\r\n第二行  ");

        assertEquals("自定义知识说明", title);
        assertEquals("第一行\n\n第二行", content);
    }

    @Test
    void shouldFallbackToFilenameWhenExplicitTitleMissing() {
        String title = AiCustomKnowledgeSupport.deriveTitle("  ", "rag-handbook.txt");
        String text = AiCustomKnowledgeSupport.buildKnowledgeText(title, "rag-handbook.txt", "这是一份导入的知识库文本。");

        assertEquals("rag-handbook", title);
        assertTrue(text.contains("标题: rag-handbook"));
        assertTrue(text.contains("原始文件名: rag-handbook.txt"));
        assertTrue(text.contains("正文:"));
    }
}
