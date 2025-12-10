import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { formatDate, formatDateTime } from "@/lib/utils";
import type { AvanceCaracteristica } from "@shared/schema";

interface AvanceReportMobileProps {
  avance: {
    nombre_proyecto: string;
    descripcion: string | null;
    cliente_nombre: string;
    fecha_creacion: string;
    fecha_actualizacion: string;
    porcentaje_avance: number;
    total_caracteristicas: number;
    caracteristicas_completadas: number;
    estado: string;
    caracteristicas: AvanceCaracteristica[];
  };
}

export function AvanceReportMobile({ avance }: AvanceReportMobileProps) {
  const reportRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const reportContent = reportRef.current?.innerHTML || "";
    const styles = `
      <style>
        @page {
          size: A4 portrait;
          margin: 10mm;
        }
        
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          background: white;
          color: #1a1a1a;
          line-height: 1.5;
          font-size: 12px;
        }

        .report-container {
          max-width: 100%;
          margin: 0 auto;
          padding: 0;
          background: white;
        }

        .header {
          border-bottom: 3px solid #3b82f6;
          padding-bottom: 12px;
          margin-bottom: 16px;
          text-align: center;
        }

        .header-logo {
          font-size: 22px;
          font-weight: 700;
          color: #3b82f6;
          margin-bottom: 4px;
        }

        .header-subtitle {
          color: #64748b;
          font-size: 11px;
        }

        .report-title {
          font-size: 20px;
          font-weight: 700;
          color: #0f172a;
          margin-bottom: 8px;
          text-align: center;
        }

        .report-date {
          color: #64748b;
          font-size: 11px;
          margin-bottom: 16px;
          text-align: center;
        }

        .info-section {
          margin-bottom: 16px;
        }

        .info-card {
          padding: 10px;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          background: #f8fafc;
          margin-bottom: 8px;
        }

        .info-label {
          font-size: 10px;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 3px;
          font-weight: 600;
        }

        .info-value {
          font-size: 13px;
          font-weight: 600;
          color: #0f172a;
        }

        .progress-section {
          background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 16px;
          border: 1px solid #93c5fd;
          text-align: center;
        }

        .progress-title {
          font-size: 15px;
          font-weight: 700;
          color: #1e40af;
          margin-bottom: 12px;
        }

        .progress-percentage {
          font-size: 48px;
          font-weight: 700;
          color: #2563eb;
          margin-bottom: 8px;
        }

        .progress-bar-container {
          background: white;
          height: 24px;
          border-radius: 12px;
          overflow: hidden;
          margin: 12px 0;
          border: 2px solid #3b82f6;
        }

        .progress-bar {
          height: 100%;
          background: linear-gradient(90deg, #3b82f6 0%, #2563eb 100%);
          transition: width 0.3s ease;
        }

        .progress-subtitle {
          color: #475569;
          font-size: 12px;
          margin-top: 8px;
        }

        .estado-badge {
          display: inline-block;
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 600;
          margin-top: 8px;
        }

        .estado-completado {
          background: #dcfce7;
          color: #166534;
          border: 1px solid #86efac;
        }

        .estado-progreso {
          background: #fef3c7;
          color: #92400e;
          border: 1px solid #fcd34d;
        }

        .section-title {
          font-size: 15px;
          font-weight: 700;
          color: #0f172a;
          margin-bottom: 12px;
          padding-bottom: 8px;
          border-bottom: 2px solid #e2e8f0;
        }

        .caracteristica-item {
          padding: 12px;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          margin-bottom: 10px;
          page-break-inside: avoid;
        }

        .caracteristica-completed {
          background: #f0fdf4;
          border-color: #86efac;
        }

        .caracteristica-pending {
          background: #fffbeb;
          border-color: #fcd34d;
        }

        .caracteristica-header {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          margin-bottom: 6px;
        }

        .caracteristica-icon {
          flex-shrink: 0;
          margin-top: 2px;
          font-size: 16px;
        }

        .icon-completed {
          color: #16a34a;
        }

        .icon-pending {
          color: #d97706;
        }

        .caracteristica-name {
          font-weight: 600;
          color: #0f172a;
          font-size: 13px;
          flex: 1;
        }

        .caracteristica-completed .caracteristica-name {
          text-decoration: line-through;
          color: #64748b;
        }

        .caracteristica-description {
          font-size: 11px;
          color: #64748b;
          margin-bottom: 6px;
          margin-left: 24px;
          line-height: 1.4;
        }

        .caracteristica-date {
          font-size: 10px;
          color: #16a34a;
          font-weight: 600;
          margin-left: 24px;
        }

        .stats-box {
          display: flex;
          justify-content: space-around;
          margin: 16px 0;
          padding: 12px;
          background: #f8fafc;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
        }

        .stat-item {
          text-align: center;
        }

        .stat-value {
          font-size: 24px;
          font-weight: 700;
          color: #3b82f6;
        }

        .stat-label {
          font-size: 10px;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-top: 4px;
        }

        .footer {
          margin-top: 24px;
          padding-top: 12px;
          border-top: 2px solid #e2e8f0;
          text-align: center;
          color: #64748b;
          font-size: 10px;
        }

        .footer-company {
          font-weight: 600;
          color: #3b82f6;
          margin-bottom: 4px;
          font-size: 12px;
        }

        @media print {
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }

          .no-print {
            display: none !important;
          }

          .caracteristica-item {
            page-break-inside: avoid;
          }
          
          .progress-section {
            page-break-inside: avoid;
          }
          
          .info-section {
            page-break-inside: avoid;
          }
        }
      </style>
    `;

    const caracteristicasCompletadas = avance.caracteristicas.filter(
      (c) => c.completada
    );
    const caracteristicasPendientes = avance.caracteristicas.filter(
      (c) => !c.completada
    );

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reporte de Avance - ${avance.nombre_proyecto}</title>
          ${styles}
        </head>
        <body>
          <div class="report-container">
            ${reportContent}
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();

    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const caracteristicasCompletadas = avance.caracteristicas.filter(
    (c) => c.completada
  );
  const caracteristicasPendientes = avance.caracteristicas.filter(
    (c) => !c.completada
  );

  return (
    <div className="space-y-4">
      <Button onClick={handlePrint} className="w-full gap-2">
        <Printer className="h-4 w-4" />
        Imprimir Reporte (Formato Móvil)
      </Button>

      <div ref={reportRef} className="hidden">
        {/* Header */}
        <div className="header">
          <div className="header-logo">Sistema de Gestión</div>
          <div className="header-subtitle">Reporte de Avance de Proyecto</div>
        </div>

        {/* Title */}
        <div className="report-title">{avance.nombre_proyecto}</div>
        <div className="report-date">
          Generado el {formatDateTime(new Date().toISOString())}
        </div>

        {/* Info Section */}
        <div className="info-section">
          <div className="info-card">
            <div className="info-label">Cliente</div>
            <div className="info-value">{avance.cliente_nombre}</div>
          </div>
          <div className="info-card">
            <div className="info-label">Fecha de Creación</div>
            <div className="info-value">{formatDate(avance.fecha_creacion)}</div>
          </div>
          <div className="info-card">
            <div className="info-label">Última Actualización</div>
            <div className="info-value">
              {formatDateTime(avance.fecha_actualizacion)}
            </div>
          </div>
          {avance.descripcion && (
            <div className="info-card">
              <div className="info-label">Descripción</div>
              <div className="info-value">{avance.descripcion}</div>
            </div>
          )}
        </div>

        {/* Progress Section */}
        <div className="progress-section">
          <div className="progress-title">Progreso del Proyecto</div>
          <div className="progress-percentage">
            {Number(avance.porcentaje_avance).toFixed(0)}%
          </div>
          <div className="progress-bar-container">
            <div
              className="progress-bar"
              style={{ width: `${avance.porcentaje_avance}%` }}
            ></div>
          </div>
          <div className="progress-subtitle">
            {avance.caracteristicas_completadas} de{" "}
            {avance.total_caracteristicas} características completadas
          </div>
          <span
            className={`estado-badge ${
              avance.estado === "completado"
                ? "estado-completado"
                : "estado-progreso"
            }`}
          >
            {avance.estado === "completado" ? "✓ Completado" : "⏱ En Progreso"}
          </span>
        </div>

        {/* Stats Box */}
        <div className="stats-box">
          <div className="stat-item">
            <div className="stat-value" style={{ color: "#16a34a" }}>
              {caracteristicasCompletadas.length}
            </div>
            <div className="stat-label">Completadas</div>
          </div>
          <div className="stat-item">
            <div className="stat-value" style={{ color: "#d97706" }}>
              {caracteristicasPendientes.length}
            </div>
            <div className="stat-label">Pendientes</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">{avance.total_caracteristicas}</div>
            <div className="stat-label">Total</div>
          </div>
        </div>

        {/* Características Completadas */}
        {caracteristicasCompletadas.length > 0 && (
          <div style={{ marginBottom: "16px" }}>
            <div className="section-title">
              ✓ Características Completadas ({caracteristicasCompletadas.length})
            </div>
            {caracteristicasCompletadas.map((caracteristica) => (
              <div
                key={caracteristica.id}
                className="caracteristica-item caracteristica-completed"
              >
                <div className="caracteristica-header">
                  <span className="caracteristica-icon icon-completed">✓</span>
                  <div className="caracteristica-name">
                    {caracteristica.nombre}
                  </div>
                </div>
                {caracteristica.descripcion && (
                  <div className="caracteristica-description">
                    {caracteristica.descripcion}
                  </div>
                )}
                {caracteristica.fecha_completado && (
                  <div className="caracteristica-date">
                    Completada: {formatDateTime(caracteristica.fecha_completado)}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Características Pendientes */}
        {caracteristicasPendientes.length > 0 && (
          <div style={{ marginBottom: "16px" }}>
            <div className="section-title">
              ⏱ Características Pendientes ({caracteristicasPendientes.length})
            </div>
            {caracteristicasPendientes.map((caracteristica) => (
              <div
                key={caracteristica.id}
                className="caracteristica-item caracteristica-pending"
              >
                <div className="caracteristica-header">
                  <span className="caracteristica-icon icon-pending">○</span>
                  <div className="caracteristica-name">
                    {caracteristica.nombre}
                  </div>
                </div>
                {caracteristica.descripcion && (
                  <div className="caracteristica-description">
                    {caracteristica.descripcion}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="footer">
          <div className="footer-company">Sistema de Gestión de Proyectos</div>
          <div>
            Este reporte es confidencial y está destinado únicamente para uso
            interno
          </div>
        </div>
      </div>
    </div>
  );
}
