interface Stat {
  value: string;
  label: string;
}

const stats: Stat[] = [
  { value: '500+', label: 'Imoveis Gerenciados' },
  { value: '50+', label: 'Imobiliarias' },
  { value: '10.000+', label: 'Leads Captados' },
  { value: '98%', label: 'Satisfacao dos Clientes' },
];

export default function ViniunStats() {
  return (
    <section className="bg-viniun-navy py-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-4xl md:text-5xl font-bold text-white mb-2">
                {stat.value}
              </p>
              <p className="text-sm text-white/80">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
