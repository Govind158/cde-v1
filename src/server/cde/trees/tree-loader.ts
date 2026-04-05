/**
 * Tree Loader — Load and cache decision trees
 * First checks database for active version, falls back to JSON files.
 */

import type { DecisionTree } from '@/types/cde';
import { db } from '@/server/db/client';
import { cdeDecisionTrees } from '@/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { RED_FLAG_REGISTRY } from '../safety/red-flag-registry';

/** In-memory cache for loaded trees */
const treeCache = new Map<string, { tree: DecisionTree; loadedAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Load a decision tree by ID. Checks DB first, falls back to JSON files.
 */
export async function loadTree(treeId: string): Promise<DecisionTree> {
  // Check cache first
  const cached = treeCache.get(treeId);
  if (cached && Date.now() - cached.loadedAt < CACHE_TTL_MS) {
    return cached.tree;
  }

  // Try database
  try {
    const row = await db.query.cdeDecisionTrees.findFirst({
      where: and(
        eq(cdeDecisionTrees.id, treeId),
        eq(cdeDecisionTrees.status, 'active')
      ),
    });

    if (row) {
      const tree = row.treeJson as unknown as DecisionTree;
      treeCache.set(treeId, { tree, loadedAt: Date.now() });
      return tree;
    }
  } catch {
    // Database not available
  }

  // Fallback to JSON files
  const fileMap: Record<string, string> = {
    DT_LBP_001: 'low-back-pain',
    DT_LOW_BACK_PAIN: 'low-back-pain',
    DT_LUMBAR_SPINE: 'low-back-pain',
    DT_LOWER_BACK: 'low-back-pain',
    DT_LOWER_BACK_PAIN: 'low-back-pain',
    // Future trees:
    // DT_NECK_PAIN: 'neck-pain',
    // DT_SHOULDER: 'shoulder-pain',
    // DT_KNEE: 'knee-pain',
    // DT_WELLNESS: 'general-wellness',
  };

  const fileName = fileMap[treeId];
  if (fileName) {
    try {
      const tree = require(`./${fileName}.json`) as DecisionTree;
      treeCache.set(treeId, { tree, loadedAt: Date.now() });
      return tree;
    } catch {
      throw new Error(`Tree file not found: ${fileName}.json`);
    }
  }

  throw new Error(`Decision tree not found: ${treeId}`);
}

/**
 * Get all available decision trees.
 */
export async function getAvailableTrees(): Promise<
  { id: string; version: string; status: string; moduleType: string }[]
> {
  try {
    const rows = await db.query.cdeDecisionTrees.findMany();
    return rows.map((r) => ({
      id: r.id,
      version: r.version,
      status: r.status,
      moduleType: r.moduleType,
    }));
  } catch {
    return [];
  }
}

/**
 * Validate a decision tree for correctness.
 */
export function validateTree(tree: DecisionTree): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check all question IDs are unique
  const allQuestionIds = new Set<string>();
  const layers = [tree.layers.layer0, tree.layers.layer1, tree.layers.layer2, tree.layers.layer3];

  for (const layer of layers) {
    for (const question of layer.questions) {
      if (allQuestionIds.has(question.id)) {
        errors.push(`Duplicate question ID: ${question.id}`);
      }
      allQuestionIds.add(question.id);

      // Check sections
      if (question.sections) {
        for (const section of question.sections) {
          if (allQuestionIds.has(section.id)) {
            errors.push(`Duplicate question ID in sections: ${section.id}`);
          }
          allQuestionIds.add(section.id);
        }
      }
    }
  }

  // Check branch targets exist
  for (const layer of layers) {
    for (const question of layer.questions) {
      for (const option of question.options) {
        if (option.branchTo && !allQuestionIds.has(option.branchTo)) {
          errors.push(`Branch target not found: ${option.branchTo} (from ${question.id})`);
        }
      }
      if (question.branching) {
        for (const target of Object.values(question.branching)) {
          if (!allQuestionIds.has(target)) {
            errors.push(`Branching target not found: ${target} (from ${question.id})`);
          }
        }
      }
    }
  }

  // Check red flag references exist in registry
  for (const layer of layers) {
    for (const question of layer.questions) {
      if (question.redFlagHalt) {
        for (const flagId of Object.values(question.redFlagHalt)) {
          if (!RED_FLAG_REGISTRY.find((rf) => rf.id === flagId)) {
            errors.push(`Red flag not found in registry: ${flagId}`);
          }
        }
      }
    }
  }

  // Check scoring weights sum to ~1.0
  const weights = Object.values(tree.architecture.scoringWeights);
  const nonZeroWeights = weights.filter((w) => w > 0);
  const weightSum = nonZeroWeights.reduce((a, b) => a + b, 0);
  if (Math.abs(weightSum - 1.0) > 0.01) {
    errors.push(`Scoring weights (non-zero) sum to ${weightSum}, expected 1.0`);
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Invalidate the cache for a specific tree or all trees.
 */
export function invalidateCache(treeId?: string): void {
  if (treeId) {
    treeCache.delete(treeId);
  } else {
    treeCache.clear();
  }
}
