package com.sangui.sanguiblog.service;

import com.sangui.sanguiblog.model.dto.PageViewRequest;
import com.sangui.sanguiblog.model.entity.AnalyticsPageView;
import com.sangui.sanguiblog.model.entity.Post;
import com.sangui.sanguiblog.model.entity.User;
import com.sangui.sanguiblog.model.repository.AnalyticsPageViewRepository;
import com.sangui.sanguiblog.model.repository.PostRepository;
import com.sangui.sanguiblog.model.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class AnalyticsService {

    private final AnalyticsPageViewRepository analyticsPageViewRepository;
    private final PostRepository postRepository;
    private final UserRepository userRepository;

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
}
