// Pagina: Adicionar Membros em Massa a Grupo WhatsApp (Wizard Multi-Step)

import { useState, useMemo, useCallback, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Upload,
  Users,
  AlertTriangle,
  FileText,
  List,
  Keyboard,
  Play,
  Pause,
  Loader2,
  CheckCircle2,
  XCircle,
  SkipForward,
  Settings2,
  Eye,
  Ban,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useWhatsAppSessionsMT } from '@/hooks/multitenant/useWhatsAppSessionsMT';
import { useGroupsMT, useGroupInfoMT } from '@/hooks/multitenant/useGroupsMT';
import { useGroupOperationsMT, useGroupOperationMT, type MTGroupOperation } from '@/hooks/multitenant/useGroupOperationsMT';
import { useBroadcastListsMT } from '@/hooks/multitenant/useBroadcastListsMT';
import { useTenantContext } from '@/contexts/TenantContext';
import { toast } from 'sonner';
import { Clock, History, CalendarClock } from 'lucide-react';

// =============================================================================
// Types
// =============================================================================

interface ParsedNumber {
  raw: string;
  cleaned: string;
  isValid: boolean;
}

type GroupMode = 'existing' | 'new';
type InputTab = 'manual' | 'csv' | 'broadcast';

const WHATSAPP_GROUP_LIMIT = 1024;

// =============================================================================
// Helpers
// =============================================================================

function cleanPhoneNumber(phone: string): string {
  return phone.replace(/\D/g, '');
}

function isValidPhone(cleaned: string): boolean {
  return cleaned.length >= 10 && cleaned.length <= 15;
}

function parseNumbers(text: string): ParsedNumber[] {
  if (!text.trim()) return [];

  // Separar por quebra de linha, virgula ou ponto-e-virgula
  const lines = text
    .split(/[\n,;]+/)
    .map((l) => l.trim())
    .filter(Boolean);

  return lines.map((raw) => {
    const cleaned = cleanPhoneNumber(raw);
    return {
      raw,
      cleaned,
      isValid: isValidPhone(cleaned),
    };
  });
}

function deduplicateNumbers(numbers: ParsedNumber[]): ParsedNumber[] {
  const seen = new Set<string>();
  return numbers.filter((n) => {
    if (seen.has(n.cleaned)) return false;
    seen.add(n.cleaned);
    return true;
  });
}

// =============================================================================
// Step indicators
// =============================================================================

const STEPS = [
  { id: 1, label: 'Sessao', icon: Settings2 },
  { id: 2, label: 'Grupo', icon: Users },
  { id: 3, label: 'Numeros', icon: List },
  { id: 4, label: 'Configurar', icon: Settings2 },
  { id: 5, label: 'Executar', icon: Play },
] as const;

// =============================================================================
// Component
// =============================================================================

