import { useState, useCallback } from 'react';
import { parseBankStatement, SUPPORTED_EXTENSIONS } from '@/lib/parsers/bankStatementParser';
import type { ParsedBankStatement, BankFileFormat } from '@/types/conciliacao';

interface ParserResult {
  data: ParsedBankStatement;
  format: BankFileFormat;
  fileName: string;
  fileSize: number;
}

export function useBankStatementParser() {
  const [result, setResult] = useState<ParserResult | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  const parseFile = useCallback(async (file: File): Promise<ParserResult> => {
    setIsParsing(true);
    setParseError(null);
    setResult(null);

    try {
      // Validar tamanho (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        throw new Error('Arquivo muito grande. O limite é 10MB.');
      }

      const { data, format } = await parseBankStatement(file);

      const parserResult: ParserResult = {
        data,
        format,
        fileName: file.name,
        fileSize: file.size,
      };

      setResult(parserResult);
      return parserResult;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao processar o arquivo';
      setParseError(message);
      throw err;
    } finally {
      setIsParsing(false);
    }
  }, []);

  const reset = useCallback(() => {
    setResult(null);
    setParseError(null);
    setIsParsing(false);
  }, []);

  return {
    result,
    isParsing,
    parseError,
    parseFile,
    reset,
    supportedExtensions: SUPPORTED_EXTENSIONS,
  };
}
