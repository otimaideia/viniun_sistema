// Gerador de PDF de Tabela de Imóveis (distribuição p/ corretor/cliente)
// Usa pdfmake (mesmo padrão de src/services/contracts/contractTemplateService.ts)

import pdfMake from 'pdfmake/build/pdfmake';
import * as pdfFonts from 'pdfmake/build/vfs_fonts';
import type { TDocumentDefinitions } from 'pdfmake/interfaces';
import type { TabelaPublicaMeta, TabelaPublicaItem } from '@/hooks/public/useTabelasPublicas';

// Configurar fontes do pdfMake (mesmo fallback do projeto)
if (pdfFonts && typeof pdfFonts === 'object' && 'pdfMake' in pdfFonts) {
  (pdfMake as any).vfs = (pdfFonts as any).pdfMake.vfs;
} else {
  (pdfMake as any).vfs = pdfFonts;
}

const brl = (v: number | null) =>
  v == null ? 'Sob consulta' : v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

export interface TabelaPdfOptions {
  whatsapp?: string;
  site?: string;
}

export function buildTabelaPdfDoc(
  tabela: TabelaPublicaMeta,
  itens: TabelaPublicaItem[],
  options: TabelaPdfOptions = {},
): TDocumentDefinitions {
  const body = [
    [
      { text: 'Ref', style: 'th' },
      { text: 'Imóvel', style: 'th' },
      { text: 'Bairro', style: 'th' },
      { text: 'Dorm', style: 'th', alignment: 'center' },
      { text: 'Área', style: 'th', alignment: 'center' },
      { text: 'Valor', style: 'th', alignment: 'right' },
    ],
    ...itens.map(it => [
      { text: it.ref_code ?? '—', style: 'td' },
      { text: it.titulo ?? '—', style: 'td' },
      { text: it.bairro ?? '—', style: 'td' },
      { text: it.dormitorios != null ? String(it.dormitorios) : '—', style: 'td', alignment: 'center' },
      { text: it.area_total != null ? `${it.area_total} m²` : '—', style: 'td', alignment: 'center' },
      { text: brl(it.valor_rede || it.valor_venda), style: 'td', alignment: 'right', bold: true },
    ]),
  ];

  return {
    pageSize: 'A4',
    pageMargins: [32, 40, 32, 48],
    content: [
      { text: tabela.nome, style: 'titulo' },
      tabela.descricao ? { text: tabela.descricao, style: 'subtitulo' } : '',
      {
        text: `${itens.length} imóveis${tabela.validade_fim ? ` • válida até ${new Date(tabela.validade_fim).toLocaleDateString('pt-BR')}` : ''}`,
        style: 'meta',
        margin: [0, 2, 0, 12],
      },
      {
        table: { headerRows: 1, widths: [42, '*', 80, 30, 44, 70], body },
        layout: {
          fillColor: (rowIndex: number) => (rowIndex === 0 ? '#1E3A5F' : rowIndex % 2 === 0 ? '#F4F6F8' : null),
          hLineWidth: () => 0.5,
          vLineWidth: () => 0,
          hLineColor: () => '#E2E8F0',
        },
      },
    ],
    footer: (currentPage: number, pageCount: number) => ({
      columns: [
        { text: options.site ? `${options.site}` : 'Viniun — Tabelas de Imóveis Praia Grande', style: 'footer' },
        { text: options.whatsapp ? `WhatsApp: ${options.whatsapp}` : '', style: 'footer', alignment: 'center' },
        { text: `${currentPage}/${pageCount}`, style: 'footer', alignment: 'right' },
      ],
      margin: [32, 12, 32, 0],
    }),
    styles: {
      titulo: { fontSize: 18, bold: true, color: '#1E3A5F' },
      subtitulo: { fontSize: 10, color: '#475569', margin: [0, 4, 0, 0] },
      meta: { fontSize: 9, color: '#64748B' },
      th: { fontSize: 9, bold: true, color: '#FFFFFF', margin: [0, 4, 0, 4] },
      td: { fontSize: 9, color: '#1E293B', margin: [0, 3, 0, 3] },
      footer: { fontSize: 7, color: '#94A3B8' },
    },
    defaultStyle: { font: 'Roboto' },
  };
}

function safeFilename(nome: string) {
  return nome.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase();
}

export function downloadTabelaPdf(
  tabela: TabelaPublicaMeta,
  itens: TabelaPublicaItem[],
  options?: TabelaPdfOptions,
) {
  const doc = buildTabelaPdfDoc(tabela, itens, options);
  pdfMake.createPdf(doc).download(`tabela-${safeFilename(tabela.nome)}.pdf`);
}
