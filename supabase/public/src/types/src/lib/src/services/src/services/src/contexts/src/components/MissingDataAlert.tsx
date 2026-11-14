import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  pendencias: string[];
}

export const MissingDataAlert: React.FC<Props> = ({ pendencias }) => {
  if (!pendencias || pendencias.length === 0) return null;

  return (
    <div className="alert-warning">
      <div className="alert-header">
        <AlertTriangle size={18} />
        <strong>Dados Ausentes Identificados ({pendencias.length}) — Cálculo Parcial</strong>
      </div>
      <ul>
        {pendencias.map((item, idx) => (
          <li key={idx}>{item}</li>
        ))}
      </ul>
    </div>
  );
};
