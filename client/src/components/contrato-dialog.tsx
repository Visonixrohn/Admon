import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { FileText, Upload, Loader2, ExternalLink, Trash2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ContratoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ventaId?: string;
  contratoId?: string;
  suscripcionId?: string;
  contratoUrl?: string | null;
  onContratoUpdated?: () => void;
  tableName?: "venta" | "contratos" | "suscripciones";
  clienteId?: string;
  proyectoId?: string;
}

export default function ContratoDialog({
  open,
  onOpenChange,
  ventaId,
  contratoId,
  suscripcionId,
  contratoUrl,
  onContratoUpdated,
  tableName = "venta",
  clienteId,
  proyectoId,
}: ContratoDialogProps) {
  const [uploading, setUploading] = useState(false);
  const [viewing, setViewing] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const { toast } = useToast();

  const recordId = ventaId || contratoId || suscripcionId;
  if (!recordId) {
    throw new Error("Se requiere ventaId, contratoId o suscripcionId");
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar que sea un PDF
    if (file.type !== "application/pdf") {
      toast({
        title: "Error",
        description: "Solo se permiten archivos PDF",
        variant: "destructive",
      });
      return;
    }

    // Validar tamaño (máximo 10 MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "Error",
        description: "El archivo no debe superar los 10 MB",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      // Subir el nuevo archivo
      const fileName = `${recordId}-${Date.now()}.pdf`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("contratos-firmados")
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Obtener la URL pública del archivo
      const { data: urlData } = supabase.storage
        .from("contratos-firmados")
        .getPublicUrl(fileName);

      const contratoUrlToSave = urlData.publicUrl;

      // Actualizar la tabla actual
      const { error: updateError } = await supabase
        .from(tableName)
        .update({ contrato_url: contratoUrlToSave })
        .eq("id", recordId);

      if (updateError) throw updateError;

      // Si tenemos cliente y proyecto, actualizar todas las tablas relacionadas
      if (clienteId && proyectoId) {
        // Actualizar en venta
        await supabase
          .from("venta")
          .update({ contrato_url: contratoUrlToSave })
          .eq("cliente", clienteId)
          .eq("proyecto", proyectoId)
          .is("contrato_url", null);

        // Actualizar en contratos
        await supabase
          .from("contratos")
          .update({ contrato_url: contratoUrlToSave })
          .eq("cliente", clienteId)
          .eq("proyecto", proyectoId)
          .is("contrato_url", null);

        // Actualizar en suscripciones
        await supabase
          .from("suscripciones")
          .update({ contrato_url: contratoUrlToSave })
          .eq("cliente", clienteId)
          .eq("proyecto", proyectoId)
          .is("contrato_url", null);
      }

      toast({
        title: "Éxito",
        description: "Contrato subido y vinculado en todas las secciones",
      });

      onContratoUpdated?.();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error subiendo contrato:", error);
      toast({
        title: "Error",
        description: error.message || "Error al subir el contrato",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleViewContract = async () => {
    if (!contratoUrl) return;

    setViewing(true);
    try {
      // Extraer el nombre del archivo de la URL
      const fileName = contratoUrl.split("/").pop();
      if (!fileName) throw new Error("Nombre de archivo inválido");

      console.log("Intentando obtener URL firmada para:", fileName);

      // Generar una URL firmada temporal (válida por 1 hora)
      const { data, error } = await supabase.storage
        .from("contratos-firmados")
        .createSignedUrl(fileName, 3600);

      if (error) {
        console.error("Error obteniendo URL firmada:", error);
        throw error;
      }

      console.log("URL firmada obtenida:", data.signedUrl);

      // Mostrar el PDF en el modal
      setPdfUrl(data.signedUrl);
    } catch (error: any) {
      console.error("Error visualizando contrato:", error);
      toast({
        title: "Error",
        description: error.message || "Error al visualizar el contrato",
        variant: "destructive",
      });
    } finally {
      setViewing(false);
    }
  };

  const handleCloseViewer = () => {
    setPdfUrl(null);
  };



  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="sm:max-w-[900px] max-h-[90vh] overflow-hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {pdfUrl ? "Contrato" : contratoUrl ? "Contrato" : "Subir Contrato"}
          </DialogTitle>
          <DialogDescription>
            {pdfUrl
              ? "Visualiza el contrato firmado"
              : contratoUrl
              ? "Visualiza el contrato firmado"
              : "Sube el contrato firmado en formato PDF (solo se puede subir una vez)"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {pdfUrl ? (
            <div className="space-y-4">
              <Alert className="mb-2">
                <FileText className="h-4 w-4" />
                <AlertDescription>
                  Visualizando contrato firmado
                </AlertDescription>
              </Alert>
              <div className="relative w-full bg-gray-100 rounded-lg overflow-hidden" style={{ height: '65vh' }}>
                <iframe
                  src={`${pdfUrl}#view=FitH`}
                  className="w-full h-full border-0"
                  title="Contrato PDF"
                  style={{ backgroundColor: '#f3f4f6' }}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleCloseViewer}
                  variant="outline"
                  className="flex-1"
                >
                  Volver
                </Button>
                <Button
                  onClick={() => onOpenChange(false)}
                  variant="default"
                  className="flex-1"
                >
                  Cerrar
                </Button>
              </div>
            </div>
          ) : contratoUrl ? (
            <div className="space-y-4">
              <Alert>
                <FileText className="h-4 w-4" />
                <AlertDescription>
                  Este proyecto tiene un contrato firmado registrado.
                </AlertDescription>
              </Alert>

              <div className="flex flex-col gap-2">
                <Button
                  onClick={handleViewContract}
                  disabled={viewing}
                  className="w-full"
                >
                  {viewing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Cargando...
                    </>
                  ) : (
                    <>
                      <FileText className="h-4 w-4 mr-2" />
                      Ver Contrato
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid w-full max-w-sm items-center gap-1.5">
              <Label htmlFor="contrato">Seleccionar archivo PDF</Label>
              <Input
                id="contrato"
                type="file"
                accept="application/pdf"
                onChange={handleFileUpload}
                disabled={uploading}
              />
              <p className="text-xs text-muted-foreground">
                Máximo 10 MB • Solo PDF
              </p>
            </div>
          )}

          {uploading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Subiendo contrato...
            </div>
          )}
        </div>

        {!pdfUrl && (
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={uploading}
            >
              Cerrar
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
