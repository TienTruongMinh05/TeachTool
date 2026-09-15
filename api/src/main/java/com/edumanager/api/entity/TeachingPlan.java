package com.edumanager.api.entity;

import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.*;
import lombok.*;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "teaching_plans")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TeachingPlan {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "class_id")
    private ClassRoom classRoom;

    @ManyToOne(optional = false)
    @JoinColumn(name = "session_id")
    private Session session;

    private String title;

    @OneToMany(mappedBy = "teachingPlan", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonManagedReference
    @Builder.Default
    private List<TeachingPlanSection> sections = new ArrayList<>();
}
