package com.sangui.sanguiblog.service;

import com.sangui.sanguiblog.model.dto.AdminAnalyticsSummaryDto;
import com.sangui.sanguiblog.model.dto.PageViewRequest;
import com.sangui.sanguiblog.model.entity.AnalyticsPageView;
import com.sangui.sanguiblog.model.entity.AnalyticsTrafficSource;
import com.sangui.sanguiblog.model.entity.Post;
import com.sangui.sanguiblog.model.entity.User;
import com.sangui.sanguiblog.model.repository.AnalyticsPageViewRepository;
import com.sangui.sanguiblog.model.repository.AnalyticsTrafficSourceRepository;
import com.sangui.sanguiblog.model.repository.CommentRepository;
import com.sangui.sanguiblog.model.repository.PostRepository;
import com.sangui.sanguiblog.model.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AnalyticsService {

    private static final DateTimeFormatter DATE_TIME_FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    private final AnalyticsPageViewRepository analyticsPageViewRepository;
    private final PostRepository postRepository;
    private final UserRepository userRepository;
    private final CommentRepository commentRepository;
    private final AnalyticsTrafficSourceRepository analyticsTrafficSourceRepository;

    public void recordPageView(PageViewRequest request, String ip, String userAgent, Long userId) {
        AnalyticsPageView pv = new AnalyticsPageView();
        if (request.getPostId() != null) {
            Post post = postRepository.findById(request.getPostId()).orElse(null);
            pv.setPost(post);
        }
        if (userId != null) {
            User user = userRepository.findById(userId).orElse(null);
            pv.setUser(user);
        }
        pv.setPageTitle(request.getPageTitle());
        pv.setViewerIp(ip);
        pv.setReferrerUrl(request.getReferrer());
        pv.setGeoLocation(request.getGeo());
        pv.setUserAgent(userAgent);
        pv.setViewedAt(LocalDateTime.now());
        analyticsPageViewRepository.save(pv);
    }

    @Transactional(readOnly = true)
    public AdminAnalyticsSummaryDto loadAdminSummary(int days, int topLimit, int recentLimit) {
        int safeDays = Math.max(1, Math.min(days, 60));
        int safeTop = Math.max(1, Math.min(topLimit, 20));
        int safeRecent = Math.max(1, Math.min(recentLimit, 100));

        LocalDate today = LocalDate.now();
        LocalDate startDate = today.minusDays(safeDays - 1L);
        LocalDateTime start = startDate.atStartOfDay();

        long totalViews = analyticsPageViewRepository.count();
        long periodViews = analyticsPageViewRepository.countByViewedAtAfter(start);
        long uniqueVisitors = analyticsPageViewRepository.countDistinctViewerIpSince(start);
        long loggedInViews = analyticsPageViewRepository.countByUserIsNotNullAndViewedAtAfter(start);
        double avgViewsPerDay = safeDays > 0 ? (double) periodViews / safeDays : periodViews;

        long postCount = postRepository.count();
        long commentCount = commentRepository.count();

        List<AdminAnalyticsSummaryDto.TrendPoint> dailyTrends = buildTrendPoints(startDate, safeDays);
        List<AdminAnalyticsSummaryDto.TopPost> topPosts = analyticsPageViewRepository
                .findTopPostsSince(start, PageRequest.of(0, safeTop))
                .stream()
                .map(tp -> AdminAnalyticsSummaryDto.TopPost.builder()
                        .postId(tp.getPostId())
                        .title(tp.getTitle() != null ? tp.getTitle() : "未知文章")
                        .slug(tp.getSlug())
                        .views(tp.getViews() != null ? tp.getViews() : 0L)
                        .build())
                .toList();

        List<AdminAnalyticsSummaryDto.TrafficSource> trafficSources = loadTrafficSources()
                .stream()
                .map(ts -> AdminAnalyticsSummaryDto.TrafficSource.builder()
                        .label(ts.getSourceLabel())
                        .value(ts.getPercentage() != null ? ts.getPercentage().doubleValue() : ts.getVisits())
                        .build())
                .toList();

        List<AdminAnalyticsSummaryDto.RecentVisit> recentVisits = analyticsPageViewRepository
                .findAllByOrderByViewedAtDesc(PageRequest.of(0, safeRecent))
                .stream()
                .map(view -> AdminAnalyticsSummaryDto.RecentVisit.builder()
                        .id(view.getId())
                        .title(view.getPost() != null ? view.getPost().getTitle() : view.getPageTitle())
                        .postId(view.getPost() != null ? view.getPost().getId() : null)
                        .slug(view.getPost() != null ? view.getPost().getSlug() : null)
                        .ip(view.getViewerIp())
                        .time(view.getViewedAt() != null ? DATE_TIME_FMT.format(view.getViewedAt()) : "")
                        .referrer(view.getReferrerUrl())
                        .geo(view.getGeoLocation())
                        .loggedIn(view.getUser() != null)
                        .userId(view.getUser() != null ? view.getUser().getId() : null)
                        .userName(view.getUser() != null ? view.getUser().getDisplayName() : null)
                        .userRole(view.getUser() != null && view.getUser().getRole() != null
                                ? view.getUser().getRole().getCode()
                                : null)
                        .userAgent(view.getUserAgent())
                        .build())
                .toList();

        return AdminAnalyticsSummaryDto.builder()
                .overview(AdminAnalyticsSummaryDto.Overview.builder()
                        .totalViews(totalViews)
                        .periodViews(periodViews)
                        .uniqueVisitors(uniqueVisitors)
                        .loggedInViews(loggedInViews)
                        .avgViewsPerDay(Math.round(avgViewsPerDay * 10d) / 10d)
                        .postCount(postCount)
                        .commentCount(commentCount)
                        .rangeDays(safeDays)
                        .rangeLabel("最近" + safeDays + "天")
                        .build())
                .trafficSources(trafficSources)
                .dailyTrends(dailyTrends)
                .topPosts(topPosts)
                .recentVisits(recentVisits)
                .build();
    }

    private List<AdminAnalyticsSummaryDto.TrendPoint> buildTrendPoints(LocalDate startDate, int safeDays) {
        List<AnalyticsPageViewRepository.DailyViewAggregation> aggregations =
                analyticsPageViewRepository.aggregateDailyViews(startDate.atStartOfDay());
        Map<LocalDate, AnalyticsPageViewRepository.DailyViewAggregation> dailyMap = new HashMap<>();
        for (AnalyticsPageViewRepository.DailyViewAggregation aggregation : aggregations) {
            if (aggregation.getStatDate() != null) {
                dailyMap.put(aggregation.getStatDate().toLocalDate(), aggregation);
            }
        }
        List<AdminAnalyticsSummaryDto.TrendPoint> result = new ArrayList<>();
        for (int i = 0; i < safeDays; i++) {
            LocalDate day = startDate.plusDays(i);
            AnalyticsPageViewRepository.DailyViewAggregation row = dailyMap.get(day);
            long views = row != null && row.getViews() != null ? row.getViews() : 0L;
            long visitors = row != null && row.getVisitors() != null ? row.getVisitors() : 0L;
            result.add(AdminAnalyticsSummaryDto.TrendPoint.builder()
                    .date(day.toString())
                    .views(views)
                    .visitors(visitors)
                    .build());
        }
        return result;
    }

    private List<AnalyticsTrafficSource> loadTrafficSources() {
        List<AnalyticsTrafficSource> todaySources =
                analyticsTrafficSourceRepository.findByStatDateOrderByVisitsDesc(LocalDate.now());
        if (!todaySources.isEmpty()) {
            return todaySources;
        }
        List<AnalyticsTrafficSource> allSources = analyticsTrafficSourceRepository
                .findAll(Sort.by(Sort.Direction.DESC, "statDate", "visits"));
        if (allSources.isEmpty()) {
            return List.of();
        }
        LocalDate latestDate = allSources.stream()
                .map(AnalyticsTrafficSource::getStatDate)
                .filter(d -> d != null)
                .findFirst()
                .orElse(null);
        if (latestDate == null) {
            return List.of();
        }
        return allSources.stream()
                .filter(ts -> latestDate.equals(ts.getStatDate()))
                .collect(Collectors.toList());
    }
}
