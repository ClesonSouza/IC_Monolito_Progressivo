import React from 'react';
import type { FiltrosAtivos } from '@/types';
import styles from './Filters.module.css';

interface FiltersProps {
  filtros: FiltrosAtivos;
  opcoes: {
    cursos: string[];
    regioes: string[];
    modalidades: string[];
    periodos: string[];
  };
  onChange: (filtros: FiltrosAtivos) => void;
  onLimpar: () => void;
}

export const Filters: React.FC<FiltersProps> = ({ filtros, opcoes, onChange, onLimpar }) => {
  const handleChange = (campo: keyof FiltrosAtivos, valor: string) => {
    onChange({ ...filtros, [campo]: valor });
  };

  return (
    <div className={styles.container} data-testid="filters-panel">
      <div className={styles.group}>
        <label htmlFor="filtro-periodo">Período</label>
        <select
          id="filtro-periodo"
          value={filtros.periodo}
          onChange={(e) => handleChange('periodo', e.target.value)}
        >
          <option value="">Todos</option>
          {opcoes.periodos.map((p) => (
            <option key={p} value={p}>{p}º semestre</option>
          ))}
        </select>
      </div>

      <div className={styles.group}>
        <label htmlFor="filtro-curso">Curso</label>
        <select
          id="filtro-curso"
          value={filtros.curso}
          onChange={(e) => handleChange('curso', e.target.value)}
        >
          <option value="">Todos</option>
          {opcoes.cursos.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      <div className={styles.group}>
        <label htmlFor="filtro-regiao">Região</label>
        <select
          id="filtro-regiao"
          value={filtros.regiao}
          onChange={(e) => handleChange('regiao', e.target.value)}
        >
          <option value="">Todas</option>
          {opcoes.regioes.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      </div>

      <div className={styles.group}>
        <label htmlFor="filtro-modalidade">Modalidade</label>
        <select
          id="filtro-modalidade"
          value={filtros.modalidade}
          onChange={(e) => handleChange('modalidade', e.target.value)}
        >
          <option value="">Todas</option>
          {opcoes.modalidades.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </div>

      <button
        type="button"
        className={styles.limpar}
        onClick={onLimpar}
        aria-label="Limpar todos os filtros"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 12h18M3 12l6-6M3 12l6 6" />
        </svg>
        Limpar
      </button>
    </div>
  );
};
