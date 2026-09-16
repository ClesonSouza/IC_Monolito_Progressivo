import React from 'react';
import { Sidebar } from '../Sidebar/Sidebar';
import { Header } from '../Header/Header';
import styles from './Layout.module.css';

interface LayoutProps {
  children: React.ReactNode;
  architecture: 'monolithic' | 'progressive';
}

export const Layout: React.FC<LayoutProps> = ({ children, architecture }) => {
  return (
    <div className={styles.container} data-testid="dashboard">
      <Sidebar architecture={architecture} />
      <div className={styles.main}>
        <Header architecture={architecture} />
        <main className={styles.content}>{children}</main>
      </div>
    </div>
  );
};
