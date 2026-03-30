import { useEffect, useState } from "react";
import { ShoppingCart, X } from "lucide-react";

const SocialProofPopup = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [currentMessage, setCurrentMessage] = useState(0);

  // Nomes aleatórios para parecer mais real
  const firstNames = [
    "Ana", "Maria", "Fernanda", "Juliana", "Camila", "Beatriz", "Amanda", 
    "Larissa", "Gabriela", "Mariana", "Patricia", "Renata", "Carolina", 
    "Bruna", "Leticia", "Vanessa", "Priscila", "Tatiana", "Raquel", "Monica",
    "Carlos", "João", "Pedro", "Lucas", "Rafael", "Bruno", "Felipe", "André"
  ];

  const neighborhoods = [
    "Boqueirão", "Tupi", "Guilhermina", "Aviação", "Canto do Forte",
    "Ocian", "Mirim", "Vila Caiçara", "Santos", "São Vicente",
    "Gonzaga", "Embaré", "Pompéia", "Cubatão", "Guarujá"
  ];

  const actions = [
    "acabou de comprar",
    "garantiu sua promoção",
    "fez sua reserva",
    "acabou de se cadastrar",
    "entrou para o grupo VIP"
  ];

  const generateRandomMessage = () => {
    const name = firstNames[Math.floor(Math.random() * firstNames.length)];
    const neighborhood = neighborhoods[Math.floor(Math.random() * neighborhoods.length)];
    const action = actions[Math.floor(Math.random() * actions.length)];
    const minutesAgo = Math.floor(Math.random() * 15) + 1;
    
    return {
      name,
      neighborhood,
      action,
      minutesAgo
    };
  };

  const [messageData, setMessageData] = useState(generateRandomMessage());

  useEffect(() => {
    const showPopup = () => {
      setMessageData(generateRandomMessage());
      setIsVisible(true);

      // Esconder após 5 segundos
      setTimeout(() => {
        setIsVisible(false);
      }, 5000);
    };

    // Primeiro popup após 8 segundos
    const initialTimeout = setTimeout(showPopup, 8000);

    // Depois mostrar aleatoriamente entre 15-40 segundos
    const interval = setInterval(() => {
      showPopup();
    }, Math.random() * 25000 + 15000);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, []);

  if (!isVisible) return null;

  return (
    <div
      className={`fixed bottom-20 left-4 z-50 bg-white rounded-xl shadow-2xl p-4 max-w-[320px] border border-gray-100 animate-in slide-in-from-left-full duration-500 ${
        isVisible ? "" : "animate-out slide-out-to-left-full"
      }`}
    >
      {/* Botão fechar */}
      <button 
        onClick={() => setIsVisible(false)}
        className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="flex items-start gap-3">
        {/* Ícone */}
        <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center shadow-lg">
          <ShoppingCart className="w-6 h-6 text-white" />
        </div>
        
        {/* Conteúdo */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">
            {messageData.name} de {messageData.neighborhood}
          </p>
          <p className="text-sm text-gray-600">
            {messageData.action}!
          </p>
          <p className="text-xs text-gray-400 mt-1">
            há {messageData.minutesAgo} {messageData.minutesAgo === 1 ? 'minuto' : 'minutos'}
          </p>
        </div>
      </div>

      {/* Indicador de verificado */}
      <div className="flex items-center gap-1 mt-2 text-xs text-green-600">
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
        <span>Compra verificada</span>
      </div>
    </div>
  );
};

export default SocialProofPopup;
