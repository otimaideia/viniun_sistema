import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Loader2, BrainCircuit } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useAIAgentMT, useAIAgentsMT } from '@/hooks/multitenant/useAIAgentsMT';
import { AI_AGENT_TEMPLATES, AI_MODELS } from '@/types/ai-agent';
import type { AIAgent } from '@/types/ai-agent';

const ICON_OPTIONS = [
  'BrainCircuit', 'Bot', 'Sparkles', 'Zap', 'Target', 'TrendingUp',
  'Shield', 'Heart', 'Star', 'Award', 'Rocket', 'Lightbulb',
  'MessageSquare', 'Phone', 'Users', 'UserCheck', 'Search', 'BarChart3',
];

function getIcon(iconName: string) {
  return (LucideIcons as any)[iconName] || BrainCircuit;
}

export default function AIAgentEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = !!id;

  const { data: existingAgent, isLoading: isLoadingAgent } = useAIAgentMT(id || '');
  const { create, update } = useAIAgentsMT();

  const [form, setForm] = useState<Partial<AIAgent>>({
    codigo: '',
    nome: '',
    descricao: '',
    icone: 'BrainCircuit',
    cor: '#6366f1',
    tipo: 'assistant',
    provider: 'openai',
    model: 'gpt-4o-mini',
    api_key_encrypted: '',
    temperature: 0.7,
    max_tokens: 2000,
    system_prompt: '',
    context_instructions: '',
    output_format: 'both',
    max_suggestions: 3,
    include_reasoning: true,
    auto_transcribe_audio: true,
    max_history_messages: 50,
    whisper_model: 'whisper-1',
    whisper_language: 'pt',
    is_active: true,
  });

  const [isSaving, setIsSaving] = useState(false);

  // Load existing agent data
  useEffect(() => {
    if (existingAgent && isEditing) {
      setForm({
        ...existingAgent,
        api_key_encrypted: '', // Don't show existing key
      });
    }
  }, [existingAgent, isEditing]);

  // Apply template
  const applyTemplate = (templateCode: string) => {
    const template = AI_AGENT_TEMPLATES.find(t => t.codigo === templateCode);
    if (!template) return;
    setForm(prev => ({
      ...prev,
      codigo: template.codigo,
      nome: template.nome,
      descricao: template.descricao,
      icone: template.icone,
      cor: template.cor,
      tipo: template.tipo,
      system_prompt: template.system_prompt,
    }));
  };

  const handleSave = async () => {
    if (!form.nome || !form.codigo || !form.system_prompt) {
      return;
    }

    setIsSaving(true);
    try {
      const payload = { ...form };
      // Don't send empty api_key
      if (!payload.api_key_encrypted) {
        delete payload.api_key_encrypted;
      }

      if (isEditing && id) {
        await update.mutateAsync({ id, ...payload } as any);
      } else {
        await create.mutateAsync(payload as any);
      }
      navigate('/whatsapp/ai-agents');
    } catch {
      // toast already shown by mutation
    } finally {
      setIsSaving(false);
    }
  };

  if (isEditing && isLoadingAgent) {
    return (
      <div className="space-y-6 max-w-3xl mx-auto">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  const SelectedIcon = getIcon(form.icone || 'BrainCircuit');

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-12">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/whatsapp/ai-agents')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEditing ? 'Editar Agente' : 'Novo Agente'}
          </h1>
          <p className="text-sm text-gray-500">
            {isEditing ? 'Modifique as configurações do agente' : 'Crie um novo agente IA'}
          </p>
        </div>
      </div>

      {/* Template selector (only for new) */}
      {!isEditing && (
        <div className="rounded-xl border bg-gradient-to-r from-indigo-50 to-purple-50 p-4">
          <Label className="text-sm font-semibold text-gray-700 mb-2 block">
            Usar template (opcional)
          </Label>
          <div className="flex flex-wrap gap-2">
            {AI_AGENT_TEMPLATES.map(t => {
              const TIcon = getIcon(t.icone);
              return (
                <Button
                  key={t.codigo}
                  variant="outline"
                  size="sm"
                  className="gap-1.5 bg-white"
                  onClick={() => applyTemplate(t.codigo)}
                >
                  <TIcon className="h-3.5 w-3.5" style={{ color: t.cor }} />
                  {t.nome}
                </Button>
              );
            })}
          </div>
        </div>
      )}

      {/* Basic info */}
      <div className="rounded-xl border bg-white p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Informações Básicas</h2>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Nome *</Label>
            <Input
              value={form.nome || ''}
              onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
              placeholder="Ex: SDR - Qualificador"
            />
          </div>
          <div className="space-y-2">
            <Label>Código *</Label>
            <Input
              value={form.codigo || ''}
              onChange={e => setForm(f => ({ ...f, codigo: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_') }))}
              placeholder="Ex: sdr"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Descrição</Label>
          <Textarea
            value={form.descricao || ''}
            onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
            placeholder="Descreva o papel deste agente..."
            rows={2}
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Ícone</Label>
            <Select value={form.icone || 'BrainCircuit'} onValueChange={v => setForm(f => ({ ...f, icone: v }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ICON_OPTIONS.map(icon => {
                  const I = getIcon(icon);
                  return (
                    <SelectItem key={icon} value={icon}>
                      <span className="flex items-center gap-2">
                        <I className="h-4 w-4" /> {icon}
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Cor</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={form.cor || '#6366f1'}
                onChange={e => setForm(f => ({ ...f, cor: e.target.value }))}
                className="h-10 w-10 rounded cursor-pointer border"
              />
              <Input
                value={form.cor || '#6366f1'}
                onChange={e => setForm(f => ({ ...f, cor: e.target.value }))}
                className="flex-1"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select value={form.tipo || 'assistant'} onValueChange={v => setForm(f => ({ ...f, tipo: v }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="assistant">Assistente (sugere respostas)</SelectItem>
                <SelectItem value="quality">Qualidade (analisa atendimento)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Preview */}
        <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl"
            style={{ backgroundColor: `${form.cor}15`, color: form.cor }}
          >
            <SelectedIcon className="h-5 w-5" />
          </div>
          <div>
            <p className="font-semibold text-sm">{form.nome || 'Nome do agente'}</p>
            <p className="text-xs text-gray-400">{form.codigo || 'codigo'}</p>
          </div>
        </div>
      </div>

      {/* AI Model config */}
      <div className="rounded-xl border bg-white p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Modelo IA</h2>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Provider</Label>
            <Select value={form.provider || 'openai'} onValueChange={v => setForm(f => ({ ...f, provider: v }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="openai">OpenAI</SelectItem>
                <SelectItem value="anthropic">Anthropic</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Modelo</Label>
            <Select value={form.model || 'gpt-4o-mini'} onValueChange={v => setForm(f => ({ ...f, model: v }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AI_MODELS
                  .filter(m => m.provider === form.provider)
                  .map(m => (
                    <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label>API Key (opcional - usa fallback do bot config se vazio)</Label>
          <Input
            type="password"
            value={form.api_key_encrypted || ''}
            onChange={e => setForm(f => ({ ...f, api_key_encrypted: e.target.value }))}
            placeholder={isEditing ? '••••••• (manter atual)' : 'sk-... (deixe vazio para usar chave global)'}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Temperatura: {form.temperature?.toFixed(1)}</Label>
            <Slider
              value={[form.temperature || 0.7]}
              onValueChange={([v]) => setForm(f => ({ ...f, temperature: v }))}
              min={0}
              max={2}
              step={0.1}
            />
            <p className="text-[10px] text-gray-400">0 = determinístico, 2 = muito criativo</p>
          </div>
          <div className="space-y-2">
            <Label>Max Tokens: {form.max_tokens}</Label>
            <Slider
              value={[form.max_tokens || 2000]}
              onValueChange={([v]) => setForm(f => ({ ...f, max_tokens: v }))}
              min={100}
              max={4000}
              step={100}
            />
          </div>
        </div>
      </div>

      {/* Prompts */}
      <div className="rounded-xl border bg-white p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Prompts</h2>

        <div className="space-y-2">
          <Label>System Prompt *</Label>
          <Textarea
            value={form.system_prompt || ''}
            onChange={e => setForm(f => ({ ...f, system_prompt: e.target.value }))}
            placeholder="Você é um agente especializado em..."
            rows={10}
            className="font-mono text-sm"
          />
          <p className="text-[10px] text-gray-400">
            Defina a personalidade, papel e instruções do agente
          </p>
        </div>

        <div className="space-y-2">
          <Label>Contexto Adicional (opcional)</Label>
          <Textarea
            value={form.context_instructions || ''}
            onChange={e => setForm(f => ({ ...f, context_instructions: e.target.value }))}
            placeholder="Informações sobre a empresa, serviços, preços..."
            rows={4}
            className="font-mono text-sm"
          />
          <p className="text-[10px] text-gray-400">
            Contexto sobre a empresa que o agente deve considerar
          </p>
        </div>
      </div>

      {/* Output config */}
      <div className="rounded-xl border bg-white p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Configurações de Saída</h2>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Formato de Saída</Label>
            <Select value={form.output_format || 'both'} onValueChange={v => setForm(f => ({ ...f, output_format: v }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="suggestions">Apenas sugestões</SelectItem>
                <SelectItem value="analysis">Apenas análise</SelectItem>
                <SelectItem value="both">Análise + sugestões</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Número de Sugestões: {form.max_suggestions}</Label>
            <Slider
              value={[form.max_suggestions || 3]}
              onValueChange={([v]) => setForm(f => ({ ...f, max_suggestions: v }))}
              min={1}
              max={5}
              step={1}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Mensagens a Analisar: {form.max_history_messages}</Label>
          <Slider
            value={[form.max_history_messages || 50]}
            onValueChange={([v]) => setForm(f => ({ ...f, max_history_messages: v }))}
            min={10}
            max={100}
            step={5}
          />
          <p className="text-[10px] text-gray-400">Quantas mensagens recentes da conversa analisar</p>
        </div>

        <div className="flex items-center justify-between py-2">
          <div>
            <Label>Incluir raciocínio nas sugestões</Label>
            <p className="text-xs text-gray-400">Mostra "Por que esta sugestão?" abaixo de cada sugestão</p>
          </div>
          <Switch
            checked={form.include_reasoning ?? true}
            onCheckedChange={v => setForm(f => ({ ...f, include_reasoning: v }))}
          />
        </div>

        <div className="flex items-center justify-between py-2">
          <div>
            <Label>Transcrição automática de áudio</Label>
            <p className="text-xs text-gray-400">Transcreve áudios via Whisper antes de analisar</p>
          </div>
          <Switch
            checked={form.auto_transcribe_audio ?? true}
            onCheckedChange={v => setForm(f => ({ ...f, auto_transcribe_audio: v }))}
          />
        </div>

        <div className="flex items-center justify-between py-2">
          <div>
            <Label>Agente ativo</Label>
            <p className="text-xs text-gray-400">Aparece no seletor de agentes do chat</p>
          </div>
          <Switch
            checked={form.is_active ?? true}
            onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3">
        <Button variant="outline" onClick={() => navigate('/whatsapp/ai-agents')}>
          Cancelar
        </Button>
        <Button
          onClick={handleSave}
          disabled={isSaving || !form.nome || !form.codigo || !form.system_prompt}
          className="gap-2 bg-indigo-600 hover:bg-indigo-700"
        >
          {isSaving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {isEditing ? 'Salvar Alterações' : 'Criar Agente'}
        </Button>
      </div>
    </div>
  );
}
