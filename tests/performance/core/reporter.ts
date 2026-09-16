import * as fs from 'fs';
import * as path from 'path';
import type { MetricasExecucao, ConfiguracaoTeste } from './metrics';

// ============================================================
// ESTRUTURAS DE RELATÓRIO
// ============================================================

export interface ResultadoConfiguracao {
  configuracao: ConfiguracaoTeste;
  warmup: MetricasExecucao[];
  valid: MetricasExecucao[];
  estatisticas: EstatisticasConfiguracao;
}

export interface EstatisticasConfiguracao {
  // Grupo 1 - Carregamento
  tempoCarregamentoMedia: number;
  tempoCarregamentoDesvio: number;
  tbtMedia: number;
  tbtDesvio: number;
  longTasksCountMedia: number;
  longTasksTotalDurationMedia: number;
  longTasksMaxDurationMedia: number;
  domInicialMedia: number;
  /** Ponte entre loadEventEnd e o fim do trabalho pesado de render (ver Problema 17) */
  tempoAteRenderizacaoCompletaMedia: number | null;
  /** Geração de dados via Web Worker: ida e volta até a thread principal receber */
  geracaoDadosMsMedia: number | null;
  /** Até o React commitar na tela os dados recebidos do worker */
  serializacaoWorkerMsMedia: number | null;

  // Grupo 2 - Recursos
  heapUsedMedia: number | null;
  heapTotalMedia: number | null;
  memoryMetricAvailable: boolean;
  domAposCarregamentoMedia: number;
  requisicoesTotalMedia: number;
  requisicoesJSMedia: number;
  requisicoesCSSMedia: number;
  requisicoesImagemMedia: number;
  totalBytesMedia: number | null;
  javascriptBytesMedia: number | null;
  cssBytesMedia: number | null;
  imageBytesMedia: number | null;

  // Grupo 3 - Interação
  tempoExplicacaoMedia: number;
  tempoExplicacaoDesvio: number;
  domAntesMedia: number;
  domDepoisMedia: number;
  elementosAdicionadosMedia: number;
  elementosAdicionadosDesvio: number;
  /** Reconciliação da StudentList isolada, ver marcarInicioLista/marcarFimLista (Problema 6) */
  reconciliacaoListaMsMedia: number | null;
}

export interface RelatorioBenchmark {
  metadata: {
    geradoEm: string;
    versao: string;
    descricao: string;
  };
  resultados: ResultadoConfiguracao[];
}

// ============================================================
// FUNÇÕES ESTATÍSTICAS
// ============================================================

