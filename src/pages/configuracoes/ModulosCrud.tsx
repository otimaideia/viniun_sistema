// Página de CRUD de Módulos do Sistema (super_admin only)
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useModulosAdapter } from '@/hooks/useModulosAdapter';
import { useUserRoleAdapter } from '@/hooks/useUserRoleAdapter';
import { LoadingState, EmptyState, DeleteConfirmDialog } from '@/components/shared/index';
import { CATEGORIA_LABELS } from '@/types/modulo';
import type { Modulo } from '@/types/modulo';
import {
  Puzzle,
  Plus,
  Search,
  Lock,
  Pencil,
  Trash2,
  Save,
  ArrowLeft,
} from 'lucide-react';
import { toast } from 'sonner';
import { icons } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

// Lista de ícones disponíveis
const AVAILABLE_ICONS = [
  'Users', 'UserCog', 'Building2', 'Building', 'GitBranch', 'Target',
  'Trophy', 'BarChart3', 'Megaphone', 'MessageCircle', 'FileText',
  'Stethoscope', 'ClipboardCheck', 'Puzzle', 'Settings', 'Briefcase',
  'Calendar', 'Clock', 'CreditCard', 'DollarSign', 'FileCheck',
  'Folder', 'Heart', 'Home', 'Image', 'Mail', 'MapPin', 'Package',
  'Phone', 'PieChart', 'Receipt', 'Shield', 'ShoppingCart', 'Star',
  'Tag', 'Truck', 'Video', 'Wallet', 'Zap', 'Sparkles'
];

interface ModuloFormData {
  codigo: string;
  nome: string;
  descricao: string;
  icone: string;
  categoria: string;
  ordem: number;
  is_core: boolean;
}

const defaultFormData: ModuloFormData = {
  codigo: '',
  nome: '',
  descricao: '',
  icone: 'Puzzle',
  categoria: 'sistema',
  ordem: 0,
  is_core: false,
};

