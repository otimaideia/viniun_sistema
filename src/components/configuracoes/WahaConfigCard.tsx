import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  MessageSquare, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  ExternalLink,
  RefreshCw,
  Link,
  Key,
  Webhook,
  Cpu,
  Wifi,
  WifiOff,
  Server
} from "lucide-react";
import type { WahaConfigRow, WahaConfigInput, WahaEngine, WahaConnectionTestResult } from "@/types/whatsapp";

interface WahaConfigCardProps {
  config: WahaConfigRow | null;
  isLoading: boolean;
  isSaving: boolean;
  isTesting: boolean;
  onSave: (input: WahaConfigInput) => void;
  onTest: (params: { apiUrl: string; apiKey: string }) => Promise<WahaConnectionTestResult>;
}

export function WahaConfigCard({
  config,
  isLoading,
  isSaving,
  isTesting,
  onSave,
  onTest,
}: WahaConfigCardProps) {
  // Estado local do formulário (carregado do banco de dados)
  const [apiUrl, setApiUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [defaultEngine, setDefaultEngine] = useState<WahaEngine>("NOWEB");
  const [enabled, setEnabled] = useState(false);
  
  // Estado do teste de conexão
  const [testStatus, setTestStatus] = useState<"idle" | "testing" | "success" | "error">("idle");
  const [testMessage, setTestMessage] = useState("");
  const [sessionsCount, setSessionsCount] = useState<number | undefined>();

  // Carregar valores do config do banco de dados
  useEffect(() => {
    if (config) {
      setApiUrl(config.api_url || "");
      setApiKey(config.api_key || "");
      setWebhookUrl(config.webhook_base_url || "");
      setDefaultEngine(config.default_engine || "NOWEB");
      setEnabled(config.enabled || false);
    }
  }, [config]);

  // Testar conexão
  const handleTestConnection = async () => {
    if (!apiUrl || !apiKey) {
      setTestStatus("error");
      setTestMessage("Preencha a URL e API Key");
      return;
    }

    setTestStatus("testing");
    setTestMessage("");

    try {
      const result = await onTest({ apiUrl, apiKey });
      
      if (result.success) {
        setTestStatus("success");
        setTestMessage(result.message);
        setSessionsCount(result.sessionsCount);
      } else {
        setTestStatus("error");
        setTestMessage(result.message);
        setSessionsCount(undefined);
      }
    } catch (error) {
      setTestStatus("error");
      setTestMessage(error instanceof Error ? error.message : "Erro ao testar conexão");
      setSessionsCount(undefined);
    }
  };

  // Salvar configurações
  const handleSave = () => {
    if (!apiUrl) {
      setTestMessage("URL da API é obrigatória");
      setTestStatus("error");
      return;
    }

    onSave({
      api_url: apiUrl,
      api_key: apiKey || null,
      webhook_base_url: webhookUrl || null,
      enabled,
      default_engine: defaultEngine,
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72 mt-2" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <div className="grid sm:grid-cols-2 gap-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-green-600" />
              WhatsApp (WAHA)
            </CardTitle>
            <CardDescription>
              Integração com WAHA para gerenciamento de múltiplas sessões WhatsApp
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {testStatus === "success" && (
              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                <Wifi className="h-3 w-3 mr-1" />
                Conectado
              </Badge>
            )}
            {testStatus === "error" && (
              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                <WifiOff className="h-3 w-3 mr-1" />
                Erro
              </Badge>
            )}
            <Switch
              checked={enabled}
              onCheckedChange={setEnabled}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Status da Conexão */}
        {testStatus === "success" && sessionsCount !== undefined && (
          <Alert className="bg-emerald-50 border-emerald-200">
            <Server className="h-4 w-4 text-emerald-600" />
            <AlertTitle className="text-emerald-700">Conexão estabelecida</AlertTitle>
            <AlertDescription className="text-emerald-600">
              {sessionsCount} sessão(ões) ativa(s) encontrada(s) no servidor WAHA.
            </AlertDescription>
          </Alert>
        )}

        {/* Campos de configuração */}
        <div className="grid gap-4">
          {/* URL da API */}
          <div className="space-y-2">
            <Label htmlFor="wahaApiUrl" className="flex items-center gap-2">
              <Link className="h-4 w-4" />
              URL da Instância WAHA
            </Label>
            <Input
              id="wahaApiUrl"
              type="url"
              placeholder="https://waha.seudominio.com.br"
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground">
              Endereço do servidor WAHA (sem barra no final)
            </p>
          </div>

          {/* API Key */}
          <div className="space-y-2">
            <Label htmlFor="wahaApiKey" className="flex items-center gap-2">
              <Key className="h-4 w-4" />
              API Key
            </Label>
            <Input
              id="wahaApiKey"
              type="password"
              placeholder="Sua chave de API do WAHA..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground">
              Chave configurada no WAHA_API_KEY do servidor
            </p>
          </div>

          {/* Botão de teste */}
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={handleTestConnection}
              disabled={!apiUrl || !apiKey || isTesting}
            >
              {isTesting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Testar Conexão
            </Button>
            {testMessage && (
              <p className={`text-sm flex items-center ${testStatus === "success" ? "text-emerald-600" : "text-red-600"}`}>
                {testStatus === "success" ? (
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                ) : (
                  <XCircle className="h-4 w-4 mr-1" />
                )}
                {testMessage}
              </p>
            )}
          </div>

          {/* Webhook URL */}
          <div className="space-y-2">
            <Label htmlFor="wahaWebhookUrl" className="flex items-center gap-2">
              <Webhook className="h-4 w-4" />
              URL Base do Webhook (opcional)
            </Label>
            <Input
              id="wahaWebhookUrl"
              type="url"
              placeholder="https://seusite.com/api/waha-webhook"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground">
              URL para receber eventos do WAHA (mensagens recebidas, status, etc.)
            </p>
          </div>

          {/* Engine padrão */}
          <div className="space-y-2">
            <Label htmlFor="wahaEngine" className="flex items-center gap-2">
              <Cpu className="h-4 w-4" />
              Engine Padrão
            </Label>
            <Select value={defaultEngine} onValueChange={(v) => setDefaultEngine(v as WahaEngine)}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Selecione o engine" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NOWEB">NOWEB (Recomendado)</SelectItem>
                <SelectItem value="GOWS">GOWS (Go + Labels nativas)</SelectItem>
                <SelectItem value="WEBJS">WEBJS</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Engine padrão usado ao criar novas sessões. NOWEB é mais rápido e estável. GOWS tem suporte nativo a labels e poll vote.
            </p>
          </div>
        </div>

        {/* Documentação */}
        <Alert>
          <MessageSquare className="h-4 w-4" />
          <AlertTitle>Endpoints disponíveis</AlertTitle>
          <AlertDescription className="mt-2">
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Sessões: GET/POST <code className="text-xs bg-muted px-1 py-0.5 rounded">/api/sessions</code></li>
              <li>QR Code: GET <code className="text-xs bg-muted px-1 py-0.5 rounded">/api/&#123;session&#125;/auth/qr</code></li>
              <li>Enviar texto: POST <code className="text-xs bg-muted px-1 py-0.5 rounded">/api/sendText</code></li>
              <li>Chats: GET <code className="text-xs bg-muted px-1 py-0.5 rounded">/api/&#123;session&#125;/chats</code></li>
            </ul>
          </AlertDescription>
        </Alert>

        {/* Rodapé com link e botão salvar */}
        <div className="flex items-center justify-between pt-4 border-t">
          <a
            href={apiUrl ? `${apiUrl}/` : "https://waha.devlike.pro/"}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary hover:underline flex items-center gap-1"
          >
            Abrir Dashboard WAHA
            <ExternalLink className="h-3 w-3" />
          </a>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Salvando...
              </>
            ) : (
              "Salvar Configurações"
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
