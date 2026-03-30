import { useState } from 'react';
import { useInfluenciadoraAuthContext } from '@/contexts/InfluenciadoraAuthContext';
import { InfluenciadoraLayout } from '@/components/influenciadora-portal/InfluenciadoraLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Image,
  Plus,
  ExternalLink,
  Eye,
  Heart,
  MessageCircle,
  Share2,
  Loader2,
  CheckCircle2,
  Clock,
  XCircle,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { PostStatus, PostPlataforma, PostTipoConteudo, getPlataformaIcon, getTipoConteudoLabel, formatSeguidores } from '@/types/influenciadora';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function MeusPostsInfluenciadora() {
  const { influenciadora } = useInfluenciadoraAuthContext();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form states
  const [plataforma, setPlataforma] = useState<PostPlataforma>('instagram');
  const [tipoConteudo, setTipoConteudo] = useState<PostTipoConteudo>('post_feed');
  const [urlPost, setUrlPost] = useState('');
  const [descricao, setDescricao] = useState('');

  // Buscar posts
  const { data: posts, isLoading } = useQuery({
    queryKey: ['meus-posts', influenciadora?.id],
    queryFn: async () => {
      if (!influenciadora?.id) return [];

      const { data, error } = await supabase
        .from('mt_influencer_posts')
        .select('*')
        .eq('influencer_id', influenciadora.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!influenciadora?.id,
  });

  // Mutation para criar post
  const createPost = useMutation({
    mutationFn: async () => {
      if (!influenciadora?.id) throw new Error('Influenciadora não encontrada');

      const { data, error } = await supabase
        .from('mt_influencer_posts')
        .insert({
          influencer_id: influenciadora.id,
          plataforma,
          tipo_conteudo: tipoConteudo,
          url_post: urlPost || null,
          descricao: descricao || null,
          status: 'pendente',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meus-posts'] });
      toast({
        title: 'Post registrado!',
        description: 'Aguarde a aprovação da equipe.',
      });
      setIsModalOpen(false);
      resetForm();
    },
    onError: (err) => {
      console.error('Erro ao criar post:', err);
      toast({
        title: 'Erro ao registrar',
        description: 'Tente novamente mais tarde.',
        variant: 'destructive',
      });
    },
  });

  const resetForm = () => {
    setPlataforma('instagram');
    setTipoConteudo('post_feed');
    setUrlPost('');
    setDescricao('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createPost.mutate();
  };

  // Estatísticas
  const stats = {
    total: posts?.length || 0,
    aprovados: posts?.filter(p => p.status === 'aprovado').length || 0,
    pendentes: posts?.filter(p => p.status === 'pendente').length || 0,
    totalViews: posts?.reduce((acc, p) => acc + (p.views || 0), 0) || 0,
  };

  const getStatusBadge = (status: PostStatus) => {
    const configs: Record<PostStatus, { color: string; icon: React.ReactNode; label: string }> = {
      pendente: { color: 'bg-yellow-100 text-yellow-700', icon: <Clock className="h-3 w-3 mr-1" />, label: 'Pendente' },
      publicado: { color: 'bg-blue-100 text-blue-700', icon: <CheckCircle2 className="h-3 w-3 mr-1" />, label: 'Publicado' },
      aprovado: { color: 'bg-green-100 text-green-700', icon: <CheckCircle2 className="h-3 w-3 mr-1" />, label: 'Aprovado' },
      rejeitado: { color: 'bg-red-100 text-red-700', icon: <XCircle className="h-3 w-3 mr-1" />, label: 'Rejeitado' },
    };

    const config = configs[status];
    return (
      <Badge className={`${config.color} hover:${config.color}`}>
        {config.icon}
        {config.label}
      </Badge>
    );
  };

  return (
    <InfluenciadoraLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Meus Posts</h1>
            <p className="text-gray-500">
              Registre e acompanhe seus posts publicados
            </p>
          </div>
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[#662E8E] hover:bg-[#662E8E]/90">
                <Plus className="h-4 w-4 mr-2" />
                Registrar Post
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Registrar Novo Post</DialogTitle>
                <DialogDescription>
                  Informe os detalhes do post publicado para registro
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Plataforma</Label>
                    <Select value={plataforma} onValueChange={(v) => setPlataforma(v as PostPlataforma)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="instagram">Instagram</SelectItem>
                        <SelectItem value="tiktok">TikTok</SelectItem>
                        <SelectItem value="youtube">YouTube</SelectItem>
                        <SelectItem value="facebook">Facebook</SelectItem>
                        <SelectItem value="stories">Stories</SelectItem>
                        <SelectItem value="reels">Reels</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Tipo de Conteúdo</Label>
                    <Select value={tipoConteudo} onValueChange={(v) => setTipoConteudo(v as PostTipoConteudo)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="post_feed">Post Feed</SelectItem>
                        <SelectItem value="stories">Stories</SelectItem>
                        <SelectItem value="reels">Reels</SelectItem>
                        <SelectItem value="video">Vídeo</SelectItem>
                        <SelectItem value="carrossel">Carrossel</SelectItem>
                        <SelectItem value="live">Live</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>URL do Post (opcional)</Label>
                  <Input
                    placeholder="https://instagram.com/p/..."
                    value={urlPost}
                    onChange={(e) => setUrlPost(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Descrição (opcional)</Label>
                  <Textarea
                    placeholder="Descreva o conteúdo do post..."
                    value={descricao}
                    onChange={(e) => setDescricao(e.target.value)}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    className="bg-[#662E8E] hover:bg-[#662E8E]/90"
                    disabled={createPost.isPending}
                  >
                    {createPost.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Registrando...
                      </>
                    ) : (
                      'Registrar'
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Cards de Resumo */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total de Posts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-[#662E8E]">{stats.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Aprovados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{stats.aprovados}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Pendentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-yellow-600">{stats.pendentes}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total Views
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">{formatSeguidores(stats.totalViews)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Lista de Posts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Image className="h-5 w-5 text-[#662E8E]" />
              Meus Posts Registrados
            </CardTitle>
            <CardDescription>
              Posts publicados e suas métricas
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-[#662E8E]" />
              </div>
            ) : posts && posts.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {posts.map((post) => (
                  <Card key={post.id} className="overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="capitalize">
                            {getPlataformaIcon(post.plataforma)}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            {getTipoConteudoLabel(post.tipo_conteudo)}
                          </span>
                        </div>
                        {getStatusBadge(post.status)}
                      </div>
                      {post.descricao && (
                        <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                          {post.descricao}
                        </p>
                      )}
                      <div className="flex items-center justify-between text-sm text-gray-500">
                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-1">
                            <Eye className="h-3 w-3" />
                            {formatSeguidores(post.views || 0)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Heart className="h-3 w-3" />
                            {formatSeguidores(post.likes || 0)}
                          </span>
                          <span className="flex items-center gap-1">
                            <MessageCircle className="h-3 w-3" />
                            {post.comentarios || 0}
                          </span>
                        </div>
                        {post.url_post && (
                          <a
                            href={post.url_post}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#662E8E] hover:underline"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-2">
                        {format(new Date(post.created_at), "dd/MM/yyyy", { locale: ptBR })}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                  <Image className="h-8 w-8 text-gray-400" />
                </div>
                <p className="text-gray-500 mb-2">Nenhum post registrado</p>
                <p className="text-sm text-gray-400 mb-4">
                  Registre seus posts para acompanhar as métricas
                </p>
                <Button
                  onClick={() => setIsModalOpen(true)}
                  className="bg-[#662E8E] hover:bg-[#662E8E]/90"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Registrar Primeiro Post
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </InfluenciadoraLayout>
  );
}
