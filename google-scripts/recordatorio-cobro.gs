/**
 * SCRIPT DE GOOGLE APPS SCRIPT PARA ENVIAR RECORDATORIOS DE COBRO
 *
 * INSTRUCCIONES DE CONFIGURACIÓN:
 * 1. Ve a https://script.google.com
 * 2. Crea un nuevo proyecto
 * 3. Pega este código
 * 4. Configura las variables en la sección CONFIGURACIÓN
 * 5. Despliega como Web App:
 *    - Ejecutar como: Tu cuenta
 *    - Acceso: Cualquiera
 * 6. Copia la URL del Web App y úsala en tu frontend
 */

// ========================================
// CONFIGURACIÓN - EDITA ESTOS VALORES
// ========================================

const CONFIG = {
  // Email del remitente (tu email de Gmail)
  EMAIL_REMITENTE: "tu-email@gmail.com",

  // Nombre de tu empresa
  NOMBRE_EMPRESA: "Visonix",

  // Información de contacto
  TELEFONO_EMPRESA: "+504 1234-5678",
  EMAIL_EMPRESA: "contacto@visonix.com",

  // Clave secreta para autenticación (cámbiala por algo único)
  API_SECRET_KEY: "tu-clave-secreta-aqui-12345",
};

// ========================================
// FUNCIÓN PRINCIPAL - WEB APP ENDPOINT
// ========================================

