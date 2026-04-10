/**
 * Body Regions — Body region taxonomy constants
 * Defines the complete body region hierarchy with tree mapping.
 */

export interface BodyRegionDef {
  id: string;
  displayName: string;
  parent: string | null;
  subRegions: string[];
  relatedRegions: string[];
  commonReferralPatterns: string[];
  treeId: string | null;
}

export const BODY_REGIONS: Record<string, BodyRegionDef> = {
  lumbar_spine: {
    id: 'lumbar_spine',
    displayName: 'Lower Back',
    parent: 'spine',
    subRegions: ['lumbar_l1_l2', 'lumbar_l3_l4', 'lumbar_l5_s1'],
    relatedRegions: ['hip_left', 'hip_right', 'thoracic_spine'],
    commonReferralPatterns: ['buttock', 'posterior_thigh', 'calf', 'foot'],
    treeId: 'DT_LBP_001',
  },
  lower_back: {
    id: 'lower_back',
    displayName: 'Lower Back',
    parent: 'spine',
    subRegions: [],
    relatedRegions: ['lumbar_spine'],
    commonReferralPatterns: [],
    treeId: 'DT_LBP_001', // alias for lumbar_spine
  },
  cervical_spine: {
    id: 'cervical_spine',
    displayName: 'Neck',
    parent: 'spine',
    subRegions: ['cervical_upper', 'cervical_lower'],
    relatedRegions: ['shoulder_left', 'shoulder_right', 'thoracic_spine'],
    commonReferralPatterns: ['shoulder', 'arm', 'hand', 'head'],
    treeId: 'DT_NECK_001',
  },
  neck: {
    id: 'neck',
    displayName: 'Neck',
    parent: 'spine',
    subRegions: [],
    relatedRegions: ['cervical_spine'],
    commonReferralPatterns: ['shoulder', 'arm', 'head'],
    treeId: 'DT_NECK_001',
  },
  thoracic_spine: {
    id: 'thoracic_spine',
    displayName: 'Upper/Mid Back',
    parent: 'spine',
    subRegions: [],
    relatedRegions: ['cervical_spine', 'lumbar_spine'],
    commonReferralPatterns: ['rib_cage', 'abdomen'],
    treeId: null,
  },
  shoulder_left: {
    id: 'shoulder_left',
    displayName: 'Left Shoulder',
    parent: 'upper_limb',
    subRegions: ['rotator_cuff_left', 'acromioclavicular_left'],
    relatedRegions: ['shoulder_right', 'cervical_spine'],
    commonReferralPatterns: ['upper_arm', 'neck'],
    treeId: 'DT_SHOULDER_001',
  },
  shoulder_right: {
    id: 'shoulder_right',
    displayName: 'Right Shoulder',
    parent: 'upper_limb',
    subRegions: ['rotator_cuff_right', 'acromioclavicular_right'],
    relatedRegions: ['shoulder_left', 'cervical_spine'],
    commonReferralPatterns: ['upper_arm', 'neck'],
    treeId: 'DT_SHOULDER_001',
  },
  shoulder: {
    id: 'shoulder',
    displayName: 'Shoulder',
    parent: 'upper_limb',
    subRegions: [],
    relatedRegions: ['shoulder_left', 'shoulder_right', 'cervical_spine'],
    commonReferralPatterns: ['upper_arm', 'neck'],
    treeId: 'DT_SHOULDER_001',
  },
  knee_left: {
    id: 'knee_left',
    displayName: 'Left Knee',
    parent: 'lower_limb',
    subRegions: ['patellofemoral_left', 'meniscal_left'],
    relatedRegions: ['knee_right', 'hip_left'],
    commonReferralPatterns: ['shin', 'thigh'],
    treeId: 'DT_KNEE_001',
  },
  knee_right: {
    id: 'knee_right',
    displayName: 'Right Knee',
    parent: 'lower_limb',
    subRegions: ['patellofemoral_right', 'meniscal_right'],
    relatedRegions: ['knee_left', 'hip_right'],
    commonReferralPatterns: ['shin', 'thigh'],
    treeId: 'DT_KNEE_001',
  },
  knee: {
    id: 'knee',
    displayName: 'Knee',
    parent: 'lower_limb',
    subRegions: [],
    relatedRegions: ['knee_left', 'knee_right', 'hip_left', 'hip_right'],
    commonReferralPatterns: ['shin', 'thigh'],
    treeId: 'DT_KNEE_001',
  },
  hip_left: {
    id: 'hip_left',
    displayName: 'Left Hip',
    parent: 'lower_limb',
    subRegions: [],
    relatedRegions: ['hip_right', 'lumbar_spine'],
    commonReferralPatterns: ['groin', 'buttock', 'thigh'],
    treeId: 'DT_HIP_001',
  },
  hip_right: {
    id: 'hip_right',
    displayName: 'Right Hip',
    parent: 'lower_limb',
    subRegions: [],
    relatedRegions: ['hip_left', 'lumbar_spine'],
    commonReferralPatterns: ['groin', 'buttock', 'thigh'],
    treeId: 'DT_HIP_001',
  },
  hip: {
    id: 'hip',
    displayName: 'Hip',
    parent: 'lower_limb',
    subRegions: [],
    relatedRegions: ['hip_left', 'hip_right', 'lumbar_spine'],
    commonReferralPatterns: ['groin', 'buttock', 'thigh'],
    treeId: 'DT_HIP_001',
  },
  ankle_left: {
    id: 'ankle_left',
    displayName: 'Left Ankle',
    parent: 'lower_limb',
    subRegions: [],
    relatedRegions: ['ankle_right', 'knee_left'],
    commonReferralPatterns: ['foot', 'heel', 'shin'],
    treeId: 'DT_ANKLE_001',
  },
  ankle_right: {
    id: 'ankle_right',
    displayName: 'Right Ankle',
    parent: 'lower_limb',
    subRegions: [],
    relatedRegions: ['ankle_left', 'knee_right'],
    commonReferralPatterns: ['foot', 'heel', 'shin'],
    treeId: 'DT_ANKLE_001',
  },
  ankle: {
    id: 'ankle',
    displayName: 'Ankle',
    parent: 'lower_limb',
    subRegions: [],
    relatedRegions: ['ankle_left', 'ankle_right', 'knee_left', 'knee_right'],
    commonReferralPatterns: ['foot', 'heel', 'shin'],
    treeId: 'DT_ANKLE_001',
  },
  elbow: {
    id: 'elbow',
    displayName: 'Elbow',
    parent: 'upper_limb',
    subRegions: ['elbow_lateral', 'elbow_medial'],
    relatedRegions: ['wrist_hand', 'shoulder_left', 'shoulder_right'],
    commonReferralPatterns: ['forearm', 'wrist'],
    treeId: 'DT_ELBOW_001',
  },
  elbow_left: {
    id: 'elbow_left',
    displayName: 'Left Elbow',
    parent: 'upper_limb',
    subRegions: [],
    relatedRegions: ['elbow', 'wrist_hand'],
    commonReferralPatterns: ['forearm', 'wrist'],
    treeId: 'DT_ELBOW_001',
  },
  elbow_right: {
    id: 'elbow_right',
    displayName: 'Right Elbow',
    parent: 'upper_limb',
    subRegions: [],
    relatedRegions: ['elbow', 'wrist_hand'],
    commonReferralPatterns: ['forearm', 'wrist'],
    treeId: 'DT_ELBOW_001',
  },
  wrist_hand: {
    id: 'wrist_hand',
    displayName: 'Wrist / Hand',
    parent: 'upper_limb',
    subRegions: ['wrist', 'hand', 'fingers'],
    relatedRegions: ['elbow', 'cervical_spine'],
    commonReferralPatterns: ['forearm'],
    treeId: 'DT_WRIST_001',
  },
  wrist: {
    id: 'wrist',
    displayName: 'Wrist',
    parent: 'upper_limb',
    subRegions: [],
    relatedRegions: ['wrist_hand', 'elbow'],
    commonReferralPatterns: ['forearm', 'hand'],
    treeId: 'DT_WRIST_001',
  },
  hand: {
    id: 'hand',
    displayName: 'Hand',
    parent: 'upper_limb',
    subRegions: [],
    relatedRegions: ['wrist_hand', 'wrist'],
    commonReferralPatterns: ['forearm', 'fingers'],
    treeId: 'DT_WRIST_001',
  },
};

/**
 * Look up the decision tree ID for a given body region.
 * Returns null if no tree is available for this region.
 */
export function getTreeIdForRegion(regionId: string): string | null {
  const region = BODY_REGIONS[regionId];
  return region?.treeId ?? null;
}

/**
 * Get the display name for a body region.
 */
export function getRegionDisplayName(regionId: string): string {
  return BODY_REGIONS[regionId]?.displayName ?? regionId.replace(/_/g, ' ');
}
