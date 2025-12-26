package com.sangui.sanguiblog.service;

import com.sangui.sanguiblog.model.dto.AdminPostDetailDto;
import com.sangui.sanguiblog.model.dto.AdminPostUpdateRequest;
import com.sangui.sanguiblog.model.dto.ArchiveMonthSummaryDto;
import com.sangui.sanguiblog.model.dto.ArchiveSummaryDto;
import com.sangui.sanguiblog.model.dto.ArchiveYearSummaryDto;
import com.sangui.sanguiblog.model.dto.PageResponse;
import com.sangui.sanguiblog.model.dto.PageViewRequest;
import com.sangui.sanguiblog.model.dto.PostAdminDto;
import com.sangui.sanguiblog.model.dto.PostDetailDto;
import com.sangui.sanguiblog.model.dto.PostSiblingDto;
import com.sangui.sanguiblog.model.dto.PostNeighborsDto;
import com.sangui.sanguiblog.model.dto.PostSummaryDto;
import com.sangui.sanguiblog.model.dto.SavePostRequest;
import com.sangui.sanguiblog.model.entity.AnalyticsPageView;
import com.sangui.sanguiblog.model.entity.Category;
import com.sangui.sanguiblog.model.entity.Post;
import com.sangui.sanguiblog.model.entity.Tag;
import com.sangui.sanguiblog.model.entity.User;
import com.sangui.sanguiblog.model.repository.AnalyticsPageViewRepository;
import com.sangui.sanguiblog.model.repository.CategoryRepository;
import com.sangui.sanguiblog.model.repository.CommentRepository;
import com.sangui.sanguiblog.model.repository.PostRepository;
import com.sangui.sanguiblog.model.repository.TagRepository;
import com.sangui.sanguiblog.model.repository.UserRepository;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PostService {

    private static final Logger log = LoggerFactory.getLogger(PostService.class);

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd");

    private final PostRepository postRepository;
    private final TagRepository tagRepository;
    private final CategoryRepository categoryRepository;
    private final UserRepository userRepository;
    private final CommentRepository commentRepository;
    private final AnalyticsPageViewRepository analyticsPageViewRepository;
    private final PostAssetService postAssetService;
    private final AnalyticsService analyticsService;
    private final GeoIpService geoIpService;
    private static final java.util.concurrent.ConcurrentHashMap<String, Long> VIEW_RATE_LIMITER = new java.util.concurrent.ConcurrentHashMap<>();

    @Transactional(readOnly = true)
    public PageResponse<PostSummaryDto> listPublished(Integer page, Integer size, Long categoryId, Long tagId,
            String keyword) {
        int p = page == null || page < 1 ? 0 : page - 1;
        int s = size == null || size < 1 ? 10 : Math.min(size, 50);
        Specification<Post> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(root.get("status"), "PUBLISHED"));
            if (categoryId != null) {
                Join<Object, Object> categoryJoin = root.join("category");
                Join<Object, Object> parentJoin = categoryJoin.join("parent", JoinType.LEFT);
                predicates.add(cb.or(
                        cb.equal(categoryJoin.get("id"), categoryId),
                        cb.equal(parentJoin.get("id"), categoryId)));
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
                        cb.like(root.get("excerpt"), like)));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };

        Page<Post> posts = postRepository.findAll(spec,
                PageRequest.of(p, s, Sort.by(Sort.Direction.DESC, "publishedAt", "createdAt")));
        List<PostSummaryDto> list = posts.stream()
                .map(this::toSummary)
                .toList();

        return new PageResponse<>(list, posts.getTotalElements(), posts.getNumber() + 1, posts.getSize());
    }

    @Transactional(readOnly = true)
    public ArchiveSummaryDto getArchiveSummary() {
        List<PostRepository.ArchiveMonthAggregation> rows = postRepository.aggregateArchiveMonths();
        Map<Integer, List<ArchiveMonthSummaryDto>> grouped = new LinkedHashMap<>();
        Map<Integer, Long> yearTotals = new LinkedHashMap<>();
        for (PostRepository.ArchiveMonthAggregation row : rows) {
            if (row == null || row.getYear() == null || row.getMonth() == null) {
                continue;
            }
            int year = row.getYear();
            int month = row.getMonth();
            long count = row.getCount() == null ? 0L : row.getCount();
            String lastDate = row.getLastDate() != null ? DATE_FMT.format(row.getLastDate()) : "";
            grouped.computeIfAbsent(year, k -> new ArrayList<>())
                    .add(ArchiveMonthSummaryDto.builder()
                            .year(year)
                            .month(month)
                            .count(count)
                            .lastDate(lastDate)
                            .build());
            yearTotals.merge(year, count, Long::sum);
        }

        List<ArchiveYearSummaryDto> years = grouped.entrySet().stream()
                .map(entry -> ArchiveYearSummaryDto.builder()
                        .year(entry.getKey())
                        .total(yearTotals.getOrDefault(entry.getKey(), 0L))
                        .months(entry.getValue())
                        .build())
                .toList();

        long totalCount = postRepository.countByStatus("PUBLISHED");
        LocalDateTime latest = postRepository.findLatestPublishedAt();
        String lastUpdated = latest != null ? DATE_FMT.format(latest) : "";

        return ArchiveSummaryDto.builder()
                .totalCount(totalCount)
                .totalYears(years.size())
                .lastUpdated(lastUpdated)
                .years(years)
                .build();
    }

    @Transactional(readOnly = true)
    public PageResponse<PostSummaryDto> getArchiveMonthPosts(int year, int month, Integer page, Integer size) {
        if (month < 1 || month > 12) {
            throw new IllegalArgumentException("月份必须在 1~12 之间");
        }
        int p = page == null || page < 1 ? 0 : page - 1;
        int s = size == null || size < 1 ? 200 : Math.min(size, 200);
        Page<Post> posts = postRepository.findPublishedByYearMonth(
                year,
                month,
                PageRequest.of(p, s, Sort.by(Sort.Direction.DESC, "publishedAt", "createdAt")));
        List<PostSummaryDto> list = posts.getContent().stream()
                .map(this::toSummary)
                .toList();
        return new PageResponse<>(list, posts.getTotalElements(), posts.getNumber() + 1, posts.getSize());
    }

    @Transactional
    public PostDetailDto getPublishedDetail(Long id, String ip, String userAgent, Long userId, String referrer, String sourceLabel) {
        Post post = postRepository.findById(id)
                .filter(p -> "PUBLISHED".equalsIgnoreCase(p.getStatus()))
                .orElseThrow(() -> new IllegalArgumentException("文章不存在或未发布"));
        incrementViews(post, ip, userAgent, userId, referrer, sourceLabel);
        return toDetail(post);
    }

    @Transactional
    public PostDetailDto getPublishedDetailBySlug(String slug, String ip, String userAgent, Long userId, String referrer, String sourceLabel) {
        Post post = postRepository.findBySlugAndStatus(slug, "PUBLISHED")
                .orElseThrow(() -> new IllegalArgumentException("文章不存在或未发布"));
        incrementViews(post, ip, userAgent, userId, referrer, sourceLabel);
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
        String slug = resolveAssetSlug(request.getSlug(), post.getId());
        post.setSlug(slug);
        postAssetService.ensureFolder(slug);
        post.setExcerpt(request.getExcerpt());
        if (request.getCoverImage() != null) {
            post.setCoverImage(normalizeCoverPath(request.getCoverImage()));
        }
        post.setContentMd(request.getContentMd());

        // Convert Markdown to HTML
        if (request.getContentMd() != null) {
            List<org.commonmark.Extension> extensions = java.util.Arrays.asList(
                    org.commonmark.ext.gfm.tables.TablesExtension.create(),
                    org.commonmark.ext.gfm.strikethrough.StrikethroughExtension.create(),
                    org.commonmark.ext.autolink.AutolinkExtension.create());
            org.commonmark.parser.Parser parser = org.commonmark.parser.Parser.builder()
                    .extensions(extensions)
                    .build();
            org.commonmark.renderer.html.HtmlRenderer renderer = org.commonmark.renderer.html.HtmlRenderer.builder()
                    .extensions(extensions)
                    .build();
            post.setContentHtml(renderer.render(parser.parse(request.getContentMd())));
        } else {
            post.setContentHtml(request.getContentHtml());
        }

        post.setThemeColor(request.getThemeColor());
        post.setStatus(request.getStatus());
        Instant now = Instant.now();
        if (post.getCreatedAt() == null) {
            post.setCreatedAt(now);
        }
        post.setUpdatedAt(now);
        if ("PUBLISHED".equalsIgnoreCase(post.getStatus()) && post.getPublishedAt() == null) {
            post.setPublishedAt(LocalDateTime.now());
        }

        if (post.getLikesCount() == null) {
            post.setLikesCount(0);
        }
        if (post.getCommentsCount() == null) {
            post.setCommentsCount(0);
        }
        if (post.getViewsCount() == null) {
            post.setViewsCount(0L);
        }

        if (request.getTagIds() != null && !request.getTagIds().isEmpty()) {
            Set<Tag> tags = request.getTagIds().stream()
                    .map(id -> tagRepository.findById(id)
                            .orElseThrow(() -> new IllegalArgumentException("标签不存在: " + id)))
                    .collect(Collectors.toSet());
            post.setTags(tags);
        }

        Post saved = postRepository.save(post);
        return toDetail(saved);
    }

    public void delete(Long id) {
        postRepository.deleteById(id);
    }

    @Transactional(readOnly = true)
    public PageResponse<PostAdminDto> adminList(String keyword, Long categoryId, int page, int size) {
        int p = Math.max(page, 1) - 1;
        int s = Math.min(Math.max(size, 1), 100);
        Specification<Post> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (StringUtils.hasText(keyword)) {
                String like = "%" + keyword.trim() + "%";
                predicates.add(cb.or(
                        cb.like(root.get("title"), like),
                        cb.like(root.get("slug"), like),
                        cb.like(root.get("excerpt"), like)));
            }
            if (categoryId != null) {
                predicates.add(cb.equal(root.get("category").get("id"), categoryId));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };
        Page<Post> posts = postRepository.findAll(spec,
                PageRequest.of(p, s, Sort.by(Sort.Direction.DESC, "publishedAt")
                        .and(Sort.by(Sort.Direction.DESC, "createdAt"))));
        List<PostAdminDto> dtos = posts.getContent().stream()
                .map(this::toAdminDto)
                .toList();
        return new PageResponse<>(dtos, posts.getTotalElements(), posts.getNumber() + 1, posts.getSize());
    }

    @Transactional(readOnly = true)
    public AdminPostDetailDto getAdminDetail(Long id) {
        Post post = postRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("文章不存在"));
        return toAdminDetail(post);
    }

    @Transactional(readOnly = true)
    public PostSiblingDto findPublishedSiblings(Long postId) {
        Post current = postRepository.findById(postId)
                .orElseThrow(() -> new IllegalArgumentException("文章不存在"));
        LocalDateTime pub = current.getPublishedAt();
        Instant created = current.getCreatedAt() != null ? current.getCreatedAt() : Instant.EPOCH;
        Long prev = pub == null ? null : postRepository.findPrevPublishedId(pub, created);
        Long next = pub == null ? null : postRepository.findNextPublishedId(pub, created);
        return PostSiblingDto.builder()
                .prevId(prev)
                .nextId(next)
                .build();
    }

    @Transactional(readOnly = true)
    public PostNeighborsDto getPublishedNeighbors(Long postId) {
        Post current = postRepository.findById(postId)
                .filter(p -> "PUBLISHED".equalsIgnoreCase(p.getStatus()))
                .orElseThrow(() -> new IllegalArgumentException("文章不存在或未发布"));

        LocalDateTime pub = current.getPublishedAt();
        Instant created = current.getCreatedAt() != null ? current.getCreatedAt() : Instant.EPOCH;
        Long prevId = pub == null ? null : postRepository.findPrevPublishedId(pub, created);
        Long nextId = pub == null ? null : postRepository.findNextPublishedId(pub, created);

        PostSummaryDto prev = prevId != null ? postRepository.findById(prevId).map(this::toSummary).orElse(null) : null;
        PostSummaryDto next = nextId != null ? postRepository.findById(nextId).map(this::toSummary).orElse(null) : null;

        Long categoryId = current.getCategory() != null ? current.getCategory().getId() : null;
        List<PostSummaryDto> related = List.of();
        if (categoryId != null) {
            related = postRepository
                    .findRelatedPublishedByCategory(categoryId, current.getId(), PageRequest.of(0, 3))
                    .stream()
                    .map(this::toSummary)
                    .toList();
        }

        return PostNeighborsDto.builder()
                .prev(prev)
                .next(next)
                .related(related)
                .build();
    }

    @Transactional
    public PostAdminDto updateMeta(Long id, AdminPostUpdateRequest request) {
        Post post = postRepository.findById(id).orElseThrow(() -> new IllegalArgumentException("文章不存在"));
        String title = request.getTitle().trim();
        String slug = resolveAssetSlug(request.getSlug(), post.getId());
        Category category = categoryRepository.findById(request.getCategoryId())
                .orElseThrow(() -> new IllegalArgumentException("分类不存在"));
        post.setTitle(title);
        post.setSlug(slug);
        postAssetService.ensureFolder(slug);
        post.setExcerpt(request.getExcerpt());
        if (request.getCoverImage() != null) {
            post.setCoverImage(normalizeCoverPath(request.getCoverImage()));
        }
        post.setStatus(request.getStatus());
        Instant now = Instant.now();
        post.setUpdatedAt(now);
        if ("PUBLISHED".equalsIgnoreCase(post.getStatus()) && post.getPublishedAt() == null) {
            post.setPublishedAt(LocalDateTime.now());
        } else if (!"PUBLISHED".equalsIgnoreCase(post.getStatus())) {
            post.setPublishedAt(null);
        }
        post.setThemeColor(request.getThemeColor());
        post.setCategory(category);
        if (request.getTagIds() != null) {
            Set<Tag> tags = request.getTagIds().stream()
                    .map(tagId -> tagRepository.findById(tagId)
                            .orElseThrow(() -> new IllegalArgumentException("标签不存在: " + tagId)))
                    .collect(Collectors.toSet());
            post.setTags(tags);
        }
        return toAdminDto(postRepository.save(post));
    }

    private AdminPostDetailDto toAdminDetail(Post post) {
        List<Long> tagIds = post.getTags().stream().map(Tag::getId).toList();
        List<com.sangui.sanguiblog.model.dto.TagDto> tagDtos = post.getTags().stream()
                .map(tag -> com.sangui.sanguiblog.model.dto.TagDto.builder()
                        .id(tag.getId())
                        .name(tag.getName())
                        .slug(tag.getSlug())
                        .build())
                .toList();
        Long parentId = null;
        if (post.getCategory() != null) {
            parentId = post.getCategory().getParent() != null
                    ? post.getCategory().getParent().getId()
                    : post.getCategory().getId();
        }
        return AdminPostDetailDto.builder()
                .id(post.getId())
                .title(post.getTitle())
                .slug(post.getSlug())
                .excerpt(post.getExcerpt())
                .contentMd(post.getContentMd())
                .contentHtml(post.getContentHtml())
                .coverImage(normalizeCoverPath(post.getCoverImage()))
                .themeColor(post.getThemeColor())
                .status(post.getStatus())
                .categoryId(post.getCategory() != null ? post.getCategory().getId() : null)
                .parentCategoryId(parentId)
                .publishedAt(post.getPublishedAt())
                .tagIds(tagIds)
                .tags(tagDtos)
                .build();
    }

    private void incrementViews(Post post, String ip, String userAgent, Long userId, String referrer, String sourceLabel) {
        // 1. Memory Check (Fast, handles race conditions/StrictMode)
        String key = ip + "_" + post.getId();
        long now = System.currentTimeMillis();
        Long lastViewTime = VIEW_RATE_LIMITER.get(key);
        if (lastViewTime != null && (now - lastViewTime) < 60000) { // 1 minute throttle
            return;
        }

        // 2. DB Check (Persistence, handles server restarts)
        // Check if this IP viewed this post in the last 10 minutes
        boolean exists = analyticsPageViewRepository.existsByPostIdAndViewerIpAndViewedAtAfter(
                post.getId(), ip, java.time.LocalDateTime.now().minusMinutes(10));

        if (exists) {
            // Update memory cache to avoid hitting DB again soon
            VIEW_RATE_LIMITER.put(key, now);
            return;
        }

        // Update Memory Cache
        VIEW_RATE_LIMITER.put(key, now);
        // Cleanup old entries occasionally (simple approach: if size > 10000, clear
        // half? or just let it grow for this demo)
        if (VIEW_RATE_LIMITER.size() > 5000) {
            VIEW_RATE_LIMITER.clear(); // Simple brute-force cleanup for demo
        }

        long current = post.getViewsCount() == null ? 0 : post.getViewsCount();
        post.setViewsCount(current + 1);
        postRepository.save(post);
        recordAnalyticsPageView(post, ip, userAgent, userId, referrer, sourceLabel);
    }

    private void recordAnalyticsPageView(Post post, String ip, String userAgent, Long userId, String referrer, String sourceLabel) {
        if (post == null) {
            return;
        }
        boolean recorded = false;
        if (analyticsService != null) {
            try {
                PageViewRequest request = new PageViewRequest();
                request.setPostId(post.getId());
                request.setPageTitle(post.getTitle());
                request.setReferrer(referrer);
                request.setSourceLabel(sourceLabel);
                analyticsService.recordPageView(request, ip, userAgent, userId);
                recorded = true;
            } catch (Exception ex) {
                log.warn("调用 AnalyticsService.recordPageView 失败，将启用直接写库兜底, postId={}, ip={}", post.getId(), ip, ex);
            }
        }
        if (!recorded) {
            persistAnalyticsPageView(post, ip, userAgent, userId);
        }
    }

    private void persistAnalyticsPageView(Post post, String ip, String userAgent, Long userId) {
        try {
            AnalyticsPageView pv = new AnalyticsPageView();
            pv.setPost(post);
            pv.setPageTitle(post.getTitle());
            String normalizedIp = StringUtils.hasText(ip) ? ip : "0.0.0.0";
            pv.setViewerIp(normalizedIp);
            pv.setReferrerUrl("系统兜底（前端埋点失败）");
            pv.setUserAgent(userAgent);
            if (userId != null) {
                userRepository.findById(userId).ifPresent(pv::setUser);
            }
            String geo = geoIpService.lookup(normalizedIp);
            if (geo != null && geo.length() > 128) {
                geo = geo.substring(0, 128);
            }
            if (!StringUtils.hasText(geo)) {
                geo = "未知";
            }
            pv.setGeoLocation(geo);
            pv.setViewedAt(LocalDateTime.now());
            analyticsPageViewRepository.save(pv);
        } catch (Exception ex) {
            log.warn("直接写入 analytics_page_views 失败, postId={}, ip={}", post != null ? post.getId() : null, ip, ex);
        }
    }

    private PostSummaryDto toSummary(Post post) {
        Category category = post.getCategory();
        String categoryName = category != null ? category.getName() : "未分类";
        String parentName = category != null && category.getParent() != null
                ? category.getParent().getName()
                : (category != null ? category.getName() : "未分类");

        String avatar = post.getAuthor() != null ? post.getAuthor().getAvatarUrl() : null;
        if (avatar != null && avatar.isBlank()) {
            avatar = null;
        } else if (avatar != null) {
            avatar = avatar.trim();
        }

        long commentCount = commentRepository.countByPostIdAndStatus(post.getId(), "APPROVED");

        List<String> tags = post.getTags() == null ? List.of() : post.getTags().stream()
                .map(Tag::getName)
                .filter(StringUtils::hasText)
                .map(String::trim)
                .sorted(String.CASE_INSENSITIVE_ORDER)
                .toList();

        return PostSummaryDto.builder()
                .id(post.getId())
                .title(post.getTitle())
                .excerpt(post.getExcerpt())
                .coverImage(normalizeCoverPath(post.getCoverImage()))
                .category(categoryName)
                .parentCategory(parentName)
                .tags(tags)
                .color(post.getThemeColor() != null ? post.getThemeColor() : "bg-[#6366F1]")
                .likes(post.getLikesCount() == null ? 0 : post.getLikesCount())
                .comments((int) commentCount)
                .views(post.getViewsCount() == null ? 0 : post.getViewsCount())
                .date(post.getPublishedAt() != null ? DATE_FMT.format(post.getPublishedAt()) : "")
                .slug(post.getSlug())
                .authorName(post.getAuthor() != null ? post.getAuthor().getDisplayName() : "Unknown")
                .authorAvatar(avatar)
                .build();
    }

    private PostDetailDto toDetail(Post post) {
        String htmlContent = post.getContentHtml();
        if (htmlContent == null || htmlContent.isEmpty()) {
            if (post.getContentMd() != null) {
                List<org.commonmark.Extension> extensions = java.util.Arrays.asList(
                        org.commonmark.ext.gfm.tables.TablesExtension.create(),
                        org.commonmark.ext.gfm.strikethrough.StrikethroughExtension.create(),
                        org.commonmark.ext.autolink.AutolinkExtension.create());
                org.commonmark.parser.Parser parser = org.commonmark.parser.Parser.builder()
                        .extensions(extensions)
                        .build();
                org.commonmark.renderer.html.HtmlRenderer renderer = org.commonmark.renderer.html.HtmlRenderer.builder()
                        .extensions(extensions)
                        .build();
                htmlContent = renderer.render(parser.parse(post.getContentMd()));
            }
        }

        long wordCount = 0;
        String readingTime = "1 分钟";
        if (htmlContent != null) {
            String plainText = htmlContent.replaceAll("<[^>]*>", "").replaceAll("\\s+", "");
            wordCount = plainText.length();
            long minutes = Math.max(1, wordCount / 250);
            readingTime = minutes + " 分钟";
        }

        return PostDetailDto.builder()
                .summary(toSummary(post))
                .contentMd(post.getContentMd())
                .contentHtml(htmlContent)
                .wordCount(wordCount)
                .readingTime(readingTime)
                .build();
    }

    private PostAdminDto toAdminDto(Post post) {
        return PostAdminDto.builder()
                .id(post.getId())
                .title(post.getTitle())
                .slug(post.getSlug())
                .excerpt(post.getExcerpt())
                .coverImage(normalizeCoverPath(post.getCoverImage()))
                .status(post.getStatus())
                .themeColor(post.getThemeColor())
                .categoryId(post.getCategory() != null ? post.getCategory().getId() : null)
                .categoryName(post.getCategory() != null ? post.getCategory().getName() : null)
                .parentCategoryName(post.getCategory() != null && post.getCategory().getParent() != null
                        ? post.getCategory().getParent().getName()
                        : (post.getCategory() != null ? post.getCategory().getName() : null))
                .authorName(post.getAuthor() != null ? post.getAuthor().getDisplayName() : null)
                .publishedAt(post.getPublishedAt())
                .tags(post.getTags().stream()
                        .map(tag -> com.sangui.sanguiblog.model.dto.TagDto.builder()
                                .id(tag.getId())
                                .name(tag.getName())
                                .slug(tag.getSlug())
                                .build())
                        .toList())
                .build();
    }

    private String normalizeCoverPath(String coverImage) {
        if (!StringUtils.hasText(coverImage)) {
            return null;
        }
        String normalized = coverImage.trim().replace("\\", "/");
        normalized = normalized.replace("..", "");
        normalized = normalized.replaceAll("/{2,}", "/");
        normalized = normalized.replaceAll("^\\./+", "");
        if (normalized.startsWith("http://") || normalized.startsWith("https://")) {
            return normalized;
        }
        if (normalized.startsWith("/uploads/")) {
            normalized = normalized.substring(1);
        } else if (normalized.startsWith("/")) {
            normalized = normalized.substring(1);
        }
        if (!normalized.startsWith("uploads/")) {
            normalized = "uploads/" + normalized.replaceAll("^/+", "");
        }
        return "/" + normalized;
    }

    private String resolveAssetSlug(String providedSlug, Long currentPostId) {
        String slugCandidate = StringUtils.hasText(providedSlug) ? providedSlug : postAssetService.generateFolderSlug();
        String normalized = postAssetService.normalizeFolderSlug(slugCandidate);
        postRepository.findBySlug(normalized)
                .filter(existing -> currentPostId == null || !existing.getId().equals(currentPostId))
                .ifPresent(existing -> {
                    throw new IllegalArgumentException("图像目录标识已存在，请重新上传或生成新目录");
                });
        return normalized;
    }
}
