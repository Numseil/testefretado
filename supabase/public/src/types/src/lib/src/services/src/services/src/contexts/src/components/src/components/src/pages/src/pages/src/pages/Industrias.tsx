import React, { useEffect, useState } from 'react';
import { Trash2, Edit3 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Industria } from '../types/database';
import { formatBRL } from '../services/calculator';

const initialForm = {
  razao_social: '',
  cnpj: '',
  dias_operacao_semana: 5,
  dias_uteis_mes: 22,
  operacao_24h: false,
  quantidade_turnos: 3,
  total_funcionarios_transportados: 0,
  valor_contrato_mensal_atual: 0,
  status_contrato: 'ativo' as Industria['status_contrato'],
  data_inicio_contrato: '',
  data_fim_contrato: '',
};

export const Industrias: React.FC = () => {
  const { user } = useAuth();
  const [lista, setLista] = useState<Industria[]>([]);
  const [form, setForm] = useState(initialForm);
  const [editId, setEditId] = useState<string | null>(null);

  const fetchIndustrias = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('industrias')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setLista(data || []);
  };

  useEffect(() => {
    fetchIndustrias();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const payload = {
      ...form,
      user_id: user.id,
      data_inicio_contrato: form.data_inicio_contrato || null,
      data_fim_contrato: form.data_fim_contrato || null,
    };

    if (editId) {
      await supabase.from('industrias').update(payload).eq('id', editId);
      setEditId(null);
    } else {
      await supabase.from('industrias').insert(payload);
    }

    setForm(initialForm);
    fetchIndustrias();
  };

  const handleEdit = (ind: Industria) => {
    setEditId(ind.id);
    setForm({
      razao_social: ind.razao_social,
      cnpj: ind.cnpj,
      dias_operacao_semana: ind.dias_operacao_semana,
      dias_uteis_mes: ind.dias_uteis_mes,
      operacao_24h: ind.operacao_24h,
      quantidade_turnos: ind.quantidade_turnos,
      total_funcionarios_transportados: ind.total_funcionarios_transportados,
      valor_contrato_mensal_atual: ind.valor_contrato_mensal_atual,
      status_contrato: ind.status_contrato,
      data_inicio_contrato: ind.data_inicio_contrato || '',
      data_fim_contrato: ind.data_fim_contrato || '',
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remover esta indústria e suas linhas vinculadas?')) return;
    await supabase.from('industrias').delete().eq('id', id);
    fetchIndustrias();
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>Cadastro de Indústrias e Contratos</h2>
        <p>Configure o calendário operacional próprio, turnos (3 ou mais), regime 24h e valores contratuais.</p>
      </div>

      <section className="card">
        <h3>{editId ? 'Editar Indústria / Contrato' : 'Nova Indústria Contratante'}</h3>
        <form onSubmit={handleSubmit} className="grid-form">
          <label>
            Razão Social / Planta
            <input
              required
              value={form.razao_social}
              onChange={(e) => setForm({ ...form, razao_social: e.target.value })}
              placeholder="Ex: Metalúrgica Alfa Ltda"
            />
          </label>
          <label>
            CNPJ
            <input
              required
              value={form.cnpj}
              onChange={(e) => setForm({ ...form, cnpj: e.target.value })}
              placeholder="00.000.000/0001-00"
            />
          </label>
          <label>
            Dias de Operação / Semana
            <input
              type="number"
              min={1}
              max={7}
              required
              value={form.dias_operacao_semana}
              onChange={(e) => setForm({ ...form, dias_operacao_semana: Number(e.target.value) })}
            />
          </label>
          <label>
            Dias Úteis / Mês (Calendário Próprio)
            <input
              type="number"
              min={1}
              max={31}
              required
              value={form.dias_uteis_mes}
              onChange={(e) => setForm({ ...form, dias_uteis_mes: Number(e.target.value) })}
            />
          </label>
          <label>
            Quantidade de Turnos (3 ou mais)
            <input
              type="number"
              min={1}
              max={10}
              required
              value={form.quantidade_turnos}
              onChange={(e) => setForm({ ...form, quantidade_turnos: Number(e.target.value) })}
            />
          </label>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={form.operacao_24h}
              onChange={(e) => setForm({ ...form, operacao_24h: e.target.checked })}
            />
            Funcionamento Ininterrupto (24 Horas)
          </label>
          <label>
            Total de Funcionários Transportados
            <input
              type="number"
              min={0}
              required
              value={form.total_funcionarios_transportados}
              onChange={(e) =>
                setForm({ ...form, total_funcionarios_transportados: Number(e.target.value) })
              }
            />
          </label>
          <label>
            Valor Atual do Contrato Mensal (R$)
            <input
              type="number"
              step="0.01"
              min={0}
              value={form.valor_contrato_mensal_atual}
              onChange={(e) =>
                setForm({ ...form, valor_contrato_mensal_atual: Number(e.target.value) })
              }
            />
          </label>
          <label>
            Status do Contrato
            <select
              value={form.status_contrato}
              onChange={(e) =>
                setForm({
                  ...form,
                  status_contrato: e.target.value as Industria['status_contrato'],
                })
              }
            >
              <option value="ativo">Ativo</option>
              <option value="em_negociacao">Em Negociação / Proposta</option>
              <option value="encerrado">Encerrado</option>
            </select>
          </label>
          <label>
            Início Vigência
            <input
              type="date"
              value={form.data_inicio_contrato}
              onChange={(e) => setForm({ ...form, data_inicio_contrato: e.target.value })}
            />
          </label>
          <label>
            Fim Vigência
            <input
              type="date"
              value={form.data_fim_contrato}
              onChange={(e) => setForm({ ...form, data_fim_contrato: e.target.value })}
            />
          </label>

          <div className="form-actions-inline">
            <button type="submit" className="btn-primary">
              {editId ? 'Atualizar Contrato' : 'Cadastrar Indústria'}
            </button>
            {editId && (
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setEditId(null);
                  setForm(initialForm);
                }}
              >
                Cancelar
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="card">
        <h3>Indústrias Cadastradas ({lista.length})</h3>
        <div className="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Indústria / CNPJ</th>
                <th>Calendário</th>
                <th>Turnos</th>
                <th>Funcionários</th>
                <th>Contrato Mensal</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((ind) => (
                <tr key={ind.id}>
                  <td>
                    <strong>{ind.razao_social}</strong>
                    <div className="subtext">{ind.cnpj}</div>
                  </td>
                  <td>
                    {ind.dias_operacao_semana}d/sem • <strong>{ind.dias_uteis_mes}d/mês</strong>
                  </td>
                  <td>
                    {ind.quantidade_turnos} turnos {ind.operacao_24h && <span className="badge">24h</span>}
                  </td>
                  <td>{ind.total_funcionarios_transportados}</td>
                  <td>{formatBRL(ind.valor_contrato_mensal_atual)}</td>
                  <td>{ind.status_contrato.toUpperCase()}</td>
                  <td className="actions-cell">
                    <button className="btn-icon" onClick={() => handleEdit(ind)} title="Editar">
                      <Edit3 size={16} />
                    </button>
                    <button className="btn-icon danger" onClick={() => handleDelete(ind.id)} title="Excluir">
                      <Trash2 size={16} />
                    </button>
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
