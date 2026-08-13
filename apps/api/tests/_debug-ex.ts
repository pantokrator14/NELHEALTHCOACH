import 'dotenv/config';
import { NextRequest } from 'next/server';
import { ObjectId } from 'mongodb';
import { POST as createExercise } from '../src/app/api/exercises/route';
import { coachToken, authedRequest } from './helpers';

async function main() {
  const token = coachToken(new ObjectId().toString());
  const body = {
    name: `Ejercicio TDD ${Date.now()}`,
    description: 'Descripción de ejercicio TDD',
    category: ['fuerza'],
    instructions: ['Ejecutar', 'Descansar'],
    equipment: ['ninguno'],
    difficulty: 'easy',
    clientLevel: 'principiante',
    muscleGroups: ['pectorales'],
    sets: 3,
    repetitions: '10',
    timeUnderTension: '3-1-1',
    restBetweenSets: '60 segundos',
    progression: '',
    isPublished: true,
  };
  const res = await createExercise(authedRequest('http://x/api/exercises', 'POST', token, body), { params: Promise.resolve({}) });
  console.log('STATUS:', res.status);
  console.log('BODY:', (await res.text()).slice(0, 400));
}
main().catch(e => { console.error('FALLO:', e); process.exit(1); });
