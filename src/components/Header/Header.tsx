import React from 'react';
import styles from './Header.module.css';

interface HeaderProps {
  architecture: 'monolithic' | 'progressive';
}

export const Header: React.FC<HeaderProps> = ({ architecture }) => {
  return (
    <header className={styles.header} role="banner">
      <div>
        <h1 className={styles.title}>Dashboard de Análise de Risco de Evasão</h1>
        <p className={styles.subtitle}>
          Cenário: <strong>{architecture === 'monolithic' ? 'Monolítico' : 'Progressivo'}</strong>
          {' — '}
          {architecture === 'monolithic'
            ? 'Todos os dados renderizados inicialmente'
            : 'Renderização sob demanda'}
        </p>
      </div>
      <div className={styles.info}>
        <span className={styles.tag}>Experimental</span>
      </div>
    </header>
  );
};
