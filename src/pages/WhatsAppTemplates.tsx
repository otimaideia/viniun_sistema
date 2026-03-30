import { useState, useMemo } from 'react';
import {
  FileText,
  Plus,
  Search,
  Edit2,
  Trash2,
  Copy,
  Eye,
  Target,
  RefreshCw,
  Filter,
  MoreHorizontal,
  MessageSquare,
  Zap,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ModuleLayout } from '@/components/shared/index';
import { useMarketingTemplatesAdapter } from '@/hooks/useMarketingTemplatesAdapter';
import type { MarketingTemplate } from '@/types/marketing';
import { useUserProfileAdapter } from '@/hooks/useUserProfileAdapter';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Templates padrão do sistema
const DEFAULT_TEMPLATES = [
  {
    id: "greeting",
    name: "Saudação",
    content: "Olá! Tudo bem? Sou da YESlaser. Como posso ajudar você hoje?",
    category: "Atendimento",
  },
  {
    id: "schedule",
    name: "Agendar Avaliação",
    content: "Ficamos felizes com seu interesse! Gostaria de agendar uma avaliação gratuita? Temos horários disponíveis para esta semana.",
    category: "Agendamento",
  },
  {
    id: "confirm_schedule",
    name: "Confirmar Agendamento",
    content: "Oi! Tudo bem? Estou entrando em contato para confirmar seu agendamento para [DATA] às [HORA]. Você poderá comparecer?",
    category: "Agendamento",
  },
  {
    id: "reminder",
    name: "Lembrete",
    content: "Olá! Lembrando que seu agendamento está marcado para amanhã às [HORA]. Estamos te esperando!",
    category: "Agendamento",
  },
  {
    id: "thanks",
    name: "Agradecimento",
    content: "Muito obrigado pelo contato! Qualquer dúvida, estamos à disposição. Tenha um ótimo dia!",
    category: "Atendimento",
  },
  {
    id: "promo",
    name: "Promoção",
    content: "Novidade! Temos uma promoção especial esse mês. Quer saber mais detalhes?",
    category: "Marketing",
  },
  {
    id: "follow_up",
    name: "Follow-up",
    content: "Olá! Como está? Estou entrando em contato para saber se você conseguiu pensar sobre nossa proposta. Posso ajudar com alguma dúvida?",
    category: "Vendas",
  },
  {
    id: "location",
    name: "Endereço",
    content: "Nossa unidade fica em: [ENDEREÇO]. Funcionamos de segunda a sábado, das 9h às 19h.",
    category: "Informação",
  },
  {
    id: "prices",
    name: "Valores",
    content: "Os valores variam de acordo com a região do corpo e quantidade de sessões. Posso te passar mais detalhes sobre o tratamento que você tem interesse?",
    category: "Vendas",
  },
  {
    id: "not_available",
    name: "Ausente",
    content: "No momento não estou disponível, mas retornarei em breve. Por favor, deixe sua mensagem que responderei assim que possível!",
    category: "Atendimento",
  },
];

// Componente de preview do template
const TemplatePreview: React.FC<{ content: string; onClose: () => void }> = ({ content, onClose }) => {
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Preview da Mensagem</DialogTitle>
          <DialogDescription>
            Visualização de como a mensagem aparecerá no chat
          </DialogDescription>
        </DialogHeader>
        <div className="bg-[#e9edef] rounded-lg p-4">
          <div className="bg-[#dcf8c6] rounded-lg p-3 max-w-[80%] ml-auto">
            <p className="text-sm whitespace-pre-wrap">{content}</p>
            <div className="flex items-center justify-end gap-1 mt-1">
              <span className="text-[10px] text-gray-500">
                {format(new Date(), 'HH:mm')}
              </span>
              <CheckCircle className="h-3 w-3 text-blue-500" />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Card de template padrão
interface DefaultTemplateCardProps {
  template: typeof DEFAULT_TEMPLATES[0];
  onCopy: () => void;
  onPreview: () => void;
}

const DefaultTemplateCard: React.FC<DefaultTemplateCardProps> = ({
  template,
  onCopy,
  onPreview,
}) => {
  return (
    <Card className="group hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-medium truncate">{template.name}</h3>
            </div>

            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
              {template.content}
            </p>

            <Badge variant="outline" className="text-xs">
              {template.category}
            </Badge>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onPreview}>
                <Eye className="h-4 w-4 mr-2" />
                Visualizar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onCopy}>
                <Copy className="h-4 w-4 mr-2" />
                Copiar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
};

// Card de template de marketing
interface MarketingTemplateCardProps {
  template: MarketingTemplate;
  onCopy: () => void;
  onPreview: () => void;
  onToggleActive: () => void;
}

