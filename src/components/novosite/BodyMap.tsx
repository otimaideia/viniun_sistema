import { useState } from 'react';
import { BodyMapFemale } from './BodyMapFemale';
import { BodyMapMale } from './BodyMapMale';
import { cn } from '@/lib/utils';

type Gender = 'feminino' | 'masculino';

interface BodyMapProps {
  onAreaClick?: (areaCode: string) => void;
  priceData?: Record<string, { minPrice: number; size: string }>;
}

export function BodyMap({ onAreaClick, priceData }: BodyMapProps) {
  const [gender, setGender] = useState<Gender>('feminino');

  return (
    <div className="w-full max-w-[500px] mx-auto">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-1">
          Escolha a região do corpo
        </h2>
        <p className="text-sm text-gray-500">
          Passe o mouse para ver os preços
        </p>
      </div>

      {/* Gender Toggle */}
      <div className="flex justify-center mb-6">
        <div className="inline-flex rounded-full bg-gray-100 p-1 gap-1">
          <button
            onClick={() => setGender('feminino')}
            className={cn(
              'px-6 py-2 rounded-full text-sm font-medium transition-all duration-200',
              gender === 'feminino'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-gray-600 hover:text-gray-900'
            )}
          >
            Feminino
          </button>
          <button
            onClick={() => setGender('masculino')}
            className={cn(
              'px-6 py-2 rounded-full text-sm font-medium transition-all duration-200',
              gender === 'masculino'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-gray-600 hover:text-gray-900'
            )}
          >
            Masculino
          </button>
        </div>
      </div>

      {/* Body Map SVG */}
      <div className="flex justify-center">
        {gender === 'feminino' ? (
          <BodyMapFemale onAreaClick={onAreaClick} priceData={priceData} />
        ) : (
          <BodyMapMale onAreaClick={onAreaClick} priceData={priceData} />
        )}
      </div>
    </div>
  );
}
