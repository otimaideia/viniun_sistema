/**
 * Parser unificado para extratos bancários
 * Detecta formato automaticamente e delega para o parser específico
 */

import type { ParsedBankStatement, BankFileFormat } from '@/types/conciliacao';
import { parseOFX } from './ofxParser';
import { parseXLS } from './xlsParser';

/**
 * Detecta o formato do arquivo pela extensão
 */
export function detectFileFormat(fileName: string): BankFileFormat | null {
  const ext = fileName.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'ofx':
      return 'ofx';
    case 'xls':
      return 'xls';
    case 'xlsx':
      return 'xlsx';
    case 'pdf':
      return 'pdf';
    default:
      return null;
  }
}

/**
 * Formatos suportados para importação
 */
export const SUPPORTED_FORMATS = ['ofx', 'xls', 'xlsx'] as const;
export const SUPPORTED_EXTENSIONS = '.ofx,.xls,.xlsx';
export const SUPPORTED_MIME_TYPES = [
  'application/x-ofx',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

/**
 * Lê um arquivo como texto (para OFX)
 */
function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Erro ao ler o arquivo'));
    reader.readAsText(file, 'latin1'); // OFX usa latin1/ISO-8859-1
  });
}

/**
 * Lê um arquivo como ArrayBuffer (para Excel)
 */
function readFileAsBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(new Error('Erro ao ler o arquivo'));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Parseia um extrato bancário independente do formato
 */
export async function parseBankStatement(file: File): Promise<{
  data: ParsedBankStatement;
  format: BankFileFormat;
}> {
  const format = detectFileFormat(file.name);

  if (!format) {
    throw new Error(`Formato não suportado: ${file.name}. Use arquivos .ofx, .xls ou .xlsx`);
  }

  if (format === 'pdf') {
    throw new Error('Importação de PDF será disponibilizada em breve. Use OFX ou Excel.');
  }

  let data: ParsedBankStatement;

  if (format === 'ofx') {
    const content = await readFileAsText(file);
    data = parseOFX(content);
  } else {
    const buffer = await readFileAsBuffer(file);
    data = parseXLS(buffer);
  }

  if (data.entries.length === 0) {
    throw new Error('Nenhum lançamento encontrado no arquivo. Verifique se o extrato contém dados.');
  }

  return { data, format };
}
