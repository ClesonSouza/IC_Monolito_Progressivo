/**
 * Instrumentação de performance para medição de métricas experimentais.
 * Utiliza a API Performance do navegador para marcar eventos.
 */

export function marcarInicio(nome: string): void {
  if (typeof performance !== 'undefined' && performance.mark) {
    performance.mark(`${nome}-inicio`);
  }
}

export function marcarFim(nome: string): void {
  if (typeof performance !== 'undefined' && performance.mark) {
    performance.mark(`${nome}-fim`);
  }
}

export function medirIntervalo(nome: string): PerformanceMeasure | null {
  if (typeof performance !== 'undefined' && performance.measure) {
    try {
      return performance.measure(nome, `${nome}-inicio`, `${nome}-fim`);
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Grava a configuração atual (arquitetura e tamanho do dataset) em
 * `window.__EXPERIMENT_CONFIG__`.
 *
 * O harness de teste (Puppeteer) não lê essa variável em nenhum momento,
 * já que ele já sabe qual arquitetura e tamanho está testando através do
 * próprio `config` do benchmark, não precisa perguntar pra página. Essa
 * função existe só como ajuda manual: abrindo o DevTools do navegador e
 * digitando `window.__EXPERIMENT_CONFIG__` no console, dá pra conferir na
 * hora qual cenário e tamanho de dataset estão carregados, útil pra debugar
 * a aplicação fora da automação dos testes.
 */
export function registrarCenario(config: { architecture: string; datasetSize: number; testRun?: number }): void {
  if (typeof window !== 'undefined') {
    (window as any).__EXPERIMENT_CONFIG__ = config;
  }
}

/**
 * Registra um callback para ser chamado quando a explicação estiver renderizada.
 * Usado pelo Puppeteer para detectar o fim da renderização de forma confiável.
 */
export function sinalizarExplicacaoPronta(): void {
  if (typeof window !== 'undefined') {
    (window as any).__EXPLICACAO_PRONTA__ = true;
    // Disparar evento customizado para observers
    window.dispatchEvent(new CustomEvent('explicacao-pronta', { detail: { timestamp: performance.now() } }));
  }
}

/**
 * Sinal de "aplicação pronta": geração de dados (via worker) concluída e
 * primeira passagem pesada de renderização já commitada.
 *
 * Necessário porque, com a geração de dados agora acontecendo de forma
 * assíncrona no worker, o dashboard deixa de estar totalmente pronto logo
 * após `[data-testid="dashboard"]` existir no DOM esse elemento é
 * renderizado pelo Layout independentemente dos dados já terem chegado.
 * Sem esse sinal, a pausa fixa de estabilização usada nos testes de
 * performance poderia capturar métricas de carregamento no meio do
 * processamento, especialmente em datasets grandes.
 */
export function sinalizarAppPronta(): void {
  if (typeof window !== 'undefined') {
    (window as any).__APP_PRONTA__ = true;
  }
}

/**
 * Marca o início/fim da reconciliação da StudentList, isolada da explicação.
 * Como a lista é idêntica em A e B, serve como controle: se o tempo de
 * reconciliação for parecido nos dois cenários, reforça que a diferença
 * observada não vem dela.
 */
export function marcarInicioLista(): void {
  marcarInicio('reconciliacao-lista');
}

export function marcarFimLista(): PerformanceMeasure | null {
  marcarFim('reconciliacao-lista');
  return medirIntervalo('reconciliacao-lista');
}

/**
 * Marca o fim do trabalho pesado de renderização do React (após os dados
 * filtrados e os gráficos serem recalculados), medindo a partir do início
 * da navegação (time origin), não de uma marca customizada.
 *
 * Serve de ponte entre o "tempo de carregamento" do navegador (loadEventEnd)
 * e o TBT/Long Tasks: mostra quanto tempo depois do load event o trabalho de
 * JS pesado (renderizar o dataset inteiro) efetivamente termina.
 */
export function marcarRenderPesadoFim(): void {
  if (typeof performance !== 'undefined' && performance.mark) {
    performance.mark('render-pesado-fim');
    if (performance.measure) {
      try {
        // Sem marca de início: por padrão, o measure conta a partir do
        // time origin (início da navegação).
        performance.measure('tempo-ate-renderizacao-completa', undefined, 'render-pesado-fim');
      } catch {
        // Ignorado ausência de suporte não deve quebrar a aplicação.
      }
    }
  }
}

/**
 * Marca o tempo total de ida e volta até a thread principal receber os
 * dados gerados pelo Web Worker (inclui geração real + overhead de
 * postMessage/clone estruturado).
 */
export function marcarInicioWorker(): void {
  marcarInicio('geracao-dados');
}

export function marcarFimWorker(): PerformanceMeasure | null {
  marcarFim('geracao-dados');
  return medirIntervalo('geracao-dados');
}

/**
 * Marca o tempo entre a thread principal receber os dados do worker e o
 * React efetivamente commitar esse estado na tela isola o custo de
 * "transferência para a UI" do custo de geração em si.
 */
export function marcarInicioSerializacao(): void {
  marcarInicio('serializacao-worker');
}

export function marcarFimSerializacao(): PerformanceMeasure | null {
  marcarFim('serializacao-worker');
  return medirIntervalo('serializacao-worker');
}
