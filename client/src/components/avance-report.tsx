import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Printer,
  CheckCircle2,
  Circle,
  Calendar,
  User,
  FileText,
  TrendingUp,
  Target,
} from "lucide-react";
import { formatDate, formatDateTime } from "@/lib/utils";
import type { AvanceCaracteristica } from "@shared/schema";

interface AvanceReportProps {
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

export function AvanceReport({ avance }: AvanceReportProps) {
  const reportRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const reportContent = reportRef.current?.innerHTML || "";
    const styles = `
      <style>
        @page {
          size: A4 landscape;
          margin: 15mm;
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
          line-height: 1.4;
        }

        .report-container {
          max-width: 100%;
          margin: 0 auto;
          padding: 15px;
          background: white;
        }

        .header {
          border-bottom: 3px solid #3b82f6;
          padding-bottom: 12px;
          margin-bottom: 15px;
        }

        .header-logo {
          font-size: 20px;
          font-weight: 700;
          color: #3b82f6;
          margin-bottom: 4px;
        }

        .header-subtitle {
          color: #64748b;
          font-size: 12px;
        }

        .report-title {
          font-size: 24px;
          font-weight: 700;
          color: #0f172a;
          margin-bottom: 6px;
        }

        .report-date {
          color: #64748b;
          font-size: 12px;
          margin-bottom: 12px;
        }

        .info-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
          margin-bottom: 15px;
        }

        .info-card {
          padding: 12px;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          background: #f8fafc;
        }

        .info-label {
          font-size: 10px;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 4px;
          font-weight: 600;
        }

        .info-value {
          font-size: 14px;
          font-weight: 600;
          color: #0f172a;
        }

        .progress-section {
          background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
          border-radius: 8px;
          padding: 15px;
          margin-bottom: 15px;
          border: 1px solid #93c5fd;
        }

        .progress-title {
          font-size: 16px;
          font-weight: 700;
          color: #1e40af;
          margin-bottom: 10px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .progress-stats {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
        }

        .progress-percentage {
          font-size: 32px;
          font-weight: 700;
          color: #2563eb;
        }

        .progress-bar-container {
          background: white;
          height: 20px;
          border-radius: 10px;
          overflow: hidden;
          margin-bottom: 8px;
          border: 2px solid #3b82f6;
        }

        .progress-bar {
          height: 100%;
          background: linear-gradient(90deg, #3b82f6 0%, #2563eb 100%);
          transition: width 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: flex-end;
          padding-right: 8px;
          color: white;
          font-weight: 600;
          font-size: 12px;
        }

        .progress-subtitle {
          color: #475569;
          font-size: 12px;
        }

        .charts-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
          margin-bottom: 15px;
        }

        .chart-card {
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 15px;
          background: white;
        }

        .chart-title {
          font-size: 14px;
          font-weight: 600;
          color: #0f172a;
          margin-bottom: 12px;
        }

        .donut-chart {
          width: 140px;
          height: 140px;
          margin: 0 auto;
          position: relative;
        }

        .donut-chart svg {
          transform: rotate(-90deg);
        }

        .donut-center {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          text-align: center;
        }

        .donut-percentage {
          font-size: 26px;
          font-weight: 700;
          color: #2563eb;
        }

        .donut-label {
          font-size: 10px;
          color: #64748b;
        }

        .bar-chart {
          display: flex;
          align-items: flex-end;
          justify-content: space-around;
          height: 140px;
          padding: 12px 0;
        }

        .bar {
          width: 60px;
          background: linear-gradient(180deg, #3b82f6 0%, #2563eb 100%);
          border-radius: 6px 6px 0 0;
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-end;
        }

        .bar-completed {
          background: linear-gradient(180deg, #22c55e 0%, #16a34a 100%);
        }

        .bar-pending {
          background: linear-gradient(180deg, #f59e0b 0%, #d97706 100%);
        }

        .bar-value {
          position: absolute;
          top: -20px;
          font-weight: 700;
          font-size: 14px;
        }

        .bar-label {
          margin-top: 6px;
          font-size: 10px;
          color: #64748b;
          font-weight: 600;
          text-align: center;
        }

        .section-title {
          font-size: 16px;
          font-weight: 700;
          color: #0f172a;
          margin-bottom: 10px;
          padding-bottom: 8px;
          border-bottom: 2px solid #e2e8f0;
        }

        .caracteristicas-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin-bottom: 15px;
        }

        .caracteristica-item {
          padding: 10px;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          display: flex;
          gap: 8px;
          align-items: flex-start;
        }

        .caracteristica-completed {
          background: #f0fdf4;
          border-color: #86efac;
        }

        .caracteristica-pending {
          background: #fffbeb;
          border-color: #fcd34d;
        }

        .caracteristica-icon {
          flex-shrink: 0;
          margin-top: 2px;
        }

        .icon-completed {
          color: #16a34a;
        }

        .icon-pending {
          color: #d97706;
        }

        .caracteristica-content {
          flex: 1;
        }

        .caracteristica-name {
          font-weight: 600;
          color: #0f172a;
          margin-bottom: 3px;
          font-size: 12px;
        }

        .caracteristica-completed .caracteristica-name {
          text-decoration: line-through;
          color: #64748b;
        }

        .caracteristica-description {
          font-size: 11px;
          color: #64748b;
          margin-bottom: 3px;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .caracteristica-date {
          font-size: 10px;
          color: #16a34a;
          font-weight: 600;
        }

        .footer {
          margin-top: 20px;
          padding-top: 12px;
          border-top: 2px solid #e2e8f0;
          text-align: center;
          color: #64748b;
          font-size: 10px;
        }

        .footer-company {
          font-weight: 600;
          color: #3b82f6;
          margin-bottom: 3px;
          font-size: 11px;
        }

        .timeline {
          display: grid;
          gap: 8px;
          margin-top: 12px;
        }

        .timeline-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px;
          background: #f8fafc;
          border-radius: 4px;
        }

        .timeline-icon {
          width: 30px;
          height: 30px;
          border-radius: 50%;
          background: #3b82f6;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          font-size: 14px;
        }

        .timeline-content {
          flex: 1;
        }

        .timeline-label {
          font-size: 10px;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .timeline-value {
          font-weight: 600;
          color: #0f172a;
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

          .page-break {
            page-break-before: avoid;
          }
          
          .caracteristicas-grid {
            page-break-inside: avoid;
          }
          
          .caracteristica-item {
            page-break-inside: avoid;
          }
        }
      </style>
    `;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Reporte de Avance - ${avance.nombre_proyecto}</title>
          ${styles}
        </head>
        <body>
          ${reportContent}
          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() {
                window.close();
              };
            };
          </script>
        </body>
      </html>
    `);

    printWindow.document.close();
  };

  const caracteristicasCompletadas = avance.caracteristicas.filter(
    (c) => c.completada
  );
  const caracteristicasPendientes = avance.caracteristicas.filter(
    (c) => !c.completada
  );

  const porcentaje = Number(avance.porcentaje_avance);
  const circumference = 2 * Math.PI * 50; // Reducido de 70 a 50
  const offset = circumference - (porcentaje / 100) * circumference;

  return (
    <>
      <Button onClick={handlePrint} size="lg" className="no-print">
        <Printer className="h-4 w-4 mr-2" />
        Imprimir Reporte
      </Button>

      <div ref={reportRef} style={{ display: "none" }}>
        <div className="report-container">
          {/* Header */}
          <div className="header">
            <div className="header-logo">Sistema de Gestión</div>
            <div className="header-subtitle">
              Reporte de Avance de Proyecto
            </div>
          </div>

          {/* Title */}
          <h1 className="report-title">{avance.nombre_proyecto}</h1>
          <div className="report-date">
            Generado el {formatDate(new Date().toISOString())}
          </div>

          {/* Info Cards */}
          <div className="info-grid">
            <div className="info-card">
              <div className="info-label">
                <span>👤</span> Cliente
              </div>
              <div className="info-value">{avance.cliente_nombre}</div>
            </div>
            <div className="info-card">
              <div className="info-label">
                <span>📅</span> Fecha de Inicio
              </div>
              <div className="info-value">
                {formatDate(avance.fecha_creacion)}
              </div>
            </div>
            <div className="info-card">
              <div className="info-label">
                <span>🔄</span> Última Actualización
              </div>
              <div className="info-value">
                {formatDate(avance.fecha_actualizacion)}
              </div>
            </div>
            <div className="info-card">
              <div className="info-label">
                <span>📊</span> Estado
              </div>
              <div className="info-value">
                {avance.estado === "completado"
                  ? "Completado"
                  : "En Progreso"}
              </div>
            </div>
          </div>

          {/* Progress Section */}
          <div className="progress-section">
            <div className="progress-title">
              <span>📈</span> Progreso del Proyecto
            </div>
            <div className="progress-stats">
              <div>
                <div className="progress-percentage">{porcentaje.toFixed(0)}%</div>
                <div className="progress-subtitle">Completado</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "20px", fontWeight: "700", color: "#1e40af" }}>
                  {avance.caracteristicas_completadas}/{avance.total_caracteristicas}
                </div>
                <div className="progress-subtitle">Tareas</div>
              </div>
            </div>
            <div className="progress-bar-container">
              <div
                className="progress-bar"
                style={{ width: `${porcentaje}%` }}
              >
                {porcentaje > 10 && `${porcentaje.toFixed(0)}%`}
              </div>
            </div>
          </div>

          {/* Charts Grid */}
          <div className="charts-grid">
            {/* Donut Chart */}
            <div className="chart-card">
              <div className="chart-title">Estado de Tareas</div>
              <div className="donut-chart">
                <svg width="140" height="140">
                  <circle
                    cx="70"
                    cy="70"
                    r="50"
                    fill="none"
                    stroke="#e2e8f0"
                    strokeWidth="15"
                  />
                  <circle
                    cx="70"
                    cy="70"
                    r="50"
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="15"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="donut-center">
                  <div className="donut-percentage">
                    {porcentaje.toFixed(0)}%
                  </div>
                  <div className="donut-label">Completado</div>
                </div>
              </div>
            </div>

            {/* Bar Chart */}
            <div className="chart-card">
              <div className="chart-title">Distribución de Tareas</div>
              <div className="bar-chart">
                <div style={{ textAlign: "center" }}>
                  <div
                    className="bar bar-completed"
                    style={{
                      height: `${
                        (caracteristicasCompletadas.length /
                          avance.total_caracteristicas) *
                        100
                      }px`,
                    }}
                  >
                    <span
                      className="bar-value"
                      style={{ color: "#16a34a" }}
                    >
                      {caracteristicasCompletadas.length}
                    </span>
                  </div>
                  <div className="bar-label">Completadas</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div
                    className="bar bar-pending"
                    style={{
                      height: `${
                        (caracteristicasPendientes.length /
                          avance.total_caracteristicas) *
                        100
                      }px`,
                    }}
                  >
                    <span
                      className="bar-value"
                      style={{ color: "#d97706" }}
                    >
                      {caracteristicasPendientes.length}
                    </span>
                  </div>
                  <div className="bar-label">Pendientes</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div
                    className="bar"
                    style={{
                      height: `${
                        (avance.total_caracteristicas /
                          avance.total_caracteristicas) *
                        100
                      }px`,
                    }}
                  >
                    <span
                      className="bar-value"
                      style={{ color: "#2563eb" }}
                    >
                      {avance.total_caracteristicas}
                    </span>
                  </div>
                  <div className="bar-label">Total</div>
                </div>
              </div>
            </div>
          </div>

          {/* Descripción del Proyecto */}
          {avance.descripcion && (
            <div style={{ marginBottom: "15px" }}>
              <div className="section-title">Descripción del Proyecto</div>
              <div
                style={{
                  padding: "12px",
                  background: "#f8fafc",
                  borderRadius: "6px",
                  border: "1px solid #e2e8f0",
                }}
              >
                <p style={{ color: "#475569", lineHeight: "1.5", fontSize: "12px" }}>
                  {avance.descripcion}
                </p>
              </div>
            </div>
          )}

          {/* Características Completadas */}
          {caracteristicasCompletadas.length > 0 && (
            <div style={{ marginBottom: "15px" }}>
              <div className="section-title">
                ✅ Características Completadas ({caracteristicasCompletadas.length})
              </div>
              <div className="caracteristicas-grid">
                {caracteristicasCompletadas.map((caracteristica, index) => (
                  <div
                    key={caracteristica.id}
                    className="caracteristica-item caracteristica-completed"
                  >
                    <div className="caracteristica-icon icon-completed">
                      ✓
                    </div>
                    <div className="caracteristica-content">
                      <div className="caracteristica-name">
                        {index + 1}. {caracteristica.nombre}
                      </div>
                      {caracteristica.descripcion && (
                        <div className="caracteristica-description">
                          {caracteristica.descripcion}
                        </div>
                      )}
                      {caracteristica.fecha_completado && (
                        <div className="caracteristica-date">
                          ✓ {formatDate(caracteristica.fecha_completado)}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Características Pendientes */}
          {caracteristicasPendientes.length > 0 && (
            <div>
              <div className="section-title">
                ⏳ Características Pendientes ({caracteristicasPendientes.length})
              </div>
              <div className="caracteristicas-grid">
                {caracteristicasPendientes.map((caracteristica, index) => (
                  <div
                    key={caracteristica.id}
                    className="caracteristica-item caracteristica-pending"
                  >
                    <div className="caracteristica-icon icon-pending">
                      ○
                    </div>
                    <div className="caracteristica-content">
                      <div className="caracteristica-name">
                        {index + 1}. {caracteristica.nombre}
                      </div>
                      {caracteristica.descripcion && (
                        <div className="caracteristica-description">
                          {caracteristica.descripcion}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="footer">
            <div className="footer-company">Sistema de Gestión de Proyectos</div>
            <div>
              Este reporte es confidencial y está destinado únicamente para el
              cliente especificado.
            </div>
            <div style={{ marginTop: "4px" }}>
              Generado automáticamente el{" "}
              {formatDateTime(new Date().toISOString())}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
