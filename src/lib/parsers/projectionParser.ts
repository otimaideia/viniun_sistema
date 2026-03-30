import * as XLSX from 'xlsx';
import type { ParsedProjection, ProjectionLineCreate } from '@/types/projecao';

/**
 * Parser de Plano de Negócio YESlaser (Excel)
 * Extrai ~42 linhas de 5 abas: DRE, Despesas, Faturamento, PayBack, Invest. inicial
 */
export function parseProjectionExcel(file: ArrayBuffer): ParsedProjection {
  const wb = XLSX.read(file, { type: 'array' });
  const lines: ProjectionLineCreate[] = [];

  // 1. Parse Simulador DRE → 15 linhas
  const dreLines = parseDRE(wb);
  lines.push(...dreLines);

  // 2. Parse Despesas → 16 linhas
  const despLines = parseDespesasFixas(wb);
  lines.push(...despLines);

  // 3. Parse Faturamento → 6 linhas
  const fatLines = parseFaturamento(wb);
  lines.push(...fatLines);

  // 4. Parse PayBack → 5 linhas
  const pbLines = parsePayBack(wb);
  lines.push(...pbLines);

  // 5. Parse header (KPIs + investimento)
  const header = parseHeader(wb);

  return { header, lines };
}

// === DRE ===

interface DRERowDef {
  rowIndex: number;
  codigo: string;
  nome: string;
  tipo: 'receita' | 'despesa' | 'subtotal' | 'indicador';
  percentualCol: boolean; // se coluna B tem o percentual
  baseCalculo?: string;
}

const DRE_ROWS: DRERowDef[] = [
  { rowIndex: 4,  codigo: 'faturamento_bruto',  nome: 'Faturamento Bruto',              tipo: 'receita',   percentualCol: false },
  { rowIndex: 5,  codigo: 'faturamento_caixa',  nome: 'Faturamento Caixa',              tipo: 'receita',   percentualCol: false },
  { rowIndex: 6,  codigo: 'impostos',           nome: '(-) Impostos',                   tipo: 'despesa',   percentualCol: true, baseCalculo: 'faturamento_bruto' },
  { rowIndex: 7,  codigo: 'equipe_folha',       nome: '(-) Equipe Folha',               tipo: 'despesa',   percentualCol: true, baseCalculo: 'faturamento_bruto' },
  { rowIndex: 8,  codigo: 'custo_insumos',      nome: '(-) Custo Insumos',              tipo: 'despesa',   percentualCol: true, baseCalculo: 'faturamento_bruto' },
  { rowIndex: 9,  codigo: 'bonus_comercial',    nome: '(-) Bonus equipe comercial',     tipo: 'despesa',   percentualCol: true, baseCalculo: 'faturamento_bruto' },
  { rowIndex: 10, codigo: 'despesa_marketing',  nome: '(-) Despesa Marketing',          tipo: 'despesa',   percentualCol: true, baseCalculo: 'faturamento_bruto' },
  { rowIndex: 11, codigo: 'aluguel',            nome: '(-) Aluguel',                    tipo: 'despesa',   percentualCol: true, baseCalculo: 'faturamento_bruto' },
  { rowIndex: 12, codigo: 'despesas_adm',       nome: '(-) Despesas ADM',               tipo: 'despesa',   percentualCol: true, baseCalculo: 'faturamento_bruto' },
  { rowIndex: 13, codigo: 'taxas_cartao',       nome: '(-) Taxas de cartão',            tipo: 'despesa',   percentualCol: true, baseCalculo: 'faturamento_caixa' },
  { rowIndex: 14, codigo: 'royalties',          nome: '(-) Royalties',                  tipo: 'despesa',   percentualCol: true, baseCalculo: 'faturamento_bruto' },
  { rowIndex: 15, codigo: 'fundo_propaganda',   nome: '(-) Fundo de propaganda',        tipo: 'despesa',   percentualCol: true, baseCalculo: 'faturamento_bruto' },
  { rowIndex: 16, codigo: 'custo_total',        nome: 'Custo Total',                    tipo: 'subtotal',  percentualCol: true },
  { rowIndex: 17, codigo: 'resultado_liquido',  nome: 'Resultado Líquido',              tipo: 'subtotal',  percentualCol: true },
  { rowIndex: 18, codigo: 'margem_liquida',     nome: 'Margem líquida',                 tipo: 'indicador', percentualCol: false },
];

