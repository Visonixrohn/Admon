/**
 * Hook de configuración para el sistema de recordatorios de cobro por email
 * 
 * IMPORTANTE: Este archivo contiene la URL y API Key del Google Apps Script.
 * Estos valores son seguros de exponer en el cliente porque:
 * - La URL del script ya es pública (desplegada como "Anyone")
 * - La API Key es solo para prevenir spam básico, no es crítica de seguridad
 * - El Google Script tiene su propia validación de permisos
 */

export function useEmailConfig() {
  return {
    // URL del Google Apps Script desplegado como Web App
    scriptUrl: "https://script.google.com/macros/s/AKfycbziFtOy7p5zr-hOB1ZbF0YtRDwtru4X1t9KLtaNYqkxsJ4JI_C5UKsVQwGhf7yRZdKIfA/exec",
    
    // API Key para autenticación básica (debe coincidir con la del Google Script)
    apiKey: "tu-clave-secreta-muy-segura-12345",
    
    // Información de contacto de la empresa (opcional, se puede personalizar)
    contactInfo: {
      telefono: "+504 1234-5678",
      email: "contacto@visonix.com",
      nombreEmpresa: "Visonix",
    },
  };
}

/**
 * Función helper para enviar recordatorio de cobro
 */
export async function enviarRecordatorioEmail(datos: {
  clienteEmail: string;
  clienteNombre: string;
  proyectoNombre: string;
  mensualidad: number;
  diasAtraso: number;
  fechaVencimiento: string;
}) {
  const config = useEmailConfig();
  
  try {
    const response = await fetch(config.scriptUrl, {
      method: "POST",
      mode: "no-cors", // Necesario para Google Apps Script
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        apiKey: config.apiKey,
        ...datos,
      }),
    });

    // Como usamos no-cors, no podemos leer la respuesta
    // Asumimos que el envío fue exitoso
    return {
      success: true,
      message: "Recordatorio enviado exitosamente",
    };
  } catch (error) {
    console.error("Error enviando recordatorio:", error);
    throw error;
  }
}
