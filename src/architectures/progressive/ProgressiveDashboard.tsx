/**
 * CENÁRIO B — PROGRESSIVO
 * ======================
 * Os dados e componentes essenciais são carregados inicialmente.
 * O painel de explicação é carregado sob demanda com `React.lazy` e
 * `Suspense`, gerando um chunk JS separado para esse componente.
 *
 * A geração dos dados ocorre em um Web Worker, assim como no Cenário A.
 * Essa abordagem é mantida igual nos dois cenários para não interferir
 * na comparação entre as arquiteturas.
 */

import React, { useState, useMemo, useEffect, Suspense, lazy, useCallback } from 'react';
import { Layout } from '@/components/Layout/Layout';
import { DatasetControl } from '@/components/DatasetControl/DatasetControl';
import { Filters } from '@/components/Filters/Filters';
import { MetricCard } from '@/components/MetricCard/MetricCard';
import { GraficoBarra, GraficoPizza, GraficoHorizontal } from '@/components/Charts/Charts';
import { StudentList } from '@/components/StudentList/StudentList';
import { useEstudantesWorker } from '@/hooks/useEstudantesWorker';
import {
  filtrarEstudantes,
  calcularMetricas,
  obterDadosGraficoEvasaoPorModalidade,
  obterDadosGraficoEvasaoPorCurso,
  obterDadosGraficoDistribuicaoRisco,
  obterDadosGraficoEstudantesPorRegiao,
  obterDadosGraficoEstudantesEmRisco,
  obterOpcoesFiltro,
  obterTamanhoDatasetPadrao,
} from '@/services/studentService';
import {
  registrarCenario,
  marcarInicio,
  marcarInicioLista,
  marcarFimLista,
  marcarRenderPesadoFim,
  sinalizarAppPronta,
} from '@/utils/performance';
import type { Estudante, FiltrosAtivos } from '@/types';
import styles from './ProgressiveDashboard.module.css';

// LAZY LOADING: o componente pesado de explicação só é carregado quando necessário
const LazyExplanationPanel = lazy(() => import('@/components/ExplanationPanel/ExplanationPanel'));

const filtrosIniciais: FiltrosAtivos = {
  periodo: '',
  curso: '',
  regiao: '',
  modalidade: '',
};

