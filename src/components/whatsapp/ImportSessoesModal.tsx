import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Download, MessageSquare, Wifi, WifiOff } from "lucide-react";
import type { WAHASessionInfo } from "@/services/waha/wahaDirectClient";
import type { WhatsAppSessaoTipo, WhatsAppSessaoStatus } from "@/types/whatsapp-sessao";
import { SESSAO_TIPO_LABELS } from "@/types/whatsapp-sessao";
import { useFranqueadosAdapter } from "@/hooks/useFranqueadosAdapter";

interface ImportSessoesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessions: WAHASessionInfo[];
  onImport: (sessions: Array<{
    session_name: string;
    nome: string;
    franqueado_id: string;
    tipo: WhatsAppSessaoTipo;
    status: WhatsAppSessaoStatus;
  }>) => void;
  isImporting?: boolean;
}

export function ImportSessoesModal({
  open,
  onOpenChange,
  sessions,
  onImport,
  isImporting,
}: ImportSessoesModalProps) {
  const { franqueados, isLoading: loadingFranqueados } = useFranqueadosAdapter();
  
  const [selectedSessions, setSelectedSessions] = useState<Set<string>>(new Set());
  const [sessionConfigs, setSessionConfigs] = useState<Record<string, {
    franqueado_id: string;
    tipo: WhatsAppSessaoTipo;
  }>>({});

  // Initialize selected sessions when modal opens
  useEffect(() => {
    if (open && sessions.length > 0) {
      const allSelected = new Set(sessions.map(s => s.name));
      setSelectedSessions(allSelected);
      
      // Initialize configs
      const configs: Record<string, { franqueado_id: string; tipo: WhatsAppSessaoTipo }> = {};
      sessions.forEach(s => {
        configs[s.name] = {
          franqueado_id: franqueados[0]?.id || "",
          tipo: "geral",
        };
      });
      setSessionConfigs(configs);
    }
  }, [open, sessions, franqueados]);

  const toggleSession = (name: string) => {
    const next = new Set(selectedSessions);
    if (next.has(name)) {
      next.delete(name);
    } else {
      next.add(name);
    }
    setSelectedSessions(next);
  };

  const updateConfig = (name: string, field: 'franqueado_id' | 'tipo', value: string) => {
    setSessionConfigs(prev => ({
      ...prev,
      [name]: {
        ...prev[name],
        [field]: value,
      },
    }));
  };

  const mapStatus = (wahaStatus: string): WhatsAppSessaoStatus => {
    const statusMap: Record<string, WhatsAppSessaoStatus> = {
      'WORKING': 'working',
      'STOPPED': 'stopped',
      'STARTING': 'starting',
      'SCAN_QR_CODE': 'scan_qr',
      'FAILED': 'failed',
    };
    return statusMap[wahaStatus.toUpperCase()] || 'stopped';
  };

  const handleImport = () => {
    const toImport = sessions
      .filter(s => selectedSessions.has(s.name))
      .map(s => ({
        session_name: s.name,
        nome: s.name, // Use session name as display name
        franqueado_id: sessionConfigs[s.name]?.franqueado_id || "",
        tipo: sessionConfigs[s.name]?.tipo || "geral" as WhatsAppSessaoTipo,
        status: mapStatus(s.status),
      }))
      .filter(s => s.franqueado_id); // Only import if franqueado is selected

    if (toImport.length > 0) {
      onImport(toImport);
    }
  };

  const getStatusBadge = (status: string) => {
    const isWorking = status.toUpperCase() === 'WORKING';
    return (
      <Badge variant={isWorking ? "default" : "secondary"} className="text-xs">
        {isWorking ? <Wifi className="h-3 w-3 mr-1" /> : <WifiOff className="h-3 w-3 mr-1" />}
        {status}
      </Badge>
    );
  };

  if (sessions.length === 0) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Importar Sessões do WAHA
          </DialogTitle>
          <DialogDescription>
            Encontramos {sessions.length} sessão(ões) no WAHA que não estão cadastradas. 
            Selecione quais importar e configure a franquia e categoria.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-4">
          {sessions.map((session) => (
            <div 
              key={session.name}
              className={`p-4 border rounded-lg space-y-3 transition-colors ${
                selectedSessions.has(session.name) ? 'border-primary bg-primary/5' : 'border-border'
              }`}
            >
              <div className="flex items-center gap-3">
                <Checkbox
                  id={`session-${session.name}`}
                  checked={selectedSessions.has(session.name)}
                  onCheckedChange={() => toggleSession(session.name)}
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-green-600" />
                    <span className="font-medium font-mono">{session.name}</span>
                    {getStatusBadge(session.status)}
                  </div>
                  {session.me?.pushName && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Conectado como: {session.me.pushName}
                    </p>
                  )}
                </div>
              </div>

              {selectedSessions.has(session.name) && (
                <div className="grid sm:grid-cols-2 gap-3 pl-7">
                  <div className="space-y-1">
                    <Label className="text-xs">Franquia *</Label>
                    <Select
                      value={sessionConfigs[session.name]?.franqueado_id || ""}
                      onValueChange={(v) => updateConfig(session.name, 'franqueado_id', v)}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder={loadingFranqueados ? "Carregando..." : "Selecione"} />
                      </SelectTrigger>
                      <SelectContent>
                        {franqueados.map((f) => (
                          <SelectItem key={f.id} value={f.id}>
                            {f.nome_fantasia}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Categoria</Label>
                    <Select
                      value={sessionConfigs[session.name]?.tipo || "geral"}
                      onValueChange={(v) => updateConfig(session.name, 'tipo', v)}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.keys(SESSAO_TIPO_LABELS) as WhatsAppSessaoTipo[]).map((tipo) => (
                          <SelectItem key={tipo} value={tipo}>
                            {SESSAO_TIPO_LABELS[tipo]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <DialogFooter className="border-t pt-4">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleImport} 
            disabled={isImporting || selectedSessions.size === 0}
          >
            {isImporting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Importar {selectedSessions.size} sessão(ões)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
