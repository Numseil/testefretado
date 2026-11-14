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

export const Precificacao: React.FC = () => {
  const { user } = useAuth();
  const [calculos, setCalculos] = useState<CalculoContratoDetalhado[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      const [resCfg, resInd, resBus, resMot, resLin] = await Promise.all([
        supabase.from('configuracoes_financeiras').select('*').eq('user_id', user.id).maybeSingle(),
        supabase.from('industrias').select('*').eq('user_id', user.id),
        supabase.from('onibus').select('*').eq('user_id', user.id),
        supabase.from('motoristas').select('*').eq('user_id', user.id),
        supabase.from('linhas').select('*').eq('user_id', user.id),
      ]);

      const cfg: ConfiguracaoFinanceira = resCfg.data || {
        user_id: user.id,
        preco_diesel_litro: 0,
        aliquota_impostos_percent: 0,
        encargos_trabalhistas_percent: 0,
        despesa_administrativa_mensal: 0,
        margem_lucro_desejada_percent: 15,
      };

      const industrias: Industria[] = resInd.data || [];
      const results = industrias.map((ind) =>
        calcularFinanceiroIndustria(
          ind,
          (resLin.data || []).filter((l: Linha) => l.industria_id === ind.id),
          (resBus.data || []) as Onibus[],
          (resMot.data || []) as Motorista[],
          cfg,
          Math.max(1, industrias.length)
        )
      );

      setCalculos(results);
      if (results.length > 0) setSelectedId(results[0].industria.id);
    };
    load();
  }, [user]);

  const atual = calculos.find((c) => c.industria.id === selectedId);

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>Calculadora Detalhada de Custos e Precificação por Indústria</h2>
        <p>Decomposição completa de custos diários, mensais, anuais, unitários e ponto de equilíbrio.</p>
      </div>

      {calculos.length === 0 ? (
        <div className="card">Cadastre ao menos uma indústria para visualizar a composição de cálculo.</div>
      ) : (
        <>
          <div className="card">
            <label>
              Selecione a Indústria / Contrato para Auditoria de Preço:
              <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
                {calculos.map((c) => (
                  <option key={c.industria.id} value={c.industria.id}>
                    {c.industria.razao_social} ({c.industria.quantidade_turnos} turnos)
                  </option>
                ))}
              </select>
            </label>
          </div>

          {atual && (
            <>
              <MissingDataAlert pendencias={atual.pendencias} />

              {/* Precificação & Break-Even */}
              <div className="kpi-grid">
                <div className="kpi-card">
                  <span>Preço Mínimo (Ponto de Equilíbrio)</span>
                  <strong>{formatBRL(atual.precoMinimoSemLucroMensal)}</strong>
                  <small>Cobre 100% dos custos + impostos (Lucro R$ 0,00)</small>
                </div>
                <div className="kpi-card highlight">
                  <span>Preço Recomendado de Contrato</span>
                  <strong>{formatBRL(atual.precoRecomendadoMensal)}</strong>
                  <small>Inclui impostos ({formatBRL(atual.impostosSobrePrecoRecomendadoMensal)}) + margem</small>
                </div>
                <div className="kpi-card">
                  <span>Valor Atual Cobrado</span>
                  <strong>{formatBRL(atual.receitaAtualMensal)}</strong>
                  <small>Lucro Real: {formatBRL(atual.lucroLiquidoAtualMensal)}</small>
                </div>
                <div className="kpi-card">
                  <span>Ponto de Equilíbrio Operacional</span>
                  <strong>{atual.pontoEquilibrioPassageiros} passageiros</strong>
                  <small>Ocupação mínima para não gerar prejuízo</small>
                </div>
              </div>

              {/* Composição Detalhada */}
              <div className="two-col">
                <section className="card">
                  <h3>Composição Analítica de Custos (Mensal)</h3>
                  <table>
                    <thead>
                      <tr>
                        <th>Componente</th>
                        <th>Valor Mensal</th>
                        <th>% do Custo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { nome: 'Combustível (Diesel)', val: atual.custoCombustivelMensal },
                        { nome: 'Salários + Encargos + Benefícios', val: atual.custoSalariosEncargosMensal },
                        { nome: 'Manutenção e Pneus', val: atual.custoManutencaoMensal },
                        { nome: 'Depreciação Linear da Frota', val: atual.custoDepreciacaoMensal },
                        { nome: 'Seguro e Licenciamento', val: atual.custoSeguroMensal },
                        { nome: 'Despesas Administrativas (Rateio)', val: atual.custoAdministrativoRateadoMensal },
                      ].map((item) => {
                        const pct =
                          atual.custoOperacionalTotalMensal > 0
                            ? (item.val / atual.custoOperacionalTotalMensal) * 100
                            : 0;
                        return (
                          <tr key={item.nome}>
                            <td>{item.nome}</td>
                            <td>
                              <strong>{formatBRL(item.val)}</strong>
                            </td>
                            <td>{pct.toFixed(1)}%</td>
                          </tr>
                        );
                      })}
                      <tr className="total-row">
                        <td>CUSTO OPERACIONAL TOTAL</td>
                        <td>{formatBRL(atual.custoOperacionalTotalMensal)}</td>
                        <td>100%</td>
                      </tr>
                    </tbody>
                  </table>
                </section>

                <section className="card">
                  <h3>Horizontes Temporais & Custos Unitários</h3>
                  <table>
                    <tbody>
                      <tr>
                        <td>Custo Operacional Diário ({atual.kmDiario.toFixed(1)} km/dia)</td>
                        <td>
                          <strong>{formatBRL(atual.custoOperacionalTotalDiario)}</strong>
                        </td>
                      </tr>
                      <tr>
                        <td>Custo Operacional Mensal ({atual.kmMensal.toFixed(1)} km/mês)</td>
                        <td>
                          <strong>{formatBRL(atual.custoOperacionalTotalMensal)}</strong>
                        </td>
                      </tr>
                      <tr>
                        <td>Custo Operacional Anual ({atual.kmAnual.toFixed(1)} km/ano)</td>
                        <td>
                          <strong>{formatBRL(atual.custoOperacionalTotalAnual)}</strong>
                        </td>
                      </tr>
                      <tr>
                        <td>Custo por Quilômetro Rodado (R$/km)</td>
                        <td>
                          <strong>{formatBRL(atual.custoPorKm)} / km</strong>
                        </td>
                      </tr>
                      <tr>
                        <td>Custo por Funcionário Transportado</td>
                        <td>
                          <strong>{formatBRL(atual.custoPorFuncionarioMensal)} / mês</strong>
                        </td>
                      </tr>
                      <tr>
                        <td>Custo Médio por Ônibus Alocado</td>
                        <td>
                          <strong>{formatBRL(atual.custoMedioPorOnibusMensal)} / mês</strong>
                        </td>
                      </tr>
                      <tr>
                        <td>Custo Médio por Linha / Turno</td>
                        <td>
                          <strong>{formatBRL(atual.custoMedioPorLinhaMensal)} / mês</strong>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </section>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};
