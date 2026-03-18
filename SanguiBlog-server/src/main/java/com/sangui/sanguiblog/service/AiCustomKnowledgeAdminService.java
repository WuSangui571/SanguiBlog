package com.sangui.sanguiblog.service;

import com.sangui.sanguiblog.exception.NotFoundException;
import com.sangui.sanguiblog.model.dto.AiCustomKnowledgeAdminDto;
import com.sangui.sanguiblog.model.dto.AiCustomKnowledgeDetailDto;
import com.sangui.sanguiblog.model.dto.AiCustomKnowledgeUpdateRequest;
import com.sangui.sanguiblog.model.dto.PageResponse;
import com.sangui.sanguiblog.model.entity.AiCustomKnowledgeDocument;
import com.sangui.sanguiblog.model.repository.AiCustomKnowledgeDocumentRepository;
import com.sangui.sanguiblog.service.ai.rag.AiCustomKnowledgeSupport;
import com.sangui.sanguiblog.service.ai.rag.AiCustomKnowledgeSyncService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AiCustomKnowledgeAdminService {

    private static final String STATUS_PENDING = "PENDING";
    private static final long MAX_TEXT_FILE_BYTES = 2 * 1024 * 1024;

    private final AiCustomKnowledgeDocumentRepository knowledgeDocumentRepository;
    private final AiCustomKnowledgeSyncService knowledgeSyncService;

    @Transactional(readOnly = true)
    public PageResponse<AiCustomKnowledgeAdminDto> list(String keyword, int page, int size) {
        PageRequest pageable = PageRequest.of(Math.max(page - 1, 0), Math.max(size, 1), Sort.by(Sort.Direction.DESC, "updatedAt"));
        Page<AiCustomKnowledgeDocument> result;
        if (StringUtils.hasText(keyword)) {
            result = knowledgeDocumentRepository.findByTitleContainingIgnoreCaseOrOriginalFilenameContainingIgnoreCase(
                    keyword.trim(), keyword.trim(), pageable);
        } else {
            result = knowledgeDocumentRepository.findAll(pageable);
        }
        List<AiCustomKnowledgeAdminDto> records = result.getContent().stream().map(this::toAdminDto).toList();
        return PageResponse.<AiCustomKnowledgeAdminDto>builder()
                .records(records)
                .total(result.getTotalElements())
                .page(page)
                .size(size)
                .build();
    }

    @Transactional(readOnly = true)
    public AiCustomKnowledgeDetailDto detail(Long id) {
        return toDetailDto(findDocument(id));
    }

    @Transactional
    public AiCustomKnowledgeAdminDto create(String title, Boolean enabled, MultipartFile file, Long operatorId) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("请先选择要导入的文本知识库文件");
        }
        validateTextFile(file);

        String originalFilename = file.getOriginalFilename();
        String contentText = extractText(file);
        String resolvedTitle = AiCustomKnowledgeSupport.deriveTitle(title, originalFilename);
        Instant now = Instant.now();

        AiCustomKnowledgeDocument document = new AiCustomKnowledgeDocument();
        document.setTitle(resolvedTitle);
        document.setOriginalFilename(originalFilename == null ? "knowledge.txt" : originalFilename.trim());
        document.setContentText(contentText);
        document.setEnabled(enabled == null || enabled);
        document.setContentHash(AiCustomKnowledgeSupport.buildContentHash(
                resolvedTitle,
                document.getOriginalFilename(),
                contentText,
                document.getEnabled()
        ));
        document.setSyncStatus(document.getEnabled() ? STATUS_PENDING : "DISABLED");
        document.setUploadedBy(operatorId);
        document.setCreatedAt(now);
        document.setUpdatedAt(now);

        AiCustomKnowledgeDocument saved = knowledgeDocumentRepository.save(document);
        if (Boolean.TRUE.equals(saved.getEnabled())) {
            knowledgeSyncService.syncDocument(saved.getId());
        } else {
            knowledgeSyncService.ensureDisabled(saved.getId());
        }
        return toAdminDto(findDocument(saved.getId()));
    }

    @Transactional
    public AiCustomKnowledgeDetailDto update(Long id, AiCustomKnowledgeUpdateRequest request) {
        AiCustomKnowledgeDocument document = findDocument(id);

        String nextTitle = StringUtils.hasText(request.getTitle())
                ? request.getTitle().trim()
                : document.getTitle();
        String nextContent = request.getContentText() != null
                ? AiCustomKnowledgeSupport.normalizeImportedText(request.getContentText())
                : document.getContentText();
        boolean nextEnabled = request.getEnabled() != null ? request.getEnabled() : Boolean.TRUE.equals(document.getEnabled());

        document.setTitle(AiCustomKnowledgeSupport.deriveTitle(nextTitle, document.getOriginalFilename()));
        document.setContentText(nextContent);
        document.setEnabled(nextEnabled);
        document.setContentHash(AiCustomKnowledgeSupport.buildContentHash(
                document.getTitle(),
                document.getOriginalFilename(),
                document.getContentText(),
                nextEnabled
        ));
        document.setSyncStatus(nextEnabled ? STATUS_PENDING : "DISABLED");
        document.setUpdatedAt(Instant.now());
        knowledgeDocumentRepository.save(document);

        if (nextEnabled) {
            knowledgeSyncService.syncDocument(document.getId());
        } else {
            knowledgeSyncService.ensureDisabled(document.getId());
        }
        return toDetailDto(findDocument(document.getId()));
    }

    @Transactional
    public void delete(Long id) {
        AiCustomKnowledgeDocument document = findDocument(id);
        knowledgeSyncService.removeKnowledge(id);
        knowledgeDocumentRepository.delete(document);
    }

    private AiCustomKnowledgeDocument findDocument(Long id) {
        return knowledgeDocumentRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("知识库文档不存在"));
    }

    private void validateTextFile(MultipartFile file) {
        if (file.getSize() > MAX_TEXT_FILE_BYTES) {
            throw new IllegalArgumentException("知识库文本文件过大，最大支持 2MB");
        }
        if (!AiCustomKnowledgeSupport.isSupportedTextFile(file.getOriginalFilename())) {
            throw new IllegalArgumentException("仅支持导入 .txt、.md、.markdown 文本知识库文件");
        }
    }

    private String extractText(MultipartFile file) {
        try {
            return AiCustomKnowledgeSupport.normalizeImportedText(new String(file.getBytes(), StandardCharsets.UTF_8));
        } catch (IOException ex) {
            throw new IllegalStateException("读取知识库文件失败", ex);
        }
    }

    private AiCustomKnowledgeAdminDto toAdminDto(AiCustomKnowledgeDocument document) {
        return AiCustomKnowledgeAdminDto.builder()
                .id(document.getId())
                .title(document.getTitle())
                .originalFilename(document.getOriginalFilename())
                .contentPreview(trimPreview(document.getContentText()))
                .enabled(document.getEnabled())
                .syncStatus(document.getSyncStatus())
                .lastError(document.getLastError())
                .lastSyncedAt(document.getLastSyncedAt())
                .createdAt(document.getCreatedAt())
                .updatedAt(document.getUpdatedAt())
                .build();
    }

    private AiCustomKnowledgeDetailDto toDetailDto(AiCustomKnowledgeDocument document) {
        return AiCustomKnowledgeDetailDto.builder()
                .id(document.getId())
                .title(document.getTitle())
                .originalFilename(document.getOriginalFilename())
                .contentText(document.getContentText())
                .enabled(document.getEnabled())
                .syncStatus(document.getSyncStatus())
                .lastError(document.getLastError())
                .lastSyncedAt(document.getLastSyncedAt())
                .createdAt(document.getCreatedAt())
                .updatedAt(document.getUpdatedAt())
                .build();
    }

    private String trimPreview(String content) {
        if (!StringUtils.hasText(content)) {
            return "";
        }
        String normalized = content.trim().replace('\n', ' ');
        return normalized.length() <= 120 ? normalized : normalized.substring(0, 120) + "...";
    }
}
