import React from 'react';
import type { Estudante } from '@/types';
import { RiskIndicator } from '../RiskIndicator/RiskIndicator';
import styles from './StudentList.module.css';

interface StudentListProps {
  estudantes: Estudante[];
  selecionadoId?: string | null;
  onSelecionar: (estudante: Estudante) => void;
}

export const StudentList: React.FC<StudentListProps> = ({
  estudantes,
  selecionadoId,
  onSelecionar,
}) => {
  if (estudantes.length === 0) {
    return (
      <div className={styles.vazio} data-testid="student-list-empty">
        <p>Nenhum estudante encontrado com os filtros selecionados.</p>
      </div>
    );
  }

  return (
    <div className={styles.container} data-testid="student-list">
      <div className={styles.header}>
        <h3 className={styles.titulo}>Lista de Estudantes</h3>
        <span className={styles.contador}>{estudantes.length} registros</span>
      </div>
      <div className={styles.lista} role="list">
        {estudantes.map((estudante) => (
          <button
            key={estudante.id}
            className={`${styles.card} ${selecionadoId === estudante.id ? styles.selecionado : ''}`}
            onClick={() => onSelecionar(estudante)}
            data-testid="student-card"
            data-student-id={estudante.id}
            role="listitem"
            aria-pressed={selecionadoId === estudante.id}
          >
            <div className={styles.info}>
              <span className={styles.nome}>{estudante.nome}</span>
              <span className={styles.detalhes}>
                {estudante.curso} • {estudante.modalidade} • {estudante.regiao}
              </span>
              <span className={styles.detalhes}>
                Semestre {estudante.semestre} • {estudante.disciplinasConcluidas} concluídas
              </span>
            </div>
            <div className={styles.risco}>
              <RiskIndicator risco={estudante.riscoEvasao} tamanho="pequeno" mostrarLabel={false} />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
