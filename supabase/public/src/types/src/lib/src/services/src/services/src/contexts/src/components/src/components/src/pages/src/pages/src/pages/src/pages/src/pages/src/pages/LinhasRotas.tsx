import React, { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Industria, Linha, Motorista, Onibus, PontoEmbarque } from '../types/database';

export const LinhasRotas: React.FC = () => {
  const { user } = useAuth();
  const [linhas, setLinhas] = useState<Linha[]>([]);
  const [industrias, setIndustrias] = useState<Industria[]>([]);
  const [onibus, setOnibus] = useState<Onibus[]>([]);
  const [motoristas, setMotoristas] = useState<Motorista[]>([]);

  const [form, setForm] = useState({
    industria_id: '',
    onibus_id: '',
    motorista_id: '',
    codigo_linha: '',
    nome_rota: '',
    turno: '1º Turno',
    horario_saida: '05:00',
    horario_chegada: '06:00',
    km_ida_volta: 0,
    viagens_por_dia: 1,
    passageiros_alocados: 0,
  });

  const [pontos, setPontos] = useState<PontoEmbarque[]>([]);
  const [novoPonto, setNovoPonto] = useState({ local: '', horario: '05:10' });

  const carregarTudo = async () => {
    if (!user) return;
    const [rLin, rInd, rBus, rMot] = await Promise.all([
      supabase.from('linhas').select('*').eq('user_id', user.id).order('codigo_linha'),
      supabase.from('industrias').select('*').eq('user_id', user.id),
      supabase.from('onibus').select('*').eq('user_id', user.id),
      supabase.from('motoristas').select('*').eq('user_id', user.id),
    ]);
    setLinhas(rLin.data || []);
    setIndustrias(rInd.data || []);
    setOnibus(rBus.data || []);
    setMotoristas(rMot.data || []);
  };

  useEffect(() => {
    carregarTudo();
  }, [user]);

  const adicionarPonto = () => {
    if (!novoPonto.local.trim()) return;
    setPontos([
      ...pontos,
      { ordem: pontos.length + 1, local: novoPonto.local, horario: novoPonto.horario },
    ]);
    setNovoPonto({ local: '', horario: '05:15' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    await supabase.from('linhas').insert({
      ...form,
      user_id: user.id,
      onibus_id: form.onibus_id || null,
      motorista_id: form.motorista_id || null,
      pontos_embarque: pontos,
    });

    setForm({
      ...form,
      codigo_linha: '',
      nome_rota: '',
      km_ida_volta: 0,
      passageiros_alocados: 0,
    });
    setPontos([]);
    carregarTudo();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir esta linha?')) return;
    await supabase.from('linhas').delete().eq('id', id);
    carregarTudo();
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>Cadastro de Linhas, Rotas, Pontos de Embarque e Turnos</h2>
        <p>Vincule cada rota a uma indústria, veículo, motorista, quilometragem e pontos de parada.</p>
      </div>

      <section className="card">
        <h3>Nova Linha Operacional</h3>
        <form onSubmit={handleSubmit} className="grid-form">
          <label>
            Indústria Contratante
            <select
              required
              value={form.industria_id}
              onChange={(e) => setForm({ ...form, industria_id: e.target.value })}
            >
              <option value="">Selecione a indústria...</option>
              {industrias.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.razao_social} ({i.quantidade_turnos} turnos)
                </option>
              ))}
            </select>
          </label>
          <label>
            Código da Linha
            <input
              required
              value={form.codigo_linha}
              onChange={(e) => setForm({ ...form, codigo_linha: e.target.value })}
              placeholder="L-01"
            />
          </label>
          <label>
            Nome da Rota / Bairro
            <input
              required
              value={form.nome_rota}
              onChange={(e) => setForm({ ...form, nome_rota: e.target.value })}
              placeholder="Centro -> Distrito Industrial"
            />
          </label>
          <label>
            Turno Atendido
            <input
              required
              value={form.turno}
              onChange={(e) => setForm({ ...form, turno: e.target.value })}
              placeholder="1º Turno / 2º Turno / 3º Turno / Madrugada"
            />
          </label>
          <label>
            Ônibus Alocado
            <select
              value={form.onibus_id}
              onChange={(e) => setForm({ ...form, onibus_id: e.target.value })}
            >
              <option value="">-- Nenhum veículo vinculado --</option>
              {onibus.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.placa} — {b.modelo} ({b.capacidade_passageiros} lug.)
                </option>
              ))}
            </select>
          </label>
          <label>
            Motorista Escalado
            <select
              value={form.motorista_id}
              onChange={(e) => setForm({ ...form, motorista_id: e.target.value })}
            >
              <option value="">-- Nenhum motorista vinculado --</option>
              {motoristas.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nome} ({m.turno_principal})
                </option>
              ))}
            </select>
          </label>
          <label>
            Horário Saída
            <input
              type="time"
              required
              value={form.horario_saida}
              onChange={(e) => setForm({ ...form, horario_saida: e.target.value })}
            />
          </label>
          <label>
            Horário Chegada
            <input
              type="time"
              required
              value={form.horario_chegada}
              onChange={(e) => setForm({ ...form, horario_chegada: e.target.value })}
            />
          </label>
          <label>
            Distância Ida + Volta (KM)
            <input
              type="number"
              step="0.1"
              required
              value={form.km_ida_volta}
              onChange={(e) => setForm({ ...form, km_ida_volta: Number(e.target.value) })}
            />
          </label>
          <label>
            Viagens por Dia (neste turno)
            <input
              type="number"
              min={1}
              required
              value={form.viagens_por_dia}
              onChange={(e) => setForm({ ...form, viagens_por_dia: Number(e.target.value) })}
            />
          </label>
          <label>
            Passageiros Alocados
            <input
              type="number"
              min={0}
              value={form.passageiros_alocados}
              onChange={(e) => setForm({ ...form, passageiros_alocados: Number(e.target.value) })}
            />
          </label>

          {/* Sub-cadastro de Pontos de Embarque */}
          <div className="full-span sub-box">
            <strong>Pontos de Embarque da Rota ({pontos.length})</strong>
            <div className="inline-row">
              <input
                placeholder="Endereço / Referência do ponto"
                value={novoPonto.local}
                onChange={(e) => setNovoPonto({ ...novoPonto, local: e.target.value })}
              />
              <input
                type="time"
                value={novoPonto.horario}
                onChange={(e) => setNovoPonto({ ...novoPonto, horario: e.target.value })}
              />
              <button type="button" className="btn-secondary" onClick={adicionarPonto}>
                <Plus size={16} /> Add Ponto
              </button>
            </div>
            {pontos.length > 0 && (
              <ul className="pontos-list">
                {pontos.map((p, idx) => (
                  <li key={idx}>
                    #{p.ordem} — <strong>{p.horario}</strong>: {p.local}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="form-actions-inline">
            <button type="submit" className="btn-primary">
              Salvar Linha e Rota
            </button>
          </div>
        </form>
      </section>

      <section className="card">
        <h3>Linhas Cadastradas ({linhas.length})</h3>
        <div className="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Código / Rota</th>
                <th>Indústria</th>
                <th>Turno / Horário</th>
                <th>KM/Dia</th>
                <th>Recursos (Bus / Mot)</th>
                <th>Pontos</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((l) => {
                const ind = industrias.find((i) => i.id === l.industria_id);
                const bus = onibus.find((b) => b.id === l.onibus_id);
                const mot = motoristas.find((m) => m.id === l.motorista_id);
                return (
                  <tr key={l.id}>
                    <td>
                      <strong>{l.codigo_linha}</strong> — {l.nome_rota}
                    </td>
                    <td>{ind?.razao_social || '—'}</td>
                    <td>
                      {l.turno} ({l.horario_saida.slice(0, 5)} - {l.horario_chegada.slice(0, 5)})
                    </td>
                    <td>{(l.km_ida_volta * l.viagens_por_dia).toFixed(1)} km</td>
                    <td>
                      <div>Bus: {bus ? bus.placa : <span className="text-danger">Pendente</span>}</div>
                      <div>Mot: {mot ? mot.nome : <span className="text-danger">Pendente</span>}</div>
                    </td>
                    <td>{l.pontos_embarque?.length || 0} paradas</td>
                    <td>
                      <button className="btn-icon danger" onClick={() => handleDelete(l.id)}>
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
