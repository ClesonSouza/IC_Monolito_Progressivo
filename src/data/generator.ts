/**
 * Gerador determinístico de dados sintéticos de estudantes.
 * Utiliza uma semente (seed) para garantir reprodutibilidade dos experimentos.
 */

import type { Estudante, FatorRisco, DatasetConfig } from '@/types';

// Gerador de números pseudoaleatórios com semente (Linear Congruential Generator)
class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  next(): number {
    this.seed = (this.seed * 16807 + 0) % 2147483647;
    return (this.seed - 1) / 2147483646;
  }

  range(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  pick<T>(array: T[]): T {
    return array[this.range(0, array.length - 1)];
  }
}

const CURSOS = [
  'Engenharia Civil',
  'Medicina',
  'Direito',
  'Administração',
  'Ciência da Computação',
  'Psicologia',
  'Enfermagem',
  'Pedagogia',
  'Contabilidade',
  'Arquitetura',
  'Fisioterapia',
  'Farmácia',
];

const REGIOES = [
  'Norte',
  'Nordeste',
  'Centro-Oeste',
  'Sudeste',
  'Sul',
];

const MODALIDADES = ['Presencial', 'EAD'];

const NOMES = [
  'Ana', 'Bruno', 'Carlos', 'Daniela', 'Eduardo', 'Fernanda', 'Gabriel', 'Helena',
  'Igor', 'Juliana', 'Kleber', 'Larissa', 'Marcos', 'Natália', 'Otávio', 'Patrícia',
  'Quintino', 'Rafaela', 'Sérgio', 'Tatiane', 'Ubirajara', 'Vanessa', 'Wagner', 'Ximena',
  'Yago', 'Zuleica', 'Adriana', 'Bernardo', 'Cecília', 'Diego', 'Eliane', 'Fabiano',
  'Gisele', 'Henrique', 'Ingrid', 'João', 'Karen', 'Leonardo', 'Mariana', 'Nicolas',
  'Olívia', 'Paulo', 'Quésia', 'Rodrigo', 'Sabrina', 'Thiago', 'Ursula', 'Vinícius',
  'Wanessa', 'Yuri', 'Zilda'
];

const SOBRENOMES = [
  'Silva', 'Santos', 'Oliveira', 'Souza', 'Pereira', 'Costa', 'Carvalho', 'Almeida',
  'Ferreira', 'Rodrigues', 'Martins', 'Lima', 'Araújo', 'Fernandes', 'Barbosa', 'Ribeiro',
  'Gonçalves', 'Monteiro', 'Cardoso', 'Teixeira', 'Mendes', 'Nascimento', 'Dias', 'Moreira',
  'Andrade', 'Marques', 'Freitas', 'Machado', 'Pinto', 'Castro', 'Campos', 'Guerra',
  'Ramos', 'Rocha', 'Neves', 'Coelho', 'Cruz', 'Reis', 'Sales', 'Brito',
  'Vieira', 'Moraes', 'Gomes', 'Borges', 'Melo', 'Siqueira', 'Pinheiro', 'Farias',
  'Medeiros', 'Peixoto'
];

const FATORES_RISCO_POSITIVOS = [
  { nome: 'Frequência baixa', descricao: 'Frequência abaixo de 60%' },
  { nome: 'Disciplinas pendentes', descricao: 'Muitas disciplinas não concluídas' },
  { nome: 'Baixo desempenho', descricao: 'Média geral abaixo da expectativa' },
  { nome: 'Atraso no curso', descricao: 'Tempo de curso superior ao previsto' },
  { nome: 'Falta de participação', descricao: 'Pouca interação em atividades' },
  { nome: 'Dificuldades financeiras', descricao: 'Indicadores de restrição econômica' },
];

const FATORES_RISCO_NEGATIVOS = [
  { nome: 'Alta participação', descricao: 'Participação ativa em atividades' },
  { nome: 'Disciplinas concluídas', descricao: 'Bom progresso no curso' },
  { nome: 'Bom desempenho', descricao: 'Média geral acima da média' },
  { nome: 'Frequência alta', descricao: 'Frequência acima de 85%' },
  { nome: 'Engajamento', descricao: 'Alta interação com colegas e professores' },
];

