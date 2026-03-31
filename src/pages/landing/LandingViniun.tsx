import { Helmet } from 'react-helmet-async';
import {
  ViniunHeader,
  ViniunHero,
  ViniunStats,
  ViniunFeatures,
  ViniunModules,
  ViniunPricing,
  ViniunTestimonials,
  ViniunFAQ,
  ViniunFooter,
  ViniunWhatsAppButton,
} from '@/components/landing-viniun';

export default function LandingViniun() {
  return (
    <>
      <Helmet>
        <title>Viniun | Plataforma de Gestão Imobiliária</title>
        <meta
          name="description"
          content="Sistema completo para imobiliárias, incorporadoras e corretoras. CRM, Funil de Vendas, WhatsApp, Agendamentos e muito mais."
        />
        <meta
          property="og:title"
          content="Viniun | Plataforma de Gestão Imobiliária"
        />
        <meta
          property="og:description"
          content="Sistema completo para imobiliárias, incorporadoras e corretoras. CRM, Funil de Vendas, WhatsApp, Agendamentos e muito mais."
        />
        <meta property="og:type" content="website" />
      </Helmet>

      <ViniunHeader />
      <main>
        <ViniunHero />
        <ViniunStats />
        <ViniunFeatures />
        <ViniunModules />
        <ViniunPricing />
        <ViniunTestimonials />
        <ViniunFAQ />
      </main>
      <ViniunFooter />
      <ViniunWhatsAppButton />
    </>
  );
}
