import React from 'react';
import { classificarRisco, corRisco } from '@/utils/helpers';
import styles from './RiskIndicator.module.css';

interface RiskIndicatorProps {
  risco: number;
  tamanho?: 'pequeno' | 'medio' | 'grande';
  mostrarLabel?: boolean;
}

export const RiskIndicator: React.FC<RiskIndicatorProps> = ({
  risco,
  tamanho = 'medio',
  mostrarLabel = true,
}) => {
  const cor = corRisco(risco);
  const classificacao = classificarRisco(risco);
  const raio = tamanho === 'grande' ? 52 : tamanho === 'medio' ? 36 : 24;
  const circunferencia = 2 * Math.PI * raio;
  const offset = circunferencia - (risco / 100) * circunferencia;

  return (
    <div className={styles.container} data-testid="risk-indicator">
      <div className={styles.wrapper} style={{ width: raio * 2 + 16, height: raio * 2 + 16 }}>
        <svg width={raio * 2 + 16} height={raio * 2 + 16} className={styles.svg}>
          <circle
            cx={raio + 8}
            cy={raio + 8}
            r={raio}
            fill="none"
            stroke="#e2e8f0"
            strokeWidth={tamanho === 'grande' ? 8 : 6}
          />
          <circle
            cx={raio + 8}
            cy={raio + 8}
            r={raio}
            fill="none"
            stroke={cor}
            strokeWidth={tamanho === 'grande' ? 8 : 6}
            strokeLinecap="round"
            strokeDasharray={circunferencia}
            strokeDashoffset={offset}
            className={styles.progress}
          />
        </svg>
        <div className={styles.texto}>
          <span className={styles.porcentagem} style={{ fontSize: tamanho === 'grande' ? 22 : tamanho === 'medio' ? 16 : 12 }}>
            {risco}%
          </span>
        </div>
      </div>
      {mostrarLabel && (
        <span className={styles.label} style={{ color: cor, fontSize: tamanho === 'grande' ? 14 : 12 }}>
          {classificacao}
        </span>
      )}
    </div>
  );
};
