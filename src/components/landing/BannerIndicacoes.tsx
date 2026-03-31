import { Link } from "react-router-dom";
import { Gift, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const BannerIndicacoes = () => {
  return (
    <section className="py-12 bg-gradient-to-r from-yellow-400 via-orange-400 to-pink-500">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full text-white mb-4">
            <Gift className="w-5 h-5" />
            <span className="font-semibold text-sm uppercase tracking-wide">Oferta Especial</span>
          </div>

          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Prefere <span className="text-yellow-200">GANHAR</span> benefícios exclusivos?
          </h2>

          <p className="text-white/90 text-lg mb-6 max-w-xl mx-auto">
            Cadastre-se e indique 5 amigos para ganhar{" "}
            <strong className="text-white">benefícios exclusivos GRÁTIS!</strong>
          </p>

          <Link to="/lp/indicacoes">
            <Button
              size="lg"
              variant="secondary"
              className="bg-white text-primary hover:bg-white/90 font-bold uppercase tracking-wide py-4 sm:py-6 px-4 sm:px-8 text-sm sm:text-base md:text-lg shadow-lg hover:shadow-xl transition-all w-full sm:w-auto"
            >
              <span className="truncate">Ver Promoção de Indicações</span>
              <ArrowRight className="ml-2 w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default BannerIndicacoes;
