import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { ConfiguracaoFinanceira, Industria, Linha, Motorista, Onibus } from '../types/database';
import { calcularFinanceiroIndustria, formatBRL } from '../services/calculator';

export const Simulador: React.FC = () => {
  const { user } = useAuth();
  const [industrias, setIndustrias] = useState<Industria[]>([]);
  const [linhas, setLinhas] = useState<Linha[]>([]);
  const [onibus, setOnibus] = useState<Onibus[]>([]);
  const [motoristas, setMotoristas] = useState<Motorista[]>([]);
  const [baseConfig, setBaseConfig] = useState<ConfiguracaoFinanceira | null>(null);

  const [selectedIndId, setSelectedIndId] = useState('');
  const [simDiesel, setSimDiesel] = useState(0);
  const [simMargem, setSimMargem] = useState(15);
  const [simDiasMes, setSimDiasMes] = useState(22);
  const [simFuncionarios, setSimFuncionarios] = useState(100);
  const [simTurnos, setSimTurnos] = useState(3);

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      const [rCfg, rInd, rBus, rMot, rLin] = await Promise.all([
        supabase.from('configuracoes_financeiras').select('*').eq('user_id', user.id).maybeSingle(),
        supabase.from('industrias').select('*').eq('user_id', user.id),
        supabase.from('onibus').select('*').eq('user_id', user.id),
        supabase.from('motoristas').select('*').eq('user_id', user.id),
        supabase.from('linhas').select('*').eq('user_id', user.id),
      ]);

      const cfg: ConfiguracaoFinanceira = rCfg.data || {
        user_id: user.id,
        preco_diesel_litro: 6.0,
        aliquota_impostos_percent: 11.33,
        encargos_trabalhistas_percent: 68,
        despesa_administrativa_mensal: 5000,
        margem_lucro_desejada_percent: 15,
      };

      setBaseConfig(cfg);
      setSimDiesel(cfg.preco_diesel_litro);
      setSimMargem(cfg.margem_lucro_desejada_percent);

      const inds: Industria[] = rInd.data || [];
      setIndustrias(inds);
      setLinhas(rLin.data || []);
      setOnibus(rBus.data || []);
      setMotoristas(rMot.data || []);

      if (inds.length > 0) {
        setSelectedIndId(inds[0].id);
        setSimDiasMes(inds[0].dias_uteis_mes);
        setSimFuncionarios(inds[0].total_funcionarios_transportados);
        setSimTurnos(inds[0].quantidade_turnos);
      }
    };
    load();
  }, [user]);

  const indOriginal = industrias.find((i) => i.id === selectedIndId);

  if (!indOriginal || !baseConfig) {
    return (
      <div className="page-container">
        <div className="card">Cadastre ao menos uma indústria para utilizar o simulador de cenários.</div>
      </div>
    );
  }

  const calculoOriginal = calcularFinanceiroIndustria(
    indOriginal,
    linhas.filter((l) => l.industria_id === indOriginal.id),
    onibus,
    motoristas,
    baseConfig,
    Math.max(1, industrias.length)
  );

  // Aplica variáveis simuladas sem alterar o banco de dados
  const indSimulada: Industria = {
    ...indOriginal,
    dias_uteis_mes: simDiasMes,
    total_funcionarios_transportados: simFuncionarios,
    quantidade_turnos: simTurnos,
  };

  const cfgSimulada: ConfiguracaoFinanceira = {
    ...baseConfig,
    preco_diesel_litro: simDiesel,
    margem_lucro_desejada_percent: simMargem,
  };

  const calculoSimulado = calcularFinanceiroIndustria(
    indSimulada,
    linhas.filter((l) => l.industria_id === indOriginal.id),
    onibus,
    motoristas,
    cfgSimulada,
    Math.max(1, industrias.length)
  );

  const diferencaPreco =
    calculoSimulado.precoRecomendadoMensal - calculoOriginal.precoRecomendadoMensal;

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>Simulador de Cenários Financeiros (What-If)</h2>
        <p>Teste variações de diesel, dias úteis, turnos e margem sem alterar seus dados salvos.</p>
      </div>

      <section className="card">
        <div className="grid-form">
          <label>
            Contrato Base
            <select
              value={selectedIndId}
              onChange={(e) => {
                const found = industrias.find((i) => i.id === e.target.value);
                setSelectedIndId(e.target.value);
                if (found) {
                  setSimDiasMes(found.dias_uteis_mes);
                  setSimFuncionarios(found.total_funcionarios_transportados);
                  setSimTurnos(found.quantidade_turnos);
                }
              }}
            >
              {industrias.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.razao_social}
                </option>
              ))}
            </select>
          </label>
          <label>
            Diesel Simulado (R$/L)
            <input
              type="number"
              step="0.01"
              value={simDiesel}
              onChange={(e) => setSimDiesel(Number(e.target.value))}
            />
          </label>
          <label>
            Dias Úteis / Mês
            <input
              type="number"
              min={1}
              max={31}
              value={simDiasMes}
              onChange={(e) => setSimDiasMes(Number(e.target.value))}
            />
          </label>
          <label>
            Quantidade de Turnos
            <input
              type="number"
              min={1}
              max={10}
              value={simTurnos}
              onChange={(e) => setSimTurnos(Number(e.target.value))}
            />
          </label>
          <label>
            Funcionários Transportados
            <input
              type="number"
              min={1}
              value={simFuncionarios}
              onChange={(e) => setSimFuncionarios(Number(e.target.value))}
            />
          </label>
          <label>
            Margem Alvo Simulada (%)
            <input
              type="number"
              step="0.5"
              value={simMargem}
              onChange={(e) => setSimMargem(Number(e.target.value))}
            />
          </label>
        </div>
      </section>

      <div className="card">
        <h3>Comparativo: Cenário Atual vs. Cenário Simulado</h3>
        <table>
          <thead>
            <tr>
              <th>Indicador</th>
              <th>Cenário Base (Banco)</th>
              <th>Cenário Simulado</th>
              <th>Variação</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Custo Combustível Mensal</td>
              <td>{formatBRL(calculoOriginal.custoCombustivelMensal)}</td>
              <td>{formatBRL(calculoSimulado.custoCombustivelMensal)}</td>
              <td>
                {formatBRL(
                  calculoSimulado.custoCombustivelMensal - calculoOriginal.custoCombustivelMensal
                )}
              </td>
            </tr>
            <tr>
              <td>Custo Operacional Total Mensal</td>
              <td>{formatBRL(calculoOriginal.custoOperacionalTotalMensal)}</td>
              <td>{formatBRL(calculoSimulado.custoOperacionalTotalMensal)}</td>
              <td>
                {formatBRL(
                  calculoSimulado.custoOperacionalTotalMensal -
                    calculoOriginal.custoOperacionalTotalMensal
                )}
              </td>
            </tr>
            <tr>
              <td>Custo por Funcionário / Mês</td>
              <td>{formatBRL(calculoOriginal.custoPorFuncionarioMensal)}</td>
              <td>{formatBRL(calculoSimulado.custoPorFuncionarioMensal)}</td>
              <td>
                {formatBRL(
                  calculoSimulado.custoPorFuncionarioMensal -
                    calculoOriginal.custoPorFuncionarioMensal
                )}
              </td>
            </tr>
            <tr>
              <td>Preço Mínimo (Break-Even)</td>
              <td>{formatBRL(calculoOriginal.precoMinimoSemLucroMensal)}</td>
              <td>{formatBRL(calculoSimulado.precoMinimoSemLucroMensal)}</td>
              <td>
                {formatBRL(
                  calculoSimulado.precoMinimoSemLucroMensal -
                    calculoOriginal.precoMinimoSemLucroMensal
                )}
              </td>
            </tr>
            <tr className="total-row">
              <td>Preço Recomendado Final</td>
              <td>{formatBRL(calculoOriginal.precoRecomendadoMensal)}</td>
              <td>{formatBRL(calculoSimulado.precoRecomendadoMensal)}</td>
              <td>{formatBRL(diferencaPreco)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};
