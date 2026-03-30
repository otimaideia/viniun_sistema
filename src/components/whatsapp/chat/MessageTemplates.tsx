import { useState, useMemo } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Zap, Search, Target, FileText, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMarketingTemplatesAdapter } from "@/hooks/useMarketingTemplatesAdapter";
import { useMarketingCampanhasAdapter } from "@/hooks/useMarketingCampanhasAdapter";

interface Template {
  id: string;
  name: string;
  content: string;
  category?: string;
  isMarketing?: boolean;
  campaignName?: string;
}

// Templates padrao - podem ser customizados
const DEFAULT_TEMPLATES: Template[] = [
  {
    id: "greeting",
    name: "Saudacao",
    content: "Ola! Tudo bem? Sou da YESlaser. Como posso ajudar voce hoje?",
    category: "Atendimento"
  },
  {
    id: "schedule",
    name: "Agendar Avaliacao",
    content: "Ficamos felizes com seu interesse! Gostaria de agendar uma avaliacao gratuita? Temos horarios disponiveis para esta semana.",
    category: "Agendamento"
  },
  {
    id: "confirm_schedule",
    name: "Confirmar Agendamento",
    content: "Oi! Tudo bem? Estou entrando em contato para confirmar seu agendamento para [DATA] as [HORA]. Voce podera comparecer?",
    category: "Agendamento"
  },
  {
    id: "reminder",
    name: "Lembrete",
    content: "Ola! Lembrando que seu agendamento esta marcado para amanha as [HORA]. Estamos te esperando!",
    category: "Agendamento"
  },
  {
    id: "thanks",
    name: "Agradecimento",
    content: "Muito obrigado pelo contato! Qualquer duvida, estamos a disposicao. Tenha um otimo dia!",
    category: "Atendimento"
  },
  {
    id: "promo",
    name: "Promocao",
    content: "Novidade! Temos uma promocao especial esse mes. Quer saber mais detalhes?",
    category: "Marketing"
  },
  {
    id: "follow_up",
    name: "Follow-up",
    content: "Ola! Como esta? Estou entrando em contato para saber se voce conseguiu pensar sobre nossa proposta. Posso ajudar com alguma duvida?",
    category: "Vendas"
  },
  {
    id: "location",
    name: "Endereco",
    content: "Nossa unidade fica em: [ENDERECO]. Funcionamos de segunda a sabado, das 9h as 19h.",
    category: "Informacao"
  },
  {
    id: "prices",
    name: "Valores",
    content: "Os valores variam de acordo com a regiao do corpo e quantidade de sessoes. Posso te passar mais detalhes sobre o tratamento que voce tem interesse?",
    category: "Vendas"
  },
  {
    id: "not_available",
    name: "Ausente",
    content: "No momento nao estou disponivel, mas retornarei em breve. Por favor, deixe sua mensagem que responderei assim que possivel!",
    category: "Atendimento"
  },
];

interface MessageTemplatesProps {
  onSelectTemplate: (content: string) => void;
}

