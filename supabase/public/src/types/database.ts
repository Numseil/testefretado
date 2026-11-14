export interface ConfiguracaoFinanceira {
  id?: string;
  user_id: string;
  preco_diesel_litro: number;
  aliquota_impostos_percent: number;
  encargos_trabalhistas_percent: number;
  despesa_administrativa_mensal: number;
  margem_lucro_desejada_percent: number;
}

export interface Industria {
  id: string;
  user_id: string;
  razao_social: string;
  cnpj: string;
  dias_operacao_semana: number;
  dias_uteis_mes: number;
  operacao_24h: boolean;
  quantidade_turnos: number;
  total_funcionarios_transportados: number;
  valor_contrato_mensal_atual: number;
  status_contrato: 'ativo' | 'em_negociacao' | 'encerrado';
  data_inicio_contrato: string | null;
  data_fim_contrato: string | null;
}

export interface Onibus {
  id: string;
  user_id: string;
  placa: string;
  modelo: string;
  ano_fabricacao: number;
  capacidade_passageiros: number;
  valor_aquisicao: number;
  valor_residual: number;
  vida_util_meses: number;
  consumo_km_litro: number;
  manutencao_mensal_estimada: number;
  seguro_licenciamento_mensal: number;
  status: 'ativo' | 'manutencao' | 'reserva';
}

export interface Motorista {
  id: string;
  user_id: string;
  nome: string;
  cnh_categoria: string;
  turno_principal: string;
  salario_base_mensal: number;
  adicional_noturno_mensal: number;
  horas_extras_mensais: number;
  beneficios_mensais: number;
  ativo: boolean;
}

export interface PontoEmbarque {
  ordem: number;
  local: string;
  horario: string;
}

export interface Linha {
  id: string;
  user_id: string;
  industria_id: string;
  onibus_id: string | null;
  motorista_id: string | null;
  codigo_linha: string;
  nome_rota: string;
  turno: string;
  horario_saida: string;
  horario_chegada: string;
  km_ida_volta: number;
  viagens_por_dia: number;
  passageiros_alocados: number;
  pontos_embarque: PontoEmbarque[];
}

export interface HistoricoAlteracao {
  id: string;
  tabela_afetada: string;
  operacao: 'INSERT' | 'UPDATE' | 'DELETE';
  registro_id: string;
  dados_anteriores: Record<string, unknown> | null;
  dados_novos: Record<string, unknown> | null;
  created_at: string;
}

export interface CalculoContratoDetalhado {
  industria: Industria;
  pendencias: string[];
  kmDiario: number;
  kmMensal: number;
  kmAnual: number;
  custoCombustivelMensal: number;
  custoManutencaoMensal: number;
  custoSeguroMensal: number;
  custoDepreciacaoMensal: number;
  custoSalariosEncargosMensal: number;
  custoAdministrativoRateadoMensal: number;
  custoOperacionalTotalDiario: number;
  custoOperacionalTotalMensal: number;
  custoOperacionalTotalAnual: number;
  impostosSobrePrecoRecomendadoMensal: number;
  precoMinimoSemLucroMensal: number; // Ponto de Equilíbrio (Break-even)
  precoRecomendadoMensal: number;
  receitaAtualMensal: number;
  lucroLiquidoAtualMensal: number;
  margemAtualPercent: number;
  custoPorKm: number;
  custoPorFuncionarioMensal: number;
  custoMedioPorOnibusMensal: number;
  custoMedioPorLinhaMensal: number;
  pontoEquilibrioPassageiros: number;
}
