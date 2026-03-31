import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useInfluencerPostsMT } from "@/hooks/multitenant/useInfluencerPostsMT";
import { useInfluencerContractsMT } from "@/hooks/multitenant/useInfluencerContractsMT";
import { useInfluenciadorasAdapter } from "@/hooks/useInfluenciadorasAdapter";
import { useTenantContext } from "@/contexts/TenantContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Save, Loader2, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import type {
  MTPostCreate,
  MTPostPlatform,
  MTPostType,
  MTPostStatus,
} from "@/hooks/multitenant/useInfluencerPostsMT";

const PLATAFORMAS: { value: MTPostPlatform; label: string; emoji: string }[] = [
  { value: "instagram", label: "Instagram", emoji: "📸" },
  { value: "tiktok", label: "TikTok", emoji: "🎵" },
  { value: "youtube", label: "YouTube", emoji: "▶️" },
  { value: "facebook", label: "Facebook", emoji: "👤" },
];

const TIPOS_POST: { value: MTPostType; label: string }[] = [
  { value: "post_feed", label: "Post no Feed" },
  { value: "stories", label: "Stories" },
  { value: "reels", label: "Reels/TikTok" },
  { value: "video", label: "Vídeo" },
  { value: "live", label: "Live" },
  { value: "carrossel", label: "Carrossel" },
];

const STATUS_POST: { value: MTPostStatus; label: string }[] = [
  { value: "pendente", label: "Pendente" },
  { value: "publicado", label: "Publicado" },
  { value: "aprovado", label: "Aprovado" },
  { value: "rejeitado", label: "Rejeitado" },
];

