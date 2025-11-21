package com.sangui.sanguiblog.model.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

import java.time.Instant;
import java.util.List;

@Getter
@Setter
@ToString
@Entity
@Table(name = "categories")
public class Category {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 128)
    private String name;

    @Column(nullable = false, unique = true, length = 128)
    private String slug;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_id")
    @ToString.Exclude
    private Category parent;

    @OneToMany(mappedBy = "parent", fetch = FetchType.LAZY)
    @ToString.Exclude
    private List<Category> children;

    @Column(length = 255)
    private String description;

    @Column(name = "sort_order")
    private Integer sortOrder;

    @Column(name = "created_at")
    private Instant createdAt;

    @Column(name = "updated_at")
    private Instant updatedAt;
}
