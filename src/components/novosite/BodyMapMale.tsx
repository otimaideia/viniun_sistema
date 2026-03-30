import { useState, useRef } from 'react';

interface BodyMapProps {
  onAreaClick?: (areaCode: string) => void;
  priceData?: Record<string, { minPrice: number; size: string }>;
}

interface BodyZone {
  code: string;
  label: string;
  path: string;
}

const ZONES: BodyZone[] = [
  {
    code: 'rosto_completo',
    label: 'Rosto',
    path: 'M 138,28 C 138,28 132,16 155,10 C 178,4 178,16 178,28 L 178,50 C 178,62 168,72 155,72 C 142,72 138,62 138,50 Z',
  },
  {
    code: 'barba',
    label: 'Barba',
    path: 'M 140,50 C 140,50 138,62 142,68 L 155,74 L 168,68 C 172,62 170,50 170,50 L 168,58 C 168,64 162,70 155,70 C 148,70 142,64 142,58 Z',
  },
  {
    code: 'ombros',
    label: 'Ombros',
    path: 'M 105,88 L 125,80 L 135,88 L 125,98 Z M 175,88 L 185,80 L 205,88 L 185,98 Z',
  },
  {
    code: 'peitoral_completo',
    label: 'Peitoral',
    path: 'M 128,90 L 182,90 L 185,125 L 125,125 Z',
  },
  {
    code: 'axilas',
    label: 'Axilas',
    path: 'M 108,100 L 118,90 L 126,100 L 118,112 Z M 184,100 L 192,90 L 202,100 L 192,112 Z',
  },
  {
    code: 'bracos',
    label: 'Braços',
    path: 'M 88,108 L 106,92 L 116,102 L 108,135 L 96,168 L 82,162 Z M 194,102 L 204,92 L 222,108 L 228,162 L 214,168 L 202,135 Z',
  },
  {
    code: 'maos',
    label: 'Mãos',
    path: 'M 74,170 L 96,162 L 92,188 L 70,190 Z M 214,162 L 236,170 L 240,190 L 218,188 Z',
  },
  {
    code: 'abdomen',
    label: 'Abdômen',
    path: 'M 128,128 L 182,128 L 182,180 C 182,186 172,190 155,190 C 138,190 128,186 128,180 Z',
  },
  {
    code: 'costas_superior',
    label: 'Costas Sup.',
    // Shown as subtle side-strip indicators since this is a front view
    path: 'M 122,90 L 128,90 L 128,125 L 122,125 Z M 182,90 L 188,90 L 188,125 L 182,125 Z',
  },
  {
    code: 'costas_inferior',
    label: 'Costas Inf.',
    path: 'M 122,128 L 128,128 L 128,180 L 122,180 Z M 182,128 L 188,128 L 188,180 L 182,180 Z',
  },
  {
    code: 'virilha_completa',
    label: 'Virilha',
    path: 'M 135,190 L 175,190 L 172,218 L 155,222 L 138,218 Z',
  },
  {
    code: 'coxas',
    label: 'Coxas',
    path: 'M 122,218 L 142,218 L 148,298 L 118,298 Z M 168,218 L 188,218 L 192,298 L 162,298 Z',
  },
  {
    code: 'pernas_completas',
    label: 'Pernas',
    path: 'M 118,302 L 148,302 L 150,405 L 115,405 Z M 162,302 L 192,302 L 195,405 L 160,405 Z',
  },
  {
    code: 'pes',
    label: 'Pés',
    path: 'M 112,408 L 152,408 L 155,428 L 108,428 Z M 158,408 L 198,408 L 202,428 L 155,428 Z',
  },
];

