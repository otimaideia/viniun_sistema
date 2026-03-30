import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInfluencerNotifConfigMT } from '@/hooks/multitenant/useInfluencerNotifConfigMT';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Save, Bell, MessageSquare, Mail, Plus, X, Settings, ArrowLeft, Phone } from 'lucide-react';

export default function InfluenciadoraNotifConfig() {
  const navigate = useNavigate();
  const { config, defaults, isLoading, save } = useInfluencerNotifConfigMT();

  const [form, setForm] = useState({
    notif_whatsapp_enabled: defaults.notif_whatsapp_enabled,
    notif_email_enabled: defaults.notif_email_enabled,
    notif_whatsapp_cc: defaults.notif_whatsapp_cc,
    notif_email_cc: defaults.notif_email_cc,
    notif_on_contrato_criado: defaults.notif_on_contrato_criado,
    notif_on_aditivo_gerado: defaults.notif_on_aditivo_gerado,
    notif_on_assinatura_confirmada: defaults.notif_on_assinatura_confirmada,
    notif_on_contrato_encerrado: defaults.notif_on_contrato_encerrado,
    notif_on_aprovacao: defaults.notif_on_aprovacao,
    notif_on_pagamento: defaults.notif_on_pagamento,
    notif_on_post_aprovado: defaults.notif_on_post_aprovado,
  });

  const [newWhatsApp, setNewWhatsApp] = useState('');
  const [newEmail, setNewEmail] = useState('');

  useEffect(() => {
    if (config) {
      setForm({
        notif_whatsapp_enabled: config.notif_whatsapp_enabled,
        notif_email_enabled: config.notif_email_enabled,
        notif_whatsapp_cc: config.notif_whatsapp_cc || [],
        notif_email_cc: config.notif_email_cc || [],
        notif_on_contrato_criado: config.notif_on_contrato_criado,
        notif_on_aditivo_gerado: config.notif_on_aditivo_gerado,
        notif_on_assinatura_confirmada: config.notif_on_assinatura_confirmada,
        notif_on_contrato_encerrado: config.notif_on_contrato_encerrado,
        notif_on_aprovacao: config.notif_on_aprovacao,
        notif_on_pagamento: config.notif_on_pagamento,
        notif_on_post_aprovado: config.notif_on_post_aprovado,
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

  // Email CC
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

  const formatPhone = (phone: string) => {
    if (phone.length === 13) return `+${phone.slice(0, 2)} (${phone.slice(2, 4)}) ${phone.slice(4, 9)}-${phone.slice(9)}`;
    if (phone.length === 11) return `(${phone.slice(0, 2)}) ${phone.slice(2, 7)}-${phone.slice(7)}`;
    return phone;
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/influenciadoras')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">Configuracoes de Notificacoes</h1>
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
          <Button variant="ghost" size="icon" onClick={() => navigate('/influenciadoras')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <Settings className="h-6 w-6" />
            <h1 className="text-xl sm:text-2xl font-bold">Notificacoes - Influenciadoras</h1>
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
              Defina quais canais serao usados para notificar sobre contratos e influenciadoras
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
          </CardContent>
        </Card>

        {/* Quando Notificar */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Quando Notificar
            </CardTitle>
            <CardDescription>
              Defina em quais eventos as notificacoes serao disparadas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="on-contrato">Contrato criado</Label>
              <Switch
                id="on-contrato"
                checked={form.notif_on_contrato_criado}
                onCheckedChange={v => setForm(prev => ({ ...prev, notif_on_contrato_criado: v }))}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="on-aditivo">Aditivo contratual gerado</Label>
              <Switch
                id="on-aditivo"
                checked={form.notif_on_aditivo_gerado}
                onCheckedChange={v => setForm(prev => ({ ...prev, notif_on_aditivo_gerado: v }))}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="on-assinatura">Assinatura confirmada</Label>
              <Switch
                id="on-assinatura"
                checked={form.notif_on_assinatura_confirmada}
                onCheckedChange={v => setForm(prev => ({ ...prev, notif_on_assinatura_confirmada: v }))}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="on-encerrado">Contrato encerrado</Label>
              <Switch
                id="on-encerrado"
                checked={form.notif_on_contrato_encerrado}
                onCheckedChange={v => setForm(prev => ({ ...prev, notif_on_contrato_encerrado: v }))}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="on-aprovacao">Influenciadora aprovada</Label>
              <Switch
                id="on-aprovacao"
                checked={form.notif_on_aprovacao}
                onCheckedChange={v => setForm(prev => ({ ...prev, notif_on_aprovacao: v }))}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="on-pagamento">Pagamento registrado</Label>
              <Switch
                id="on-pagamento"
                checked={form.notif_on_pagamento}
                onCheckedChange={v => setForm(prev => ({ ...prev, notif_on_pagamento: v }))}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="on-post">Post aprovado/rejeitado</Label>
              <Switch
                id="on-post"
                checked={form.notif_on_post_aprovado}
                onCheckedChange={v => setForm(prev => ({ ...prev, notif_on_post_aprovado: v }))}
              />
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
                Estes numeros receberao uma copia de todas as notificacoes habilitadas via WhatsApp
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
                  Nenhum numero de copia cadastrado. Apenas a influenciadora sera notificada.
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
                Estes emails receberao uma copia de todas as notificacoes habilitadas
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
                  Nenhum email de copia cadastrado. Apenas a influenciadora sera notificada.
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