function parseDRE(wb: XLSX.WorkBook): ProjectionLineCreate[] {
  const ws = wb.Sheets['Simulador DRE'];
  if (!ws) return [];

  const data = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, defval: null });
  const lines: ProjectionLineCreate[] = [];

  for (let i = 0; i < DRE_ROWS.length; i++) {
    const def = DRE_ROWS[i];
    const row = data[def.rowIndex];
    if (!row) continue;

    const percentual = def.percentualCol && typeof row[1] === 'number' ? row[1] : null;
    const valores: Record<string, number> = {};

    // Columns C onwards (index 2) = month 1, 2, 3, ...60
    for (let m = 1; m <= 60; m++) {
      const colIdx = m + 1; // col 2 = month 1
      const val = row[colIdx];
      if (typeof val === 'number') {
        valores[String(m)] = Math.round(val * 100) / 100;
      }
    }

    lines.push({
      secao: 'dre',
      codigo: def.codigo,
      nome: def.nome,
      tipo: def.tipo,
      percentual,
      base_calculo: def.baseCalculo || null,
      valores,
      ordem: i + 1,
      is_subtotal: def.tipo === 'subtotal',
    });
  }

  return lines;
}

// === DESPESAS FIXAS ===

interface DespesaDef {
  rowIndex: number;
  codigo: string;
  nome: string;
}

const DESPESAS_ROWS: DespesaDef[] = [
  { rowIndex: 6,  codigo: 'agua_esgoto',         nome: 'Água e Esgoto' },
  { rowIndex: 7,  codigo: 'energia',             nome: 'Energia Elétrica' },
  { rowIndex: 8,  codigo: 'telefone_internet',   nome: 'Telefones/Internet' },
  { rowIndex: 9,  codigo: 'licencas_manutencao', nome: 'Licenças e Manutenções' },
  { rowIndex: 10, codigo: 'materiais_escritorio', nome: 'Materiais de Escritório' },
  { rowIndex: 11, codigo: 'materiais_higiene',   nome: 'Materiais Higiene/Limpeza' },
  { rowIndex: 12, codigo: 'manutencao_predial',  nome: 'Manutenção Predial' },
  { rowIndex: 13, codigo: 'manutencao_maquinas', nome: 'Manutenção Máquinas' },
  { rowIndex: 14, codigo: 'estorno_vendas',      nome: 'Estorno de Vendas' },
  { rowIndex: 15, codigo: 'taxas_diversas',      nome: 'Taxas Diversas' },
  { rowIndex: 16, codigo: 'taxa_lixo',           nome: 'Taxa de Lixo' },
  { rowIndex: 17, codigo: 'contabilidade',       nome: 'Contabilidade' },
  { rowIndex: 18, codigo: 'seguros',             nome: 'Seguros' },
  { rowIndex: 19, codigo: 'tarifas_bancarias',   nome: 'Tarifas Bancárias' },
  { rowIndex: 20, codigo: 'servico_seguranca',   nome: 'Serviço de Segurança' },
];

function parseDespesasFixas(wb: XLSX.WorkBook): ProjectionLineCreate[] {
  const ws = wb.Sheets['Despesas'];
  if (!ws) return [];

  const data = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, defval: null });
  const lines: ProjectionLineCreate[] = [];
  let totalMensal = 0;

  for (let i = 0; i < DESPESAS_ROWS.length; i++) {
    const def = DESPESAS_ROWS[i];
    const row = data[def.rowIndex];
    if (!row) continue;

    const valorMensal = typeof row[1] === 'number' ? row[1] : 0;
    totalMensal += valorMensal;

    // Replica o valor fixo para 60 meses
    const valores: Record<string, number> = {};
    for (let m = 1; m <= 60; m++) {
      valores[String(m)] = valorMensal;
    }

    lines.push({
      secao: 'despesas_fixas',
      codigo: def.codigo,
      nome: def.nome,
      tipo: 'despesa',
      valores,
      ordem: i + 1,
    });
  }

  // Total
  const totalValores: Record<string, number> = {};
  for (let m = 1; m <= 60; m++) {
    totalValores[String(m)] = totalMensal;
  }
  lines.push({
    secao: 'despesas_fixas',
    codigo: 'total_despesas_fixas',
    nome: 'TOTAL Despesas Fixas',
    tipo: 'subtotal',
    valores: totalValores,
    ordem: DESPESAS_ROWS.length + 1,
    is_subtotal: true,
  });

  return lines;
}

// === FATURAMENTO ===

