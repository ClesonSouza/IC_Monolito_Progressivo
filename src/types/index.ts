export interface FatorRisco {
  nome: string;
  impacto: number; // valor positivo = aumenta risco, negativo = reduz risco
  descricao: string;
}

export interface Estudante {
  id: string;
  nome: string;
  curso: string;
  regiao: string;
  modalidade: string;
  semestre: number;
  idade: number;
  frequencia: number; // 0-100
  disciplinasConcluidas: number;
  disciplinasPendentes: number;
  riscoEvasao: number; // 0-100
  fatoresRisco: FatorRisco[];
}

export interface DatasetConfig {
  size: number;
  seed: number;
}

export interface MetricasDashboard {
  taxaEvasao: number;
  taxaOcupacao: number;
  taxaConclusao: number;
  quantidadeEstudantes: number;
  estudantesAltoRisco: number;
}

export interface DadosGrafico {
  nome: string;
  valor: number;
  valor2?: number;
}

export interface FiltrosAtivos {
  periodo: string;
  curso: string;
  regiao: string;
  modalidade: string;
}

export interface CenarioConfig {
  architecture: 'monolithic' | 'progressive';
  datasetSize: number;
  testRun?: number;
}
