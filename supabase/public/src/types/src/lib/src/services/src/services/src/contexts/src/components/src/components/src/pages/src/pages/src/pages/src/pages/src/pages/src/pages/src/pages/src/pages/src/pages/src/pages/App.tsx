import React from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Industrias } from './pages/Industrias';
import { Frota } from './pages/Frota';
import { Motoristas } from './pages/Motoristas';
import { LinhasRotas } from './pages/LinhasRotas';
import { Precificacao } from './pages/Precificacao';
import { Simulador } from './pages/Simulador';
import { Relatorios } from './pages/Relatorios';
import { Auditoria } from './pages/Auditoria';

const ProtectedRoutes: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) return <div className="loading-screen">Autenticando sessão TUPY...</div>;
  if (!user) return <Login />;

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/industrias" element={<Industrias />} />
        <Route path="/frota" element={<Frota />} />
        <Route path="/motoristas" element={<Motoristas />} />
        <Route path="/linhas" element={<LinhasRotas />} />
        <Route path="/precificacao" element={<Precificacao />} />
        <Route path="/simulador" element={<Simulador />} />
        <Route path="/relatorios" element={<Relatorios />} />
        <Route path="/auditoria" element={<Auditoria />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
};

export const App: React.FC = () => (
  <AuthProvider>
    <HashRouter>
      <ProtectedRoutes />
    </HashRouter>
  </AuthProvider>
);

export default App;
