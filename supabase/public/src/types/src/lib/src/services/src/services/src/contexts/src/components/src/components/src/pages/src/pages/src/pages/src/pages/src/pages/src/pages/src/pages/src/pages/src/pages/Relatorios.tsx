import React, { useEffect, useState } from 'react';
import { FileText, FileSpreadsheet } from 'lucide-react';
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
import { calcularFinanceiroIndustria } from '../services/calculator';
import { exportarRelatorioExcel, exportarRelatorioPDF } from '../services/exportService';

export const Relatorios: React.FC = () => {
  const { user } = useAuth();
  const [calculos, setCalculos] = useState<CalculoContratoDetalhado[]>([]);

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
        preco_diesel_litro: 0,
        aliquota_impostos_percent: 0,
        encargos_trabalhistas_percent: 0,
        despesa_administrativa_mensal: 0,
        margem_lucro_desejada_percent: 15,
      };

      const inds: Industria[] = rInd.data || [];
      setCalculos(
        inds.map((ind) =>
          calcularFinanceiroIndustria(
            ind,
            (rLin.data || []).filter((l: Linha) => l.industria_id === ind.id),
            (rBus.data || []) as Onibus[],
            (rMot.data || []) as Motorista[],
            cfg,
            Math.max(1, inds.length)
          )
        )
      );
    };
    load();
  }, [user]);

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>Exportação de Relatórios Gerenciais</h2>
        <p>Gere documentos executivos em PDF ou planilhas auditáveis em Excel (.xlsx).</p>
      </div>

      <div className="two-col">
        <div className="card export-card">
          <FileText size={36} />
          <h3>Relatório Executivo PDF</h3>
          <p>
            Inclui quadro comparativo de contratos, margem líquida, ponto de equilíbrio e composição
            analítica por indústria.
          </p>
          <button
            className="btn-primary"
            disabled={calculos.length === 0}
            onClick={() => exportarRelatorioPDF(calculos)}
          >
            Baixar PDF Completo
          </button>
        </div>

        <div className="card export-card">
          <FileSpreadsheet size={36} />
          <h3>Planilha Detalhada Excel (.XLSX)</h3>
          <p>
            Exporta todos os indicadores diários, mensais, anuais, custo/km, custo/funcionário e
            pendências de cadastro.
          </p>
          <button
            className="btn-primary"
            disabled={calculos.length === 0}
            onClick={() => exportarRelatorioExcel(calculos)}
          >
            Baixar Planilha Excel
          </button>
        </div>
      </div>
    </div>
  );
};
