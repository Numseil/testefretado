import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { HistoricoAlteracao } from '../types/database';

export const Auditoria: React.FC = () => {
  const { user } = useAuth();
  const [logs, setLogs] = useState<HistoricoAlteracao[]>([]);

  useEffect(() => {
    const fetchLogs = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('historico_alteracoes')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100);
      setLogs(data || []);
    };
    fetchLogs();
  }, [user]);

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>Histórico de Alterações e Auditoria</h2>
        <p>Registro imutável gerado automaticamente via triggers PostgreSQL no Supabase.</p>
      </div>

      <section className="card">
        <div className="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Data / Hora</th>
                <th>Módulo (Tabela)</th>
                <th>Operação</th>
                <th>Detalhes da Alteração</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td>{new Date(log.created_at).toLocaleString('pt-BR')}</td>
                  <td>
                    <strong>{log.tabela_afetada.toUpperCase()}</strong>
                  </td>
                  <td>
                    <span className={`badge op-${log.operacao.toLowerCase()}`}>{log.operacao}</span>
                  </td>
                  <td>
                    <pre className="json-preview">
                      {JSON.stringify(log.dados_novos || log.dados_anteriores, null, 2)}
                    </pre>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
