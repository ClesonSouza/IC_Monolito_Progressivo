import React, { useEffect } from 'react';
import type { Estudante } from '@/types';
import { RiskIndicator } from '../RiskIndicator/RiskIndicator';
import { classificarRisco, corRisco } from '@/utils/helpers';
import { marcarFim, medirIntervalo, sinalizarExplicacaoPronta } from '@/utils/performance';
import styles from './ExplanationPanel.module.css';

interface ExplanationPanelProps {
  estudante: Estudante | null;
  carregando?: boolean;
  /**
   * Controla se este componente deve registrar a performance de "clique →
   * explicação pronta" na sua própria montagem.
   *
   * Usar `false` no Cenário A (monolítico), onde os painéis já estão todos
   * pré-renderizados desde o carregamento inicial: nesse caso, montar o
   * componente não corresponde a um clique, então o registro automático
   * geraria uma marcação falsa na carga da página em vez de na interação.
   * A medição da interação em A é feita manualmente pelo dashboard (via
   * troca de visibilidade), não pelo ciclo de vida deste componente.
   *
   * No Cenário B, o padrão (`true`) continua correto: cada clique realmente
   * monta uma nova instância do componente via `React.lazy`.
   */
  medirPerformance?: boolean;
  /** Se este painel é o que está atualmente visível para o usuário. */
  visivel?: boolean;
}

// Executa IMEDIATAMENTE na montagem do componente (antes do useEffect)
function registrarPerformanceExplicacao() {
  marcarFim('explicacao');
  medirIntervalo('tempo-explicacao');
  sinalizarExplicacaoPronta();
}

export const ExplanationPanel: React.FC<ExplanationPanelProps> = ({
  estudante,
  carregando = false,
  medirPerformance = true,
  visivel = true,
}) => {
  // Registra performance no primeiro render válido (estudante presente e não carregando)
  const jaRegistrado = React.useRef(false);

  useEffect(() => {
    if (medirPerformance && estudante && !carregando && !jaRegistrado.current) {
      jaRegistrado.current = true;
      registrarPerformanceExplicacao();
    }
  }, [estudante, carregando, medirPerformance]);

  // Resetar flag quando estudante muda
  useEffect(() => {
    if (!estudante) {
      jaRegistrado.current = false;
    }
  }, [estudante]);

  if (carregando) {
    return (
      <div className={styles.container} data-testid="explanation-panel" data-visible={visivel ? 'true' : 'false'}>
        <div className={styles.carregando}>
          <div className={styles.spinner} />
          <p>Carregando explicação...</p>
        </div>
      </div>
    );
  }

  if (!estudante) {
    return (
      <div className={styles.container} data-testid="explanation-panel" data-visible={visivel ? 'true' : 'false'}>
        <div className={styles.vazio}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5">
            <path d="M9 11l3 3L22 4" />
            <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
          </svg>
          <p>Selecione um estudante para visualizar a explicação do risco de evasão.</p>
        </div>
      </div>
    );
  }

  const fatoresPositivos = estudante.fatoresRisco.filter((f) => f.impacto > 0);
  const fatoresNegativos = estudante.fatoresRisco.filter((f) => f.impacto < 0);
  const cor = corRisco(estudante.riscoEvasao);

  return (
    <div className={styles.container} data-testid="explanation-panel" data-visible={visivel ? 'true' : 'false'}>
      <div className={styles.header}>
        <h3 className={styles.titulo}>Explicação do Risco</h3>
      </div>

      <div className={styles.estudante}>
        <span className={styles.nome}>{estudante.nome}</span>
        <span className={styles.id}>{estudante.id}</span>
      </div>

      <div className={styles.riscoSection}>
        <RiskIndicator risco={estudante.riscoEvasao} tamanho="grande" mostrarLabel={false} />
        <div className={styles.riscoInfo}>
          <span className={styles.riscoValor} style={{ color: cor }}>
            {estudante.riscoEvasao}%
          </span>
          <span className={styles.riscoLabel} style={{ color: cor }}>
            {classificarRisco(estudante.riscoEvasao)}
          </span>
        </div>
      </div>

      <div className={styles.barras} data-testid="risk-indicator">
        <div className={styles.barraContainer}>
          <div
            className={styles.barra}
            style={{
              width: `${estudante.riscoEvasao}%`,
              backgroundColor: cor,
            }}
          />
        </div>
      </div>

      <div className={styles.secao}>
        <h4 className={styles.secaoTitulo}>Principais fatores que aumentam o risco</h4>
        {fatoresPositivos.length === 0 ? (
          <p className={styles.semFatores}>Nenhum fator de alto risco identificado.</p>
        ) : (
          <ul className={styles.listaFatores}>
            {fatoresPositivos.map((fator, idx) => (
              <li key={idx} className={styles.fator}>
                <span className={styles.fatorNome}>+ {fator.nome}</span>
                <span className={styles.fatorImpactoPositivo}>+{fator.impacto}%</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className={styles.secao}>
        <h4 className={styles.secaoTitulo}>Fatores que reduzem o risco</h4>
        {fatoresNegativos.length === 0 ? (
          <p className={styles.semFatores}>Nenhum fator protetivo identificado.</p>
        ) : (
          <ul className={styles.listaFatores}>
            {fatoresNegativos.map((fator, idx) => (
              <li key={idx} className={styles.fator}>
                <span className={styles.fatorNome}>- {fator.nome}</span>
                <span className={styles.fatorImpactoNegativo}>{fator.impacto}%</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className={styles.infoAcademica}>
        <h4 className={styles.secaoTitulo}>Informações Acadêmicas</h4>
        <div className={styles.gridInfo}>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Curso</span>
            <span className={styles.infoValor}>{estudante.curso}</span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Semestre</span>
            <span className={styles.infoValor}>{estudante.semestre}</span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Frequência</span>
            <span className={styles.infoValor}>{estudante.frequencia}%</span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Disciplinas Concluídas</span>
            <span className={styles.infoValor}>{estudante.disciplinasConcluidas}</span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Disciplinas Pendentes</span>
            <span className={styles.infoValor}>{estudante.disciplinasPendentes}</span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Modalidade</span>
            <span className={styles.infoValor}>{estudante.modalidade}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExplanationPanel;