function parseFaturamento(wb: XLSX.WorkBook): ProjectionLineCreate[] {
  const ws = wb.Sheets['Faturamento'];
  if (!ws) return [];

  const data = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, defval: null });
  const lines: ProjectionLineCreate[] = [];

  // Row 2 = header: A="ENTRADAS", B="LASER", C="Botox...", D="Caixa", E="Faturamento Bruto", G="Qtd pacotes"
  // Row 3..62 = data: A="1º Mês", B=laser, C=botox, D=caixa, E=fat_bruto, G=qtd_pacotes

  const colDefs = [
    { colIdx: 1, codigo: 'receita_laser',    nome: 'Receita Laser',             tipo: 'receita' as const },
    { colIdx: 2, codigo: 'receita_estetica', nome: 'Receita Botox/Estética',    tipo: 'receita' as const },
    { colIdx: 3, codigo: 'fat_caixa',        nome: 'Faturamento Caixa',         tipo: 'subtotal' as const },
    { colIdx: 4, codigo: 'fat_bruto',        nome: 'Faturamento Bruto',         tipo: 'subtotal' as const },
    { colIdx: 6, codigo: 'qtd_pacotes',      nome: 'Qtd Pacotes Vendidos',      tipo: 'indicador' as const },
  ];

  for (let c = 0; c < colDefs.length; c++) {
    const def = colDefs[c];
    const valores: Record<string, number> = {};

    for (let m = 1; m <= 60; m++) {
      const rowIdx = m + 2; // Row 3 = month 1
      const row = data[rowIdx];
      if (!row) continue;
      const val = row[def.colIdx];
      if (typeof val === 'number') {
        valores[String(m)] = Math.round(val * 100) / 100;
      }
    }

    lines.push({
      secao: 'faturamento',
      codigo: def.codigo,
      nome: def.nome,
      tipo: def.tipo,
      valores,
      ordem: c + 1,
      is_subtotal: def.tipo === 'subtotal',
    });
  }

  // Inadimplência = col 10 da aba Faturamento (taxa de inadimplência real, ~3%)
  const inadValores: Record<string, number> = {};
  for (let m = 1; m <= 60; m++) {
    const rowIdx = m + 2; // Row 3 = month 1
    const row = data[rowIdx];
    if (!row) continue;
    const val = row[10]; // col 10 = Inadimplência (3% sobre caixa laser)
    if (typeof val === 'number') {
      inadValores[String(m)] = Math.round(val * 100) / 100;
    }
  }
  lines.push({
    secao: 'faturamento',
    codigo: 'inadimplencia',
    nome: 'Inadimplência',
    tipo: 'indicador',
    valores: inadValores,
    ordem: colDefs.length + 1,
  });

  return lines;
}

// === PAYBACK ===

function parsePayBack(wb: XLSX.WorkBook): ProjectionLineCreate[] {
  const ws = wb.Sheets['PayBack'];
  if (!ws) return [];

  const data = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, defval: null });
  const lines: ProjectionLineCreate[] = [];

  // Row 4: A=-145200 (investment), B="INVESTIMENTO INICIAL"
  // Row 5..64: A=saldo_acumulado, B="Xº mês", C=evolucao, D=receita, E=lucro, F=despesas

  const colDefs = [
    { colIdx: 0, codigo: 'saldo_acumulado', nome: 'Saldo Acumulado',  tipo: 'indicador' as const },
    { colIdx: 3, codigo: 'receita_mensal',  nome: 'Receita Mensal',   tipo: 'receita' as const },
    { colIdx: 4, codigo: 'lucro_mensal',    nome: 'Lucro Mensal',     tipo: 'subtotal' as const },
    { colIdx: 5, codigo: 'despesa_mensal',  nome: 'Despesa Mensal',   tipo: 'despesa' as const },
    { colIdx: 2, codigo: 'evolucao_pct',    nome: 'Evolução %',       tipo: 'indicador' as const },
    { colIdx: 6, codigo: 'lucro_pct',       nome: 'Lucro %',          tipo: 'indicador' as const },
  ];

  for (let c = 0; c < colDefs.length; c++) {
    const def = colDefs[c];
    const valores: Record<string, number> = {};

    for (let m = 1; m <= 60; m++) {
      const rowIdx = m + 4; // Row 5 = month 1
      const row = data[rowIdx];
      if (!row) continue;
      const val = row[def.colIdx];
      if (typeof val === 'number') {
        valores[String(m)] = Math.round(val * 100) / 100;
      }
    }

    lines.push({
      secao: 'payback',
      codigo: def.codigo,
      nome: def.nome,
      tipo: def.tipo,
      valores,
      ordem: c + 1,
      is_subtotal: def.tipo === 'subtotal',
    });
  }

  return lines;
}