export default function WhatsAppGrupoBulkAdd() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { accessLevel } = useTenantContext();

  // URL params para pre-selecao
  const preSelectedSession = searchParams.get('session') || '';
  const preSelectedGroup = searchParams.get('group') || '';

  // Historico de operacoes deste grupo
  const { data: groupHistory, isLoading: isLoadingHistory } = useGroupOperationsMT(
    preSelectedGroup ? { group_id: preSelectedGroup } : undefined
  );

  // Wizard state
  const [currentStep, setCurrentStep] = useState(1);

  // Step 1: Sessao
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const { sessions, isLoading: isLoadingSessions } = useWhatsAppSessionsMT({ is_active: true });

  // Auto-selecionar sessao via URL param
  const selectedSession = useMemo(() => {
    if (selectedSessionId) {
      return sessions?.find((s) => s.id === selectedSessionId);
    }
    if (preSelectedSession && sessions?.length) {
      const found = sessions.find(
        (s) => s.session_name === preSelectedSession || s.id === preSelectedSession
      );
      if (found && !selectedSessionId) {
        setSelectedSessionId(found.id);
      }
      return found;
    }
    return undefined;
  }, [selectedSessionId, preSelectedSession, sessions]);

  const sessionName = selectedSession?.session_name;

  // Step 2: Grupo
  const [groupMode, setGroupMode] = useState<GroupMode>(preSelectedGroup ? 'existing' : 'existing');
  const [selectedGroupId, setSelectedGroupId] = useState(preSelectedGroup);
  const [newGroupName, setNewGroupName] = useState('');

  const { groups, isLoading: isLoadingGroups } = useGroupsMT(sessionName, selectedSessionId || undefined);

  // Buscar participantes do grupo selecionado (para filtrar quem ja esta)
  const groupIdForInfo = groupMode === 'existing' ? selectedGroupId : undefined;
  const {
    participants: existingParticipants,
    isLoading: isLoadingParticipants,
  } = useGroupInfoMT(sessionName, groupIdForInfo || undefined, selectedSessionId || undefined);

  // Extrair telefones dos participantes existentes (usar phoneNumber quando disponivel)
  const existingPhones = useMemo(() => {
    if (!existingParticipants || existingParticipants.length === 0) return new Set<string>();
    return new Set(
      existingParticipants.map((p) => {
        const source = (typeof p.phoneNumber === 'string' ? p.phoneNumber : '') || (typeof p.id === 'string' ? p.id : String(p.id || ''));
        return source.replace(/@.*$/, '').replace(/\D/g, '');
      }).filter(Boolean)
    );
  }, [existingParticipants]);

  // Step 3: Numeros
  const [inputTab, setInputTab] = useState<InputTab>('manual');
  const [manualText, setManualText] = useState('');
  const [selectedBroadcastListId, setSelectedBroadcastListId] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { lists: broadcastLists, isLoading: isLoadingBroadcasts } = useBroadcastListsMT({ is_active: true });

  // Numeros parsed de todas as fontes
  const [importedNumbers, setImportedNumbers] = useState<ParsedNumber[]>([]);

  const parsedManualNumbers = useMemo(() => parseNumbers(manualText), [manualText]);

  // Combinar numeros de todas as fontes
  const allNumbers = useMemo(() => {
    const combined = [...parsedManualNumbers, ...importedNumbers];
    return deduplicateNumbers(combined);
  }, [parsedManualNumbers, importedNumbers]);

  const validNumbers = allNumbers.filter((n) => n.isValid);
  const invalidNumbers = allNumbers.filter((n) => !n.isValid);

  // Separar numeros que ja estao no grupo dos que precisam ser adicionados
  const { numbersToAdd, numbersAlreadyInGroup } = useMemo(() => {
    if (existingPhones.size === 0 || groupMode === 'new') {
      return { numbersToAdd: validNumbers, numbersAlreadyInGroup: [] as ParsedNumber[] };
    }
    const toAdd: ParsedNumber[] = [];
    const alreadyIn: ParsedNumber[] = [];
    for (const n of validNumbers) {
      if (existingPhones.has(n.cleaned)) {
        alreadyIn.push(n);
      } else {
        toAdd.push(n);
      }
    }
    return { numbersToAdd: toAdd, numbersAlreadyInGroup: alreadyIn };
  }, [validNumbers, existingPhones, groupMode]);

  // Step 4: Configuracao (defaults seguros: 20 por lote, 20 min entre lotes)
  const [batchSize, setBatchSize] = useState(20);
  const [delayMinutes, setDelayMinutes] = useState(20);
  const [maxContacts, setMaxContacts] = useState(0); // 0 = sem limite
  const [scheduledAt, setScheduledAt] = useState(''); // ISO string ou vazio = agora

  // Limitar numbersToAdd pelo maxContacts
  const numbersToProcess = useMemo(() => {
    if (maxContacts > 0 && maxContacts < numbersToAdd.length) {
      return numbersToAdd.slice(0, maxContacts);
    }
    return numbersToAdd;
  }, [numbersToAdd, maxContacts]);

  // Step 5: Execucao
  const [operationId, setOperationId] = useState<string | null>(null);
  const [isStarted, setIsStarted] = useState(false);

  const { createOperation, startOperation, pauseOperation, cancelOperation, isCreating, isStarting } = useGroupOperationsMT();
  const { operation, progress } = useGroupOperationMT(operationId || undefined);

  // =========================================================================
  // CSV Upload Handler
  // =========================================================================

  const handleCsvUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv') && !file.name.endsWith('.txt')) {
      toast.error('Formato invalido. Use arquivo .csv ou .txt');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const lines = text.split(/\r?\n/).filter(Boolean);

      // Detectar se tem header (primeira linha nao e telefone)
      const firstLine = lines[0]?.trim();
      const hasHeader = firstLine && !/^\d/.test(cleanPhoneNumber(firstLine));

      const dataLines = hasHeader ? lines.slice(1) : lines;

      const numbers: ParsedNumber[] = [];

      for (const line of dataLines) {
        // Pegar primeira coluna (telefone) se CSV com multiplas colunas
        const cols = line.split(/[,;|\t]/);
        const raw = cols[0]?.trim();
        if (!raw) continue;

        const cleaned = cleanPhoneNumber(raw);
        numbers.push({
          raw,
          cleaned,
          isValid: isValidPhone(cleaned),
        });
      }

      setImportedNumbers((prev) => {
        const combined = [...prev, ...numbers];
        return deduplicateNumbers(combined);
      });

      toast.success(`${numbers.length} numero(s) importado(s) do CSV`);
    };

    reader.onerror = () => toast.error('Erro ao ler arquivo');
    reader.readAsText(file);

    // Limpar input para permitir re-upload do mesmo arquivo
    e.target.value = '';
  }, []);

  // =========================================================================
  // Broadcast List Import
  // =========================================================================

  const handleImportFromBroadcast = useCallback(async () => {
    if (!selectedBroadcastListId) {
      toast.error('Selecione uma lista primeiro');
      return;
    }

    // Buscar destinatarios da lista
    const { data, error } = await (await import('@/integrations/supabase/client')).supabase
      .from('mt_broadcast_recipients')
      .select('phone, nome')
      .eq('list_id', selectedBroadcastListId)
      .eq('is_valid', true);

    if (error) {
      toast.error(`Erro ao importar: ${error.message}`);
      return;
    }

    if (!data || data.length === 0) {
      toast.error('Nenhum destinatario valido nesta lista');
      return;
    }

    const numbers: ParsedNumber[] = data.map((r) => ({
      raw: r.phone,
      cleaned: cleanPhoneNumber(r.phone),
      isValid: isValidPhone(cleanPhoneNumber(r.phone)),
    }));

    setImportedNumbers((prev) => {
      const combined = [...prev, ...numbers];
      return deduplicateNumbers(combined);
    });

    toast.success(`${numbers.length} numero(s) importado(s) da lista`);
  }, [selectedBroadcastListId]);

  // =========================================================================
  // Iniciar operacao
  // =========================================================================

  const handleStart = async () => {
    if (numbersToProcess.length === 0) {
      toast.error(
        numbersAlreadyInGroup.length > 0
          ? 'Todos os numeros ja estao no grupo!'
          : 'Nenhum numero valido para adicionar'
      );
      return;
    }

    if (!selectedSessionId) {
      toast.error('Sessao nao selecionada');
      return;
    }

    try {
      const items = numbersToProcess.map((n) => ({ phone: n.cleaned }));

      const isCreateGroup = groupMode === 'new';

      const scheduledIso = scheduledAt ? new Date(scheduledAt).toISOString() : null;

      const op = await createOperation.mutateAsync({
        session_id: selectedSessionId,
        session_name: sessionName || '',
        operation_type: isCreateGroup ? 'create_group' : 'add_to_group',
        group_id: isCreateGroup ? null : selectedGroupId || null,
        group_name: isCreateGroup ? newGroupName : groups.find((g) => g.id === selectedGroupId)?.subject || null,
        batch_size: batchSize,
        delay_between_batches_ms: delayMinutes * 60 * 1000,
        scheduled_at: scheduledIso,
        items,
      });

      setOperationId(op.id);

      // Iniciar processamento (edge function verifica scheduled_at)
      await startOperation.mutateAsync(op.id);
      setIsStarted(true);
    } catch {
      // Erros tratados pelos hooks
    }
  };

  // =========================================================================
  // Step validation
  // =========================================================================

  const canAdvance = useMemo(() => {
    switch (currentStep) {
      case 1:
        return !!selectedSessionId;
      case 2:
        return groupMode === 'existing' ? !!selectedGroupId : !!newGroupName.trim();
      case 3:
        return numbersToAdd.length > 0;
      case 4:
        return batchSize >= 1 && batchSize <= 50 && delayMinutes >= 1;
      case 5:
        return true;
      default:
        return false;
    }
  }, [currentStep, selectedSessionId, groupMode, selectedGroupId, newGroupName, numbersToAdd, batchSize, delayMinutes]);

  const goNext = () => {
    if (canAdvance && currentStep < 5) {
      setCurrentStep(currentStep + 1);
    }
  };

  const goBack = () => {
    if (currentStep > 1 && !isStarted) {
      setCurrentStep(currentStep - 1);
    }
  };

  // =========================================================================
  // Render helpers
  // =========================================================================

  const selectedGroupInfo = groups.find((g) => g.id === selectedGroupId);

  const currentGroupSize = existingParticipants?.length || 0;
  const isOverLimit = (currentGroupSize + numbersToProcess.length) > WHATSAPP_GROUP_LIMIT;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/whatsapp/grupos')}
          disabled={isStarted && operation?.status === 'processing'}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Adicionar Membros em Massa</h1>
          <p className="text-muted-foreground mt-1">
            Adicione contatos a um grupo WhatsApp de forma controlada
          </p>
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex items-center justify-between">
        {STEPS.map((step, index) => {
          const Icon = step.icon;
          const isActive = currentStep === step.id;
          const isComplete = currentStep > step.id;

          return (
            <div key={step.id} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-shrink-0">
                <div
                  className={`
                    h-10 w-10 rounded-full flex items-center justify-center text-sm font-medium
                    transition-colors
                    ${isComplete ? 'bg-primary text-primary-foreground' : ''}
                    ${isActive ? 'bg-primary text-primary-foreground ring-2 ring-primary/30' : ''}
                    ${!isActive && !isComplete ? 'bg-muted text-muted-foreground' : ''}
                  `}
                >
                  {isComplete ? <Check className="h-5 w-5" /> : <Icon className="h-4 w-4" />}
                </div>
                <span
                  className={`text-xs mt-1 ${
                    isActive ? 'font-semibold text-primary' : 'text-muted-foreground'
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {index < STEPS.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-2 mt-[-16px] ${
                    isComplete ? 'bg-primary' : 'bg-muted'
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* ================================================================= */}
      {/* STEP 1: Selecionar Sessao */}
      {/* ================================================================= */}
      {currentStep === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Selecionar Sessao WhatsApp</CardTitle>
            <CardDescription>Escolha a sessao que sera usada para adicionar membros ao grupo</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select
              value={selectedSessionId || 'none'}
              onValueChange={(v) => setSelectedSessionId(v === 'none' ? '' : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma sessao..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Selecione uma sessao...</SelectItem>
                {sessions?.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.nome || s.session_name}
                    {s.display_name ? ` (${s.display_name})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {isLoadingSessions && (
              <p className="text-sm text-muted-foreground">Carregando sessoes...</p>
            )}

            {sessions && sessions.length === 0 && !isLoadingSessions && (
              <div className="text-center py-4">
                <AlertTriangle className="h-8 w-8 text-amber-500 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  Nenhuma sessao ativa encontrada. Configure uma sessao WhatsApp primeiro.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ================================================================= */}
      {/* STEP 2: Selecionar Grupo */}
      {/* ================================================================= */}
      {currentStep === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Selecionar Grupo</CardTitle>
            <CardDescription>Escolha um grupo existente ou crie um novo</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Toggle entre existente e novo */}
            <div className="flex gap-2">
              <Button
                variant={groupMode === 'existing' ? 'default' : 'outline'}
                onClick={() => setGroupMode('existing')}
              >
                Grupo Existente
              </Button>
              <Button
                variant={groupMode === 'new' ? 'default' : 'outline'}
                onClick={() => setGroupMode('new')}
              >
                Criar Novo Grupo
              </Button>
            </div>

            <Separator />

            {groupMode === 'existing' ? (
              <div className="space-y-3">
                {isLoadingGroups ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Carregando grupos...
                  </div>
                ) : groups.length === 0 ? (
                  <div className="text-center py-4">
                    <Users className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Nenhum grupo encontrado nesta sessao.
                    </p>
                    <Button
                      variant="link"
                      className="mt-1"
                      onClick={() => setGroupMode('new')}
                    >
                      Criar novo grupo
                    </Button>
                  </div>
                ) : (
                  <Select
                    value={selectedGroupId || 'none'}
                    onValueChange={(v) => setSelectedGroupId(v === 'none' ? '' : v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um grupo..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Selecione um grupo...</SelectItem>
                      {groups.map((g) => (
                        <SelectItem key={g.id} value={g.id}>
                          {g.subject || g.id} ({g.size ?? g.participants?.length ?? 0} membros)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {selectedGroupInfo && (
                  <div className="p-3 bg-muted rounded-lg space-y-1">
                    <p className="text-sm font-medium">{selectedGroupInfo.subject}</p>
                    <p className="text-xs text-muted-foreground font-mono">{selectedGroupInfo.id}</p>
                    <Badge variant="secondary" className="text-xs">
                      {selectedGroupInfo.size ?? selectedGroupInfo.participants?.length ?? 0} membros atuais
                    </Badge>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Nome do novo grupo</label>
                  <Input
                    placeholder="Ex: Grupo VIP - Viniun 2026"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    maxLength={100}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    O grupo sera criado com os membros adicionados na etapa seguinte.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ================================================================= */}
      {/* STEP 3: Adicionar Numeros */}
      {/* ================================================================= */}
      {currentStep === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Adicionar Numeros</CardTitle>
            <CardDescription>
              Insira os numeros de telefone dos membros que deseja adicionar ao grupo
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Tabs */}
            <div className="flex gap-1 p-1 bg-muted rounded-lg">
              <Button
                variant={inputTab === 'manual' ? 'default' : 'ghost'}
                size="sm"
                className="flex-1"
                onClick={() => setInputTab('manual')}
              >
                <Keyboard className="h-4 w-4 mr-2" />
                Digitar
              </Button>
              <Button
                variant={inputTab === 'csv' ? 'default' : 'ghost'}
                size="sm"
                className="flex-1"
                onClick={() => setInputTab('csv')}
              >
                <FileText className="h-4 w-4 mr-2" />
                CSV
              </Button>
              <Button
                variant={inputTab === 'broadcast' ? 'default' : 'ghost'}
                size="sm"
                className="flex-1"
                onClick={() => setInputTab('broadcast')}
              >
                <List className="h-4 w-4 mr-2" />
                Lista de Broadcast
              </Button>
            </div>

            {/* Tab: Digitar manualmente */}
            {inputTab === 'manual' && (
              <div className="space-y-2">
                <Textarea
                  placeholder={`Cole os numeros aqui, um por linha ou separados por virgula:\n\n5511999999999\n5513988887777\n5521977776666`}
                  value={manualText}
                  onChange={(e) => setManualText(e.target.value)}
                  rows={10}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Formatos aceitos: um numero por linha, separados por virgula ou ponto-e-virgula.
                  Inclua o DDI (55 para Brasil).
                </p>
              </div>
            )}

            {/* Tab: Upload CSV */}
            {inputTab === 'csv' && (
              <div className="space-y-3">
                <div
                  className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm font-medium">Clique para selecionar arquivo</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Arquivo .csv ou .txt com numeros na primeira coluna
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.txt"
                  className="hidden"
                  onChange={handleCsvUpload}
                />
              </div>
            )}

            {/* Tab: Importar de Broadcast */}
            {inputTab === 'broadcast' && (
              <div className="space-y-3">
                <Select
                  value={selectedBroadcastListId || 'none'}
                  onValueChange={(v) => setSelectedBroadcastListId(v === 'none' ? '' : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma lista de broadcast..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Selecione uma lista...</SelectItem>
                    {broadcastLists.map((list) => (
                      <SelectItem key={list.id} value={list.id}>
                        {list.nome} ({list.valid_numbers} contatos)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {isLoadingBroadcasts && (
                  <p className="text-xs text-muted-foreground">Carregando listas...</p>
                )}

                {selectedBroadcastListId && (
                  <Button onClick={handleImportFromBroadcast} variant="outline">
                    <Upload className="h-4 w-4 mr-2" />
                    Importar Contatos da Lista
                  </Button>
                )}
              </div>
            )}

            <Separator />

            {/* Resumo de numeros */}
            <div className="flex flex-wrap gap-3">
              <Badge variant="outline" className="text-sm py-1 px-3">
                Total: {allNumbers.length}
              </Badge>
              <Badge className="bg-green-500/10 text-green-600 border-green-200 text-sm py-1 px-3">
                <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                Validos: {validNumbers.length}
              </Badge>
              {numbersAlreadyInGroup.length > 0 && (
                <Badge className="bg-blue-500/10 text-blue-600 border-blue-200 text-sm py-1 px-3">
                  <SkipForward className="h-3.5 w-3.5 mr-1" />
                  Ja no grupo: {numbersAlreadyInGroup.length}
                </Badge>
              )}
              {numbersToAdd.length > 0 && numbersAlreadyInGroup.length > 0 && (
                <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-200 text-sm py-1 px-3">
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                  A adicionar: {numbersToAdd.length}
                </Badge>
              )}
              {invalidNumbers.length > 0 && (
                <Badge className="bg-red-500/10 text-red-600 border-red-200 text-sm py-1 px-3">
                  <XCircle className="h-3.5 w-3.5 mr-1" />
                  Invalidos: {invalidNumbers.length}
                </Badge>
              )}
              {importedNumbers.length > 0 && (
                <Badge variant="secondary" className="text-sm py-1 px-3">
                  Importados: {importedNumbers.length}
                </Badge>
              )}
            </div>

            {/* Avisos */}
            {/* Info: participantes existentes no grupo */}
            {groupMode === 'existing' && selectedGroupId && (
              <div className="flex items-start gap-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <Users className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-700">
                    {isLoadingParticipants
                      ? 'Verificando membros do grupo...'
                      : `${currentGroupSize} membro(s) ja no grupo`}
                  </p>
                  {!isLoadingParticipants && numbersAlreadyInGroup.length > 0 && (
                    <p className="text-xs text-blue-600/80 mt-0.5">
                      {numbersAlreadyInGroup.length} numero(s) da sua lista ja estao no grupo e serao ignorados.
                      Apenas {numbersToAdd.length} serao adicionados.
                    </p>
                  )}
                  {!isLoadingParticipants && numbersAlreadyInGroup.length === 0 && validNumbers.length > 0 && (
                    <p className="text-xs text-blue-600/80 mt-0.5">
                      Nenhum dos numeros informados esta no grupo. Todos serao adicionados.
                    </p>
                  )}
                </div>
              </div>
            )}

            {isOverLimit && (
              <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-destructive">
                    Limite de {WHATSAPP_GROUP_LIMIT} membros excedido
                  </p>
                  <p className="text-xs text-destructive/80 mt-0.5">
                    O grupo ja tem {currentGroupSize} membro(s) + {numbersToProcess.length} novos = {currentGroupSize + numbersToProcess.length} total.
                    Grupos do WhatsApp suportam no maximo {WHATSAPP_GROUP_LIMIT} participantes.
                    Reduza a quantidade para no maximo {WHATSAPP_GROUP_LIMIT - currentGroupSize} novos numeros.
                  </p>
                </div>
              </div>
            )}

            {numbersToProcess.length > 50 && !isOverLimit && (
              <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-700">
                    Quantidade elevada
                  </p>
                  <p className="text-xs text-amber-600/80 mt-0.5">
                    Adicionar muitos numeros pode levar tempo. O sistema adicionara em lotes de 20 com intervalo de 20 minutos entre cada lote.
                  </p>
                </div>
              </div>
            )}

            {/* Limpar importados */}
            {importedNumbers.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setImportedNumbers([])}
              >
                Limpar numeros importados
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* ================================================================= */}
      {/* STEP 4: Configurar */}
      {/* ================================================================= */}
      {currentStep === 4 && (
        <Card>
          <CardHeader>
            <CardTitle>Configuracao de Envio</CardTitle>
            <CardDescription>
              Configure o ritmo de adicao para evitar bloqueios do WhatsApp
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Agendamento */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Quando iniciar?</label>
              <div className="flex gap-4 items-center">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="schedule"
                    checked={!scheduledAt}
                    onChange={() => setScheduledAt('')}
                    className="accent-primary"
                  />
                  <span className="text-sm">Agora</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="schedule"
                    checked={!!scheduledAt}
                    onChange={() => {
                      // Default: próxima hora cheia
                      const now = new Date();
                      now.setHours(now.getHours() + 1, 0, 0, 0);
                      const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
                        .toISOString().slice(0, 16);
                      setScheduledAt(local);
                    }}
                    className="accent-primary"
                  />
                  <span className="text-sm">Agendar</span>
                </label>
                {scheduledAt && (
                  <Input
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                    min={new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)}
                    className="max-w-[250px]"
                  />
                )}
              </div>
              {scheduledAt && (
                <p className="text-xs text-muted-foreground">
                  A operacao sera iniciada automaticamente em {new Date(scheduledAt).toLocaleString('pt-BR')}
                </p>
              )}
            </div>

            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">Maximo de contatos</label>
                <Input
                  type="number"
                  min={0}
                  max={numbersToAdd.length}
                  value={maxContacts || ''}
                  placeholder={String(numbersToAdd.length)}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 0;
                    setMaxContacts(Math.max(0, val));
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  Limite total de contatos a adicionar. Vazio = todos ({numbersToAdd.length})
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Tamanho do lote</label>
                <Input
                  type="number"
                  min={1}
                  max={50}
                  value={batchSize}
                  onChange={(e) => setBatchSize(Math.min(50, Math.max(1, parseInt(e.target.value) || 1)))}
                />
                <p className="text-xs text-muted-foreground">
                  Quantos numeros por vez (1-50). Recomendado: <strong>20</strong>
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Intervalo entre lotes (minutos)</label>
                <Input
                  type="number"
                  min={1}
                  max={60}
                  value={delayMinutes}
                  onChange={(e) => setDelayMinutes(Math.min(60, Math.max(1, parseInt(e.target.value) || 1)))}
                />
                <p className="text-xs text-muted-foreground">
                  Espera entre cada lote (1-60 min). Recomendado: <strong>20 min</strong>
                </p>
              </div>
            </div>

            <Separator />

            {/* Estimativa de tempo */}
            <div className="p-3 bg-muted rounded-lg space-y-1">
              <p className="text-sm font-medium">Estimativa de tempo</p>
              <p className="text-xs text-muted-foreground">
                {numbersToProcess.length} numeros em lotes de {batchSize} com {delayMinutes} min de intervalo ={' '}
                <strong>
                  ~{(() => {
                    const totalBatches = Math.ceil(numbersToProcess.length / batchSize);
                    const totalMinutes = totalBatches > 1 ? (totalBatches - 1) * delayMinutes : 0;
                    if (totalMinutes >= 60) {
                      const hours = Math.floor(totalMinutes / 60);
                      const mins = totalMinutes % 60;
                      return `${hours}h${mins > 0 ? ` ${mins}min` : ''}`;
                    }
                    return `${totalMinutes} minuto(s)`;
                  })()}
                </strong>
                {numbersAlreadyInGroup.length > 0 && (
                  <span className="text-blue-600 ml-1">
                    ({numbersAlreadyInGroup.length} ja no grupo serao ignorados)
                  </span>
                )}
                {maxContacts > 0 && maxContacts < numbersToAdd.length && (
                  <span className="text-amber-600 ml-1">
                    (limitado a {maxContacts} de {numbersToAdd.length})
                  </span>
                )}
              </p>
              <p className="text-xs text-muted-foreground">
                Capacidade do grupo: <strong>{currentGroupSize}</strong> atuais + <strong>{numbersToProcess.length}</strong> novos = <strong>{currentGroupSize + numbersToProcess.length}</strong> / {WHATSAPP_GROUP_LIMIT} maximo
              </p>
            </div>

            {batchSize > 30 && (
              <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-600">
                  Lotes acima de 30 aumentam o risco de bloqueio. Recomendamos no maximo 20 por lote.
                </p>
              </div>
            )}

            {delayMinutes < 10 && (
              <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-600">
                  Intervalos curtos aumentam risco de punicao do WhatsApp. Recomendamos no minimo 20 minutos.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ================================================================= */}
      {/* STEP 5: Revisar e Executar */}
      {/* ================================================================= */}
      {currentStep === 5 && (
        <div className="space-y-4">
          {/* Resumo antes de iniciar */}
          {!isStarted && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Revisar e Executar
                </CardTitle>
                <CardDescription>Confira os dados antes de iniciar a operacao</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Sessao</p>
                      <p className="text-sm">{selectedSession?.nome || selectedSession?.session_name}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Grupo</p>
                      <p className="text-sm">
                        {groupMode === 'new'
                          ? `Novo: ${newGroupName}`
                          : selectedGroupInfo?.subject || selectedGroupId}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Numeros a adicionar</p>
                      <p className="text-sm font-semibold">
                        {numbersToProcess.length}
                        {maxContacts > 0 && maxContacts < numbersToAdd.length && (
                          <span className="text-amber-600 font-normal ml-1">
                            (limitado de {numbersToAdd.length})
                          </span>
                        )}
                        {numbersAlreadyInGroup.length > 0 && (
                          <span className="text-muted-foreground font-normal ml-1">
                            ({numbersAlreadyInGroup.length} ja no grupo)
                          </span>
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Configuracao</p>
                      <p className="text-sm">
                        Lotes de {batchSize} | Intervalo de {delayMinutes} min
                      </p>
                    </div>
                    {scheduledAt && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Agendado para</p>
                        <p className="text-sm font-semibold text-primary">
                          {new Date(scheduledAt).toLocaleString('pt-BR')}
                        </p>
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Tempo estimado</p>
                      <p className="text-sm">
                        ~{(() => {
                          const totalBatches = Math.ceil(numbersToProcess.length / batchSize);
                          const totalMinutes = totalBatches > 1 ? (totalBatches - 1) * delayMinutes : 0;
                          if (totalMinutes >= 60) {
                            const hours = Math.floor(totalMinutes / 60);
                            const mins = totalMinutes % 60;
                            return `${hours}h${mins > 0 ? ` ${mins}min` : ''}`;
                          }
                          return `${totalMinutes} minuto(s)`;
                        })()}
                      </p>
                    </div>
                  </div>
                </div>

                <Separator />

                <Button
                  onClick={handleStart}
                  disabled={isCreating || isStarting}
                  className="w-full"
                  size="lg"
                >
                  {isCreating || isStarting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {isCreating ? 'Criando operacao...' : scheduledAt ? 'Agendando...' : 'Iniciando...'}
                    </>
                  ) : (
                    <>
                      {scheduledAt ? <Clock className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
                      {scheduledAt ? 'Agendar Operacao' : 'Iniciar Operacao'}
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Progresso em tempo real */}
          {isStarted && operation && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {operation.status === 'processing' && (
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  )}
                  {operation.status === 'completed' && (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  )}
                  {operation.status === 'failed' && (
                    <XCircle className="h-5 w-5 text-destructive" />
                  )}
                  {operation.status === 'cancelled' && (
                    <XCircle className="h-5 w-5 text-muted-foreground" />
                  )}
                  {operation.status === 'paused' && (
                    <Pause className="h-5 w-5 text-amber-500" />
                  )}
                  Progresso da Operacao
                </CardTitle>
                <CardDescription>
                  {operation.status === 'processing' && 'Adicionando membros ao grupo...'}
                  {operation.status === 'completed' && 'Operacao finalizada!'}
                  {operation.status === 'failed' && `Erro: ${operation.error_message || 'Falha na operacao'}`}
                  {operation.status === 'cancelled' && 'Operacao cancelada'}
                  {operation.status === 'paused' && 'Operacao pausada'}
                  {operation.status === 'pending' && 'Aguardando inicio...'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Barra de progresso */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progresso</span>
                    <span className="font-medium">{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-3" />
                  <p className="text-xs text-muted-foreground text-center">
                    {operation.added_count + operation.failed_count + operation.already_member_count + operation.invalid_count} de {operation.total_numbers} processados
                  </p>
                </div>

                <Separator />

                {/* Contadores */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <p className="text-2xl font-bold">{operation.total_numbers}</p>
                    <p className="text-xs text-muted-foreground">Total</p>
                  </div>
                  <div className="text-center p-3 bg-green-500/10 rounded-lg">
                    <p className="text-2xl font-bold text-green-600">{operation.added_count}</p>
                    <p className="text-xs text-green-600/80">Adicionados</p>
                  </div>
                  <div className="text-center p-3 bg-red-500/10 rounded-lg">
                    <p className="text-2xl font-bold text-red-600">{operation.failed_count}</p>
                    <p className="text-xs text-red-600/80">Falharam</p>
                  </div>
                  <div className="text-center p-3 bg-amber-500/10 rounded-lg">
                    <p className="text-2xl font-bold text-amber-600">{operation.already_member_count}</p>
                    <p className="text-xs text-amber-600/80">Ja membros</p>
                  </div>
                </div>

                {/* Botoes de acao durante processamento */}
                {(operation.status === 'processing' || operation.status === 'pending') && (
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => operationId && pauseOperation.mutate(operationId)}
                      disabled={pauseOperation.isPending}
                    >
                      <Pause className="h-4 w-4 mr-2" />
                      Pausar
                    </Button>
                    <Button
                      variant="destructive"
                      className="flex-1"
                      onClick={() => operationId && cancelOperation.mutate(operationId)}
                      disabled={cancelOperation.isPending}
                    >
                      <Ban className="h-4 w-4 mr-2" />
                      Cancelar
                    </Button>
                  </div>
                )}

                {/* Botao para voltar a lista */}
                {(operation.status === 'completed' ||
                  operation.status === 'failed' ||
                  operation.status === 'cancelled' ||
                  operation.status === 'paused') && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => navigate('/whatsapp/grupos')}
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Voltar para Grupos
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ================================================================= */}
      {/* Historico de operacoes deste grupo */}
      {/* ================================================================= */}
      {preSelectedGroup && groupHistory && groupHistory.length > 0 && (() => {
        const getScheduledTime = (op: MTGroupOperation): Date | null => {
          const candidates = [op.next_run_after, op.scheduled_at].filter(Boolean) as string[];
          for (const c of candidates) { const d = new Date(c); if (!isNaN(d.getTime())) return d; }
          return null;
        };
        const now = new Date();
        const scheduledOps = groupHistory.filter((op: MTGroupOperation) => op.status === 'pending' && getScheduledTime(op) !== null);
        const otherOps = groupHistory.filter((op: MTGroupOperation) => !(op.status === 'pending' && getScheduledTime(op) !== null));

        const statusColors: Record<string, string> = {
          completed: 'bg-green-100 text-green-800',
          processing: 'bg-blue-100 text-blue-800',
          pending: 'bg-gray-100 text-gray-800',
          paused: 'bg-amber-100 text-amber-800',
          failed: 'bg-red-100 text-red-800',
          cancelled: 'bg-gray-100 text-gray-500',
        };
        const statusLabels: Record<string, string> = {
          completed: 'Concluida',
          processing: 'Em andamento',
          pending: 'Pendente',
          paused: 'Pausada',
          failed: 'Falhou',
          cancelled: 'Cancelada',
        };

        const renderOp = (op: MTGroupOperation) => {
          const processed = op.added_count + op.failed_count + op.already_member_count + op.invalid_count;
          const scheduledTime = getScheduledTime(op);
          const isScheduled = op.status === 'pending' && scheduledTime !== null;
          const isLate = isScheduled && scheduledTime! <= now;
          return (
            <div key={op.id} className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${isLate ? 'bg-amber-50 border-amber-200 hover:bg-amber-100/70' : isScheduled ? 'bg-blue-50 border-blue-200 hover:bg-blue-100/70' : 'bg-card hover:bg-muted/50'}`}>
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex flex-col min-w-0 gap-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    {isLate ? (
                      <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300 gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        Aguardando disparo
                      </Badge>
                    ) : isScheduled ? (
                      <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300 gap-1">
                        <CalendarClock className="h-3 w-3" />
                        Agendado
                      </Badge>
                    ) : (
                      <Badge variant="outline" className={statusColors[op.status] || 'bg-gray-100'}>
                        {statusLabels[op.status] || op.status}
                      </Badge>
                    )}
                    <span className="text-sm font-medium">{op.total_numbers} contatos</span>
                    {op.batch_size && <span className="text-xs text-muted-foreground">lote {op.batch_size}</span>}
                  </div>
                  {isLate && scheduledTime ? (
                    <div className="flex items-center gap-1 mt-0.5 text-xs font-medium text-amber-700">
                      <AlertTriangle className="h-3 w-3" />
                      Era para {scheduledTime.toLocaleString('pt-BR')} — vá em Operações de Grupos para executar
                    </div>
                  ) : isScheduled && scheduledTime ? (
                    <div className="flex items-center gap-1 mt-0.5 text-xs font-medium text-blue-700">
                      <CalendarClock className="h-3 w-3" />
                      Inicio em {scheduledTime.toLocaleString('pt-BR')}
                    </div>
                  ) : null}
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    Criado em {new Date(op.created_at).toLocaleString('pt-BR')}
                    {op.session_name && <span>• {op.session_name}</span>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 text-xs flex-shrink-0">
                {processed > 0 && (
                  <div className="flex gap-2">
                    {op.added_count > 0 && <span className="text-green-600">+{op.added_count} adicionado</span>}
                    {op.failed_count > 0 && <span className="text-red-600">{op.failed_count} falha</span>}
                    {op.already_member_count > 0 && <span className="text-amber-600">{op.already_member_count} ja membro</span>}
                  </div>
                )}
              </div>
            </div>
          );
        };

        return (
          <>
            {scheduledOps.length > 0 && (
              <Card className="border-blue-200">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg text-blue-800">
                    <CalendarClock className="h-5 w-5" />
                    Operacoes Agendadas ({scheduledOps.length})
                  </CardTitle>
                  <CardDescription>Estas operacoes serao iniciadas automaticamente no horario agendado</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {scheduledOps.map(renderOp)}
                  </div>
                </CardContent>
              </Card>
            )}

            {otherOps.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <History className="h-5 w-5" />
                    Historico de Operacoes ({otherOps.length})
                  </CardTitle>
                  <CardDescription>Operacoes anteriores para este grupo</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {otherOps.map(renderOp)}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        );
      })()}

      {/* ================================================================= */}
      {/* Navegacao (footer) */}
      {/* ================================================================= */}
      {!isStarted && (
        <div className="flex justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={goBack}
            disabled={currentStep === 1}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>

          {currentStep < 5 && (
            <Button onClick={goNext} disabled={!canAdvance}>
              Proximo
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