const MarketingTemplateCard: React.FC<MarketingTemplateCardProps> = ({
  template,
  onCopy,
  onPreview,
  onToggleActive,
}) => {
  return (
    <Card className={cn(
      "group hover:shadow-md transition-shadow",
      !template.ativo && "opacity-60"
    )}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-4 w-4 text-primary" />
              <h3 className="font-medium truncate">{template.nome_template}</h3>
              {template.ativo ? (
                <Badge className="text-xs bg-green-500">Ativo</Badge>
              ) : (
                <Badge variant="secondary" className="text-xs">Inativo</Badge>
              )}
            </div>

            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
              {template.template_content}
            </p>

            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="text-xs">
                <Target className="h-3 w-3 mr-1" />
                Marketing
              </Badge>
              {template.mt_franchises?.nome_fantasia && (
                <Badge variant="secondary" className="text-xs">
                  {template.mt_franchises.nome_fantasia}
                </Badge>
              )}
            </div>

            <p className="text-xs text-muted-foreground mt-2">
              Criado em {format(new Date(template.created_at), "dd/MM/yyyy", { locale: ptBR })}
            </p>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onPreview}>
                <Eye className="h-4 w-4 mr-2" />
                Visualizar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onCopy}>
                <Copy className="h-4 w-4 mr-2" />
                Copiar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onToggleActive}>
                {template.ativo ? (
                  <>
                    <XCircle className="h-4 w-4 mr-2" />
                    Desativar
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Ativar
                  </>
                )}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
};

export default function WhatsAppTemplates() {
  const { isUnidade, unidadeId } = useUserProfileAdapter();

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'all' | 'default' | 'marketing'>('all');
  const [previewContent, setPreviewContent] = useState<string | null>(null);

  const {
    templates: marketingTemplates,
    isLoading,
    refetch,
    toggleTemplateActive,
  } = useMarketingTemplatesAdapter();

  // Filtrar apenas templates do tipo WhatsApp
  const whatsappTemplates = useMemo(() => {
    return marketingTemplates.filter(t => t.tipo === 'whatsapp');
  }, [marketingTemplates]);

  // Combinar templates
  const allTemplates = useMemo(() => {
    const defaultMapped = DEFAULT_TEMPLATES.map(t => ({
      ...t,
      isDefault: true,
      isMarketing: false,
    }));

    const marketingMapped = whatsappTemplates.map(t => ({
      id: t.id,
      name: t.nome_template,
      content: t.template_content,
      category: 'Marketing',
      isDefault: false,
      isMarketing: true,
      originalTemplate: t,
    }));

    return [...defaultMapped, ...marketingMapped];
  }, [whatsappTemplates]);

  // Filtrar templates
  const filteredTemplates = useMemo(() => {
    let templates = allTemplates;

    // Filtrar por tab
    if (activeTab === 'default') {
      templates = templates.filter(t => t.isDefault);
    } else if (activeTab === 'marketing') {
      templates = templates.filter(t => t.isMarketing);
    }

    // Filtrar por categoria
    if (categoryFilter !== 'all') {
      templates = templates.filter(t => t.category === categoryFilter);
    }

    // Filtrar por busca
    if (search.trim()) {
      const searchLower = search.toLowerCase();
      templates = templates.filter(t =>
        t.name.toLowerCase().includes(searchLower) ||
        t.content.toLowerCase().includes(searchLower)
      );
    }

    return templates;
  }, [allTemplates, activeTab, categoryFilter, search]);

  // Categorias únicas
  const categories = useMemo(() => {
    const cats = new Set(allTemplates.map(t => t.category));
    return Array.from(cats).sort();
  }, [allTemplates]);

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
    toast.success('Mensagem copiada!');
  };

  const handleToggleActive = async (template: MarketingTemplate) => {
    await toggleTemplateActive.mutateAsync({ id: template.id, ativo: !template.ativo });
  };

  return (
    <ModuleLayout
      title="Templates de Mensagem"
      description="Gerencie templates de mensagens para WhatsApp"
      breadcrumbs={[
        { label: 'WhatsApp', href: '/whatsapp' },
        { label: 'Templates' },
      ]}
      actions={
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Atualizar
        </Button>
      }
    >
      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{allTemplates.length}</p>
                <p className="text-sm text-muted-foreground">Total de Templates</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-500/10 p-2">
                <Zap className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{DEFAULT_TEMPLATES.length}</p>
                <p className="text-sm text-muted-foreground">Templates Padrão</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-green-500/10 p-2">
                <Target className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{whatsappTemplates.filter(t => t.ativo).length}</p>
                <p className="text-sm text-muted-foreground">Marketing Ativos</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar template..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="mb-6">
        <TabsList>
          <TabsTrigger value="all">
            Todos ({allTemplates.length})
          </TabsTrigger>
          <TabsTrigger value="default">
            <Zap className="h-4 w-4 mr-1" />
            Padrão ({DEFAULT_TEMPLATES.length})
          </TabsTrigger>
          <TabsTrigger value="marketing">
            <Target className="h-4 w-4 mr-1" />
            Marketing ({whatsappTemplates.length})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Lista de templates */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="h-24 animate-pulse bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredTemplates.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhum template encontrado</h3>
            <p className="text-muted-foreground">
              Tente ajustar os filtros de busca
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredTemplates.map((template) => (
            template.isDefault ? (
              <DefaultTemplateCard
                key={template.id}
                template={template as typeof DEFAULT_TEMPLATES[0]}
                onCopy={() => handleCopy(template.content)}
                onPreview={() => setPreviewContent(template.content)}
              />
            ) : (
              <MarketingTemplateCard
                key={template.id}
                template={(template as any).originalTemplate}
                onCopy={() => handleCopy(template.content)}
                onPreview={() => setPreviewContent(template.content)}
                onToggleActive={() => handleToggleActive((template as any).originalTemplate)}
              />
            )
          ))}
        </div>
      )}

      {/* Preview modal */}
      {previewContent && (
        <TemplatePreview
          content={previewContent}
          onClose={() => setPreviewContent(null)}
        />
      )}
    </ModuleLayout>
  );
}