function media(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function desvioPadrao(values: number[]): number {
  if (values.length < 2) return 0;
  const m = media(values);
  const variance = values.reduce((acc, v) => acc + Math.pow(v - m, 2), 0) / (values.length - 1);
  return Math.sqrt(variance);
}

function mediaNullable(values: (number | null)[]): number | null {
  const valid = values.filter((v): v is number => v !== null);
  if (valid.length === 0) return null;
  return media(valid);
}

function calcularEstatisticas(execucoes: MetricasExecucao[]): EstatisticasConfiguracao {
  const c = execucoes.map((e) => e.carregamento);
  const r = execucoes.map((e) => e.recursos);
  const i = execucoes.map((e) => e.interacao);

  return {
    tempoCarregamentoMedia: media(c.map((x) => x.tempoCarregamento)),
    tempoCarregamentoDesvio: desvioPadrao(c.map((x) => x.tempoCarregamento)),
    tbtMedia: media(c.map((x) => x.tbt)),
    tbtDesvio: desvioPadrao(c.map((x) => x.tbt)),
    longTasksCountMedia: media(c.map((x) => x.longTasksCount)),
    longTasksTotalDurationMedia: media(c.map((x) => x.longTasksTotalDuration)),
    longTasksMaxDurationMedia: media(c.map((x) => x.longTasksMaxDuration)),
    domInicialMedia: media(c.map((x) => x.domInicial)),
    tempoAteRenderizacaoCompletaMedia: mediaNullable(c.map((x) => x.tempoAteRenderizacaoCompleta)),
    geracaoDadosMsMedia: mediaNullable(c.map((x) => x.geracaoDadosMs)),
    serializacaoWorkerMsMedia: mediaNullable(c.map((x) => x.serializacaoWorkerMs)),

    heapUsedMedia: mediaNullable(r.map((x) => x.heapUsed)),
    heapTotalMedia: mediaNullable(r.map((x) => x.heapTotal)),
    memoryMetricAvailable: r.some((x) => x.memoryMetricAvailable),
    domAposCarregamentoMedia: media(r.map((x) => x.domAposCarregamento)),
    requisicoesTotalMedia: media(r.map((x) => x.requisicoesTotal)),
    requisicoesJSMedia: media(r.map((x) => x.requisicoesJS)),
    requisicoesCSSMedia: media(r.map((x) => x.requisicoesCSS)),
    requisicoesImagemMedia: media(r.map((x) => x.requisicoesImagem)),
    totalBytesMedia: mediaNullable(r.map((x) => x.totalBytes)),
    javascriptBytesMedia: mediaNullable(r.map((x) => x.javascriptBytes)),
    cssBytesMedia: mediaNullable(r.map((x) => x.cssBytes)),
    imageBytesMedia: mediaNullable(r.map((x) => x.imageBytes)),

    tempoExplicacaoMedia: media(i.map((x) => x.tempoExplicacao)),
    tempoExplicacaoDesvio: desvioPadrao(i.map((x) => x.tempoExplicacao)),
    domAntesMedia: media(i.map((x) => x.domAntes)),
    domDepoisMedia: media(i.map((x) => x.domDepois)),
    elementosAdicionadosMedia: media(i.map((x) => x.elementosAdicionados)),
    elementosAdicionadosDesvio: desvioPadrao(i.map((x) => x.elementosAdicionados)),
    reconciliacaoListaMsMedia: mediaNullable(i.map((x) => x.reconciliacaoListaMs)),
  };
}

// ============================================================
// GERADOR DE JSON
// ============================================================

export function gerarJSON(
  resultados: ResultadoConfiguracao[],
  caminho: string
): void {
  const relatorio: RelatorioBenchmark = {
    metadata: {
      geradoEm: new Date().toISOString(),
      versao: '1.0.0',
      descricao:
        'Benchmark comparativo entre arquitetura monolítica e progressiva. ' +
        '5 execuções de aquecimento + 20 execuções válidas por configuração.',
    },
    resultados,
  };

  fs.writeFileSync(caminho, JSON.stringify(relatorio, null, 2));
  console.log(`  📄 JSON salvo: ${caminho}`);
}

// ============================================================
// GERADOR DE CSV
// ============================================================

function formatNumber(n: number | null): string {
  if (n === null) return 'N/A';
  return n.toFixed(2);
}

function formatInt(n: number | null): string {
  if (n === null) return 'N/A';
  return Math.round(n).toString();
}

export function gerarCSV(
  resultadosMono: ResultadoConfiguracao[],
  resultadosProg: ResultadoConfiguracao[],
  caminho: string
): void {
  const linhas: string[] = [];

  // Cabeçalho
  linhas.push(
    [
      'datasetSize',
      'architecture',
      'runType',
      'runNumber',
      // Grupo 1 - Carregamento
      'tempoCarregamento_ms',
      'tempoAteInterativo_ms',
      'tbt_ms',
      'longTasksCount',
      'longTasksTotalDuration_ms',
      'longTasksAverageDuration_ms',
      'longTasksMaxDuration_ms',
      'domInicial',
      'tempoAteRenderizacaoCompleta_ms',
      'geracaoDados_ms',
      'serializacaoWorker_ms',
      // Grupo 2 - Recursos
      'heapUsed_bytes',
      'heapTotal_bytes',
      'memoryMetricAvailable',
      'domAposCarregamento',
      'requisicoesTotal',
      'requisicoesJS',
      'requisicoesCSS',
      'requisicoesImagem',
      'requisicoesFonte',
      'requisicoesAPI',
      'requisicoesOutros',
      'totalBytes',
      'javascriptBytes',
      'cssBytes',
      'imageBytes',
      'otherBytes',
      // Grupo 3 - Interação
      'tempoExplicacao_ms',
      'domAntes',
      'domDepois',
      'elementosAdicionados',
      'reconciliacaoLista_ms',
    ].join(';')
  );

  // Dados brutos de todas as execuções
  const todosResultados = [...resultadosMono, ...resultadosProg];

  for (const resultado of todosResultados) {
    const config = resultado.configuracao;

    for (const exec of [...resultado.warmup, ...resultado.valid]) {
      const c = exec.carregamento;
      const r = exec.recursos;
      const i = exec.interacao;

      linhas.push(
        [
          config.datasetSize,
          config.architecture,
          exec.runType,
          exec.runNumber,
          c.tempoCarregamento.toFixed(2),
          c.tempoAteInterativo.toFixed(2),
          c.tbt.toFixed(2),
          c.longTasksCount,
          c.longTasksTotalDuration.toFixed(2),
          c.longTasksAverageDuration.toFixed(2),
          c.longTasksMaxDuration.toFixed(2),
          c.domInicial,
          c.tempoAteRenderizacaoCompleta?.toFixed(2) ?? 'N/A',
          c.geracaoDadosMs?.toFixed(2) ?? 'N/A',
          c.serializacaoWorkerMs?.toFixed(2) ?? 'N/A',
          r.heapUsed ?? 'N/A',
          r.heapTotal ?? 'N/A',
          r.memoryMetricAvailable,
          r.domAposCarregamento,
          r.requisicoesTotal,
          r.requisicoesJS,
          r.requisicoesCSS,
          r.requisicoesImagem,
          r.requisicoesFonte,
          r.requisicoesAPI,
          r.requisicoesOutros,
          r.totalBytes ?? 'N/A',
          r.javascriptBytes ?? 'N/A',
          r.cssBytes ?? 'N/A',
          r.imageBytes ?? 'N/A',
          r.otherBytes ?? 'N/A',
          i.tempoExplicacao.toFixed(2),
          i.domAntes,
          i.domDepois,
          i.elementosAdicionados,
          i.reconciliacaoListaMs?.toFixed(2) ?? 'N/A',
        ].join(';')
      );
    }
  }

  // Linha em branco + estatísticas
  linhas.push('');
  linhas.push('');
  linhas.push('=== ESTATÍSTICAS (MÉDIAS DAS EXECUÇÕES VÁLIDAS) ===');
  linhas.push('');

  linhas.push(
    [
      'datasetSize',
      'architecture',
      // Grupo 1
      'tempoCarregamento_media',
      'tempoCarregamento_desvio',
      'tbt_media',
      'tbt_desvio',
      'longTasksCount_media',
      'longTasksTotalDuration_media',
      'longTasksMaxDuration_media',
      'domInicial_media',
      'tempoAteRenderizacaoCompleta_media',
      'geracaoDados_media',
      'serializacaoWorker_media',
      // Grupo 2
      'heapUsed_media',
      'domAposCarregamento_media',
      'requisicoesTotal_media',
      'requisicoesJS_media',
      'requisicoesCSS_media',
      'requisicoesImagem_media',
      'totalBytes_media',
      'javascriptBytes_media',
      'cssBytes_media',
      'imageBytes_media',
      // Grupo 3
      'tempoExplicacao_media',
      'tempoExplicacao_desvio',
      'domAntes_media',
      'domDepois_media',
      'elementosAdicionados_media',
      'elementosAdicionados_desvio',
      'reconciliacaoLista_media',
    ].join(';')
  );

  for (const resultado of todosResultados) {
    const e = resultado.estatisticas;
    const config = resultado.configuracao;

    linhas.push(
      [
        config.datasetSize,
        config.architecture,
        formatNumber(e.tempoCarregamentoMedia),
        formatNumber(e.tempoCarregamentoDesvio),
        formatNumber(e.tbtMedia),
        formatNumber(e.tbtDesvio),
        formatInt(e.longTasksCountMedia),
        formatNumber(e.longTasksTotalDurationMedia),
        formatNumber(e.longTasksMaxDurationMedia),
        formatInt(e.domInicialMedia),
        formatNumber(e.tempoAteRenderizacaoCompletaMedia),
        formatNumber(e.geracaoDadosMsMedia),
        formatNumber(e.serializacaoWorkerMsMedia),
        formatInt(e.heapUsedMedia),
        formatInt(e.domAposCarregamentoMedia),
        formatInt(e.requisicoesTotalMedia),
        formatInt(e.requisicoesJSMedia),
        formatInt(e.requisicoesCSSMedia),
        formatInt(e.requisicoesImagemMedia),
        formatInt(e.totalBytesMedia),
        formatInt(e.javascriptBytesMedia),
        formatInt(e.cssBytesMedia),
        formatInt(e.imageBytesMedia),
        formatNumber(e.tempoExplicacaoMedia),
        formatNumber(e.tempoExplicacaoDesvio),
        formatInt(e.domAntesMedia),
        formatInt(e.domDepoisMedia),
        formatNumber(e.elementosAdicionadosMedia),
        formatNumber(e.elementosAdicionadosDesvio),
        formatNumber(e.reconciliacaoListaMsMedia),
      ].join(';')
    );
  }

  fs.writeFileSync(caminho, linhas.join('\n'));
  console.log(`  📊 CSV salvo: ${caminho}`);
}

export { calcularEstatisticas };
