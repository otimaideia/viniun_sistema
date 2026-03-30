import { useState, useEffect } from "react";
import { useInfluenciadorasAdapter } from "@/hooks/useInfluenciadorasAdapter";
import { useFranqueadosAdapter } from "@/hooks/useFranqueadosAdapter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhoneInputInternational } from "@/components/ui/phone-input-international";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Save, User, Instagram, MapPin, Upload } from "lucide-react";
import { toast } from "sonner";
import { safeGetInitials } from "@/utils/unicodeSanitizer";
import type {
  Influenciadora,
  InfluenciadoraFormData,
  InfluenciadoraTipo,
  InfluenciadoraTamanho,
} from "@/types/influenciadora";

const ESTADOS_BRASIL = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA",
  "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN",
  "RS", "RO", "RR", "SC", "SP", "SE", "TO",
];

const TIPOS_INFLUENCIADORA: { value: InfluenciadoraTipo; label: string }[] = [
  { value: "influenciador", label: "Influenciador(a)" },
  { value: "ugc_creator", label: "UGC Creator" },
  { value: "ambos", label: "Influenciador + UGC" },
];

const TAMANHOS_INFLUENCIADORA: { value: InfluenciadoraTamanho; label: string }[] = [
  { value: "nano", label: "Nano (1k-10k)" },
  { value: "micro", label: "Micro (10k-50k)" },
  { value: "medio", label: "Médio (50k-500k)" },
  { value: "macro", label: "Macro (500k-1M)" },
  { value: "mega", label: "Mega (1M+)" },
];