export function MessageTemplates({ onSelectTemplate }: MessageTemplatesProps) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [selectedTab, setSelectedTab] = useState<"all" | "default" | "marketing">("all");
  const [selectedCampanhaId, setSelectedCampanhaId] = useState<string>("all");

  // Fetch marketing templates (WhatsApp only)
  const { templates: marketingTemplates, isLoading: isLoadingTemplates } = useMarketingTemplatesAdapter();
  const { campanhas } = useMarketingCampanhasAdapter();

  // Filter WhatsApp templates and convert to common format
  const whatsappTemplates: Template[] = useMemo(() => {
    return marketingTemplates
      .filter((t) => t.tipo === "whatsapp" && t.ativo)
      .map((t) => ({
        id: t.id,
        name: t.nome_template,
        content: t.template_content,
        category: "Marketing",
        isMarketing: true,
        campaignName: t.mt_franchises?.nome_fantasia,
      }));
  }, [marketingTemplates]);

  // Combine all templates
  const allTemplates = useMemo(() => {
    return [...DEFAULT_TEMPLATES, ...whatsappTemplates];
  }, [whatsappTemplates]);

  // Filter templates based on tab, search and campaign
  const filteredTemplates = useMemo(() => {
    let templates = allTemplates;

    // Filter by tab
    if (selectedTab === "default") {
      templates = templates.filter((t) => !t.isMarketing);
    } else if (selectedTab === "marketing") {
      templates = templates.filter((t) => t.isMarketing);
    }

    // Filter by campaign (for marketing templates)
    if (selectedCampanhaId !== "all" && selectedTab !== "default") {
      templates = templates.filter(
        (t) => !t.isMarketing || t.campaignName === selectedCampanhaId
      );
    }

    // Filter by search
    if (search.trim()) {
      const searchLower = search.toLowerCase();
      templates = templates.filter(
        (t) =>
          t.name.toLowerCase().includes(searchLower) ||
          t.content.toLowerCase().includes(searchLower) ||
          t.category?.toLowerCase().includes(searchLower)
      );
    }

    return templates;
  }, [allTemplates, selectedTab, selectedCampanhaId, search]);

  // Get unique categories
  const categories = useMemo(() => {
    return [...new Set(filteredTemplates.map((t) => t.category).filter(Boolean))];
  }, [filteredTemplates]);

  const handleSelect = (template: Template) => {
    onSelectTemplate(template.content);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          title="Templates de mensagem"
        >
          <Zap className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end" side="top">
        {/* Tabs */}
        <Tabs value={selectedTab} onValueChange={(v) => setSelectedTab(v as typeof selectedTab)}>
          <div className="p-2 border-b">
            <TabsList className="w-full">
              <TabsTrigger value="all" className="flex-1 text-xs">
                Todos
              </TabsTrigger>
              <TabsTrigger value="default" className="flex-1 text-xs">
                <FileText className="h-3 w-3 mr-1" />
                Padrao
              </TabsTrigger>
              <TabsTrigger value="marketing" className="flex-1 text-xs">
                <Target className="h-3 w-3 mr-1" />
                Marketing
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Search */}
          <div className="p-3 border-b">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar template..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-9"
              />
            </div>
          </div>

          <TabsContent value="all" className="m-0">
            <TemplateList
              templates={filteredTemplates}
              categories={categories}
              isLoading={isLoadingTemplates}
              onSelect={handleSelect}
            />
          </TabsContent>

          <TabsContent value="default" className="m-0">
            <TemplateList
              templates={filteredTemplates}
              categories={categories}
              isLoading={false}
              onSelect={handleSelect}
            />
          </TabsContent>

          <TabsContent value="marketing" className="m-0">
            <TemplateList
              templates={filteredTemplates}
              categories={categories}
              isLoading={isLoadingTemplates}
              onSelect={handleSelect}
              emptyMessage="Nenhum template de marketing (WhatsApp) encontrado"
            />
          </TabsContent>
        </Tabs>

        <div className="p-2 border-t text-xs text-muted-foreground text-center flex items-center justify-center gap-2">
          <span>{DEFAULT_TEMPLATES.length} padrao</span>
          <span>|</span>
          <span>{whatsappTemplates.length} marketing</span>
        </div>
      </PopoverContent>
    </Popover>
  );
}

interface TemplateListProps {
  templates: Template[];
  categories: (string | undefined)[];
  isLoading: boolean;
  onSelect: (template: Template) => void;
  emptyMessage?: string;
}

function TemplateList({
  templates,
  categories,
  isLoading,
  onSelect,
  emptyMessage = "Nenhum template encontrado",
}: TemplateListProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <div className="p-4 text-center text-muted-foreground text-sm">
        {emptyMessage}
      </div>
    );
  }

  return (
    <ScrollArea className="h-[300px]">
      {categories.map((category) => {
        const categoryTemplates = templates.filter((t) => t.category === category);
        if (categoryTemplates.length === 0) return null;

        return (
          <div key={category} className="p-2">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-2 py-1">
              {category}
            </div>
            {categoryTemplates.map((template) => (
              <button
                key={template.id}
                onClick={() => onSelect(template)}
                className={cn(
                  "w-full text-left p-2 rounded-md hover:bg-muted transition-colors",
                  "focus:outline-none focus:bg-muted"
                )}
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm flex-1">{template.name}</span>
                  {template.isMarketing && (
                    <Badge variant="secondary" className="text-[10px] h-5">
                      <Target className="h-3 w-3 mr-1" />
                      Mkt
                    </Badge>
                  )}
                </div>
                <div className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                  {template.content}
                </div>
                {template.campaignName && (
                  <div className="text-[10px] text-primary mt-1">
                    {template.campaignName}
                  </div>
                )}
              </button>
            ))}
          </div>
        );
      })}
    </ScrollArea>
  );
}
