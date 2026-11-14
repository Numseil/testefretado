import React, { useEffect, useState } from 'react';
import { Trash2, Edit3 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Onibus } from '../types/database';
import { formatBRL } from '../services/calculator';

const initialBus = {
  placa: '',
  modelo: '',
  ano_fabricacao: new Date().getFullYear(),
  capacidade_passageiros: 44,
  valor_aquisicao: 0,
  valor_residual: 0,
  vida_util_meses: 60,
  consumo_km_litro: 3.2,
  manutencao_mensal_estimada: 0,
  seguro_licenciamento_mensal: 0,
  status: 'ativo' as Onibus['status'],
};

export const Frota: React.FC = () => {
  const { user } = useAuth();
  const [frota, setFrota] = useState<Onibus[]>([]);
  const [form, setForm] = useState(initialBus);
  const [editId, setEditId] = useState<string | null>(null);

  const carregarFrota = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('onibus')
      .select('*')
      .eq('user_id', user.id)
      .order('placa');
    setFrota(data || []);
  };

  useEffect(() => {
    carregarFrota();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const payload = { ...form, placa: form.placa.toUpperCase(), user_id: user.id };
    if (editId) {
      await supabase.from('onibus').update(payload).eq('id', editId);
      setEditId(null);
    } else {
      await supabase.from('onibus').insert(payload);
    }
    setForm(initialBus);
    carregarFrota();
  };

  const handleEdit = (bus: Onibus) => {
    setEditId(bus.id);
    setForm({
      placa: bus.placa,
      modelo: bus.modelo,
      ano_fabricacao: bus.ano_fabricacao,
      capacidade_passageiros: bus.capacidade_passageiros,
      valor_aquisicao: bus.valor_aquisicao,
      valor_residual: bus.valor_residual,
      vida_util_meses: bus.vida_util_meses,
      consumo_km_litro: bus.consumo_km_litro,
      manutencao_mensal_estimada: bus.manutencao_mensal_estimada,
      seguro_licenciamento_mensal: bus.seguro_licenciamento_mensal,
      status: bus.status,
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este veículo da frota?')) return;
    await supabase.from('onibus').delete().eq('id', id);
    carregarFrota();
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>Cadastro de Ônibus e Controle da Frota</h2>
        <p>Gerencie consumo médio (km/L), depreciação linear, manutenção preventiva e seguros.</p>
      </div>

      <section className="card">
        <h3>{editId ? 'Editar Veículo' : 'Cadastrar Ônibus'}</h3>
        <form onSubmit={handleSubmit} className="grid-form">
          <label>
            Placa
            <input
              required
              value={form.placa}
              onChange={(e) => setForm({ ...form, placa: e.target.value })}
              placeholder="ABC-1D23"
            />
          </label>
          <label>
            Modelo / Carroceria
            <input
              required
              value={form.modelo}
              onChange={(e) => setForm({ ...form, modelo: e.target.value })}
              placeholder="Marcopolo Viaggio 900"
            />
          </label>
          <label>
            Ano Fabricação
            <input
              type="number"
              required
              value={form.ano_fabricacao}
              onChange={(e) => setForm({ ...form, ano_fabricacao: Number(e.target.value) })}
            />
          </label>
          <label>
            Lotação (Assentos)
            <input
              type="number"
              required
              value={form.capacidade_passageiros}
              onChange={(e) => setForm({ ...form, capacidade_passageiros: Number(e.target.value) })}
            />
          </label>
          <label>
            Consumo Médio (km/L)
            <input
              type="number"
              step="0.01"
              required
              value={form.consumo_km_litro}
              onChange={(e) => setForm({ ...form, consumo_km_litro: Number(e.target.value) })}
            />
          </label>
          <label>
            Valor de Aquisição (R$)
            <input
              type="number"
              step="0.01"
              value={form.valor_aquisicao}
              onChange={(e) => setForm({ ...form, valor_aquisicao: Number(e.target.value) })}
            />
          </label>
          <label>
            Valor Residual Final (R$)
            <input
              type="number"
              step="0.01"
              value={form.valor_residual}
              onChange={(e) => setForm({ ...form, valor_residual: Number(e.target.value) })}
            />
          </label>
          <label>
            Vida Útil Depreciação (Meses)
            <input
              type="number"
              min={1}
              value={form.vida_util_meses}
              onChange={(e) => setForm({ ...form, vida_util_meses: Number(e.target.value) })}
            />
          </label>
          <label>
            Manutenção + Pneus Mensal (R$)
            <input
              type="number"
              step="0.01"
              value={form.manutencao_mensal_estimada}
              onChange={(e) =>
                setForm({ ...form, manutencao_mensal_estimada: Number(e.target.value) })
              }
            />
          </label>
          <label>
            Seguro + IPVA/Licenc. Mensal (R$)
            <input
              type="number"
              step="0.01"
              value={form.seguro_licenciamento_mensal}
              onChange={(e) =>
                setForm({ ...form, seguro_licenciamento_mensal: Number(e.target.value) })
              }
            />
          </label>
          <label>
            Status Operacional
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as Onibus['status'] })}
            >
              <option value="ativo">Ativo em Operação</option>
              <option value="reserva">Frota Reserva</option>
              <option value="manutencao">Em Manutenção</option>
            </select>
          </label>

          <div className="form-actions-inline">
            <button type="submit" className="btn-primary">
              {editId ? 'Salvar Veículo' : 'Adicionar à Frota'}
            </button>
          </div>
        </form>
      </section>

      <section className="card">
        <h3>Frota Cadastrada ({frota.length} veículos)</h3>
        <div className="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Placa / Modelo</th>
                <th>Lugares</th>
                <th>Consumo</th>
                <th>Depreciação/Mês</th>
                <th>Manut. + Seguro/Mês</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {frota.map((bus) => {
                const dep =
                  bus.vida_util_meses > 0
                    ? Math.max(0, bus.valor_aquisicao - bus.valor_residual) / bus.vida_util_meses
                    : 0;
                return (
                  <tr key={bus.id}>
                    <td>
                      <strong>{bus.placa}</strong>
                      <div className="subtext">
                        {bus.modelo} ({bus.ano_fabricacao})
                      </div>
                    </td>
                    <td>{bus.capacidade_passageiros}</td>
                    <td>{bus.consumo_km_litro} km/L</td>
                    <td>{formatBRL(dep)}</td>
                    <td>
                      {formatBRL(
                        Number(bus.manutencao_mensal_estimada) +
                          Number(bus.seguro_licenciamento_mensal)
                      )}
                    </td>
                    <td>{bus.status.toUpperCase()}</td>
                    <td className="actions-cell">
                      <button className="btn-icon" onClick={() => handleEdit(bus)}>
                        <Edit3 size={16} />
                      </button>
                      <button className="btn-icon danger" onClick={() => handleDelete(bus.id)}>
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
