import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInfluencerReferralNotifConfigMT, DEFAULT_REFERRAL_NOTIF_CONFIG } from '@/hooks/multitenant/useInfluencerReferralNotifConfigMT';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Save, Bell, MessageSquare, Mail, Plus, X, Settings, ArrowLeft, Phone, Share2, Users, Gift } from 'lucide-react';

export default function InfluenciadoraReferralNotifConfig() {
  const navigate = useNavigate();
  const { config, defaults, isLoading, save } = useInfluencerReferralNotifConfigMT();

  const [form, setForm] = useState({ ...defaults });
  const [newWhatsApp, setNewWhatsApp] = useState('');
  const [newEmail, setNewEmail] = useState('');

  useEffect(() => {
    if (config) {
      setForm({
        auto_send_whatsapp_enabled: config.auto_send_whatsapp_enabled ?? defaults.auto_send_whatsapp_enabled,
        auto_send_email_enabled: config.auto_send_email_enabled ?? defaults.auto_send_email_enabled,
        auto_send_on_indicacao_criada: config.auto_send_on_indicacao_criada ?? defaults.auto_send_on_indicacao_criada,
        auto_send_copy_to_influencer: config.auto_send_copy_to_influencer ?? defaults.auto_send_copy_to_influencer,
        message_template: config.message_template ?? defaults.message_template,
        whatsapp_cc: config.whatsapp_cc || [],
        email_cc: config.email_cc || [],
      });
    }
  }, [config]);

  const handleSave = () => {
    save.mutate(form);
  };

  // WhatsApp CC
  const addWhatsAppCC = () => {
    const phone = newWhatsApp.replace(/\D/g, '');
    if (phone.length < 10 || phone.length > 13) return;
    if (form.whatsapp_cc.includes(phone)) return;
    setForm(prev => ({ ...prev, whatsapp_cc: [...prev.whatsapp_cc, phone] }));
    setNewWhatsApp('');
  };

  const removeWhatsAppCC = (phone: string) => {
    setForm(prev => ({ ...prev, whatsapp_cc: prev.whatsapp_cc.filter(p => p !== phone) }));
  };

  // Email CC
  const addEmailCC = () => {
    const email = newEmail.trim().toLowerCase();
    if (!email.includes('@') || !email.includes('.')) return;
    if (form.email_cc.includes(email)) return;
    setForm(prev => ({ ...prev, email_cc: [...prev.email_cc, email] }));
    setNewEmail('');
  };

  const removeEmailCC = (email: string) => {
    setForm(prev => ({ ...prev, email_cc: prev.email_cc.filter(e => e !== email) }));
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
          <Button variant="ghost" size="icon" onClick={() => navigate('/influenciadoras/indicacoes')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">Configurações de Notificação - Indicações</h1>
        </div>
        <Card><CardContent className="pt-6 text-center text-muted-foreground">Carregando...</CardContent></Card>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/influenciadoras/indicacoes')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <Settings className="h-6 w-6" />
            <h1 className="text-xl sm:text-2xl font-bold">Notificações - Indicações</h1>
          </div>
        </div>
        <Button onClick={handleSave} disabled={save.isPending}>
          <Save className="h-4 w-4 mr-2" />
          {save.isPending ? 'Salvando...' : 'Salvar'}
        </Button>
      </div>

      {/* Info */}
      <Card className="bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800">
        <CardContent className="p-4">
          <p className="text-sm text-purple-800 dark:text-purple-200">
            <Gift className="h-4 w-4 inline mr-1" />
            Quando um lead se cadastrar usando o código de uma influenciadora, o sistema envia automaticamente uma mensagem no WhatsApp informando sobre as <strong>10 sessões gratuitas</strong> e convidando para agendar a avaliação.
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Canais */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Canais de Envio
            </CardTitle>
            <CardDescription>
              Defina como a mensagem será enviada ao lead indicado
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="wa-enabled" className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-green-600" />
                WhatsApp (para o lead)
              </Label>
              <Switch
                id="wa-enabled"
                checked={form.auto_send_whatsapp_enabled}
                onCheckedChange={v => setForm(prev => ({ ...prev, auto_send_whatsapp_enabled: v }))}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="email-enabled" className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-blue-600" />
                Email (para o lead)
              </Label>
              <Switch
                id="email-enabled"
                checked={form.auto_send_email_enabled}
                onCheckedChange={v => setForm(prev => ({ ...prev, auto_send_email_enabled: v }))}
              />
            </div>
          </CardContent>
        </Card>

        {/* Quando Enviar */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Share2 className="h-5 w-5" />
              Quando Enviar
            </CardTitle>
            <CardDescription>
              Defina em quais eventos a mensagem será enviada
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="on-indicacao">Lead indicado se cadastrou</Label>
                <p className="text-xs text-muted-foreground">Envia mensagem automática ao lead assim que se cadastrar</p>
              </div>
              <Switch
                id="on-indicacao"
                checked={form.auto_send_on_indicacao_criada}
                onCheckedChange={v => setForm(prev => ({ ...prev, auto_send_on_indicacao_criada: v }))}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="copy-influencer">Enviar cópia para influenciadora</Label>
                <p className="text-xs text-muted-foreground">A influenciadora recebe aviso de nova indicação</p>
              </div>
              <Switch
                id="copy-influencer"
                checked={form.auto_send_copy_to_influencer}
                onCheckedChange={v => setForm(prev => ({ ...prev, auto_send_copy_to_influencer: v }))}
              />
            </div>
          </CardContent>
        </Card>

        {/* WhatsApp CC */}
        {form.auto_send_whatsapp_enabled && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-green-600" />
                Telefones extras (CC)
              </CardTitle>
              <CardDescription>
                Estes números também receberão cópia da mensagem via WhatsApp
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
                <Button variant="outline" size="icon" onClick={addWhatsAppCC} disabled={newWhatsApp.replace(/\D/g, '').length < 10}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {form.whatsapp_cc.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {form.whatsapp_cc.map(phone => (
                    <Badge key={phone} variant="secondary" className="gap-1 pr-1">
                      <Phone className="h-3 w-3" />
                      {formatPhone(phone)}
                      <button onClick={() => removeWhatsAppCC(phone)} className="ml-1 hover:bg-destructive/20 rounded-full p-0.5">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}

              {form.whatsapp_cc.length === 0 && (
                <p className="text-xs text-muted-foreground italic">
                  Nenhum número extra cadastrado. Apenas o lead receberá a mensagem.
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Email CC */}
        {form.auto_send_email_enabled && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-blue-600" />
                Emails extras (CC)
              </CardTitle>
              <CardDescription>
                Estes emails receberão cópia da notificação
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
                <Button variant="outline" size="icon" onClick={addEmailCC} disabled={!newEmail.includes('@')}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {form.email_cc.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {form.email_cc.map(email => (
                    <Badge key={email} variant="secondary" className="gap-1 pr-1">
                      <Mail className="h-3 w-3" />
                      {email}
                      <button onClick={() => removeEmailCC(email)} className="ml-1 hover:bg-destructive/20 rounded-full p-0.5">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}

              {form.email_cc.length === 0 && (
                <p className="text-xs text-muted-foreground italic">
                  Nenhum email extra cadastrado.
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Modelo de Mensagem */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5 text-purple-600" />
              Prévia da Mensagem
            </CardTitle>
            <CardDescription>
              Esta é a mensagem enviada automaticamente ao lead indicado
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 text-sm whitespace-pre-wrap border border-green-200 dark:border-green-800">
              {`Olá, [Nome do Lead]! Tudo bem? 😊

A *[Nome da Influenciadora]* te indicou e você ganhou um presente especial! 🎁

✨ *10 sessões de depilação a laser GRATUITAS* em área P!

Para garantir suas sessões, é só agendar uma *avaliação gratuita* aqui na *YESlaser Praia Grande*. A avaliação é rápida, sem compromisso, e nossa especialista vai analisar sua pele e tirar todas as suas dúvidas.

📅 Quer agendar? Me conta qual o melhor dia e horário para você!

📍 Estamos na Praia Grande - SP

Te esperamos! 💜`}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Os campos [Nome do Lead] e [Nome da Influenciadora] são preenchidos automaticamente.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
