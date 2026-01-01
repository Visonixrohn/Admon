import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileText, Upload } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import ContratoDialog from "./contrato-dialog";

interface ContratoButtonProps {
  ventaId?: string;
  contratoId?: string;
  suscripcionId?: string;
  contratoUrl?: string | null;
  onContratoUpdated?: () => void;
  variant?: "icon" | "button";
  tableName?: "venta" | "contratos" | "suscripciones";
  clienteId?: string;
  proyectoId?: string;
}

export default function ContratoButton({
  ventaId,
  contratoId,
  suscripcionId,
  contratoUrl,
  onContratoUpdated,
  variant = "icon",
  tableName = "venta",
  clienteId,
  proyectoId,
}: ContratoButtonProps) {
  const [dialogOpen, setDialogOpen] = useState(false);

  const recordId = ventaId || contratoId || suscripcionId;
  if (!recordId) {
    return null;
  }

  if (variant === "button") {
    return (
      <>
        <Button
          variant={contratoUrl ? "outline" : "default"}
          size="sm"
          onClick={() => setDialogOpen(true)}
          className="gap-2"
        >
          {contratoUrl ? (
            <>
              <FileText className="h-4 w-4" />
              Ver Contrato
            </>
          ) : (
            <>
              <Upload className="h-4 w-4" />
              Subir Contrato
            </>
          )}
        </Button>

        <ContratoDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          ventaId={ventaId}
          contratoId={contratoId}
          suscripcionId={suscripcionId}
          contratoUrl={contratoUrl}
          onContratoUpdated={onContratoUpdated}
          tableName={tableName}
          clienteId={clienteId}
          proyectoId={proyectoId}
        />
      </>
    );
  }

  // Variant: icon
  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                setDialogOpen(true);
              }}
              className={contratoUrl ? "text-green-600 hover:text-green-700" : "text-muted-foreground"}
            >
              {contratoUrl ? (
                <FileText className="h-4 w-4" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{contratoUrl ? "Ver contrato" : "Subir contrato"}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <ContratoDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        ventaId={ventaId}
        contratoId={contratoId}
        suscripcionId={suscripcionId}
        contratoUrl={contratoUrl}
        onContratoUpdated={onContratoUpdated}
        tableName={tableName}
        clienteId={clienteId}
        proyectoId={proyectoId}
      />
    </>
  );
}
