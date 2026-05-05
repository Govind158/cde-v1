/**
 * QuickScan module registry. Each module is a pure data spec (QSModule).
 * Adding a new module = importing it here and adding it to the catalogue.
 *
 * Visibility note: a module marked `available: false` shows on the picker
 * with a "Coming soon — clinical review" affordance and is not selectable.
 */

import type { QSModule } from '../types';
import lowBack from './low-back';
import knee from './knee';

export interface QSModuleListing {
  id: string;
  kind: 'location' | 'condition';
  displayName: string;
  shortDescription: string;
  estimatedMinutes: number;
  /** Region key for picker grouping & DeepScan handoff. */
  deepScanRegion?: string;
  /** Active in v1 — only `true` modules are runnable. */
  available: boolean;
  /** Reference to the module spec when available. */
  spec?: QSModule;
}

export const LOCATION_MODULES: QSModuleListing[] = [
  {
    id: 'low-back',
    kind: 'location',
    displayName: 'Low Back',
    shortDescription: 'Postural / sciatic / chronic low-back patterns',
    estimatedMinutes: 3,
    deepScanRegion: 'Lower back',
    available: true,
    spec: lowBack,
  },
  {
    id: 'knee',
    kind: 'location',
    displayName: 'Knee',
    shortDescription: 'Activity-related vs degenerative knee patterns',
    estimatedMinutes: 3,
    deepScanRegion: 'Knee or Ankle',
    available: true,
    spec: knee,
  },
  {
    id: 'neck',
    kind: 'location',
    displayName: 'Neck',
    shortDescription: 'Cervical and tech-neck signals',
    estimatedMinutes: 3,
    deepScanRegion: 'Neck',
    available: false,
  },
  {
    id: 'shoulder',
    kind: 'location',
    displayName: 'Shoulder',
    shortDescription: 'Rotator cuff, frozen shoulder & impingement',
    estimatedMinutes: 3,
    deepScanRegion: 'Shoulder',
    available: false,
  },
  {
    id: 'heel-foot',
    kind: 'location',
    displayName: 'Heel & Foot',
    shortDescription: 'Plantar fasciitis, achilles, forefoot',
    estimatedMinutes: 3,
    deepScanRegion: 'Knee or Ankle',
    available: false,
  },
];

export const CONDITION_MODULES: QSModuleListing[] = [
  {
    id: 'disc-bulge',
    kind: 'condition',
    displayName: 'Disc Bulge',
    shortDescription: 'Disc herniation / prolapse / annular tear',
    estimatedMinutes: 3,
    available: false,
  },
  {
    id: 'sciatica',
    kind: 'condition',
    displayName: 'Sciatica',
    shortDescription: 'Lumbar radicular pain pattern',
    estimatedMinutes: 3,
    available: false,
  },
  {
    id: 'spondylosis',
    kind: 'condition',
    displayName: 'Spondylosis',
    shortDescription: 'Cervical / lumbar age-related degeneration',
    estimatedMinutes: 3,
    available: false,
  },
  {
    id: 'osteoarthritis',
    kind: 'condition',
    displayName: 'Osteoarthritis',
    shortDescription: 'Joint OA — knee, hip, hand',
    estimatedMinutes: 3,
    available: false,
  },
  {
    id: 'osteoporosis',
    kind: 'condition',
    displayName: 'Osteoporosis',
    shortDescription: 'Low bone density risk',
    estimatedMinutes: 3,
    available: false,
  },
  {
    id: 'rheumatoid-arthritis',
    kind: 'condition',
    displayName: 'Rheumatoid Arthritis',
    shortDescription: 'Inflammatory joint disease',
    estimatedMinutes: 3,
    available: false,
  },
  {
    id: 'rotator-cuff',
    kind: 'condition',
    displayName: 'Rotator Cuff Injury',
    shortDescription: 'Shoulder cuff tendinopathy / tear',
    estimatedMinutes: 3,
    available: false,
  },
];

export function findModule(id: string): QSModule | undefined {
  return [...LOCATION_MODULES, ...CONDITION_MODULES].find(
    (m) => m.id === id && m.available && m.spec,
  )?.spec;
}