const ModulosCrud = () => {
  const { modulos, loading, refetch } = useModulosAdapter();
  const { role } = useUserRoleAdapter();

  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedModulo, setSelectedModulo] = useState<Modulo | null>(null);
  const [formData, setFormData] = useState<ModuloFormData>(defaultFormData);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Apenas super_admin pode acessar
  if (role !== 'super_admin') {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="p-8 text-center">
          <Lock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Acesso Restrito</h2>
          <p className="text-muted-foreground">
            Apenas Super Administradores podem gerenciar os módulos do sistema.
          </p>
        </Card>
      </div>
    );
  }

  const filteredModulos = modulos.filter(m =>
    m.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.descricao?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getIcon = (iconName: string) => {
    const IconComponent = (icons as any)[iconName];
    return IconComponent ? <IconComponent className="h-5 w-5" /> : <Puzzle className="h-5 w-5" />;
  };

  const openCreateDialog = () => {
    setSelectedModulo(null);
    setFormData({
      ...defaultFormData,
      ordem: modulos.length + 1,
    });
    setDialogOpen(true);
  };

  const openEditDialog = (modulo: Modulo) => {
    setSelectedModulo(modulo);
    setFormData({
      codigo: modulo.codigo,
      nome: modulo.nome,
      descricao: modulo.descricao || '',
      icone: modulo.icone || 'Puzzle',
      categoria: modulo.categoria,
      ordem: modulo.ordem,
      is_core: modulo.is_core,
    });
    setDialogOpen(true);
  };

  const openDeleteDialog = (modulo: Modulo) => {
    setSelectedModulo(modulo);
    setDeleteDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.codigo || !formData.nome) {
      toast.error('Código e Nome são obrigatórios');
      return;
    }

    setSaving(true);
    try {
      if (selectedModulo) {
        // Update
        const { error } = await supabase
          .from('mt_modules')
          .update({
            nome: formData.nome,
            descricao: formData.descricao,
            icone: formData.icone,
            categoria: formData.categoria,
            ordem: formData.ordem,
            is_core: formData.is_core,
          })
          .eq('id', selectedModulo.id);

        if (error) throw error;
        toast.success('Módulo atualizado com sucesso');
      } else {
        // Create
        const { error } = await supabase
          .from('mt_modules')
          .insert({
            codigo: formData.codigo,
            nome: formData.nome,
            descricao: formData.descricao,
            icone: formData.icone,
            categoria: formData.categoria,
            ordem: formData.ordem,
            is_core: formData.is_core,
          });

        if (error) throw error;
        toast.success('Módulo criado com sucesso');
      }

      setDialogOpen(false);
      refetch();
    } catch (err: any) {
      console.error('Erro ao salvar módulo:', err);
      toast.error(err.message || 'Erro ao salvar módulo');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedModulo) return;

    setDeleting(true);
    try {
      const { error } = await supabase
        .from('mt_modules')
        .delete()
        .eq('id', selectedModulo.id);

      if (error) throw error;

      toast.success('Módulo excluído com sucesso');
      setDeleteDialogOpen(false);
      refetch();
    } catch (err: any) {
      console.error('Erro ao excluir módulo:', err);
      toast.error(err.message || 'Erro ao excluir módulo');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return <LoadingState message="Carregando módulos..." />;
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
            <h1 className="text-2xl font-bold">Cadastro de Módulos</h1>
            <p className="text-muted-foreground">
              Gerencie os módulos disponíveis no sistema
            </p>
          </div>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Módulo
        </Button>
      </div>

      {/* Filtro */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar módulos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Lista de Módulos */}
      {filteredModulos.length === 0 ? (
        <EmptyState
          icon={Puzzle}
          title="Nenhum módulo encontrado"
          description="Crie um novo módulo para começar"
        />
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Módulo</TableHead>
                <TableHead>Código</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead className="text-center">Ordem</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredModulos.map((modulo) => (
                <TableRow key={modulo.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10 text-primary">
                        {getIcon(modulo.icone || 'Puzzle')}
                      </div>
                      <div>
                        <div className="font-medium">{modulo.nome}</div>
                        <div className="text-sm text-muted-foreground">{modulo.descricao}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <code className="text-sm bg-muted px-2 py-1 rounded">{modulo.codigo}</code>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {CATEGORIA_LABELS[modulo.categoria as keyof typeof CATEGORIA_LABELS] || modulo.categoria}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">{modulo.ordem}</TableCell>
                  <TableCell>
                    {modulo.is_core ? (
                      <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">
                        <Lock className="h-3 w-3 mr-1" />
                        Obrigatório
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Opcional</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(modulo)}
                        className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openDeleteDialog(modulo)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        disabled={modulo.is_core}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Dialog de Criar/Editar */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {selectedModulo ? 'Editar Módulo' : 'Novo Módulo'}
            </DialogTitle>
            <DialogDescription>
              {selectedModulo
                ? 'Atualize as informações do módulo'
                : 'Preencha as informações para criar um novo módulo'
              }
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="codigo">Código *</Label>
                <Input
                  id="codigo"
                  value={formData.codigo}
                  onChange={(e) => setFormData({ ...formData, codigo: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })}
                  placeholder="ex: meu_modulo"
                  disabled={!!selectedModulo}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ordem">Ordem</Label>
                <Input
                  id="ordem"
                  type="number"
                  value={formData.ordem}
                  onChange={(e) => setFormData({ ...formData, ordem: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="nome">Nome *</Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                placeholder="Nome do módulo"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea
                id="descricao"
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                placeholder="Descrição do módulo"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="icone">Ícone</Label>
                <Select
                  value={formData.icone}
                  onValueChange={(value) => setFormData({ ...formData, icone: value })}
                >
                  <SelectTrigger>
                    <SelectValue>
                      <div className="flex items-center gap-2">
                        {getIcon(formData.icone)}
                        <span>{formData.icone}</span>
                      </div>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="max-h-[200px]">
                    {AVAILABLE_ICONS.map((icon) => (
                      <SelectItem key={icon} value={icon}>
                        <div className="flex items-center gap-2">
                          {getIcon(icon)}
                          <span>{icon}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="categoria">Categoria</Label>
                <Select
                  value={formData.categoria}
                  onValueChange={(value) => setFormData({ ...formData, categoria: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CATEGORIA_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label>Módulo Obrigatório</Label>
                <p className="text-sm text-muted-foreground">
                  Módulos obrigatórios não podem ser desativados
                </p>
              </div>
              <Switch
                checked={formData.is_core}
                onCheckedChange={(checked) => setFormData({ ...formData, is_core: checked })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Confirmar Exclusão */}
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDelete}
        title="Excluir Módulo"
        description={`Tem certeza que deseja excluir o módulo "${selectedModulo?.nome}"? Esta ação não pode ser desfeita e removerá todas as permissões e configurações associadas.`}
        isLoading={deleting}
      />
    </div>
  );
};

export default ModulosCrud;
