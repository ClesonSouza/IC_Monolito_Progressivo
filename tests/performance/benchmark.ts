import { launchBrowser, createPage, closeBrowser } from './core/browser.ts';
import { executarRodada, type ConfiguracaoTeste, type MetricasExecucao } from './core/metrics.ts';
import { calcularEstatisticas, gerarJSON, gerarCSV, gerarJSONEstatisticas, type ResultadoConfiguracao } from './core/reporter.ts';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ============================================================
// CONFIGURAÇÕES DO BENCHMARK
// ============================================================

const BASE_URL = process.env.BENCHMARK_URL || 'http://localhost:5173';
// const DATASET_SIZES = [50, 100, 250, 500, 1000];
// const WARMUP_RUNS = 5;
// const VALID_RUNS = 20;

const DATASET_SIZES = [50, 100, 250, 500, 1000, 2000, 5000, 6000, 7000, 8000, 10000];
const WARMUP_RUNS = 5;
const VALID_RUNS = 20;

const CONFIGURACOES: ConfiguracaoTeste[] = [];
for (const size of DATASET_SIZES) {
  CONFIGURACOES.push({
    architecture: 'monolithic',
    datasetSize: size,
    url: `${BASE_URL}/monolitico`,
  });
  CONFIGURACOES.push({
    architecture: 'progressive',
    datasetSize: size,
    url: `${BASE_URL}/progressivo`,
  });
}

