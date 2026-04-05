/**
 * Seed Trees — Database seeder for decision trees
 * Reads JSON files from the trees directory and inserts into cde_decision_trees.
 * Run with: npx ts-node src/server/cde/trees/seed-trees.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { db } from '../../db/client';
import { cdeDecisionTrees } from '../../db/schema';
import { and, eq } from 'drizzle-orm';
import 'dotenv/config';

async function seedTrees() {
  const treesDir = path.join(__dirname);
  const files = fs.readdirSync(treesDir).filter(
    (f) => f.endsWith('.json') && !f.startsWith('_')
  );

  console.log(`Found ${files.length} tree files to seed.`);

  for (const file of files) {
    const filePath = path.join(treesDir, file);
    const treeJson = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    const treeId = treeJson.id;
    const version = treeJson.version;

    // Check if already exists
    const existing = await db.query.cdeDecisionTrees.findFirst({
      where: and(
        eq(cdeDecisionTrees.id, treeId),
        eq(cdeDecisionTrees.version, version)
      ),
    });

    if (existing) {
      console.log(`  [SKIP] ${treeId} v${version} already exists.`);
      continue;
    }

    // Insert
    await db.insert(cdeDecisionTrees).values({
      id: treeId,
      version,
      moduleType: treeJson.moduleType,
      architecture: treeJson.architecture,
      treeJson: treeJson,
      crossReferences: treeJson.crossReferences,
      disclaimers: treeJson.disclaimers,
      status: 'draft',
    });

    console.log(`  [ADDED] ${treeId} v${version} as draft.`);
  }

  console.log('Done seeding trees.');
  process.exit(0);
}

seedTrees().catch((err) => {
  console.error('Seed error:', err);
  process.exit(1);
});
