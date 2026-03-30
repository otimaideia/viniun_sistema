// Página SIMPLIFICADA de Sessões WhatsApp
// Replica exatamente o comportamento do script criar-sessao.sh que funcionou

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { sanitizeObjectForJSON } from "@/utils/unicodeSanitizer";
import { getWahaApiKeyForUrl } from "@/services/waha-api";

// Configuração WAHA — key centralizada em waha-api.ts
const WAHA_URL = "https://waha.yeslaser.com.br";
const API_KEY = getWahaApiKeyForUrl(WAHA_URL, "") || "";

interface WAHASession {
  name: string;
  status: string;
  config?: {
    noweb?: {
      store?: {
        enabled?: boolean;
        fullSync?: boolean;
      };
    };
  };
}

interface LogEntry {
  time: string;
  message: string;
  type: 'info' | 'success' | 'error';
  data?: unknown;
}

interface QRCodeData {
  url: string;
  base64?: string;
}

export default function WhatsAppSessoes2() {
  const [sessionName, setSessionName] = useState("teste_painel");
  const [sessions, setSessions] = useState<WAHASession[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [qrCode, setQrCode] = useState<QRCodeData | null>(null);
  const [isLoadingQR, setIsLoadingQR] = useState(false);

  // Log helper
  const log = (message: string, type: LogEntry['type'] = 'info', data?: unknown) => {
    const entry: LogEntry = {
      time: new Date().toLocaleTimeString(),
      message,
      type,
      data,
    };
    setLogs(prev => [entry, ...prev]);
    console.log(`[${type.toUpperCase()}]`, message, data || '');
  };

  // Função genérica para chamadas WAHA (igual ao script)
  const wahaFetch = async (endpoint: string, method = 'GET', body?: object) => {
    const url = `${WAHA_URL}${endpoint}`;
    log(`${method} ${endpoint}`, 'info');

    const options: RequestInit = {
      method,
      headers: {
        'X-Api-Key': API_KEY,
        'Content-Type': 'application/json',
      },
    };

    if (body) {
      // Sanitizar body para prevenir erros com caracteres Unicode inválidos
      const sanitizedBody = sanitizeObjectForJSON(body);
      options.body = JSON.stringify(sanitizedBody);
    }

    const response = await fetch(url, options);
    const text = await response.text();
    const data = text ? JSON.parse(text) : null;

    if (!response.ok) {
      log(`Erro ${response.status}: ${text.substring(0, 100)}`, 'error');
      throw new Error(`HTTP ${response.status}`);
    }

    return data;
  };

  // Buscar QR Code (com autenticação)
  const fetchQRCode = async (sessionName: string) => {
    setIsLoadingQR(true);
    const url = `${WAHA_URL}/api/${sessionName}/auth/qr`;
    log(`Buscando QR Code: ${url}`, 'info');

    try {
      const response = await fetch(url, {
        headers: {
          'X-Api-Key': API_KEY,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      // Tentar como JSON primeiro (retorna {value: "base64..."})
      const contentType = response.headers.get('content-type');

      if (contentType?.includes('application/json')) {
        const data = await response.json();
        if (data.value) {
          // É base64 direto
          const base64 = data.value.startsWith('data:')
            ? data.value
            : `data:image/png;base64,${data.value}`;
          setQrCode({ url, base64 });
          log('QR Code carregado (JSON/base64)', 'success');
        }
      } else {
        // É imagem binária - converter para base64
        const blob = await response.blob();
        const reader = new FileReader();
        reader.onloadend = () => {
          setQrCode({ url, base64: reader.result as string });
          log('QR Code carregado (imagem)', 'success');
        };
        reader.readAsDataURL(blob);
      }
    } catch (err) {
      log(`Erro ao buscar QR: ${err}`, 'error');
      // Fallback: mostrar link direto
      setQrCode({ url });
    } finally {
      setIsLoadingQR(false);
    }
  };

  // Listar sessões
  const listSessions = async () => {
    try {
      const data = await wahaFetch('/api/sessions');
      setSessions(data || []);
      log(`${data?.length || 0} sessões encontradas`, 'success',
        data?.map((s: WAHASession) => ({
          name: s.name,
          status: s.status,
          store_enabled: s.config?.noweb?.store?.enabled
        }))
      );
    } catch (err) {
      log(`Erro ao listar: ${err}`, 'error');
    }
  };

  // CRIAR SESSÃO - Igual ao script criar-sessao.sh
  const createSession = async () => {
    if (!sessionName.trim()) {
      toast.error("Digite um nome para a sessão");
      return;
    }

    setIsCreating(true);
    const name = sessionName.trim().toLowerCase().replace(/\s+/g, '_');

    try {
      // ========================================
      // PASSO 1: Criar sessão com NOWEB store
      // ========================================
      log(`========================================`, 'info');
      log(`CRIAR SESSÃO: ${name}`, 'info');
      log(`========================================`, 'info');

      log(`1. Criando sessão com NOWEB store...`, 'info');

      // Config EXATAMENTE igual ao script
      const createConfig = {
        name: name,
        config: {
          noweb: {
            store: {
              enabled: true,
              fullSync: true,
            },
          },
        },
      };

      log(`Config enviada:`, 'info', createConfig);

      const createResult = await wahaFetch('/api/sessions', 'POST', createConfig);
      log(`Sessão criada:`, 'success', {
        name: createResult?.name,
        status: createResult?.status,
        store: createResult?.config?.noweb?.store,
      });

      // ========================================
      // PASSO 2: Iniciar sessão
      // ========================================
      log(`2. Iniciando sessão...`, 'info');
      await new Promise(r => setTimeout(r, 1000)); // Sleep 1s igual ao script

      const startResult = await wahaFetch(`/api/sessions/${name}/start`, 'POST');
      log(`Sessão iniciada:`, 'success', { status: startResult?.status });

      // ========================================
      // PASSO 3: Verificar status
      // ========================================
      log(`3. Verificando status...`, 'info');
      await new Promise(r => setTimeout(r, 2000)); // Sleep 2s igual ao script

      const statusResult = await wahaFetch(`/api/sessions/${name}`);
      log(`Status final:`, 'success', {
        name: statusResult?.name,
        status: statusResult?.status,
        store_enabled: statusResult?.config?.noweb?.store?.enabled,
      });

      // ========================================
      // MOSTRAR QR CODE
      // ========================================
      log(`========================================`, 'info');
      log(`Buscando QR CODE...`, 'info');
      log(`========================================`, 'info');
      await fetchQRCode(name);

      toast.success("Sessão criada! Escaneie o QR Code.");

      // Atualizar lista
      await listSessions();

    } catch (err) {
      log(`ERRO: ${err}`, 'error');
      toast.error(`Erro: ${err}`);
    } finally {
      setIsCreating(false);
    }
  };

  // Deletar sessão
  const deleteSession = async (name: string) => {
    if (!confirm(`Deletar sessão "${name}"?`)) return;

    try {
      await wahaFetch(`/api/sessions/${name}`, 'DELETE');
      log(`Sessão "${name}" deletada`, 'success');
      toast.success("Sessão deletada");
      await listSessions();
    } catch (err) {
      log(`Erro ao deletar: ${err}`, 'error');
    }
  };

  // Verificar chats de uma sessão
  const checkChats = async (name: string) => {
    try {
      log(`Buscando chats de "${name}"...`, 'info');
      const chats = await wahaFetch(`/api/${name}/chats?limit=50`);

      if (Array.isArray(chats)) {
        log(`Total de chats: ${chats.length}`, chats.length > 0 ? 'success' : 'error');
        if (chats.length > 0) {
          log(`Primeiros 5 chats:`, 'success',
            chats.slice(0, 5).map((c: { id: string; name?: string }) => ({
              id: c.id,
              name: c.name
            }))
          );
        }
      } else {
        log(`Resposta inesperada:`, 'error', chats);
      }
    } catch (err) {
      log(`Erro ao buscar chats: ${err}`, 'error');
    }
  };

  // Carregar sessões ao montar
  useEffect(() => {
    listSessions();
  }, []);

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <h1 className="text-2xl font-bold mb-6">🧪 Teste WAHA - Criar Sessão (Simplificado)</h1>

      {/* Configuração */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Configuração</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">WAHA URL:</label>
            <Input value={WAHA_URL} disabled className="bg-muted" />
          </div>
          <div>
            <label className="text-sm font-medium">API Key:</label>
            <Input value={API_KEY} disabled className="bg-muted" />
          </div>
          <div>
            <label className="text-sm font-medium">Nome da Sessão:</label>
            <Input
              value={sessionName}
              onChange={(e) => setSessionName(e.target.value)}
              placeholder="nome_sessao"
            />
          </div>
        </CardContent>
      </Card>

      {/* Ações */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Ações</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={listSessions}>
            📋 Listar Sessões
          </Button>
          <Button
            onClick={createSession}
            disabled={isCreating}
            className="bg-green-600 hover:bg-green-700"
          >
            {isCreating ? '⏳ Criando...' : '➕ Criar Sessão'}
          </Button>
        </CardContent>
      </Card>

      {/* QR Code */}
      {(qrCode || isLoadingQR) && (
        <Card className="mb-6 border-green-500">
          <CardHeader>
            <CardTitle className="text-green-600">📱 QR Code</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingQR ? (
              <div className="flex items-center justify-center p-8">
                <span className="animate-spin text-4xl">⏳</span>
                <span className="ml-2">Carregando QR Code...</span>
              </div>
            ) : qrCode?.base64 ? (
              <>
                <p className="mb-4 text-sm">Escaneie o QR Code abaixo com o WhatsApp:</p>
                <div className="flex items-center gap-4">
                  <img
                    src={qrCode.base64}
                    alt="QR Code"
                    className="border rounded-lg"
                    style={{ maxWidth: 256, maxHeight: 256 }}
                  />
                  <div>
                    <p className="text-sm text-green-600 mb-2">✅ QR Code carregado!</p>
                    <p className="text-xs text-muted-foreground">
                      Abra o WhatsApp no celular e escaneie.
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-yellow-600">
                  ⚠️ Não foi possível carregar a imagem diretamente.
                </p>
                <p className="text-sm">Acesse o link abaixo para ver o QR Code:</p>
                <code className="text-xs bg-muted p-2 rounded block break-all">
                  {qrCode?.url}
                </code>
                <Button
                  onClick={() => window.open(qrCode?.url, '_blank')}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  🔗 Abrir QR Code em nova aba
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Sessões */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Sessões ({sessions.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {sessions.length === 0 ? (
            <p className="text-muted-foreground">Nenhuma sessão encontrada</p>
          ) : (
            <div className="space-y-2">
              {sessions.map((session) => (
                <div
                  key={session.name}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono">{session.name}</span>
                    <Badge
                      className={
                        session.status === 'WORKING' ? 'bg-green-500' :
                        session.status === 'SCAN_QR_CODE' ? 'bg-blue-500' :
                        session.status === 'STARTING' ? 'bg-yellow-500' :
                        'bg-gray-500'
                      }
                    >
                      {session.status}
                    </Badge>
                    {session.config?.noweb?.store?.enabled && (
                      <Badge variant="outline" className="text-green-600 border-green-600">
                        store: true
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {session.status === 'WORKING' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => checkChats(session.name)}
                      >
                        💬 Ver Chats
                      </Button>
                    )}
                    {session.status === 'SCAN_QR_CODE' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => fetchQRCode(session.name)}
                      >
                        📱 QR Code
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => deleteSession(session.name)}
                    >
                      🗑️ Deletar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Log */}
      <Card>
        <CardHeader>
          <CardTitle>Log</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-muted rounded-lg p-4 max-h-96 overflow-y-auto font-mono text-sm">
            {logs.length === 0 ? (
              <p className="text-muted-foreground">Nenhum log ainda...</p>
            ) : (
              logs.map((entry, i) => (
                <div
                  key={i}
                  className={`mb-2 ${
                    entry.type === 'success' ? 'text-green-600' :
                    entry.type === 'error' ? 'text-red-600' :
                    'text-foreground'
                  }`}
                >
                  <span className="text-muted-foreground">[{entry.time}]</span>{' '}
                  {entry.message}
                  {entry.data && (
                    <pre className="ml-4 text-xs opacity-80 overflow-x-auto">
                      {JSON.stringify(entry.data, null, 2)}
                    </pre>
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
