import puppeteer from 'puppeteer';

// ============================================================
// TIPOS
// ============================================================

export interface MetricasCarregamento {
  tempoCarregamento: number;
  tempoAteInterativo: number;
  tbt: number;
  longTasksCount: number;
  longTasksTotalDuration: number;
  longTasksAverageDuration: number;
  longTasksMaxDuration: number;
  domInicial: number;
  /**
   * Duração individual de cada Long Task detectada no carregamento (ms),
   * na ordem em que ocorreram. Antes, o observer capturava esses valores
   * mas eles eram descartados: só contagem, soma e máximo chegavam ao
   * relatório final. Expor a lista completa permite montar um histograma
   * ou identificar outliers em vez de depender só do resumo agregado.
   */
  longTasksDuracoes: number[];
  /** Measure 'tempo-ate-renderizacao-completa' (ver marcarRenderPesadoFim) */
  tempoAteRenderizacaoCompleta: number | null;
  /** Measure 'geracao-dados' (ida e volta até a thread principal receber o worker) */
  geracaoDadosMs: number | null;
  /** Measure 'serializacao-worker' (até o React commitar os dados do worker na tela) */
  serializacaoWorkerMs: number | null;
}

export interface MetricasRecursos {
  heapUsed: number | null;
  heapTotal: number | null;
  memoryMetricAvailable: boolean;
  domAposCarregamento: number;
  requisicoesTotal: number;
  requisicoesJS: number;
  requisicoesCSS: number;
  requisicoesImagem: number;
  requisicoesFonte: number;
  requisicoesAPI: number;
  requisicoesOutros: number;
  totalBytes: number | null;
  javascriptBytes: number | null;
  cssBytes: number | null;
  imageBytes: number | null;
  otherBytes: number | null;
}

export interface MetricasInteracao {
  tempoExplicacao: number;
  domAntes: number;
  domDepois: number;
  elementosAdicionados: number;
  /**
   * Measure 'reconciliacao-lista' (ver marcarInicioLista/marcarFimLista).
   * Em A, cobre praticamente a mesma janela que 'tempo-explicacao' (já que
   * a troca de painel é só CSS); em B, tende a ser bem menor, porque fecha
   * assim que a StudentList e o fallback do Suspense são commitados — antes
   * do chunk lazy do ExplanationPanel terminar de carregar.
   */
  reconciliacaoListaMs: number | null;
  /**
   * Número de novas entradas na Resource Timing API cujo startTime é
   * posterior à marca 'explicacao-inicio', ou seja, requisições disparadas
   * durante a própria interação medida (clique até explicação pronta), não
   * durante o carregamento inicial da página.
   *
   * Antes, o código nunca verificava isso: a afirmação de que "nenhuma
   * requisição de rede ocorre no clique" não era um dado medido, era uma
   * suposição. Este campo mede isso diretamente.
   */
  requisicoesDuranteInteracao: number;
}

export interface MetricasExecucao {
  runType: 'warmup' | 'valid';
  runNumber: number;
  carregamento: MetricasCarregamento;
  recursos: MetricasRecursos;
  interacao: MetricasInteracao;
}

export interface ConfiguracaoTeste {
  architecture: 'monolithic' | 'progressive';
  datasetSize: number;
  url: string;
}

// ============================================================
// SETUP: Injetar observer de Long Tasks antes do carregamento
// ============================================================

const LONGTASK_OBSERVER_SCRIPT = `
  (function() {
    window.__LONG_TASKS__ = [];

    if (typeof PerformanceObserver !== 'undefined') {
      try {
        var observer = new PerformanceObserver(function(list) {
          var entries = list.getEntries();

          for (var i = 0; i < entries.length; i++) {
            var entry = entries[i];

            window.__LONG_TASKS__.push({
              duration: entry.duration,
              startTime: entry.startTime
            });
          }
        });

        observer.observe({
          entryTypes: ['longtask']
        });
      } catch (e) {
        // Long Tasks não suportados neste navegador
      }
    }
  })();
`;

export async function setupLongTaskObserver(
  page: puppeteer.Page
): Promise<void> {
  await page.evaluateOnNewDocument(LONGTASK_OBSERVER_SCRIPT);
}

