import { Franqueado } from "@/types/franqueado";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Building2,
  MapPin,
  Phone,
  Mail,
  User,
  Calendar,
  Instagram,
  Facebook,
  Youtube,
  ExternalLink,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
} from "lucide-react";

interface FranqueadoDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  franqueado: Franqueado | null;
}

export function FranqueadoDetailModal({
  open,
  onOpenChange,
  franqueado,
}: FranqueadoDetailModalProps) {
  if (!franqueado) return null;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Concluído":
        return <Badge className="bg-green-600"><CheckCircle2 className="h-3 w-3 mr-1" />{status}</Badge>;
      case "Em configuração":
        return <Badge className="bg-blue-600"><Clock className="h-3 w-3 mr-1" />{status}</Badge>;
      case "Falta LP":
        return <Badge className="bg-amber-600"><AlertCircle className="h-3 w-3 mr-1" />{status}</Badge>;
      case "Não inaugurada":
        return <Badge variant="secondary"><XCircle className="h-3 w-3 mr-1" />{status}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("pt-BR");
  };

  const socialLinks = [
    { name: "Instagram", url: franqueado.instagram ? `https://www.instagram.com/${franqueado.instagram}` : null, icon: Instagram, color: "text-pink-500" },
    { name: "Facebook", url: franqueado.facebook_pagina ? `https://www.facebook.com/${franqueado.facebook_pagina}` : null, icon: Facebook, color: "text-blue-600" },
    { name: "TikTok", url: franqueado.tiktok ? (franqueado.tiktok.startsWith("https://www.tiktok.com/") ? franqueado.tiktok : `https://www.tiktok.com/${franqueado.tiktok}`) : null, icon: null, color: "text-foreground" },
    { name: "YouTube", url: franqueado.youtube ? `https://www.youtube.com/${franqueado.youtube}` : null, icon: Youtube, color: "text-red-500" },
  ].filter(social => social.url);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-xl">{franqueado.nome_fantasia}</DialogTitle>
              <div className="mt-1">{getStatusBadge(franqueado.status)}</div>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5 mt-4">
          {/* Localização */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Localização</h4>
            <div className="space-y-2">
              {franqueado.endereco && (
                <div className="flex items-start gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <span>{franqueado.endereco}</span>
                </div>
              )}
              {(franqueado.cidade || franqueado.estado) && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{franqueado.cidade}{franqueado.estado && ` / ${franqueado.estado}`}</span>
                </div>
              )}
              {franqueado.cep && (
                <p className="text-sm text-muted-foreground ml-6">CEP: {franqueado.cep}</p>
              )}
            </div>
          </div>

          <Separator />

          {/* Contato */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Contato</h4>
            <div className="space-y-2">
              {franqueado.responsavel && (
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>{franqueado.responsavel}</span>
                  {franqueado.relacionamento && (
                    <Badge variant="outline" className="text-xs">{franqueado.relacionamento}</Badge>
                  )}
                </div>
              )}
              {franqueado.whatsapp_business && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{franqueado.whatsapp_business}</span>
                </div>
              )}
              {franqueado.email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{franqueado.email}</span>
                </div>
              )}
              {franqueado.cnpj && (
                <p className="text-sm text-muted-foreground">CNPJ: {franqueado.cnpj}</p>
              )}
            </div>
          </div>

          <Separator />

          {/* Informações Gerais */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Informações</h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground">ID API</p>
                <p className="font-medium">{franqueado.id_api || "-"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Última Recarga</p>
                <p className="font-medium">{formatDate(franqueado.ultima_recarga)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Criado em</p>
                <p className="font-medium">{formatDate(franqueado.created_at)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Atualizado em</p>
                <p className="font-medium">{formatDate(franqueado.updated_at)}</p>
              </div>
            </div>
          </div>

          {/* Redes Sociais */}
          {socialLinks.length > 0 && (
            <>
              <Separator />
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Redes Sociais</h4>
                <div className="flex flex-wrap gap-2">
                  {socialLinks.map((social) => {
                    const Icon = social.icon;
                    const url = social.url?.startsWith("http") ? social.url : `https://${social.url}`;
                    
                    return (
                      <Button
                        key={social.name}
                        variant="outline"
                        size="sm"
                        asChild
                        className="gap-2"
                      >
                        <a href={url} target="_blank" rel="noopener noreferrer">
                          {Icon ? (
                            <Icon className={`h-4 w-4 ${social.color}`} />
                          ) : (
                            <svg 
                              viewBox="0 0 24 24" 
                              className={`h-4 w-4 ${social.color}`}
                              fill="currentColor"
                            >
                              <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                            </svg>
                          )}
                          {social.name}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </Button>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* Landing Page */}
          {franqueado.landing_page_site && (
            <>
              <Separator />
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Landing Page</h4>
                <Button variant="outline" size="sm" asChild className="gap-2">
                  <a href={franqueado.landing_page_site} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" />
                    Acessar Site
                  </a>
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