const formatCurrency = (value: number): string =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function BodyMapMale({ onAreaClick, priceData }: BodyMapProps) {
  const [activeArea, setActiveArea] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const handleMouseMove = (e: React.MouseEvent<SVGPathElement>, code: string) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    setTooltip({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top - 12,
    });
    setActiveArea(code);
  };

  const handleMouseLeave = () => {
    setActiveArea(null);
    setTooltip(null);
  };

  const activeZone = ZONES.find((z) => z.code === activeArea);
  const activePrice = activeArea && priceData?.[activeArea];

  return (
    <div className="relative select-none" style={{ width: 310, height: 440 }}>
      <svg
        ref={svgRef}
        viewBox="0 0 310 440"
        width="310"
        height="440"
        xmlns="http://www.w3.org/2000/svg"
        className="overflow-visible"
      >
        {/* Male body silhouette - broader shoulders, narrower hips */}
        <path
          d={`
            M 155,6
            C 172,3 182,12 182,30
            L 182,52
            C 182,66 172,76 162,78
            L 168,80
            C 180,82 195,86 205,90
            L 230,105
            L 240,165
            L 228,172
            L 212,168
            L 200,138
            L 192,115
            C 192,115 194,132 194,148
            L 196,185
            L 196,222
            L 200,300
            L 200,405
            L 205,430
            L 155,430
            L 160,405
            L 168,300
            L 172,222
            L 170,192
            L 155,196
            L 140,192
            L 138,222
            L 142,300
            L 150,405
            L 155,430
            L 105,430
            L 110,405
            L 110,300
            L 114,222
            L 114,185
            L 116,148
            C 116,132 118,115 118,115
            L 110,138
            L 98,168
            L 82,172
            L 70,165
            L 80,105
            L 105,90
            C 115,86 130,82 142,80
            L 148,78
            C 138,76 128,66 128,52
            L 128,30
            C 128,12 138,3 155,6
            Z
          `}
          fill="#f0ebe8"
          stroke="#cfc0b8"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />

        {/* Clickable zones */}
        {ZONES.map((zone) => (
          <path
            key={zone.code}
            d={zone.path}
            data-area={zone.code}
            fill={activeArea === zone.code ? 'rgba(107,45,139,0.25)' : 'transparent'}
            stroke={activeArea === zone.code ? 'rgba(107,45,139,0.6)' : 'transparent'}
            strokeWidth="1.5"
            className="cursor-pointer transition-colors duration-150"
            onMouseMove={(e) => handleMouseMove(e, zone.code)}
            onMouseLeave={handleMouseLeave}
            onClick={() => onAreaClick?.(zone.code)}
          />
        ))}

        {/* Zone labels */}
        {ZONES.map((zone) => {
          const center = getPathCenter(zone.path);
          if (!center) return null;
          return (
            <text
              key={`label-${zone.code}`}
              x={center.x}
              y={center.y}
              textAnchor="middle"
              dominantBaseline="central"
              className="pointer-events-none select-none"
              fill={activeArea === zone.code ? '#6B2D8B' : '#9ca3af'}
              fontSize="8"
              fontWeight={activeArea === zone.code ? '600' : '400'}
            >
              {zone.label}
            </text>
          );
        })}
      </svg>

      {/* Tooltip */}
      {activeArea && tooltip && activeZone && (
        <div
          className="absolute z-50 pointer-events-none"
          style={{
            left: tooltip.x,
            top: tooltip.y,
            transform: 'translate(-50%, -100%)',
          }}
        >
          <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg whitespace-nowrap">
            <div className="font-semibold text-sm">{activeZone.label}</div>
            {activePrice ? (
              <>
                <div className="text-gray-300 mt-0.5">Tamanho: {activePrice.size}</div>
                <div className="text-purple-300 font-medium mt-0.5">
                  a partir de {formatCurrency(activePrice.minPrice)}
                </div>
              </>
            ) : (
              <div className="text-gray-400 mt-0.5">Clique para ver preços</div>
            )}
            <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900" />
          </div>
        </div>
      )}
    </div>
  );
}

function getPathCenter(d: string): { x: number; y: number } | null {
  const nums = d.match(/-?\d+(\.\d+)?/g);
  if (!nums || nums.length < 2) return null;
  let sx = 0, sy = 0, n = 0;
  for (let i = 0; i < nums.length - 1; i += 2) {
    sx += parseFloat(nums[i]);
    sy += parseFloat(nums[i + 1]);
    n++;
  }
  return n ? { x: sx / n, y: sy / n } : null;
}
