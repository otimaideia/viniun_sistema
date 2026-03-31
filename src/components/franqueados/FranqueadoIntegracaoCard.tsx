import { useState } from "react";
import { Franqueado } from "@/types/franqueado";
import { Servico } from "@/types/servico";
import { useServiceCategoriesMT } from "@/hooks/multitenant/useServiceCategoriesMT";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Link2,
  Copy,
  RefreshCw,
  Eye,
  EyeOff,
  CheckCircle2,
  Code,
  Webhook,
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface ServicoCompleto {
  id: string;
  nome: string;
  descricao: string | null;
  categoria: string | null;
}

interface FranqueadoIntegracaoCardProps {
  franqueado: Franqueado;
  servicosVinculados: ServicoCompleto[];
  onGenerateToken: () => void;
  isGenerating?: boolean;
}

export function FranqueadoIntegracaoCard({
  franqueado,
  servicosVinculados,
  onGenerateToken,
  isGenerating,
}: FranqueadoIntegracaoCardProps) {
  const { getCategoryLabel } = useServiceCategoriesMT();
  const [showToken, setShowToken] = useState(false);
  const [showDocs, setShowDocs] = useState(false);

  const apiToken = (franqueado as any).api_token;
  const baseUrl = window.location.origin;
  const webhookUrl = apiToken
    ? `${baseUrl}/api/webhook/leads/${franqueado.id}`
    : null;
  const servicosUrl = apiToken
    ? `${baseUrl}/api/franqueado-servicos/${franqueado.id}`
    : null;

  // Dados públicos com serviços completos (nome, descrição, categoria)
  const publicData = {
    franqueado: {
      id: franqueado.id,
      id_api: franqueado.id_api,
      nome: franqueado.nome_fantasia,
      endereco: franqueado.endereco,
      cidade: franqueado.cidade,
      estado: franqueado.estado,
      whatsapp: franqueado.whatsapp_business,
    },
    servicos: servicosVinculados.map((s) => ({
      id: s.id,
      nome: s.nome,
      descricao: s.descricao,
      categoria: s.categoria,
      categoria_label: s.categoria ? getCategoryLabel(s.categoria) : null,
    })),
    total_servicos: servicosVinculados.length,
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado!`);
  };

  const examplePayload = `{
  "nome": "João Silva",
  "telefone": "(11) 99999-9999",
  "email": "joao@email.com",
  "servico": "${servicosVinculados[0]?.nome || "Consultoria Imobiliária"}",
  "origem": "Landing Page",
  "observacao": "Interesse em pacote completo"
}`;

  const exampleCodePost = `// Enviar lead para a franquia
fetch("${webhookUrl || "[GERAR TOKEN PRIMEIRO]"}", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": "Bearer ${apiToken || "[SEU_TOKEN]"}"
  },
  body: JSON.stringify({
    nome: formData.nome,
    telefone: formData.telefone,
    email: formData.email,
    servico: formData.servico,
    origem: "Landing Page",
    observacao: formData.mensagem
  })
})
.then(res => res.json())
.then(data => console.log("Lead enviado:", data))
.catch(err => console.error("Erro:", err));`;

  const exampleCodeGet = `// Buscar serviços disponíveis da franquia
