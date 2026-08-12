/**
 * TEST TEMPORAL (tmp): verifica que lifestyleContextStepSchema exige las
 * 5 preguntas de contexto/estilo de vida SOLO en el paso 5, y que el schema
 * base (medicalDataSchema) sigue permitiendo avanzar los pasos anteriores.
 * Correr: npx tsx scripts/test-lifestyle-schema.tmp.ts (desde apps/form)
 */
import {
  lifestyleContextStepSchema,
  medicalDataSchema,
} from "../src/lib/validation";

let failures = 0;
function check(name: string, cond: boolean, detail?: string) {
  if (cond) {
    console.log(`  ✅ ${name}`);
  } else {
    failures++;
    console.log(`  ❌ ${name}${detail ? " — " + detail : ""}`);
  }
}

console.log("\n═══ 1. Paso 5 (LifestyleContext): formulario VACÍO debe fallar ═══");
const empty = {};
try {
  lifestyleContextStepSchema.validateSync(empty, { abortEarly: false });
  check("vacío rechazado", false, "¡el schema ACEPTÓ datos vacíos!");
} catch (e: any) {
  const fields = Object.fromEntries((e.inner ?? []).map((x: any) => [x.path, x.message]));
  check("vacío rechazado", true);
  check("typicalWeekday tiene error", fields.typicalWeekday === "Describe tu día típico entre semana", JSON.stringify(fields.typicalWeekday));
  check("typicalWeekend tiene error", fields.typicalWeekend === "Describe tu día típico de fin de semana", JSON.stringify(fields.typicalWeekend));
  check("whoCooks tiene error", fields.whoCooks === "Indica quién cocina en casa", JSON.stringify(fields.whoCooks));
  check("currentActivityLevel tiene error", fields.currentActivityLevel === "Indica tu nivel de actividad física actual", JSON.stringify(fields.currentActivityLevel));
  check("physicalLimitations tiene error", fields.physicalLimitations === "Indica si tienes lesiones o limitaciones físicas", JSON.stringify(fields.physicalLimitations));
  check("5 errores en total", (e.inner ?? []).length === 5, `se obtuvieron ${(e.inner ?? []).length}`);
}

console.log("\n═══ 2. Paso 5: 4 de 5 completos debe fallar en el faltante ═══");
const partial = {
  typicalWeekday: "Me levanto 7am, desayuno 8am, almuerzo 1pm, ceno 8pm",
  typicalWeekend: "Los sábados duermo hasta 9am y salgo con amigos",
  whoCooks: "Cocino yo y mi mamá los domingos",
  currentActivityLevel: "Trabajo en oficina, camino 15 min al día",
  // physicalLimitations AUSENTE
};
try {
  lifestyleContextStepSchema.validateSync(partial, { abortEarly: false });
  check("falta physicalLimitations → rechazado", false, "¡el schema ACEPTÓ sin physicalLimitations!");
} catch (e: any) {
  const fields = Object.fromEntries((e.inner ?? []).map((x: any) => [x.path, x.message]));
  check("falta physicalLimitations → rechazado", true);
  check("solo physicalLimitations tiene error", Object.keys(fields).length === 1 && fields.physicalLimitations?.includes("limitaciones"), JSON.stringify(fields));
}

console.log("\n═══ 3. Paso 5: los 5 completos → VÁLIDO ═══");
const full = {
  ...partial,
  physicalLimitations: "Me operé la rodilla en 2024, evito saltos",
};
try {
  const out = lifestyleContextStepSchema.validateSync(full, { abortEarly: false });
  check("5 completos → válido", true);
  check("datos preservados", out.typicalWeekday === full.typicalWeekday && out.physicalLimitations === full.physicalLimitations);
} catch (e: any) {
  check("5 completos → válido", false, (e as Error).message);
}

console.log("\n═══ 4. REGRESIÓN: schema base permite avanzar pasos ANTERIORES ═══");
// HealthEvaluationsStep y MentalHealthStep validan contra medicalDataSchema:
// un usuario en el paso 5/6 NO debería tener que responder las preguntas del
// paso 7 todavía (medicalDataSchema NO debe exigir typicalWeekday).
const earlyStepData = {
  mainComplaint: "Quiero bajar de peso",
  medications: "Ninguna",
  supplements: "Proteína",
};
try {
  medicalDataSchema.validateSync(earlyStepData, { abortEarly: false });
  check("medicalDataSchema sin typicalWeekday → válido (pasos anteriores OK)", true);
} catch (e: any) {
  const fields = Object.fromEntries((e.inner ?? []).map((x: any) => [x.path, x.message]));
  check("medicalDataSchema sin typicalWeekday → válido (pasos anteriores OK)", false, JSON.stringify(fields));
}

console.log("\n════════════════════════════════════════════════════════════");
console.log(failures === 0 ? "🎉 TODOS LOS CHECKS PASARON" : `❌ ${failures} checks FALLARON`);
process.exit(failures === 0 ? 0 : 1);