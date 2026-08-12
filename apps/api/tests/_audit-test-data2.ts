import 'dotenv/config';
import { MongoClient } from 'mongodb';
import { decrypt, safeDecrypt } from '../src/app/lib/encryption';

async function main() {
  const mongo = new MongoClient(process.env.MONGODB_URI!);
  await mongo.connect();
  const db = mongo.db();

  // Marcadores de sesión usados por los tests:
  // - pdf-route: 'e2e_pdf_test_session' + checklist pdf_chk_1/2/3
  // - regen-e2e: 'session_old_regen_test'
  const markers = ['e2e_pdf_test_session', 'session_old_regen_test', 'pdf_chk_', 'regen_', 'test_e2e_session'];
  const clients = await db.collection('healthforms').find({
    $or: [
      { 'aiProgress.currentSessionId': { $in: markers } },
      { 'aiProgress.sessions.sessionId': { $in: markers } },
      { 'aiProgress.sessions.sessionId': /test|e2e/i },
    ]
  }).project({ coachId: 1, personalData: 1, 'aiProgress.currentSessionId': 1, 'aiProgress.sessions.sessionId': 1 }).toArray();

  console.log(`=== Perfiles con marcadores de test: ${clients.length} ===`);
  for (const c of clients) {
    let name = '???';
    try { name = safeDecrypt(c.personalData?.name) || c.personalData?.name || '??'; } catch {}
    console.log(`- ${c._id} | name="${name}" | coachId=${c.coachId} | curSession=${c.aiProgress?.currentSessionId} | sessions=${(c.aiProgress?.sessions||[]).map((s:any)=>s.sessionId).join(',')}`);
  }

  await mongo.close();
}
main().catch(e => { console.error('FALLO:', e.message); process.exit(1); });
