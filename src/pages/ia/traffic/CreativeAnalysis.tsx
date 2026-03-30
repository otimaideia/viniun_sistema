import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Palette, ImageIcon, BarChart3, Sparkles } from 'lucide-react';
import { useTenantContext } from '@/contexts/TenantContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function CreativeAnalysis() {
  const navigate = useNavigate();
  const { tenant } = useTenantContext();

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link to="/ia" className="hover:text-foreground flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" />
          YESia
        </Link>
        <span>/</span>
        <Link to="/ia/trafego" className="hover:text-foreground">
          Trafego
        </Link>
        <span>/</span>
        <span className="text-foreground">Criativos</span>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Analise de Criativos</h1>
        <p className="text-muted-foreground">
          Performance dos criativos de anuncios
          {tenant && ` - ${tenant.nome_fantasia}`}
        </p>
      </div>

      {/* Coming Soon */}
      <Card className="border-dashed">
        <CardContent className="py-16 text-center">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-6">
            <Palette className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Analise de Criativos - Em breve</h2>
          <p className="text-muted-foreground max-w-md mx-auto mb-8">
            Em breve voce podera analisar a performance de cada criativo de anuncio, comparar
            variacoes de imagens e textos, e receber sugestoes de otimizacao da IA.
          </p>

          <div className="grid gap-4 md:grid-cols-3 max-w-2xl mx-auto mb-8">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2 justify-center">
                  <ImageIcon className="h-4 w-4" />
                  Galeria de Criativos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Visualize todos os criativos com metricas de performance individuais.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2 justify-center">
                  <BarChart3 className="h-4 w-4" />
                  Teste A/B
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Compare variacoes de criativos e identifique os melhores performers.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2 justify-center">
                  <Sparkles className="h-4 w-4" />
                  Sugestoes IA
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Receba sugestoes inteligentes para melhorar seus criativos.
                </p>
              </CardContent>
            </Card>
          </div>

          <Button variant="outline" onClick={() => navigate('/ia/trafego')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar ao Trafego
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
