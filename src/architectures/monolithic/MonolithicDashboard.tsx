/**
 * CENÁRIO A — MONOLÍTICO
 * ======================
 * Os painéis de explicação são montados durante o carregamento inicial.
 * Ao selecionar um estudante, apenas a visibilidade do painel é alterada,
 * sem a criação de um novo componente.
 *
 * A geração dos dados ocorre em um Web Worker, assim como no Cenário B,
 * mantendo essa etapa igual nos dois cenários para não interferir na
 * comparação entre as arquiteturas.
 */

import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { Layout } from '@/components/Layout/Layout';
import { DatasetControl } from '@/components/DatasetControl/DatasetControl';
import { Filters } from '@/components/Filters/Filters';
import { MetricCard } from '@/components/MetricCard/MetricCard';
import { GraficoBarra, GraficoPizza, GraficoHorizontal } from '@/components/Charts/Charts';
import { StudentList } from '@/components/StudentList/StudentList';
import { ExplanationPanel } from '@/components/ExplanationPanel/ExplanationPanel';
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
  marcarFim,
  medirIntervalo,
  sinalizarExplicacaoPronta,
  marcarInicioLista,
  marcarFimLista,
  marcarRenderPesadoFim,
  sinalizarAppPronta,
} from '@/utils/performance';
import type { Estudante, FiltrosAtivos } from '@/types';
import styles from './MonolithicDashboard.module.css';

const filtrosIniciais: FiltrosAtivos = {
  periodo: '',
  curso: '',
  regiao: '',
  modalidade: '',
};

export const MonolithicDashboard: React.FC = () => {
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
    registrarCenario({ architecture: 'monolithic', datasetSize });
  }, [datasetSize]);

  // Marca o fim do trabalho pesado de renderização (dados filtrados + gráficos
  // já commitados) e sinaliza que a aplicação está pronta para interação —
  // só depois que o worker de geração de dados também já terminou.
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

  // No cenário monolítico, os painéis já estão montados antes da interação.
  // Ao selecionar um estudante, apenas a visibilidade do painel é alterada,
  // sem criar um novo componente. Por isso, a medição é finalizada manualmente
  // após a atualização da interface. Os dois requestAnimationFrame garantem
  // que a mudança tenha sido processada antes do registro do tempo da interação.
  const handleSelecionarEstudante = useCallback((estudante: Estudante) => {
    marcarInicio('explicacao');
    marcarInicioLista();
    setEstudanteSelecionado(estudante);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        marcarFimLista();
        marcarFim('explicacao');
        medirIntervalo('tempo-explicacao');
        sinalizarExplicacaoPronta();
      });
    });
  }, []);

  const handleLimparFiltros = () => {
    setFiltros(filtrosIniciais);
  };

  return (
    <Layout architecture="monolithic">
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
          <div className={styles.explicacao}>
            {/*
              Pré-renderização real: um painel por estudante filtrado, todos
              montados desde já. Apenas o painel do estudante selecionado fica
              visível os demais existem no DOM, mas ocultos via CSS.
              `medirPerformance={false}` evita que a montagem inicial (que
              acontece no carregamento, não em um clique) dispare a marcação
              de performance de interação por engano.
            */}
            <div style={{ display: estudanteSelecionado ? 'none' : 'block' }}>
              <ExplanationPanel estudante={null} medirPerformance={false} visivel={!estudanteSelecionado} />
            </div>
            {estudantesFiltrados.map((est) => (
              <div
                key={est.id}
                style={{ display: est.id === estudanteSelecionado?.id ? 'block' : 'none' }}
              >
                <ExplanationPanel
                  estudante={est}
                  medirPerformance={false}
                  visivel={est.id === estudanteSelecionado?.id}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default MonolithicDashboard;