interface InfluenciadoraFormModalProps {
  influenciadora?: Influenciadora | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const emptyForm: InfluenciadoraFormData & { telefone_codigo_pais?: string; whatsapp_codigo_pais?: string } = {
  nome_completo: "",
  nome_artistico: "",
  email: "",
  telefone: "",
  telefone_codigo_pais: "55",
  whatsapp: "",
  whatsapp_codigo_pais: "55",
  cpf: "",
  data_nascimento: "",
  cidade: "",
  estado: "",
  cep: "",
  bairro: "",
  foto_perfil: "",
  biografia: "",
  tipo: "influenciador",
  tamanho: undefined,
  franqueado_id: undefined,
  unidade_id: undefined,
};

export function InfluenciadoraFormModal({
  influenciadora,
  open,
  onOpenChange,
}: InfluenciadoraFormModalProps) {
  const [form, setForm] = useState<InfluenciadoraFormData & { telefone_codigo_pais?: string; whatsapp_codigo_pais?: string }>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { franqueados } = useFranqueadosAdapter();
  const {
    create,
    update,
    isCreating,
    isUpdating,
    checkWhatsAppExists,
    checkEmailExists,
    checkCPFExists,
  } = useInfluenciadorasAdapter();

  const isEditing = !!influenciadora;
  const isSaving = isCreating || isUpdating;

  useEffect(() => {
    if (influenciadora) {
      setForm({
        nome_completo: influenciadora.nome_completo || "",
        nome_artistico: influenciadora.nome_artistico || "",
        email: influenciadora.email || "",
        telefone: influenciadora.telefone || "",
        telefone_codigo_pais: influenciadora.telefone_codigo_pais || "55",
        whatsapp: influenciadora.whatsapp || "",
        whatsapp_codigo_pais: influenciadora.whatsapp_codigo_pais || "55",
        cpf: influenciadora.cpf || "",
        data_nascimento: influenciadora.data_nascimento || "",
        cidade: influenciadora.cidade || "",
        estado: influenciadora.estado || "",
        cep: influenciadora.cep || "",
        bairro: influenciadora.bairro || "",
        foto_perfil: influenciadora.foto_perfil || "",
        biografia: influenciadora.biografia || "",
        tipo: influenciadora.tipo || "influenciador",
        tamanho: influenciadora.tamanho,
        franqueado_id: influenciadora.franqueado_id,
        unidade_id: influenciadora.unidade_id,
      });
    } else {
      setForm(emptyForm);
    }
    setErrors({});
  }, [influenciadora, open]);

  const validateForm = async (): Promise<boolean> => {
    const newErrors: Record<string, string> = {};

    // Nome obrigatório
    if (!form.nome_completo?.trim()) {
      newErrors.nome_completo = "Nome é obrigatório";
    }

    // WhatsApp obrigatório
    if (!form.whatsapp?.trim()) {
      newErrors.whatsapp = "WhatsApp é obrigatório";
    } else {
      const whatsappExists = await checkWhatsAppExists(
        form.whatsapp,
        influenciadora?.id
      );
      if (whatsappExists) {
        newErrors.whatsapp = "WhatsApp já cadastrado";
      }
    }

    // Validar email se preenchido
    if (form.email?.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(form.email)) {
        newErrors.email = "Email inválido";
      } else {
        const emailExists = await checkEmailExists(form.email, influenciadora?.id);
        if (emailExists) {
          newErrors.email = "Email já cadastrado";
        }
      }
    }

    // Validar CPF se preenchido
    if (form.cpf?.trim()) {
      const cleanCPF = form.cpf.replace(/\D/g, "");
      if (cleanCPF.length !== 11) {
        newErrors.cpf = "CPF inválido";
      } else {
        const cpfExists = await checkCPFExists(form.cpf, influenciadora?.id);
        if (cpfExists) {
          newErrors.cpf = "CPF já cadastrado";
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const isValid = await validateForm();
    if (!isValid) {
      toast.error("Corrija os erros no formulário");
      return;
    }

    try {
      if (isEditing && influenciadora) {
        update({ id: influenciadora.id, data: form });
      } else {
        create(form);
      }
      onOpenChange(false);
    } catch (error) {
      console.error("Erro ao salvar:", error);
    }
  };

  const updateField = (field: keyof InfluenciadoraFormData, value: unknown) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    // Limpar erro ao editar campo
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const formatCPF = (value: string) => {
    const cleaned = value.replace(/\D/g, "");
    if (cleaned.length <= 3) return cleaned;
    if (cleaned.length <= 6) return `${cleaned.slice(0, 3)}.${cleaned.slice(3)}`;
    if (cleaned.length <= 9)
      return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6)}`;
    return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6, 9)}-${cleaned.slice(9, 11)}`;
  };

  const formatPhone = (value: string) => {
    const cleaned = value.replace(/\D/g, "");
    if (cleaned.length <= 2) return cleaned;
    if (cleaned.length <= 7) return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2)}`;
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7, 11)}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {isEditing ? "Editar Influenciadora" : "Nova Influenciadora"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <Tabs defaultValue="dados" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="dados">Dados Pessoais</TabsTrigger>
              <TabsTrigger value="perfil">Perfil</TabsTrigger>
              <TabsTrigger value="vinculo">Vinculação</TabsTrigger>
            </TabsList>

            <ScrollArea className="h-[55vh] mt-4 pr-4">
              {/* Tab: Dados Pessoais */}
              <TabsContent value="dados" className="space-y-4">
                <div className="flex items-center gap-4 mb-6">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={form.foto_perfil} />
                    <AvatarFallback className="text-lg">
                      {form.nome_completo ? safeGetInitials(form.nome_completo) : "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <Label>URL da Foto de Perfil</Label>
                    <Input
                      placeholder="https://exemplo.com/foto.jpg"
                      value={form.foto_perfil || ""}
                      onChange={(e) => updateField("foto_perfil", e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nome Completo *</Label>
                    <Input
                      value={form.nome_completo}
                      onChange={(e) => updateField("nome_completo", e.target.value)}
                      className={errors.nome_completo ? "border-destructive" : ""}
                    />
                    {errors.nome_completo && (
                      <p className="text-xs text-destructive">{errors.nome_completo}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Nome Artístico</Label>
                    <Input
                      placeholder="@nome_no_instagram"
                      value={form.nome_artistico || ""}
                      onChange={(e) => updateField("nome_artistico", e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>WhatsApp *</Label>
                    <PhoneInputInternational
                      value={form.whatsapp}
                      countryCode={form.whatsapp_codigo_pais || "55"}
                      onChange={(value) => updateField("whatsapp", value)}
                      onCountryChange={(code) => updateField("whatsapp_codigo_pais", code)}
                      error={!!errors.whatsapp}
                      showCountryName
                    />
                    {errors.whatsapp && (
                      <p className="text-xs text-destructive">{errors.whatsapp}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Telefone</Label>
                    <PhoneInputInternational
                      value={form.telefone || ""}
                      countryCode={form.telefone_codigo_pais || "55"}
                      onChange={(value) => updateField("telefone", value)}
                      onCountryChange={(code) => updateField("telefone_codigo_pais", code)}
                      showCountryName
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      placeholder="email@exemplo.com"
                      value={form.email || ""}
                      onChange={(e) => updateField("email", e.target.value)}
                      className={errors.email ? "border-destructive" : ""}
                    />
                    {errors.email && (
                      <p className="text-xs text-destructive">{errors.email}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>CPF</Label>
                    <Input
                      placeholder="000.000.000-00"
                      value={form.cpf || ""}
                      onChange={(e) => updateField("cpf", formatCPF(e.target.value))}
                      maxLength={14}
                      className={errors.cpf ? "border-destructive" : ""}
                    />
                    {errors.cpf && (
                      <p className="text-xs text-destructive">{errors.cpf}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Data de Nascimento</Label>
                  <Input
                    type="date"
                    value={form.data_nascimento || ""}
                    onChange={(e) => updateField("data_nascimento", e.target.value)}
                  />
                </div>

                <div className="pt-4 border-t">
                  <div className="flex items-center gap-2 mb-4">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <h4 className="font-medium">Endereço</h4>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>CEP</Label>
                      <Input
                        placeholder="00000-000"
                        value={form.cep || ""}
                        onChange={(e) => updateField("cep", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Cidade</Label>
                      <Input
                        value={form.cidade || ""}
                        onChange={(e) => updateField("cidade", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Estado</Label>
                      <Select
                        value={form.estado || ""}
                        onValueChange={(v) => updateField("estado", v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="UF" />
                        </SelectTrigger>
                        <SelectContent>
                          {ESTADOS_BRASIL.map((uf) => (
                            <SelectItem key={uf} value={uf}>
                              {uf}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2 mt-4">
                    <Label>Bairro</Label>
                    <Input
                      value={form.bairro || ""}
                      onChange={(e) => updateField("bairro", e.target.value)}
                    />
                  </div>
                </div>
              </TabsContent>

              {/* Tab: Perfil */}
              <TabsContent value="perfil" className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <Instagram className="h-4 w-4 text-muted-foreground" />
                  <h4 className="font-medium">Perfil Profissional</h4>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tipo *</Label>
                    <Select
                      value={form.tipo}
                      onValueChange={(v) =>
                        updateField("tipo", v as InfluenciadoraTipo)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TIPOS_INFLUENCIADORA.map((tipo) => (
                          <SelectItem key={tipo.value} value={tipo.value}>
                            {tipo.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Tamanho (Seguidores)</Label>
                    <Select
                      value={form.tamanho || ""}
                      onValueChange={(v) =>
                        updateField(
                          "tamanho",
                          v ? (v as InfluenciadoraTamanho) : undefined
                        )
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {TAMANHOS_INFLUENCIADORA.map((tam) => (
                          <SelectItem key={tam.value} value={tam.value}>
                            {tam.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Biografia</Label>
                  <Textarea
                    placeholder="Conte um pouco sobre você, seu nicho e estilo de conteúdo..."
                    value={form.biografia || ""}
                    onChange={(e) => updateField("biografia", e.target.value)}
                    rows={4}
                  />
                  <p className="text-xs text-muted-foreground">
                    Máximo 500 caracteres
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground">
                    <strong>Nota:</strong> As redes sociais e valores por tipo de
                    conteúdo podem ser adicionados após salvar o cadastro, na tela
                    de detalhes da influenciadora.
                  </p>
                </div>
              </TabsContent>

              {/* Tab: Vinculação */}
              <TabsContent value="vinculo" className="space-y-4">
                <div className="space-y-2">
                  <Label>Franquia Vinculada</Label>
                  <Select
                    value={form.franqueado_id || "global"}
                    onValueChange={(v) =>
                      updateField("franqueado_id", v === "global" ? undefined : v)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="global">
                        Global (todas as franquias)
                      </SelectItem>
                      {franqueados.map((f) => (
                        <SelectItem key={f.id} value={f.id}>
                          {f.nome_fantasia || f.nome_franquia}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Influenciadoras globais podem ser utilizadas por todas as
                    franquias
                  </p>
                </div>

                <div className="p-4 rounded-lg border">
                  <h4 className="font-medium mb-2">Sobre a vinculação</h4>
                  <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-4">
                    <li>
                      <strong>Global:</strong> A influenciadora aparece para todas
                      as unidades e pode receber promoções de qualquer franquia.
                    </li>
                    <li>
                      <strong>Por Franquia:</strong> A influenciadora é exclusiva
                      da unidade selecionada e só aparece para ela.
                    </li>
                    <li>
                      Franquias podem ver e utilizar influenciadoras globais, mas
                      não podem editar seus dados.
                    </li>
                  </ul>
                </div>
              </TabsContent>
            </ScrollArea>
          </Tabs>

          <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Salvar
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
