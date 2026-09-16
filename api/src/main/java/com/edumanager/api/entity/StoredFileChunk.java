package com.edumanager.api.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "stored_file_chunks", indexes = {
    @Index(name = "idx_chunk_stored_name_idx", columnList = "storedName, chunkIndex"),
    @Index(name = "idx_chunk_stored_name", columnList = "storedName")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StoredFileChunk {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String storedName;

    @Column(nullable = false)
    private int chunkIndex;

    @Lob
    @JdbcTypeCode(SqlTypes.BINARY)
    @Column(columnDefinition = "bytea", nullable = false)
    private byte[] data;
}
