/**
 * Script para recalcular los porcentajes de avance de todos los proyectos
 * Útil cuando el trigger de la BD no se ejecutó correctamente
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Cargar variables de entorno
dotenv.config({ path: join(__dirname, "../.env") });

const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://svpprgzklqwsnevejihu.supabase.co";
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || "sb_publishable_kfq79EwWoGaQd13OxcHO4Q_pLQutDkB";

const supabase = createClient(supabaseUrl, supabaseKey);

async function recalcularAvances() {
  try {
    console.log("🔄 Iniciando recálculo de avances...\n");

    // Obtener todos los avances
    const { data: avances, error: avancesError } = await supabase
      .from("avances")
      .select("id, nombre_proyecto");

    if (avancesError) {
      throw avancesError;
    }

    if (!avances || avances.length === 0) {
      console.log("ℹ️  No hay avances para recalcular");
      return;
    }

    console.log(`📊 Encontrados ${avances.length} avances para recalcular\n`);

    let actualizados = 0;
    let errores = 0;

    for (const avance of avances) {
      try {
        // Obtener todas las características del avance
        const { data: caracteristicas, error: caracError } = await supabase
          .from("avances_caracteristicas")
          .select("completada")
          .eq("avance_id", avance.id);

        if (caracError) {
          console.error(`❌ Error obteniendo características de "${avance.nombre_proyecto}":`, caracError.message);
          errores++;
          continue;
        }

        if (!caracteristicas) {
          console.log(`⚠️  "${avance.nombre_proyecto}" no tiene características`);
          continue;
        }

        // Calcular totales
        const total = caracteristicas.length;
        const completadas = caracteristicas.filter(c => c.completada).length;
        const porcentaje = total > 0 ? (completadas / total) * 100 : 0;
        const estado = porcentaje === 100 ? "completado" : "en_progreso";

        // Actualizar el avance
        const { error: updateError } = await supabase
          .from("avances")
          .update({
            total_caracteristicas: total,
            caracteristicas_completadas: completadas,
            porcentaje_avance: porcentaje,
            estado: estado,
            fecha_actualizacion: new Date().toISOString(),
          })
          .eq("id", avance.id);

        if (updateError) {
          console.error(`❌ Error actualizando "${avance.nombre_proyecto}":`, updateError.message);
          errores++;
          continue;
        }

        console.log(`✅ "${avance.nombre_proyecto}": ${completadas}/${total} (${porcentaje.toFixed(0)}%) - ${estado}`);
        actualizados++;

      } catch (err: any) {
        console.error(`❌ Error procesando "${avance.nombre_proyecto}":`, err.message);
        errores++;
      }
    }

    console.log("\n" + "=".repeat(60));
    console.log(`✨ Recálculo completado`);
    console.log(`   ✅ Actualizados: ${actualizados}`);
    if (errores > 0) {
      console.log(`   ❌ Errores: ${errores}`);
    }
    console.log("=".repeat(60) + "\n");

  } catch (error: any) {
    console.error("❌ Error fatal:", error.message);
    process.exit(1);
  }
}

// Ejecutar el script
recalcularAvances()
  .then(() => {
    console.log("🎉 Script finalizado correctamente");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Error ejecutando el script:", error);
    process.exit(1);
  });
