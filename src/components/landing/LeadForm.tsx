import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

// YESlaser Praia Grande - IDs fixos para landing page pública
const YESLASER_TENANT_ID = "ebf87fe2-093a-4fba-bb56-c6835cbc1465";
const PRAIA_GRANDE_FRANCHISE_ID = "529bac26-008c-473b-ad30-305e17e95e53";

interface ViaCEPResponse {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
  ibge: string;
  gia: string;
  ddd: string;
  siafi: string;
  erro?: boolean;
}


const NEIGHBORHOODS = {
  "Praia Grande": [
    "Boqueirão", "Tupi", "Guilhermina", "Aviação", "Canto do Forte",
    "Ocian", "Mirim", "Vila Caiçara", "Anhanguera", "Cidade da Criança",
    "Real", "Maracanã", "Quietude", "Ribeirópolis", "Outros"
  ],
  "Santos": [
    "Gonzaga", "Boqueirão", "Embaré", "Aparecida", "Ponta da Praia",
    "Campo Grande", "Marapé", "Encruzilhada", "Vila Mathias",
    "José Menino", "Pompéia", "Centro", "Outros"
  ],
  "São Vicente": [
    "Centro", "Itararé", "Gonzaguinha", "Boa Vista", "Cidade Náutica",
    "Parque São Vicente", "Vila Margarida", "Japuí", "Humaitá",
    "Parque Bitaru", "Catiapoã", "Outros"
  ],
  "Cubatão": [
    "Centro", "Vila Nova", "Vila Light", "Jardim Casqueiro",
    "Vila São José", "Parque Fernando Jorge", "Conjunto Marechal Rondon", "Outros"
  ],
  "Guarujá": [
    "Pitangueiras", "Enseada", "Astúrias", "Tombo", "Praia da Enseada",
    "Vicente de Carvalho", "Santa Rosa", "Jardim Boa Esperança", "Outros"
  ],
  "Mongaguá": [
    "Centro", "Vera Cruz", "Agenor de Campos", "Itaóca",
    "Jardim Praia Grande", "Vila Atlântica", "Outros"
  ],
  "Itanhaém": [
    "Centro", "Praia dos Sonhos", "Cibratel", "Bopiranga",
    "Jardim Suarão", "Belas Artes", "Outros"
  ],
  "Peruíbe": [
    "Centro", "Cidade Nova Peruíbe", "Jardim Peruíbe",
    "Balneário São João Batista", "Estação", "Outros"
  ],
  "Outros": ["Digite seu bairro"]
};

interface LeadFormProps {
  compact?: boolean;
}