fetch("${servicosUrl || "[GERAR TOKEN PRIMEIRO]"}", {
  method: "GET",
  headers: {
    "Authorization": "Bearer ${apiToken || "[SEU_TOKEN]"}"
  }
})
.then(res => res.json())
.then(data => {
  console.log("Franqueado:", data.franqueado);
  console.log("Serviços:", data.servicos);
  
  // Renderizar serviços no formulário
  data.servicos.forEach(servico => {
    console.log(\`\${servico.nome} - \${servico.categoria_label}\`);
  });
})
.catch(err => console.error("Erro:", err));`;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Link2 className="h-4 w-4" />
          Integração com Landing Pages
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Token de API */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Token de API</Label>
          {apiToken ? (
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  readOnly
                  value={showToken ? apiToken : "••••••••••••••••••••••••"}
                  className="font-mono text-xs pr-20"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7"
                  onClick={() => setShowToken(!showToken)}
                >
                  {showToken ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => copyToClipboard(apiToken, "Token")}
              >
                <Copy className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={onGenerateToken}
                disabled={isGenerating}
              >
                <RefreshCw className={`h-4 w-4 ${isGenerating ? "animate-spin" : ""}`} />
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button onClick={onGenerateToken} disabled={isGenerating} className="w-full">
                {isGenerating ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Link2 className="h-4 w-4 mr-2" />
                )}
                Gerar Token de Integração
              </Button>
            </div>
          )}
        </div>

        {/* Webhook URL */}
        {webhookUrl && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">URL do Webhook</Label>
            <div className="flex gap-2">
              <Input
                readOnly
                value={webhookUrl}
                className="font-mono text-xs"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => copyToClipboard(webhookUrl, "URL")}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        <Separator />

        {/* Dados públicos compartilhados */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Dados Compartilhados</Label>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => copyToClipboard(JSON.stringify(publicData, null, 2), "Dados")}
            >
              <Copy className="h-3 w-3 mr-1" />
              Copiar JSON
            </Button>
          </div>
          <div className="bg-muted rounded-md p-3 text-xs font-mono overflow-x-auto">
            <pre className="whitespace-pre-wrap">{JSON.stringify(publicData, null, 2)}</pre>
          </div>
        </div>

        {/* Documentação */}
        {apiToken && (
          <Collapsible open={showDocs} onOpenChange={setShowDocs}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full justify-between">
                <span className="flex items-center gap-2">
                  <Code className="h-4 w-4" />
                  Documentação da API
                </span>
                <Badge variant="secondary">
                  {showDocs ? "Ocultar" : "Mostrar"}
                </Badge>
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-4 space-y-6">
              {/* Separator */}
              <Separator />
              
              {/* GET Endpoint - Buscar Serviços */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-blue-600">GET</Badge>
                    <span className="text-sm font-mono">/api/franqueado-servicos/{franqueado.id}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Consulta os serviços disponíveis desta franquia
                  </p>
                </div>

                {/* Exemplo de código GET */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Exemplo GET (JavaScript)</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(exampleCodeGet, "Código GET")}
                    >
                      <Copy className="h-3 w-3 mr-1" />
                      Copiar
                    </Button>
                  </div>
                  <div className="bg-muted rounded-md p-3 text-xs font-mono overflow-x-auto">
                    <pre className="whitespace-pre-wrap">{exampleCodeGet}</pre>
                  </div>
                </div>

                {/* Resposta GET */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Resposta GET</Label>
                  <div className="bg-muted rounded-md p-3 text-xs font-mono overflow-x-auto">
                    <pre className="whitespace-pre-wrap">{JSON.stringify(publicData, null, 2)}</pre>
                  </div>
                </div>
              </div>

              <Separator />

              {/* POST Endpoint - Enviar Lead */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-green-600">POST</Badge>
                    <span className="text-sm font-mono">/api/webhook/leads/{franqueado.id}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Envia um novo lead diretamente para esta franquia
                  </p>
                </div>

                {/* Headers */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Headers Obrigatórios</Label>
                  <div className="bg-muted rounded-md p-3 text-xs font-mono">
                    <p>Content-Type: application/json</p>
                    <p>Authorization: Bearer {showToken ? apiToken : "[SEU_TOKEN]"}</p>
                  </div>
                </div>

                {/* Payload */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Payload (JSON)</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(examplePayload, "Payload exemplo")}
                    >
                      <Copy className="h-3 w-3 mr-1" />
                      Copiar
                    </Button>
                  </div>
                  <div className="bg-muted rounded-md p-3 text-xs font-mono overflow-x-auto">
                    <pre className="whitespace-pre-wrap">{examplePayload}</pre>
                  </div>
                </div>

                {/* Campos obrigatórios */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Campos</Label>
                  <div className="grid gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <Badge variant="destructive" className="text-[10px]">obrigatório</Badge>
                      <span className="font-mono">nome</span>
                      <span className="text-muted-foreground">- Nome do lead</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-[10px]">opcional</Badge>
                      <span className="font-mono">telefone</span>
                      <span className="text-muted-foreground">- Telefone para contato</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-[10px]">opcional</Badge>
                      <span className="font-mono">email</span>
                      <span className="text-muted-foreground">- E-mail do lead</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-[10px]">opcional</Badge>
                      <span className="font-mono">servico</span>
                      <span className="text-muted-foreground">- Serviço de interesse</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-[10px]">opcional</Badge>
                      <span className="font-mono">origem</span>
                      <span className="text-muted-foreground">- Origem do lead (ex: LP)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-[10px]">opcional</Badge>
                      <span className="font-mono">observacao</span>
                      <span className="text-muted-foreground">- Observações adicionais</span>
                    </div>
                  </div>
                </div>

                {/* Exemplo de código POST */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Exemplo POST (JavaScript)</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(exampleCodePost, "Código POST")}
                    >
                      <Copy className="h-3 w-3 mr-1" />
                      Copiar
                    </Button>
                  </div>
                  <div className="bg-muted rounded-md p-3 text-xs font-mono overflow-x-auto">
                    <pre className="whitespace-pre-wrap">{exampleCodePost}</pre>
                  </div>
                </div>

                {/* Resposta POST */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Resposta de Sucesso</Label>
                  <div className="bg-muted rounded-md p-3 text-xs font-mono">
                    <pre>{`{
  "success": true,
  "message": "Lead criado com sucesso",
  "lead_id": "uuid-do-lead"
}`}</pre>
                  </div>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Status */}
        <div className="flex items-center gap-2 pt-2">
          {apiToken ? (
            <>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span className="text-sm text-green-600">Integração ativa</span>
            </>
          ) : (
            <>
              <Webhook className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Gere um token para ativar a integração
              </span>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
