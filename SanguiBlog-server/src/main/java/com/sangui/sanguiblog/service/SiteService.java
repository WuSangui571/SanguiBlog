package com.sangui.sanguiblog.service;

import com.sangui.sanguiblog.model.dto.SiteMetaDto;
import com.sangui.sanguiblog.model.dto.UserProfileDto;
import com.sangui.sanguiblog.model.entity.AnalyticsPageView;
import com.sangui.sanguiblog.model.entity.Post;
import com.sangui.sanguiblog.model.entity.SystemBroadcast;
import com.sangui.sanguiblog.model.entity.User;
import com.sangui.sanguiblog.model.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class SiteService {

        private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("yyyy/MM/dd");
        private static final DateTimeFormatter DATE_FULL_FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

        private static final String DEFAULT_BROADCAST_STYLE = "ALERT";
        private static final Set<String> SUPPORTED_BROADCAST_STYLES = Set.of("ALERT", "ANNOUNCE");

        private final PostRepository postRepository;
        private final CommentRepository commentRepository;
        private final CategoryRepository categoryRepository;
        private final TagRepository tagRepository;
        private final AnalyticsPageViewRepository analyticsPageViewRepository;
        private final AnalyticsTrafficSourceRepository analyticsTrafficSourceRepository;
        private final SystemBroadcastRepository systemBroadcastRepository;
        private final UserRepository userRepository;
        private final AuthService authService;
        @Value("${site.footer.year:2025}")
        private int footerYear;
        @Value("${site.footer.brand:三桂博客}")
        private String footerBrand;
        @Value("${site.footer.icp-number:浙ICP备2025167176号}")
        private String footerIcpNumber;
        @Value("${site.footer.icp-link:https://beian.miit.gov.cn/}")
        private String footerIcpLink;
        @Value("${site.footer.powered-by:Powered by Spring Boot 3 & React 19}")
        private String footerPoweredBy;
        @Value("${site.version:V1.0.0}")
        private String siteVersion;

        public SiteMetaDto meta() {
                long postCount = postRepository.count();
                long commentCount = commentRepository.count();
                long categoryCount = categoryRepository.count();
                long tagCount = tagRepository.count();
                long totalViews = Optional.ofNullable(postRepository.sumViews()).orElse(0L);

                Optional<Post> lastPublished = postRepository.findFirstByStatusOrderByPublishedAtDesc("PUBLISHED");
                String lastDate = lastPublished.map(p -> DATE_FMT.format(p.getPublishedAt())).orElse("-");
                String lastDateFull = lastPublished.map(p -> DATE_FULL_FMT.format(p.getPublishedAt())).orElse("-");

                SystemBroadcast broadcast = systemBroadcastRepository.findTopByOrderByCreatedAtDesc()
                                .orElse(null);
                System.out.println("Meta broadcast: "
                                + (broadcast != null ? "ID=" + broadcast.getId() + ", Active=" + broadcast.getIsActive()
                                                : "null"));

                List<SiteMetaDto.TrafficSourceDto> trafficSources = new java.util.ArrayList<>(
                                analyticsTrafficSourceRepository
                                                .findByStatDateOrderByVisitsDesc(LocalDate.now())
                                                .stream()
                                                .map(ts -> SiteMetaDto.TrafficSourceDto.builder()
                                                                .label(ts.getSourceLabel())
                                                                .value(ts.getPercentage() != null
                                                                                ? ts.getPercentage().doubleValue()
                                                                                : ts.getVisits())
                                                                .build())
                                                .toList());

                if (trafficSources.isEmpty()) {
                        // fallback to latest available record
                        analyticsTrafficSourceRepository.findAll().stream()
                                        .collect(java.util.stream.Collectors.groupingBy(ts -> ts.getStatDate()))
                                        .entrySet()
                                        .stream()
                                        .max(java.util.Map.Entry.comparingByKey())
                                        .ifPresent(entry -> entry.getValue()
                                                        .forEach(ts -> trafficSources.add(SiteMetaDto.TrafficSourceDto
                                                                        .builder()
                                                                        .label(ts.getSourceLabel())
                                                                        .value(ts.getPercentage() != null
                                                                                        ? ts.getPercentage()
                                                                                                        .doubleValue()
                                                                                        : ts.getVisits())
                                                                        .build())));
                }

                List<SiteMetaDto.RecentActivityDto> activities = analyticsPageViewRepository
                                .findTop20ByOrderByViewedAtDesc()
                                .stream()
                                .map(this::toActivity)
                                .toList();

                // Find super admin user for site author info
                User author = userRepository.findAll().stream()
                                .filter(u -> u.getRole() != null && "SUPER_ADMIN".equals(u.getRole().getCode()))
                                .findFirst()
                                .orElseGet(() -> userRepository.findByUsername("sangui")
                                                .orElseGet(() -> userRepository.findAll().stream().findFirst()
                                                                .orElse(null)));

                return SiteMetaDto.builder()
                                .stats(SiteMetaDto.SiteStats.builder()
                                                .posts(postCount)
                                                .comments(commentCount)
                                                .categories(categoryCount)
                                                .tags(tagCount)
                                                .views(totalViews)
                                                .lastUpdated(lastDate)
                                                .lastUpdatedFull(lastDateFull)
                                                .build())
                                .broadcast(SiteMetaDto.BroadcastDto.builder()
                                                .active(broadcast != null
                                                                && Boolean.TRUE.equals(broadcast.getIsActive()))
                                                .content(broadcast != null ? broadcast.getContent() : "")
                                                .style(broadcast != null
                                                                ? normalizeBroadcastStyle(broadcast.getStyle())
                                                                : DEFAULT_BROADCAST_STYLE)
                                                .build())
                                .author(author != null ? authService.toProfile(author) : null)
                                .trafficSources(trafficSources)
                                .recentActivity(activities)
                                .footer(SiteMetaDto.FooterInfo.builder()
                                                .year(footerYear)
                                                .brand(footerBrand)
                                                .icpNumber(footerIcpNumber)
                                                .icpLink(footerIcpLink)
                                                .poweredBy(footerPoweredBy)
                                                .copyrightText(String.format("Copyright © %d %s All rights reserved.",
                                                                footerYear, footerBrand))
                                                .build())
                                .version(siteVersion)
                                .build();
        }

        private SiteMetaDto.RecentActivityDto toActivity(AnalyticsPageView view) {
                String time = view.getViewedAt() != null
                                ? DATE_FULL_FMT.format(view.getViewedAt())
                                : "";
                return SiteMetaDto.RecentActivityDto.builder()
                                .title(view.getPageTitle())
                                .ip(view.getViewerIp())
                                .time(time)
                                .referrer(view.getReferrerUrl())
                                .geo(view.getGeoLocation())
                                .build();
        }

        @org.springframework.transaction.annotation.Transactional
        public void updateBroadcast(String content, boolean isActive, String style) {
                // Always create a new record to ensure history and correct ordering
                SystemBroadcast broadcast = new SystemBroadcast();
                broadcast.setCreatedAt(java.time.Instant.now());
                broadcast.setContent(content);
                broadcast.setStyle(normalizeBroadcastStyle(style));
                broadcast.setIsActive(isActive);
                broadcast.setUpdatedAt(java.time.Instant.now());
                broadcast.setActiveFrom(java.time.LocalDateTime.now());

                System.out.println("Creating new broadcast: content=" + content + ", active=" + isActive + ", style="
                                + broadcast.getStyle());
                systemBroadcastRepository.saveAndFlush(broadcast);
        }

        private String normalizeBroadcastStyle(String style) {
                if (style == null || style.isBlank()) {
                        return DEFAULT_BROADCAST_STYLE;
                }
                String normalized = style.trim().toUpperCase();
                return SUPPORTED_BROADCAST_STYLES.contains(normalized) ? normalized : DEFAULT_BROADCAST_STYLE;
        }
}
