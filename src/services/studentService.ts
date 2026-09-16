/**
 * Serviço de dados de estudantes.
 * Centraliza o acesso aos dados, facilitando a substituição por API real.
 * Suporta tamanhos de dataset configuráveis via URL ou parâmetro.
 */

import type { Estudante, MetricasDashboard, DadosGrafico, FiltrosAtivos } from '@/types';
import { gerarDataset, DATASETS } from '@/data/generator';

let cacheEstudantes: Estudante[] | null = null;
let cacheTamanho: number | null = null;

/**
 * Obtém o tamanho do dataset a partir da URL (?dataset=500) ou retorna o padrão.
 */
export function obterTamanhoDatasetPadrao(): number {
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    const urlSize = params.get('dataset');
    if (urlSize) {
      const size = parseInt(urlSize, 10);
      if (!isNaN(size) && size > 0) return size;
    }
  }
  return 500;
}

export function filtrarEstudantes(estudantes: Estudante[], filtros: FiltrosAtivos): Estudante[] {
  return estudantes.filter((e) => {
    if (filtros.curso && e.curso !== filtros.curso) return false;
    if (filtros.regiao && e.regiao !== filtros.regiao) return false;
    if (filtros.modalidade && e.modalidade !== filtros.modalidade) return false;
    if (filtros.periodo) {
      const semestreMin = parseInt(filtros.periodo.split('-')[0] || '1');
      const semestreMax = parseInt(filtros.periodo.split('-')[1] || '12');
      if (e.semestre < semestreMin || e.semestre > semestreMax) return false;
    }
    return true;
  });
}

export function calcularMetricas(estudantes: Estudante[]): MetricasDashboard {
  const total = estudantes.length;
  if (total === 0) {
    return {
      taxaEvasao: 0,
      taxaOcupacao: 0,
      taxaConclusao: 0,
      quantidadeEstudantes: 0,
      estudantesAltoRisco: 0,
    };
  }

  const altoRisco = estudantes.filter((e) => e.riscoEvasao >= 70).length;
  const taxaEvasao = (altoRisco / total) * 100;
  const taxaOcupacao = estudantes.reduce((acc, e) => acc + e.frequencia, 0) / total;
  const taxaConclusao = estudantes.reduce((acc, e) => {
    const totalDisc = e.disciplinasConcluidas + e.disciplinasPendentes;
    return acc + (totalDisc > 0 ? (e.disciplinasConcluidas / totalDisc) * 100 : 0);
  }, 0) / total;

  return {
    taxaEvasao,
    taxaOcupacao,
    taxaConclusao,
    quantidadeEstudantes: total,
    estudantesAltoRisco: altoRisco,
  };
}

export function obterDadosGraficoEvasaoPorModalidade(estudantes: Estudante[]): DadosGrafico[] {
  const agrupado = new Map<string, { total: number; altoRisco: number }>();

  estudantes.forEach((e) => {
    const atual = agrupado.get(e.modalidade) || { total: 0, altoRisco: 0 };
    atual.total++;
    if (e.riscoEvasao >= 70) atual.altoRisco++;
    agrupado.set(e.modalidade, atual);
  });

  return Array.from(agrupado.entries()).map(([nome, dados]) => ({
    nome,
    valor: dados.total > 0 ? (dados.altoRisco / dados.total) * 100 : 0,
    valor2: dados.total,
  }));
}

export function obterDadosGraficoEvasaoPorCurso(estudantes: Estudante[]): DadosGrafico[] {
  const agrupado = new Map<string, { total: number; riscoMedio: number }>();

  estudantes.forEach((e) => {
    const atual = agrupado.get(e.curso) || { total: 0, riscoMedio: 0 };
    atual.total++;
    atual.riscoMedio += e.riscoEvasao;
    agrupado.set(e.curso, atual);
  });

  return Array.from(agrupado.entries())
    .map(([nome, dados]) => ({
      nome,
      valor: dados.total > 0 ? dados.riscoMedio / dados.total : 0,
      valor2: dados.total,
    }))
    .sort((a, b) => b.valor - a.valor)
    .slice(0, 10);
}

export function obterDadosGraficoDistribuicaoRisco(estudantes: Estudante[]): DadosGrafico[] {
  const faixas = [
    { nome: 'Baixo (0-39%)', min: 0, max: 39, count: 0 },
    { nome: 'Moderado (40-69%)', min: 40, max: 69, count: 0 },
    { nome: 'Alto (70-100%)', min: 70, max: 100, count: 0 },
  ];

  estudantes.forEach((e) => {
    const faixa = faixas.find((f) => e.riscoEvasao >= f.min && e.riscoEvasao <= f.max);
    if (faixa) faixa.count++;
  });

  return faixas.map((f) => ({ nome: f.nome, valor: f.count }));
}

export function obterDadosGraficoEstudantesPorRegiao(estudantes: Estudante[]): DadosGrafico[] {
  const agrupado = new Map<string, number>();
  estudantes.forEach((e) => {
    agrupado.set(e.regiao, (agrupado.get(e.regiao) || 0) + 1);
  });
  return Array.from(agrupado.entries()).map(([nome, valor]) => ({ nome, valor }));
}

export function obterDadosGraficoEstudantesEmRisco(estudantes: Estudante[]): DadosGrafico[] {
  const agrupado = new Map<string, { emRisco: number; total: number }>();

  estudantes.forEach((e) => {
    const curso = e.curso;
    const atual = agrupado.get(curso) || { emRisco: 0, total: 0 };
    atual.total++;
    if (e.riscoEvasao >= 70) atual.emRisco++;
    agrupado.set(curso, atual);
  });

  return Array.from(agrupado.entries())
    .map(([nome, dados]) => ({
      nome,
      valor: dados.emRisco,
      valor2: dados.total,
    }))
    .sort((a, b) => b.valor - a.valor)
    .slice(0, 8);
}

export function obterOpcoesFiltro(estudantes: Estudante[]): {
  cursos: string[];
  regioes: string[];
  modalidades: string[];
  periodos: string[];
} {
  const cursos = [...new Set(estudantes.map((e) => e.curso))].sort();
  const regioes = [...new Set(estudantes.map((e) => e.regiao))].sort();
  const modalidades = [...new Set(estudantes.map((e) => e.modalidade))].sort();
  const periodos = ['1-4', '5-8', '9-12'];

  return { cursos, regioes, modalidades, periodos };
}
