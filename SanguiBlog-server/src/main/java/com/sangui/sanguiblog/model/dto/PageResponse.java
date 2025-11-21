package com.sangui.sanguiblog.model.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class PageResponse<T> {
    private List<T> records;
    private long total;
    private int page;
    private int size;
}
