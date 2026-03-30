import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, XCircle, Lightbulb } from "lucide-react";
import type { ConversationExampleData } from "@/types/lead-analytics";

interface Props {
  example: ConversationExampleData;
}

export function ConversationExample({ example }: Props) {
  return (
    <Card className={`border-l-4 ${example.isGood ? "border-l-green-500" : "border-l-red-500"}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            {example.isGood ? (
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            ) : (
              <XCircle className="h-5 w-5 text-red-600" />
            )}
            {example.title}
          </CardTitle>
          <Badge variant={example.isGood ? "default" : "destructive"}>
            {example.isGood ? "CERTO" : "ERRADO"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Chat messages */}
        <div className="space-y-2 bg-muted/20 rounded-lg p-3">
          {example.messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.fromMe ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                  msg.fromMe
                    ? "bg-green-100 dark:bg-green-900/40 text-green-900 dark:text-green-100"
                    : "bg-white dark:bg-zinc-800 border"
                }`}
              >
                {msg.contactName && !msg.fromMe && (
                  <p className="text-xs font-semibold text-muted-foreground mb-0.5">
                    {msg.contactName}
                  </p>
                )}
                <p className="whitespace-pre-wrap">{msg.body}</p>
                {msg.timestamp && (
                  <p className="text-[10px] text-muted-foreground mt-1 text-right">
                    {msg.timestamp}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* What happened */}
        <div className="space-y-2">
          <div className="p-3 rounded-lg bg-muted/30">
            <p className="text-sm font-semibold mb-1">
              {example.isGood ? "O que fez certo:" : "O que aconteceu:"}
            </p>
            <p className="text-sm text-muted-foreground">{example.whatHappened}</p>
          </div>

          {!example.isGood && (
            <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
              <p className="text-sm font-semibold mb-1 text-green-800 dark:text-green-300">
                O que deveria ter acontecido:
              </p>
              <p className="text-sm text-green-700 dark:text-green-400">
                {example.whatShouldHappen}
              </p>
            </div>
          )}
        </div>

        {/* Lesson */}
        <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
          <Lightbulb className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-amber-800 dark:text-amber-300 font-medium">
            {example.lesson}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
