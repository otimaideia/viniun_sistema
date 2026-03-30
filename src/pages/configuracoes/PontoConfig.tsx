import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Settings, MessageSquare, Mail, Phone, X, Plus, Camera, MapPin, Save, Bell } from "lucide-react";
import { usePontoConfigMT } from "@/hooks/multitenant/usePontoConfigMT";

export default function PontoConfig() {
  const navigate = useNavigate();
  const { config, defaults, isLoading, save } = usePontoConfigMT();

  const [form, setForm] = useState({
    notif_whatsapp_enabled: defaults.notif_whatsapp_enabled,
    notif_email_enabled: defaults.notif_email_enabled,
    notif_whatsapp_cc: defaults.notif_whatsapp_cc,
    notif_email_cc: defaults.notif_email_cc,
    notif_on_entrada: defaults.notif_on_entrada,
    notif_on_saida: defaults.notif_on_saida,
    require_selfie: defaults.require_selfie,
    require_geo: defaults.require_geo,
  });

  const [newWhatsApp, setNewWhatsApp] = useState('');
  const [newEmail, setNewEmail] = useState('');

  // Load config when available
  useEffect(() => {
    if (config) {
      setForm({
        notif_whatsapp_enabled: config.notif_whatsapp_enabled,
        notif_email_enabled: config.notif_email_enabled,
        notif_whatsapp_cc: config.notif_whatsapp_cc || [],
        notif_email_cc: config.notif_email_cc || [],
        notif_on_entrada: config.notif_on_entrada,
        notif_on_saida: config.notif_on_saida,
        require_selfie: config.require_selfie,
        require_geo: config.require_geo,
      });
    }
  }, [config]);

  const handleSave = () => {
    save.mutate(form);
  };

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
          <Button variant="ghost" size="icon" onClick={() => navigate('/produtividade')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">Configurações do Ponto</h1>
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
          <Button variant="ghost" size="icon" onClick={() => navigate('/produtividade')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <Settings className="h-6 w-6" />
            <h1 className="text-2xl font-bold">Configurações do Ponto</h1>
          </div>
        </div>
        <Button onClick={handleSave} disabled={save.isPending}>
          <Save className="h-4 w-4 mr-2" />
          {save.isPending ? 'Salvando...' : 'Salvar'}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Notificações WhatsApp */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-green-600" />
              Notificações WhatsApp
            </CardTitle>
            <CardDescription>
              Configure o envio de notificações via WhatsApp ao registrar ponto
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="wa-enabled" className="flex items-center gap-2">
                Enviar WhatsApp ao funcionário
              </Label>
              <Switch
                id="wa-enabled"
                checked={form.notif_whatsapp_enabled}
                onCheckedChange={v => setForm(prev => ({ ...prev, notif_whatsapp_enabled: v }))}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="wa-entrada" className="flex items-center gap-2">
                Notificar na entrada
              </Label>
              <Switch
                id="wa-entrada"
                checked={form.notif_on_entrada}
                onCheckedChange={v => setForm(prev => ({ ...prev, notif_on_entrada: v }))}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="wa-saida" className="flex items-center gap-2">
                Notificar na saída
              </Label>
              <Switch
                id="wa-saida"
                checked={form.notif_on_saida}
                onCheckedChange={v => setForm(prev => ({ ...prev, notif_on_saida: v }))}
              />
            </div>

            <div className="border-t pt-4 space-y-3">
              <Label className="flex items-center gap-2">
                <Bell className="h-4 w-4" />
                Cópia para Gerentes / Donos (WhatsApp)
              </Label>
              <p className="text-xs text-muted-foreground">
                Estes números receberão uma cópia da notificação de ponto de todos os funcionários
              </p>

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
                  Nenhum número de cópia cadastrado. Apenas o funcionário será notificado.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Notificações Email */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-blue-600" />
              Notificações Email
            </CardTitle>
            <CardDescription>
              Configure o envio de notificações via Email ao registrar ponto
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="email-enabled" className="flex items-center gap-2">
                Enviar Email ao funcionário
              </Label>
              <Switch
                id="email-enabled"
                checked={form.notif_email_enabled}
                onCheckedChange={v => setForm(prev => ({ ...prev, notif_email_enabled: v }))}
              />
            </div>

            <div className="border-t pt-4 space-y-3">
              <Label className="flex items-center gap-2">
                <Bell className="h-4 w-4" />
                Cópia para Gerentes / Donos (Email)
              </Label>
              <p className="text-xs text-muted-foreground">
                Estes emails receberão uma cópia da notificação de ponto de todos os funcionários
              </p>

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
                  Nenhum email de cópia cadastrado. Apenas o funcionário será notificado.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Configurações do Totem */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Configurações do Totem
            </CardTitle>
            <CardDescription>
              Requisitos para registro de ponto via totem
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="require-selfie" className="flex items-center gap-2">
                    <Camera className="h-4 w-4" />
                    Foto obrigatória
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Exigir selfie ao registrar entrada/saída no totem
                  </p>
                </div>
                <Switch
                  id="require-selfie"
                  checked={form.require_selfie}
                  onCheckedChange={v => setForm(prev => ({ ...prev, require_selfie: v }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="require-geo" className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Geolocalização obrigatória
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Exigir localização GPS ao registrar ponto (pode travar em ambientes fechados)
                  </p>
                </div>
                <Switch
                  id="require-geo"
                  checked={form.require_geo}
                  onCheckedChange={v => setForm(prev => ({ ...prev, require_geo: v }))}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