// Embaralha a ordem das configurações antes de rodar o benchmark.
//
// Antes, o array percorria os tamanhos em ordem crescente e, para cada
// tamanho, executava primeiro todas as rodadas do Cenário A e depois todas
// as do Cenário B. Isso deixava a ordem de execução fixa e não controlada,
// abrindo espaço para efeitos de sistema operacional (estado térmico da CPU,
// cache de disco, processos concorrentes) favorecerem sistematicamente um
// dos dois cenários. Cada combinação já roda em um processo de navegador
// independente (ver executarConfiguracao), então o embaralhamento aqui trata
// só da ameaça de nível de sistema operacional, não de JIT/memória
// compartilhada entre cenários.
function embaralhar<T>(array: T[]): T[] {
  const copia = [...array];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

const CONFIGURACOES_EXECUCAO = embaralhar(CONFIGURACOES);

// ============================================================
// EXECUÇÃO DE UMA CONFIGURAÇÃO
// ============================================================

async function executarConfiguracao(
  config: ConfiguracaoTeste
): Promise<ResultadoConfiguracao> {
  console.log(`\n🔬 [${config.architecture.toUpperCase()}] Dataset: ${config.datasetSize} registros`);

  const browser = await launchBrowser();
  const warmup: MetricasExecucao[] = [];
  const valid: MetricasExecucao[] = [];

  try {
    // AQUECIMENTO (5 execuções — descartadas da análise)
    console.log(`   🔄 Aquecimento (${WARMUP_RUNS} execuções)...`);
    for (let i = 1; i <= WARMUP_RUNS; i++) {
      const page = await createPage(browser);
      try {
        const resultado = await executarRodada(page, config, 'warmup', i);
        warmup.push(resultado);
        process.stdout.write(`      ${i}/${WARMUP_RUNS} ✓\r`);
      } catch (err) {
        console.error(`      ${i}/${WARMUP_RUNS} ✗ Erro:`, err);
      } finally {
        await page.close();
      }
    }
    console.log(`      ${WARMUP_RUNS}/${WARMUP_RUNS} ✓ Aquecimento concluído`);

    // EXECUÇÕES VÁLIDAS (20 execuções — usadas na análise)
    console.log(`   📊 Execuções válidas (${VALID_RUNS} execuções)...`);
    for (let i = 1; i <= VALID_RUNS; i++) {
      const page = await createPage(browser);
      try {
        const resultado = await executarRodada(page, config, 'valid', i);
        valid.push(resultado);
        process.stdout.write(`      ${i}/${VALID_RUNS} ✓ | T_load=${resultado.carregamento.tempoCarregamento.toFixed(0)}ms | TBT=${resultado.carregamento.tbt.toFixed(0)}ms | DOM=${resultado.carregamento.domInicial} | Exp=${resultado.interacao.tempoExplicacao.toFixed(0)}ms\r`);
      } catch (err) {
        console.error(`      ${i}/${VALID_RUNS} ✗ Erro:`, err);
      } finally {
        await page.close();
      }
    }
    console.log(`      ${VALID_RUNS}/${VALID_RUNS} ✓ Execuções válidas concluídas`);

  } finally {
    await closeBrowser(browser);
  }

  // Calcular estatísticas apenas das execuções válidas
  const estatisticas = calcularEstatisticas(valid);

  // Resumo rápido
  console.log(`   📈 Resumo médio (válidas):`);
  console.log(`      • Tempo de carregamento: ${estatisticas.tempoCarregamentoMedia.toFixed(1)} ms (±${estatisticas.tempoCarregamentoDesvio.toFixed(1)})`);
  console.log(`      • TBT: ${estatisticas.tbtMedia.toFixed(1)} ms (±${estatisticas.tbtDesvio.toFixed(1)})`);
  console.log(`      • Long Tasks: ${estatisticas.longTasksCountMedia.toFixed(1)} (total ${estatisticas.longTasksTotalDurationMedia.toFixed(1)}ms, max ${estatisticas.longTasksMaxDurationMedia.toFixed(1)}ms)`);
  console.log(`      • DOM inicial: ${estatisticas.domInicialMedia.toFixed(0)} nós`);
  console.log(`      • DOM após carregamento: ${estatisticas.domAposCarregamentoMedia.toFixed(0)} nós`);
  if (estatisticas.memoryMetricAvailable) {
    console.log(`      • Heap usado: ${(estatisticas.heapUsedMedia! / 1024 / 1024).toFixed(2)} MB`);
  } else {
    console.log(`      • Heap: métrica não disponível neste navegador`);
  }
  console.log(`      • Requisições: ${estatisticas.requisicoesTotalMedia.toFixed(0)} total`);
  console.log(`      • Tempo explicação: ${estatisticas.tempoExplicacaoMedia.toFixed(1)} ms (±${estatisticas.tempoExplicacaoDesvio.toFixed(1)})`);
  console.log(`      • Elementos adicionados (interação): ${estatisticas.elementosAdicionadosMedia.toFixed(0)} (±${estatisticas.elementosAdicionadosDesvio.toFixed(1)})`);

  return {
    configuracao: config,
    warmup,
    valid,
    estatisticas,
  };
}

// ============================================================
// ORQUESTRADOR PRINCIPAL
// ============================================================

export async function executarBenchmark(): Promise<void> {
  const inicio = Date.now();
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║     BENCHMARK: MONOLÍTICO vs PROGRESSIVO                     ║');
  console.log('║     Renderização de Explicações de Risco de Evasão           ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log(`\nConfigurações:`);
  console.log(`  • URL base: ${BASE_URL}`);
  console.log(`  • Tamanhos de dataset: ${DATASET_SIZES.join(', ')}`);
  console.log(`  • Ordem de execução: embaralhada (seed aleatória a cada execução do benchmark)`);
  console.log(`  • Aquecimento: ${WARMUP_RUNS} execuções (descartadas)`);
  console.log(`  • Execuções válidas: ${VALID_RUNS} execuções (analisadas)`);
  console.log(`  • Total de execuções por configuração: ${WARMUP_RUNS + VALID_RUNS}`);
  console.log(`  • Total de configurações: ${CONFIGURACOES_EXECUCAO.length}`);
  console.log(`  • Total de execuções: ${CONFIGURACOES_EXECUCAO.length * (WARMUP_RUNS + VALID_RUNS)}`);

  const resultados: ResultadoConfiguracao[] = [];

  for (const config of CONFIGURACOES_EXECUCAO) {
    const resultado = await executarConfiguracao(config);
    resultados.push(resultado);
  }

  // Separar por arquitetura
  const resultadosMono = resultados.filter((r) => r.configuracao.architecture === 'monolithic');
  const resultadosProg = resultados.filter((r) => r.configuracao.architecture === 'progressive');

  // Gerar JSONs separados
  const resultsDir = path.resolve(__dirname, 'results');
  gerarJSON(resultadosMono, path.join(resultsDir, 'resultados-monolitico.json'));
  gerarJSON(resultadosProg, path.join(resultsDir, 'resultados-progressivo.json'));

  // Gerar CSV consolidado
  gerarCSV(resultadosMono, resultadosProg, path.join(resultsDir, 'resultados-consolidado.csv'));

  // Gerar JSON consolidado de estatísticas (uma linha por arquitetura+tamanho)
  gerarJSONEstatisticas([...resultadosMono, ...resultadosProg], path.join(resultsDir, 'estatisticas-consolidadas.json'));

  const duracao = ((Date.now() - inicio) / 1000 / 60).toFixed(1);
  console.log(`\n✅ Benchmark concluído em ${duracao} minutos`);
  console.log(`   📁 Resultados salvos em: ${resultsDir}`);
}

// Só executa automaticamente quando benchmark.ts é o ponto de entrada direto.
// Quando importado por start-and-run.ts (que chama executarBenchmark() explicitamente),
// esse bloco NÃO é executado, evitando duas execuções simultâneas.
const isEntryPoint = process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isEntryPoint) {
  executarBenchmark().catch((err) => {
    console.error('❌ Erro fatal no benchmark:', err);
    process.exit(1);
  });
}
