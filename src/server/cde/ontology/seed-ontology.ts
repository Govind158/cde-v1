/**
 * Seed Ontology — Seeds body regions, conditions, and red flags into the database.
 * Idempotent: safe to run multiple times.
 * Run with: npx ts-node src/server/cde/ontology/seed-ontology.ts
 */

import { db } from '../../db/client';
import 'dotenv/config';
import { cdeBodyRegions, cdeConditions, cdeRedFlags } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { RED_FLAG_REGISTRY } from '../safety/red-flag-registry';

const BODY_REGIONS = [
  { id: 'cervical', displayName: 'Neck', parentRegion: null, subRegions: ['cervical_left', 'cervical_right'], relatedRegions: ['upper_back', 'shoulder_left', 'shoulder_right'] },
  { id: 'upper_back', displayName: 'Upper Back', parentRegion: null, subRegions: ['thoracic'], relatedRegions: ['cervical', 'lumbar_spine'] },
  { id: 'lumbar_spine', displayName: 'Lower Back', parentRegion: null, subRegions: ['lumbar_left', 'lumbar_right'], relatedRegions: ['upper_back', 'hip_left', 'hip_right'] },
  { id: 'shoulder_left', displayName: 'Left Shoulder', parentRegion: null, subRegions: [], relatedRegions: ['cervical', 'shoulder_right'] },
  { id: 'shoulder_right', displayName: 'Right Shoulder', parentRegion: null, subRegions: [], relatedRegions: ['cervical', 'shoulder_left'] },
  { id: 'hip_left', displayName: 'Left Hip', parentRegion: null, subRegions: [], relatedRegions: ['lumbar_spine', 'knee_left'] },
  { id: 'hip_right', displayName: 'Right Hip', parentRegion: null, subRegions: [], relatedRegions: ['lumbar_spine', 'knee_right'] },
  { id: 'knee_left', displayName: 'Left Knee', parentRegion: null, subRegions: [], relatedRegions: ['hip_left', 'heel_foot_left'] },
  { id: 'knee_right', displayName: 'Right Knee', parentRegion: null, subRegions: [], relatedRegions: ['hip_right', 'heel_foot_right'] },
  { id: 'heel_foot_left', displayName: 'Left Foot', parentRegion: null, subRegions: [], relatedRegions: ['knee_left'] },
  { id: 'heel_foot_right', displayName: 'Right Foot', parentRegion: null, subRegions: [], relatedRegions: ['knee_right'] },
];

const CONDITIONS = [
  { id: 'low_back_pain', displayName: 'Low Back Pain', bodyRegionId: 'lumbar_spine', moduleType: 'location', architectureType: 'symptom_dominant', icd10Code: 'M54.5' },
  { id: 'sciatica', displayName: 'Sciatica', bodyRegionId: 'lumbar_spine', moduleType: 'condition', architectureType: 'condition_specific', icd10Code: 'M54.3' },
  { id: 'disc_bulge', displayName: 'Disc Bulge', bodyRegionId: 'lumbar_spine', moduleType: 'condition', architectureType: 'condition_specific', icd10Code: 'M51.1' },
  { id: 'spondylosis', displayName: 'Spondylosis', bodyRegionId: 'lumbar_spine', moduleType: 'condition', architectureType: 'condition_specific', icd10Code: 'M47.8' },
  { id: 'osteoarthritis', displayName: 'Osteoarthritis', bodyRegionId: null, moduleType: 'condition', architectureType: 'condition_specific', icd10Code: 'M19.9' },
  { id: 'rheumatoid_arthritis', displayName: 'Rheumatoid Arthritis', bodyRegionId: null, moduleType: 'condition', architectureType: 'condition_specific', icd10Code: 'M06.9' },
  { id: 'rotator_cuff', displayName: 'Rotator Cuff', bodyRegionId: 'shoulder_right', moduleType: 'condition', architectureType: 'condition_specific', icd10Code: 'M75.1' },
  { id: 'osteoporosis', displayName: 'Osteoporosis', bodyRegionId: null, moduleType: 'condition', architectureType: 'condition_specific', icd10Code: 'M81.0' },
  { id: 'neck_pain', displayName: 'Neck Pain', bodyRegionId: 'cervical', moduleType: 'location', architectureType: 'symptom_dominant', icd10Code: 'M54.2' },
];

async function seedOntology() {
  console.log('Seeding body regions...');
  for (const region of BODY_REGIONS) {
    const existing = await db.query.cdeBodyRegions.findFirst({
      where: eq(cdeBodyRegions.id, region.id),
    });
    if (!existing) {
      await db.insert(cdeBodyRegions).values({
        id: region.id,
        displayName: region.displayName,
        parentRegion: region.parentRegion,
        subRegions: region.subRegions,
        relatedRegions: region.relatedRegions,
      });
      console.log(`  [ADDED] ${region.id}`);
    }
  }

  console.log('Seeding conditions...');
  for (const cond of CONDITIONS) {
    const existing = await db.query.cdeConditions.findFirst({
      where: eq(cdeConditions.id, cond.id),
    });
    if (!existing) {
      await db.insert(cdeConditions).values({
        id: cond.id,
        displayName: cond.displayName,
        bodyRegionId: cond.bodyRegionId,
        moduleType: cond.moduleType,
        architectureType: cond.architectureType,
        icd10Code: cond.icd10Code,
        redFlagScreenRequired: true,
      });
      console.log(`  [ADDED] ${cond.id}`);
    }
  }

  console.log('Seeding red flags...');
  for (const rf of RED_FLAG_REGISTRY) {
    const existing = await db.query.cdeRedFlags.findFirst({
      where: eq(cdeRedFlags.id, rf.id),
    });
    if (!existing) {
      await db.insert(cdeRedFlags).values({
        id: rf.id,
        displayName: rf.displayName,
        clinicalConcern: rf.clinicalConcern,
        urgency: rf.urgency,
        haltMessage: rf.haltMessage,
        haltAction: rf.haltAction,
        sourcePrds: rf.sourcePrds,
        requiresCoordination: rf.requiresCoordination,
        coordinatedModules: rf.coordinatedModules,
      });
      console.log(`  [ADDED] ${rf.id}`);
    }
  }

  console.log('Done seeding ontology.');
  process.exit(0);
}

seedOntology().catch((err) => {
  console.error('Seed error:', err);
  process.exit(1);
});
