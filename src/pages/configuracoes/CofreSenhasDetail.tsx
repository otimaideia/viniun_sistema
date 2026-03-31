import { useState, useCallback, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { usePasswordVaultEntryMT } from "@/hooks/multitenant/usePasswordVaultMT";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { VAULT_CATEGORIES } from "@/types/password-vault";
import { copyToClipboard } from "@/lib/password-generator";
import { getStrengthInfo } from "@/lib/password-generator";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  Copy,
  Pencil,
  Trash2,
  Star,
  StarOff,
  ExternalLink,
  Folder,
  Clock,
  AlertTriangle,
  Shield,
  Users,
  History,
  KeyRound,
} from "lucide-react";
import { toast } from "sonner";

const CofreSenhasDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { entry, accessLog, shares, history, isLoading, refetch } = usePasswordVaultEntryMT(id);
  const { session } = useAuth();

  const [revealedValue, setRevealedValue] = useState<string | null>(null);
  const [isRevealing, setIsRevealing] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [autoHideTimer, setAutoHideTimer] = useState<number | null>(null);

  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://supabase.viniun.com.br';

  // Lightweight vault operations (avoid loading all entries)
  const revealValue = useCallback(async (entryId: string): Promise<string> => {
    if (!session?.access_token) throw new Error('Nao autenticado');
    const res = await fetch(`${SUPABASE_URL}/functions/v1/vault-api/decrypt`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || '',
      },
      body: JSON.stringify({ entryId }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao revelar');
    return data.value as string;
  }, [SUPABASE_URL, session]);

  const toggleFavorite = useCallback(async (entryId: string) => {
    if (!entry) return;
    await supabase
      .from('mt_password_vault')
      .update({ is_favorite: !entry.is_favorite })
      .eq('id', entryId);
    refetch();
  }, [entry, refetch]);

  const deleteEntry = useCallback(async (entryId: string) => {
    await supabase
      .from('mt_password_vault')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', entryId);
    toast.success('Credencial removida');
  }, []);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (autoHideTimer) clearTimeout(autoHideTimer);
    };
  }, [autoHideTimer]);

  const handleReveal = useCallback(async () => {
    if (revealedValue) {
      setRevealedValue(null);
      if (autoHideTimer) clearTimeout(autoHideTimer);
      return;
    }

    if (!id) return;
    setIsRevealing(true);
    try {
      const value = await revealValue(id);
      setRevealedValue(value);

      // Auto-hide after 30 seconds
      const timer = window.setTimeout(() => {
        setRevealedValue(null);
      }, 30_000);
      setAutoHideTimer(timer);
    } catch {
      // Error handled by hook
    } finally {
      setIsRevealing(false);
    }
  }, [id, revealedValue, revealValue, autoHideTimer]);

  const handleCopy = useCallback(async () => {
    if (!id) return;
    try {
      let value = revealedValue;
      if (!value) {
        value = await revealValue(id);
      }
      await copyToClipboard(value);
      toast.success("Copiado! Limpo da area de transferencia em 30s");
    } catch {
      // Error handled
    }
  }, [id, revealedValue, revealValue]);

  const handleCopyUsername = useCallback(async () => {
    if (!entry?.username) return;
    await copyToClipboard(entry.username, 0); // Don't auto-clear username
    toast.success("Usuario copiado");
  }, [entry]);

  const handleDelete = async () => {
    if (!id) return;
    await deleteEntry(id);
    navigate("/configuracoes/cofre-senhas");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  if (!entry) {
    return (
      <div className="text-center py-12">
        <KeyRound className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
        <p className="text-muted-foreground">Credencial nao encontrada</p>
        <Button asChild className="mt-4" variant="outline">
          <Link to="/configuracoes/cofre-senhas">Voltar ao cofre</Link>
        </Button>
      </div>
    );
  }

  const catInfo = VAULT_CATEGORIES[entry.categoria];
  const isExpired = entry.expires_at && new Date(entry.expires_at) < new Date();
  const strengthInfo = entry.strength_score != null ? getStrengthInfo(entry.strength_score) : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/configuracoes/cofre-senhas")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              {entry.nome}
              <button onClick={() => id && toggleFavorite(id)}>
                {entry.is_favorite ? (
                  <Star className="h-5 w-5 fill-yellow-500 text-yellow-500" />
                ) : (
                  <StarOff className="h-5 w-5 text-muted-foreground hover:text-yellow-500" />
                )}
              </button>
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" style={{ borderColor: catInfo.color, color: catInfo.color }}>
                {catInfo.label}
              </Badge>
              {entry.folder && (
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <Folder className="h-3 w-3" style={{ color: entry.folder.cor }} />
                  {entry.folder.nome}
                </span>
              )}
              {entry.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link to={`/configuracoes/cofre-senhas/${id}/editar`}>
              <Pencil className="h-4 w-4 mr-2" /> Editar
            </Link>
          </Button>
          <Button variant="destructive" onClick={() => setShowDeleteDialog(true)}>
            <Trash2 className="h-4 w-4 mr-2" /> Excluir
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Credentials Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <KeyRound className="h-5 w-5" /> Credenciais
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Username */}
            {entry.username && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Usuario</label>
                <div className="flex items-center gap-2 mt-1">
                  <code className="bg-muted px-3 py-1.5 rounded text-sm font-mono flex-1">
                    {entry.username}
                  </code>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleCopyUsername}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Password / Value */}
            <div>
              <label className="text-sm font-medium text-muted-foreground">Valor / Senha</label>
              <div className="flex items-center gap-2 mt-1">
                <code className="bg-muted px-3 py-1.5 rounded text-sm font-mono flex-1 break-all">
                  {revealedValue || entry.value_preview || "••••••••••••"}
                </code>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={handleReveal}
                  disabled={isRevealing}
                >
                  {revealedValue ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleCopy}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              {revealedValue && (
                <p className="text-xs text-muted-foreground mt-1">
                  Valor visivel por 30 segundos
                </p>
              )}
            </div>

            {/* Strength */}
            {strengthInfo && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Forca</label>
                <div className="mt-1">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-muted rounded-full h-2">
                      <div
                        className="h-2 rounded-full transition-all"
                        style={{
                          width: `${strengthInfo.score}%`,
                          backgroundColor: strengthInfo.color,
                        }}
                      />
                    </div>
                    <span className={`text-sm font-medium ${strengthInfo.textColor}`}>
                      {strengthInfo.label} ({strengthInfo.score}%)
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* URL */}
            {entry.url && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">URL</label>
                <div className="mt-1">
                  <a
                    href={entry.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                  >
                    {entry.url}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Metadata Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5" /> Informacoes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {entry.descricao && (
              <div>
                <label className="font-medium text-muted-foreground">Descricao</label>
                <p className="mt-1">{entry.descricao}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-medium text-muted-foreground">Criado em</label>
                <p>{new Date(entry.created_at).toLocaleString("pt-BR")}</p>
              </div>
              <div>
                <label className="font-medium text-muted-foreground">Atualizado em</label>
                <p>{new Date(entry.updated_at).toLocaleString("pt-BR")}</p>
              </div>
              <div>
                <label className="font-medium text-muted-foreground">Acessos</label>
                <p>{entry.access_count}x</p>
              </div>
              {entry.last_accessed_at && (
                <div>
                  <label className="font-medium text-muted-foreground">Ultimo acesso</label>
                  <p>{new Date(entry.last_accessed_at).toLocaleString("pt-BR")}</p>
                </div>
              )}
            </div>

            {/* Expiration */}
            {entry.expires_at && (
              <div className={`p-3 rounded-lg ${isExpired ? "bg-red-50 border border-red-200" : "bg-orange-50 border border-orange-200"}`}>
                <div className="flex items-center gap-2">
                  <AlertTriangle className={`h-4 w-4 ${isExpired ? "text-red-500" : "text-orange-500"}`} />
                  <span className={`font-medium ${isExpired ? "text-red-700" : "text-orange-700"}`}>
                    {isExpired ? "Expirado em" : "Expira em"}{" "}
                    {new Date(entry.expires_at).toLocaleDateString("pt-BR")}
                  </span>
                </div>
                {entry.rotation_days && (
                  <p className="text-xs mt-1 text-muted-foreground">
                    Rotacao recomendada a cada {entry.rotation_days} dias
                  </p>
                )}
              </div>
            )}

            {/* Notes */}
            {entry.notas && (
              <div>
                <label className="font-medium text-muted-foreground">Notas</label>
                <p className="mt-1 whitespace-pre-wrap bg-muted p-3 rounded">{entry.notas}</p>
              </div>
            )}

            {/* Extra fields */}
            {entry.campos_extras && Object.keys(entry.campos_extras).length > 0 && (
              <div>
                <label className="font-medium text-muted-foreground">Campos extras</label>
                <div className="mt-1 space-y-1">
                  {Object.entries(entry.campos_extras).map(([key, value]) => (
                    <div key={key} className="flex justify-between bg-muted px-3 py-1.5 rounded">
                      <span className="font-medium">{key}</span>
                      <span className="text-muted-foreground">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sharing Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5" /> Compartilhamento
            </CardTitle>
            <CardDescription>
              {shares.length === 0
                ? "Nao compartilhado com ninguem"
                : `Compartilhado com ${shares.length} usuario(s)`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {shares.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuario</TableHead>
                    <TableHead>Permissao</TableHead>
                    <TableHead>Desde</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shares.map((share) => (
                    <TableRow key={share.id}>
                      <TableCell>{share.shared_with_user_id}</TableCell>
                      <TableCell>
                        <Badge variant={share.permission === "edit" ? "default" : "secondary"}>
                          {share.permission === "edit" ? "Editar" : "Visualizar"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(share.created_at).toLocaleDateString("pt-BR")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum compartilhamento ativo
              </p>
            )}
          </CardContent>
        </Card>

        {/* Audit Log Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="h-5 w-5" /> Log de Acesso
            </CardTitle>
            <CardDescription>Ultimas 50 acoes registradas</CardDescription>
          </CardHeader>
          <CardContent>
            {accessLog.length > 0 ? (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {accessLog.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between py-1.5 px-2 rounded text-sm hover:bg-muted"
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {log.action}
                      </Badge>
                      <span className="text-muted-foreground">{log.user_id.slice(0, 8)}...</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(log.created_at).toLocaleString("pt-BR")}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum acesso registrado
              </p>
            )}
          </CardContent>
        </Card>

        {/* History Card */}
        {history.length > 0 && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <History className="h-5 w-5" /> Historico de Alteracoes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {history.map((h) => (
                  <div key={h.id} className="flex items-start gap-3 py-2 border-b last:border-0">
                    <div className="h-2 w-2 rounded-full bg-blue-500 mt-2 shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm">
                        Campos alterados:{" "}
                        <span className="font-medium">{h.changed_fields.join(", ")}</span>
                      </p>
                      {h.change_reason && (
                        <p className="text-xs text-muted-foreground mt-0.5">{h.change_reason}</p>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {new Date(h.created_at).toLocaleString("pt-BR")}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir "{entry.nome}"?</AlertDialogTitle>
            <AlertDialogDescription>
              A credencial sera marcada como removida e pode ser recuperada pelo administrador.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CofreSenhasDetail;
