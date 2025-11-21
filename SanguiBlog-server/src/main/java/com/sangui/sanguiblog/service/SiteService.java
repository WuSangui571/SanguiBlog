package com.sangui.sanguiblog.service;

import com.sangui.sanguiblog.model.dto.SiteMetaDto;
import com.sangui.sanguiblog.model.dto.UserProfileDto;
import com.sangui.sanguiblog.model.entity.AnalyticsPageView;
import com.sangui.sanguiblog.model.entity.Post;
import com.sangui.sanguiblog.model.entity.SystemBroadcast;
import com.sangui.sanguiblog.model.entity.User;
import com.sangui.sanguiblog.model.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class SiteService {

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("yyyy/MM/dd");
    private static final DateTimeFormatter DATE_FULL_FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    private final PostRepository postRepository;
    private final CommentRepository commentRepository;
    private final CategoryRepository categoryRepository;
    private final TagRepository tagRepository;
    private final AnalyticsPageViewRepository analyticsPageViewRepository;
    private final AnalyticsTrafficSourceRepository analyticsTrafficSourceRepository;
    private final SystemBroadcastRepository systemBroadcastRepository;
    private final UserRepository userRepository;
    private final AuthService authService;

    public SiteMetaDto meta() {
        long postCount = postRepository.count();
        long commentCount = commentRepository.count();
        long categoryCount = categoryRepository.count();
        long tagCount = tagRepository.count();
        long totalViews = Optional.ofNullable(postRepository.sumViews()).orElse(0L);

        Optional<Post> lastPublished = postRepository.findFirstByStatusOrderByPublishedAtDesc("PUBLISHED");
        String lastDate = lastPublished.map(p -> DATE_FMT.format(p.getPublishedAt())).orElse("-");
        String lastDateFull = lastPublished.map(p -> DATE_FULL_FMT.format(p.getPublishedAt())).orElse("-");

        SystemBroadcast broadcast = systemBroadcastRepository.findActive(java.time.LocalDateTime.now()).orElse(null);

        List<SiteMetaDto.TrafficSourceDto> trafficSources = new java.util.ArrayList<>(
                analyticsTrafficSourceRepository
                        .findByStatDateOrderByVisitsDesc(LocalDate.now())
                        .stream()
                        .map(ts -> SiteMetaDto.TrafficSourceDto.builder()
                                .label(ts.getSourceLabel())
                                .value(ts.getPercentage() != null ? ts.getPercentage().doubleValue() : ts.getVisits())
                                .build())
                        .toList()
        );

        if (trafficSources.isEmpty()) {
            // fallback to latest available record
            analyticsTrafficSourceRepository.findAll().stream()
                    .collect(java.util.stream.Collectors.groupingBy(ts -> ts.getStatDate()))
                    .entrySet()
                    .stream()
                    .max(java.util.Map.Entry.comparingByKey())
                    .ifPresent(entry -> entry.getValue().forEach(ts ->
                            trafficSources.add(SiteMetaDto.TrafficSourceDto.builder()
                                    .label(ts.getSourceLabel())
                                    .value(ts.getPercentage() != null ? ts.getPercentage().doubleValue() : ts.getVisits())
                                    .build())
                    ));
        }

        List<SiteMetaDto.RecentActivityDto> activities = analyticsPageViewRepository.findTop20ByOrderByViewedAtDesc()
                .stream()
                .map(this::toActivity)
                .toList();

        User author = userRepository.findByUsername("sangui")
                .orElseGet(() -> userRepository.findAll().stream().findFirst().orElse(null));

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
                        .active(broadcast != null && Boolean.TRUE.equals(broadcast.getIsActive()))
                        .content(broadcast != null ? broadcast.getContent() : "")
                        .build())
                .author(author != null ? authService.toProfile(author) : null)
                .trafficSources(trafficSources)
                .recentActivity(activities)
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
}
