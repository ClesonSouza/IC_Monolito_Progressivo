import React from 'react';
import { NavLink } from 'react-router-dom';
import styles from './Sidebar.module.css';

interface SidebarProps {
  architecture: 'monolithic' | 'progressive';
}

export const Sidebar: React.FC<SidebarProps> = ({ architecture }) => {
  return (
    <aside className={styles.sidebar} role="navigation" aria-label="Menu principal">
      <div className={styles.logo}>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 6v6l4 2" />
        </svg>
        <span>Evasão Acadêmica</span>
      </div>
      <nav className={styles.nav}>
        <NavLink
          to="/monolitico"
          className={({ isActive }) =>
            `${styles.link} ${isActive ? styles.active : ''} ${architecture === 'monolithic' ? styles.current : ''}`
          }
          aria-current={architecture === 'monolithic' ? 'page' : undefined}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="7" height="7" />
            <rect x="14" y="3" width="7" height="7" />
            <rect x="3" y="14" width="7" height="7" />
            <rect x="14" y="14" width="7" height="7" />
          </svg>
          <span>Cenário Monolítico</span>
        </NavLink>
        <NavLink
          to="/progressivo"
          className={({ isActive }) =>
            `${styles.link} ${isActive ? styles.active : ''} ${architecture === 'progressive' ? styles.current : ''}`
          }
          aria-current={architecture === 'progressive' ? 'page' : undefined}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
          </svg>
          <span>Cenário Progressivo</span>
        </NavLink>
      </nav>
      <div className={styles.footer}>
        <span className={styles.badge}>{architecture === 'monolithic' ? 'MONOLÍTICO' : 'PROGRESSIVO'}</span>
        <p className={styles.hint}>Versão experimental</p>
      </div>
    </aside>
  );
};
