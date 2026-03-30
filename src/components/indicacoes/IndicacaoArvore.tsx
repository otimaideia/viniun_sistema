import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  ChevronRight,
  ChevronDown,
  User,
  Users,
  GitBranch,
  ExternalLink,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { IndicacaoArvoreNode } from "@/types/indicacao";

interface IndicacaoArvoreProps {
  arvore: IndicacaoArvoreNode | null;
  isLoading?: boolean;
  maxDepth?: number;
  className?: string;
}

function ArvoreNode({
  node,
  depth,
  maxDepth,
}: {
  node: IndicacaoArvoreNode;
  depth: number;
  maxDepth: number;
}) {
  const [isOpen, setIsOpen] = useState(depth < 2);
  const navigate = useNavigate();
  const hasChildren = node.indicados && node.indicados.length > 0;
  const canExpand = depth < maxDepth;

  const getStatusColor = (status?: string) => {
    switch (status) {
      case "convertido":
      case "ganho":
      case "cliente":
        return "bg-emerald-100 text-emerald-800";
      case "perdido":
      case "cancelado":
        return "bg-red-100 text-red-800";
      case "em_atendimento":
      case "agendado":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="relative">
      {/* Linha vertical conectando nos */}
      {depth > 0 && (
        <div
          className="absolute left-0 top-0 w-px bg-border"
          style={{
            height: "24px",
            marginLeft: `${(depth - 1) * 24 + 12}px`,
          }}
        />
      )}

      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div
          className="flex items-center gap-2 py-2 hover:bg-muted/50 rounded-lg px-2 transition-colors"
          style={{ paddingLeft: `${depth * 24}px` }}
        >
          {/* Icone de expansao */}
          {hasChildren && canExpand ? (
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                {isOpen ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
          ) : (
            <div className="h-6 w-6 flex items-center justify-center">
              <User className="h-4 w-4 text-muted-foreground" />
            </div>
          )}

          {/* Info do Lead */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium truncate">{node.nome}</span>
              {node.quantidade_indicacoes > 0 && (
                <Badge variant="secondary" className="gap-1 shrink-0">
                  <Users className="h-3 w-3" />
                  {node.quantidade_indicacoes}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {node.email && <span className="truncate">{node.email}</span>}
              {node.status && (
                <Badge variant="outline" className={`text-xs ${getStatusColor(node.status)}`}>
                  {node.status}
                </Badge>
              )}
            </div>
          </div>

          {/* Data e acoes */}
          <div className="flex items-center gap-2 shrink-0">
            {node.data_indicacao && (
              <span className="text-xs text-muted-foreground">
                {new Date(node.data_indicacao).toLocaleDateString("pt-BR")}
              </span>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => navigate(`/leads/${node.lead_id}`)}
            >
              <ExternalLink className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Filhos */}
        {hasChildren && canExpand && (
          <CollapsibleContent>
            <div className="relative">
              {/* Linha horizontal conectando ao pai */}
              <div
                className="absolute left-0 top-0 h-px bg-border"
                style={{
                  width: "24px",
                  marginLeft: `${depth * 24 + 12}px`,
                }}
              />
              {node.indicados!.map((child, index) => (
                <ArvoreNode
                  key={child.lead_id}
                  node={child}
                  depth={depth + 1}
                  maxDepth={maxDepth}
                />
              ))}
            </div>
          </CollapsibleContent>
        )}
      </Collapsible>
    </div>
  );
}

export function IndicacaoArvore({
  arvore,
  isLoading,
  maxDepth = 5,
  className,
}: IndicacaoArvoreProps) {
  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-4" style={{ paddingLeft: `${(i - 1) * 24}px` }}>
              <Skeleton className="h-6 w-6 rounded" />
              <Skeleton className="h-4 flex-1" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!arvore) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitBranch className="h-5 w-5" />
            Arvore de Indicacoes
          </CardTitle>
          <CardDescription>
            Visualize a cadeia de indicacoes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <GitBranch className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhuma indicacao encontrada</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Contar total de nos na arvore
  const countNodes = (node: IndicacaoArvoreNode): number => {
    let count = 1;
    if (node.indicados) {
      node.indicados.forEach((child) => {
        count += countNodes(child);
      });
    }
    return count;
  };

  const totalNodes = countNodes(arvore);

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <GitBranch className="h-5 w-5 text-primary" />
              Arvore de Indicacoes
            </CardTitle>
            <CardDescription>
              Visualize a cadeia de indicacoes a partir de {arvore.nome}
            </CardDescription>
          </div>
          <Badge variant="secondary" className="gap-1">
            <Users className="h-3 w-3" />
            {totalNodes} leads
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="border rounded-lg p-4 bg-muted/20">
          <ArvoreNode node={arvore} depth={0} maxDepth={maxDepth} />
        </div>
      </CardContent>
    </Card>
  );
}
