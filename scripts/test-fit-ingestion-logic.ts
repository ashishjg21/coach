import { prisma } from '../server/utils/db';
import { parseFitFile, normalizeFitSession, extractFitStreams } from '../server/utils/fit';
import { workoutRepository } from '../server/utils/repositories/workoutRepository';
import { calculateWorkoutStress } from '../server/utils/calculate-workout-stress';
import fs from 'fs';
import path from 'path';

async function main() {
  const filePath = 'examples/2025-12-21-16-16-38.fit';
  const fullPath = path.resolve(process.cwd(), filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.error(`File not found: ${fullPath}`);
    return;
  }

  const fileData = fs.readFileSync(fullPath);
  console.log(`Parsing FIT file: ${filePath}`);
  
  const fitData = await parseFitFile(fileData);
  const session = fitData.sessions[0];
  
  if (!session) {
    console.error('No session found in FIT file');
    return;
  }
  
  console.log('Session data:', JSON.stringify(session, null, 2));

  // Use a dummy user ID for testing
  const userId = 'user_123';
  const workoutData = normalizeFitSession(session, userId, 'test.fit');
  
  console.log('Normalized workout data:', JSON.stringify(workoutData, null, 2));
  
  const streams = extractFitStreams(fitData.records);
  console.log('Extracted streams keys:', Object.keys(streams));
  console.log('Stream lengths:', Object.fromEntries(Object.entries(streams).map(([k, v]) => [k, v.length])));
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
