// Página: Criar/Editar Lista de Destinatários (Broadcast List)

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Upload, UserPlus, FileText, Users, CheckCircle2, XCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useBroadcastListsMT, useRecipientsByList } from '@/hooks/multitenant/useBroadcastListsMT';
import { useTenantContext } from '@/contexts/TenantContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ParsedNumber {
  original: string;
  cleaned: string;
  valid: boolean;
}

interface CsvRow {
  phone: string;
  nome: string;
}

function cleanPhoneNumber(phone: string): string {
  return phone.replace(/\D/g, '');
}

function isValidPhone(cleaned: string): boolean {
  return cleaned.length >= 10 && cleaned.length <= 15;
}

export default function WhatsAppListaEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = !!id;
  const { tenant, accessLevel } = useTenantContext();

  const { lists, createList, updateList, addRecipients } = useBroadcastListsMT();
  const existingList = isEditing ? lists.find((l) => l.id === id) : null;

  // Form state
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [createdListId, setCreatedListId] = useState<string | null>(id || null);
  const [isSaving, setIsSaving] = useState(false);

  // Paste numbers state
  const [rawNumbers, setRawNumbers] = useState('');
  const [parsedNumbers, setParsedNumbers] = useState<ParsedNumber[]>([]);
  const [showParsed, setShowParsed] = useState(false);

  // CSV state
  const [csvRows, setCsvRows] = useState<CsvRow[]>([]);
  const [csvValid, setCsvValid] = useState(0);
  const [csvInvalid, setCsvInvalid] = useState(0);
  const [showCsvPreview, setShowCsvPreview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Import leads state
  const [leadsCount, setLeadsCount] = useState<number | null>(null);
  const [isCountingLeads, setIsCountingLeads] = useState(false);
  const [isImportingLeads, setIsImportingLeads] = useState(false);

  // Populate form for edit mode
  useEffect(() => {
    if (existingList) {
      setNome(existingList.nome);
      setDescricao(existingList.descricao || '');
    }
  }, [existingList]);

  // ---------------------------------------------------------------------------
  // Save List (Create or Update metadata)
  // ---------------------------------------------------------------------------
  const handleSaveList = async () => {
    if (!nome.trim()) {
      toast.error('O nome da lista é obrigatório.');
      return;
    }

    setIsSaving(true);
    try {
      if (isEditing && id) {
        await updateList.mutateAsync({ id, nome: nome.trim(), descricao: descricao.trim() || undefined });
      } else {
        const newList = await createList.mutateAsync({
          nome: nome.trim(),
          descricao: descricao.trim() || undefined,
          source_type: 'manual',
        });
        setCreatedListId(newList.id);
        toast.success('Lista criada! Agora adicione os destinatários.');
        // Update URL without full navigation
        window.history.replaceState(null, '', `/whatsapp/listas/${newList.id}/editar`);
      }
    } catch {
      // Error handled by hook
    } finally {
      setIsSaving(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Tab 1: Paste Numbers
  // ---------------------------------------------------------------------------
  const handleParseNumbers = () => {
    const lines = rawNumbers
      .split(/[\n,;]+/)
      .map((l) => l.trim())
      .filter(Boolean);

    const parsed: ParsedNumber[] = lines.map((original) => {
      const cleaned = cleanPhoneNumber(original);
      return { original, cleaned, valid: isValidPhone(cleaned) };
    });

    setParsedNumbers(parsed);
    setShowParsed(true);
  };

  const handleAddParsedNumbers = async () => {
    if (!createdListId) return;

    const recipients = parsedNumbers.map((p) => ({
      phone: p.original,
      nome: undefined,
    }));

    try {
      await addRecipients.mutateAsync({ listId: createdListId, recipients });
      setRawNumbers('');
      setParsedNumbers([]);
      setShowParsed(false);
    } catch {
      // Error handled by hook
    }
  };

  // ---------------------------------------------------------------------------
  // Tab 2: CSV Upload
  // ---------------------------------------------------------------------------
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const lines = text.split(/\r?\n/).filter(Boolean);
      const rows: CsvRow[] = [];
      let valid = 0;
      let invalid = 0;

      // Skip header if it looks like one
      const startIdx = /^(phone|telefone|numero|number)/i.test(lines[0] || '') ? 1 : 0;

      for (let i = startIdx; i < lines.length; i++) {
        const parts = lines[i].split(/[,;\t]/);
        const phone = (parts[0] || '').trim();
        const nome = (parts[1] || '').trim();

        if (!phone) continue;

        const cleaned = cleanPhoneNumber(phone);
        if (isValidPhone(cleaned)) {
          valid++;
        } else {
          invalid++;
        }
        rows.push({ phone, nome });
      }

      setCsvRows(rows);
      setCsvValid(valid);
      setCsvInvalid(invalid);
      setShowCsvPreview(true);
    };
    reader.readAsText(file);
  };

  const handleImportCsv = async () => {
    if (!createdListId || csvRows.length === 0) return;

    const recipients = csvRows.map((row) => ({
      phone: row.phone,
      nome: row.nome || undefined,
    }));

    try {
      await addRecipients.mutateAsync({ listId: createdListId, recipients });
      setCsvRows([]);
      setCsvValid(0);
      setCsvInvalid(0);
      setShowCsvPreview(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch {
      // Error handled by hook
    }
  };

  // ---------------------------------------------------------------------------
  // Tab 3: Import from Leads
  // ---------------------------------------------------------------------------
  const handleCountLeads = useCallback(async () => {
    if (!tenant && accessLevel !== 'platform') return;

    setIsCountingLeads(true);
    try {
      let q = supabase
        .from('mt_leads')
        .select('id', { count: 'exact', head: true })
        .not('telefone', 'is', null)
        .is('deleted_at', null);

      if (accessLevel === 'tenant' && tenant) {
        q = q.eq('tenant_id', tenant.id);
      }

      const { count, error } = await q;
      if (error) throw error;
      setLeadsCount(count || 0);
    } catch (err: unknown) {
      toast.error('Erro ao contar leads: ' + (err instanceof Error ? err.message : 'Erro desconhecido'));
    } finally {
      setIsCountingLeads(false);
    }
  }, [tenant, accessLevel]);

  const handleImportLeads = async () => {
    if (!createdListId || !tenant) return;

    setIsImportingLeads(true);
    try {
      let q = supabase
        .from('mt_leads')
        .select('id, telefone, nome')
        .not('telefone', 'is', null)
        .is('deleted_at', null);

      if (accessLevel === 'tenant' && tenant) {
        q = q.eq('tenant_id', tenant.id);
      }

      const { data, error } = await q;
      if (error) throw error;

      if (!data || data.length === 0) {
        toast.info('Nenhum lead com telefone encontrado.');
        return;
      }

      const recipients = data.map((lead: Record<string, unknown>) => ({
        phone: lead.telefone,
        nome: lead.nome || undefined,
        lead_id: lead.id,
      }));

      await addRecipients.mutateAsync({ listId: createdListId, recipients });
    } catch (err: unknown) {
      toast.error('Erro ao importar leads: ' + (err instanceof Error ? err.message : 'Erro desconhecido'));
    } finally {
      setIsImportingLeads(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const validCount = parsedNumbers.filter((p) => p.valid).length;
  const invalidCount = parsedNumbers.filter((p) => !p.valid).length;
  const showRecipientSection = !!createdListId;

  if (isEditing && !existingList && lists.length > 0) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate('/whatsapp/listas')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <div className="text-center py-16">
          <AlertCircle className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-lg font-semibold">Lista não encontrada</h3>
          <p className="text-muted-foreground mt-1">A lista solicitada não existe ou foi removida.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/whatsapp/listas')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">
            {isEditing ? 'Editar Lista' : 'Nova Lista de Destinatários'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isEditing
              ? 'Atualize os dados da lista e gerencie destinatários'
              : 'Crie uma nova lista e adicione números de telefone'}
          </p>
        </div>
      </div>

      {/* Metadata Form */}
      <Card>
        <CardHeader>
          <CardTitle>Dados da Lista</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Nome *</label>
            <Input
              placeholder="Ex: Clientes VIP, Leads Janeiro..."
              value={nome}
              onChange={(e) => setNome(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Descrição</label>
            <Textarea
              placeholder="Descrição opcional da lista..."
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              rows={3}
            />
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSaveList} disabled={isSaving || !nome.trim()}>
              {isSaving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {isEditing ? 'Salvar Alterações' : 'Criar Lista'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recipient Input Section */}
      {showRecipientSection ? (
        <Card>
          <CardHeader>
            <CardTitle>Adicionar Destinatários</CardTitle>
            <CardDescription>
              Escolha uma forma de adicionar números de telefone à lista
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="paste">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="paste">
                  <FileText className="h-4 w-4 mr-2" />
                  Colar Números
                </TabsTrigger>
                <TabsTrigger value="csv">
                  <Upload className="h-4 w-4 mr-2" />
                  Upload CSV
                </TabsTrigger>
                <TabsTrigger value="leads">
                  <Users className="h-4 w-4 mr-2" />
                  Importar de Leads
                </TabsTrigger>
              </TabsList>

              {/* Tab 1: Paste Numbers */}
              <TabsContent value="paste" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Cole os números de telefone (um por linha, separados por vírgula ou ponto e vírgula)
                  </label>
                  <Textarea
                    placeholder={`5511999999999\n5521988888888\n5513977777777`}
                    value={rawNumbers}
                    onChange={(e) => {
                      setRawNumbers(e.target.value);
                      setShowParsed(false);
                    }}
                    rows={8}
                    className="font-mono text-sm"
                  />
                </div>

                <Button
                  onClick={handleParseNumbers}
                  disabled={!rawNumbers.trim()}
                  variant="secondary"
                >
                  Analisar Números
                </Button>

                {showParsed && parsedNumbers.length > 0 && (
                  <div className="space-y-3">
                    <Separator />
                    <div className="flex items-center gap-4">
                      <Badge variant="default" className="bg-green-600">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        {validCount} válidos
                      </Badge>
                      {invalidCount > 0 && (
                        <Badge variant="destructive">
                          <XCircle className="h-3 w-3 mr-1" />
                          {invalidCount} inválidos
                        </Badge>
                      )}
                    </div>

                    {invalidCount > 0 && (
                      <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3">
                        <p className="text-sm font-medium text-destructive mb-1">Números inválidos:</p>
                        <ul className="text-sm text-muted-foreground space-y-0.5">
                          {parsedNumbers
                            .filter((p) => !p.valid)
                            .slice(0, 10)
                            .map((p, i) => (
                              <li key={i} className="font-mono">
                                {p.original} ({p.cleaned.length} dígitos)
                              </li>
                            ))}
                          {invalidCount > 10 && (
                            <li className="italic">...e mais {invalidCount - 10} número(s)</li>
                          )}
                        </ul>
                      </div>
                    )}

                    <Button
                      onClick={handleAddParsedNumbers}
                      disabled={addRecipients.isPending || parsedNumbers.length === 0}
                    >
                      {addRecipients.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <UserPlus className="h-4 w-4 mr-2" />
                      )}
                      Adicionar {parsedNumbers.length} número(s)
                    </Button>
                  </div>
                )}
              </TabsContent>

              {/* Tab 2: CSV Upload */}
              <TabsContent value="csv" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Selecione um arquivo CSV ou TXT (primeira coluna = telefone, segunda = nome)
                  </label>
                  <Input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.txt"
                    onChange={handleFileChange}
                  />
                </div>

                {showCsvPreview && csvRows.length > 0 && (
                  <div className="space-y-3">
                    <Separator />
                    <div className="flex items-center gap-4">
                      <Badge variant="secondary">{csvRows.length} linhas</Badge>
                      <Badge variant="default" className="bg-green-600">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        {csvValid} válidos
                      </Badge>
                      {csvInvalid > 0 && (
                        <Badge variant="destructive">
                          <XCircle className="h-3 w-3 mr-1" />
                          {csvInvalid} inválidos
                        </Badge>
                      )}
                    </div>

                    <div className="border rounded-md max-h-64 overflow-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Telefone</TableHead>
                            <TableHead>Nome</TableHead>
                            <TableHead className="text-center">Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {csvRows.slice(0, 10).map((row, i) => {
                            const cleaned = cleanPhoneNumber(row.phone);
                            const valid = isValidPhone(cleaned);
                            return (
                              <TableRow key={i}>
                                <TableCell className="font-mono text-sm">{row.phone}</TableCell>
                                <TableCell>{row.nome || '-'}</TableCell>
                                <TableCell className="text-center">
                                  {valid ? (
                                    <CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" />
                                  ) : (
                                    <XCircle className="h-4 w-4 text-destructive mx-auto" />
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                          {csvRows.length > 10 && (
                            <TableRow>
                              <TableCell colSpan={3} className="text-center text-muted-foreground italic">
                                ...e mais {csvRows.length - 10} linha(s)
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>

                    <Button
                      onClick={handleImportCsv}
                      disabled={addRecipients.isPending || csvRows.length === 0}
                    >
                      {addRecipients.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4 mr-2" />
                      )}
                      Importar {csvRows.length} número(s)
                    </Button>
                  </div>
                )}
              </TabsContent>

              {/* Tab 3: Import from Leads */}
              <TabsContent value="leads" className="space-y-4 mt-4">
                <p className="text-sm text-muted-foreground">
                  Importe todos os leads do tenant que possuem telefone cadastrado.
                </p>

                {leadsCount === null ? (
                  <Button onClick={handleCountLeads} disabled={isCountingLeads} variant="secondary">
                    {isCountingLeads ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Users className="h-4 w-4 mr-2" />
                    )}
                    Verificar leads disponíveis
                  </Button>
                ) : (
                  <div className="space-y-3">
                    <div className="bg-muted rounded-md p-4">
                      <p className="text-sm">
                        <span className="font-bold text-2xl">{leadsCount}</span>{' '}
                        <span className="text-muted-foreground">lead(s) com telefone cadastrado</span>
                      </p>
                    </div>

                    {leadsCount > 0 ? (
                      <Button onClick={handleImportLeads} disabled={isImportingLeads}>
                        {isImportingLeads ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <UserPlus className="h-4 w-4 mr-2" />
                        )}
                        Importar {leadsCount} lead(s)
                      </Button>
                    ) : (
                      <p className="text-sm text-muted-foreground">Nenhum lead disponível para importação.</p>
                    )}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <UserPlus className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>Salve a lista primeiro para adicionar destinatários.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
