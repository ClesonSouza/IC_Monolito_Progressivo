import React from 'react';
import styles from './DatasetControl.module.css';

interface DatasetControlProps {
  tamanhoAtual: number;
  onMudarTamanho: (tamanho: number) => void;
}

const TAMANHOS_PRE_DEFINIDOS = [50, 100, 250, 500, 1000, 2000, 5000, 10000];

export const DatasetControl: React.FC<DatasetControlProps> = ({
  tamanhoAtual,
  onMudarTamanho,
}) => {
  return (
    <div className={styles.container} data-testid="dataset-control">
      <label htmlFor="dataset-size" className={styles.label}>
        Tamanho do Dataset
      </label>
      <div className={styles.controls}>
        <select
          id="dataset-size"
          className={styles.select}
          value={tamanhoAtual}
          onChange={(e) => onMudarTamanho(Number(e.target.value))}
          aria-label="Selecionar tamanho do dataset"
        >
          {TAMANHOS_PRE_DEFINIDOS.map((size) => (
            <option key={size} value={size}>
              {size.toLocaleString('pt-BR')} estudantes
            </option>
          ))}
        </select>
        <div className={styles.botoesRapidos}>
          {TAMANHOS_PRE_DEFINIDOS.map((size) => (
            <button
              key={size}
              type="button"
              className={`${styles.botaoRapido} ${tamanhoAtual === size ? styles.ativo : ''}`}
              onClick={() => onMudarTamanho(size)}
              aria-pressed={tamanhoAtual === size}
              data-testid={`dataset-btn-${size}`}
            >
              {size >= 1000 ? `${size / 1000}k` : size}
            </button>
          ))}
        </div>
      </div>
      <span className={styles.info}>
        Dataset atual: <strong>{tamanhoAtual.toLocaleString('pt-BR')}</strong> registros sintéticos
      </span>
    </div>
  );
};

export default DatasetControl;
