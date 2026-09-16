import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
} from 'recharts';
import type { DadosGrafico } from '@/types';
import styles from './Charts.module.css';

const CORES = ['#1e3a5f', '#3b82f6', '#60a5fa', '#93c5fd', '#cbd5e1', '#64748b', '#94a3b8', '#f59e0b', '#ef4444', '#10b981'];

interface GraficoBarraProps {
  titulo: string;
  dados: DadosGrafico[];
  chaveX?: string;
  chaveY?: string;
  testId?: string;
}

export const GraficoBarra: React.FC<GraficoBarraProps> = ({
  titulo,
  dados,
  chaveX = 'nome',
  chaveY = 'valor',
  testId,
}) => {
  return (
    <div className={styles.card} data-testid={testId}>
      <h3 className={styles.titulo}>{titulo}</h3>
      <div className={styles.chartArea}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={dados} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey={chaveX} tick={{ fontSize: 11 }} angle={-30} textAnchor="end" height={60} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip
              contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}
            />
            <Bar dataKey={chaveY} fill="#1e3a5f" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

interface GraficoPizzaProps {
  titulo: string;
  dados: DadosGrafico[];
  testId?: string;
}

export const GraficoPizza: React.FC<GraficoPizzaProps> = ({ titulo, dados, testId }) => {
  return (
    <div className={styles.card} data-testid={testId}>
      <h3 className={styles.titulo}>{titulo}</h3>
      <div className={styles.chartArea}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={dados}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={4}
              dataKey="valor"
              nameKey="nome"
            >
              {dados.map((_, index) => (
                <Cell key={`cell-${index}`} fill={CORES[index % CORES.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}
            />
            <Legend verticalAlign="bottom" height={36} iconType="circle" />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

interface GraficoRadarProps {
  titulo: string;
  dados: DadosGrafico[];
  testId?: string;
}

export const GraficoRadar: React.FC<GraficoRadarProps> = ({ titulo, dados, testId }) => {
  return (
    <div className={styles.card} data-testid={testId}>
      <h3 className={styles.titulo}>{titulo}</h3>
      <div className={styles.chartArea}>
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={dados}>
            <PolarGrid stroke="#e2e8f0" />
            <PolarAngleAxis dataKey="nome" tick={{ fontSize: 11 }} />
            <PolarRadiusAxis tick={{ fontSize: 10 }} />
            <Radar
              name="Valor"
              dataKey="valor"
              stroke="#1e3a5f"
              fill="#1e3a5f"
              fillOpacity={0.25}
            />
            <Tooltip
              contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

interface GraficoHorizontalProps {
  titulo: string;
  dados: DadosGrafico[];
  testId?: string;
}

export const GraficoHorizontal: React.FC<GraficoHorizontalProps> = ({ titulo, dados, testId }) => {
  return (
    <div className={styles.card} data-testid={testId}>
      <h3 className={styles.titulo}>{titulo}</h3>
      <div className={styles.chartArea}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={dados} layout="vertical" margin={{ top: 8, right: 16, left: 40, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11 }} />
            <YAxis type="category" dataKey="nome" tick={{ fontSize: 11 }} width={120} />
            <Tooltip
              contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}
            />
            <Bar dataKey="valor" fill="#3b82f6" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
