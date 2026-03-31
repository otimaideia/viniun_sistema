import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  BookOpen,
  Plus,
  Search,
  Loader2,
  ArrowLeft,
  FileText,
} from 'lucide-react';
import { useTenantContext } from '@/contexts/TenantContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default function AIKnowledgeBase() {
  const navigate = useNavigate();
  const { tenant, isLoading: isTenantLoading } = useTenantContext();
  const [searchQuery, setSearchQuery] = useState('');

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['mt-chatbot-knowledge', tenant?.id],
    queryFn: async () => {
      let query = supabase
        .from('mt_chatbot_knowledge' as never)
        .select('id, titulo, categoria, content, created_at')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (tenant) {
        query = query.eq('tenant_id', tenant.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !isTenantLoading,
  });

  if (isTenantLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  type KnowledgeItem = { id: string; titulo?: string; categoria?: string; content?: string; created_at?: string };
  const filteredItems = items.filter((item: KnowledgeItem) =>
    item.titulo?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Button variant="ghost" size="sm" onClick={() => navigate('/ia')}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              YESia
            </Button>
            <span>/</span>
            <span>Base de Conhecimento</span>
          </div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="h-6 w-6" />
            Base de Conhecimento
          </h1>
          <p className="text-muted-foreground">
            Gerencie os itens de conhecimento da IA
            {tenant && ` - ${tenant.nome_fantasia}`}
          </p>
        </div>
        <Button disabled>
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Conhecimento
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Itens</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{items.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Categorias</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(items.map((i: KnowledgeItem) => i.categoria).filter(Boolean)).size}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por titulo..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Titulo</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Criado em</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={3} className="h-12">
                      <div className="h-4 w-full bg-muted animate-pulse rounded" />
                    </TableCell>
                  </TableRow>
                ))
              ) : filteredItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-8">
                    <BookOpen className="h-12 w-12 mx-auto text-muted-foreground/50 mb-2" />
                    <p className="text-muted-foreground">
                      {searchQuery
                        ? 'Nenhum item encontrado com esse filtro'
                        : 'Nenhum item na base de conhecimento'}
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredItems.map((item: KnowledgeItem) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="font-medium">{item.titulo || 'Sem titulo'}</div>
                    </TableCell>
                    <TableCell>
                      {item.categoria ? (
                        <Badge variant="secondary">{item.categoria}</Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(item.created_at).toLocaleDateString('pt-BR')}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
