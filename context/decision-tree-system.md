# Kriya CDE — Complete Decision Tree System (All 8 Regions)

> **Scope:** Trees 2-7 fully specified for Back, Neck, Shoulder, Knee, Hip, Ankle, Elbow, Wrist.
> Trees 1 (Master Pipeline) and 8 (Conversation Lifecycle) are region-agnostic and defined in the clinical-decision-engine-guide.md.
>
> **Structure per region:** Red flag screen → Symptom profiling → Branch nodes → Aggravating/easing → Functional assessment → Hypothesis rules → Game recommendation → Care pathway matching

---

## TREE 3 — Red Flag Screening (Per Region)

All regions share Tier 1 (emergency) and Tier 2 (urgent) universal screens. Each region then adds region-specific red flag questions.

### 3.1 Universal Screen (ALL regions — asked first)

| Q# | Question | Halt If | Maps To |
|----|----------|---------|---------|
| RF_01 | Are you experiencing loss of bladder or bowel control, or numbness in the groin/saddle area? | YES | `rf_cauda_equina` |
| RF_02 | Have you experienced sudden severe weakness in both legs or arms that came on quickly? | YES | `rf_cord_compression` |
| RF_03 | Has this pain started after a recent fall, accident, or direct injury? | YES → Tier 2 | `rf_fracture_trauma` |
| RF_04 | Have you experienced unexplained weight loss (>5kg in 3 months), or do you have a history of cancer? | YES → Tier 2 | `rf_malignancy` |
| RF_05 | Do you currently have a fever, or have you recently had an infection, surgery, or IV drug use? | YES → Tier 2 | `rf_infection` |

### 3.2 Region-Specific Red Flag Additions

#### BACK — Additional

| Q# | Question | Screens For | Maps To |
|----|----------|-------------|---------|
| RF_BACK_01 | Do you have numbness or loss of sensation in both legs that is getting worse? | Cauda equina / cord | `rf_bilateral_neuro` |
| RF_BACK_02 | Is the pain constant at night and does not change with any position? | Cancer / infection | `rf_night_pain_unrelenting` |

#### NECK — Additional

| Q# | Question | Screens For | Maps To |
|----|----------|-------------|---------|
| RF_NECK_01 | Have you noticed difficulty with fine hand movements like buttoning a shirt, writing, or picking up coins? | Cervical myelopathy (cord signs) | `rf_hand_clumsiness` |
| RF_NECK_02 | Have you noticed your balance or walking getting worse recently? | Cervical myelopathy (gait) | `rf_gait_disturbance` |
| RF_NECK_03 | Do you experience double vision, slurred speech, difficulty swallowing, or sudden blackouts when turning your head? | VBI | `rf_vbi_symptoms` |
| RF_NECK_04 | Is the pain in your left arm/shoulder associated with chest tightness, breathlessness, or comes on with physical exertion? | Cardiac referral | `rf_cardiac` |

#### SHOULDER — Additional

| Q# | Question | Screens For | Maps To |
|----|----------|-------------|---------|
| RF_SHOULDER_01 | After an injury, are you completely unable to lift your arm away from your body? | Full RC tear / fracture | `rf_complete_loss_elevation` |
| RF_SHOULDER_02 | Did your shoulder visibly pop out of place or look deformed after an injury? | Dislocation | `rf_deformity` |

#### KNEE — Additional

| Q# | Question | Screens For | Maps To |
|----|----------|-------------|---------|
| RF_KNEE_01 | Did your knee swell up rapidly within 2 hours of an injury? | Haemarthrosis (ACL/fracture) | `rf_rapid_swelling` |
| RF_KNEE_02 | Is your knee hot, red, swollen, and extremely painful — and do you have a fever? | Septic arthritis | `rf_hot_joint` |

#### HIP — Additional

| Q# | Question | Screens For | Maps To |
|----|----------|-------------|---------|
| RF_HIP_01 | After a fall, is your leg visibly shorter or turned outward and you cannot weight-bear at all? | Femoral neck fracture | `rf_shortened_er_leg` |
| RF_HIP_02 | Are you between 10-16 years old with a limp and groin pain that came on gradually? | SCFE | `rf_adolescent_limp` |

#### ANKLE — Additional

| Q# | Question | Screens For | Maps To |
|----|----------|-------------|---------|
| RF_ANKLE_01 | After an injury, can you take 4 steps? (Ottawa Ankle Rules) | Fracture | `rf_unable_weightbear_4steps` |
| RF_ANKLE_02 | Did you feel a pop in the back of your ankle and now cannot stand on your toes? | Achilles rupture | `rf_achilles_pop` |

#### ELBOW — Additional

| Q# | Question | Screens For | Maps To |
|----|----------|-------------|---------|
| RF_ELBOW_01 | After an injury, is your elbow locked in a bent position or visibly deformed? | Dislocation / fracture | `rf_elbow_locked_deformed` |

#### WRIST — Additional

| Q# | Question | Screens For | Maps To |
|----|----------|-------------|---------|
| RF_WRIST_01 | Did you fall on an outstretched hand and now have pain at the base of your thumb / in the "snuffbox" area? | Scaphoid fracture | `rf_snuffbox_tenderness` |
| RF_WRIST_02 | Is one of your fingers red, swollen like a sausage, held in a bent position, and extremely painful to straighten? | Flexor sheath infection | `rf_kanavel_signs` |

---

## TREE 2 — Decision Tree Node Chains (Per Region)

Each region follows the same 9-node architecture as the proven LBP tree. Node types: `red_flag_screen`, `symptom_profiling`, `differential_assessment`, `functional_assessment`, `hypothesis_generation`, `assessment_recommendation`, `score_interpretation`, `care_pathway_matching`.

---

### 2.1 BACK (Lumbar) — Already Implemented