// ============================================================
// COLETA DE MÉTRICAS DE CARREGAMENTO (GRUPO 1)
// ============================================================

export async function coletarMetricasCarregamento(
  page: puppeteer.Page
): Promise<MetricasCarregamento> {
  return page.evaluate(() => {
    const nav = performance.getEntriesByType(
      'navigation'
    )[0] as PerformanceNavigationTiming | undefined;

    // Ler Long Tasks da variável global injetada pelo observer
    const longTasksData: {
      duration: number;
      startTime: number;
    }[] = (window as any).__LONG_TASKS__ || [];

    // Calcular TBT e estatísticas
    let tbt = 0;
    let totalDuration = 0;
    let maxDuration = 0;

    for (const task of longTasksData) {
      const excesso = task.duration - 50;

      if (excesso > 0) {
        tbt += excesso;
      }

      totalDuration += task.duration;

      if (task.duration > maxDuration) {
        maxDuration = task.duration;
      }
    }

    const count = longTasksData.length;

    const domInicial = document.querySelectorAll('*').length;

    // Leitura genérica de um measure pelo nome, retornando null se ainda
    // não tiver sido registrado (ex.: navegador sem suporte, ou marca que
    // não se aplica a esta arquitetura).
    const lerMeasure = (nome: string): number | null => {
      const measures = performance.getEntriesByType('measure') as PerformanceMeasure[];
      const encontrada = measures.find((m) => m.name === nome);
      return encontrada ? encontrada.duration : null;
    };

    return {
      tempoCarregamento: nav
        ? nav.loadEventEnd - nav.startTime
        : 0,

      tempoAteInterativo: nav
        ? nav.domInteractive - nav.startTime
        : 0,

      tbt,

      longTasksCount: count,

      longTasksTotalDuration: totalDuration,

      longTasksAverageDuration:
        count > 0
          ? totalDuration / count
          : 0,

      longTasksMaxDuration: maxDuration,

      domInicial,

      longTasksDuracoes: longTasksData.map((t) => t.duration),

      tempoAteRenderizacaoCompleta: lerMeasure('tempo-ate-renderizacao-completa'),
      geracaoDadosMs: lerMeasure('geracao-dados'),
      serializacaoWorkerMs: lerMeasure('serializacao-worker'),
    };
  });
}

// ============================================================
// COLETA DE MÉTRICAS DE RECURSOS (GRUPO 2)
// ============================================================

