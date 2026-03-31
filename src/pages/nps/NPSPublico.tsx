import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Star, CheckCircle2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { NPSResponse, NPSSurvey } from "@/hooks/multitenant/useNPSMT";

const NPS_EMOJIS = ['😡', '😠', '😤', '😟', '😐', '🙂', '😊', '😄', '😃', '🤩', '🥳'];
const NPS_COLORS = [
  '#EF4444', '#EF4444', '#F97316', '#F97316', '#EAB308', '#EAB308',
  '#84CC16', '#22C55E', '#22C55E', '#10B981', '#10B981',
];

function StarRating({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) {
  const [hovered, setHovered] = useState(0);

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(0)}
            className="p-1 transition-transform hover:scale-110"
          >
            <Star
              className={`h-7 w-7 transition-colors ${
                star <= (hovered || value)
                  ? 'fill-amber-400 text-amber-400'
                  : 'text-gray-300'
              }`}
            />
          </button>
        ))}
        {value > 0 && (
          <span className="text-sm text-muted-foreground ml-2">{value}/5</span>
        )}
      </div>
    </div>
  );
}

export default function NPSPublico() {
  const { token } = useParams<{ token: string }>();
  const [response, setResponse] = useState<NPSResponse | null>(null);
  const [survey, setSurvey] = useState<NPSSurvey | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [notFound, setNotFound] = useState(false);

  // Form state
  const [score, setScore] = useState<number | null>(null);
  const [ratingProfissional, setRatingProfissional] = useState(0);
  const [ratingConsultora, setRatingConsultora] = useState(0);
  const [ratingExperiencia, setRatingExperiencia] = useState(0);
  const [comentario, setComentario] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      if (!token) {
        setNotFound(true);
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('mt_nps_responses' as never)
          .select(`
            *,
            survey:mt_nps_surveys(
              id, nome, avaliar_profissional, avaliar_consultora,
              avaliar_experiencia, mensagem_agradecimento, google_review_url
            )
          `)
          .eq('token', token)
          .is('deleted_at', null)
          .single();

        if (error || !data) {
          setNotFound(true);
          return;
        }

        const npsResponse = data as NPSResponse & { survey: NPSSurvey };
        setResponse(npsResponse);
        setSurvey(npsResponse.survey);

        // Ja respondido
        if (npsResponse.respondido_em) {
          setSubmitted(true);
          setScore(npsResponse.score);
        }
      } catch {
        setNotFound(true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [token]);

  const handleSubmit = async () => {
    if (score === null) {
      toast.error('Por favor, selecione uma nota de 0 a 10');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('mt_nps_responses' as never)
        .update({
          score,
          rating_profissional: ratingProfissional || null,
          rating_consultora: ratingConsultora || null,
          rating_experiencia: ratingExperiencia || null,
          comentario: comentario || null,
          respondido_em: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('token', token);

      if (error) throw error;
      setSubmitted(true);
      toast.success('Obrigado pela sua avaliacao!');
    } catch {
      toast.error('Erro ao enviar avaliacao. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg">
          <CardContent className="p-8 space-y-4">
            <Skeleton className="h-8 w-3/4 mx-auto" />
            <Skeleton className="h-4 w-1/2 mx-auto" />
            <Skeleton className="h-24 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Not found
  if (notFound) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg">
          <CardContent className="p-8 text-center">
            <h1 className="text-xl font-bold mb-2">Pesquisa nao encontrada</h1>
            <p className="text-muted-foreground">
              Este link de avaliacao nao e valido ou ja expirou.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success screen
  if (submitted) {
    const mensagem = survey?.mensagem_agradecimento || 'Obrigado pela sua avaliacao! Sua opiniao e muito importante para nos.';
    const googleUrl = survey?.google_review_url;

    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg">
          <CardContent className="p-8 text-center space-y-6">
            <div className="h-16 w-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold mb-2">Obrigado!</h1>
              <p className="text-muted-foreground">{mensagem}</p>
            </div>

            {score !== null && score >= 9 && googleUrl && (
              <div className="space-y-3 pt-4 border-t">
                <p className="text-sm font-medium">
                  Ficamos felizes com sua nota! Poderia nos avaliar no Google tambem?
                </p>
                <Button asChild className="w-full">
                  <a href={googleUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Avaliar no Google
                  </a>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Main form
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardContent className="p-6 sm:p-8 space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold">Como foi sua experiencia?</h1>
            {response?.servico_nome && (
              <p className="text-muted-foreground">
                Servico: <span className="font-medium">{response.servico_nome}</span>
              </p>
            )}
            {response?.profissional_nome && (
              <p className="text-sm text-muted-foreground">
                Profissional: {response.profissional_nome}
              </p>
            )}
          </div>

          {/* NPS Score (0-10) */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-center block">
              De 0 a 10, qual a chance de voce nos recomendar?
            </label>
            <div className="flex flex-wrap justify-center gap-2">
              {Array.from({ length: 11 }, (_, i) => i).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setScore(n)}
                  className={`
                    w-12 h-12 rounded-xl text-lg font-bold transition-all
                    flex flex-col items-center justify-center
                    ${score === n
                      ? 'scale-110 shadow-lg ring-2 ring-offset-2'
                      : 'hover:scale-105 opacity-70 hover:opacity-100'
                    }
                  `}
                  style={{
                    backgroundColor: score === n ? NPS_COLORS[n] : `${NPS_COLORS[n]}30`,
                    color: score === n ? 'white' : NPS_COLORS[n],
                    ringColor: score === n ? NPS_COLORS[n] : undefined,
                  }}
                >
                  <span className="text-xs leading-none">{NPS_EMOJIS[n]}</span>
                  <span className="text-sm">{n}</span>
                </button>
              ))}
            </div>
            <div className="flex justify-between text-xs text-muted-foreground px-1">
              <span>Nada provavel</span>
              <span>Muito provavel</span>
            </div>
          </div>

          {/* Optional ratings */}
          <div className="space-y-4 pt-2">
            {survey?.avaliar_profissional && (
              <StarRating
                label="Avaliacao do Profissional"
                value={ratingProfissional}
                onChange={setRatingProfissional}
              />
            )}
            {survey?.avaliar_consultora && (
              <StarRating
                label="Avaliacao da Consultora"
                value={ratingConsultora}
                onChange={setRatingConsultora}
              />
            )}
            {survey?.avaliar_experiencia && (
              <StarRating
                label="Experiencia Geral"
                value={ratingExperiencia}
                onChange={setRatingExperiencia}
              />
            )}
          </div>

          {/* Comment */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Comentario (opcional)
            </label>
            <Textarea
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              placeholder="Conte-nos mais sobre sua experiencia..."
              rows={3}
            />
          </div>

          {/* Submit */}
          <Button
            onClick={handleSubmit}
            disabled={score === null || isSubmitting}
            className="w-full h-12 text-base"
          >
            {isSubmitting ? 'Enviando...' : 'Enviar Avaliacao'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
