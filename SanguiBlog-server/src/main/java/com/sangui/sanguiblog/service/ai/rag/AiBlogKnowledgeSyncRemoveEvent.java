package com.sangui.sanguiblog.service.ai.rag;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public class AiBlogKnowledgeSyncRemoveEvent {

    private final Long postId;
}
