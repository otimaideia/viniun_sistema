// Landing pública de Tabelas / Lançamentos — Praia Grande (cliente final)
// Standalone, SEM multi-tenant. Conversão via WhatsApp (modelo @tabelaspraiagrande).

import { useEffect, useMemo, useState } from 'react';
import {
  MapPin, BedDouble, Car, Bath, Waves, MessageCircle, Instagram,
  Building2, Sparkles, Search, ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  useTabelasPublicas, useTabelasBairros, useTabelasStats, type TabelaImovel,
} from '@/hooks/public/useTabelasPublicas';

// ⚠️ CONFIGURAR: número de WhatsApp real do viniun (formato internacional, só dígitos)
const WHATSAPP_NUMERO = '5513991888100';
const INSTAGRAM = [
  { handle: 'tabelaspraiagrande', url: 'https://www.instagram.com/tabelaspraiagrande' },
  { handle: 'tabelasdeimoveis', url: 'https://www.instagram.com/tabelasdeimoveis' },
];

const brl = (v: number | null) =>
  v == null ? 'Sob consulta' : v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

function whatsappLink(msg: string) {
  return `https://wa.me/${WHATSAPP_NUMERO}?text=${encodeURIComponent(msg)}`;
}

function ImovelCard({ imovel }: { imovel: TabelaImovel }) {
  const msg = `Olá! Tenho interesse no imóvel ${imovel.ref_code ? `(Ref ${imovel.ref_code}) ` : ''}${imovel.titulo ?? ''} — ${brl(imovel.valor_venda)}. Pode me enviar a tabela?`;
  return (
    <Card className="overflow-hidden group hover:shadow-xl transition-shadow">
      <div className="relative aspect-[4/3] bg-muted overflow-hidden">
        {imovel.foto ? (
          <img
            src={imovel.foto}
            alt={imovel.titulo ?? 'Imóvel'}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            <Building2 className="h-12 w-12" />
          </div>
        )}
        <div className="absolute top-2 left-2 flex gap-2">
          {imovel.lancamento && <Badge className="bg-amber-500 hover:bg-amber-500"><Sparkles className="h-3 w-3 mr-1" />Lançamento</Badge>}
          {imovel.destaque && !imovel.lancamento && <Badge variant="secondary">Destaque</Badge>}
        </div>
      </div>
      <CardContent className="p-4 space-y-3">
        <div>
          <div className="flex items-center text-sm text-muted-foreground gap-1">
            <MapPin className="h-3.5 w-3.5" />
            {imovel.bairro ?? '—'}{imovel.cidade ? `, ${imovel.cidade}` : ''}
          </div>
          <h3 className="font-semibold leading-tight line-clamp-2 mt-1">{imovel.titulo ?? 'Imóvel'}</h3>
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
          {imovel.dormitorios != null && <span className="flex items-center gap-1"><BedDouble className="h-4 w-4" />{imovel.dormitorios} dorm</span>}
          {imovel.banheiros != null && <span className="flex items-center gap-1"><Bath className="h-4 w-4" />{imovel.banheiros}</span>}
          {imovel.garagens != null && <span className="flex items-center gap-1"><Car className="h-4 w-4" />{imovel.garagens}</span>}
          {imovel.distancia_praia != null && <span className="flex items-center gap-1"><Waves className="h-4 w-4" />{imovel.distancia_praia}m da praia</span>}
        </div>

        <div className="flex items-end justify-between pt-1">
          <div>
            <div className="text-xs text-muted-foreground">A partir de</div>
            <div className="text-xl font-bold text-primary">{brl(imovel.valor_promocao || imovel.valor_venda)}</div>
          </div>
          <Button asChild size="sm">
            <a href={whatsappLink(msg)} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="h-4 w-4 mr-1" />Tabela
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function TabelasLanding() {
  const [bairroId, setBairroId] = useState<string>('all');
  const [dormitorios, setDormitorios] = useState<string>('all');
  const [valorMax, setValorMax] = useState<string>('all');
  const [somenteLancamentos, setSomenteLancamentos] = useState(false);

  const filters = useMemo(() => ({
    bairroId: bairroId === 'all' ? undefined : bairroId,
    dormitorios: dormitorios === 'all' ? undefined : Number(dormitorios),
    valorMax: valorMax === 'all' ? undefined : Number(valorMax),
    somenteLancamentos,
    limit: 24,
  }), [bairroId, dormitorios, valorMax, somenteLancamentos]);

  const { data: imoveis, isLoading } = useTabelasPublicas(filters);
  const { data: bairros } = useTabelasBairros();
  const { data: stats } = useTabelasStats();

  const heroMsg = 'Olá! Quero receber as tabelas de lançamentos de Praia Grande.';

  // SEO (padrão do projeto: manipulação direta do DOM, sem Helmet)
  useEffect(() => {
    document.title = 'Tabelas de Imóveis e Lançamentos em Praia Grande | Viniun';
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'description');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', 'As melhores tabelas de lançamentos e imóveis à venda em Praia Grande. Receba a tabela completa no WhatsApp.');
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* HERO */}
      <header className="relative bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
        <div className="max-w-6xl mx-auto px-4 py-16 sm:py-24">
          <Badge className="bg-white/20 hover:bg-white/20 text-white mb-4">
            <Waves className="h-3.5 w-3.5 mr-1" /> Praia Grande e Litoral
          </Badge>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight max-w-2xl">
            Tabelas de Lançamentos e Imóveis em Praia Grande
          </h1>
          <p className="mt-4 text-lg text-white/90 max-w-xl">
            Receba as tabelas completas com preços, plantas e condições direto no seu WhatsApp.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg" variant="secondary">
              <a href={whatsappLink(heroMsg)} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="h-5 w-5 mr-2" /> Receber tabelas no WhatsApp
              </a>
            </Button>
            <Button asChild size="lg" variant="outline" className="bg-transparent text-white border-white/40 hover:bg-white/10 hover:text-white">
              <a href="#imoveis"><Search className="h-5 w-5 mr-2" /> Ver imóveis</a>
            </Button>
          </div>

          {stats && (
            <div className="mt-10 flex flex-wrap gap-8">
              <div>
                <div className="text-3xl font-bold">{stats.totalImoveis.toLocaleString('pt-BR')}+</div>
                <div className="text-sm text-white/80">imóveis disponíveis</div>
              </div>
              <div>
                <div className="text-3xl font-bold">{stats.totalLancamentos.toLocaleString('pt-BR')}+</div>
                <div className="text-sm text-white/80">lançamentos</div>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* FILTROS + GRID */}
      <main id="imoveis" className="max-w-6xl mx-auto px-4 py-12">
        <div className="flex flex-col sm:flex-row sm:items-end gap-3 mb-8">
          <div className="flex-1">
            <label className="text-sm font-medium mb-1.5 block">Bairro</label>
            <Select value={bairroId} onValueChange={setBairroId}>
              <SelectTrigger><SelectValue placeholder="Todos os bairros" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os bairros</SelectItem>
                {bairros?.map(b => <SelectItem key={b.id} value={b.id}>{b.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="w-full sm:w-40">
            <label className="text-sm font-medium mb-1.5 block">Dormitórios</label>
            <Select value={dormitorios} onValueChange={setDormitorios}>
              <SelectTrigger><SelectValue placeholder="Qualquer" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Qualquer</SelectItem>
                <SelectItem value="1">1+</SelectItem>
                <SelectItem value="2">2+</SelectItem>
                <SelectItem value="3">3+</SelectItem>
                <SelectItem value="4">4+</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="w-full sm:w-48">
            <label className="text-sm font-medium mb-1.5 block">Valor até</label>
            <Select value={valorMax} onValueChange={setValorMax}>
              <SelectTrigger><SelectValue placeholder="Sem limite" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Sem limite</SelectItem>
                <SelectItem value="300000">R$ 300 mil</SelectItem>
                <SelectItem value="500000">R$ 500 mil</SelectItem>
                <SelectItem value="800000">R$ 800 mil</SelectItem>
                <SelectItem value="1500000">R$ 1,5 mi</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            variant={somenteLancamentos ? 'default' : 'outline'}
            onClick={() => setSomenteLancamentos(v => !v)}
            className="sm:mb-0"
          >
            <Sparkles className="h-4 w-4 mr-1" /> Lançamentos
          </Button>
        </div>

        {isLoading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-lg border bg-card animate-pulse">
                <div className="aspect-[4/3] bg-muted" />
                <div className="p-4 space-y-2">
                  <div className="h-4 bg-muted rounded w-2/3" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : imoveis && imoveis.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {imoveis.map(im => <ImovelCard key={im.id} imovel={im} />)}
          </div>
        ) : (
          <div className="text-center py-16 text-muted-foreground">
            <Building2 className="h-12 w-12 mx-auto mb-3" />
            <p>Nenhum imóvel encontrado com esses filtros.</p>
          </div>
        )}

        {/* CTA final */}
        <div className="mt-16 rounded-2xl bg-primary text-primary-foreground p-8 sm:p-12 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold">Não achou o que procurava?</h2>
          <p className="mt-2 text-white/90">Fale com a nossa equipe e receba uma seleção personalizada de tabelas.</p>
          <Button asChild size="lg" variant="secondary" className="mt-6">
            <a href={whatsappLink(heroMsg)} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="h-5 w-5 mr-2" /> Falar no WhatsApp <ArrowRight className="h-4 w-4 ml-1" />
            </a>
          </Button>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="border-t py-10">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-sm text-muted-foreground">© {2026} Viniun — Tabelas de Imóveis Praia Grande</div>
          <div className="flex items-center gap-4">
            {INSTAGRAM.map(ig => (
              <a key={ig.handle} href={ig.url} target="_blank" rel="noopener noreferrer"
                 className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary">
                <Instagram className="h-4 w-4" /> @{ig.handle}
              </a>
            ))}
          </div>
        </div>
      </footer>

      {/* WhatsApp flutuante */}
      <a
        href={whatsappLink(heroMsg)}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="WhatsApp"
        className="fixed bottom-5 right-5 z-50 flex items-center justify-center h-14 w-14 rounded-full bg-green-500 text-white shadow-lg hover:bg-green-600 transition-colors"
      >
        <MessageCircle className="h-7 w-7" />
      </a>
    </div>
  );
}