export async function coletarMetricasRecursos(
  page: puppeteer.Page
): Promise<MetricasRecursos> {
  const resourceData = await page.evaluate(() => {
    const entries = performance.getEntriesByType(
      'resource'
    ) as PerformanceResourceTiming[];

    let requisicoesTotal = entries.length;

    let requisicoesJS = 0;
    let requisicoesCSS = 0;
    let requisicoesImagem = 0;
    let requisicoesFonte = 0;
    let requisicoesAPI = 0;
    let requisicoesOutros = 0;

    let totalBytes = 0;
    let javascriptBytes = 0;
    let cssBytes = 0;
    let imageBytes = 0;
    let otherBytes = 0;

    const imgRegex =
      /\.(png|jpg|jpeg|gif|svg|webp|ico)$/i;

    const fontRegex =
      /\.(woff2?|ttf|otf|eot)$/i;

    for (const entry of entries) {
      const url = entry.name;
      // Fallback para encodedBodySize: recursos servidos do cache do
      // navegador reportam transferSize: 0 mesmo quando o arquivo foi
      // realmente necessário. Como o cache já é desabilitado por página
      // (ver core/browser.ts), isso serve como segurança extra para casos
      // em que o cache não possa ser desabilitado (ex.: execução manual).
      const size = entry.transferSize || entry.encodedBodySize || 0;

      totalBytes += size;

      if (
        url.endsWith('.js') ||
        url.includes('.js?')
      ) {
        requisicoesJS++;
        javascriptBytes += size;
      } else if (
        url.endsWith('.css') ||
        url.includes('.css?')
      ) {
        requisicoesCSS++;
        cssBytes += size;
      } else if (imgRegex.test(url)) {
        requisicoesImagem++;
        imageBytes += size;
      } else if (fontRegex.test(url)) {
        requisicoesFonte++;
        otherBytes += size;
      } else if (
        url.includes('/api/') ||
        url.includes('data')
      ) {
        requisicoesAPI++;
        otherBytes += size;
      } else {
        requisicoesOutros++;
        otherBytes += size;
      }
    }

    const memory = (performance as any).memory;

    const memoryAvailable = !!memory;

    const domAposCarregamento =
      document.querySelectorAll('*').length;

    return {
      requisicoesTotal,

      requisicoesJS,

      requisicoesCSS,

      requisicoesImagem,

      requisicoesFonte,

      requisicoesAPI,

      requisicoesOutros,

      totalBytes:
        totalBytes > 0
          ? totalBytes
          : null,

      javascriptBytes:
        javascriptBytes > 0
          ? javascriptBytes
          : null,

      cssBytes:
        cssBytes > 0
          ? cssBytes
          : null,

      imageBytes:
        imageBytes > 0
          ? imageBytes
          : null,

      otherBytes:
        otherBytes > 0
          ? otherBytes
          : null,

      heapUsed:
        memoryAvailable
          ? memory.usedJSHeapSize
          : null,

      heapTotal:
        memoryAvailable
          ? memory.totalJSHeapSize
          : null,

      memoryMetricAvailable:
        memoryAvailable,

      domAposCarregamento,
    };
  });

  return {
    heapUsed: resourceData.heapUsed,

    heapTotal: resourceData.heapTotal,

    memoryMetricAvailable:
      resourceData.memoryMetricAvailable,

    domAposCarregamento:
      resourceData.domAposCarregamento,

    requisicoesTotal:
      resourceData.requisicoesTotal,

    requisicoesJS:
      resourceData.requisicoesJS,

    requisicoesCSS:
      resourceData.requisicoesCSS,

    requisicoesImagem:
      resourceData.requisicoesImagem,

    requisicoesFonte:
      resourceData.requisicoesFonte,

    requisicoesAPI:
      resourceData.requisicoesAPI,

    requisicoesOutros:
      resourceData.requisicoesOutros,

    totalBytes:
      resourceData.totalBytes,

    javascriptBytes:
      resourceData.javascriptBytes,

    cssBytes:
      resourceData.cssBytes,

    imageBytes:
      resourceData.imageBytes,

    otherBytes:
      resourceData.otherBytes,
  };
}

// ============================================================
// COLETA DE MÉTRICAS DE INTERAÇÃO (GRUPO 3)
// ============================================================

export async function coletarMetricasInteracao(
  page: puppeteer.Page
): Promise<MetricasInteracao> {
  // Contar DOM antes do clique
  const domAntes = await page.evaluate(
    () => document.querySelectorAll('*').length
  );

  // Limpar marcas anteriores e resetar sinal
  await page.evaluate(() => {
    performance.clearMarks();
    performance.clearMeasures();

    (window as any).__EXPLICACAO_PRONTA__ = false;
  });

  // Clicar no primeiro estudante
  await page.click(
    '[data-testid="student-card"]'
  );

  // Aguardar o painel de explicação VISÍVEL aparecer no DOM.
  // No Cenário A, todos os painéis já existem desde o carregamento
  // (pré-renderizados e ocultos via CSS) — sem o filtro [data-visible="true"],
  // este seletor casaria com um painel oculto antes mesmo do clique.
  await page.waitForSelector(
    '[data-testid="explanation-panel"][data-visible="true"]',
    {
      timeout: 15000,
    }
  );

  // Aguardar o sinal de explicação pronta
  await page.waitForFunction(
    () =>
      !!(window as any)
        .__EXPLICACAO_PRONTA__,
    {
      timeout: 15000,
      polling: 50,
    }
  );

  // Pequena pausa para garantir que todas
  // as medições foram registradas
  await new Promise((resolve) =>
    setTimeout(resolve, 100)
  );

  // Coletar tempo de explicação, reconciliação da lista e requisições
  // disparadas durante a própria interação (depois do clique)
  const { tempoExplicacao, reconciliacaoListaMs, requisicoesDuranteInteracao } =
    await page.evaluate(() => {
      const measures =
        performance.getEntriesByType(
          'measure'
        ) as PerformanceMeasure[];

      const marks =
        performance.getEntriesByType(
          'mark'
        ) as PerformanceMark[];

      const lerMeasure = (nome: string): number | null => {
        const encontrada = measures.find((m) => m.name === nome);
        return encontrada ? encontrada.duration : null;
      };

      let tempoExplicacao = lerMeasure('tempo-explicacao');

      const inicio =
        marks.find(
          (m) =>
            m.name ===
            'explicacao-inicio'
        );

      if (tempoExplicacao === null) {
        // Fallback: calcular via marks
        const fim =
          marks.find(
            (m) =>
              m.name ===
              'explicacao-fim'
          );

        tempoExplicacao =
          inicio && fim
            ? fim.startTime - inicio.startTime
            : 0;
      }

      // Requisições de rede cujo início é posterior ao clique. Antes, o
      // código nunca verificava isso, então a afirmação de que "nenhuma
      // requisição ocorre durante a interação" não era medida, era suposta.
      let requisicoesDuranteInteracao = 0;
      if (inicio) {
        const recursos =
          performance.getEntriesByType(
            'resource'
          ) as PerformanceResourceTiming[];

        requisicoesDuranteInteracao = recursos.filter(
          (r) => r.startTime > inicio.startTime
        ).length;
      }

      return {
        tempoExplicacao,
        reconciliacaoListaMs: lerMeasure('reconciliacao-lista'),
        requisicoesDuranteInteracao,
      };
    });

  // Contar DOM depois
  const domDepois = await page.evaluate(
    () => document.querySelectorAll('*').length
  );

  return {
    tempoExplicacao:
      tempoExplicacao || 0,

    domAntes,

    domDepois,

    elementosAdicionados:
      domDepois - domAntes,

    reconciliacaoListaMs,

    requisicoesDuranteInteracao,
  };
}

