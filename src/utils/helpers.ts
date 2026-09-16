/**
 * Funções utilitárias auxiliares.
 */

export function formatarPorcentagem(valor: number): string {
  return `${valor.toFixed(1)}%`;
}

export function classificarRisco(risco: number): string {
  if (risco >= 70) return 'ALTO RISCO';
  if (risco >= 40) return 'RISCO MODERADO';
  return 'BAIXO RISCO';
}

export function corRisco(risco: number): string {
  if (risco >= 70) return '#dc2626'; // vermelho
  if (risco >= 40) return '#d97706'; // laranja
  return '#16a34a'; // verde
}

export function gerarId(prefixo: string, indice: number): string {
  return `${prefixo}-${String(indice).padStart(6, '0')}`;
}
