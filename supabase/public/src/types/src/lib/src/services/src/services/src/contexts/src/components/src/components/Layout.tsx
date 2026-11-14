import React, { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
  LayoutDashboard,
  Factory,
  Bus,
  Users,
  Route,
  Calculator,
  Sliders,
  FileSpreadsheet,
  History,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export const Layout: React.FC = () => {
  const { user, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { to: '/', icon: <LayoutDashboard size={18} />, label: 'Dashboard Financeiro' },
    { to: '/industrias', icon: <Factory size={18} />, label: 'Indústrias & Contratos' },
    { to: '/frota', icon: <Bus size={18} />, label: 'Frota de Ônibus' },
    { to: '/motoristas', icon: <Users size={18} />, label: 'Motoristas & Encargos' },
    { to: '/linhas', icon: <Route size={18} />, label: 'Linhas, Rotas & Turnos' },
    { to: '/precificacao', icon: <Calculator size={18} />, label: 'Custos & Precificação' },
    { to: '/simulador', icon: <Sliders size={18} />, label: 'Simulador de Cenários' },
    { to: '/relatorios', icon: <FileSpreadsheet size={18} />, label: 'Relatórios PDF/Excel' },
    { to: '/auditoria', icon: <History size={18} />, label: 'Histórico de Alterações' },
  ];

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileMenuOpen ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <div>
            <h1>TUPY</h1>
            <span>GESTÃO DE TRANSPORTES</span>
          </div>
          <button className="mobile-close" onClick={() => setMobileMenuOpen(false)}>
            <X size={20} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              {item.icon}
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-badge">{user?.email}</div>
          <button onClick={signOut} className="btn-logout">
            <LogOut size={16} /> Sair
          </button>
        </div>
      </aside>

      <div className="main-wrapper">
        <header className="topbar">
          <button className="mobile-toggle" onClick={() => setMobileMenuOpen(true)}>
            <Menu size={22} />
          </button>
          <span className="topbar-title">Sistema Integrado de Fretamento Industrial</span>
        </header>
        <main className="content-area">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
