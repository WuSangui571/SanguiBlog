package com.sangui.sanguiblog.service.ai.rag;

import com.sangui.sanguiblog.model.dto.AiChatResponse;
import com.sangui.sanguiblog.model.entity.Post;
import org.junit.jupiter.api.Test;
import org.springframework.ai.document.Document;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class AiBlogKnowledgeSupportTest {

    @Test
    void shouldBuildStableVectorDocumentIdAndUrl() {
        String id = AiBlogKnowledgeSupport.buildVectorDocumentId(12L, 3);
        assertEquals(id, AiBlogKnowledgeSupport.buildVectorDocumentId(12L, 3));
        UUID.fromString(id);
        assertEquals("/article/12", AiBlogKnowledgeSupport.buildPostUrl(12L));
    }

    @Test
    void shouldBuildReferencesFromRetrievedDocuments() {
        Document document = Document.builder()
                .id("post-7-chunk-1")
                .text("Spring AI + PgVector")
                .metadata(Map.of(
                        "sourceType", "POST",
                        "sourceId", 7L,
                        "title", "Spring AI 与 PgVector",
                        "url", "/article/7"
                ))
                .build();

        List<AiChatResponse.ReferenceDto> references = AiBlogKnowledgeSupport.buildReferences(List.of(document));
        assertEquals(1, references.size());
        assertEquals(7L, references.get(0).getSourceId());
        assertEquals("/article/7", references.get(0).getUrl());
    }

    @Test
    void shouldNotDefaultAdminKnowledgeReferenceToArticleUrl() {
        Document document = Document.builder()
                .id("admin-1")
                .text("这是后台导入的知识库文本")
                .metadata(Map.of(
                        "sourceType", "ADMIN_TEXT",
                        "sourceId", 11L,
                        "title", "运维手册"
                ))
                .build();

        List<AiChatResponse.ReferenceDto> references = AiBlogKnowledgeSupport.buildReferences(List.of(document));
        assertEquals(1, references.size());
        assertEquals("ADMIN_TEXT", references.get(0).getSourceType());
        assertEquals("", references.get(0).getUrl());
    }

    @Test
    void shouldBuildKnowledgeTextWithTitleAndContent() {
        Post post = new Post();
        post.setTitle("RAG 实战");
        post.setSlug("rag-practice");
        post.setExcerpt("关于博客知识库增强");
        post.setContentMd("这里是正文内容");
        post.setStatus("PUBLISHED");

        String text = AiBlogKnowledgeSupport.buildKnowledgeText(post);
        assertTrue(text.contains("标题: RAG 实战"));
        assertTrue(text.contains("正文:"));
        assertTrue(text.contains("这里是正文内容"));
    }
}