// === HEADER (KPIs + Investimento) ===

function parseHeader(wb: XLSX.WorkBook): ParsedProjection['header'] {
  // KPIs from DRE sheet
  const dreWs = wb.Sheets['Simulador DRE'];
  const dreData = dreWs ? XLSX.utils.sheet_to_json<any[]>(dreWs, { header: 1, defval: null }) : [];

  const lucratividade = getNumericCell(dreData, 20, 1) || 0;
  const lucroMedio = getNumericCell(dreData, 22, 1) || 0;

  // PayBack sheet for TIR, VPL, ROI
  const pbWs = wb.Sheets['PayBack'];
  const pbData = pbWs ? XLSX.utils.sheet_to_json<any[]>(pbWs, { header: 1, defval: null }) : [];

  const investimento = Math.abs(getNumericCell(pbData, 4, 0) || 145200);

  // Find payback month based on DRE resultado_liquido acumulado
  // (matches planilha DRE row 21: "Payback atingido no mês de 12º Mês")
  let paybackMes = 60;
  const dreResultadoRow = dreData[17]; // Row 17 = Resultado Líquido
  if (dreResultadoRow) {
    let acumulado = -investimento;
    for (let m = 1; m <= 60; m++) {
      const colIdx = m + 1; // col 2 = month 1
      const resultado = typeof dreResultadoRow[colIdx] === 'number' ? dreResultadoRow[colIdx] : 0;
      acumulado += resultado;
      if (acumulado > 0) {
        paybackMes = m;
        break;
      }
    }
  }

  // Read TIR, VPL, ROI directly from PayBack sheet row 3 (columns K, L, M = indices 8, 9, 10)
  const tir = getNumericCell(pbData, 3, 8) || 0;   // TIR (ex: 0.3094 = 30.94%)
  const vpl = getNumericCell(pbData, 3, 9) || 0;   // VPL 60 meses TMA 12%
  const roi = getNumericCell(pbData, 3, 10) || 0;  // ROI (ex: 42.19x)

  // Invest. inicial breakdown
  const invWs = wb.Sheets['Invest. inicial'];
  const invData = invWs ? XLSX.utils.sheet_to_json<any[]>(invWs, { header: 1, defval: null }) : [];

  const investimento_detalhado: Record<string, number> = {};
  const invItems = [
    { row: 6, key: 'taxa_franquia' },
    { row: 7, key: 'abertura_empresa' },
    { row: 8, key: 'imovel_instalacao' },
    { row: 9, key: 'marketing_inauguracao' },
    { row: 10, key: 'equipe' },
    { row: 11, key: 'contas_obras' },
    { row: 12, key: 'uniformes_treinamento' },
    { row: 13, key: 'capital_giro' },
  ];

  for (const item of invItems) {
    const val = getNumericCell(invData, item.row, 1);
    if (val !== null) {
      investimento_detalhado[item.key] = val;
    }
  }

  // Parcelamentos
  const parcelamentos: { desc: string; parcelas: number; valor: number }[] = [];
  const parcFranquia = getNumericCell(invData, 17, 1);
  if (parcFranquia) {
    parcelamentos.push({ desc: 'Taxa de Franquia', parcelas: 10, valor: parcFranquia });
  }
  const parcLaser = getNumericCell(invData, 18, 1);
  if (parcLaser) {
    parcelamentos.push({ desc: 'Laser', parcelas: 36, valor: parcLaser });
  }

  return {
    investimento_inicial: investimento,
    tir_projetada: Math.round(tir * 10000) / 10000,
    vpl_projetado: Math.round(vpl * 100) / 100,
    roi_projetado: Math.round(roi * 100) / 100,
    payback_mes: paybackMes,
    lucratividade_media: Math.round(lucratividade * 10000) / 10000,
    lucro_liquido_medio: Math.round(lucroMedio * 100) / 100,
    investimento_detalhado,
    parcelamentos,
  };
}

// === UTILS ===

function getNumericCell(data: any[][], row: number, col: number): number | null {
  if (!data[row]) return null;
  const val = data[row][col];
  if (typeof val === 'number') return val;
  return null;
}
