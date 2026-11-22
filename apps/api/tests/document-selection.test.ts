import assert from 'node:assert/strict';
import { selectCurrentEvaluationDocuments } from '../src/app/lib/document-selection';

console.log('═══ Tests de selección de documentos actuales ═══');

// 1. Vacío
{
  const res = selectCurrentEvaluationDocuments([], []);
  assert.equal(res.selected.length, 0);
  assert.equal(res.reason, 'empty');
  console.log('  ✅ lista vacía');
}

// 2. Primera evaluación: toma hasta maxDocs más recientes
{
  const docs = [
    { name: 'doc1.pdf', uploadedAt: '2026-01-01T10:00:00.000Z' },
    { name: 'doc2.pdf', uploadedAt: '2026-01-01T10:05:00.000Z' },
    { name: 'doc3.pdf', uploadedAt: '2026-01-01T10:10:00.000Z' },
  ];
  const res = selectCurrentEvaluationDocuments(docs, []);
  assert.equal(res.reason, 'initial_evaluation');
  assert.deepEqual(
    res.selected.map((d) => d.name),
    ['doc3.pdf', 'doc2.pdf', 'doc1.pdf']
  );
  console.log('  ✅ primera evaluación mantiene documentos iniciales');
}

// 3. Cliente en sesión 7: ignora documentos viejos de meses 1-6 y toma solo los posteriores a sesión 6
{
  const docs = [
    { name: 'mes1_enero.pdf', uploadedAt: '2026-01-05T10:00:00.000Z' },
    { name: 'mes2_febrero.pdf', uploadedAt: '2026-02-05T10:00:00.000Z' },
    { name: 'mes4_abril.pdf', uploadedAt: '2026-04-05T10:00:00.000Z' },
    { name: 'mes6_junio.pdf', uploadedAt: '2026-06-05T10:00:00.000Z' },
    { name: 'mes7_quimica.pdf', uploadedAt: '2026-07-04T09:00:00.000Z' },
    { name: 'mes7_tiroides.jpg', uploadedAt: '2026-07-04T09:10:00.000Z' },
  ];
  const sessions = [
    { sessionId: 's1', status: 'sent', createdAt: '2026-01-06T12:00:00.000Z' },
    { sessionId: 's6', status: 'sent', createdAt: '2026-06-06T12:00:00.000Z' },
  ];
  const res = selectCurrentEvaluationDocuments(docs, sessions);
  assert.equal(res.reason, 'after_last_completed_session');
  assert.equal(res.excludedCount, 4);
  assert.deepEqual(
    res.selected.map((d) => d.name),
    ['mes7_tiroides.jpg', 'mes7_quimica.pdf']
  );
  console.log('  ✅ sesión 7 toma solo documentos nuevos posteriores a sesión 6');
}

// 4. Regeneración de sesión 7 en borrador: no oculta los documentos subidos para la sesión 7
{
  const docs = [
    { name: 'mes1.pdf', uploadedAt: '2026-01-05T10:00:00.000Z' },
    { name: 'mes6.pdf', uploadedAt: '2026-06-05T10:00:00.000Z' },
    { name: 'mes7_nuevo.pdf', uploadedAt: '2026-07-04T09:00:00.000Z' },
  ];
  const sessions = [
    { sessionId: 's6', status: 'sent', createdAt: '2026-06-06T12:00:00.000Z' },
    { sessionId: 's7_draft', status: 'draft', createdAt: '2026-07-04T10:00:00.000Z' },
  ];
  const res = selectCurrentEvaluationDocuments(docs, sessions, { excludeSessionId: 's7_draft' });
  assert.equal(res.reason, 'after_last_completed_session');
  assert.deepEqual(
    res.selected.map((d) => d.name),
    ['mes7_nuevo.pdf']
  );
  console.log('  ✅ regeneración de borrador preserva los documentos de la sesión actual');
}

// 5. Sesión 7 sin documentos nuevos después de sesión 6: toma únicamente el lote más reciente (mes 5), no mes 1
{
  const docs = [
    { name: 'mes1_viejo.pdf', uploadedAt: '2026-01-05T10:00:00.000Z' },
    { name: 'mes5_a.pdf', uploadedAt: '2026-05-02T10:00:00.000Z' },
    { name: 'mes5_b.pdf', uploadedAt: '2026-05-10T10:00:00.000Z' },
  ];
  const sessions = [
    { sessionId: 's6', status: 'sent', createdAt: '2026-06-06T12:00:00.000Z' },
  ];
  const res = selectCurrentEvaluationDocuments(docs, sessions);
  assert.equal(res.reason, 'latest_upload_batch');
  assert.deepEqual(
    res.selected.map((d) => d.name),
    ['mes5_b.pdf', 'mes5_a.pdf']
  );
  console.log('  ✅ sin documentos nuevos toma solo el último lote reciente');
}

// 6. Documentos heredados sin fecha: toma los últimos agregados con tope
{
  const docs = [
    { name: 'old1.pdf' },
    { name: 'old2.pdf' },
    { name: 'recent1.pdf' },
    { name: 'recent2.pdf' },
    { name: 'recent3.pdf' },
  ];
  const sessions = [{ sessionId: 's1', status: 'sent' }];
  const res = selectCurrentEvaluationDocuments(docs, sessions);
  assert.equal(res.reason, 'legacy_tail');
  assert.deepEqual(
    res.selected.map((d) => d.name),
    ['recent3.pdf', 'recent2.pdf', 'recent1.pdf']
  );
  console.log('  ✅ documentos sin fecha toman los últimos agregados');
}

console.log('🎉 Todos los tests de document-selection pasaron');
