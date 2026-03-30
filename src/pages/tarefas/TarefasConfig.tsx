import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTarefaConfigMT } from '@/hooks/multitenant/useTarefaConfigMT';
import { useTarefaCategoriesMT } from '@/hooks/multitenant/useTarefaCategoriesMT';
import { useTenantContext } from '@/contexts/TenantContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Save, Loader2, Bell, MessageSquare, Mail, Plus, Trash2, X, Settings, FolderOpen, ArrowLeft, Phone, Clock, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

const CATEGORY_COLORS = [
  { label: 'Azul', value: '#3B82F6' },
  { label: 'Verde', value: '#22C55E' },
  { label: 'Vermelho', value: '#EF4444' },
  { label: 'Amarelo', value: '#EAB308' },
  { label: 'Roxo', value: '#A855F7' },
  { label: 'Rosa', value: '#EC4899' },
  { label: 'Laranja', value: '#F97316' },
  { label: 'Cinza', value: '#6B7280' },
];

export default function TarefasConfig() {
  const navigate = useNavigate();
  const { config, defaults, isLoading, save } = useTarefaConfigMT();
  const { categories, create: createCategory, remove: removeCategory } = useTarefaCategoriesMT();

  const [form, setForm] = useState({
    notif_whatsapp_enabled: defaults.notif_whatsapp_enabled,
    notif_email_enabled: defaults.notif_email_enabled,
    notif_inapp_enabled: defaults.notif_inapp_enabled,
    notif_whatsapp_cc: defaults.notif_whatsapp_cc,
    notif_email_cc: defaults.notif_email_cc,
    notif_on_criacao: defaults.notif_on_criacao,
    notif_on_status_change: defaults.notif_on_status_change,
    notif_on_comment: defaults.notif_on_comment,
    notif_on_overdue: defaults.notif_on_overdue,
    notif_on_completion: defaults.notif_on_completion,
    overdue_alert_hours: defaults.overdue_alert_hours,
    overdue_repeat_hours: defaults.overdue_repeat_hours,
  });

  const [newWhatsApp, setNewWhatsApp] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState(CATEGORY_COLORS[0].value);

  // Load config when available
  useEffect(() => {
    if (config) {
      setForm({
        notif_whatsapp_enabled: config.notif_whatsapp_enabled,
        notif_email_enabled: config.notif_email_enabled,
        notif_inapp_enabled: config.notif_inapp_enabled,
        notif_whatsapp_cc: config.notif_whatsapp_cc || [],
        notif_email_cc: config.notif_email_cc || [],
        notif_on_criacao: config.notif_on_criacao,
        notif_on_status_change: config.notif_on_status_change,
        notif_on_comment: config.notif_on_comment,
        notif_on_overdue: config.notif_on_overdue,
        notif_on_completion: config.notif_on_completion,
        overdue_alert_hours: config.overdue_alert_hours,
        overdue_repeat_hours: config.overdue_repeat_hours,
      });
    }
  }, [config]);

  const handleSave = () => {
    save.mutate(form);
  };

  // WhatsApp CC management
  const addWhatsAppCC = () => {
    const phone = newWhatsApp.replace(/\D/g, '');
    if (phone.length < 10 || phone.length > 13) return;
    if (form.notif_whatsapp_cc.includes(phone)) return;
    setForm(prev => ({
      ...prev,
      notif_whatsapp_cc: [...prev.notif_whatsapp_cc, phone],
    }));
    setNewWhatsApp('');
  };

  const removeWhatsAppCC = (phone: string) => {
    setForm(prev => ({
      ...prev,
      notif_whatsapp_cc: prev.notif_whatsapp_cc.filter(p => p !== phone),
    }));
  };

  // Email CC management
  const addEmailCC = () => {
    const email = newEmail.trim().toLowerCase();
    if (!email.includes('@') || !email.includes('.')) return;
    if (form.notif_email_cc.includes(email)) return;
    setForm(prev => ({
      ...prev,
      notif_email_cc: [...prev.notif_email_cc, email],
    }));
    setNewEmail('');
  };

  const removeEmailCC = (email: string) => {
    setForm(prev => ({
      ...prev,
      notif_email_cc: prev.notif_email_cc.filter(e => e !== email),
    }));
  };

  // Category management
  const handleAddCategory = () => {
    const nome = newCategoryName.trim();
    if (!nome) {
      toast.error('Informe o nome da categoria');
      return;
    }
    createCategory.mutate({
      nome,
      cor: newCategoryColor,
      icone: 'FolderOpen',
      ordem: categories.length + 1,
      franchise_id: null,
    });
    setNewCategoryName('');
    setNewCategoryColor(CATEGORY_COLORS[0].value);
  };

  const handleRemoveCategory = (id: string) => {
    removeCategory.mutate(id);
  };

  const formatPhone = (phone: string) => {
    if (phone.length === 13) return `+${phone.slice(0, 2)} (${phone.slice(2, 4)}) ${phone.slice(4, 9)}-${phone.slice(9)}`;
    if (phone.length === 11) return `(${phone.slice(0, 2)}) ${phone.slice(2, 7)}-${phone.slice(7)}`;
    return phone;
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/tarefas')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">Configuracoes de Tarefas</h1>
        </div>
        <Card><CardContent className="pt-6 text-center text-muted-foreground">Carregando...</CardContent></Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/tarefas')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <Settings className="h-6 w-6" />
            <h1 className="text-2xl font-bold">Configuracoes de Tarefas</h1>
          </div>
        </div>
        <Button onClick={handleSave} disabled={save.isPending}>
          <Save className="h-4 w-4 mr-2" />
          {save.isPending ? 'Salvando...' : 'Salvar'}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Canais de Notificacao */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Canais de Notificacao
            </CardTitle>
            <CardDescription>
              Defina quais canais serao usados para notificar sobre tarefas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="wa-enabled" className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-green-600" />
                WhatsApp
              </Label>
              <Switch
                id="wa-enabled"
                checked={form.notif_whatsapp_enabled}
                onCheckedChange={v => setForm(prev => ({ ...prev, notif_whatsapp_enabled: v }))}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="email-enabled" className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-blue-600" />
                Email
              </Label>
              <Switch
                id="email-enabled"
                checked={form.notif_email_enabled}
                onCheckedChange={v => setForm(prev => ({ ...prev, notif_email_enabled: v }))}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="inapp-enabled" className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-purple-600" />
                Notificacao no sistema
              </Label>
              <Switch
                id="inapp-enabled"
                checked={form.notif_inapp_enabled}
                onCheckedChange={v => setForm(prev => ({ ...prev, notif_inapp_enabled: v }))}
              />
            </div>
          </CardContent>
        </Card>

        {/* Quando Notificar */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Quando Notificar
            </CardTitle>
            <CardDescription>
              Defina em quais eventos as notificacoes serao disparadas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="on-criacao">Criacao de tarefa</Label>
              <Switch
                id="on-criacao"
                checked={form.notif_on_criacao}
                onCheckedChange={v => setForm(prev => ({ ...prev, notif_on_criacao: v }))}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="on-status">Mudanca de status</Label>
              <Switch
                id="on-status"
                checked={form.notif_on_status_change}
                onCheckedChange={v => setForm(prev => ({ ...prev, notif_on_status_change: v }))}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="on-comment">Novo comentario</Label>
              <Switch
                id="on-comment"
                checked={form.notif_on_comment}
                onCheckedChange={v => setForm(prev => ({ ...prev, notif_on_comment: v }))}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="on-overdue">Tarefa atrasada</Label>
              <Switch
                id="on-overdue"
                checked={form.notif_on_overdue}
                onCheckedChange={v => setForm(prev => ({ ...prev, notif_on_overdue: v }))}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="on-completion">Tarefa concluida (para conferencia)</Label>
              <Switch
                id="on-completion"
                checked={form.notif_on_completion}
                onCheckedChange={v => setForm(prev => ({ ...prev, notif_on_completion: v }))}
              />
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="alert-hours" className="whitespace-nowrap">Alertar</Label>
                <Input
                  id="alert-hours"
                  type="number"
                  min={1}
                  max={168}
                  className="w-20"
                  value={form.overdue_alert_hours}
                  onChange={e => setForm(prev => ({ ...prev, overdue_alert_hours: parseInt(e.target.value) || 24 }))}
                />
                <span className="text-sm text-muted-foreground whitespace-nowrap">horas antes do prazo</span>
              </div>

              <div className="flex items-center gap-3">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="repeat-hours" className="whitespace-nowrap">Repetir a cada</Label>
                <Input
                  id="repeat-hours"
                  type="number"
                  min={1}
                  max={168}
                  className="w-20"
                  value={form.overdue_repeat_hours}
                  onChange={e => setForm(prev => ({ ...prev, overdue_repeat_hours: parseInt(e.target.value) || 24 }))}
                />
                <span className="text-sm text-muted-foreground whitespace-nowrap">horas</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* WhatsApp CC */}
        {form.notif_whatsapp_enabled && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-green-600" />
                Telefones extras (CC)
              </CardTitle>
              <CardDescription>
                Estes numeros receberao uma copia de todas as notificacoes de tarefas via WhatsApp
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Phone className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="5513999999999"
                    value={newWhatsApp}
                    onChange={e => setNewWhatsApp(e.target.value.replace(/\D/g, ''))}
                    className="pl-9"
                    onKeyDown={e => e.key === 'Enter' && addWhatsAppCC()}
                  />
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={addWhatsAppCC}
                  disabled={newWhatsApp.replace(/\D/g, '').length < 10}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {form.notif_whatsapp_cc.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {form.notif_whatsapp_cc.map(phone => (
                    <Badge key={phone} variant="secondary" className="gap-1 pr-1">
                      <Phone className="h-3 w-3" />
                      {formatPhone(phone)}
                      <button
                        onClick={() => removeWhatsAppCC(phone)}
                        className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}

              {form.notif_whatsapp_cc.length === 0 && (
                <p className="text-xs text-muted-foreground italic">
                  Nenhum numero de copia cadastrado. Apenas o responsavel sera notificado.
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Email CC */}
        {form.notif_email_enabled && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-blue-600" />
                Emails extras (CC)
              </CardTitle>
              <CardDescription>
                Estes emails receberao uma copia de todas as notificacoes de tarefas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Mail className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="gerente@empresa.com"
                    value={newEmail}
                    onChange={e => setNewEmail(e.target.value)}
                    className="pl-9"
                    onKeyDown={e => e.key === 'Enter' && addEmailCC()}
                  />
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={addEmailCC}
                  disabled={!newEmail.includes('@')}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {form.notif_email_cc.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {form.notif_email_cc.map(email => (
                    <Badge key={email} variant="secondary" className="gap-1 pr-1">
                      <Mail className="h-3 w-3" />
                      {email}
                      <button
                        onClick={() => removeEmailCC(email)}
                        className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}

              {form.notif_email_cc.length === 0 && (
                <p className="text-xs text-muted-foreground italic">
                  Nenhum email de copia cadastrado. Apenas o responsavel sera notificado.
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Categorias de Tarefas */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5" />
              Categorias de Tarefas
            </CardTitle>
            <CardDescription>
              Organize as tarefas por categorias com cores para identificacao rapida
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Add new category */}
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <Label htmlFor="new-category-name" className="text-sm mb-1.5 block">Nome da categoria</Label>
                <Input
                  id="new-category-name"
                  placeholder="Ex: Administrativo, Marketing, Financeiro..."
                  value={newCategoryName}
                  onChange={e => setNewCategoryName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddCategory()}
                />
              </div>
              <div>
                <Label className="text-sm mb-1.5 block">Cor</Label>
                <div className="flex gap-1">
                  {CATEGORY_COLORS.map(color => (
                    <button
                      key={color.value}
                      type="button"
                      className={`w-7 h-7 rounded-full border-2 transition-all ${
                        newCategoryColor === color.value
                          ? 'border-foreground scale-110'
                          : 'border-transparent hover:border-muted-foreground/50'
                      }`}
                      style={{ backgroundColor: color.value }}
                      onClick={() => setNewCategoryColor(color.value)}
                      title={color.label}
                    />
                  ))}
                </div>
              </div>
              <Button
                variant="outline"
                onClick={handleAddCategory}
                disabled={!newCategoryName.trim() || createCategory.isPending}
              >
                <Plus className="h-4 w-4 mr-1" />
                Adicionar
              </Button>
            </div>

            <Separator />

            {/* Category list */}
            {categories.length > 0 ? (
              <div className="space-y-2">
                {categories.map(cat => (
                  <div
                    key={cat.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-4 h-4 rounded-full flex-shrink-0"
                        style={{ backgroundColor: cat.cor }}
                      />
                      <span className="font-medium">{cat.nome}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => handleRemoveCategory(cat.id)}
                      disabled={removeCategory.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4 italic">
                Nenhuma categoria cadastrada. Adicione categorias para organizar suas tarefas.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
