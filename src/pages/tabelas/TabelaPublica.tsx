// Página PÚBLICA de uma Tabela compartilhável (mt_network_tables visibilidade=publica)
// Serve cliente final E corretor. Sem login, sem multi-tenant. Distribuição: PDF + WhatsApp + Instagram.

import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  MapPin, BedDouble, Car, Bath, Waves, MessageCircle, Instagram,
  Building2, Download, Share2, Copy, Check, FileText, Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useTabelaPublica, type TabelaPublicaItem } from '@/hooks/public/useTabelasPublicas';
import { downloadTabelaPdf } from '@/lib/tabelaPdf';

const WHATSAPP_NUMERO = '5513991888100'; // ⚠️ CONFIGURAR número real do viniun
const INSTAGRAM = [
  { handle: 'tabelaspraiagrande', url: 'https://www.instagram.com/tabelaspraiagrande' },
  { handle: 'tabelasdeimoveis', url: 'https://www.instagram.com/tabelasdeimoveis' },
];

const brl = (v: number | null) =>
  v == null ? 'Sob consulta' : v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

const wa = (msg: string) => `https://wa.me/${WHATSAPP_NUMERO}?text=${encodeURIComponent(msg)}`;

function ItemCard({ item }: { item: TabelaPublicaItem }) {
  const msg = `Olá! Tenho interesse no imóvel ${item.ref_code ? `(Ref ${item.ref_code}) ` : ''}${item.titulo ?? ''} — ${brl(item.valor_rede || item.valor_venda)}.`;
  return (
    <Card className="overflow-hidden group hover:shadow-xl transition-shadow">
      <div className="relative aspect-[4/3] bg-muted overflow-hidden">
        {item.foto ? (
          <img src={item.foto} alt={item.titulo ?? 'Imóvel'} loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground"><Building2 className="h-12 w-12" /></div>
        )}
        {item.lancamento && (
          <Badge className="absolute top-2 left-2 bg-amber-500 hover:bg-amber-500"><Sparkles className="h-3 w-3 mr-1" />Lançamento</Badge>
        )}
      </div>
      <CardContent className="p-4 space-y-3">
        <div>
          <div className="flex items-center text-sm text-muted-foreground gap-1">
            <MapPin className="h-3.5 w-3.5" />{item.bairro ?? '—'}{item.cidade ? `, ${item.cidade}` : ''}
          </div>
          <h3 className="font-semibold leading-tight line-clamp-2 mt-1">{item.titulo ?? 'Imóvel'}</h3>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
          {item.dormitorios != null && <span className="flex items-center gap-1"><BedDouble className="h-4 w-4" />{item.dormitorios} dorm</span>}
          {item.banheiros != null && <span className="flex items-center gap-1"><Bath className="h-4 w-4" />{item.banheiros}</span>}
          {item.garagens != null && <span className="flex items-center gap-1"><Car className="h-4 w-4" />{item.garagens}</span>}
          {item.distancia_praia != null && <span className="flex items-center gap-1"><Waves className="h-4 w-4" />{item.distancia_praia}m</span>}
        </div>
        <div className="flex items-end justify-between pt-1">
          <div>
            <div className="text-xs text-muted-foreground">Valor</div>
            <div className="text-xl font-bold text-primary">{brl(item.valor_rede || item.valor_venda)}</div>
          </div>
          <Button asChild size="sm">
            <a href={wa(msg)} target="_blank" rel="noopener noreferrer"><MessageCircle className="h-4 w-4 mr-1" />Tenho interesse</a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function TabelaPublica() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, isError } = useTabelaPublica(id);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (data?.tabela) {
      document.title = `${data.tabela.nome} | Tabela de Imóveis - Viniun`;
    }
  }, [data]);

  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';

  const copiarLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success('Link copiado!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Não foi possível copiar');
    }
  };

  const captionInstagram = () => {
    if (!data) return;
    const linhas = [
      `🏖️ ${data.tabela.nome}`,
      data.tabela.descricao ?? '',
      '',
      ...data.itens.slice(0, 6).map(i => `📍 ${i.bairro ?? ''} • ${i.dormitorios ?? '?'} dorm • ${brl(i.valor_rede || i.valor_venda)}`),
      '',
      '📲 Receba a tabela completa no WhatsApp (link na bio)',
      `#praiagrande #imoveis #lancamentos #tabelasdeimoveis ${INSTAGRAM.map(i => '#' + i.handle).join(' ')}`,
    ];
    const caption = linhas.join('\n');
    navigator.clipboard.writeText(caption).then(
      () => toast.success('Legenda do Instagram copiada!'),
      () => toast.error('Não foi possível copiar'),
    );
  };

  const baixarPdf = () => {
    if (!data) return;
    downloadTabelaPdf(data.tabela, data.itens, { whatsapp: '(13) 99188-8100', site: 'viniun.com.br' });
    toast.success('Gerando PDF...');
  };

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" /></div>;
  }
  if (isError || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center px-4">
        <Building2 className="h-12 w-12 text-muted-foreground mb-3" />
        <h1 className="text-xl font-bold">Tabela não encontrada</h1>
        <p className="text-muted-foreground mt-1">Este link pode ter expirado ou não está mais público.</p>
      </div>
    );
  }

  const { tabela, itens } = data;
  const compartilharMsg = `Confira a tabela "${tabela.nome}": ${shareUrl}`;

  return (
    <div className="min-h-screen bg-background">
      {/* HEADER */}
      <header className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
        <div className="max-w-6xl mx-auto px-4 py-12">
          <Badge className="bg-white/20 hover:bg-white/20 text-white mb-3"><Waves className="h-3.5 w-3.5 mr-1" />Praia Grande</Badge>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight max-w-3xl">{tabela.nome}</h1>
          {tabela.descricao && <p className="mt-3 text-white/90 max-w-2xl">{tabela.descricao}</p>}
          <div className="mt-4 text-sm text-white/80">
            {itens.length} imóveis
            {tabela.validade_fim && ` • válida até ${new Date(tabela.validade_fim).toLocaleDateString('pt-BR')}`}
          </div>

          {/* Barra de distribuição */}
          <div className="mt-6 flex flex-wrap gap-2">
            <Button onClick={baixarPdf} variant="secondary" size="sm"><Download className="h-4 w-4 mr-1" />Baixar PDF</Button>
            <Button asChild variant="secondary" size="sm">
              <a href={wa(compartilharMsg)} target="_blank" rel="noopener noreferrer"><MessageCircle className="h-4 w-4 mr-1" />Enviar no WhatsApp</a>
            </Button>
            <Button onClick={captionInstagram} variant="outline" size="sm" className="bg-transparent text-white border-white/40 hover:bg-white/10 hover:text-white">
              <Instagram className="h-4 w-4 mr-1" />Legenda Instagram
            </Button>
            <Button onClick={copiarLink} variant="outline" size="sm" className="bg-transparent text-white border-white/40 hover:bg-white/10 hover:text-white">
              {copied ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}Copiar link
            </Button>
          </div>
        </div>
      </header>

      {/* GRID */}
      <main className="max-w-6xl mx-auto px-4 py-12">
        {itens.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground"><FileText className="h-12 w-12 mx-auto mb-3" />Tabela sem imóveis.</div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {itens.map(it => <ItemCard key={it.id} item={it} />)}
          </div>
        )}

        <div className="mt-16 rounded-2xl bg-primary text-primary-foreground p-8 sm:p-12 text-center">
          <h2 className="text-2xl font-bold flex items-center justify-center gap-2"><Share2 className="h-6 w-6" />Quer condições especiais?</h2>
          <p className="mt-2 text-white/90">Fale com a nossa equipe e garanta as melhores condições destas unidades.</p>
          <Button asChild size="lg" variant="secondary" className="mt-6">
            <a href={wa(`Olá! Vi a tabela "${tabela.nome}" e quero mais informações.`)} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="h-5 w-5 mr-2" />Falar no WhatsApp
            </a>
          </Button>
        </div>
      </main>

      <footer className="border-t py-8">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-sm text-muted-foreground">© 2026 Viniun — Tabelas de Imóveis Praia Grande</div>
          <div className="flex items-center gap-4">
            {INSTAGRAM.map(ig => (
              <a key={ig.handle} href={ig.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary">
                <Instagram className="h-4 w-4" />@{ig.handle}
              </a>
            ))}
          </div>
        </div>
      </footer>

      <a href={wa(`Olá! Quero a tabela "${tabela.nome}".`)} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp"
        className="fixed bottom-5 right-5 z-50 flex items-center justify-center h-14 w-14 rounded-full bg-green-500 text-white shadow-lg hover:bg-green-600 transition-colors">
        <MessageCircle className="h-7 w-7" />
      </a>
    </div>
  );
}