// ============================================================
// EXECUÇÃO COMPLETA DE UMA RODADA
// ============================================================

export async function executarRodada(
  page: puppeteer.Page,
  config: ConfiguracaoTeste,
  runType: 'warmup' | 'valid',
  runNumber: number
): Promise<MetricasExecucao> {
  const url =
    `${config.url}?dataset=${config.datasetSize}`;

  // Configurar observer de Long Tasks ANTES do carregamento
  await setupLongTaskObserver(page);

  // Navegar para a URL
  await page.goto(url, {
    waitUntil: 'networkidle2',
  });

  // Aguardar o dashboard estar pronto
  // (esse elemento é renderizado pelo Layout independentemente dos dados já
  // terem chegado, então NÃO é suficiente por si só para saber que os dados
  // já foram gerados e renderizados — ver __APP_PRONTA__ abaixo)
  await page.waitForSelector(
    '[data-testid="dashboard"]',
    {
      timeout: 30000,
    }
  );

  // Aguardar o sinal explícito de "app pronta": geração de dados via worker
  // concluída E primeira passagem pesada de renderização já commitada.
  // Substitui a antiga pausa fixa de 500ms, que não era confiável agora que
  // a geração de dados é assíncrona (worker) — em datasets grandes (10.000
  // registros) o processamento pode facilmente ultrapassar 500ms, e uma
  // pausa fixa capturaria métricas de carregamento no meio do trabalho.
  await page.waitForFunction(
    () => !!(window as any).__APP_PRONTA__,
    {
      timeout: 60000,
      polling: 50,
    }
  );

  // Pequena pausa adicional para estabilização e processamento de
  // Long Tasks pendentes que possam ter sido enfileiradas ao redor do
  // sinal de "pronta" (ex.: pintura final do navegador)
  await new Promise((resolve) =>
    setTimeout(resolve, 200)
  );

  // ==========================================================
  // GRUPO 1: CARREGAMENTO
  // ==========================================================

  const carregamento =
    await coletarMetricasCarregamento(
      page
    );

  // ==========================================================
  // GRUPO 2: RECURSOS
  // ==========================================================

  const recursos =
    await coletarMetricasRecursos(
      page
    );

  // ==========================================================
  // GRUPO 3: INTERAÇÃO
  // ==========================================================

  const interacao =
    await coletarMetricasInteracao(
      page
    );

  // ==========================================================
  // RESULTADO
  // ==========================================================

  return {
    runType,
    runNumber,
    carregamento,
    recursos,
    interacao,
  };
}
