package com.oficina.repository;

import com.oficina.entity.OrdemServico;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import java.time.LocalDate;
import java.time.LocalTime;

public interface OrdemServicoRepository extends JpaRepository<OrdemServico, Long>, JpaSpecificationExecutor<OrdemServico> {
    boolean existsByMecanicoIdAndDataAgendamentoAndHorarioAgendamento(Long mecanicoId, LocalDate data, LocalTime horario);
    boolean existsByMecanicoIdAndDataAgendamentoAndHorarioAgendamentoAndIdNot(Long mecanicoId, LocalDate data, LocalTime horario, Long id);
}
