import React from 'react';
import styles from './MetricCard.module.css';

interface MetricCardProps {
  titulo: string;
  valor: string | number;
  descricao?: string;
  icone?: React.ReactNode;
  cor?: string;
  testId?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  titulo,
  valor,
  descricao,
  icone,
  cor = '#1e3a5f',
  testId,
}) => {
  return (
    <div className={styles.card} data-testid={testId}>
      <div className={styles.header}>
        <span className={styles.titulo}>{titulo}</span>
        {icone && (
          <div className={styles.icone} style={{ backgroundColor: `${cor}15`, color: cor }}>
            {icone}
          </div>
        )}
      </div>
      <div className={styles.valor} style={{ color: cor }}>
        {valor}
      </div>
      {descricao && <p className={styles.descricao}>{descricao}</p>}
    </div>
  );
};