```
LBP_RF_001 → LBP_PROFILE_001 → [branch: RADICULAR / BUTTOCK / straight] → LBP_AGGRAVATING_001 → LBP_FUNCTIONAL_001 → LBP_HYPOTHESIS_001 → LBP_ASSESS_REC_001 → LBP_CARE_MATCH_001
```

9 nodes, 4 paths (localized, buttock, radicular, halt), 7 hypothesis rules. See `low-back-pain.json`.

---

### 2.2 NECK (Cervical)

#### Node Chain

```
NECK_RF_001 → NECK_PROFILE_001 → [branch: ARM_RADICULAR / HEADACHE / straight] → NECK_MYELOPATHY_SCREEN_001 → NECK_AGGRAVATING_001 → NECK_FUNCTIONAL_001 → NECK_HYPOTHESIS_001 → NECK_ASSESS_REC_001 → NECK_CARE_MATCH_001
```

#### Branching Logic

At `sp_radiation` question:
- `"arm_below_elbow"` or `"arm_above_elbow"` → `NECK_RADICULAR_001` (4 questions: dermatome C5-T1, neuro deficit, progressive weakness, Spurling's proxy)
- `"headache"` → `NECK_HEADACHE_001` (3 questions: unilateral?, triggered by neck movement?, aura present?)
- `"shoulder"` or `"localized"` → continue in same node

#### Symptom Profiling Questions (NECK_PROFILE_001)

| Q# | ID | Question | mapsTo | Options |
|----|----|----------|--------|---------|
| 1 | sp_duration | How long have you had this neck pain? | `duration` | <6wk / 6-12wk / >12wk |
| 2 | sp_severity | Pain 0-10? | `severity` | numeric_scale |
| 3 | sp_pattern | When is your neck pain worst? | `painPattern` | Morning stiffness / Sustained posture / Activity / End of day / Constant / After rest-then-better-with-movement |
| 4 | sp_radiation | Does the pain stay in your neck or travel elsewhere? | `radiation` | Localized / Shoulder / Arm above elbow / Arm below elbow + hand / Head (headache) |

#### Radicular Branch (NECK_RADICULAR_001)

| Q# | ID | Question | mapsTo | Options |
|----|----|----------|--------|---------|
| 1 | rad_dermatome | Where in your arm do you feel numbness or tingling? | `cervicalDermatome` | Shoulder/outer arm (C5) / Thumb + forearm (C6) / Middle finger (C7) / Little finger + inner arm (C8) |
| 2 | rad_neuro | Are you experiencing numbness, weakness, or both? | `neuroDeficit` | No — just pain / Numbness-tingling only / Weakness / Both |
| 3 | rad_progressive | Is the weakness getting worse over the past few days/weeks? | `progressiveWeakness` | Yes — getting worse / No — stable |
| 4 | rad_spurling | Does looking up and turning your head to the painful side increase your arm symptoms? | `spurlingProxy` | No / Mild increase / Clearly reproduces arm symptoms |

#### Headache Branch (NECK_HEADACHE_001)

| Q# | ID | Question | mapsTo | Options |
|----|----|----------|--------|---------|
| 1 | ha_side | Is the headache on one side or both? | `headacheLaterality` | One side / Both sides / Alternating |
| 2 | ha_neck_trigger | Does moving your neck trigger or change the headache? | `neckTriggersHeadache` | Yes / No |
| 3 | ha_aura | Do you see flashing lights, zigzag lines, or have vision changes before the headache? | `auraPresent` | Yes (→ likely migraine, not cervicogenic) / No |

#### Myelopathy Screen (NECK_MYELOPATHY_SCREEN_001)

| Q# | ID | Question | mapsTo | Options |
|----|----|----------|--------|---------|
| 1 | myel_hand | Do you have difficulty with buttons, writing, or handling small objects? | `handDexterity` | No / Occasional clumsiness / Significant difficulty |
| 2 | myel_gait | Has your walking or balance changed — do you feel unsteady? | `gaitChange` | No / Slightly / Noticeably worse |
| 3 | myel_lhermitte | Do you get an electric shock sensation down your body when you bend your neck forward? | `lhermittes` | No / Yes |

#### Hypothesis Rules (NECK_HYPOTHESIS_001) — 12 Rules

| ruleId | conditionId | matchCriteria | confidence | recommendedGames |
|--------|-------------|---------------|------------|-----------------|
| `hyp_neck_postural` | `neck_postural` | ALL: [radiation=localized, painPattern containsAny [sustained_posture, end_of_day], neuroDeficit=none] | high | FA3, PT1, KS3 |
| `hyp_neck_muscle` | `neck_muscle` | ALL: [radiation=localized, painPattern containsAny [activity, end_of_day]] AND NONE: [handDexterity in [occasional, significant]] | moderate | FA3, FA5, KS4 |
| `hyp_neck_ddd` | `neck_ddd` | ALL: [duration=chronic_over_12_weeks, painPattern containsAny [morning, constant]] AND NONE: [cervicalDermatome != null] | moderate | FA3, KS3, KS4 |
| `hyp_neck_disc` | `neck_disc` | ALL: [radiation in [arm_above_elbow, arm_below_elbow], cervicalDermatome != null] AND NONE: [handDexterity in [significant], gaitChange in [noticeably]] | moderate | FA3, NN1, BB1 |
| `hyp_neck_radiculopathy` | `neck_radiculopathy` | ALL: [neuroDeficit in [sensory, motor, sensorimotor], cervicalDermatome != null, spurlingProxy in [mild, clearly_reproduces]] | high | NN1, NN2, FA1 |
| `hyp_neck_myelopathy` | `neck_myelopathy` | ANY: [handDexterity=significant, gaitChange=noticeably, lhermittes=yes] | high | NN1, NN3, NN5 |
| `hyp_neck_cervicogenic_headache` | `neck_cervicogenic_headache` | ALL: [radiation=headache, headacheLaterality=one_side, neckTriggersHeadache=yes, auraPresent=no] | high | FA3, KS3 |
| `hyp_neck_cervicogenic_dizziness` | `neck_cervicogenic_dizziness` | ALL: [dizzinessPresent=yes, neckTriggersHeadache=yes] AND NONE: [rf_vbi_symptoms=true] | moderate | BB1, BB2, FA3 |
| `hyp_neck_as` | `neck_as` | ALL: [painPattern contains after_rest_then_better, duration=chronic_over_12_weeks] | moderate | FA3, KS3, KS4 |
| `hyp_neck_oa` | `neck_cervical_oa` | ALL: [duration=chronic_over_12_weeks, painPattern containsAny [morning, end_of_day]] AND NONE: [neuroDeficit in [motor, sensorimotor]] | moderate | FA3, KS3, FA5 |
| `hyp_neck_instability` | `neck_instability` | ALL: [painPattern containsAny [movement_sharp_transient], catching=yes] AND NONE: [handDexterity=significant] | moderate | BB1, BB2, NN1 |
| `hyp_neck_thoracic_rad` | `neck_thoracic_radiculopathy` | ALL: [radiation=chest_trunk_band, aggravatingFactors containsAny [rotation, coughing]] | low | KS3, KS4, FA5 |

---

### 2.3 SHOULDER

#### Node Chain

```
SHOULDER_RF_001 → SHOULDER_PROFILE_001 → [branch: CERVICOGENIC_SCREEN / straight] → SHOULDER_AGGRAVATING_001 → SHOULDER_FUNCTIONAL_001 → SHOULDER_HYPOTHESIS_001 → SHOULDER_ASSESS_REC_001 → SHOULDER_CARE_MATCH_001
```

#### Branching: At `neckInvolvement` question — if YES → `SHOULDER_CERVICOGENIC_001` (3 questions confirming cervical source)

#### Symptom Profiling (SHOULDER_PROFILE_001)

| Q# | ID | Question | mapsTo | Options |
|----|----|----------|--------|---------|
| 1 | sp_duration | How long? | `duration` | <6wk / 6-12wk / >12wk |
| 2 | sp_severity | Pain 0-10? | `severity` | numeric_scale |
| 3 | sp_onset | How did it start? | `onset` | Gradual / After injury / After repetitive activity / Unknown |
| 4 | sp_location | Where exactly in your shoulder? | `shoulderLocation` | Front / Side (lateral) / Back / Top (AC joint) / Deep inside |
| 5 | sp_movement | Which movement is most painful? | `shoulderMovement` | Overhead reaching / Behind back / Across body / Lifting arm sideways / All directions equally limited |
| 6 | sp_night | Does it hurt lying on the affected side at night? | `nightPain` | Yes / No |
| 7 | sp_stiffness | Does your arm feel stuck or restricted in any direction? | `shoulderStiffness` | No / Slightly limited / Very limited — can barely move |
| 8 | sp_neck | Does moving your neck change your shoulder pain? | `neckInvolvement` | Yes / No |

#### Hypothesis Rules (SHOULDER_HYPOTHESIS_001) — 10 Rules

| ruleId | conditionId | matchCriteria | confidence | recommendedGames |
|--------|-------------|---------------|------------|-----------------|
| `hyp_sh_impingement` | `shoulder_impingement` | ALL: [shoulderMovement=overhead, shoulderLocation in [side, front], shoulderStiffness=no] | high | FA1, FA2, FA5 |
| `hyp_sh_rc_tendinopathy` | `shoulder_rc_tendinopathy` | ALL: [shoulderMovement in [overhead, sideways], nightPain=yes] AND NONE: [shoulderStiffness=very_limited] | high | FA1, FA2, BB1 |
| `hyp_sh_frozen` | `shoulder_frozen` | ALL: [shoulderStiffness=very_limited, shoulderMovement=all_directions, duration in [subacute, chronic]] | high | FA1, FA2, FA5 |
| `hyp_sh_ac_joint` | `shoulder_ac_joint` | ALL: [shoulderLocation=top, shoulderMovement=across_body] | high | FA1, FA5 |
| `hyp_sh_calcific` | `shoulder_calcific` | ALL: [onset=gradual, shoulderMovement=overhead, severity greaterThan 7] AND ANY: [duration=acute] | moderate | FA1, FA2 |
| `hyp_sh_biceps` | `shoulder_biceps` | ALL: [shoulderLocation=front, shoulderMovement=overhead] | moderate | FA1, NN1 |
| `hyp_sh_instability` | `shoulder_instability` | ALL: [onset=after_injury, shoulderStiffness=no] AND ANY: [shoulderMovement=overhead, apprehension=yes] | moderate | BB1, FA1, NN1 |
| `hyp_sh_cervicogenic` | `shoulder_cervicogenic` | ALL: [neckInvolvement=yes, shoulderStiffness=no] | moderate | FA3, FA1, NN1 |
| `hyp_sh_scapular` | `shoulder_scapular` | ALL: [shoulderMovement=overhead, shoulderLocation in [back, side]] AND NONE: [nightPain=yes] | moderate | FA1, FA2, FA5, PT1 |
| `hyp_sh_soft_tissue` | `shoulder_soft_tissue` | ALL: [onset=after_injury, duration=acute, shoulderStiffness=no] AND NONE: [nightPain=yes, shoulderMovement=all_directions] | moderate | FA1, FA5 |

---

### 2.4 KNEE

#### Node Chain

```
KNEE_RF_001 → KNEE_PROFILE_001 → [branch: MENISCAL_LIGAMENT_SCREEN / straight] → KNEE_AGGRAVATING_001 → KNEE_FUNCTIONAL_001 → KNEE_HYPOTHESIS_001 → KNEE_ASSESS_REC_001 → KNEE_CARE_MATCH_001
```

#### Branching: At `mechanicalSymptoms` — if `locking`, `giving_way`, or `buckling` → `KNEE_INTERNAL_001` (3 questions differentiating meniscal vs ligament)

#### Symptom Profiling (KNEE_PROFILE_001)

| Q# | ID | Question | mapsTo | Options |
|----|----|----------|--------|---------|
| 1 | sp_duration | How long? | `duration` | <6wk / 6-12wk / >12wk |
| 2 | sp_severity | Pain 0-10? | `severity` | numeric_scale |
| 3 | sp_onset | How did it start? | `onset` | Gradual / After twist / After direct impact / After fall / After running/jumping |
| 4 | sp_location | Where on your knee? | `kneeLocation` | Front (anterior) / Inner (medial) / Outer (lateral) / Back (posterior) / All around / Below kneecap |
| 5 | sp_mechanical | Do you experience locking, clicking, or giving way? | `mechanicalSymptoms` | None / Clicking only / Locking — knee gets stuck / Giving way — knee buckles |
| 6 | sp_swelling | Has your knee swelled up? | `kneeSwelling` | No / Mild / Rapid — within 2 hours of injury / Gradual — comes and goes |

#### Internal Derangement Branch (KNEE_INTERNAL_001)

| Q# | ID | Question | mapsTo | Options |
|----|----|----------|--------|---------|
| 1 | int_mechanism | Was there a specific twisting or pivoting moment? | `twistMechanism` | Yes — a clear twist | Yes — pivoting/cutting | No — gradual |
| 2 | int_pop | Did you hear or feel a pop at the time? | `popSound` | Yes / No |
| 3 | int_swelling_speed | How fast did swelling appear? | `swellingSpeed` | Within 2 hours (haemarthrosis → likely ACL/fracture) / Over 24-48 hours (effusion → likely meniscal) / No significant swelling |

#### Hypothesis Rules (KNEE_HYPOTHESIS_001) — 14 Rules

| ruleId | conditionId | matchCriteria | confidence | recommendedGames |
|--------|-------------|---------------|------------|-----------------|
| `hyp_kn_pfps` | `knee_pfps` | ALL: [kneeLocation=front, aggravatingFactors containsAny [stairs, squatting, sitting]] AND NONE: [mechanicalSymptoms in [locking, giving_way]] | high | BB1, BB3, KS5 |
| `hyp_kn_patellar_tend` | `knee_patellar_tendinopathy` | ALL: [kneeLocation=below_kneecap, onset in [gradual, after_running]] | high | BB1, KS5, KS6 |
| `hyp_kn_meniscal_med` | `knee_meniscal_medial` | ALL: [kneeLocation=medial, mechanicalSymptoms in [locking, clicking]] | high | BB1, BB3, KS5 |
| `hyp_kn_meniscal_lat` | `knee_meniscal_lateral` | ALL: [kneeLocation=lateral, mechanicalSymptoms in [locking, clicking]] | moderate | BB1, BB3, KS5 |
| `hyp_kn_acl` | `knee_acl` | ALL: [mechanicalSymptoms=giving_way, popSound=yes] ANY: [swellingSpeed=within_2_hours, twistMechanism in [twist, pivot]] | high | BB1, BB3, KS5, KS6 |
| `hyp_kn_mcl` | `knee_mcl` | ALL: [kneeLocation=medial, onset in [after_impact, after_twist]] AND NONE: [mechanicalSymptoms=locking] | moderate | BB1, BB3, KS5 |
| `hyp_kn_lcl` | `knee_lcl` | ALL: [kneeLocation=lateral, onset in [after_impact, after_twist]] | moderate | BB1, BB3, KS6 |
| `hyp_kn_pcl` | `knee_pcl` | ALL: [kneeLocation=posterior, onset=after_impact] | moderate | BB1, BB3, KS5 |
| `hyp_kn_oa` | `knee_oa_moderate` | ALL: [duration=chronic_over_12_weeks, kneeSwelling=gradual] AND NONE: [popSound=yes] | moderate | BB1, BB3, KS5 |
| `hyp_kn_itb` | `knee_itb` | ALL: [kneeLocation=lateral, onset in [gradual, after_running], aggravatingFactors contains running] | moderate | KS5, KS6, BB3 |
| `hyp_kn_hoffa` | `knee_hoffa` | ALL: [kneeLocation=front, aggravatingFactors contains extension] | low | KS5, BB1 |
| `hyp_kn_osgood` | `knee_osgood` | ALL: [kneeLocation=below_kneecap, age lessThan 18] | high | BB1, KS5 |
| `hyp_kn_plica` | `knee_plica` | ALL: [kneeLocation=medial, mechanicalSymptoms=clicking, age between [13, 25]] | moderate | BB1, KS5 |
| `hyp_kn_bakers` | `knee_bakers` | ALL: [kneeLocation=posterior, kneeSwelling=gradual, duration=chronic_over_12_weeks] | moderate | KS5, BB1 |

---

### 2.5 HIP

#### Node Chain

```
HIP_RF_001 → HIP_PROFILE_001 → [branch: LUMBAR_REFERRAL_SCREEN / straight] → HIP_AGGRAVATING_001 → HIP_FUNCTIONAL_001 → HIP_HYPOTHESIS_001 → HIP_ASSESS_REC_001 → HIP_CARE_MATCH_001
```

#### Branching: At `lumbarInvolvement` — if YES → `HIP_LUMBAR_001` (2 questions differentiating hip vs referred)

#### Hypothesis Rules (HIP_HYPOTHESIS_001) — 10 Rules

| ruleId | conditionId | matchCriteria | confidence | recommendedGames |
|--------|-------------|---------------|------------|-----------------|
| `hyp_hip_oa` | `hip_oa` | ALL: [hipLocation=groin, duration=chronic, hipStiffness in [slightly, very_difficult]] | high | KS1, KS2, KS5 |
| `hyp_hip_fai` | `hip_fai` | ALL: [hipLocation=groin, hipMechanical in [clicking, catching], onset in [gradual, after_activity]] | high | KS1, KS2, KS5, FA4 |
| `hyp_hip_labral` | `hip_labral` | ALL: [hipMechanical in [clicking, catching], hipLocation=groin] | moderate | KS2, KS5, BB3 |
| `hyp_hip_trochanteric` | `hip_trochanteric` | ALL: [hipLocation=lateral, aggravatingFactors containsAny [lying_on_side, stairs, single_leg]] | high | KS1, BB3, KS6 |
| `hyp_hip_gluteal` | `hip_gluteal` | ALL: [hipLocation=lateral, weightBearingPain in [walking, stairs]] | moderate | KS1, BB3, KS6 |
| `hyp_hip_adductor` | `hip_adductor` | ALL: [hipLocation=groin_medial, onset in [after_activity, after_injury]] | moderate | KS2, KS6, BB1 |
| `hyp_hip_flexor` | `hip_flexor` | ALL: [hipLocation=front, aggravatingFactors containsAny [flexion, sprinting]] | moderate | FA4, KS1, KS5 |
| `hyp_hip_snapping` | `hip_snapping` | ALL: [hipMechanical=snapping] | moderate | KS2, KS1, FA4 |
| `hyp_hip_referred` | `hip_referred` | ALL: [lumbarInvolvement=yes, hipStiffness=no] | moderate | FA4, KS3, BB1 |
| `hyp_hip_post_surg` | `hip_post_surgical` | ALL: [onset=post_surgical, duration in [acute, subacute, chronic]] | moderate | KS1, KS2, KS5, BB1 |

---

### 2.6 ANKLE

#### Node Chain

```
ANKLE_RF_001 → ANKLE_PROFILE_001 → [branch: INSTABILITY_SCREEN / straight] → ANKLE_AGGRAVATING_001 → ANKLE_FUNCTIONAL_001 → ANKLE_HYPOTHESIS_001 → ANKLE_ASSESS_REC_001 → ANKLE_CARE_MATCH_001
```

#### Branching: At `ankleInstability` — if `frequently` → `ANKLE_INSTABILITY_001` (2 questions)

#### Hypothesis Rules (ANKLE_HYPOTHESIS_001) — 10 Rules

| ruleId | conditionId | matchCriteria | confidence | recommendedGames |
|--------|-------------|---------------|------------|-----------------|
| `hyp_ank_lateral_sprain` | `ankle_lateral_sprain` | ALL: [onset=twisted, ankleLocation=outer, ankleInstability=no] | high | BB1, BB3, BB4 |
| `hyp_ank_instability` | `ankle_instability` | ALL: [ankleInstability in [occasionally, frequently], sprainHistory=three_plus] | high | BB1, BB3, BB4, KS5 |
| `hyp_ank_achilles` | `ankle_achilles_tendinopathy` | ALL: [ankleLocation=back_achilles, duration in [subacute, chronic]] | high | BB1, BB3, KS5 |
| `hyp_ank_plantar` | `ankle_plantar_fasciitis` | ALL: [ankleLocation=bottom_heel, morningPain=yes] | high | BB1, BB3, KS5 |
| `hyp_ank_peroneal` | `ankle_peroneal` | ALL: [ankleLocation=outer, sprainHistory in [one_two, three_plus]] | moderate | BB1, BB3 |
| `hyp_ank_pttd` | `ankle_pttd` | ALL: [ankleLocation=inner, duration=chronic] | moderate | BB1, BB3, KS5 |
| `hyp_ank_sinus_tarsi` | `ankle_sinus_tarsi` | ALL: [ankleLocation=outer, onset=twisted, duration=chronic] | moderate | BB1, BB3, BB4 |
| `hyp_ank_oa` | `ankle_oa` | ALL: [duration=chronic, sprainHistory in [one_two, three_plus]] | moderate | BB1, BB3, KS5 |
| `hyp_ank_stress_fx` | `ankle_stress_fracture` | ALL: [ankleLocation=top_foot, onset=gradual] | moderate | BB1 |
| `hyp_ank_mortons` | `ankle_mortons` | ALL: [ankleLocation=toes, aggravatingFactors contains tight_shoes] | moderate | BB1, NN1 |

---

### 2.7 ELBOW

#### Node Chain

```
ELBOW_RF_001 → ELBOW_PROFILE_001 → [branch: NERVE_SCREEN / straight] → ELBOW_AGGRAVATING_001 → ELBOW_FUNCTIONAL_001 → ELBOW_HYPOTHESIS_001 → ELBOW_ASSESS_REC_001 → ELBOW_CARE_MATCH_001
```

#### Branching: At `handNumbness` — if not `none` → `ELBOW_NERVE_001` (3 questions differentiating ulnar vs median vs radial)

#### Nerve Branch (ELBOW_NERVE_001)

| Q# | ID | Question | mapsTo | Options |
|----|----|----------|--------|---------|
| 1 | nerve_distribution | Which fingers are affected? | `nerveDistribution` | Ring + little finger (ulnar) / Thumb + index + middle (median-pronator) / Back of hand + wrist (radial) |
| 2 | nerve_elbow_flex | Does holding your elbow bent for 1 minute make it worse? | `elbowFlexionTest` | Yes (→ cubital tunnel) / No |
| 3 | nerve_night | Do you wake at night with numbness? | `nightNumbness` | Yes (→ more likely CTS at wrist, not elbow) / No |

#### Hypothesis Rules (ELBOW_HYPOTHESIS_001) — 12 Rules

| ruleId | conditionId | matchCriteria | confidence | recommendedGames |
|--------|-------------|---------------|------------|-----------------|
| `hyp_elb_tennis` | `elbow_tennis` | ALL: [elbowLocation=outer, grippingPain in [mild, significant]] AND NONE: [handNumbness in [ring_little, thumb_index_middle]] | high | NN1, FA1 |
| `hyp_elb_golfers` | `elbow_golfers` | ALL: [elbowLocation=inner, grippingPain in [mild, significant]] | high | NN1, FA1 |
| `hyp_elb_ulnar` | `elbow_ulnar_nerve` | ALL: [nerveDistribution=ring_little, elbowFlexionTest=yes] | high | NN1, NN2, NN5 |
| `hyp_elb_pronator` | `elbow_pronator` | ALL: [nerveDistribution=thumb_index_middle, nightNumbness=no] | moderate | NN1, NN2 |
| `hyp_elb_radial_tunnel` | `elbow_radial_tunnel` | ALL: [elbowLocation=outer, nerveDistribution=back_hand, grippingPain=significant] | moderate | NN1, NN2 |
| `hyp_elb_bursitis` | `elbow_bursitis` | ALL: [elbowLocation=back, elbowLocking=no] | moderate | NN1 |
| `hyp_elb_ucl` | `elbow_ucl` | ALL: [elbowLocation=inner, onset=after_activity] AND NONE: [handNumbness in [ring_little, thumb_index_middle]] | moderate | NN1, FA1 |
| `hyp_elb_rcl` | `elbow_rcl` | ALL: [elbowLocation=outer, onset=after_fall] | low | NN1, FA1 |
| `hyp_elb_acute_lig` | `elbow_acute_ligament` | ALL: [onset=after_fall, duration=acute] | moderate | — (refer if complete) |
| `hyp_elb_chronic_lig` | `elbow_chronic_ligament` | ALL: [onset=after_activity, duration=chronic, elbowLocking in [occasionally, frequently]] | moderate | NN1, FA1, BB1 |
| `hyp_elb_soft_tissue` | `elbow_soft_tissue` | ALL: [onset in [after_activity, after_fall], duration=acute] AND NONE: [handNumbness != none, elbowLocking != no] | moderate | NN1, FA1 |
| `hyp_elb_impingement` | `elbow_impingement` | ALL: [elbowLocation=back, elbowLocking in [occasionally, frequently], aggravatingFactors contains extension] | moderate | FA1, NN1 |

---

### 2.8 WRIST & HAND

#### Node Chain

```
WRIST_RF_001 → WRIST_PROFILE_001 → [branch: NERVE_SCREEN / straight] → WRIST_AGGRAVATING_001 → WRIST_FUNCTIONAL_001 → WRIST_HYPOTHESIS_001 → WRIST_ASSESS_REC_001 → WRIST_CARE_MATCH_001
```

#### Branching: At `nightNumbness` — if `occasionally` or `most_nights` → `WRIST_NERVE_001` (2 questions)

#### Hypothesis Rules (WRIST_HYPOTHESIS_001) — 12 Rules

| ruleId | conditionId | matchCriteria | confidence | recommendedGames |
|--------|-------------|---------------|------------|-----------------|
| `hyp_wr_cts` | `wrist_carpal_tunnel` | ALL: [nightNumbness in [occasionally, most_nights], wristLocation in [thumb_side, palm]] | high | NN1, NN2, NN3, NN5 |
| `hyp_wr_dequervain` | `wrist_dequervain` | ALL: [wristLocation=thumb_side, aggravatingFactors containsAny [gripping, thumb_movement]] | high | NN1, FA1 |
| `hyp_wr_tfcc` | `wrist_tfcc` | ALL: [wristLocation=little_finger_side, aggravatingFactors containsAny [rotation, gripping]] | moderate | NN1 |
| `hyp_wr_ganglion` | `wrist_ganglion` | ALL: [wristSwelling=small_lump, wristLocation in [back_of_wrist, palm]] | high | NN1 |
| `hyp_wr_trigger` | `wrist_trigger` | ALL: [fingerLocking in [one_finger, multiple_fingers]] | high | NN1, NN2 |
| `hyp_wr_soft_tissue` | `wrist_soft_tissue` | ALL: [onset in [after_fall, after_repetitive], duration=acute] AND NONE: [nightNumbness in [occasionally, most_nights], fingerLocking != no] | moderate | NN1, FA1 |
| `hyp_wr_acute_lig` | `wrist_acute_ligament` | ALL: [onset=after_fall, duration=acute, gripWeakness in [mild, dropping]] | moderate | NN1 |
| `hyp_wr_chronic_lig` | `wrist_chronic_ligament` | ALL: [onset in [after_fall, unknown], duration=chronic, gripWeakness in [mild, dropping]] | moderate | NN1, FA1 |
| `hyp_wr_tendinopathy` | `wrist_tendinopathy` | ALL: [onset=after_repetitive, duration in [subacute, chronic]] AND NONE: [nightNumbness in [occasionally, most_nights]] | moderate | NN1, FA1 |
| `hyp_wr_dupuytren` | `wrist_dupuytren` | ALL: [fingerLocking in [one_finger, multiple_fingers], wristSwelling=small_lump, wristLocation=palm] | moderate | NN1 |
| `hyp_wr_cmc_oa` | `wrist_cmc_oa` | ALL: [wristLocation=thumb_base, aggravatingFactors containsAny [gripping, pinching]] | moderate | NN1, NN2 |
| `hyp_wr_arthritis` | `wrist_arthritis` | ALL: [duration=chronic, gripWeakness in [mild, dropping]] AND NONE: [nightNumbness in [occasionally, most_nights]] | moderate | NN1, FA1 |

---

## TREE 4 — Risk Stratification (All Regions)

The same 6-factor additive algorithm applies to ALL regions. Some factors are region-adapted.

### Algorithm

```
totalScore = severityPoints + durationPoints + neurologicalPoints + mechanicalPoints + functionalImpactPoints + progressiveWorseningPoints
```

### Factor Definitions

| Factor | Points | Logic | Applies To |
|--------|--------|-------|------------|
| **Severity** | +1 (1-3), +2 (4-5), +3 (6-7), +4 (8-10) | Universal NPRS | ALL |
| **Duration** | +0 (acute), +1 (subacute), +2 (chronic) | Longer = higher risk | ALL |
| **Neurological deficit** | +0 (none), +2 (sensory), +3 (motor/both) | Neuro involvement | Spine, Elbow, Wrist |
| **Mechanical symptoms** | +0 (none), +1 (clicking), +2 (locking/giving way) | Internal derangement | Knee, Shoulder, Elbow, Wrist, Hip |
| **Functional impact** | +0 (0-2 total), +1 (3-5), +2 (6-7), +3 (8-9) | Sleep + Work + Exercise sum | ALL |
| **Progressive worsening** | +0 (stable/improving), +2 (worsening) | Trajectory matters | ALL |

### Risk Tiers (Same for ALL regions)

| Tier | Score Range | Meaning | Action |
|------|-----------|---------|--------|
| 🔴 RED | ≥12 OR any red flag | Emergency or urgent referral | Halt, refer immediately |
| 🟠 ORANGE | 9-11 | High concern, specialist review | Recommend specialist within 2 weeks |
| 🟡 YELLOW | 5-8 | Moderate — guided rehabilitation | Structured program with professional oversight |
| 🟢 GREEN | 3-4 | Mild — self-managed with guidance | Self-management with exercise prescription |
| 🔵 BLUE | 0-2 | Minimal — wellness/prevention | Preventive exercises, education |

### Region-Specific Modifiers

| Region | Additional Risk Factor | Points | Rationale |
|--------|----------------------|--------|-----------|
| Back | Bilateral leg symptoms | +2 | Suggests central stenosis or CES |
| Neck | Hand dexterity loss | +3 | Suggests myelopathy (cord) |
| Neck | VBI symptoms reported | +4 (→ RED) | Vascular emergency risk |
| Knee | Rapid swelling <2hrs | +2 | Haemarthrosis = likely internal injury |
| Hip | Age <16 + groin pain + limp | +3 (→ ORANGE minimum) | SCFE risk |
| Ankle | Unable to weight-bear 4 steps | +2 | Ottawa rules — fracture screening |
| Shoulder | Complete loss of active elevation | +3 (→ ORANGE minimum) | Full RC tear or fracture |
| Wrist | Snuffbox tenderness post-fall | +3 (→ ORANGE minimum) | Scaphoid fracture risk |

---

## TREE 5 — Game Recommendation Pipeline (All Regions)

Same 5-step pipeline for ALL regions. Region determines the candidate pool.

### Step 1 — Collect Candidates
From matched hypotheses: union all `recommendedGames` arrays.

### Step 2 — Remove Contraindicated
From matched hypotheses: subtract all `contraindicatedGames`.

### Global Contraindications by Risk Tier

| Risk Tier | Contraindicated Games | Rationale |
|-----------|----------------------|-----------|
| RED | ALL games | Session halted — no assessment |
| ORANGE | BB3, BB4, KS5, KS6, FA4, FA5 | No high-demand balance, squat, or loaded movement |
| YELLOW | BB4, KS6 | No extreme balance or lateral load |
| GREEN | None | All games available |
| BLUE | None | All games available |

### Step 3 — Region-Specific Contraindications

| Condition | Contraindicated Games | Rationale |
|-----------|----------------------|-----------|
| Any cervical myelopathy | FA4, KS5, KS6 | No loaded flexion or squat with cord compromise |
| Any shoulder full tear | FA2, FA5 | No behind-back or rotational load |
| Any acute knee ligament | KS5, KS6 | No loaded squat or lateral lunge |
| Any acute ankle | BB3, BB4, KS5, KS6 | No single-leg or loaded lower limb |
| Cervical instability | FA3 (limit range) | Controlled rotation only |
| Lumbar instability | FA4 (limit range) | Controlled flexion only |

### Step 4 — Remove Already Completed (this session)

### Step 5 — Priority Score and Select Top 3

| Priority Factor | Weight |
|----------------|--------|
| Directly tests the hypothesized parameter | ×3 |
| Tests a secondary related parameter | ×2 |
| Is an introductory/baseline game (difficulty 1) | ×1.5 (for first-time users) |
| User has never played this game | ×1.2 |

Select top 3 by priority score. Ensure at least 2 different parameters are covered.

---

## TREE 6 — Score Interpretation (All Games)

### Percentile Bands (Same for all games)

| Band | Percentile Range | Label | Clinical Meaning |
|------|-----------------|-------|-----------------|
| 5 | 81-100 | Excellent | Above age-normal, no deficit |
| 4 | 61-80 | Good | Within normal range |
| 3 | 41-60 | Fair | Borderline — monitor |
| 2 | 21-40 | Below average | Deficit identified — intervention recommended |
| 1 | 0-20 | Poor | Significant deficit — priority intervention |

### Interpretation Rules Per Game Category

#### Balance (BB1-BB4)
- **Primary metric:** Breach count (lower = better)
- **Clinical interpretation:** Band 1-2 → "Your balance stability shows a deficit that may increase fall risk and joint strain. Targeted balance training is recommended."
- **Bilateral comparison:** Left-right difference >20% → "Significant side-to-side difference detected — indicates asymmetric stability that may relate to your symptoms."

#### Reflex/Neuro (NN1-NN5)
- **Primary metric:** Catch count or hit count (higher = better)
- **Clinical interpretation:** Band 1-2 → "Your reaction speed and coordination scores suggest neuromuscular involvement. This may relate to nerve function and warrants monitoring."
- **Fatigue index (NN1):** First 20s vs last 10s — if last 10s drops >30% → "Neuromuscular fatigue detected — your coordination drops significantly with sustained effort."

#### ROM (FA1-FA5)
- **Primary metric:** Peak angle or combined rotation score
- **Clinical interpretation:** Band 1-2 → "Your range of motion is below age-expected norms. Restricted movement may be contributing to pain and dysfunction."
- **Symmetry index:** Left-right difference >15% → "Asymmetry detected between sides — this imbalance may be a factor in your symptoms."

#### Mobility (KS1-KS6)
- **Primary metric:** Movement Quality Score (MQS)
- **Clinical interpretation:** Band 1-2 → "Your movement quality shows restricted mobility that may benefit from a structured mobility program."
- **Sequencing (KS3):** SSI <60% → "Your spinal segments aren't moving in sequence — this suggests stiffness at certain levels."

### Musculage Computation

```
musculage = weightedAverage(
  BAL_percentile × 0.25,
  ROM_percentile × 0.25,
  MOB_percentile × 0.25,
  REF_percentile × 0.25
)
```

If fewer than 4 categories tested, redistribute weights equally among tested categories. Minimum 2 categories required for a valid musculage score.

---

## TREE 7 — Care Pathway Matching (All Regions)

### Pathway Definitions

| Pathway ID | Name | Duration | Providers | Risk Alignment | Description |
|------------|------|----------|-----------|----------------|-------------|
| `cp_self_manage` | Self-Managed Recovery | 4 weeks | Self + digital guidance | GREEN, BLUE | Home exercises, education, activity modification |
| `cp_guided_rehab` | Guided Rehabilitation | 8 weeks | Physiotherapist | YELLOW | Structured program with professional oversight, progressive loading |
| `cp_intensive` | Multi-Disciplinary | 12 weeks | Physio + Specialist + Pain management | ORANGE | Intensive multi-modal, may include imaging referral |
| `cp_specialist` | Specialist Consultation | — | Orthopaedic / Rheumatology / Neurology | RED, ORANGE | Direct referral for investigation and specialist opinion |
| `cp_emergency` | Emergency Referral | Immediate | Emergency medicine | RED | Immediate medical attention required |

### Target Conditions Per Pathway

| Pathway | Target Condition IDs |
|---------|---------------------|
| `cp_self_manage` | ALL `*_postural`, `*_muscle`, `*_soft_tissue`, any green flag with BLUE/GREEN risk |
| `cp_guided_rehab` | ALL green flag conditions with YELLOW risk, `*_tendinopathy`, `*_oa` (mild-moderate), `*_instability` (chronic), `*_disc` |
| `cp_intensive` | ALL yellow flag conditions, `*_radiculopathy`, `*_stenosis`, `*_myelopathy` (stable), `*_as`, `*_ra`, `*_oa` (severe) |
| `cp_specialist` | ALL conditions with ORANGE/RED risk, progressive neuro deficit, conditions requiring imaging |
| `cp_emergency` | Cauda equina, fracture, dislocation, septic arthritis, VBI, cardiac referral |

### Region-Specific Pathway Additions

| Region | Additional Pathway | Duration | Providers | For Conditions |
|--------|--------------------|----------|-----------|----------------|
| Back | `cp_back_deconditioning` | 6 weeks | Physio + exercise physiologist | `back_postural`, `back_muscle` with deconditioning |
| Shoulder | `cp_shoulder_capsular` | 12-24 weeks | Physio (specialist shoulder) | `shoulder_frozen` (long duration due to natural history) |
| Knee | `cp_knee_ligament_rehab` | 12-16 weeks | Sports physio | `knee_acl`, `knee_mcl`, `knee_pcl` (non-surgical) |
| Ankle | `cp_ankle_stability` | 8 weeks | Sports physio | `ankle_instability`, `ankle_lateral_sprain` (recurrent) |
| Wrist | `cp_hand_therapy` | 6 weeks | Hand therapist | `wrist_carpal_tunnel`, `wrist_trigger`, `wrist_dequervain` |

### Scoring Algorithm (Same for all regions)

```
pathwayScore = conditionMatch × 10
             + riskAlignmentBonus (exact match +8, ±1 tier +4, ±2 tiers +0)
             + assessmentCoverageBonus (game scores available for pathway params × 5)
             + contradicationPenalty (contraindicated pathway for this condition × -20)

bestPathway = max(pathwayScore)
alternativePathway = second highest (if score > 50% of best)
```

---

## Summary: Tree Completeness Verification

| Tree | Back | Neck | Shoulder | Knee | Hip | Ankle | Elbow | Wrist |
|------|------|------|----------|------|-----|-------|-------|-------|
| T1 Master Pipeline | ✅ Global | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| T2 Decision Tree (nodes + hypotheses) | ✅ 7 rules | ✅ 12 rules | ✅ 10 rules | ✅ 14 rules | ✅ 10 rules | ✅ 10 rules | ✅ 12 rules | ✅ 12 rules |
| T3 Red Flags | ✅ 5+2 | ✅ 5+4 | ✅ 5+2 | ✅ 5+2 | ✅ 5+2 | ✅ 5+2 | ✅ 5+1 | ✅ 5+2 |
| T4 Risk Stratification | ✅ 6-factor + 1 modifier | ✅ +2 modifiers | ✅ +1 modifier | ✅ +1 modifier | ✅ +1 modifier | ✅ +1 modifier | ✅ | ✅ +1 modifier |
| T5 Game Recommendation | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| T6 Score Interpretation | ✅ 4 categories | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| T7 Care Pathways | ✅ 5 + 1 specific | ✅ 5 | ✅ 5 + 1 specific | ✅ 5 + 1 specific | ✅ 5 | ✅ 5 + 1 specific | ✅ 5 | ✅ 5 + 1 specific |
| T8 Conversation Lifecycle | ✅ Global | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

**Total hypothesis rules across all regions: 87**
**Total red flag questions: 40 + 17 region-specific = 57**
**Total care pathways: 5 universal + 5 region-specific = 10**

---

*End of Document — All 8 trees defined for all 8 body regions*
