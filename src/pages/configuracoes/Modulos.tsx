import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Lock,
  Info,
  Settings,
  Building,
  Loader2,
  RefreshCw,
} from "lucide-react";
import * as LucideIcons from "lucide-react";
import { toast } from "sonner";
import { useFranqueadosAdapter } from "@/hooks/useFranqueadosAdapter";
import { useModulosAdapter } from "@/hooks/useModulosAdapter";
import type { FranqueadoModulo } from "@/types/modulo";

const Modulos = () => {
  const { franqueados } = useFranqueadosAdapter();
  const { modulos, loading, error, toggleModulo, fetchFranqueadoModulos, refetch } = useModulosAdapter();
  const [selectedFranqueado, setSelectedFranqueado] = useState<string>("");
  const [franqueadoModulos, setFranqueadoModulos] = useState<FranqueadoModulo[]>([]);
  const [loadingFranqueado, setLoadingFranqueado] = useState(false);
  const [savingModulo, setSavingModulo] = useState<string | null>(null);

  // Carregar módulos da franquia selecionada
  useEffect(() => {
    const loadFranqueadoModulos = async () => {
      if (!selectedFranqueado) {
        setFranqueadoModulos([]);
        return;
      }

      setLoadingFranqueado(true);
      try {
        const data = await fetchFranqueadoModulos(selectedFranqueado);
        setFranqueadoModulos(data);
      } catch (err) {
        console.error("Erro ao carregar módulos da franquia:", err);
        toast.error("Erro ao carregar módulos da franquia");
      } finally {
        setLoadingFranqueado(false);
      }
    };

    loadFranqueadoModulos();
  }, [selectedFranqueado, fetchFranqueadoModulos]);

  // Verificar se módulo está ativo para franquia selecionada
  const isModuloAtivo = (moduloId: string): boolean => {
    const fm = franqueadoModulos.find(m => m.modulo_id === moduloId);
    return fm?.is_active ?? false;
  };

  // Alternar módulo
  const handleModuleToggle = async (moduloId: string, enabled: boolean) => {
    if (!selectedFranqueado) {
      toast.error("Selecione uma franquia primeiro");
      return;
    }

    const modulo = modulos.find(m => m.id === moduloId);
    if (modulo?.is_core) {
      toast.error("Módulos core não podem ser desativados");
      return;
    }

    setSavingModulo(moduloId);
    try {
      const { error } = await toggleModulo(selectedFranqueado, moduloId, enabled);
      if (error) throw error;

      // Atualizar estado local
      const existingIndex = franqueadoModulos.findIndex(m => m.modulo_id === moduloId);
      if (existingIndex >= 0) {
        setFranqueadoModulos(prev =>
          prev.map((m, i) => i === existingIndex ? { ...m, is_active: enabled } : m)
        );
      } else {
        // Adicionar novo registro
        setFranqueadoModulos(prev => [...prev, {
          id: crypto.randomUUID(),
          franqueado_id: selectedFranqueado,
          modulo_id: moduloId,
          is_active: enabled,
          modulo: modulo,
        } as FranqueadoModulo]);
      }

      toast.success(enabled ? "Módulo ativado!" : "Módulo desativado!");
    } catch (err) {
      console.error("Erro ao alterar módulo:", err);
      toast.error("Erro ao alterar módulo");
    } finally {
      setSavingModulo(null);
    }
  };

  // Obter ícone do módulo
  const getModuleIcon = (iconeName: string) => {
    const IconComponent = (LucideIcons as Record<string, React.ComponentType<{ className?: string }>>)[iconeName];
    return IconComponent || LucideIcons.Puzzle;
  };

  // Estatísticas
  const stats = useMemo(() => {
    const activeCount = franqueadoModulos.filter(m => m.is_active).length;
    return {
      total: modulos.length,
      ativos: activeCount,
      inativos: modulos.length - activeCount,
    };
  }, [modulos, franqueadoModulos]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link to="/configuracoes">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Módulos</h1>
            <p className="text-muted-foreground">Carregando...</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-12 mt-2" />
              </CardHeader>
            </Card>
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Skeleton key={i} className="h-32 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link to="/configuracoes">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Módulos</h1>
            <p className="text-destructive">{error}</p>
          </div>
        </div>
        <Button onClick={refetch}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Tentar novamente
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/configuracoes">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Módulos</h1>
            <p className="text-muted-foreground">
              Ative ou desative módulos por franquia
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={refetch}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total de Módulos</CardDescription>
            <CardTitle className="text-2xl">{stats.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Módulos Ativos</CardDescription>
            <CardTitle className="text-2xl text-green-600">
              {selectedFranqueado ? stats.ativos : "-"}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Módulos Inativos</CardDescription>
            <CardTitle className="text-2xl text-muted-foreground">
              {selectedFranqueado ? stats.inativos : "-"}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Franquia Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Selecionar Franquia
          </CardTitle>
          <CardDescription>
            Escolha a franquia para configurar seus módulos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Select value={selectedFranqueado} onValueChange={setSelectedFranqueado}>
              <SelectTrigger className="w-80">
                <SelectValue placeholder="Selecione uma franquia" />
              </SelectTrigger>
              <SelectContent>
                {franqueados?.map((franqueado) => (
                  <SelectItem key={franqueado.id} value={franqueado.id}>
                    <div className="flex items-center gap-2">
                      <Building className="h-4 w-4" />
                      {franqueado.nome}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {loadingFranqueado && (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            )}
          </div>
          {!selectedFranqueado && (
            <p className="text-sm text-amber-600 mt-2">
              Selecione uma franquia para configurar seus módulos
            </p>
          )}
        </CardContent>
      </Card>

      {/* Modules Grid */}
      {selectedFranqueado && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {modulos.map((modulo) => {
            const Icon = getModuleIcon(modulo.icone);
            const isEnabled = isModuloAtivo(modulo.id);
            const isSaving = savingModulo === modulo.id;

            return (
              <Card
                key={modulo.id}
                className={`relative transition-all ${
                  isEnabled ? "border-primary/50" : "opacity-70"
                }`}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2 rounded-lg ${
                          isEnabled ? "bg-primary/10" : "bg-muted"
                        }`}
                      >
                        <Icon
                          className={`h-6 w-6 ${
                            isEnabled ? "text-primary" : "text-muted-foreground"
                          }`}
                        />
                      </div>
                      <div>
                        <CardTitle className="text-base flex items-center gap-2">
                          {modulo.nome}
                          {modulo.is_core && (
                            <Badge variant="outline" className="text-xs">
                              <Lock className="h-3 w-3 mr-1" />
                              Core
                            </Badge>
                          )}
                        </CardTitle>
                        <Badge variant="secondary" className="text-xs mt-1">
                          {modulo.categoria}
                        </Badge>
                      </div>
                    </div>
                    {isSaving ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Switch
                        checked={isEnabled}
                        onCheckedChange={(checked) =>
                          handleModuleToggle(modulo.id, checked)
                        }
                        disabled={modulo.is_core || !selectedFranqueado}
                      />
                    )}
                  </div>
                  <CardDescription className="mt-2">
                    {modulo.descricao || "Sem descrição"}
                  </CardDescription>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {selectedFranqueado && modulos.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Nenhum módulo cadastrado no sistema.
          </CardContent>
        </Card>
      )}

      {/* Info Card */}
      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium">Sobre os Módulos</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>
                  • Módulos <Badge variant="outline" className="text-xs mx-1"><Lock className="h-3 w-3 mr-1" />Core</Badge> são essenciais e não podem ser desativados
                </li>
                <li>
                  • Desativar um módulo oculta todas as funcionalidades relacionadas para a franquia
                </li>
                <li>
                  • As alterações são salvas automaticamente ao clicar no switch
                </li>
                <li>
                  • Cada franquia pode ter uma configuração diferente de módulos
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Modulos;
