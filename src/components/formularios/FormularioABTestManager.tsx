// Componente para gerenciar A/B Tests de formulários

import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import {
  FlaskConical,
  Plus,
  Play,
  Pause,
  StopCircle,
  Trash2,
  Trophy,
  TrendingUp,
  Clock,
  BarChart3,
  Percent,
  Copy,
  AlertTriangle,
} from 'lucide-react';
import { useFormularioABTestAdapter } from '@/hooks/useFormularioABTestAdapter';
import { useFormulariosAdapter } from '@/hooks/useFormulariosAdapter';
import { useToast } from '@/hooks/use-toast';
import { FormularioABTest, FormularioABVariante } from '@/types/formulario';

interface FormularioABTestManagerProps {
  formularioId: string;
  formularioNome: string;
}

const STATUS_COLORS: Record<string, string> = {
  rascunho: 'bg-gray-500',
  ativo: 'bg-green-500',
  pausado: 'bg-yellow-500',
  finalizado: 'bg-blue-500',
};

const STATUS_LABELS: Record<string, string> = {
  rascunho: 'Rascunho',
  ativo: 'Ativo',
  pausado: 'Pausado',
  finalizado: 'Finalizado',
};

export const FormularioABTestManager: React.FC<FormularioABTestManagerProps> = ({
  formularioId,
  formularioNome,
}) => {
  const { toast } = useToast();
  const { duplicateFormulario } = useFormulariosAdapter();
  const {
    tests,
    testStats,
    loading,
    createTest,
    addVariante,
    removeVariante,
    startTest,
    pauseTest,
    finishTest,
    deleteTest,
  } = useFormularioABTestAdapter({ formularioId });

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [addVarianteDialogOpen, setAddVarianteDialogOpen] = useState(false);
  const [selectedTest, setSelectedTest] = useState<FormularioABTest | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [testToDelete, setTestToDelete] = useState<string | null>(null);

  // Form state para criar teste
  const [newTestData, setNewTestData] = useState({
    nome: '',
    descricao: '',
    metrica_principal: 'conversion_rate' as const,
    duracao_dias: 14,
    min_submissoes: 100,
  });

  // Form state para adicionar variante
  const [newVarianteData, setNewVarianteData] = useState({
    nome: '',
    peso: 50,
  });

  const handleCreateTest = async () => {
    if (!newTestData.nome) {
      toast({
        title: 'Erro',
        description: 'Nome do teste é obrigatório',
        variant: 'destructive',
      });
      return;
    }

    try {
      const test = await createTest(newTestData);
      if (test) {
        toast({
          title: 'Teste criado',
          description: 'O teste A/B foi criado com sucesso.',
        });
        setCreateDialogOpen(false);
        setNewTestData({
          nome: '',
          descricao: '',
          metrica_principal: 'conversion_rate',
          duracao_dias: 14,
          min_submissoes: 100,
        });
      }
    } catch (err) {
      toast({
        title: 'Erro ao criar teste',
        description: 'Não foi possível criar o teste A/B.',
        variant: 'destructive',
      });
    }
  };

  const handleAddVariante = async () => {
    if (!selectedTest || !newVarianteData.nome) {
      toast({
        title: 'Erro',
        description: 'Nome da variante é obrigatório',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Duplicar o formulário original
      const duplicatedFormulario = await duplicateFormulario(
        formularioId,
        `${formularioNome} - ${newVarianteData.nome}`
      );

      if (!duplicatedFormulario) {
        throw new Error('Falha ao duplicar formulário');
      }

      // Adicionar como variante
      const success = await addVariante(selectedTest.id, {
        formularioId: duplicatedFormulario.id,
        nome: newVarianteData.nome,
        peso: newVarianteData.peso,
      });

      if (success) {
        toast({
          title: 'Variante adicionada',
          description: `Variante "${newVarianteData.nome}" criada com sucesso.`,
        });
        setAddVarianteDialogOpen(false);
        setNewVarianteData({ nome: '', peso: 50 });
      }
    } catch (err) {
      toast({
        title: 'Erro ao adicionar variante',
        description: 'Não foi possível criar a variante.',
        variant: 'destructive',
      });
    }
  };

  const handleStartTest = async (testId: string) => {
    const success = await startTest(testId);
    if (success) {
      toast({
        title: 'Teste iniciado',
        description: 'O teste A/B foi iniciado e está coletando dados.',
      });
    }
  };

  const handlePauseTest = async (testId: string) => {
    const success = await pauseTest(testId);
    if (success) {
      toast({
        title: 'Teste pausado',
        description: 'O teste A/B foi pausado.',
      });
    }
  };

  const handleFinishTest = async (testId: string) => {
    // Encontrar vencedor baseado nas estatísticas
    const stats = testStats.filter((s) => s.variante_id);
    const vencedor = stats.reduce((best, current) =>
      current.conversion_rate > best.conversion_rate ? current : best
    , stats[0]);

    const success = await finishTest(testId, vencedor?.variante_id);
    if (success) {
      toast({
        title: 'Teste finalizado',
        description: vencedor
          ? `Vencedor: ${vencedor.variante_nome} com ${vencedor.conversion_rate.toFixed(1)}% de conversão.`
          : 'O teste foi finalizado.',
      });
    }
  };

  const handleDeleteTest = async () => {
    if (!testToDelete) return;

    const success = await deleteTest(testToDelete);
    if (success) {
      toast({
        title: 'Teste excluído',
        description: 'O teste A/B foi excluído com sucesso.',
      });
    }
    setDeleteConfirmOpen(false);
    setTestToDelete(null);
  };

  const getVarianteStats = (varianteId: string) => {
    return testStats.find((s) => s.variante_id === varianteId);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <FlaskConical className="h-5 w-5" />
            Testes A/B
          </h2>
          <p className="text-sm text-muted-foreground">
            Compare diferentes versões do formulário
          </p>
        </div>

        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Novo Teste
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Novo Teste A/B</DialogTitle>
              <DialogDescription>
                Configure um novo teste para comparar variações do formulário
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome do Teste</Label>
                <Input
                  id="nome"
                  value={newTestData.nome}
                  onChange={(e) =>
                    setNewTestData({ ...newTestData, nome: e.target.value })
                  }
                  placeholder="Ex: Teste de cores do botão"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="descricao">Descrição</Label>
                <Textarea
                  id="descricao"
                  value={newTestData.descricao}
                  onChange={(e) =>
                    setNewTestData({ ...newTestData, descricao: e.target.value })
                  }
                  placeholder="Descreva o objetivo do teste..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="metrica">Métrica Principal</Label>
                <Select
                  value={newTestData.metrica_principal}
                  onValueChange={(value) =>
                    setNewTestData({
                      ...newTestData,
                      metrica_principal: value as typeof newTestData.metrica_principal,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="conversion_rate">Taxa de Conversão</SelectItem>
                    <SelectItem value="avg_time">Tempo Médio</SelectItem>
                    <SelectItem value="abandonment_rate">Taxa de Abandono</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="duracao">Duração (dias)</Label>
                  <Input
                    id="duracao"
                    type="number"
                    value={newTestData.duracao_dias}
                    onChange={(e) =>
                      setNewTestData({
                        ...newTestData,
                        duracao_dias: parseInt(e.target.value) || 14,
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="min_submissoes">Mín. Submissões</Label>
                  <Input
                    id="min_submissoes"
                    type="number"
                    value={newTestData.min_submissoes}
                    onChange={(e) =>
                      setNewTestData({
                        ...newTestData,
                        min_submissoes: parseInt(e.target.value) || 100,
                      })
                    }
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreateTest}>Criar Teste</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Lista de Testes */}
      {tests.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FlaskConical className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-medium mb-2">Nenhum teste A/B</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Crie um teste para comparar diferentes versões do formulário
            </p>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Criar Primeiro Teste
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {tests.map((test) => {
            const variantes = (test.variantes || []) as FormularioABVariante[];
            const totalWeight = variantes.reduce((sum, v) => sum + v.peso, 0);

            return (
              <Card key={test.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CardTitle className="text-base">{test.nome}</CardTitle>
                      <Badge className={STATUS_COLORS[test.status]}>
                        {STATUS_LABELS[test.status]}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2">
                      {test.status === 'rascunho' && variantes.length >= 2 && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleStartTest(test.id)}
                        >
                          <Play className="h-4 w-4 mr-1" />
                          Iniciar
                        </Button>
                      )}

                      {test.status === 'ativo' && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handlePauseTest(test.id)}
                          >
                            <Pause className="h-4 w-4 mr-1" />
                            Pausar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleFinishTest(test.id)}
                          >
                            <StopCircle className="h-4 w-4 mr-1" />
                            Finalizar
                          </Button>
                        </>
                      )}

                      {test.status === 'pausado' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleStartTest(test.id)}
                        >
                          <Play className="h-4 w-4 mr-1" />
                          Retomar
                        </Button>
                      )}

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setTestToDelete(test.id);
                          setDeleteConfirmOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {test.descricao && (
                    <CardDescription>{test.descricao}</CardDescription>
                  )}
                </CardHeader>

                <CardContent>
                  {/* Variantes */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium">Variantes</h4>
                      {test.status === 'rascunho' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedTest(test);
                            setAddVarianteDialogOpen(true);
                          }}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Adicionar Variante
                        </Button>
                      )}
                    </div>

                    {variantes.length === 0 ? (
                      <div className="p-4 bg-muted rounded-lg text-center text-sm text-muted-foreground">
                        <AlertTriangle className="h-5 w-5 mx-auto mb-2" />
                        Adicione pelo menos 2 variantes para iniciar o teste
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Variante</TableHead>
                            <TableHead>Peso</TableHead>
                            <TableHead>Visualizações</TableHead>
                            <TableHead>Conversão</TableHead>
                            <TableHead>Tempo Médio</TableHead>
                            {test.status !== 'rascunho' && <TableHead>Status</TableHead>}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {variantes.map((variante) => {
                            const stats = getVarianteStats(variante.formulario_id);
                            const isWinner =
                              test.status === 'finalizado' &&
                              test.vencedor_id === variante.formulario_id;

                            return (
                              <TableRow key={variante.id}>
                                <TableCell className="font-medium">
                                  <div className="flex items-center gap-2">
                                    {isWinner && (
                                      <Trophy className="h-4 w-4 text-yellow-500" />
                                    )}
                                    {variante.nome}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <Progress
                                      value={(variante.peso / Math.max(totalWeight, 100)) * 100}
                                      className="w-16 h-2"
                                    />
                                    <span className="text-sm">{variante.peso}%</span>
                                  </div>
                                </TableCell>
                                <TableCell>{stats?.views || 0}</TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1">
                                    {stats && stats.conversion_rate > 0 ? (
                                      <>
                                        <Percent className="h-3 w-3" />
                                        {stats.conversion_rate.toFixed(1)}%
                                      </>
                                    ) : (
                                      '-'
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  {stats && stats.avg_time_seconds > 0 ? (
                                    <div className="flex items-center gap-1">
                                      <Clock className="h-3 w-3" />
                                      {Math.round(stats.avg_time_seconds)}s
                                    </div>
                                  ) : (
                                    '-'
                                  )}
                                </TableCell>
                                {test.status !== 'rascunho' && (
                                  <TableCell>
                                    {isWinner ? (
                                      <Badge className="bg-green-500">Vencedor</Badge>
                                    ) : test.status === 'finalizado' ? (
                                      <Badge variant="outline">-</Badge>
                                    ) : (
                                      <Badge variant="outline">Em teste</Badge>
                                    )}
                                  </TableCell>
                                )}
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    )}
                  </div>

                  {/* Métricas resumo */}
                  {test.status !== 'rascunho' && variantes.length > 0 && (
                    <div className="mt-4 pt-4 border-t">
                      <div className="grid gap-4 md:grid-cols-3">
                        <div className="p-3 bg-muted rounded-lg">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <BarChart3 className="h-4 w-4" />
                            Total de Visualizações
                          </div>
                          <p className="text-xl font-bold mt-1">
                            {testStats.reduce((sum, s) => sum + s.views, 0)}
                          </p>
                        </div>
                        <div className="p-3 bg-muted rounded-lg">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <TrendingUp className="h-4 w-4" />
                            Melhor Conversão
                          </div>
                          <p className="text-xl font-bold mt-1">
                            {Math.max(...testStats.map((s) => s.conversion_rate), 0).toFixed(1)}%
                          </p>
                        </div>
                        <div className="p-3 bg-muted rounded-lg">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            Métrica Principal
                          </div>
                          <p className="text-xl font-bold mt-1 capitalize">
                            {test.metrica_principal.replace('_', ' ')}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Dialog para adicionar variante */}
      <Dialog open={addVarianteDialogOpen} onOpenChange={setAddVarianteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Variante</DialogTitle>
            <DialogDescription>
              Uma cópia do formulário será criada para você editar
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="variante-nome">Nome da Variante</Label>
              <Input
                id="variante-nome"
                value={newVarianteData.nome}
                onChange={(e) =>
                  setNewVarianteData({ ...newVarianteData, nome: e.target.value })
                }
                placeholder="Ex: Variante B, Botão Verde, etc."
              />
            </div>

            <div className="space-y-2">
              <Label>Peso do Tráfego: {newVarianteData.peso}%</Label>
              <Slider
                value={[newVarianteData.peso]}
                onValueChange={(value) =>
                  setNewVarianteData({ ...newVarianteData, peso: value[0] })
                }
                max={100}
                step={5}
              />
              <p className="text-xs text-muted-foreground">
                Porcentagem do tráfego que será direcionada para esta variante
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddVarianteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddVariante}>
              <Copy className="h-4 w-4 mr-2" />
              Criar Variante
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmação de exclusão */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Teste A/B?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Os dados do teste serão perdidos, mas as
              variantes (formulários) não serão excluídas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTest}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default FormularioABTestManager;
