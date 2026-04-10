# Care Pathways — Definitions & Scoring

## Universal Pathways (All Regions)

### cp_self_manage — Self-Managed Recovery
- **Duration:** 4 weeks
- **Providers:** Self + digital guidance
- **Risk alignment:** GREEN, BLUE
- **Target conditions:** ALL `*_postural`, `*_muscle`, `*_soft_tissue`, any green-flag condition with GREEN/BLUE risk
- **Description:** Home exercise prescription, activity modification guidance, posture education, self-monitoring tools
- **Eligibility:** No red/yellow flags, no neurological deficit, functional impact score ≤2

### cp_guided_rehab — Guided Rehabilitation
- **Duration:** 8 weeks
- **Providers:** Physiotherapist
- **Risk alignment:** YELLOW
- **Target conditions:** ALL green-flag conditions with YELLOW risk, `*_tendinopathy`, `*_oa` (mild-moderate), `*_instability` (chronic), `*_disc`, `*_si_joint`, `*_piriformis`, `*_ddd`
- **Description:** Structured physio program with progressive loading, manual therapy, exercise prescription, fortnightly reviews
- **Eligibility:** No red flags, functional impact ≤5, manageable neurological involvement

### cp_intensive — Multi-Disciplinary Program
- **Duration:** 12 weeks
- **Providers:** Physiotherapist + sports medicine + pain specialist
- **Risk alignment:** ORANGE
- **Target conditions:** ALL yellow-flag conditions, `*_radiculopathy`, `*_stenosis`, `*_myelopathy` (stable), `*_as`, `*_ra`, `*_oa` (moderate-severe), `*_neuropathy`
- **Description:** Intensive multi-modal program, may include imaging referral, specialist consultation, pain management strategies
- **Eligibility:** Yellow flags present OR functional impact ≥6 OR neurological deficit present

### cp_specialist — Specialist Consultation
- **Duration:** Varies (initial consult + follow-up)
- **Providers:** Orthopaedic surgeon / Rheumatologist / Neurologist / Pain physician
- **Risk alignment:** RED, ORANGE
- **Target conditions:** ALL conditions with ORANGE/RED risk, progressive neurological deficit, conditions requiring imaging/investigations, failed conservative management (>12 weeks no improvement)
- **Description:** Direct referral for specialist opinion, imaging, investigations, possible surgical consultation

### cp_emergency — Emergency Referral
- **Duration:** Immediate
- **Providers:** Emergency medicine
- **Risk alignment:** RED
- **Target conditions:** Cauda equina, fracture, dislocation, septic arthritis, VBI, cardiac referral, Achilles rupture, flexor sheath infection, SCFE
- **Description:** Immediate medical attention — session halts, emergency instructions provided

## Region-Specific Pathways

### cp_back_deconditioning — Back Deconditioning Program
- **Duration:** 6 weeks
- **Providers:** Physiotherapist + exercise physiologist
- **Region:** Back only
- **Target conditions:** `back_postural`, `back_muscle` with deconditioning profile (sedentary, poor exercise tolerance)
- **Description:** Graded exercise therapy, core stabilization, cardiovascular conditioning

### cp_shoulder_capsular — Shoulder Capsular Program
- **Duration:** 12-24 weeks
- **Providers:** Specialist shoulder physiotherapist
- **Region:** Shoulder only
- **Target conditions:** `shoulder_frozen` (all stages)
- **Description:** Stage-appropriate capsular stretching, manual therapy, progressive ROM exercises. Extended duration due to natural history (freezing → frozen → thawing)

### cp_knee_ligament_rehab — Knee Ligament Rehabilitation
- **Duration:** 12-16 weeks
- **Providers:** Sports physiotherapist
- **Region:** Knee only
- **Target conditions:** `knee_acl` (non-surgical), `knee_mcl`, `knee_pcl`, `knee_lcl`
- **Description:** Progressive ligament rehabilitation protocol, neuromuscular training, sport-specific preparation, return-to-sport criteria

### cp_ankle_stability — Ankle Stability Program
- **Duration:** 8 weeks
- **Providers:** Sports physiotherapist
- **Region:** Ankle only
- **Target conditions:** `ankle_instability`, `ankle_lateral_sprain` (recurrent)
- **Description:** Proprioceptive training, peroneal strengthening, balance progression, sport-specific agility

### cp_hand_therapy — Hand Therapy Program
- **Duration:** 6 weeks
- **Providers:** Hand therapist (specialist OT/PT)
- **Region:** Wrist only
- **Target conditions:** `wrist_carpal_tunnel` (conservative), `wrist_trigger`, `wrist_dequervain`, `wrist_ganglion`
- **Description:** Splinting, nerve glides, tendon glides, activity modification, ergonomic assessment

## Scoring Algorithm

```
For each candidate pathway:

  pathwayScore =
    conditionMatch           × 10     // Does targetConditions include the hypothesis conditionId?
  + riskAlignmentBonus                // Exact match: +8 | ±1 tier: +4 | ±2 tiers: +0
  + assessmentCoverageBonus           // Number of game scores available for pathway params × 5
  + contraindicationPenalty           // If pathway contraindicated for condition: -20
  + regionSpecificBonus               // If region-specific pathway matches region: +6

bestPathway = pathway with max(pathwayScore)
alternativePathway = second highest (only if score > 50% of best)

If no pathway scores > 0 → fallback: cp_specialist ("Professional Consultation")
```

## Condition-to-Pathway Quick Reference

| Condition Pattern | Primary Pathway | Alternative |
|-------------------|----------------|-------------|
| Any `*_postural` or `*_muscle` with GREEN/BLUE risk | cp_self_manage | cp_guided_rehab |
| Any `*_tendinopathy` or `*_oa` (mild) with YELLOW risk | cp_guided_rehab | cp_self_manage |
| Any `*_disc`, `*_ddd`, `*_si_joint` with YELLOW risk | cp_guided_rehab | cp_intensive |
| Any `*_radiculopathy` with ORANGE risk | cp_intensive | cp_specialist |
| Any `*_myelopathy` (stable) | cp_intensive | cp_specialist |
| Any `*_as`, `*_ra` | cp_intensive | cp_specialist |
| `shoulder_frozen` (any risk) | cp_shoulder_capsular | cp_guided_rehab |
| `knee_acl/mcl/pcl/lcl` (non-surgical) | cp_knee_ligament_rehab | cp_specialist |
| `ankle_instability` | cp_ankle_stability | cp_guided_rehab |
| `wrist_carpal_tunnel` (conservative) | cp_hand_therapy | cp_specialist |
| Any RED flag condition | cp_emergency | — |
| Progressive neuro deficit | cp_specialist | — |
| No pathway matches (score=0) | cp_specialist (fallback) | — |
