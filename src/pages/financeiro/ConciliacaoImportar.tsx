import { useState, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Upload, FileSpreadsheet, CheckCircle, ArrowLeft, ArrowRight, ArrowDownCircle, ArrowUpCircle, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { useTenantContext } from '@/contexts/TenantContext';
import { useStorageBucketUpload } from '@/hooks/useStorageBucketUpload';
import { useFinancialAccountsMT } from '@/hooks/multitenant/useFinanceiroMT';
import { useBankStatementsMT } from '@/hooks/multitenant/useBankStatementsMT';
import { useBankStatementParser } from '@/hooks/useBankStatementParser';
import { SUPPORTED_EXTENSIONS } from '@/lib/parsers/bankStatementParser';
import { BANK_FILE_FORMAT_LABELS } from '@/types/conciliacao';
import type { BankStatementEntryCreate } from '@/types/conciliacao';

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function formatDate(dateStr: string) {
  if (!dateStr) return '-';
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('pt-BR');
}

export default function ConciliacaoImportar() {
  const navigate = useNavigate();
  const { tenant, franchise } = useTenantContext();
  const { accounts } = useFinancialAccountsMT();
  const { createStatement } = useBankStatementsMT();
  const { result, isParsing, parseError, parseFile, reset } = useBankStatementParser();

  const [step, setStep] = useState(1);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [isImporting, setIsImporting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { upload: uploadExtrato } = useStorageBucketUpload({
    bucket: 'extratos-bancarios',
    pathPrefix: `${tenant?.id || 'unknown'}/`,
  });

  const bankAccounts = accounts.filter(a => a.tipo === 'banco');
  const selectedAccount = bankAccounts.find(a => a.id === selectedAccountId);

  // Handle file drop/select
  const handleFileChange = useCallback(async (file: File) => {
    try {
      setSelectedFile(file);
      await parseFile(file);
      setStep(3);
    } catch {
      // Error is handled by the parser hook
    }
  }, [parseFile]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFileChange(file);
  }, [handleFileChange]);

  const onFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileChange(file);
  }, [handleFileChange]);

  // Import to database
  const handleImport = async () => {
    if (!result || !selectedAccountId || !tenant?.id) return;
    setIsImporting(true);

    try {
      // Filter out zero-amount entries (like "ABERTURA")
      const validEntries = result.data.entries.filter(e => e.valor > 0);

      if (validEntries.length === 0) {
        toast.error('Nenhum lançamento válido encontrado no arquivo.');
        return;
      }

      // Upload file to storage (use stored file since input ref may be unmounted)
      let fileUrl: string | undefined;
      if (selectedFile) {
        const uploadResult = await uploadExtrato(selectedFile);
        if (uploadResult) {
          fileUrl = uploadResult.publicUrl;
        } else {
          console.warn('Upload do arquivo falhou (continuando sem arquivo)');
        }
      }

      // Create statement record
      const stmtData: Record<string, unknown> = {
        account_id: selectedAccountId,
        file_name: result.fileName,
        file_format: result.format,
        file_size_bytes: result.fileSize,
        total_entries: validEntries.length,
        total_entradas: validEntries.filter(e => e.tipo === 'entrada').reduce((s, e) => s + e.valor, 0),
        total_saidas: validEntries.filter(e => e.tipo === 'saida').reduce((s, e) => s + e.valor, 0),
      };
      if (fileUrl) stmtData.file_url = fileUrl;
      if (franchise?.id) stmtData.franchise_id = franchise.id;
      if (result.data.periodo_inicio) stmtData.periodo_inicio = result.data.periodo_inicio;
      if (result.data.periodo_fim) stmtData.periodo_fim = result.data.periodo_fim;
      if (result.data.saldo_inicial != null) stmtData.saldo_inicial_extrato = result.data.saldo_inicial;
      if (result.data.saldo_final != null) stmtData.saldo_final_extrato = result.data.saldo_final;

      const stmt = await createStatement(stmtData);

      // Insert entries in batches
      const entries: BankStatementEntryCreate[] = validEntries.map(e => ({
        statement_id: stmt.id,
        data_transacao: e.data_transacao,
        descricao_banco: e.descricao_banco,
        valor: e.valor,
        tipo: e.tipo,
        saldo_apos: e.saldo_apos,
        fitid: e.fitid,
        ref_num: e.ref_num,
        memo: e.memo,
      }));

      const chunkSize = 100;
      for (let i = 0; i < entries.length; i += chunkSize) {
        const chunk = entries.slice(i, i + chunkSize);
        const { error } = await supabase
          .from('mt_bank_statement_entries' as never)
          .insert(chunk.map(e => ({ ...e, tenant_id: tenant.id })));

        if (error) {
          console.error('Erro ao inserir lote de entries:', error);
          throw error;
        }
      }

      // Update statement counts
      await supabase
        .from('mt_bank_statements' as never)
        .update({ entries_unmatched: entries.length })
        .eq('id', stmt.id);

      toast.success(`${entries.length} lançamentos importados com sucesso!`);
      navigate(`/financeiro/conciliacao/${stmt.id}`);
    } catch (err: unknown) {
      console.error('Erro ao importar:', err);
      const msg = err instanceof Error ? err.message : 'Erro desconhecido';
      toast.error(`Erro ao importar: ${msg}`);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
          <Link to="/financeiro" className="hover:text-foreground">Financeiro</Link>
          <span>/</span>
          <Link to="/financeiro/conciliacao" className="hover:text-foreground">Conciliação</Link>
          <span>/</span>
          <span>Importar Extrato</span>
        </div>
        <h1 className="text-2xl font-bold">Importar Extrato Bancário</h1>
      </div>

      {/* Steps indicator */}
      <div className="flex items-center gap-4">
        {[
          { num: 1, label: 'Selecionar Conta' },
          { num: 2, label: 'Upload do Arquivo' },
          { num: 3, label: 'Confirmar Importação' },
        ].map(({ num, label }) => (
          <div key={num} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              step > num ? 'bg-green-500 text-white' :
              step === num ? 'bg-primary text-primary-foreground' :
              'bg-muted text-muted-foreground'
            }`}>
              {step > num ? <CheckCircle className="h-5 w-5" /> : num}
            </div>
            <span className={`text-sm ${step >= num ? 'font-medium' : 'text-muted-foreground'}`}>{label}</span>
            {num < 3 && <div className={`w-12 h-0.5 ${step > num ? 'bg-green-500' : 'bg-muted'}`} />}
          </div>
        ))}
      </div>

      {/* Step 1: Select Account */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Selecione a Conta Bancária</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">Escolha a conta bancária correspondente ao extrato que será importado.</p>

            {bankAccounts.length === 0 ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Nenhuma conta bancária cadastrada. <Link to="/financeiro/contas/novo" className="underline font-medium">Cadastre uma conta</Link> primeiro.
                </AlertDescription>
              </Alert>
            ) : (
              <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma conta bancária..." />
                </SelectTrigger>
                <SelectContent>
                  {bankAccounts.map(a => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.nome} {a.banco && `- ${a.banco}`} {a.agencia && `Ag: ${a.agencia}`} {a.conta && `Cc: ${a.conta}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {selectedAccount && (
              <Card className="bg-muted/50">
                <CardContent className="p-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Conta:</span>
                      <span className="ml-2 font-medium">{selectedAccount.nome}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Banco:</span>
                      <span className="ml-2 font-medium">{selectedAccount.banco || '-'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Agência:</span>
                      <span className="ml-2 font-medium">{selectedAccount.agencia || '-'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Conta Nº:</span>
                      <span className="ml-2 font-medium">{selectedAccount.conta || '-'}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="flex justify-end">
              <Button onClick={() => setStep(2)} disabled={!selectedAccountId}>
                Próximo <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Upload File */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Upload do Extrato</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Arraste ou selecione o arquivo do extrato bancário. Formatos aceitos: <strong>OFX</strong>, <strong>XLS</strong>, <strong>XLSX</strong>.
            </p>

            {/* Drop zone */}
            <div
              className="border-2 border-dashed rounded-lg p-12 text-center hover:border-primary/50 transition-colors cursor-pointer"
              onDragOver={e => e.preventDefault()}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              {isParsing ? (
                <div className="space-y-3">
                  <div className="animate-spin mx-auto h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
                  <p className="text-muted-foreground">Processando arquivo...</p>
                </div>
              ) : (
                <>
                  <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                  <p className="font-medium">Arraste o arquivo aqui ou clique para selecionar</p>
                  <p className="text-sm text-muted-foreground mt-1">OFX, XLS ou XLSX (máx. 10MB)</p>
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept={SUPPORTED_EXTENSIONS}
                className="hidden"
                onChange={onFileInput}
              />
            </div>

            {parseError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{parseError}</AlertDescription>
              </Alert>
            )}

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => { setStep(1); reset(); setSelectedFile(null); }}>
                <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Preview & Confirm */}
      {step === 3 && result && (
        <Card>
          <CardHeader>
            <CardTitle>Confirmar Importação</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="bg-muted/50">
                <CardContent className="p-3 text-center">
                  <FileSpreadsheet className="h-5 w-5 mx-auto text-blue-500 mb-1" />
                  <p className="text-xs text-muted-foreground">Arquivo</p>
                  <p className="text-sm font-medium truncate">{result.fileName}</p>
                  <Badge variant="outline" className="text-xs mt-1">{BANK_FILE_FORMAT_LABELS[result.format]}</Badge>
                </CardContent>
              </Card>
              <Card className="bg-muted/50">
                <CardContent className="p-3 text-center">
                  <p className="text-xs text-muted-foreground">Lançamentos</p>
                  <p className="text-2xl font-bold">{result.data.entries.length}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(result.data.periodo_inicio)} - {formatDate(result.data.periodo_fim)}
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-muted/50">
                <CardContent className="p-3 text-center">
                  <ArrowDownCircle className="h-5 w-5 mx-auto text-green-500 mb-1" />
                  <p className="text-xs text-muted-foreground">Total Entradas</p>
                  <p className="text-lg font-bold text-green-600">
                    {formatCurrency(result.data.entries.filter(e => e.tipo === 'entrada').reduce((s, e) => s + e.valor, 0))}
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-muted/50">
                <CardContent className="p-3 text-center">
                  <ArrowUpCircle className="h-5 w-5 mx-auto text-red-500 mb-1" />
                  <p className="text-xs text-muted-foreground">Total Saídas</p>
                  <p className="text-lg font-bold text-red-600">
                    {formatCurrency(result.data.entries.filter(e => e.tipo === 'saida').reduce((s, e) => s + e.valor, 0))}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Preview table */}
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    {result.data.entries.some(e => e.saldo_apos != null) && (
                      <TableHead className="text-right">Saldo</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.data.entries.slice(0, 20).map((entry, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="text-sm">{formatDate(entry.data_transacao)}</TableCell>
                      <TableCell className="text-sm max-w-[300px] truncate">{entry.descricao_banco}</TableCell>
                      <TableCell>
                        <Badge variant={entry.tipo === 'entrada' ? 'default' : 'destructive'} className="text-xs">
                          {entry.tipo === 'entrada' ? 'Entrada' : 'Saída'}
                        </Badge>
                      </TableCell>
                      <TableCell className={`text-right font-medium ${entry.tipo === 'entrada' ? 'text-green-600' : 'text-red-600'}`}>
                        {entry.tipo === 'saida' ? '-' : ''}{formatCurrency(entry.valor)}
                      </TableCell>
                      {result.data.entries.some(e => e.saldo_apos != null) && (
                        <TableCell className="text-right text-sm text-muted-foreground">
                          {entry.saldo_apos != null ? formatCurrency(entry.saldo_apos) : '-'}
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {result.data.entries.length > 20 && (
                <div className="p-3 text-center text-sm text-muted-foreground bg-muted/30">
                  Mostrando 20 de {result.data.entries.length} lançamentos
                </div>
              )}
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => { setStep(2); reset(); setSelectedFile(null); }}>
                <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
              </Button>
              <Button onClick={handleImport} disabled={isImporting}>
                {isImporting ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                    Importando...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" /> Importar {result.data.entries.length} Lançamentos
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
