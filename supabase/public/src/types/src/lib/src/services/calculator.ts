import {
  CalculoContratoDetalhado,
  ConfiguracaoFinanceira,
  Industria,
  Linha,
  Motorista,
  Onibus,
} from '../types/database';

/**
 * Motor matemático determinístico da TUPY.
 * Não utiliza estimativas ocultas: identifica cada parâmetro ausente e calcula
 * a composição exata baseada exclusivamente nos registros vinculados.
 */
export function calcularFinanceiroIndustria(
  industria: Industria,
  linhasIndustria: Linha[],
  onibusList: Onibus[],
  motoristasList: Motorista[],
  config: ConfiguracaoFinanceira,
  totalIndustriasAtivas: number
): CalculoContratoDetalhado {
  const pendencias: string[] = [];

  if (config.preco_diesel_litro <= 0) {
    pendencias.push('Preço do diesel (R$/L) não informado nos parâmetros financeiros.');
  }
  if (industria.dias_uteis_mes <= 0) {
    pendencias.push(`Dias úteis/mês da indústria "${industria.razao_social}" está zerado.`);
  }
  if (linhasIndustria.length === 0) {
    pendencias.push(`Nenhuma linha/rota cadastrada para "${industria.razao_social}".`);
  }

  let kmDiario = 0;
  let custoCombustivelDiario = 0;
  const onibusUsadosIds = new Set<string>();
  const motoristasUsadosIds = new Set<string>();

  linhasIndustria.forEach((linha) => {
    const kmLinhaDia = Number(linha.km_ida_volta) * Number(linha.viagens_por_dia);
    kmDiario += kmLinhaDia;

    if (kmLinhaDia <= 0) {
      pendencias.push(`Linha ${linha.codigo_linha}: KM ida/volta ou viagens/dia zerados.`);
    }

    if (!linha.onibus_id) {
      pendencias.push(`Linha ${linha.codigo_linha}: nenhum ônibus vinculado.`);
    } else {
      onibusUsadosIds.add(linha.onibus_id);
      const bus = onibusList.find((o) => o.id === linha.onibus_id);
      if (bus) {
        if (bus.consumo_km_litro <= 0) {
          pendencias.push(`Ônibus ${bus.placa}: consumo (km/L) não informado.`);
        } else {
          const litrosDia = kmLinhaDia / Number(bus.consumo_km_litro);
          custoCombustivelDiario += litrosDia * Number(config.preco_diesel_litro);
        }
      }
    }

    if (!linha.motorista_id) {
      pendencias.push(`Linha ${linha.codigo_linha}: nenhum motorista vinculado.`);
    } else {
      motoristasUsadosIds.add(linha.motorista_id);
    }
  });

  const diasMes = Number(industria.dias_uteis_mes) || 0;
  const kmMensal = kmDiario * diasMes;
  const kmAnual = kmMensal * 12;
  const custoCombustivelMensal = custoCombustivelDiario * diasMes;

  // Custos fixos mensais dos veículos alocados nesta indústria
  // (Caso um ônibus atenda mais de uma indústria, rateia proporcionalmente pelo número de linhas dele)
  let custoManutencaoMensal = 0;
  let custoSeguroMensal = 0;
  let custoDepreciacaoMensal = 0;

  onibusUsadosIds.forEach((busId) => {
    const bus = onibusList.find((o) => o.id === busId);
    if (!bus) return;

    const linhasDesteBusNaIndustria = linhasIndustria.filter((l) => l.onibus_id === busId).length;
    const depreciacaoBus =
      bus.vida_util_meses > 0
        ? Math.max(0, Number(bus.valor_aquisicao) - Number(bus.valor_residual)) / Number(bus.vida_util_meses)
        : 0;

    if (bus.valor_aquisicao <= 0) {
      pendencias.push(`Ônibus ${bus.placa}: valor de aquisição zerado (depreciação = R$ 0,00).`);
    }

    // Alocação integral se exclusivo, ou proporcional se compartilhado
    const fatorAlocacao = linhasDesteBusNaIndustria > 0 ? 1 : 0;
    custoManutencaoMensal += Number(bus.manutencao_mensal_estimada) * fatorAlocacao;
    custoSeguroMensal += Number(bus.seguro_licenciamento_mensal) * fatorAlocacao;
    custoDepreciacaoMensal += depreciacaoBus * fatorAlocacao;
  });

  // Custos trabalhistas dos motoristas alocados
  let custoSalariosEncargosMensal = 0;
  const fatorEncargos = 1 + Number(config.encargos_trabalhistas_percent) / 100;

  motoristasUsadosIds.forEach((motId) => {
    const mot = motoristasList.find((m) => m.id === motId);
    if (!mot) return;

    if (mot.salario_base_mensal <= 0) {
      pendencias.push(`Motorista ${mot.nome}: salário base não informado.`);
    }

    const baseTributavel =
      Number(mot.salario_base_mensal) +
      Number(mot.adicional_noturno_mensal) +
      Number(mot.horas_extras_mensais);

    const custoTotalMotorista = baseTributavel * fatorEncargos + Number(mot.beneficios_mensais);
    custoSalariosEncargosMensal += custoTotalMotorista;
  });

  // Rateio de despesas administrativas entre as indústrias ativas
  const divisorIndustrias = Math.max(1, totalIndustriasAtivas);
  const custoAdministrativoRateadoMensal =
    Number(config.despesa_administrativa_mensal) / divisorIndustrias;

  const custoOperacionalTotalMensal =
    custoCombustivelMensal +
    custoManutencaoMensal +
    custoSeguroMensal +
    custoDepreciacaoMensal +
    custoSalariosEncargosMensal +
    custoAdministrativoRateadoMensal;

  const custoOperacionalTotalDiario = diasMes > 0 ? custoOperacionalTotalMensal / diasMes : 0;
  const custoOperacionalTotalAnual = custoOperacionalTotalMensal * 12;

  // Formação de Preço (Mark-up divisor considerando impostos sobre faturamento + margem líquida desejada)
  const aliqImpostos = Number(config.aliquota_impostos_percent) / 100;
  const margemDesejada = Number(config.margem_lucro_desejada_percent) / 100;

  // Preço Mínimo (Ponto de Equilíbrio Financeiro: cobre custos operacionais + impostos incidentes sobre a nota fiscal)
  const divisorMinimo = Math.max(0.05, 1 - aliqImpostos);
  const precoMinimoSemLucroMensal = custoOperacionalTotalMensal / divisorMinimo;

  // Preço Recomendado (Cobre custos + impostos + margem de lucro alvo)
  const divisorRecomendado = Math.max(0.05, 1 - (aliqImpostos + margemDesejada));
  const precoRecomendadoMensal = custoOperacionalTotalMensal / divisorRecomendado;
  const impostosSobrePrecoRecomendadoMensal = precoRecomendadoMensal * aliqImpostos;

  // Análise do contrato atual cadastrado
  const receitaAtualMensal = Number(industria.valor_contrato_mensal_atual) || 0;
  const impostosAtuais = receitaAtualMensal * aliqImpostos;
  const lucroLiquidoAtualMensal = receitaAtualMensal - impostosAtuais - custoOperacionalTotalMensal;
  const margemAtualPercent =
    receitaAtualMensal > 0 ? (lucroLiquidoAtualMensal / receitaAtualMensal) * 100 : 0;

  // Indicadores unitários
  const totalFuncionarios =
    industria.total_funcionarios_transportados > 0
      ? industria.total_funcionarios_transportados
      : linhasIndustria.reduce((acc, l) => acc + Number(l.passageiros_alocados), 0);

  if (totalFuncionarios <= 0) {
    pendencias.push(`Quantidade de funcionários transportados não informada.`);
  }

  const custoPorKm = kmMensal > 0 ? custoOperacionalTotalMensal / kmMensal : 0;
  const custoPorFuncionarioMensal =
    totalFuncionarios > 0 ? custoOperacionalTotalMensal / totalFuncionarios : 0;
  const custoMedioPorOnibusMensal =
    onibusUsadosIds.size > 0 ? custoOperacionalTotalMensal / onibusUsadosIds.size : 0;
  const custoMedioPorLinhaMensal =
    linhasIndustria.length > 0 ? custoOperacionalTotalMensal / linhasIndustria.length : 0;

  // Ponto de equilíbrio em passageiros (quantos passageiros pagantes ao valor atual por cabeça cobrem o custo mínimo)
  const receitaPorPassageiroAtual =
    totalFuncionarios > 0 && receitaAtualMensal > 0 ? receitaAtualMensal / totalFuncionarios : 0;
  const pontoEquilibrioPassageiros =
    receitaPorPassageiroAtual > 0
      ? Math.ceil(precoMinimoSemLucroMensal / receitaPorPassageiroAtual)
      : 0;

  return {
    industria,
    pendencias: Array.from(new Set(pendencias)),
    kmDiario,
    kmMensal,
    kmAnual,
    custoCombustivelMensal,
    custoManutencaoMensal,
    custoSeguroMensal,
    custoDepreciacaoMensal,
    custoSalariosEncargosMensal,
    custoAdministrativoRateadoMensal,
    custoOperacionalTotalDiario,
    custoOperacionalTotalMensal,
    custoOperacionalTotalAnual,
    impostosSobrePrecoRecomendadoMensal,
    precoMinimoSemLucroMensal,
    precoRecomendadoMensal,
    receitaAtualMensal,
    lucroLiquidoAtualMensal,
    margemAtualPercent,
    custoPorKm,
    custoPorFuncionarioMensal,
    custoMedioPorOnibusMensal,
    custoMedioPorLinhaMensal,
    pontoEquilibrioPassageiros,
  };
}

export function formatBRL(valor: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number.isFinite(valor) ? valor : 0);
}
