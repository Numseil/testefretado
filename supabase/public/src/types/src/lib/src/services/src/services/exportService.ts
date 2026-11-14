import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { CalculoContratoDetalhado } from '../types/database';
import { formatBRL } from './calculator';

export function exportarRelatorioPDF(calculos: CalculoContratoDetalhado[]) {
  const doc = new jsPDF();

  doc.setFontSize(16);
  doc.text('TUPY — GESTÃO DE TRANSPORTES', 14, 18);
  doc.setFontSize(10);
  doc.text(`Relatório Executivo de Custos e Precificação • Emissão: ${new Date().toLocaleString('pt-BR')}`, 14, 25);

  const rows = calculos.map((c) => [
    c.industria.razao_social,
    `${c.kmMensal.toFixed(0)} km`,
    formatBRL(c.custoOperacionalTotalMensal),
    formatBRL(c.precoMinimoSemLucroMensal),
    formatBRL(c.precoRecomendadoMensal),
    formatBRL(c.receitaAtualMensal),
    `${c.margemAtualPercent.toFixed(1)}%`,
  ]);

  autoTable(doc, {
    startY: 32,
    head: [['Indústria', 'KM/Mês', 'Custo Oper.', 'Preço Mínimo', 'Preço Recom.', 'Contrato Atual', 'Margem']],
    body: rows,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [15, 23, 42] },
  });

  // Detalhamento por indústria
  let currentY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 12;

  calculos.forEach((c) => {
    if (currentY > 240) {
      doc.addPage();
      currentY = 20;
    }

    doc.setFontSize(11);
    doc.text(`Composição Detalhada: ${c.industria.razao_social} (${c.industria.quantidade_turnos} turnos | ${c.industria.dias_uteis_mes} dias/mês)`, 14, currentY);
    currentY += 4;

    autoTable(doc, {
      startY: currentY,
      head: [['Rubrica de Custo / Indicador', 'Valor Mensal', 'Observação']],
      body: [
        ['Combustível (Diesel)', formatBRL(c.custoCombustivelMensal), `${c.kmMensal.toFixed(1)} km/mês`],
        ['Manutenção Preventiva/Corretiva', formatBRL(c.custoManutencaoMensal), 'Base frota alocada'],
        ['Depreciação da Frota', formatBRL(c.custoDepreciacaoMensal), 'Linear sobre vida útil'],
        ['Seguro e Licenciamento', formatBRL(c.custoSeguroMensal), 'Rateio mensal'],
        ['Salários + Encargos + Benefícios', formatBRL(c.custoSalariosEncargosMensal), 'Motoristas vinculados'],
        ['Despesas Administrativas', formatBRL(c.custoAdministrativoRateadoMensal), 'Rateio entre contratos'],
        ['Custo por KM / Custo por Funcionário', `${formatBRL(c.custoPorKm)} / km`, `${formatBRL(c.custoPorFuncionarioMensal)} / func.`],
      ],
      styles: { fontSize: 8 },
      headStyles: { fillColor: [30, 64, 175] },
    });

    currentY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
  });

  doc.save(`TUPY_Relatorio_Financeiro_${new Date().toISOString().slice(0, 10)}.pdf`);
}

export function exportarRelatorioExcel(calculos: CalculoContratoDetalhado[]) {
  const dadosPlanilha = calculos.map((c) => ({
    'Indústria': c.industria.razao_social,
    'CNPJ': c.industria.cnpj,
    'Turnos': c.industria.quantidade_turnos,
    'Operação 24h': c.industria.operacao_24h ? 'Sim' : 'Não',
    'Dias Úteis/Mês': c.industria.dias_uteis_mes,
    'KM Diário': Number(c.kmDiario.toFixed(2)),
    'KM Mensal': Number(c.kmMensal.toFixed(2)),
    'KM Anual': Number(c.kmAnual.toFixed(2)),
    'Combustível Mensal (R$)': Number(c.custoCombustivelMensal.toFixed(2)),
    'Manutenção Mensal (R$)': Number(c.custoManutencaoMensal.toFixed(2)),
    'Depreciação Mensal (R$)': Number(c.custoDepreciacaoMensal.toFixed(2)),
    'Seguro/Licenc. Mensal (R$)': Number(c.custoSeguroMensal.toFixed(2)),
    'Salários e Encargos (R$)': Number(c.custoSalariosEncargosMensal.toFixed(2)),
    'Admin. Rateado (R$)': Number(c.custoAdministrativoRateadoMensal.toFixed(2)),
    'Custo Total Diário (R$)': Number(c.custoOperacionalTotalDiario.toFixed(2)),
    'Custo Total Mensal (R$)': Number(c.custoOperacionalTotalMensal.toFixed(2)),
    'Custo Total Anual (R$)': Number(c.custoOperacionalTotalAnual.toFixed(2)),
    'Custo por KM (R$)': Number(c.custoPorKm.toFixed(2)),
    'Custo por Funcionário (R$)': Number(c.custoPorFuncionarioMensal.toFixed(2)),
    'Custo Médio por Ônibus (R$)': Number(c.custoMedioPorOnibusMensal.toFixed(2)),
    'Custo Médio por Linha (R$)': Number(c.custoMedioPorLinhaMensal.toFixed(2)),
    'Preço Mínimo Break-Even (R$)': Number(c.precoMinimoSemLucroMensal.toFixed(2)),
    'Preço Recomendado (R$)': Number(c.precoRecomendadoMensal.toFixed(2)),
    'Contrato Atual (R$)': Number(c.receitaAtualMensal.toFixed(2)),
    'Lucro Líquido Atual (R$)': Number(c.lucroLiquidoAtualMensal.toFixed(2)),
    'Margem Atual (%)': Number(c.margemAtualPercent.toFixed(2)),
    'Pendências de Cadastro': c.pendencias.join(' | ') || 'Nenhuma',
  }));

  const worksheet = XLSX.utils.json_to_sheet(dadosPlanilha);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Gestao_Contratos_TUPY');
  XLSX.writeFile(workbook, `TUPY_Planilha_Custos_${new Date().toISOString().slice(0, 10)}.xlsx`);
}
