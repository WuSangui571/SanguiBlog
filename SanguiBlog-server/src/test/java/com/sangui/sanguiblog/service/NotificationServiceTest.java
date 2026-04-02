package com.sangui.sanguiblog.service;

import com.sangui.sanguiblog.model.dto.NotificationListDto;
import com.sangui.sanguiblog.model.entity.Comment;
import com.sangui.sanguiblog.model.entity.CommentNotification;
import com.sangui.sanguiblog.model.entity.User;
import com.sangui.sanguiblog.model.repository.CommentNotificationRepository;
import com.sangui.sanguiblog.model.repository.CommentRepository;
import com.sangui.sanguiblog.model.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import java.time.Instant;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class NotificationServiceTest {

    @Test
    void shouldPreferLatestUserAvatarOverHistoricalNotificationAvatar() {
        CommentNotificationRepository notificationRepository = mock(CommentNotificationRepository.class);
        UserRepository userRepository = mock(UserRepository.class);
        CommentRepository commentRepository = mock(CommentRepository.class);
        NotificationService service = new NotificationService(notificationRepository, userRepository, commentRepository);

        User author = new User();
        author.setId(9L);
        author.setAvatarUrl("/avatar/latest-avatar.png");

        Comment comment = new Comment();
        comment.setUser(author);
        comment.setAuthorAvatarUrl("/avatar/comment-avatar.png");

        CommentNotification notification = new CommentNotification();
        notification.setId(1L);
        notification.setComment(comment);
        notification.setCommentAuthorName("测试用户");
        notification.setCommentExcerpt("测试评论");
        notification.setCommentAuthorAvatar("/avatar/stale-avatar.png");
        notification.setCreatedAt(Instant.parse("2026-04-02T08:00:00Z"));

        when(notificationRepository.findVisibleAll(any(Long.class), any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of(notification), PageRequest.of(0, 10), 1));
        when(notificationRepository.countVisibleAll(1L)).thenReturn(1L);

        NotificationListDto result = service.listAll(1L, 1, 10);

        assertEquals(1, result.getItems().size());
        assertEquals("/uploads/avatar/latest-avatar.png", result.getItems().get(0).getAvatar());
    }
}
