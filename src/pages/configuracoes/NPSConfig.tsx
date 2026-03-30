import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Star,
  Plus,
  Pencil,
  Trash2,
  BarChart3,
  RefreshCw,
  Loader2,
  Save,
} from "lucide-react";
import { toast } from "sonner";
import { useNPSSurveysMT, type NPSSurvey } from "@/hooks/multitenant/useNPSMT";

const TRIGGER_LABELS: Record<string, string> = {
  manual: 'Manual',
  pos_sessao: 'Pos Sessao',
  pos_avaliacao: 'Pos Avaliacao',
  periodico: 'Periodico',
};

interface SurveyFormState {
  nome: string;
  descricao: string;
  is_active: boolean;
  trigger_type: string;
  delay_hours: number;
  google_review_url: string;
  avaliar_profissional: boolean;
  avaliar_consultora: boolean;
  avaliar_experiencia: boolean;
  mensagem_agradecimento: string;
}

const defaultForm: SurveyFormState = {
  nome: '',
  descricao: '',
  is_active: true,
  trigger_type: 'manual',
  delay_hours: 24,
  google_review_url: '',
  avaliar_profissional: true,
  avaliar_consultora: false,
  avaliar_experiencia: true,
  mensagem_agradecimento: 'Obrigado pela sua avaliacao! Sua opiniao e muito importante para nos.',
};

export default function NPSConfig() {
  const { surveys, isLoading, createSurvey, updateSurvey, deleteSurvey, toggleActive, refetch } = useNPSSurveysMT();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSurvey, setEditingSurvey] = useState<NPSSurvey | null>(null);
  const [form, setForm] = useState<SurveyFormState>(defaultForm);
  const [isSaving, setIsSaving] = useState(false);

  const openCreate = () => {
    setEditingSurvey(null);
    setForm(defaultForm);
    setIsDialogOpen(true);
  };

  const openEdit = (survey: NPSSurvey) => {
    setEditingSurvey(survey);
    setForm({
      nome: survey.nome || '',
      descricao: survey.descricao || '',
      is_active: survey.is_active,
      trigger_type: survey.trigger_type || 'manual',
      delay_hours: survey.delay_hours || 24,
      google_review_url: survey.google_review_url || '',
      avaliar_profissional: survey.avaliar_profissional,
      avaliar_consultora: survey.avaliar_consultora,
      avaliar_experiencia: survey.avaliar_experiencia,
      mensagem_agradecimento: survey.mensagem_agradecimento || '',
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.nome.trim()) {
      toast.error('Nome e obrigatorio');
      return;
    }

    setIsSaving(true);
    try {
      if (editingSurvey) {
        await updateSurvey(editingSurvey.id, form as any);
        toast.success('Pesquisa NPS atualizada');
      } else {
        await createSurvey(form as any);
        toast.success('Pesquisa NPS criada');
      }
      setIsDialogOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteSurvey(id);
      toast.success('Pesquisa removida');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao remover');
    }
  };

  const handleToggle = async (id: string, active: boolean) => {
    try {
      await toggleActive(id, active);
      toast.success(active ? 'Pesquisa ativada' : 'Pesquisa desativada');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao alterar status');
    }
  };

  return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Star className="h-6 w-6 text-primary" />
              Configuracao NPS
            </h1>
            <p className="text-muted-foreground">
              Gerencie pesquisas de satisfacao e Net Promoter Score
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Pesquisa
            </Button>
          </div>
        </div>

        {/* Surveys List */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-32 w-full rounded-lg" />
            ))}
          </div>
        ) : surveys.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Star className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="font-medium text-muted-foreground">Nenhuma pesquisa NPS configurada</p>
              <p className="text-sm text-muted-foreground mt-1">Crie uma pesquisa para comecar a coletar feedback</p>
              <Button className="mt-4" onClick={openCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Criar Pesquisa
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {surveys.map((survey) => (
              <Card key={survey.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-base">{survey.nome}</h3>
                        <Badge variant={survey.is_active ? "default" : "secondary"}>
                          {survey.is_active ? 'Ativa' : 'Inativa'}
                        </Badge>
                        <Badge variant="outline">
                          {TRIGGER_LABELS[survey.trigger_type] || survey.trigger_type}
                        </Badge>
                      </div>
                      {survey.descricao && (
                        <p className="text-sm text-muted-foreground">{survey.descricao}</p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>Delay: {survey.delay_hours}h</span>
                        {survey.avaliar_profissional && <span>Profissional</span>}
                        {survey.avaliar_consultora && <span>Consultora</span>}
                        {survey.avaliar_experiencia && <span>Experiencia</span>}
                        {survey.google_review_url && <span>Google Review</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={survey.is_active}
                        onCheckedChange={(checked) => handleToggle(survey.id, checked)}
                      />
                      <Button variant="ghost" size="icon" onClick={() => openEdit(survey)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remover pesquisa</AlertDialogTitle>
                            <AlertDialogDescription>
                              Tem certeza que deseja remover "{survey.nome}"? As respostas existentes serao mantidas.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(survey.id)}>
                              Remover
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Create/Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingSurvey ? 'Editar Pesquisa NPS' : 'Nova Pesquisa NPS'}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nome *</Label>
                <Input
                  value={form.nome}
                  onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                  placeholder="Ex: Pesquisa Pos-Sessao"
                />
              </div>

              <div className="space-y-2">
                <Label>Descricao</Label>
                <Textarea
                  value={form.descricao}
                  onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
                  placeholder="Descricao da pesquisa..."
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Disparo</Label>
                  <Select
                    value={form.trigger_type}
                    onValueChange={(v) => setForm((f) => ({ ...f, trigger_type: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">Manual</SelectItem>
                      <SelectItem value="pos_sessao">Pos Sessao</SelectItem>
                      <SelectItem value="pos_avaliacao">Pos Avaliacao</SelectItem>
                      <SelectItem value="periodico">Periodico</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Delay (horas)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={form.delay_hours}
                    onChange={(e) => setForm((f) => ({ ...f, delay_hours: parseInt(e.target.value) || 0 }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>URL Google Review</Label>
                <Input
                  value={form.google_review_url}
                  onChange={(e) => setForm((f) => ({ ...f, google_review_url: e.target.value }))}
                  placeholder="https://g.page/r/..."
                />
                <p className="text-xs text-muted-foreground">
                  Se preenchido, promotores (9-10) serao convidados a avaliar no Google
                </p>
              </div>

              <div className="space-y-3 pt-2 border-t">
                <h4 className="text-sm font-medium">Avaliacoes Adicionais</h4>
                <div className="flex items-center justify-between">
                  <Label className="cursor-pointer">Avaliar Profissional</Label>
                  <Switch
                    checked={form.avaliar_profissional}
                    onCheckedChange={(v) => setForm((f) => ({ ...f, avaliar_profissional: v }))}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="cursor-pointer">Avaliar Consultora</Label>
                  <Switch
                    checked={form.avaliar_consultora}
                    onCheckedChange={(v) => setForm((f) => ({ ...f, avaliar_consultora: v }))}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="cursor-pointer">Avaliar Experiencia Geral</Label>
                  <Switch
                    checked={form.avaliar_experiencia}
                    onCheckedChange={(v) => setForm((f) => ({ ...f, avaliar_experiencia: v }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Mensagem de Agradecimento</Label>
                <Textarea
                  value={form.mensagem_agradecimento}
                  onChange={(e) => setForm((f) => ({ ...f, mensagem_agradecimento: e.target.value }))}
                  placeholder="Mensagem exibida apos o envio da avaliacao..."
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                {editingSurvey ? 'Salvar' : 'Criar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
  );
}
