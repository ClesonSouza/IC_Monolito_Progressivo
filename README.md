# Dashboard de Risco de Evasão Acadêmica: Monolítico vs Progressivo

Projeto experimental de iniciação científica que compara duas estratégias de arquitetura front-end para exibir explicações de risco de evasão acadêmica em um dashboard com listas grandes de estudantes: uma que pré-renderiza tudo antecipadamente e outra que carrega sob demanda.

O objetivo não é o dashboard em si. É medir, com dados reais de performance do navegador, o custo de cada abordagem conforme o volume de dados cresce.

## As duas arquiteturas

**Cenário A, Monolítico** (`/monolitico`)
Assim que os dados são carregados, o painel de explicação é pré-renderizado para todos os estudantes da lista. Esses painéis ficam escondidos via CSS e, quando o usuário clica em um estudante, apenas alternamos qual deles está visível. Ou seja, todo o custo de montar as explicações é pago logo no carregamento inicial da página.

**Cenário B, Progressivo** (`/progressivo`)
Aqui, nenhuma explicação é criada antes da interação. O painel só é montado quando o usuário clica em um estudante. Para isso, usamos `React.lazy` e `Suspense`, com uma importação dinâmica que carrega de fato um chunk JS separado. Dessa forma, parte do custo é adiada e só acontece quando a explicação é necessária.

As duas arquiteturas compartilham o mesmo código de lista, filtros, gráficos e geração de dados. A única diferença deliberada entre elas é como o painel de explicação é criado.

## Stack

- React 18 + TypeScript + Vite
- React Router (uma rota por cenário, cada uma carregada via `React.lazy` para gerar bundles separados)
- Recharts para os gráficos do dashboard
- Web Worker para gerar os dados sintéticos fora da thread principal
- Puppeteer para a automação dos testes de performance

## Rodando o projeto

```bash
npm install
npm run dev
```

Acesse `http://localhost:5173/monolitico` ou `http://localhost:5173/progressivo`.

## Dados sintéticos

Os estudantes são gerados por um algoritmo determinístico com semente fixa (`src/data/generator.ts`), não vêm de nenhuma base real. O risco de evasão é calculado por uma fórmula de regras simples (frequência, disciplinas pendentes, atraso de mensalidade, notas) mais um ruído aleatório, só para dar uma distribuição plausível. Os "valores de impacto" de cada fator, no estilo SHAP, também são sorteados dentro de um intervalo fixo, não vêm de nenhum modelo preditivo real.

Como a semente é fixa e depende só do tamanho do dataset, os dois cenários sempre recebem exatamente os mesmos estudantes para um mesmo tamanho, em todas as repetições.

Tamanhos de dataset usados no benchmark: 50, 100, 250, 500, 1000, 2000, 5000 e 10000 registros.

## Benchmark de performance

Para rodar os testes utilize

```bash
npm run test:performance
```

Cada combinação de arquitetura e tamanho de dataset roda 5 vezes de aquecimento (descartadas) seguidas de 20 execuções válidas, cada uma em uma instância nova do navegador com cache HTTP desabilitado. Isso dá 16 combinações, 25 execuções cada, 400 execuções no total.

Os resultados saem em `tests/performance/results/`, em JSON (bruto + estatísticas) e em um CSV consolidado com ponto e vírgula como separador.

## Métricas coletadas

Tudo é medido via Performance API nativa do navegador (Navigation Timing, `PerformanceObserver` para long tasks, Resource Timing, `performance.memory`) e marcações customizadas (`performance.mark`/`performance.measure`). Não é usado Lighthouse em nenhuma etapa.

| Métrica | O que mede |
|---|---|
| `tempoCarregamento` | Tempo até o evento `load` do navegador (rede e parsing) |
| `tbt` / `longTasks*` | Bloqueio da thread principal por tarefas longas |
| `tempoAteRenderizacaoCompleta` | Do início da navegação até o fim do processamento pesado do React, independente do evento `load` |
| `geracaoDadosMs` | Tempo do Web Worker gerar os dados, ida e volta até a thread principal |
| `serializacaoWorkerMs` | Do worker entregar os dados até o React commitar isso na tela |
| `domInicial` | Nós no DOM logo após o carregamento |
| `tempoExplicacao` | Do clique até o painel de explicação estar pronto |
| `reconciliacaoListaMs` | Do clique até a lista e o estado de carregamento serem commitados, isolado do restante da explicação |
| `requisicoes*` / `*Bytes` | Quantidade e tamanho dos arquivos JS/CSS/imagem carregados |

`tempoExplicacao` menos `reconciliacaoListaMs` é o número mais próximo que temos do custo isolado do lazy loading no Cenário B.

## O que os dados mostram até agora

Nos tamanhos que testamos, o **Cenário A** apresenta um custo maior tanto no carregamento inicial quanto na interação, e essa diferença aumenta conforme o volume de dados cresce.

Mas o ponto mais interessante não é simplesmente dizer que um cenário é _"melhor"_ que o outro. A diferença está principalmente em **quando o custo é pago**.

No **Cenário A**, praticamente todo o trabalho acontece durante o carregamento da página. Já no **Cenário B**, esse custo é distribuído: uma parte acontece inicialmente e outra parte é paga conforme o usuário interage e abre uma explicação.

Vale reforçar que esse resultado é específico desta implementação `React 18`, `Suspense` e um único componente de explicação. Portanto, ele não deve ser interpretado como uma conclusão geral sobre **pré-renderização** ou **lazy loading** como técnicas.

## Estrutura de pastas

```
src/
├── architectures/
│   ├── monolithic/       Cenário A
│   └── progressive/      Cenário B
├── components/           Lista, filtros, gráficos, painel de explicação (compartilhados)
├── data/
│   ├── generator.ts      Gerador de dados sintéticos
│   └── generator.worker.ts  Mesmo gerador, rodando em Web Worker
├── hooks/useEstudantesWorker.ts  Hook que consome o worker, usado pelos dois cenários
├── services/studentService.ts    Filtros, métricas agregadas, dados de gráfico
├── utils/performance.ts  Toda a instrumentação de performance (marks/measures)
└── types/                Tipagens compartilhadas

tests/performance/
├── core/                 Puppeteer, coleta de métricas, geração de relatório
├── benchmark.ts          Orquestrador principal (warmup, execuções válidas, todos os tamanhos)
├── start-and-run.ts      Builda produção + sobe preview + roda o benchmark
├── runner.ts             Pipeline legado, roda contra o dev server
└── results/              Saída dos testes (JSON e CSV)
```

## Limitações conhecidas

Coisas que ainda não estão controladas ou testadas, e que valem menção honesta em qualquer análise feita a partir desses dados:

- A ordem de execução é fixa (todos os tamanhos do Cenário A, depois todos do B), sem randomização ou contrabalanceamento.
- Não há throttling de CPU nem de rede, os testes rodam nas condições da máquina local.
- O clique de teste é sempre no primeiro estudante da lista, a posição não é variada.
- Não existe nenhum cenário de controle com virtualização de lista ou memoização de componente.
- As estatísticas reportadas são só média e desvio padrão, sem mediana, percentis ou teste de significância.
- Não há ablação separando o custo da lista do custo do painel de explicação. A decomposição feita hoje (`reconciliacaoListaMs` vs `tempoExplicacao`) é uma aproximação via marcações no código, não profiling de componente por componente.

## Segurança e dados

Todos os dados são sintéticos e gerados localmente. Não há credenciais, chaves de API ou dados reais de estudantes em nenhum lugar do repositório.
