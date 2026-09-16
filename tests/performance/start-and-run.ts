#!/usr/bin/env ts-node
/**
 * Builda a aplicação em modo de produção, sobe um servidor de preview
 * (`vite preview`) servindo esse build, e só então roda o benchmark.
 *
 * Por quê: o `benchmark.ts` aponta por padrão para `http://localhost:5173`,
 * que é a porta padrão do `vite dev` — ou seja, o benchmark rodava contra o
 * servidor de desenvolvimento, sem bundling/minificação reais. Isso distorce
 * justamente a métrica de custo de carregar o JS que a comparação A/B tenta
 * medir, e também mascarava o problema de chunking descrito em `App.tsx`
 * (que só se manifesta em um build real).
 *
 * Uso:
 *   npx ts-node tests/performance/start-and-run.ts
 */

import { spawn, ChildProcess } from 'child_process';
import http from 'http';

const PORTA = 5173;
const URL_PREVIEW = `http://localhost:${PORTA}`;

function executar(comando: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const processo = spawn(comando, args, { stdio: 'inherit', shell: true });
    processo.on('exit', (codigo) => {
      if (codigo === 0) {
        resolve();
      } else {
        reject(new Error(`Comando "${comando} ${args.join(' ')}" falhou com código ${codigo}`));
      }
    });
    processo.on('error', reject);
  });
}

function esperarServidor(url: string, timeoutMs: number): Promise<void> {
  const inicio = Date.now();

  return new Promise((resolve, reject) => {
    const tentar = () => {
      const req = http.get(url, (res) => {
        res.resume();
        resolve();
      });

      req.on('error', () => {
        if (Date.now() - inicio > timeoutMs) {
          reject(new Error(`Timeout aguardando o servidor de preview em ${url}`));
          return;
        }
        setTimeout(tentar, 300);
      });
    };

    tentar();
  });
}

async function main(): Promise<void> {
  console.log('📦 Gerando build de produção (vite build)...');
  await executar('npx', ['vite', 'build']);

  console.log(`🚀 Iniciando servidor de preview em ${URL_PREVIEW}...`);
  const preview: ChildProcess = spawn(
    'npx',
    ['vite', 'preview', '--port', String(PORTA), '--strictPort'],
    { stdio: 'inherit', shell: true }
  );

  let encerrado = false;
  const encerrarPreview = () => {
    if (!encerrado) {
      encerrado = true;
      preview.kill();
    }
  };

  process.on('SIGINT', () => {
    encerrarPreview();
    process.exit(1);
  });

  try {
    await esperarServidor(URL_PREVIEW, 30000);
    console.log('✅ Servidor de preview pronto. Iniciando benchmark contra o build de produção...\n');

    // Import tardio para garantir que BENCHMARK_URL (se setado) seja lido
    // depois que já sabemos que o servidor está de pé.
    const { executarBenchmark } = await import('./benchmark.ts');
    await executarBenchmark();
  } finally {
    encerrarPreview();
  }
}

main().catch((err) => {
  console.error('❌ Erro fatal:', err);
  process.exit(1);
});
