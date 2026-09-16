/**
 * As duas dashboards são carregadas via `React.lazy`, cada uma em sua
 * própria rota.
 *
 * Isso garante que o build de produção gere bundles realmente separados por
 * cenário: visitar `/monolitico` ou `/progressivo` baixa só o bundle daquele
 * cenário, como aconteceria numa aplicação real e independente.
 *
 * Isso foi confirmado inspecionando o build gerado: o chunk do
 * `MonolithicDashboard` importa o `ExplanationPanel` de forma estática, e o
 * chunk do `ProgressiveDashboard` importa ele via `import()` dinâmico de
 * verdade, cada um virando um arquivo `.js` separado.
 *
 * Módulos que as duas arquiteturas usam do mesmo jeito, como o gerador de
 * dados e os componentes de lista e gráficos, continuam compartilhados entre
 * as rotas normalmente. Essa separação de rota não mexe nisso, e não deve
 * ser confundida com a simetria entre A e B garantida pelo Web Worker de
 * geração de dados (`useEstudantesWorker`), que resolve um problema
 * diferente: onde a geração dos dados roda, não como o JS é entregue.
 */
import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

const MonolithicDashboard = lazy(() =>
  import('./architectures/monolithic/MonolithicDashboard').then((modulo) => ({
    default: modulo.MonolithicDashboard,
  }))
);

const ProgressiveDashboard = lazy(() =>
  import('./architectures/progressive/ProgressiveDashboard').then((modulo) => ({
    default: modulo.ProgressiveDashboard,
  }))
);

const App: React.FC = () => {
  return (
    <Suspense fallback={null}>
      <Routes>
        <Route path="/" element={<Navigate to="/monolitico" replace />} />
        <Route path="/monolitico" element={<MonolithicDashboard />} />
        <Route path="/progressivo" element={<ProgressiveDashboard />} />
        <Route path="*" element={<Navigate to="/monolitico" replace />} />
      </Routes>
    </Suspense>
  );
};

export default App;
