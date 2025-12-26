package com.sangui.sanguiblog.model.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PostNeighborsDto {
    private PostSummaryDto prev;
    private PostSummaryDto next;
    private List<PostSummaryDto> related;
}