export const ProgressiveDashboard: React.FC = () => {
  const [datasetSize, setDatasetSize] = useState<number>(obterTamanhoDatasetPadrao());
  const [filtros, setFiltros] = useState<FiltrosAtivos>(filtrosIniciais);
  const [estudanteSelecionado, setEstudanteSelecionado] = useState<Estudante | null>(null);

  // Geração dos dados roda em Web Worker, fora da thread principal
  const { estudantes: todosEstudantes, carregando: carregandoDados } = useEstudantesWorker(datasetSize);

  const estudantesFiltrados = useMemo(() => {
    return filtrarEstudantes(todosEstudantes, filtros);
  }, [todosEstudantes, filtros]);

  const metricas = useMemo(() => calcularMetricas(estudantesFiltrados), [estudantesFiltrados]);
  const dadosModalidade = useMemo(() => obterDadosGraficoEvasaoPorModalidade(estudantesFiltrados), [estudantesFiltrados]);
  const dadosCurso = useMemo(() => obterDadosGraficoEvasaoPorCurso(estudantesFiltrados), [estudantesFiltrados]);
  const dadosDistribuicao = useMemo(() => obterDadosGraficoDistribuicaoRisco(estudantesFiltrados), [estudantesFiltrados]);
  const dadosRegiao = useMemo(() => obterDadosGraficoEstudantesPorRegiao(estudantesFiltrados), [estudantesFiltrados]);
  const dadosRisco = useMemo(() => obterDadosGraficoEstudantesEmRisco(estudantesFiltrados), [estudantesFiltrados]);
  const opcoes = useMemo(() => obterOpcoesFiltro(todosEstudantes), [todosEstudantes]);

  useEffect(() => {
    registrarCenario({ architecture: 'progressive', datasetSize });
  }, [datasetSize]);

  // Mesma lógica do Cenário A: marca o fim do trabalho pesado de renderização
  // e sinaliza app pronta, só depois que o worker de dados também terminou.
  useEffect(() => {
    if (!carregandoDados) {
      marcarRenderPesadoFim();
      sinalizarAppPronta();
    }
  }, [estudantesFiltrados, carregandoDados]);

  const handleMudarDataset = useCallback((novoTamanho: number) => {
    setDatasetSize(novoTamanho);
    setEstudanteSelecionado(null);
    setFiltros(filtrosIniciais);
  }, []);

  // O carregamento do painel é medido separadamente da lista 
  // para identificar quanto tempo cada etapa leva: primeiro a atualização da lista e, depois, o carregamento e a renderização do painel sob demanda.
  const handleSelecionarEstudante = useCallback((estudante: Estudante) => {
    marcarInicio('explicacao');
    marcarInicioLista();
    setEstudanteSelecionado(estudante);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        marcarFimLista();
      });
    });
  }, []);

  const handleLimparFiltros = () => {
    setFiltros(filtrosIniciais);
  };

  return (
    <Layout architecture="progressive">
      <div className={styles.dashboard}>
        <DatasetControl
          tamanhoAtual={datasetSize}
          onMudarTamanho={handleMudarDataset}
        />

        <Filters
          filtros={filtros}
          opcoes={opcoes}
          onChange={setFiltros}
          onLimpar={handleLimparFiltros}
        />

        <div className={styles.metricas} data-testid="metrics-container">
          <MetricCard
            titulo="Taxa de Evasão"
            valor={`${metricas.taxaEvasao.toFixed(1)}%`}
            descricao="Estudantes em alto risco"
            icone={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
              </svg>
            }
            cor="#dc2626"
            testId="metric-taxa-evasao"
          />
          <MetricCard
            titulo="Taxa de Ocupação"
            valor={`${metricas.taxaOcupacao.toFixed(1)}%`}
            descricao="Frequência média geral"
            icone={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 00-3-3.87" />
                <path d="M16 3.13a4 4 0 010 7.75" />
              </svg>
            }
            cor="#3b82f6"
            testId="metric-taxa-ocupacao"
          />
          <MetricCard
            titulo="Taxa de Conclusão"
            valor={`${metricas.taxaConclusao.toFixed(1)}%`}
            descricao="Progresso médio nos cursos"
            icone={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            }
            cor="#16a34a"
            testId="metric-taxa-conclusao"
          />
          <MetricCard
            titulo="Total de Estudantes"
            valor={metricas.quantidadeEstudantes}
            descricao={`${metricas.estudantesAltoRisco} em alto risco`}
            icone={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                <circle cx="9" cy="7" r="4" />
              </svg>
            }
            cor="#1e3a5f"
            testId="metric-total-estudantes"
          />
          <MetricCard
            titulo="Alto Risco"
            valor={metricas.estudantesAltoRisco}
            descricao="Necessitam atenção imediata"
            icone={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            }
            cor="#d97706"
            testId="metric-alto-risco"
          />
        </div>

        <div className={styles.graficos}>
          <GraficoBarra
            titulo="Evasão por Modalidade"
            dados={dadosModalidade}
            testId="chart-evasao-modalidade"
          />
          <GraficoPizza
            titulo="Distribuição de Risco"
            dados={dadosDistribuicao}
            testId="chart-distribuicao-risco"
          />
          <GraficoBarra
            titulo="Risco Médio por Curso"
            dados={dadosCurso}
            testId="chart-evasao-curso"
          />
          <GraficoHorizontal
            titulo="Estudantes por Região"
            dados={dadosRegiao}
            testId="chart-estudantes-regiao"
          />
          <GraficoHorizontal
            titulo="Estudantes em Situação de Risco"
            dados={dadosRisco}
            testId="chart-estudantes-risco"
          />
        </div>

        <div className={styles.inferior}>
          <div className={styles.lista}>
            <StudentList
              estudantes={estudantesFiltrados}
              selecionadoId={estudanteSelecionado?.id}
              onSelecionar={handleSelecionarEstudante}
            />
          </div>
          <div className={styles.explicacao} data-testid="load-explanation">
            {estudanteSelecionado ? (
              <Suspense
                fallback={
                  <div className={styles.carregandoWrapper}>
                    <div className={styles.spinner} />
                    <p>Carregando componente...</p>
                  </div>
                }
              >
                <LazyExplanationPanel estudante={estudanteSelecionado} />
              </Suspense>
            ) : (
              <div className={styles.vazioWrapper}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5">
                  <path d="M9 11l3 3L22 4" />
                  <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
                </svg>
                <p>Selecione um estudante para visualizar a explicação do risco de evasão.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ProgressiveDashboard;