function doPost(e) {
  try {
    // Parsear el cuerpo de la solicitud
    const data = JSON.parse(e.postData.contents);

    // Verificar autenticación
    if (data.apiKey !== CONFIG.API_SECRET_KEY) {
      return ContentService.createTextOutput(
        JSON.stringify({
          success: false,
          error: "Autenticación fallida",
        })
      ).setMimeType(ContentService.MimeType.JSON);
    }

    // Validar datos requeridos
    if (!data.clienteEmail || !data.clienteNombre || !data.proyectoNombre) {
      return ContentService.createTextOutput(
        JSON.stringify({
          success: false,
          error: "Faltan datos requeridos",
        })
      ).setMimeType(ContentService.MimeType.JSON);
    }

    // Enviar el correo
    const resultado = enviarRecordatorioCobro(
      data.clienteEmail,
      data.clienteNombre,
      data.proyectoNombre,
      data.mensualidad,
      data.diasAtraso,
      data.fechaVencimiento
    );

    return ContentService.createTextOutput(
      JSON.stringify(resultado)
    ).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    Logger.log("Error en doPost: " + error.toString());
    return ContentService.createTextOutput(
      JSON.stringify({
        success: false,
        error: error.toString(),
      })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

// ========================================
// FUNCIÓN PARA ENVIAR EL RECORDATORIO
// ========================================

function enviarRecordatorioCobro(
  clienteEmail,
  clienteNombre,
  proyectoNombre,
  mensualidad,
  diasAtraso,
  fechaVencimiento
) {
  try {
    // Validar que el email existe
    if (!clienteEmail || clienteEmail.trim() === "") {
      Logger.log("Error: Email del cliente no proporcionado");
      return {
        success: false,
        error: "Email del cliente no configurado",
      };
    }

    // Generar el contenido del correo
    const asunto = `Recordatorio de Pago - ${proyectoNombre}`;
    const cuerpoHTML = generarHTMLCorreo(
      clienteNombre,
      proyectoNombre,
      mensualidad,
      diasAtraso,
      fechaVencimiento
    );

    // Enviar el correo
    GmailApp.sendEmail(
      clienteEmail,
      asunto,
      "", // Texto plano (vacío porque usamos HTML)
      {
        htmlBody: cuerpoHTML,
        name: CONFIG.NOMBRE_EMPRESA,
      }
    );

    Logger.log(`Correo enviado exitosamente a: ${clienteEmail}`);

    return {
      success: true,
      message: "Recordatorio enviado exitosamente",
      emailEnviado: clienteEmail,
    };
  } catch (error) {
    Logger.log("Error enviando correo: " + error.toString());
    return {
      success: false,
      error: "Error al enviar el correo: " + error.toString(),
    };
  }
}

// ========================================
// PLANTILLA HTML DEL CORREO
// ========================================

function generarHTMLCorreo(
  clienteNombre,
  proyectoNombre,
  mensualidad,
  diasAtraso,
  fechaVencimiento
) {
  const fechaFormateada = new Date(fechaVencimiento).toLocaleDateString(
    "es-HN",
    {
      year: "numeric",
      month: "long",
      day: "numeric",
    }
  );

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Recordatorio de Pago</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">
                ${CONFIG.NOMBRE_EMPRESA}
              </h1>
              <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">
                Recordatorio de Pago
              </p>
            </td>
          </tr>
          
          <!-- Body -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="font-size: 16px; color: #333333; margin: 0 0 20px 0;">
                Estimado/a <strong>${clienteNombre}</strong>,
              </p>
              
              <p style="font-size: 16px; color: #333333; line-height: 1.6; margin: 0 0 20px 0;">
                Le escribimos para recordarle que su pago correspondiente a la suscripción de 
                <strong style="color: #667eea;">${proyectoNombre}</strong> se encuentra pendiente.
              </p>
              
              <!-- Información del Pago -->
              <table width="100%" cellpadding="15" cellspacing="0" style="background-color: #f8f9fa; border-radius: 8px; margin: 30px 0;">
                <tr>
                  <td style="border-bottom: 1px solid #e9ecef; padding: 15px;">
                    <strong style="color: #666666; font-size: 14px;">Proyecto:</strong><br>
                    <span style="color: #333333; font-size: 16px;">${proyectoNombre}</span>
                  </td>
                </tr>
                <tr>
                  <td style="border-bottom: 1px solid #e9ecef; padding: 15px;">
                    <strong style="color: #666666; font-size: 14px;">Monto a pagar:</strong><br>
                    <span style="color: #667eea; font-size: 20px; font-weight: bold;">L ${parseFloat(
                      mensualidad
                    ).toFixed(2)}</span>
                  </td>
                </tr>
                <tr>
                  <td style="border-bottom: 1px solid #e9ecef; padding: 15px;">
                    <strong style="color: #666666; font-size: 14px;">Fecha de vencimiento:</strong><br>
                    <span style="color: #333333; font-size: 16px;">${fechaFormateada}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 15px;">
                    <strong style="color: #dc3545; font-size: 14px;">Días de atraso:</strong><br>
                    <span style="color: #dc3545; font-size: 18px; font-weight: bold;">${diasAtraso} día${
    diasAtraso > 1 ? "s" : ""
  }</span>
                  </td>
                </tr>
              </table>
              
              <p style="font-size: 16px; color: #333333; line-height: 1.6; margin: 20px 0;">
                Le solicitamos amablemente que realice el pago a la brevedad posible para mantener 
                su cuenta al día y evitar la suspensión del servicio.
              </p>
              
              <!-- Botón de Contacto -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="mailto:${CONFIG.EMAIL_EMPRESA}" 
                       style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                              color: #ffffff; padding: 15px 40px; text-decoration: none; 
                              border-radius: 5px; font-weight: bold; font-size: 16px;">
                      Contactar para Pagar
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="font-size: 14px; color: #666666; line-height: 1.6; margin: 20px 0 0 0;">
                Si ya realizó el pago, por favor ignore este mensaje y acepte nuestras disculpas.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #e9ecef;">
              <p style="margin: 0 0 10px 0; color: #666666; font-size: 14px;">
                <strong>${CONFIG.NOMBRE_EMPRESA}</strong>
              </p>
              <p style="margin: 0 0 5px 0; color: #666666; font-size: 14px;">
                📞 ${CONFIG.TELEFONO_EMPRESA}
              </p>
              <p style="margin: 0 0 15px 0; color: #666666; font-size: 14px;">
                📧 ${CONFIG.EMAIL_EMPRESA}
              </p>
              <p style="margin: 0; color: #999999; font-size: 12px;">
                © ${new Date().getFullYear()} ${
    CONFIG.NOMBRE_EMPRESA
  }. Todos los derechos reservados.
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

// ========================================
// FUNCIÓN DE PRUEBA (OPCIONAL)
// ========================================

function testEnviarCorreo() {
  // Cambia estos valores por datos de prueba
  const resultado = enviarRecordatorioCobro(
    "cliente@ejemplo.com", // Email del cliente
    "Juan Pérez", // Nombre del cliente
    "Sistema Web", // Nombre del proyecto
    5000, // Mensualidad
    3, // Días de atraso
    "2025-12-28" // Fecha de vencimiento
  );

  Logger.log(resultado);
}
