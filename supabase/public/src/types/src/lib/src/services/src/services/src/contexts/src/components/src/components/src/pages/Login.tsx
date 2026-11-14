import React, { useState } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    if (isRegister) {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) setMessage(`Erro: ${error.message}`);
      else setMessage('Conta criada! Verifique seu e-mail ou faça login.');
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMessage(`Erro de autenticação: ${error.message}`);
    }
    setLoading(false);
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>TUPY</h1>
          <p>GESTÃO DE TRANSPORTES CORPORATIVOS</p>
        </div>

        {!isSupabaseConfigured && (
          <div className="alert-warning">
            <strong>Configuração Pendente:</strong> Defina <code>VITE_SUPABASE_URL</code> e{' '}
            <code>VITE_SUPABASE_ANON_KEY</code> no arquivo <code>.env</code> antes de autenticar.
          </div>
        )}

        <form onSubmit={handleSubmit} className="form-stack">
          <label>
            E-mail Corporativo
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="gestor@tupytransportes.com.br"
            />
          </label>
          <label>
            Senha
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </label>

          {message && <div className="form-feedback">{message}</div>}

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Processando...' : isRegister ? 'Criar Conta de Gestor' : 'Acessar Sistema'}
          </button>
        </form>

        <button
          type="button"
          className="btn-link"
          onClick={() => setIsRegister(!isRegister)}
        >
          {isRegister ? 'Já possui cadastro? Entrar' : 'Primeiro acesso? Cadastrar usuário'}
        </button>
      </div>
    </div>
  );
};