function gerarFatoresRisco(random: SeededRandom, riscoBase: number): FatorRisco[] {
  const fatores: FatorRisco[] = [];
  const qtdPositivos = random.range(1, 4);
  const qtdNegativos = random.range(0, 3);

  // Fatores que aumentam o risco
  const positivosDisponiveis = [...FATORES_RISCO_POSITIVOS];
  for (let i = 0; i < qtdPositivos && positivosDisponiveis.length > 0; i++) {
    const idx = random.range(0, positivosDisponiveis.length - 1);
    const fator = positivosDisponiveis.splice(idx, 1)[0];
    fatores.push({
      ...fator,
      impacto: random.range(5, 25),
    });
  }

  // Fatores que reduzem o risco
  const negativosDisponiveis = [...FATORES_RISCO_NEGATIVOS];
  for (let i = 0; i < qtdNegativos && negativosDisponiveis.length > 0; i++) {
    const idx = random.range(0, negativosDisponiveis.length - 1);
    const fator = negativosDisponiveis.splice(idx, 1)[0];
    fatores.push({
      ...fator,
      impacto: -random.range(3, 15),
    });
  }

  return fatores;
}

export function gerarDataset(config: DatasetConfig): Estudante[] {
  const random = new SeededRandom(config.seed);
  const estudantes: Estudante[] = [];

  for (let i = 0; i < config.size; i++) {
    const nome = `${random.pick(NOMES)} ${random.pick(SOBRENOMES)}`;
    const curso = random.pick(CURSOS);
    const regiao = random.pick(REGIOES);
    const modalidade = random.pick(MODALIDADES);
    const semestre = random.range(1, 12);
    const idade = random.range(17, 45);
    const frequencia = random.range(30, 100);
    const disciplinasConcluidas = random.range(0, 40);
    const disciplinasPendentes = random.range(0, 20);

    // Risco baseado em fatores correlacionados
    let riscoBase = 0;
    if (frequencia < 60) riscoBase += 25;
    else if (frequencia < 75) riscoBase += 15;
    if (disciplinasPendentes > 8) riscoBase += 20;
    else if (disciplinasPendentes > 4) riscoBase += 10;
    if (semestre > 8 && disciplinasConcluidas < 20) riscoBase += 15;
    if (modalidade === 'EAD' && frequencia < 70) riscoBase += 10;

    // Variação aleatória
    riscoBase += random.range(-15, 15);
    riscoBase = Math.max(5, Math.min(98, riscoBase));

    const fatoresRisco = gerarFatoresRisco(random, riscoBase);

    estudantes.push({
      id: `EST-${String(i + 1).padStart(6, '0')}`,
      nome,
      curso,
      regiao,
      modalidade,
      semestre,
      idade,
      frequencia,
      disciplinasConcluidas,
      disciplinasPendentes,
      riscoEvasao: riscoBase,
      fatoresRisco,
    });
  }

  return estudantes;
}

// Datasets pré-configurados para experimentos.
//
// Todos os tamanhos efetivamente usados pelo benchmark (ver DATASET_SIZES em
// tests/performance/benchmark.ts) estão listados aqui explicitamente, com a
// mesma seed fixa (12345). Antes, 5000 e 10000 não apareciam neste mapa e
// caíam num fallback (`DATASETS[size] || { size, seed: 12345 }`) definido em
// generator.worker.ts, que produzia o mesmo resultado, mas de forma
// implícita e não documentada. Deixar todos os tamanhos explícitos aqui evita
// depender desse fallback para descrever quais configurações foram
// realmente testadas.
export const DATASETS: Record<number, DatasetConfig> = {
  50: { size: 50, seed: 12345 },
  100: { size: 100, seed: 12345 },
  250: { size: 250, seed: 12345 },
  500: { size: 500, seed: 12345 },
  1000: { size: 1000, seed: 12345 },
  2000: { size: 2000, seed: 12345 },
  5000: { size: 5000, seed: 12345 },
  6000: { size: 6000, seed: 12345 },
  7000: { size: 7000, seed: 12345 },
  8000: { size: 8000, seed: 12345 },
  10000: { size: 10000, seed: 12345 },
};
