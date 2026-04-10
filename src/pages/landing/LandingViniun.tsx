import { useEffect } from 'react';
import {
  ViniunHeader,
  ViniunHero,
  ViniunStats,
  ViniunFeatures,
  ViniunModules,
  ViniunAppMobile,
  ViniunPricing,
  ViniunTestimonials,
  ViniunFAQ,
  ViniunFooter,
  ViniunWhatsAppButton,
} from '@/components/landing-viniun';

export default function LandingViniun() {
  useEffect(() => {
    document.title = 'Viniun | Plataforma de Gestão Imobiliária';
  }, []);

  return (
    <>
      <ViniunHeader />
      <main>
        <ViniunHero />
        <ViniunStats />
        <ViniunFeatures />
        <ViniunModules />
        <ViniunAppMobile />
        <ViniunPricing />
        <ViniunTestimonials />
        <ViniunFAQ />
      </main>
      <ViniunFooter />
      <ViniunWhatsAppButton />
    </>
  );
}
