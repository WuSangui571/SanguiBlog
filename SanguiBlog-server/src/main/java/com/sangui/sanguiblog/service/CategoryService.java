package com.sangui.sanguiblog.service;

import com.sangui.sanguiblog.model.dto.CategoryAdminDto;
import com.sangui.sanguiblog.model.dto.CategoryRequest;
import com.sangui.sanguiblog.model.dto.CategoryTreeDto;
import com.sangui.sanguiblog.model.dto.PageResponse;
import com.sangui.sanguiblog.exception.NotFoundException;
import com.sangui.sanguiblog.model.entity.Category;
import com.sangui.sanguiblog.model.repository.CategoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.text.Normalizer;
import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CategoryService {

    private final CategoryRepository categoryRepository;

    public List<CategoryTreeDto> tree() {
        List<Category> roots = categoryRepository.findByParentIsNullOrderBySortOrderAsc();
        return roots.stream()
                .map(this::toDto)
                .toList();
    }

    private CategoryTreeDto toDto(Category category) {
        List<CategoryTreeDto> children = categoryRepository.findByParentIdOrderBySortOrderAsc(category.getId())
                .stream()
                .map(this::toDto)
                .toList();

        return CategoryTreeDto.builder()
                .id(category.getId())
                .label(category.getName())
                .parentId(category.getParent() != null ? category.getParent().getId() : null)
                .children(children)
                .build();
    }

    public PageResponse<CategoryAdminDto> search(String keyword, Long parentId, int page, int size) {
        int safePage = Math.max(page, 1) - 1;
        int safeSize = Math.min(Math.max(size, 1), 100);
        Pageable pageable = PageRequest.of(safePage, safeSize,
                Sort.by(Sort.Direction.ASC, "sortOrder").and(Sort.by(Sort.Direction.DESC, "updatedAt")));

        Specification<Category> spec = Specification.where(null);
        if (StringUtils.hasText(keyword)) {
            String like = "%" + keyword.trim().toLowerCase(Locale.ROOT) + "%";
            spec = spec.and((root, query, cb) -> cb.or(
                    cb.like(cb.lower(root.get("name")), like),
                    cb.like(cb.lower(root.get("slug")), like)
            ));
        }
        if (parentId != null) {
            if (parentId == 0) {
                spec = spec.and((root, query, cb) -> cb.isNull(root.get("parent")));
            } else {
                spec = spec.and((root, query, cb) -> cb.equal(root.get("parent").get("id"), parentId));
            }
        }
        Page<Category> pageData = categoryRepository.findAll(spec, pageable);
        return new PageResponse<>(
                pageData.getContent().stream().map(this::toAdminDto).toList(),
                pageData.getTotalElements(),
                pageData.getNumber() + 1,
                pageData.getSize());
    }

    @Transactional
    public CategoryAdminDto create(CategoryRequest request) {
        String name = request.getName().trim();
        String slug = resolveSlug(request.getSlug(), name);
        categoryRepository.findByNameIgnoreCase(name).ifPresent(existing -> {
            throw new IllegalArgumentException("分类名称已存在");
        });
        categoryRepository.findBySlugIgnoreCase(slug).ifPresent(existing -> {
            throw new IllegalArgumentException("分类别名已存在");
        });
        Category category = new Category();
        category.setName(name);
        category.setSlug(slug);
        category.setDescription(StringUtils.hasText(request.getDescription()) ? request.getDescription().trim() : null);
        category.setSortOrder(request.getSortOrder());
        category.setParent(resolveParent(request.getParentId(), null));
        Instant now = Instant.now();
        category.setCreatedAt(now);
        category.setUpdatedAt(now);
        return toAdminDto(categoryRepository.save(category));
    }

    @Transactional
    public CategoryAdminDto update(Long id, CategoryRequest request) {
        Category category = categoryRepository.findById(id).orElseThrow(() -> new NotFoundException("分类不存在"));
        String name = request.getName().trim();
        String slug = resolveSlug(request.getSlug(), name);
        categoryRepository.findByNameIgnoreCase(name)
                .filter(existing -> !existing.getId().equals(id))
                .ifPresent(existing -> {
                    throw new IllegalArgumentException("分类名称已存在");
                });
        categoryRepository.findBySlugIgnoreCase(slug)
                .filter(existing -> !existing.getId().equals(id))
                .ifPresent(existing -> {
                    throw new IllegalArgumentException("分类别名已存在");
                });
        category.setName(name);
        category.setSlug(slug);
        category.setDescription(StringUtils.hasText(request.getDescription()) ? request.getDescription().trim() : null);
        category.setSortOrder(request.getSortOrder());
        category.setParent(resolveParent(request.getParentId(), id));
        category.setUpdatedAt(Instant.now());
        return toAdminDto(categoryRepository.save(category));
    }

    @Transactional
    public void delete(Long id) {
        Category category = categoryRepository.findById(id).orElseThrow(() -> new NotFoundException("分类不存在"));
        List<Category> children = categoryRepository.findByParentIdOrderBySortOrderAsc(id);
        if (!children.isEmpty()) {
            throw new IllegalStateException("请先删除子分类");
        }
        categoryRepository.delete(category);
    }

    private Category resolveParent(Long parentId, Long currentId) {
        if (parentId == null || parentId == 0) {
            return null;
        }
        if (currentId != null && parentId.equals(currentId)) {
            throw new IllegalArgumentException("父级分类不能是自身");
        }
        Category parent = categoryRepository.findById(parentId)
                .orElseThrow(() -> new NotFoundException("父级分类不存在"));
        if (parent.getParent() != null) {
            throw new IllegalArgumentException("仅支持两级分类，请选择一级分类作为父级");
        }
        return parent;
    }

    private CategoryAdminDto toAdminDto(Category category) {
        return CategoryAdminDto.builder()
                .id(category.getId())
                .name(category.getName())
                .slug(category.getSlug())
                .description(category.getDescription())
                .sortOrder(category.getSortOrder())
                .parentId(category.getParent() != null ? category.getParent().getId() : null)
                .parentName(category.getParent() != null ? category.getParent().getName() : null)
                .createdAt(category.getCreatedAt())
                .updatedAt(category.getUpdatedAt())
                .build();
    }

    private String resolveSlug(String providedSlug, String name) {
        String candidate = StringUtils.hasText(providedSlug) ? providedSlug : name;
        String normalized = Normalizer.normalize(candidate, Normalizer.Form.NFD)
                .replaceAll("[\\p{InCombiningDiacriticalMarks}]", "");
        normalized = normalized.replaceAll("[^\\p{IsAlphabetic}\\p{IsDigit}\\s-]", "")
                .trim()
                .replaceAll("\\s+", "-")
                .toLowerCase(Locale.ROOT);
        if (!StringUtils.hasText(normalized)) {
            normalized = "category-" + UUID.randomUUID();
        }
        return normalized;
    }
}
