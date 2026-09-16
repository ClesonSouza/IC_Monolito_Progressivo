/**
 * WORKER — Geração de dados fora da thread principal.
 * ====================================================
 * Move o custo de `gerarDataset` (potencialmente pesado para datasets grandes)
 * para uma thread separada, evitando que ele contamine as métricas de
 * TBT/Long Tasks medidas na thread principal.
 *
 *
 * Nota de tipagem: como o projeto usa `lib: ["ES2020", "DOM", "DOM.Iterable"]`
 * (sem "webworker", que conflitaria com os tipos de DOM usados pelo resto da
 * aplicação), tipamos `self` como `Worker` via cast — um padrão comum para
 * arquivos de worker dentro de projetos Vite/React que não isolam um
 * tsconfig próprio para workers.
 */

import { gerarDataset, DATASETS } from './generator';
import type { Estudante, DatasetConfig } from '@/types';

interface MensagemEntrada {
  datasetSize: number;
}

export interface MensagemSaida {
  estudantes: Estudante[];
  duracaoGeracaoMs: number;
}

const ctx: Worker = self as unknown as Worker;

ctx.onmessage = (event: MessageEvent<MensagemEntrada>) => {
  const { datasetSize } = event.data;

  const config: DatasetConfig = DATASETS[datasetSize] || { size: datasetSize, seed: 12345 };

  const inicio = performance.now();
  const estudantes = gerarDataset(config);
  const duracaoGeracaoMs = performance.now() - inicio;

  const resposta: MensagemSaida = { estudantes, duracaoGeracaoMs };
  ctx.postMessage(resposta);
};
