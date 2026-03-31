import { Star } from 'lucide-react';

interface Testimonial {
  name: string;
  role: string;
  company: string;
  content: string;
  rating: number;
}

const testimonials: Testimonial[] = [
  {
    name: 'Carlos Mendes',
    role: 'Diretor Comercial',
    company: 'Mendes Imóveis',
    content:
      'O Viniun transformou nossa operação. Antes usávamos planilhas e perdíamos leads. Hoje temos controle total do funil e aumentamos nossas conversões em 40%.',
    rating: 5,
  },
  {
    name: 'Ana Paula Rodrigues',
    role: 'CEO',
    company: 'AR Incorporadora',
    content:
      'A integração com WhatsApp foi um divisor de águas. Nosso tempo de resposta caiu de horas para minutos e a satisfação dos clientes disparou.',
    rating: 5,
  },
  {
    name: 'Roberto Silva',
    role: 'Gerente de Vendas',
    company: 'Silva & Associados',
    content:
      'O sistema de agendamentos e o portal do corretor facilitaram muito a gestão da equipe. Cada corretor tem visão clara das suas metas e desempenho.',
    rating: 5,
  },
];

export default function ViniunTestimonials() {
  return (
    <section className="py-20 md:py-28 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-14">
          <h2 className="text-3xl md:text-4xl font-bold text-viniun-navy mb-4">
            Quem usa, recomenda
          </h2>
          <p className="text-gray-600 text-lg">
            Veja o que nossos clientes dizem sobre o Viniun
          </p>
        </div>

        {/* Testimonials grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {testimonials.map((t) => (
            <div
              key={t.name}
              className="bg-viniun-light rounded-2xl p-8 flex flex-col"
            >
              {/* Stars */}
              <div className="flex gap-1 mb-4">
                {Array.from({ length: t.rating }).map((_, i) => (
                  <Star
                    key={i}
                    className="h-4 w-4 fill-viniun-gold text-viniun-gold"
                  />
                ))}
              </div>

              {/* Content */}
              <p className="text-gray-700 text-sm leading-relaxed flex-1 mb-6">
                &ldquo;{t.content}&rdquo;
              </p>

              {/* Author */}
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-viniun-navy/10 flex items-center justify-center">
                  <span className="text-sm font-bold text-viniun-navy">
                    {t.name.charAt(0)}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-viniun-dark">
                    {t.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {t.role} - {t.company}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