export default function InfluenciadoraPostEdit() {
  const { influenciadoraId, postId } = useParams();
  const navigate = useNavigate();
  const { tenant } = useTenantContext();
  const { posts, createPost, updatePost } = useInfluencerPostsMT({
    influencer_id: influenciadoraId,
  });
  const { contracts } = useInfluencerContractsMT({ influencer_id: influenciadoraId });
  const { influenciadoras } = useInfluenciadorasAdapter();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hashtagsText, setHashtagsText] = useState("");
  const [formData, setFormData] = useState<Partial<MTPostCreate>>({
    platform: "instagram",
    post_type: "post_feed",
    status: "pendente",
    likes_count: 0,
    comments_count: 0,
    shares_count: 0,
    views_count: 0,
  });

  const isEditing = !!postId;
  const post = isEditing ? posts?.find(p => p.id === postId) : null;
  const influenciadora = influenciadoras?.find(i => i.id === influenciadoraId);

  // Calcular engagement rate automaticamente
  const calcularEngagement = () => {
    const likes = formData.likes_count || 0;
    const comments = formData.comments_count || 0;
    const shares = formData.shares_count || 0;
    const views = formData.views_count || 0;

    if (views === 0) return 0;
    const totalInteractions = likes + comments + shares;
    return Number(((totalInteractions / views) * 100).toFixed(2));
  };

  const engagementRate = calcularEngagement();

  useEffect(() => {
    if (post) {
      setFormData({
        platform: post.platform,
        post_type: post.post_type,
        post_url: post.post_url ?? undefined,
        content: post.content ?? undefined,
        contract_id: post.contract_id ?? undefined,
        scheduled_date: post.scheduled_date?.split('T')[0] || undefined,
        published_at: post.published_at?.split('T')[0] || undefined,
        likes_count: post.likes_count,
        comments_count: post.comments_count,
        shares_count: post.shares_count,
        views_count: post.views_count,
        status: post.status,
      });

      if (post.hashtags && post.hashtags.length > 0) {
        setHashtagsText(post.hashtags.join(' '));
      }
    }
  }, [post]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!influenciadoraId || !tenant) {
      toast.error("Dados incompletos");
      return;
    }

    if (!formData.platform || !formData.post_type) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }

    setIsSubmitting(true);

    try {
      // Processar hashtags
      const hashtags = hashtagsText
        .split(/[\s,]+/)
        .filter(tag => tag.trim() !== '')
        .map(tag => tag.startsWith('#') ? tag : `#${tag}`);

      const postData: MTPostCreate = {
        influencer_id: influenciadoraId,
        platform: formData.platform!,
        post_type: formData.post_type!,
        post_url: formData.post_url ?? undefined,
        content: formData.content ?? undefined,
        hashtags: hashtags.length > 0 ? hashtags : undefined,
        contract_id: formData.contract_id ?? undefined,
        scheduled_date: formData.scheduled_date ?? undefined,
        published_at: formData.published_at ?? undefined,
        likes_count: formData.likes_count ?? 0,
        comments_count: formData.comments_count ?? 0,
        shares_count: formData.shares_count ?? 0,
        views_count: formData.views_count ?? 0,
        status: formData.status ?? 'pendente',
      };

      if (isEditing && postId) {
        await updatePost.mutateAsync({ id: postId, ...postData });
        toast.success("Post atualizado!");
      } else {
        await createPost.mutateAsync(postData);
        toast.success("Post criado!");
      }

      navigate(`/influenciadoras/${influenciadoraId}`);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Erro ao salvar post");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!influenciadora) {
    return (
      <DashboardLayout>
        <div className="container mx-auto py-6">
          <Skeleton className="h-8 w-64 mb-6" />
          <Skeleton className="h-96" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto py-6">
        <div className="mb-6">
          <Link to={`/influenciadoras/${influenciadoraId}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar para {influenciadora.nome_artistico || influenciadora.nome_completo}
            </Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{isEditing ? "Editar" : "Novo"} Post</CardTitle>
            <CardDescription>
              {isEditing ? "Atualizar informações do" : "Registrar um novo"} post de {influenciadora.nome_artistico || influenciadora.nome_completo}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Plataforma e Tipo */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="platform">Plataforma *</Label>
                  <Select
                    value={formData.platform}
                    onValueChange={(value) => setFormData({ ...formData, platform: value as MTPostPlatform })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a plataforma" />
                    </SelectTrigger>
                    <SelectContent>
                      {PLATAFORMAS.map((plat) => (
                        <SelectItem key={plat.value} value={plat.value}>
                          {plat.emoji} {plat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="post_type">Tipo de Post *</Label>
                  <Select
                    value={formData.post_type}
                    onValueChange={(value) => setFormData({ ...formData, post_type: value as MTPostType })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {TIPOS_POST.map((tipo) => (
                        <SelectItem key={tipo.value} value={tipo.value}>
                          {tipo.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Contrato */}
              <div className="space-y-2">
                <Label htmlFor="contract_id">Contrato (opcional)</Label>
                <Select
                  value={formData.contract_id || "none"}
                  onValueChange={(value) => setFormData({ ...formData, contract_id: value === "none" ? undefined : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um contrato" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem contrato vinculado</SelectItem>
                    {contracts?.map((contrato) => (
                      <SelectItem key={contrato.id} value={contrato.id}>
                        {contrato.tipo.charAt(0).toUpperCase() + contrato.tipo.slice(1)} - {contrato.franchise?.nome_fantasia || 'Global'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* URL do Post */}
              <div className="space-y-2">
                <Label htmlFor="post_url">URL do Post</Label>
                <Input
                  id="post_url"
                  type="url"
                  value={formData.post_url || ""}
                  onChange={(e) => setFormData({ ...formData, post_url: e.target.value })}
                  placeholder="https://instagram.com/p/..."
                />
              </div>

              {/* Conteúdo */}
              <div className="space-y-2">
                <Label htmlFor="content">Legenda/Descrição</Label>
                <Textarea
                  id="content"
                  value={formData.content || ""}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Texto da publicação..."
                  rows={4}
                />
              </div>

              {/* Hashtags */}
              <div className="space-y-2">
                <Label htmlFor="hashtags">Hashtags</Label>
                <Textarea
                  id="hashtags"
                  value={hashtagsText}
                  onChange={(e) => setHashtagsText(e.target.value)}
                  placeholder="#viniun #imoveis #negocios"
                  rows={2}
                />
                <p className="text-xs text-muted-foreground">
                  Separe as hashtags por espaço ou vírgula
                </p>
              </div>

              {/* Datas */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="scheduled_date">Data Agendada</Label>
                  <Input
                    id="scheduled_date"
                    type="date"
                    value={formData.scheduled_date || ""}
                    onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="published_at">Data de Publicação</Label>
                  <Input
                    id="published_at"
                    type="date"
                    value={formData.published_at || ""}
                    onChange={(e) => setFormData({ ...formData, published_at: e.target.value })}
                  />
                </div>
              </div>

              {/* Métricas */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-base">Métricas de Engajamento</Label>
                  {engagementRate > 0 && (
                    <Badge variant="outline" className="gap-1">
                      <TrendingUp className="h-3 w-3" />
                      {engagementRate}% de engajamento
                    </Badge>
                  )}
                </div>
                <div className="grid grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="likes_count">Likes</Label>
                    <Input
                      id="likes_count"
                      type="number"
                      value={formData.likes_count || 0}
                      onChange={(e) => setFormData({ ...formData, likes_count: parseInt(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="comments_count">Comentários</Label>
                    <Input
                      id="comments_count"
                      type="number"
                      value={formData.comments_count || 0}
                      onChange={(e) => setFormData({ ...formData, comments_count: parseInt(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="shares_count">Compartilhamentos</Label>
                    <Input
                      id="shares_count"
                      type="number"
                      value={formData.shares_count || 0}
                      onChange={(e) => setFormData({ ...formData, shares_count: parseInt(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="views_count">Visualizações</Label>
                    <Input
                      id="views_count"
                      type="number"
                      value={formData.views_count || 0}
                      onChange={(e) => setFormData({ ...formData, views_count: parseInt(e.target.value) })}
                    />
                  </div>
                </div>
              </div>

              {/* Status */}
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value as MTPostStatus })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_POST.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Ações */}
              <div className="flex gap-3">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      {isEditing ? "Atualizar" : "Criar"} Post
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate(`/influenciadoras/${influenciadoraId}`)}
                  disabled={isSubmitting}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
