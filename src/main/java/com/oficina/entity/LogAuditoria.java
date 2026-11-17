package com.oficina.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "logs_auditoria")
public class LogAuditoria {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long osId;
    private String operacao;

    @Column(nullable = false)
    private LocalDateTime dataHora;

    private String usuarioResponsavel;

    public LogAuditoria() {}

    public LogAuditoria(Long osId, String operacao, LocalDateTime dataHora, String usuarioResponsavel) {
        this.osId = osId;
        this.operacao = operacao;
        this.dataHora = dataHora;
        this.usuarioResponsavel = usuarioResponsavel;
    }

    public Long getId() { return id; }
    public Long getOsId() { return osId; }
    public String getOperacao() { return operacao; }
    public LocalDateTime getDataHora() { return dataHora; }
    public String getUsuarioResponsavel() { return usuarioResponsavel; }
}
