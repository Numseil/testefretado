import React, { useEffect, useState } from 'react';
import { Trash2, Edit3 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Motorista } from '../types/database';
import { formatBRL } from '../services/calculator';

const initialDriver = {
  nome: '',
  cnh_categoria: 'D',
  turno_principal: '1º Turno (Manhã)',
  salario_base_mensal: 0,
  adicional_noturno_mensal: 0,
  horas_extras_mensais: 0,
  beneficios_mensais: 0,
  ativo: true,
};

export const Motoristas: React.FC = () => {
  const { user } = useAuth();
  const [lista, setLista] = useState<Motorista[]>([]);
  const [encargosPercent, setEncargosPercent] = useState(0);
  const [form, setForm] = useState(initialDriver);
  const [editId, setEditId] = useState<string | null>(null);

  const carregar = async () => {
    if (!user) return;
    const [resMot, resCfg] = await Promise.all([
      supabase.from('motoristas').select('*').eq('user_id', user.id).order('nome'),
      supabase.from('configuracoes_financeiras').select('encargos_trabalhistas_percent').eq('user_id', user.id).maybeSingle(),
    ]);
    setLista(resMot.data || []);
    setEncargosPercent(resCfg.data?.encargos_trabalhistas_percent || 0);
  };

  useEffect(() => {
    carregar();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const payload = { ...form, user_id: user.id };
    if (editId) {
      await supabase.from('motoristas').update(payload).eq('id', editId);
      setEditId(null);
    } else {
      await supabase.from('motoristas').insert(payload);
    }
    setForm(initialDriver);
    carregar();
  };

  const handleEdit = (m: Motorista) => {
    setEditId(m.id);
    setForm({
      nome: m.nome,
      cnh_categoria: m.cnh_categoria,
      turno_principal: m.turno_principal,
      salario_base_mensal: m.salario_base_mensal,
      adicional_noturno_mensal: m.adicional_noturno_mensal,
      horas_extras_mensais: m.horas_extras_mensais,
      beneficios_mensais: m.beneficios_mensais,
      ativo: m.ativo,
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remover motorista?')) return;
    await supabase.from('motoristas').delete().eq('id', id);
    carregar();
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>Cadastro de Motoristas e Custos Trabalhistas</h2>
        <p>
          Encargos trabalhistas vigentes configurados no Dashboard: <strong>{encargosPercent}%</strong>
        </p>
      </div>

      <section className="card">
        <h3>{editId ? 'Editar Motorista' : 'Cadastrar Motorista'}</h3>
        <form onSubmit={handleSubmit} className="grid-form">
          <label>
            Nome Completo
            <input
              required
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
            />
          </label>
          <label>
            Categoria CNH
            <select
              value={form.cnh_categoria}
              onChange={(e) => setForm({ ...form, cnh_categoria: e.target.value })}
            >
              <option value="D">Categoria D</option>
              <option value="E">Categoria E</option>
            </select>
          </label>
          <label>
            Turno Principal
            <input
              required
              value={form.turno_principal}
              onChange={(e) => setForm({ ...form, turno_principal: e.target.value })}
              placeholder="Ex: 3º Turno / Madrugada"
            />
          </label>
          <label>
            Salário Base Mensal (R$)
            <input
              type="number"
              step="0.01"
              required
              value={form.salario_base_mensal}
              onChange={(e) => setForm({ ...form, salario_base_mensal: Number(e.target.value) })}
            />
          </label>
          <label>
            Adicional Noturno Mensal (R$)
            <input
              type="number"
              step="0.01"
              value={form.adicional_noturno_mensal}
              onChange={(e) =>
                setForm({ ...form, adicional_noturno_mensal: Number(e.target.value) })
              }
            />
          </label>
          <label>
            Horas Extras Médias Mensais (R$)
            <input
              type="number"
              step="0.01"
              value={form.horas_extras_mensais}
              onChange={(e) => setForm({ ...form, horas_extras_mensais: Number(e.target.value) })}
            />
          </label>
          <label>
            Benefícios (VA/VR/Saúde) (R$)
            <input
              type="number"
              step="0.01"
              value={form.beneficios_mensais}
              onChange={(e) => setForm({ ...form, beneficios_mensais: Number(e.target.value) })}
            />
          </label>

          <div className="form-actions-inline">
            <button type="submit" className="btn-primary">
              {editId ? 'Atualizar Motorista' : 'Cadastrar Motorista'}
            </button>
          </div>
        </form>
      </section>

      <section className="card">
        <h3>Quadro de Motoristas ({lista.length})</h3>
        <div className="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Nome / CNH</th>
                <th>Turno</th>
                <th>Salário + Adicionais</th>
                <th>Encargos ({encargosPercent}%)</th>
                <th>Benefícios</th>
                <th>Custo Total Empresa/Mês</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((m) => {
                const base =
                  Number(m.salario_base_mensal) +
                  Number(m.adicional_noturno_mensal) +
                  Number(m.horas_extras_mensais);
                const encargos = base * (encargosPercent / 100);
                const total = base + encargos + Number(m.beneficios_mensais);
                return (
                  <tr key={m.id}>
                    <td>
                      <strong>{m.nome}</strong> <span className="badge">CNH {m.cnh_categoria}</span>
                    </td>
                    <td>{m.turno_principal}</td>
                    <td>{formatBRL(base)}</td>
                    <td>{formatBRL(encargos)}</td>
                    <td>{formatBRL(m.beneficios_mensais)}</td>
                    <td>
                      <strong>{formatBRL(total)}</strong>
                    </td>
                    <td className="actions-cell">
                      <button className="btn-icon" onClick={() => handleEdit(m)}>
                        <Edit3 size={16} />
                      </button>
                      <button className="btn-icon danger" onClick={() => handleDelete(m.id)}>
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
