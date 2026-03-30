// Componente para selecao de templates de formularios

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  UserPlus,
  Calendar,
  DollarSign,
  MessageSquare,
  ClipboardList,
  UserCheck,
  CalendarCheck,
  Star,
  FileText,
  Loader2,
  Sparkles,
  Check,
  Users,
} from 'lucide-react';
import { useFormularioTemplatesAdapter } from '@/hooks/useFormularioTemplatesAdapter';
import type {
  FormularioTemplate,
  FormularioTemplateCategoria,
} from '@/types/formulario';

// Mapeamento de icones por categoria
const CATEGORY_ICONS: Record<FormularioTemplateCategoria, React.ElementType> = {
  lead_capture: UserPlus,
  agendamento: Calendar,
  orcamento: DollarSign,
  contato: MessageSquare,
  pesquisa: ClipboardList,
  cadastro: UserCheck,
  evento: CalendarCheck,
  avaliacao: Star,
  indicacao: Users,
};

interface TemplateSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (template: FormularioTemplate | null) => void;
}

export const TemplateSelector: React.FC<TemplateSelectorProps> = ({
  isOpen,
  onClose,
  onSelect,
}) => {
  const [selectedTemplate, setSelectedTemplate] = useState<FormularioTemplate | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const {
    templates,
    templatesByCategory,
    categoriesWithTemplates,
    isLoading,
    incrementUsage,
  } = useFormularioTemplatesAdapter();

  const handleSelect = () => {
    if (selectedTemplate) {
      if (selectedTemplate.id !== 'blank') {
        incrementUsage(selectedTemplate.id);
      }
      onSelect(selectedTemplate);
      setSelectedTemplate(null);
    }
  };

  const handleStartBlank = () => {
    // Passar null para indicar que quer comecar do zero
    onSelect(null);
    setSelectedTemplate(null);
  };

  const filteredTemplates =
    activeCategory === 'all'
      ? templates
      : templatesByCategory[activeCategory as FormularioTemplateCategoria] || [];

  // Template em branco para selecao visual
  const blankTemplate: FormularioTemplate = {
    id: 'blank',
    nome: 'Em branco',
    categoria: 'lead_capture',
    config: {},
    campos: [],
    uso_count: 0,
    is_premium: false,
    is_sistema: false,
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[850px] max-h-[85vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Escolha um Template
          </DialogTitle>
          <DialogDescription>
            Selecione um modelo pre-configurado ou comece do zero
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex flex-col overflow-hidden px-6">
          {/* Tabs de Categorias */}
          <Tabs
            value={activeCategory}
            onValueChange={setActiveCategory}
            className="flex-1 flex flex-col min-h-0"
          >
            <TabsList className="w-full justify-start gap-1 h-auto flex-wrap p-1 shrink-0">
              <TabsTrigger value="all" className="text-xs">
                Todos
              </TabsTrigger>
              {categoriesWithTemplates.map((cat) => {
                const Icon = CATEGORY_ICONS[cat.categoria];
                return (
                  <TabsTrigger
                    key={cat.categoria}
                    value={cat.categoria}
                    className="text-xs gap-1"
                  >
                    <Icon className="h-3 w-3" />
                    {cat.label}
                    <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
                      {cat.count}
                    </Badge>
                  </TabsTrigger>
                );
              })}
            </TabsList>

            <TabsContent value={activeCategory} className="flex-1 mt-3 min-h-0 overflow-hidden">
              {isLoading ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <ScrollArea className="h-full pr-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pb-2">
                    {/* Card para comecar do zero */}
                    <Card
                      className={`cursor-pointer transition-all hover:border-primary/50 hover:shadow-sm ${
                        selectedTemplate?.id === 'blank'
                          ? 'border-primary ring-2 ring-primary/20'
                          : ''
                      }`}
                      onClick={() => setSelectedTemplate(blankTemplate)}
                    >
                      <CardHeader className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                          </div>
                          {selectedTemplate?.id === 'blank' && (
                            <Check className="h-4 w-4 text-primary" />
                          )}
                        </div>
                        <CardTitle className="text-sm mt-2">Em Branco</CardTitle>
                        <CardDescription className="text-xs leading-tight">
                          Comece do zero e crie seu formulario
                        </CardDescription>
                      </CardHeader>
                    </Card>

                    {/* Templates */}
                    {filteredTemplates.map((template) => {
                      const Icon = CATEGORY_ICONS[template.categoria] || FileText;
                      const isSelected = selectedTemplate?.id === template.id;

                      return (
                        <Card
                          key={template.id}
                          className={`cursor-pointer transition-all hover:border-primary/50 hover:shadow-sm ${
                            isSelected ? 'border-primary ring-2 ring-primary/20' : ''
                          }`}
                          onClick={() => setSelectedTemplate(template)}
                        >
                          <CardHeader className="p-4 pb-2">
                            <div className="flex items-center justify-between">
                              <div
                                className="h-9 w-9 rounded-lg flex items-center justify-center"
                                style={{
                                  backgroundColor: `${template.config?.cor_primaria || '#10b981'}20`,
                                }}
                              >
                                <Icon
                                  className="h-4 w-4"
                                  style={{
                                    color: template.config?.cor_primaria || '#10b981',
                                  }}
                                />
                              </div>
                              <div className="flex items-center gap-1.5">
                                {template.is_premium && (
                                  <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                                    Premium
                                  </Badge>
                                )}
                                {isSelected && <Check className="h-4 w-4 text-primary" />}
                              </div>
                            </div>
                            <CardTitle className="text-sm mt-2 leading-tight">{template.nome}</CardTitle>
                            <CardDescription className="text-xs line-clamp-2 leading-tight">
                              {template.descricao}
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="px-4 pb-3 pt-0">
                            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                              <span>
                                {template.campos?.length || 0} campos
                              </span>
                              <span>{template.uso_count || 0} usos</span>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Rodape com acoes */}
        <div className="flex items-center justify-between px-6 py-3 border-t shrink-0 bg-background">
          <div className="text-sm text-muted-foreground">
            {selectedTemplate ? (
              <span>
                Selecionado:{' '}
                <strong className="text-foreground">{selectedTemplate.nome}</strong>
              </span>
            ) : (
              <span>Selecione um template para continuar</span>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={selectedTemplate?.id === 'blank' ? handleStartBlank : handleSelect}
              disabled={!selectedTemplate}
            >
              {selectedTemplate?.id === 'blank' ? 'Comecar do Zero' : 'Usar Template'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TemplateSelector;
