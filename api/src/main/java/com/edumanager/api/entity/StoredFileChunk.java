package com.edumanager.api.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "stored_file_chunks", indexes = {
    @Index(name = "idx_chunk_name_idx", columnList = "stored_name, chunk_index"),
    @Index(name = "idx_chunk_name", columnList = "stored_name")
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

    @Column(name = "stored_name", nullable = false)
    private String storedName;

    @Column(name = "chunk_index", nullable = false)
    private int chunkIndex;

    @Lob
    @JdbcTypeCode(SqlTypes.BINARY)
    @Column(columnDefinition = "bytea", nullable = false)
    private byte[] data;
}
