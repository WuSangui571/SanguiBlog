package com.sangui.sanguiblog.service;

import com.sangui.sanguiblog.model.dto.PageResponse;
import com.sangui.sanguiblog.model.dto.PostDetailDto;
import com.sangui.sanguiblog.model.dto.PostSummaryDto;
import com.sangui.sanguiblog.model.dto.SavePostRequest;
import com.sangui.sanguiblog.model.entity.Category;
import com.sangui.sanguiblog.model.entity.Post;
import com.sangui.sanguiblog.model.entity.Tag;
import com.sangui.sanguiblog.model.entity.User;
import com.sangui.sanguiblog.model.repository.CategoryRepository;
import com.sangui.sanguiblog.model.repository.PostRepository;
import com.sangui.sanguiblog.model.repository.TagRepository;
import com.sangui.sanguiblog.model.repository.UserRepository;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PostService {

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd");
    private final PostRepository postRepository;
    private final TagRepository tagRepository;
    private final CategoryRepository categoryRepository;
    private final UserRepository userRepository;

    public PageResponse<PostSummaryDto> listPublished(Integer page, Integer size, Long categoryId, Long tagId, String keyword) {
        int p = page == null || page < 1 ? 0 : page - 1;
        int s = size == null || size < 1 ? 10 : size;
        Specification<Post> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(root.get("status"), "PUBLISHED"));
            if (categoryId != null) {
                predicates.add(cb.equal(root.get("category").get("id"), categoryId));
            }
            if (tagId != null) {
                Join<Object, Object> tagsJoin = root.join("tags");
                predicates.add(cb.equal(tagsJoin.get("id"), tagId));
                query.distinct(true);
            }
            if (keyword != null && !keyword.isBlank()) {
                String like = "%" + keyword.trim() + "%";
                predicates.add(cb.or(
                        cb.like(root.get("title"), like),
                        cb.like(root.get("excerpt"), like)
                ));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };

        Page<Post> posts = postRepository.findAll(spec, PageRequest.of(p, s, Sort.by(Sort.Direction.DESC, "publishedAt", "createdAt")));
        List<PostSummaryDto> list = posts.stream()
                .map(this::toSummary)
                .toList();

        return new PageResponse<>(list, posts.getTotalElements(), posts.getNumber() + 1, posts.getSize());
    }

    public PostDetailDto getPublishedDetail(Long id) {
        Post post = postRepository.findById(id)
                .filter(p -> "PUBLISHED".equalsIgnoreCase(p.getStatus()))
                .orElseThrow(() -> new IllegalArgumentException("文章不存在或未发布"));
        incrementViews(post);
        return toDetail(post);
    }

    public PostDetailDto getPublishedDetailBySlug(String slug) {
        Post post = postRepository.findBySlugAndStatus(slug, "PUBLISHED")
                .orElseThrow(() -> new IllegalArgumentException("文章不存在或未发布"));
        incrementViews(post);
        return toDetail(post);
    }

    @Transactional
    public PostDetailDto saveOrUpdate(SavePostRequest request, Long userId) {
        Post post = request.getId() != null ? postRepository.findById(request.getId())
                .orElseThrow(() -> new IllegalArgumentException("文章不存在")) : new Post();

        Category category = categoryRepository.findById(request.getCategoryId())
                .orElseThrow(() -> new IllegalArgumentException("分类不存在"));

        User author = userRepository.findById(userId)
                .orElseGet(() -> userRepository.findAll().stream().findFirst()
                        .orElseThrow(() -> new IllegalStateException("缺少作者账号")));

        post.setAuthor(author);
        post.setCategory(category);
        post.setTitle(request.getTitle());
        post.setSlug(request.getSlug());
        post.setExcerpt(request.getExcerpt());
        post.setContentMd(request.getContentMd());
        post.setContentHtml(request.getContentHtml());
        post.setThemeColor(request.getThemeColor());
        post.setStatus(request.getStatus());

        if (post.getLikesCount() == null) post.setLikesCount(0);
        if (post.getCommentsCount() == null) post.setCommentsCount(0);
        if (post.getViewsCount() == null) post.setViewsCount(0L);

        if (request.getTagIds() != null && !request.getTagIds().isEmpty()) {
            Set<Tag> tags = request.getTagIds().stream()
                    .map(id -> tagRepository.findById(id).orElseThrow(() -> new IllegalArgumentException("标签不存在: " + id)))
                    .collect(Collectors.toSet());
            post.setTags(tags);
        }

        Post saved = postRepository.save(post);
        return toDetail(saved);
    }

    public void delete(Long id) {
        postRepository.deleteById(id);
    }

    private void incrementViews(Post post) {
        long current = post.getViewsCount() == null ? 0 : post.getViewsCount();
        post.setViewsCount(current + 1);
        postRepository.save(post);
    }

    private PostSummaryDto toSummary(Post post) {
        Category category = post.getCategory();
        String categoryName = category != null ? category.getName() : "未分类";
        String parentName = category != null && category.getParent() != null
                ? category.getParent().getName()
                : (category != null ? category.getName() : "未分类");

        return PostSummaryDto.builder()
                .id(post.getId())
                .title(post.getTitle())
                .excerpt(post.getExcerpt())
                .category(categoryName)
                .parentCategory(parentName)
                .tags(post.getTags().stream().map(Tag::getName).toList())
                .color(post.getThemeColor() != null ? post.getThemeColor() : "bg-[#6366F1]")
                .likes(post.getLikesCount() == null ? 0 : post.getLikesCount())
                .comments(post.getCommentsCount() == null ? 0 : post.getCommentsCount())
                .views(post.getViewsCount() == null ? 0 : post.getViewsCount())
                .date(post.getPublishedAt() != null ? DATE_FMT.format(post.getPublishedAt()) : "")
                .slug(post.getSlug())
                .build();
    }

    private PostDetailDto toDetail(Post post) {
        return PostDetailDto.builder()
                .summary(toSummary(post))
                .contentMd(post.getContentMd())
                .contentHtml(post.getContentHtml())
                .build();
    }
}
