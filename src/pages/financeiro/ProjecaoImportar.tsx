import { useState, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Upload, FileSpreadsheet, CheckCircle, ArrowLeft, ArrowRight, AlertCircle, Target, DollarSign } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { useTenantContext } from '@/contexts/TenantContext';
import { useProjectionsMT } from '@/hooks/multitenant/useProjectionsMT';
import { parseProjectionExcel } from '@/lib/parsers/projectionParser';
import { SECTION_LABELS } from '@/types/projecao';
import type { ParsedProjection, ProjectionLineCreate } from '@/types/projecao';

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function formatPercent(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

export default function ProjecaoImportar() {
  const navigate = useNavigate();
  const { tenant, franchise, accessLevel } = useTenantContext();
  const { createProjection } = useProjectionsMT();

  const [step, setStep] = useState(1);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<ParsedProjection | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form fields
  const [nome, setNome] = useState('');
  const [dataInicio, setDataInicio] = useState('');

  // Handle file
  const handleFileChange = useCallback(async (file: File) => {
    setSelectedFile(file);
    setParseError(null);
    setIsParsing(true);

    try {
      const buffer = await file.arrayBuffer();
      const result = parseProjectionExcel(buffer);
      setParsedData(result);

      // Auto-fill name from file
      if (!nome) {
        const baseName = file.name.replace(/\.(xlsx?|csv)$/i, '').slice(0, 80);
        setNome(baseName);
      }

      setStep(2);
    } catch (err: unknown) {
      console.error('Erro ao parsear planilha:', err);
      setParseError(err instanceof Error ? err.message : 'Erro ao processar arquivo');
    } finally {
      setIsParsing(false);
    }
  }, [nome]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFileChange(file);
  }, [handleFileChange]);

  const onFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileChange(file);
  }, [handleFileChange]);

  // Import
  const handleImport = async () => {
    if (!parsedData || !nome || !dataInicio) {
      toast.error('Preencha o nome e a data de início');
      return;
    }
    setIsImporting(true);

    try {
      const proj = await createProjection(
        {
          nome,
          data_inicio: dataInicio,
          franchise_id: franchise?.id || null,
          total_meses: parsedData.lines.reduce((max, l) => {
            const keys = Object.keys(l.valores).map(Number).filter(n => !isNaN(n));
            return Math.max(max, ...keys);
          }, 60),
          investimento_inicial: parsedData.header.investimento_inicial,
          tir_projetada: parsedData.header.tir_projetada,
          vpl_projetado: parsedData.header.vpl_projetado,
          roi_projetado: parsedData.header.roi_projetado,
          payback_mes: parsedData.header.payback_mes,
          lucratividade_media: parsedData.header.lucratividade_media,
          lucro_liquido_medio: parsedData.header.lucro_liquido_medio,
          investimento_detalhado: parsedData.header.investimento_detalhado,
          parcelamentos: parsedData.header.parcelamentos,
          file_name: selectedFile?.name || null,
        },
        parsedData.lines
      );

      toast.success('Plano de negócio importado com sucesso!');
      navigate(`/financeiro/projecao/${proj.id}`);
    } catch (err: unknown) {
      console.error('Erro ao importar:', err);
      toast.error(`Erro ao importar: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
    } finally {
      setIsImporting(false);
    }
  };

  // Line helpers
  const getLinesBySection = (section: string) =>
    parsedData?.lines.filter(l => l.secao === section) || [];

  const previewMonths = 6; // Show first 6 months in preview

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
          <Link to="/financeiro" className="hover:text-foreground">Financeiro</Link>
          <span>/</span>
          <Link to="/financeiro/projecao" className="hover:text-foreground">Projeção</Link>
          <span>/</span>
          <span>Importar</span>
        </div>
        <h1 className="text-2xl font-bold">Importar Plano de Negócio</h1>
        <p className="text-muted-foreground mt-1">Importe planilha Excel com projeção financeira para comparar com dados reais</p>
      </div>

      {/* Steps indicator */}
      <div className="flex items-center gap-2">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
              step >= s ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            }`}>{s}</div>
            <span className={`text-sm ${step >= s ? 'font-medium' : 'text-muted-foreground'}`}>
              {s === 1 ? 'Upload' : s === 2 ? 'Preview DRE' : 'Confirmar'}
            </span>
            {s < 3 && <div className="w-8 h-0.5 bg-muted" />}
          </div>
        ))}
      </div>

      {/* Step 1: Upload */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" /> Upload da Planilha
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* File drop zone */}
            <div
              className="border-2 border-dashed rounded-lg p-12 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onDrop={onDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={onFileInput}
              />
              {isParsing ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                  <p className="text-muted-foreground">Processando planilha...</p>
                </div>
              ) : selectedFile ? (
                <div className="flex flex-col items-center gap-2">
                  <FileSpreadsheet className="h-12 w-12 text-green-500" />
                  <p className="font-medium">{selectedFile.name}</p>
                  <p className="text-sm text-muted-foreground">Clique para trocar o arquivo</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <FileSpreadsheet className="h-12 w-12 text-muted-foreground/30" />
                  <p className="font-medium">Arraste a planilha aqui ou clique para selecionar</p>
                  <p className="text-sm text-muted-foreground">Formatos aceitos: .xlsx, .xls</p>
                </div>
              )}
            </div>

            {parseError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{parseError}</AlertDescription>
              </Alert>
            )}

            {/* Form fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome do Plano *</Label>
                <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Plano de Negócio Franquia X" />
              </div>
              <div className="space-y-2">
                <Label>Data Início (Mês 1) *</Label>
                <Input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
              </div>
            </div>
            {franchise && (
              <div className="text-sm text-muted-foreground">
                Franquia: <strong>{(franchise as Record<string, unknown>).nome_fantasia as string || (franchise as Record<string, unknown>).nome as string || franchise.id}</strong> (vinculada automaticamente)
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 2: Preview DRE + KPIs */}
      {step === 2 && parsedData && (
        <div className="space-y-4">
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-xs text-muted-foreground">Investimento</p>
                <p className="text-sm font-bold">{formatCurrency(parsedData.header.investimento_inicial)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-xs text-muted-foreground">TIR</p>
                <p className="text-sm font-bold">{formatPercent(parsedData.header.tir_projetada)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-xs text-muted-foreground">VPL</p>
                <p className="text-sm font-bold">{formatCurrency(parsedData.header.vpl_projetado)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-xs text-muted-foreground">ROI</p>
                <p className="text-sm font-bold">{parsedData.header.roi_projetado.toFixed(1)}x</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-xs text-muted-foreground">PayBack</p>
                <p className="text-sm font-bold">Mês {parsedData.header.payback_mes}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-xs text-muted-foreground">Lucratividade</p>
                <p className="text-sm font-bold">{formatPercent(parsedData.header.lucratividade_media)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-xs text-muted-foreground">Lucro Líq. Médio</p>
                <p className="text-sm font-bold">{formatCurrency(parsedData.header.lucro_liquido_medio)}</p>
              </CardContent>
            </Card>
          </div>

          {/* Investimento Detalhado */}
          {Object.keys(parsedData.header.investimento_detalhado).length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <DollarSign className="h-4 w-4" /> Investimento Inicial Detalhado
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {Object.entries(parsedData.header.investimento_detalhado).map(([key, val]) => (
                    <div key={key} className="flex justify-between text-sm border rounded px-3 py-2">
                      <span className="text-muted-foreground">{key.replace(/_/g, ' ')}</span>
                      <span className="font-mono font-medium">{formatCurrency(val)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Preview by sections */}
          <Tabs defaultValue="dre" className="w-full">
            <TabsList>
              <TabsTrigger value="dre">DRE ({getLinesBySection('dre').length} linhas)</TabsTrigger>
              <TabsTrigger value="despesas_fixas">Despesas Fixas ({getLinesBySection('despesas_fixas').length})</TabsTrigger>
              <TabsTrigger value="faturamento">Faturamento ({getLinesBySection('faturamento').length})</TabsTrigger>
              <TabsTrigger value="payback">PayBack ({getLinesBySection('payback').length})</TabsTrigger>
            </TabsList>

            {(['dre', 'despesas_fixas', 'faturamento', 'payback'] as const).map((section) => (
              <TabsContent key={section} value={section}>
                <Card>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="min-w-[200px] sticky left-0 bg-background z-10">Linha</TableHead>
                            <TableHead className="text-center w-20">Tipo</TableHead>
                            {Array.from({ length: previewMonths }, (_, i) => (
                              <TableHead key={i} className="text-right min-w-[100px]">Mês {i + 1}</TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {getLinesBySection(section).map((line, idx) => (
                            <TableRow key={idx} className={line.is_subtotal ? 'font-bold bg-muted/30' : ''}>
                              <TableCell className="sticky left-0 bg-background z-10">
                                <span style={{ paddingLeft: `${(line.indent_level || 0) * 16}px` }}>
                                  {line.nome}
                                </span>
                                {line.percentual != null && (
                                  <Badge variant="outline" className="ml-2 text-xs">
                                    {(line.percentual * 100).toFixed(1)}%
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge variant={
                                  line.tipo === 'receita' ? 'default' :
                                  line.tipo === 'despesa' ? 'destructive' :
                                  line.tipo === 'subtotal' ? 'secondary' : 'outline'
                                } className="text-xs">
                                  {line.tipo}
                                </Badge>
                              </TableCell>
                              {Array.from({ length: previewMonths }, (_, i) => {
                                const val = line.valores[String(i + 1)] ?? 0;
                                return (
                                  <TableCell key={i} className="text-right font-mono text-sm">
                                    {line.tipo === 'indicador' && (line.codigo === 'margem_liquida' || line.codigo === 'evolucao_pct' || line.codigo === 'lucro_pct')
                                      ? `${(val * 100).toFixed(1)}%`
                                      : formatCurrency(val)
                                    }
                                  </TableCell>
                                );
                              })}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            ))}
          </Tabs>

          {/* Summary */}
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>{parsedData.lines.length} linhas</strong> identificadas em {Object.keys(SECTION_LABELS).length} seções.
              Ao confirmar, todas serão salvas com valores para até 60 meses.
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Step 3: Confirm (just reuse step 2 with confirm button) */}
      {step === 3 && parsedData && (
        <Card>
          <CardContent className="p-6 text-center space-y-4">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
            <h2 className="text-xl font-bold">Pronto para importar!</h2>
            <div className="text-muted-foreground space-y-1">
              <p><strong>Plano:</strong> {nome}</p>
              <p><strong>Data início:</strong> {dataInicio ? new Date(dataInicio + 'T00:00:00').toLocaleDateString('pt-BR') : 'Não definida'}</p>
              <p><strong>Linhas:</strong> {parsedData.lines.length}</p>
              <p><strong>Investimento:</strong> {formatCurrency(parsedData.header.investimento_inicial)}</p>
              <p><strong>PayBack:</strong> Mês {parsedData.header.payback_mes}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={() => {
          if (step === 1) navigate('/financeiro/projecao');
          else setStep(step - 1);
        }}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          {step === 1 ? 'Voltar' : 'Anterior'}
        </Button>

        <div className="flex gap-2">
          {step === 1 && parsedData && (
            <Button onClick={() => setStep(2)}>
              Próximo <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
          {step === 2 && (
            <Button onClick={() => {
              if (!nome || !dataInicio) {
                toast.error('Preencha o nome e a data de início antes de continuar');
                setStep(1);
                return;
              }
              setStep(3);
            }}>
              Próximo <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
          {step === 3 && (
            <Button onClick={handleImport} disabled={isImporting || !parsedData}>
              {isImporting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Importando...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Confirmar Importação
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