const LeadForm = ({ compact = false }: LeadFormProps) => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    gender: "",
    whatsapp: "",
    cep: "",
    logradouro: "",
    complemento: "",
    bairro: "",
    city: "",
    neighborhood: "",
    customNeighborhood: "",
    uf: "",
    ibge: "",
    gia: "",
    ddd: "",
    siafi: "",
    consent: false,
  });

  const [availableNeighborhoods, setAvailableNeighborhoods] = useState<string[]>([]);
  const [showCustomNeighborhood, setShowCustomNeighborhood] = useState(false);
  const [isLoadingCEP, setIsLoadingCEP] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCityChange = (city: string) => {
    setFormData({ ...formData, city, neighborhood: "", customNeighborhood: "" });
    setAvailableNeighborhoods(NEIGHBORHOODS[city as keyof typeof NEIGHBORHOODS] || []);
    setShowCustomNeighborhood(city === "Outros");
  };

  const handleNeighborhoodChange = (neighborhood: string) => {
    setFormData({ ...formData, neighborhood, customNeighborhood: "" });
    setShowCustomNeighborhood(neighborhood === "Outros" || neighborhood === "Digite seu bairro");
  };

  const formatWhatsApp = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length <= 11) {
      return numbers
        .replace(/^(\d{2})(\d)/g, "($1) $2")
        .replace(/(\d{5})(\d)/, "$1-$2");
    }
    return value.slice(0, -1);
  };

  const handleWhatsAppChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatWhatsApp(e.target.value);
    setFormData({ ...formData, whatsapp: formatted });
  };

  const fetchAddressFromCEP = async (cep: string) => {
    const cleanCEP = cep.replace(/\D/g, '');
    if (cleanCEP.length !== 8) return;

    setIsLoadingCEP(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCEP}/json/`);
      const data: ViaCEPResponse = await response.json();

      if (data.erro) {
        toast.error("CEP não encontrado");
        return;
      }

      setFormData(prev => ({
        ...prev,
        logradouro: data.logradouro || "",
        complemento: data.complemento || "",
        bairro: data.bairro || "",
        city: data.localidade || "",
        uf: data.uf || "",
        ibge: data.ibge || "",
        gia: data.gia || "",
        ddd: data.ddd || "",
        siafi: data.siafi || "",
      }));

      // Auto-preencher cidade e bairro se disponíveis
      if (data.localidade) {
        handleCityChange(data.localidade);
      }
      if (data.bairro) {
        setFormData(prev => ({ ...prev, neighborhood: data.bairro }));
      }

      toast.success("Endereço encontrado!");
    } catch (error) {
      console.error('Erro ao buscar CEP:', error);
      toast.error("Erro ao buscar endereço");
    } finally {
      setIsLoadingCEP(false);
    }
  };

  const handleCEPChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const formatted = value.replace(/\D/g, '').replace(/^(\d{5})(\d)/, '$1-$2');
    setFormData({ ...formData, cep: formatted });

    if (formatted.replace(/\D/g, '').length === 8) {
      fetchAddressFromCEP(formatted);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.name || !formData.email || !formData.gender || !formData.whatsapp || !formData.cep || !formData.consent) {
      toast.error("Por favor, preencha todos os campos obrigatórios");
      return;
    }

    if (formData.whatsapp.replace(/\D/g, "").length < 11) {
      toast.error("Por favor, insira um WhatsApp válido");
      return;
    }

    const finalNeighborhood = showCustomNeighborhood ? formData.customNeighborhood : formData.neighborhood;

    setIsSubmitting(true);

    try {
      // Salvar no Supabase (mt_leads - multi-tenant)
      const { error } = await supabase
        .from('mt_leads')
        .insert([{
          tenant_id: YESLASER_TENANT_ID,
          franchise_id: PRAIA_GRANDE_FRANCHISE_ID,
          nome: formData.name,
          email: formData.email,
          telefone: formData.whatsapp.replace(/\D/g, ''),
          whatsapp: formData.whatsapp.replace(/\D/g, ''),
          genero: formData.gender === 'feminino' ? 'Feminino' : formData.gender === 'masculino' ? 'Masculino' : 'Outro',
          cep: formData.cep,
          endereco: formData.logradouro,
          complemento: formData.complemento,
          bairro: formData.bairro || finalNeighborhood,
          cidade: formData.city,
          estado: formData.uf,
          origem: 'landing_page',
          landing_page: window.location.href,
          utm_source: new URLSearchParams(window.location.search).get('utm_source') || null,
          utm_medium: new URLSearchParams(window.location.search).get('utm_medium') || null,
          utm_campaign: new URLSearchParams(window.location.search).get('utm_campaign') || null,
          status: 'novo',
          temperatura: 'quente',
          dados_extras: {
            ibge: formData.ibge,
            gia: formData.gia,
            ddd: formData.ddd,
            siafi: formData.siafi,
            consent: formData.consent,
            source: 'landing_praia_grande',
          },
        }]);

      if (error) {
        console.error('Error saving lead:', error);
        toast.error("Erro ao salvar cadastro. Por favor, tente novamente.");
        return;
      }

      // GTM Event
      if (typeof window !== "undefined" && (window as any).dataLayer) {
        (window as any).dataLayer.push({
          event: "lead_submit",
          formData: {
            city: formData.city,
            gender: formData.gender,
          },
        });
      }

      // Success
      toast.success("Cadastro realizado! Redirecionando para o WhatsApp...");

      // Preparar mensagem do WhatsApp
      const message = `
🎉 *NOVO CADASTRO - YESLASER*

*Dados do Cliente:*
👤 Nome: ${formData.name}
📧 Email: ${formData.email}
📱 WhatsApp: ${formData.whatsapp}
⚧️ Gênero: ${formData.gender === 'feminino' ? 'Feminino' : formData.gender === 'masculino' ? 'Masculino' : 'Outro'}

*Endereço:*
📮 CEP: ${formData.cep}
📍 ${formData.logradouro}${formData.complemento ? `, ${formData.complemento}` : ''}
🏘️ Bairro: ${formData.bairro || finalNeighborhood}
🌆 Cidade: ${formData.city} - ${formData.uf}

✅ Consentimento para contato: Sim
      `.trim();

      // Redirect to WhatsApp after 1.5 seconds
      setTimeout(() => {
        const whatsappUrl = `https://wa.me/5513978263924?text=${encodeURIComponent(message)}`;
        window.location.href = whatsappUrl;
      }, 1500);

    } catch (error) {
      console.error('Error:', error);
      toast.error("Erro ao processar cadastro");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={`bg-card rounded-2xl shadow-primary overflow-hidden ${compact ? "p-6" : "p-8"}`}
    >
      <div className="bg-gradient-to-r from-primary to-secondary p-4 -mx-8 -mt-8 mb-6">
        <div className="flex items-center justify-center gap-2 text-white">
          <Sparkles className="w-5 h-5" />
          <h3 className="text-xl font-bold uppercase">
            {compact ? "Última Chance!" : "Garanta Agora - Últimas Vagas"}
          </h3>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="name" className="text-foreground">Seu nome completo</Label>
          <Input
            id="name"
            type="text"
            placeholder="Digite seu nome"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="email" className="text-foreground">E-mail</Label>
          <Input
            id="email"
            type="email"
            placeholder="seu@email.com"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="gender" className="text-foreground">Gênero</Label>
          <Select value={formData.gender} onValueChange={(value) => setFormData({ ...formData, gender: value })}>
            <SelectTrigger id="gender" className="mt-1">
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="feminino">Feminino</SelectItem>
              <SelectItem value="masculino">Masculino</SelectItem>
              <SelectItem value="outro">Outro</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="whatsapp" className="text-foreground">WhatsApp</Label>
          <Input
            id="whatsapp"
            type="tel"
            placeholder="(13) 99999-9999"
            value={formData.whatsapp}
            onChange={handleWhatsAppChange}
            required
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="cep" className="text-foreground">CEP</Label>
          <div className="relative">
            <Input
              id="cep"
              type="text"
              placeholder="00000-000"
              value={formData.cep}
              onChange={handleCEPChange}
              maxLength={9}
              required
              className="mt-1 pr-10"
            />
            {isLoadingCEP && (
              <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-primary" />
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">Digite o CEP para buscar o endereço automaticamente</p>

          {/* Mostrar endereço encontrado */}
          {formData.logradouro && formData.city && (
            <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-xs">
              <p className="text-green-800">
                <strong>Endereço encontrado:</strong><br />
                {formData.logradouro}{formData.complemento ? `, ${formData.complemento}` : ''}<br />
                {formData.bairro} - {formData.city}/{formData.uf}
              </p>
            </div>
          )}
        </div>

        {/* Campos hidden para manter os valores do endereço */}
        <input type="hidden" name="logradouro" value={formData.logradouro} />
        <input type="hidden" name="complemento" value={formData.complemento} />
        <input type="hidden" name="bairro" value={formData.bairro} />
        <input type="hidden" name="cidade" value={formData.city} />
        <input type="hidden" name="uf" value={formData.uf} />
        <input type="hidden" name="ibge" value={formData.ibge} />
        <input type="hidden" name="gia" value={formData.gia} />
        <input type="hidden" name="ddd" value={formData.ddd} />
        <input type="hidden" name="siafi" value={formData.siafi} />

        <div className="flex items-start gap-2 pt-2">
          <Checkbox
            id="consent"
            checked={formData.consent}
            onCheckedChange={(checked) => setFormData({ ...formData, consent: checked as boolean })}
          />
          <Label htmlFor="consent" className="text-xs text-muted-foreground cursor-pointer">
            Concordo com a Política de Privacidade e autorizo contato via WhatsApp.
          </Label>
        </div>

        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-white font-semibold uppercase tracking-wide py-6 text-lg animate-pulse-slow disabled:opacity-50"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Enviando...
            </>
          ) : (
            '💜 Quero Minhas 10 Sessões Grátis'
          )}
        </Button>

        <p className="text-xs text-center text-muted-foreground">
          🔒 Seus dados estão seguros | ⚡ Leva 10 segundos
        </p>
      </div>
    </form>
  );
};

export default LeadForm;
