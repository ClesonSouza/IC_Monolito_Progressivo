# Dashboard de Risco de Evasão Acadêmica: Monolítico vs Progressivo

Projeto experimental de iniciação científica que compara duas estratégias de arquitetura front-end para exibir explicações de risco de evasão acadêmica em um dashboard com listas grandes de estudantes: uma que pré-renderiza tudo antecipadamente (Monolítica) e outra que carrega sob demanda (Progressiva).

O objetivo não é o dashboard em si, mas medir, com dados reais de performance do navegador, o custo de cada abordagem conforme o volume de dados cresce.

## As duas arquiteturas

**Cenário A, Monolítico** (`/monolitico`)
Assim que os dados são carregados, o painel de explicação é pré-renderizado para todos os estudantes da lista. Esses painéis ficam escondidos via CSS e, quando o usuário clica em um estudante, apenas alternamos qual deles está visível. Ou seja, todo o custo de montar as explicações é pago logo no carregamento inicial da página.

**Cenário B, Progressivo** (`/progressivo`)
Aqui, nenhuma explicação é criada antes da interação. O painel só é montado quando o usuário clica em um estudante. Para isso, usamos `React.lazy` e `Suspense`, com uma importação dinâmica que carrega de fato um chunk JS separado. Dessa forma, parte do custo é adiada e só acontece quando a explicação é necessária.

As duas arquiteturas compartilham o mesmo código de lista, filtros, gráficos e geração de dados. A única diferença deliberada entre elas é como o painel de explicação é criado.

## Stack

- **React 18 + TypeScript + Vite**
- **React Router**: uma rota por cenário (`/monolitico` e `/progressivo`), cada uma carregada via `React.lazy` para gerar bundles e chunks JS separados no build de produção.
- **Recharts**: para a renderização dos gráficos do dashboard.
- **Web Worker**: para gerar os dados sintéticos fora da thread principal (`src/data/generator.worker.ts`).
- **Puppeteer**: para automação e execução padronizada dos testes de performance em navegador sem cabeça (headless).

## Rodando o projeto

```bash
npm install
npm run dev
```

Acesse `http://localhost:5173/monolitico` ou `http://localhost:5173/progressivo`.

## Dados sintéticos

Os estudantes são gerados por um algoritmo determinístico com semente fixa (`src/data/generator.ts`) executado em um Web Worker dedicado (`useEstudantesWorker`), garantindo que a thread principal da UI permaneça desimpedida durante a geração de massa de dados.

O risco de evasão é calculado por uma fórmula de regras simples (frequência, disciplinas pendentes, atraso de mensalidade, notas) mais um ruído aleatório para dar uma distribuição plausível. Os valores de impacto de cada fator (estilo SHAP) também são sorteados dentro de um intervalo fixo.

Como a semente é fixa e depende apenas do tamanho do dataset, os dois cenários sempre recebem exatamente os mesmos estudantes para um mesmo tamanho de dataset, em todas as repetições.

**Tamanhos de dataset usados no benchmark:** 50, 100, 250, 500, 1000, 2000, 5000, 6000, 7000, 8000 e 10000 registros.

## Benchmark de performance

Para rodar os testes de performance automatizados:

```bash
npm run test:performance
```


### Parâmetros de execução do benchmark

- **Configurações**: 22 combinações (11 tamanhos de dataset × 2 arquiteturas).
- **Embaralhamento (Randomização)**: As configurações têm sua ordem de execução embaralhada aleatoriamente (via algoritmo Fisher-Yates) a cada rodada do benchmark. Isso elimina viés sistemático do sistema operacional (aquecimento térmico de CPU, cache de disco ou processos concorrentes).
- **Repetições**: Cada configuração roda **5 execuções de aquecimento (warmup)** (descartadas) seguidas de **20 execuções válidas**, cada uma em um processo isolado do navegador com cache HTTP desabilitado.
- **Total de execuções**: 22 configurações × 25 execuções = 550 execuções no total.

### Saídas do benchmark

Os relatórios e métricas extraídos são salvos no diretório `tests/performance/results/`:

- `resultados-monolitico.json`: Dados brutos de todas as execuções do Cenário A.
- `resultados-progressivo.json`: Dados brutos de todas as execuções do Cenário B.
- `resultados-consolidado.csv`: Tabela consolidada com todas as métricas por execução (separador `;`).
- `estatisticas-consolidadas.json`: Médias, desvios padrão e estatísticas agregadas por combinação de arquitetura e tamanho de dataset.

## Métricas coletadas

Tudo é medido via **Performance API** nativa do navegador (Navigation Timing, `PerformanceObserver` para Long Tasks, Resource Timing, `performance.memory`) e marcações customizadas (`performance.mark` e `performance.measure`).

