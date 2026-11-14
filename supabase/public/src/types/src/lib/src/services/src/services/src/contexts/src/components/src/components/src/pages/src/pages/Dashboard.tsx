import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
  CalculoContratoDetalhado,
  ConfiguracaoFinanceira,
  Industria,
  Linha,
  Motorista,
  Onibus,
} from '../types/database';
import { calcularFinanceiroIndustria, formatBRL } from '../services/calculator';
import { MissingDataAlert } from '../components/MissingDataAlert';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [calculos, setCalculos] = useState<CalculoContratoDetalhado[]>([]);
  const [config, setConfig] = useState<ConfiguracaoFinanceira | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);

  const carregarDados = async () => {
    if (!user) return;
    setLoading(true);

    const [resConfig, resInd, resBus, resMot, resLin] = await Promise.all([
      supabase.from('configuracoes_financeiras').select('*').eq('user_id', user.id).maybeSingle(),
      supabase.from('industrias').select('*').eq('user_id', user.id),
      supabase.from('onibus').select('*').eq('user_id', user.id),
      supabase.from('motoristas').select('*').eq('user_id', user.id),
      supabase.from('linhas').select('*').eq('user_id', user.id),
    ]);

    const cfg: ConfiguracaoFinanceira = resConfig.data || {
      user_id: user.id,
      preco_diesel_litro: 0,
      aliquota_impostos_percent: 0,
      encargos_trabalhistas_percent: 0,
      despesa_administrativa_mensal: 0,
      margem_lucro_desejada_percent: 15,
    };
    setConfig(cfg);

    const industrias: Industria[] = resInd.data || [];
    const onibus: Onibus[] = resBus.data || [];
    const motoristas: Motorista[] = resMot.data || [];
    const linhas: Linha[] = resLin.data || [];

    const ativas = industrias.filter((i) => i.status_contrato !== 'encerrado');
    const resultados = ativas.map((ind) =>
      calcularFinanceiroIndustria(
        ind,
        linhas.filter((l) => l.industria_id === ind.id),
        onibus,
        motoristas,
        cfg,
        ativas.length
      )
    );

    setCalculos(resultados);
    setLoading(false);
  };

  useEffect(() => {
    carregarDados();
  }, [user]);

  const salvarParametrosGlobais = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!config || !user) return;
    setSavingConfig(true);

    await supabase.from('configuracoes_financeiras').upsert(
      {
        ...config,
        user_id: user.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );

    await carregarDados();
    setSavingConfig(false);
  };

  if (loading) return <div className="loading-box">Carregando indicadores financeiros reais...</div>;

  const faturamentoMensalTotal = calculos.reduce((acc, c) => acc + c.receitaAtualMensal, 0);
  const despesaMensalTotal = calculos.reduce((acc, c) => acc + c.custoOperacionalTotalMensal, 0);
  const lucroMensalTotal = calculos.reduce((acc, c) => acc + c.lucroLiquidoAtualMensal, 0);
  const receitaRecomendadaTotal = calculos.reduce((acc, c) => acc + c.precoRecomendadoMensal, 0);
  const margemGlobal =
    faturamentoMensalTotal > 0 ? (lucroMensalTotal / faturamentoMensalTotal) * 100 : 0;

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>Dashboard Financeiro Consolidado</h2>
        <p>Visão consolidada calculada exclusivamente a partir dos contratos, frota e rotas ativos.</p>
      </div>

      {/* KPIs Principais */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <span>Faturamento Atual (Mensal)</span>
          <strong>{formatBRL(faturamentoMensalTotal)}</strong>
          <small>Anual: {formatBRL(faturamentoMensalTotal * 12)}</small>
        </div>
        <div className="kpi-card">
          <span>Despesa Operacional (Mensal)</span>
          <strong>{formatBRL(despesaMensalTotal)}</strong>
          <small>Anual: {formatBRL(despesaMensalTotal * 12)}</small>
        </div>
        <div className={`kpi-card ${lucroMensalTotal < 0 ? 'danger' : 'success'}`}>
          <span>Lucro Líquido Real (Mensal)</span>
          <strong>{formatBRL(lucroMensalTotal)}</strong>
          <small>Margem Líquida: {margemGlobal.toFixed(2)}%</small>
        </div>
        <div className="kpi-card highlight">
          <span>Faturamento Recomendado</span>
          <strong>{formatBRL(receitaRecomendadaTotal)}</strong>
          <small>Meta de margem: {config?.margem_lucro_desejada_percent}%</small>
        </div>
      </div>

      {/* Parâmetros Globais Editáveis */}
      {config && (
        <section className="card">
          <h3>Parâmetros Globais de Custo, Tributação e Margem</h3>
          <form onSubmit={salvarParametrosGlobais} className="grid-form">
            <label>
              Preço Médio Diesel (R$/L)
              <input
                type="number"
                step="0.0001"
                value={config.preco_diesel_litro}
                onChange={(e) =>
                  setConfig({ ...config, preco_diesel_litro: parseFloat(e.target.value) || 0 })
                }
              />
            </label>
            <label>
              Encargos Trabalhistas (%)
              <input
                type="number"
                step="0.01"
                value={config.encargos_trabalhistas_percent}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    encargos_trabalhistas_percent: parseFloat(e.target.value) || 0,
                  })
                }
              />
            </label>
            <label>
              Impostos s/ Faturamento (%)
              <input
                type="number"
                step="0.01"
                value={config.aliquota_impostos_percent}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    aliquota_impostos_percent: parseFloat(e.target.value) || 0,
                  })
                }
              />
            </label>
            <label>
              Despesa Administrativa Mensal (R$)
              <input
                type="number"
                step="0.01"
                value={config.despesa_administrativa_mensal}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    despesa_administrativa_mensal: parseFloat(e.target.value) || 0,
                  })
                }
              />
            </label>
            <label>
              Margem de Lucro Alvo (%)
              <input
                type="number"
                step="0.01"
                value={config.margem_lucro_desejada_percent}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    margem_lucro_desejada_percent: parseFloat(e.target.value) || 0,
                  })
                }
              />
            </label>
            <div className="form-actions-inline">
              <button type="submit" className="btn-primary" disabled={savingConfig}>
                {savingConfig ? 'Recalculando...' : 'Salvar e Recalcular'}
              </button>
            </div>
          </form>
        </section>
      )}

      {/* Resumo por Indústria */}
      <section className="card">
        <h3>Desempenho por Indústria Contratante</h3>
        {calculos.length === 0 ? (
          <p className="empty-state">
            Nenhuma indústria ativa cadastrada. Acesse <strong>Indústrias & Contratos</strong> para iniciar.
          </p>
        ) : (
          <div className="table-responsive">
            <table>
              <thead>
                <tr>
                  <th>Indústria</th>
                  <th>Turnos / Regime</th>
                  <th>Custo Mensal</th>
                  <th>Preço Mínimo (PE)</th>
                  <th>Preço Recomendado</th>
                  <th>Contrato Atual</th>
                  <th>Margem Real</th>
                </tr>
              </thead>
              <tbody>
                {calculos.map((c) => (
                  <tr key={c.industria.id}>
                    <td>
                      <strong>{c.industria.razao_social}</strong>
                      <div className="subtext">{c.industria.dias_uteis_mes} dias úteis/mês</div>
                    </td>
                    <td>
                      {c.industria.quantidade_turnos} turnos{' '}
                      {c.industria.operacao_24h && <span className="badge">24H</span>}
                    </td>
                    <td>{formatBRL(c.custoOperacionalTotalMensal)}</td>
                    <td>{formatBRL(c.precoMinimoSemLucroMensal)}</td>
                    <td>
                      <strong>{formatBRL(c.precoRecomendadoMensal)}</strong>
                    </td>
                    <td>{formatBRL(c.receitaAtualMensal)}</td>
                    <td className={c.margemAtualPercent < 0 ? 'text-danger' : 'text-success'}>
                      {c.margemAtualPercent.toFixed(2)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {calculos.map((c) => (
          <MissingDataAlert key={c.industria.id} pendencias={c.pendencias} />
        ))}
      </section>
    </div>
  );
};
