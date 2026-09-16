/**
 * Hook que carrega os estudantes via Web Worker, em vez de gerar os dados
 * diretamente na thread principal (ver `generator.worker.ts`).
 *
 * Usado igualmente pelos Cenários A e B — o worker é uma variável ortogonal
 * à comparação monolítico/progressivo, então precisa afetar os dois lados
 * da mesma forma para não reintroduzir uma variável de confusão.
 *
 * Mede duas coisas separadamente, como discutido:
 *  - "geracao-dados": tempo total de ida e volta até a thread principal
 *    receber a mensagem do worker (inclui geração real + overhead de
 *    postMessage/clone estruturado).
 *  - "serializacao-worker": tempo entre a mensagem ser recebida e o React
 *    efetivamente commitar esse estado na tela (custo de "transferência"
 *    do dado do worker para a UI, isolado do tempo de geração).
 *
 * O worker também reporta `duracaoGeracaoMs`, o tempo de geração pura
 * medido dentro dele mesmo (sem overhead de mensagem) — exposto aqui para
 * quem quiser reportar os três números separadamente.
 */

import { useEffect, useRef, useState } from 'react';
import type { Estudante } from '@/types';
import type { MensagemSaida } from '@/data/generator.worker';
import {
  marcarInicioWorker,
  marcarFimWorker,
  marcarInicioSerializacao,
  marcarFimSerializacao,
} from '@/utils/performance';

interface ResultadoEstudantesWorker {
  estudantes: Estudante[];
  carregando: boolean;
  duracaoGeracaoMs: number | null;
}

export function useEstudantesWorker(datasetSize: number): ResultadoEstudantesWorker {
  const [estudantes, setEstudantes] = useState<Estudante[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [duracaoGeracaoMs, setDuracaoGeracaoMs] = useState<number | null>(null);
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    setCarregando(true);
    marcarInicioWorker();

    const worker = new Worker(
      new URL('../data/generator.worker.ts', import.meta.url),
      { type: 'module' }
    );
    workerRef.current = worker;

    worker.onmessage = (event: MessageEvent<MensagemSaida>) => {
      marcarFimWorker();

      const { estudantes: dados, duracaoGeracaoMs: duracaoWorker } = event.data;

      marcarInicioSerializacao();
      setDuracaoGeracaoMs(duracaoWorker);
      setEstudantes(dados);

      // Aguarda o commit do React antes de fechar a marca, para que
      // "serializacao-worker" reflita o custo até o dado aparecer na tela,
      // não apenas até o setState ser chamado.
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          marcarFimSerializacao();
          setCarregando(false);
        });
      });
    };

    worker.postMessage({ datasetSize });

    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, [datasetSize]);

  return { estudantes, carregando, duracaoGeracaoMs };
}