| Métrica | Grupo | O que mede |
|---|---|---|
| `tempoCarregamento` | Carregamento | Tempo do início até o evento `load` do navegador |
| `tempoAteInterativo` | Carregamento | Tempo até `domInteractive` (parse do HTML concluído) |
| `tbt` | Carregamento | Total Blocking Time (soma do tempo excedente a 50ms de todas as Long Tasks) |
| `longTasksCount` | Carregamento | Quantidade total de Long Tasks registradas |
| `longTasksTotalDuration` | Carregamento | Soma total da duração das Long Tasks (ms) |
| `longTasksMaxDuration` | Carregamento | Maior duração individual de Long Task registrada (ms) |
| `longTasksDuracoes` | Carregamento | Array com as durações individuais de cada Long Task na ordem em que ocorreram |
| `tempoAteRenderizacaoCompleta` | Carregamento | Do início da navegação até a conclusão da renderização inicial dos dados |
| `geracaoDadosMs` | Carregamento | Tempo da geração de dados no Web Worker (ida e volta) |
| `serializacaoWorkerMs` | Carregamento | Do worker entregar os dados até o React commitar os componentes na tela |
| `domInicial` | Carregamento | Quantidade de nós no DOM logo após o carregamento inicial |
| `heapUsed` / `heapTotal` | Recursos | Memória JavaScript JS Heap consumida e alocada (MB) |
| `domAposCarregamento` | Recursos | Quantidade de nós no DOM após renderização completa dos componentes |
| `requisicoesTotal` / `*Bytes` | Recursos | Quantidade total de requisições e bytes transferidos (JS, CSS, Imagens, etc.) |
| `tempoExplicacao` | Interação | Tempo total do clique no estudante até a renderização/exibição da explicação |
| `reconciliacaoListaMs` | Interação | Tempo do clique até a atualização do estado da lista |
| `requisicoesDuranteInteracao` | Interação | Requisições de rede iniciadas exclusivamente após o clique de seleção |
| `elementosAdicionados` | Interação | Diferença de elementos no DOM antes e depois da interação de clique |

## Estrutura de pastas

```
src/
├── architectures/
│   ├── monolithic/          # Cenário A: Monolítico (pré-renderização)
│   └── progressive/         # Cenário B: Progressivo (lazy loading sob demanda)
├── components/              # Componentes UI compartilhados entre as arquiteturas
│   ├── Charts/              # Gráficos em Recharts (Modalidade, Curso, Risco, Região)
│   ├── DatasetControl/      # Selector de tamanho do dataset
│   ├── ExplanationPanel/    # Painel detalhado de explicação de risco (SHAP)
│   ├── Filters/             # Filtros por período, curso, região e modalidade
│   ├── Header/              # Cabeçalho da aplicação
│   ├── Layout/              # Structure layout dos dashboards
│   ├── MetricCard/          # Cartões de métricas (Evasão, Ocupação, Conclusão, Risco)
│   ├── RiskIndicator/       # Indicadores visuais de nível de risco
│   ├── Sidebar/             # Barra de navegação lateral
│   └── StudentList/         # Lista interativa de estudantes
├── data/
│   ├── generator.ts         # Algoritmo determinístico de dados sintéticos
│   └── generator.worker.ts  # Web Worker para geração de dados
├── hooks/
│   └── useEstudantesWorker.ts # Hook React para integração com o Worker
├── services/
│   └── studentService.ts    # Regras de cálculo, estatísticas e filtros
├── styles/
│   └── global.css           # Estilos globais da aplicação
├── types/                   # Definições de tipos TypeScript compartilhadas
└── utils/
    └── performance.ts       # Utility para instrumentação de performance (marks/measures)

tests/performance/
├── core/                    # Núcleo de automação do Puppeteer
│   ├── browser.ts           # Inicializador de instâncias isoladas do navegador
│   ├── metrics.ts           # Coletor de métricas (Navigation, Resource e Interação)
│   └── reporter.ts          # Consolidador estatístico e emissor de JSON/CSV
├── benchmark.ts             # Orquestrador do benchmark com embaralhamento e repetições
├── start-and-run.ts         # Script principal (build de produção + servidor preview + benchmark)
└── results/                 # Saída estruturada dos testes de performance
    ├── estatisticas-consolidadas.json
    ├── resultados-consolidado.csv
    ├── resultados-monolitico.json
    └── resultados-progressivo.json
```

## Limitações conhecidas

Coisas a serem consideradas em qualquer análise feita a partir desses dados:

- **Condições locais de ambiente**: Não há throttling artificial de CPU nem de rede aplicados nos testes de baseline; os benchmarks rodam nas condições reais de hardware e sistema operacional da máquina de execução.
- **Ponto de interação padronizado**: O clique automatizado de teste é efetuado consistentemente no primeiro estudante da lista.
- **Escopo arquitetural específico**: O teste compara especificamente pré-renderização integral via CSS vs. carregamento sob demanda com `React.lazy`/`Suspense`. Não inclui cenários de controle com virtualização de lista (ex: `react-window`) nem memoização avançada (`React.memo`).
- **Análise estatística**: As estatísticas reportadas no consolidado cobrem média amostral e desvio padrão.

## Segurança e dados

Todos os dados são sintéticos e gerados localmente via algoritmo determinístico. Não há credenciais, chaves de API ou dados reais em nenhum lugar do repositório.
