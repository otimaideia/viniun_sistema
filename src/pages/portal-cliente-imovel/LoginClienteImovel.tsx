import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { wahaApi } from "@/services/waha-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Home, ArrowRight, Loader2, ArrowLeft } from "lucide-react";

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function formatPhoneForWhatsApp(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  const withCountry = cleaned.startsWith('55') ? cleaned : `55${cleaned}`;
  return `${withCountry}@c.us`;
}

async function sendWhatsAppOTP(phone: string, code: string, nome: string): Promise<boolean> {
  try {
    const { data: wahaConfig } = await supabase
      .from('mt_waha_config')
      .select('api_url, api_key, enabled')
      .maybeSingle();

    if (!wahaConfig?.enabled || !wahaConfig.api_url) return false;

    wahaApi.setConfig(wahaConfig.api_url, wahaConfig.api_key || '');

    const { data: sessoes } = await supabase
      .from('mt_whatsapp_sessions')
      .select('session_name, status')
      .eq('status', 'WORKING')
      .limit(1);

    if (!sessoes?.length) return false;

    const message = `🔐 *Portal do Cliente - Código de Acesso*\n\nOlá${nome ? `, ${nome.split(' ')[0]}` : ''}!\n\nSeu código de acesso:\n\n*${code}*\n\nVálido por 5 minutos.\n\n_Viniun Imóveis_`;

    await wahaApi.sendText({
      session: sessoes[0].session_name,
      chatId: formatPhoneForWhatsApp(phone),
      text: message,
    });
    return true;
  } catch {
    return false;
  }
}

type Step = "identify" | "verify";

export default function LoginClienteImovel() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("identify");
  const [identifier, setIdentifier] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [pendingLead, setPendingLead] = useState<any>(null);

  async function handleIdentify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const cleaned = identifier.trim().toLowerCase();
      const cleanedDigits = cleaned.replace(/\D/g, '');

      let query = (supabase as any).from('mt_leads').select('id, nome, email, telefone, whatsapp').is('deleted_at', null);

      // Detect if email or phone
      if (cleaned.includes('@')) {
        query = query.eq('email', cleaned);
      } else {
        query = query.or(`telefone.eq.${cleanedDigits},telefone.ilike.%${cleanedDigits},whatsapp.eq.${cleanedDigits},cpf.eq.${cleanedDigits}`);
      }

      const { data: leads } = await query.limit(1);

      if (!leads?.length) {
        setError('Cadastro não encontrado. Verifique seus dados ou entre em contato com a imobiliária.');
        setLoading(false);
        return;
      }

      const lead = leads[0];
      setPendingLead(lead);

      // Generate and store OTP
      const otp = generateCode();
      const expiry = new Date();
      expiry.setMinutes(expiry.getMinutes() + 5);

      await (supabase as any)
        .from('mt_leads')
        .update({ codigo_verificacao: otp, codigo_expira_em: expiry.toISOString() })
        .eq('id', lead.id);

      // Send via WhatsApp
      const phone = lead.telefone || lead.whatsapp;
      if (phone) {
        await sendWhatsAppOTP(phone, otp, lead.nome || '');
      }

      setStep("verify");
    } catch (err: any) {
      setError(err.message || 'Erro ao buscar cadastro');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (!pendingLead) {
        setError('Sessão expirada. Tente novamente.');
        setStep("identify");
        setLoading(false);
        return;
      }

      const { data, error: err } = await (supabase as any)
        .from('mt_leads')
        .select('codigo_verificacao, codigo_expira_em')
        .eq('id', pendingLead.id)
        .single();

      if (err || !data) {
        setError('Erro ao verificar código.');
        setLoading(false);
        return;
      }

      if (data.codigo_verificacao !== code) {
        setError('Código inválido.');
        setLoading(false);
        return;
      }

      if (data.codigo_expira_em && new Date(data.codigo_expira_em) < new Date()) {
        setError('Código expirado. Solicite um novo.');
        setLoading(false);
        return;
      }

      // Clear code
      await (supabase as any)
        .from('mt_leads')
        .update({ codigo_verificacao: null, codigo_expira_em: null })
        .eq('id', pendingLead.id);

      // Store auth in sessionStorage
      sessionStorage.setItem('cliente_auth', JSON.stringify(pendingLead));

      navigate('/cliente-imovel');
    } catch (err: any) {
      setError(err.message || 'Erro ao verificar');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Home className="h-10 w-10 mx-auto text-primary mb-2" />
          <CardTitle>Portal do Cliente</CardTitle>
          <CardDescription>
            {step === "identify"
              ? "Entre com seu email, CPF ou telefone"
              : `Código enviado para ${pendingLead?.telefone || pendingLead?.email || 'seu contato'}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
              {error}
            </div>
          )}

          {step === "identify" ? (
            <form onSubmit={handleIdentify} className="space-y-4">
              <div>
                <Label htmlFor="identifier">Email, CPF ou Telefone</Label>
                <Input
                  id="identifier"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="nome@email.com ou (13) 99999-9999"
                  required
                  autoFocus
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading || !identifier.trim()}>
                {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ArrowRight className="h-4 w-4 mr-2" />}
                Continuar
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerify} className="space-y-4">
              <div>
                <Label htmlFor="code">Código de 6 dígitos</Label>
                <Input
                  id="code"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').substring(0, 6))}
                  placeholder="000000"
                  maxLength={6}
                  className="text-center text-2xl tracking-widest font-mono"
                  required
                  autoFocus
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading || code.length !== 6}>
                {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Verificar
              </Button>
              <Button type="button" variant="ghost" className="w-full" onClick={() => { setStep("identify"); setCode(""); setError(null); }}>
                <ArrowLeft className="h-4 w-4 mr-2" />Voltar
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
