import { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, CheckCircle2, XCircle, Loader2, BookOpen,
  Trophy, AlertCircle, Clock, Star, RotateCcw,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { useTenantContext } from '@/contexts/TenantContext';
import { useQuizMT, useMyQuizAttemptsMT, useSubmitQuizMT } from '@/hooks/multitenant/useTrainingQuizMT';
import type { QuizRespostas, MTTrainingQuizAttempt } from '@/types/treinamento';

export default function QuizPlayer() {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const { isLoading: isTenantLoading } = useTenantContext();
  const { data: quiz, isLoading: isQuizLoading } = useQuizMT(quizId);
  const { attempts, isLoading: isAttemptsLoading } = useMyQuizAttemptsMT(quizId);
  const submitQuiz = useSubmitQuizMT();

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [startTime] = useState(Date.now());
  const [result, setResult] = useState<MTTrainingQuizAttempt | null>(null);
  const [showResults, setShowResults] = useState(false);

  const isLoading = isTenantLoading || isQuizLoading || isAttemptsLoading;

  const questions = useMemo(() => {
    if (!quiz?.questions) return [];
    const qs = [...quiz.questions];
    if (quiz.embaralhar_questoes) {
      for (let i = qs.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [qs[i], qs[j]] = [qs[j], qs[i]];
      }
    }
    return qs;
  }, [quiz]);

  const canAttempt = useMemo(() => {
    if (!quiz) return false;
    return attempts.length < quiz.tentativas_max;
  }, [quiz, attempts]);

  const bestAttempt = useMemo(() => {
    if (attempts.length === 0) return null;
    return attempts.reduce((best, curr) =>
      (curr.nota || 0) > (best.nota || 0) ? curr : best
    );
  }, [attempts]);

  const handleSelectAnswer = (questionId: string, optionId: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: optionId }));
  };

  const handleSubmit = async () => {
    if (!quizId || !quiz) return;

    const respostas: QuizRespostas = {};
    for (const [questionId, optionId] of Object.entries(answers)) {
      respostas[questionId] = { selected_option_id: optionId };
    }

    const tempoGastoSec = Math.round((Date.now() - startTime) / 1000);

    try {
      const attempt = await submitQuiz.mutateAsync({
        quizId,
        respostas,
        tempoGastoSec,
      });
      setResult(attempt);
      setShowResults(true);
    } catch {
      // handled by toast
    }
  };

  const handleRetry = () => {
    setAnswers({});
    setResult(null);
    setShowResults(false);
  };

  const answeredCount = Object.keys(answers).length;
  const totalQuestions = questions.length;
  const allAnswered = answeredCount === totalQuestions;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" asChild>
          <Link to="/treinamentos/meus">
            <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
          </Link>
        </Button>
        <Card>
          <CardContent className="flex flex-col items-center py-12">
            <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">Quiz nao encontrado</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Results screen
  if (showResults && result) {
    return (
      <div className="space-y-6 max-w-3xl mx-auto">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">Resultado do Quiz</h1>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center space-y-4">
              {result.aprovado ? (
                <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
                  <Trophy className="h-10 w-10 text-green-600" />
                </div>
              ) : (
                <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center">
                  <XCircle className="h-10 w-10 text-red-600" />
                </div>
              )}

              <h2 className="text-xl font-bold">
                {result.aprovado ? 'Parabens! Voce foi aprovado!' : 'Nao aprovado'}
              </h2>

              <div className="grid grid-cols-3 gap-6 w-full max-w-sm">
                <div className="text-center">
                  <p className="text-3xl font-bold">{result.nota}%</p>
                  <p className="text-xs text-muted-foreground">Nota</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold">
                    {result.acertos}/{result.total_questoes}
                  </p>
                  <p className="text-xs text-muted-foreground">Acertos</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold">
                    {result.tempo_gasto_sec
                      ? `${Math.floor(result.tempo_gasto_sec / 60)}m`
                      : '-'}
                  </p>
                  <p className="text-xs text-muted-foreground">Tempo</p>
                </div>
              </div>

              {result.aprovado && (
                <div className="flex items-center gap-2 text-sm">
                  <Star className="h-4 w-4 text-yellow-500" />
                  <span>+{quiz.xp_aprovado} XP ganhos</span>
                  {result.nota === 100 && (
                    <span className="text-yellow-600">
                      +{quiz.xp_nota_maxima} XP bonus!
                    </span>
                  )}
                </div>
              )}

              <p className="text-sm text-muted-foreground">
                Nota minima: {quiz.nota_minima}% | Tentativa {attempts.length}/
                {quiz.tentativas_max}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Review answers if allowed */}
        {quiz.mostrar_respostas && result.respostas && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Revisao das Respostas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {questions.map((question, qIndex) => {
                const resp = result.respostas?.[question.id];
                const selectedOptionId = resp?.selected_option_id;
                const isCorrect = resp?.is_correct;

                return (
                  <div key={question.id} className="p-3 rounded-lg border space-y-2">
                    <div className="flex items-start gap-2">
                      {isCorrect ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                      )}
                      <p className="text-sm font-medium">
                        {qIndex + 1}. {question.enunciado}
                      </p>
                    </div>
                    <div className="ml-7 space-y-1">
                      {(question.options || []).map((opt: any) => {
                        const isSelected = opt.id === selectedOptionId;
                        const isCorrectOption = opt.is_correta;
                        let className = 'text-sm p-1.5 rounded';
                        if (isCorrectOption) className += ' bg-green-50 text-green-700';
                        else if (isSelected && !isCorrectOption) className += ' bg-red-50 text-red-700';

                        return (
                          <div key={opt.id} className={className}>
                            {isSelected ? '> ' : '  '}
                            {opt.texto}
                            {isCorrectOption && ' (correta)'}
                          </div>
                        );
                      })}
                    </div>
                    {question.explicacao && (
                      <p className="ml-7 text-xs text-muted-foreground italic">
                        {question.explicacao}
                      </p>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        <div className="flex justify-between">
          <Button variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
          </Button>
          {!result.aprovado && canAttempt && (
            <Button onClick={handleRetry}>
              <RotateCcw className="h-4 w-4 mr-2" /> Tentar Novamente
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Quiz taking screen
  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold">{quiz.titulo}</h1>
          <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
            <span>{totalQuestions} questoes</span>
            {quiz.tempo_limite_min && (
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {quiz.tempo_limite_min} min
              </span>
            )}
            <span>Nota minima: {quiz.nota_minima}%</span>
            <span>
              Tentativa {attempts.length + 1}/{quiz.tentativas_max}
            </span>
          </div>
        </div>
      </div>

      {quiz.descricao && (
        <p className="text-sm text-muted-foreground">{quiz.descricao}</p>
      )}

      {/* Previous attempts */}
      {bestAttempt && (
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3 text-sm">
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
              <span>
                Melhor tentativa anterior: <strong>{bestAttempt.nota}%</strong>
                {bestAttempt.aprovado ? ' (aprovado)' : ' (nao aprovado)'}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cannot attempt */}
      {!canAttempt && (
        <Card>
          <CardContent className="flex flex-col items-center py-8">
            <AlertCircle className="h-10 w-10 text-yellow-500 mb-3" />
            <p className="font-medium">Tentativas esgotadas</p>
            <p className="text-sm text-muted-foreground">
              Voce usou todas as {quiz.tentativas_max} tentativas permitidas.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Progress */}
      {canAttempt && (
        <>
          <div className="flex items-center gap-3">
            <Progress
              value={(answeredCount / totalQuestions) * 100}
              className="h-2 flex-1"
            />
            <span className="text-sm text-muted-foreground">
              {answeredCount}/{totalQuestions}
            </span>
          </div>

          {/* Questions */}
          <div className="space-y-6">
            {questions.map((question, qIndex) => {
              const options = question.options || [];
              const sortedOptions = quiz.embaralhar_alternativas
                ? [...options].sort(() => Math.random() - 0.5)
                : options;

              return (
                <Card key={question.id}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">
                      <span className="text-muted-foreground mr-2">
                        {qIndex + 1}.
                      </span>
                      {question.enunciado}
                    </CardTitle>
                    {question.imagem_url && (
                      <img
                        src={question.imagem_url}
                        alt="Imagem da questao"
                        className="max-w-md rounded mt-2"
                      />
                    )}
                  </CardHeader>
                  <CardContent>
                    {question.tipo === 'verdadeiro_falso' ? (
                      <RadioGroup
                        value={answers[question.id] || ''}
                        onValueChange={(v) =>
                          handleSelectAnswer(question.id, v)
                        }
                        className="space-y-2"
                      >
                        {sortedOptions.map((opt: any) => (
                          <div
                            key={opt.id}
                            className="flex items-center space-x-2 p-2 rounded border hover:bg-accent cursor-pointer"
                          >
                            <RadioGroupItem value={opt.id} id={opt.id} />
                            <Label
                              htmlFor={opt.id}
                              className="flex-1 cursor-pointer text-sm"
                            >
                              {opt.texto}
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                    ) : (
                      <RadioGroup
                        value={answers[question.id] || ''}
                        onValueChange={(v) =>
                          handleSelectAnswer(question.id, v)
                        }
                        className="space-y-2"
                      >
                        {sortedOptions.map((opt: any) => (
                          <div
                            key={opt.id}
                            className="flex items-center space-x-2 p-2 rounded border hover:bg-accent cursor-pointer"
                          >
                            <RadioGroupItem value={opt.id} id={opt.id} />
                            <Label
                              htmlFor={opt.id}
                              className="flex-1 cursor-pointer text-sm"
                            >
                              {opt.texto}
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Submit */}
          <div className="flex justify-end">
            <Button
              onClick={handleSubmit}
              disabled={!allAnswered || submitQuiz.isPending}
              size="lg"
            >
              {submitQuiz.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-2" />
              )}
              Enviar Respostas
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
