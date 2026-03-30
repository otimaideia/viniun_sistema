import { Link } from 'react-router-dom';
import { Tag, Bell, ArrowRight, Sparkles, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { SEOHead } from '@/components/novosite/SEOHead';
import { Breadcrumbs } from '@/components/novosite/Breadcrumbs';

const WHATSAPP_URL = 'https://wa.me/5513991888100?text=Ol%C3%A1!%20Gostaria%20de%20saber%20sobre%20as%20promo%C3%A7%C3%B5es%20da%20YESlaser.';

export default function SitePromocoes() {
  return (
    <>
      <SEOHead
        title="Promocoes"
        description="Confira as promocoes e ofertas especiais da YESlaser Praia Grande. Descontos em depilacao a laser, estetica facial e corporal."
      />

      {/* Hero */}
      <section className="bg-gradient-to-br from-[#6B2D8B] to-[#5A2574] text-white py-16 md:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Badge className="bg-white/20 text-white border-white/30 mb-4">
            <Tag className="h-3 w-3 mr-1" />
            Ofertas Especiais
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Promocoes YESlaser
          </h1>
          <p className="text-lg md:text-xl text-purple-100 max-w-2xl mx-auto">
            Aproveite nossas ofertas exclusivas em depilacao a laser e tratamentos esteticos.
          </p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumbs items={[{ label: 'Promocoes' }]} />

        {/* Coming Soon */}
        <section className="py-16 md:py-24">
          <div className="max-w-2xl mx-auto text-center">
            <div className="w-20 h-20 rounded-full bg-[#6B2D8B]/10 flex items-center justify-center mx-auto mb-6">
              <Sparkles className="h-10 w-10 text-[#6B2D8B]" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Em breve, novas promocoes!
            </h2>
            <p className="text-gray-600 leading-relaxed mb-8">
              Estamos preparando ofertas incriveis para voce. Cadastre-se abaixo para ser
              o(a) primeiro(a) a saber quando lancamos novas promocoes e descontos exclusivos.
            </p>

            {/* Placeholder for promo cards grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-12">
              <Card className="border-dashed border-2 border-gray-200">
                <CardContent className="p-6 flex flex-col items-center justify-center h-48 text-muted-foreground">
                  <Tag className="h-8 w-8 mb-2 opacity-40" />
                  <p className="text-sm">Promocao em breve</p>
                </CardContent>
              </Card>
              <Card className="border-dashed border-2 border-gray-200">
                <CardContent className="p-6 flex flex-col items-center justify-center h-48 text-muted-foreground">
                  <Tag className="h-8 w-8 mb-2 opacity-40" />
                  <p className="text-sm">Promocao em breve</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Newsletter CTA */}
        <section className="py-12 md:py-16 border-t">
          <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50 to-white">
            <CardContent className="p-8 md:p-12">
              <div className="max-w-xl mx-auto text-center">
                <div className="w-14 h-14 rounded-full bg-[#6B2D8B]/10 flex items-center justify-center mx-auto mb-4">
                  <Bell className="h-7 w-7 text-[#6B2D8B]" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  Receba nossas promocoes
                </h3>
                <p className="text-gray-600 mb-6">
                  Cadastre seu e-mail e seja avisado(a) sobre novas ofertas e descontos exclusivos.
                </p>
                <form
                  className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto"
                  onSubmit={(e) => {
                    e.preventDefault();
                    // Placeholder - to be implemented with actual newsletter subscription
                  }}
                >
                  <Input
                    type="email"
                    placeholder="Seu melhor e-mail"
                    className="flex-1"
                    required
                  />
                  <Button type="submit" className="bg-[#6B2D8B] hover:bg-[#5A2574]">
                    <Bell className="h-4 w-4 mr-2" />
                    Cadastrar
                  </Button>
                </form>
                <p className="text-xs text-muted-foreground mt-3">
                  Voce pode cancelar a inscricao a qualquer momento. Veja nossa{' '}
                  <Link to="/novosite/privacidade" className="text-[#6B2D8B] hover:underline">
                    Politica de Privacidade
                  </Link>
                  .
                </p>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* WhatsApp CTA */}
        <section className="py-12 md:py-16">
          <div className="bg-gradient-to-br from-[#6B2D8B] to-[#5A2574] rounded-2xl p-8 md:p-12 text-center text-white">
            <Clock className="h-10 w-10 mx-auto mb-4 text-purple-200" />
            <h2 className="text-3xl font-bold mb-4">
              Nao quer esperar?
            </h2>
            <p className="text-purple-100 max-w-2xl mx-auto mb-8">
              Fale diretamente com nossa equipe pelo WhatsApp e pergunte sobre
              condicoes especiais e pacotes promocionais disponiveis agora.
            </p>
            <Button
              asChild
              size="lg"
              className="bg-white text-[#6B2D8B] hover:bg-purple-50 font-semibold"
            >
              <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
                Falar com a equipe
                <ArrowRight className="h-4 w-4 ml-2" />
              </a>
            </Button>
          </div>
        </section>
      </div>
    </>
  );
}
