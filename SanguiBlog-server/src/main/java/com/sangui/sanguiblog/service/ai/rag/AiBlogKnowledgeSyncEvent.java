package com.sangui.sanguiblog.service.ai.rag;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public class AiBlogKnowledgeSyncEvent {

    private final Long postId;
}
