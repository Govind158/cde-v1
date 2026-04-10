# Kriya CDE — Complete Condition & Decision Tree Reference v2.0

> **Update:** All clinician-specified diagnoses verified and included. 20 conditions added, 5 renamed/split for explicit naming. Total: **150 conditions across 8 body regions.**
>
> **Clinical basis:** Standard MSK diagnostic frameworks — Cyriax, McKenzie, Maitland, Magee (7th ed), Hoppenfeld. Guidelines: NICE (NG59, CG177, NG100, NG12), APTA CPGs, AAOS/BOA, BSSG/SBNS (cauda equina). Existing Kriya v3.0 approved conditions preserved.
>
> **Game catalog:** 21 games across 5 categories from Kriya Games Reference v1.0.

---

## Part 1 — Game Catalog (21 Games)

### Balance (BB) — 4 Games

| ID | Name | Duration | Primary Metric | Secondary Metric | Clinical Use |
|----|------|----------|---------------|-----------------|-------------|
| BB1 | Pillar Stand | 30s | Breach Count | Max Sway ° | Baseline bilateral proprioception. ALL spine + lower limb conditions |
| BB2 | Twin Leg Stand | 30s | Breach Count | Max Sway ° | Narrowed-base stability. Vestibular + proprioceptive. Spine, hip conditions |
| BB3 | One Leg Stand | 35s | Breach Count | Max Sway ° | Unilateral proprioception. Side-specific deficits. Hip, knee, ankle |
| BB4 | Blindfold on a Leg | 35s | Breach Count | Max Sway ° | Eyes-closed vestibular-only. Neuropathy, vestibular, severe proprioceptive loss |

### Reflex / Neuro-Cognitive (NN) — 5 Games

| ID | Name | Duration | Primary Metric | Secondary Metric | Clinical Use |
|----|------|----------|---------------|-----------------|-------------|
| NN1 | Catch the Ball | 30s | Catches (first 20s) | Catches (last 10s) | Hand-eye coordination, reaction speed. Cervical myelopathy, UL nerve compression |
| NN2 | Choose Right Colour | 30s | Green Catches | Blue Catches | Discrimination reflex + cognitive. Radiculopathy, neuropathy |
| NN3 | Cross Tap Right Colour | 30s | Green Catches | Blue Catches | Decision accuracy under penalty. Myelopathy, coordination |
| NN4 | Flash Tap Test | 30s | Hand Torches | Leg Torches | Full-body 4-quadrant reaction. Neuropathy, myelopathy, general neuro |
| NN5 | Cross Body Strike | 30s | Right Hand | Left Hand | Contralateral motor planning. Cervical myelopathy, cord involvement |

### Range of Motion (FA) — 5 Games

| ID | Name | Duration | Primary Metric | Secondary Metric | Clinical Use |
|----|------|----------|---------------|-----------------|-------------|
| FA1 | Shoulder Sunrise | 30s | Peak Angle (PAA) | Symmetry Index (SI) | Bilateral shoulder flexion. Rotator cuff, frozen shoulder, impingement |
| FA2 | Backstitch | 60s | Peak Angle (PAA) | Symmetry Index (SI) | Posterior shoulder reach. IR + extension. Rotator cuff, thoracic |
| FA3 | Neck Compass | 30s | Peak Angle (PAA) | Symmetry Index (SI) | Cervical rotation. Spondylosis, disc, radiculopathy, postural, VBI screen |
| FA4 | Hip Hinge Arc | 30s | Peak Angle (PAA) | Quality Index (QI) | Lumbar/hip flexion. LBP, disc, hamstring, hip ROM |
| FA5 | Windmill Reach | 40s | Combined Rotation (CRS) | Symmetry Index (SI) | Trunk rotation + shoulder. Thoracic mobility, scoliosis |

### Mobility (KS) — 6 Games

| ID | Name | Duration | Primary Metric | Secondary Metric | Clinical Use |
|----|------|----------|---------------|-----------------|-------------|
| KS1 | Leg Skylift | Rep-based | Green Hits | Completions | Hip abduction. Hip OA, trochanteric bursitis, gluteal tendinopathy |
| KS2 | Hip Gate | 45s | MQS Average | TCI (symmetry) | Hip circumduction. FAI, labral, hip OA |
| KS3 | Spinal Wave | 45s | MQS | SSI (sequencing) | Segmental spinal mobility. Spondylosis, AS, stiffness, DDD |
| KS4 | Lateral Flexion | 45s | MQS Average | TCI (symmetry) | Lateral trunk bend. Scoliosis, facet, stenosis, muscle imbalance |
| KS5 | Deep Squat | 40s | MQS | DCI (depth) | Full lower chain. Knee, hip, ankle mobility, OA |
| KS6 | Cossack Squat | 45s | MQS Average | TCI (symmetry) | Lateral lunge. Hip adductor, knee lateral, ankle |

### Posture (PT) — 1 Game

| ID | Name | Duration | Primary Metric | Secondary Metric | Clinical Use |
|----|------|----------|---------------|-----------------|-------------|
| PT1 | Posture Scan | Static | Alignment deviation | Segment analysis | Postural syndrome, scoliosis, kyphosis, forward head |

---

## Part 2 — Condition Registry by Body Region

### Legend

- 🔴 **RED** = Emergency / immediate referral required
- 🟡 **YELLOW** = Specialist review recommended, may need imaging or investigations
- 🟢 **GREEN** = Manageable with guided rehabilitation and self-management

---

### 2.1 BACK (Lumbar Spine) — 25 Conditions

#### 🔴 Red Flag Conditions (5)

| # | Condition ID | Condition Name | Key Differentiating Features | Neuro | Recommended Games |
|---|-------------|----------------|------------------------------|-------|-------------------|
| 1 | `back_fracture` | Suspected Spine Fracture | Trauma / fall, >60, osteoporosis, long-term steroids, sudden severe pain not improving with rest, deformity | AFFECTED | — (refer) |
| 2 | `back_cancer` | Cancer / Malignancy | Night pain unrelieved by rest, unexplained weight loss >5kg/3mo, history of cancer, fatigue, progressive | AFFECTED | — (refer) |
| 3 | `back_infection` | Spinal Infection (Discitis / Osteomyelitis / TB) | Fever, night sweats, immunosuppression, IV drug use, recent spinal procedure, constant severe pain | AFFECTED | — (refer) |
| 4 | `back_cauda_equina` | Possible Cauda Equina Syndrome | Saddle anaesthesia, urinary retention/incontinence, bilateral leg weakness, progressive neuro deficit. **BSSG/SBNS triad: saddle + bladder + bilateral neuro** | AFFECTED | — (emergency) |
| 5 | `back_vascular` | Vascular (AAA Referral) | >55, male, smoker, pulsatile abdominal mass, claudication, cold feet. **Not an MSK diagnosis — screen and refer** | WNL | — (refer) |

#### 🟡 Yellow Flag Conditions (8)

| # | Condition ID | Condition Name | Key Differentiating Features | Neuro | Recommended Games |
|---|-------------|----------------|------------------------------|-------|-------------------|
| 6 | `back_ankylosing_spondylitis` | Ankylosing Spondylitis | Age 20-40 onset, M>F, morning stiffness >30min improving with exercise (NOT rest), HLA-B27, eye irritation, multi-joint, family history. **Inflammatory pattern: worse at rest, better with movement** | WNL | KS3, KS4, FA4 |
| 7 | `back_rheumatoid_arthritis` | Rheumatoid Arthritis (Spinal) | Bilateral symmetric, morning stiffness >30min, systemic (fatigue, malaise), elevated ESR/CRP/RF, small joint involvement, cervical instability risk in advanced RA | WNL | KS3, KS4, BB1 |
| 8 | `back_osteoporosis` | Osteoporosis / Osteopenia | >50, F>M, loss of height, kyphosis, low vitamin D/calcium, steroid use, fragility fracture history, DEXA T-score ≤-2.5 (osteoporosis) or -1 to -2.5 (osteopenia). **FRAX scoring for fracture risk** | WNL | BB1, BB2 |
| 9 | `back_stenosis` | Lumbar Canal Stenosis | >55, neurogenic claudication (bilateral leg symptoms with walking), relief with flexion/sitting (shopping cart sign), progressive, bilateral. **Key differentiator: flexion preference** | AFFECTED | BB1, FA4, KS3 |
| 10 | `back_lateral_stenosis` | Lateral Canal Stenosis (Foraminal) | Unilateral leg pain with extension + ipsilateral rotation, specific dermatomal pattern, worse standing/walking, differs from central stenosis by being unilateral. **Kemp's test positive** | AFFECTED | BB1, FA4, KS3 |
| 11 | `back_neuropathy` | Peripheral / Diabetic Neuropathy | Glove-stocking distribution numbness, burning feet, diabetes, high HbA1c, B12 deficiency, bilateral symmetric. **Non-dermatomal pattern distinguishes from radiculopathy** | AFFECTED | BB1, BB4, NN1 |
| 12 | `back_facet_syndrome` | Lumbar Facet Joint Syndrome | Extension-aggravated, localized (no leg referral), >55, grinding, end-of-day worsening, unilateral or bilateral paravertebral, relief with flexion. **Key: extension + rotation reproduces pain, no neuro signs** | WNL | KS3, KS4, FA4 |
| 13 | `back_progressive_neuro_le` | Possible Progressive Neurological Deficit — Lower Extremity | Progressive (worsening over days/weeks) motor weakness in one or both legs, foot drop developing, muscle wasting. **Urgency: not emergency like CES but requires urgent specialist review within 2 weeks** | AFFECTED | BB1, BB3, NN4 |

#### 🟢 Green Flag Conditions (12)

| # | Condition ID | Condition Name | Key Differentiating Features | Neuro | Recommended Games |
|---|-------------|----------------|------------------------------|-------|-------------------|
| 14 | `back_postural` | Postural Syndrome | <30, aggravated by sustained postures (sitting/standing), relieved by movement/correction, no structural deficit, no neuro signs. **No pain with active movement — only sustained positions** | WNL | BB1, KS3, FA4, PT1 |
| 15 | `back_muscle` | Muscle Dysfunction / Muscle Imbalance | Spasms, trigger points, stiffness, loss of ROM, specific movement patterns aggravate, palpable taut bands. **Provoked by movement, eased by rest** | WNL | KS3, KS4, FA4 |
| 16 | `back_disc` | Disc Bulge / Herniation | Flexion-aggravated, sitting worse, centralization/peripheralization pattern (McKenzie), possible unilateral leg referral, 25-55 age. **Key: directional preference present** | AFFECTED | FA4, BB1, KS3 |
| 17 | `back_ddd` | Degenerative Disc Disease — Lumbar Spine | >40, broad-based stiffness, multi-level involvement, worse with inactivity then improves with warming up, end-range limitation, no single directional preference. **Distinguished from disc herniation by: bilateral symptoms, no centralization, gradual onset** | AFFECTED | KS3, KS4, FA4, FA5 |
| 18 | `back_radiculopathy` | Lumbar Radiculopathy (Sciatica) | Dermatomal leg pain (L4/L5/S1 distribution), positive SLR (Lasègue), numbness/tingling following nerve root territory, possible motor weakness, unilateral. **Key: pain BELOW knee distinguishes from referred buttock pain** | AFFECTED | BB1, BB3, NN4 |
| 19 | `back_spondylolisthesis` | Spondylolisthesis / Lumbar Instability | Extension-aggravated, palpable step deformity, increased lordosis, hamstring tightness, catching/giving way sensation, segmental hypermobility on testing. **Instability signs: aberrant movement patterns, painful arc of movement, Beighton score may be elevated** | AFFECTED | BB1, KS3, FA4 |
| 20 | `back_si_joint` | Sacroiliac Joint Dysfunction | Unilateral buttock/posterior pelvic pain, positive provocation tests (≥3 of 5: distraction, compression, thigh thrust, sacral thrust, Gaenslen's), pregnancy-related, stairs/rolling aggravated. **Key: pain below PSIS, pointing to PSIS on Fortin's finger test** | WNL | BB1, BB3, KS2 |
| 21 | `back_piriformis` | Piriformis Syndrome | Buttock pain ± posterior thigh, sitting on hard surface aggravated, positive piriformis stretch test, pseudo-sciatica (does NOT follow dermatomal pattern), tenderness deep to gluteus maximus. **Key differentiator from true sciatica: SLR often negative, no dermatomal pattern** | AFFECTED | FA4, KS2, BB1 |
| 22 | `back_post_pregnancy` | Post-Pregnancy LBP | 25-45, F, pelvic girdle pain, SIJ laxity (relaxin effect), core weakness, diastasis recti, onset peri- or post-partum. **Pelvic girdle pain (PGP) classification per European guidelines** | WNL | BB1, BB2, KS3 |
| 23 | `back_oa` | Osteoarthritis (Lumbar) | >55, morning stiffness <30min (distinguishes from inflammatory), grinding, end-range limitation, progressive but manageable, weight-bearing aggravated. **Inflammatory morning stiffness >30min → consider AS instead** | WNL | KS3, KS4, FA4 |
| 24 | `back_kyphosis` | Kyphosis / Scheuermann's Kyphosis | Increased thoracic curvature, may be postural (flexible, corrects with extension) or structural (Scheuermann's: rigid, wedging ≥5° at ≥3 consecutive vertebrae on X-ray, onset adolescence 12-17). **Scheuermann's: pain with prolonged sitting/standing, worse with activity, thoracolumbar junction** | WNL | KS3, KS4, PT1, FA5 |
| 25 | `back_post_surgical` | Post-Surgical Back Pain | Residual pain post-surgery (discectomy, fusion, decompression), scar tissue, deconditioning, fear avoidance behaviour, possible failed back surgery syndrome. **Assess: timeline since surgery, expected vs actual recovery, new vs persistent symptoms** | AFFECTED | BB1, KS3, FA4, NN1 |

---

### 2.2 NECK (Cervical Spine) — 23 Conditions

#### 🔴 Red Flag Conditions (8)

| # | Condition ID | Condition Name | Key Differentiating Features | Neuro | Games |
|---|-------------|----------------|------------------------------|-------|-------|
| 1 | `neck_fracture` | Suspected Cervical Fracture | Trauma, Canadian C-Spine Rule criteria, inability to rotate 45° bilaterally, midline tenderness, dangerous mechanism (fall >1m, axial load) | AFFECTED | — (refer) |
| 2 | `neck_myelopathy` | Possible Cord Signs / Cervical Myelopathy | Hand clumsiness (button/writing difficulty), gait disturbance (broad-based), Lhermitte's sign (electric shock with neck flexion), bilateral UL symptoms, Hoffman's sign positive, hyperreflexia, clonus. **Cardinal sign: UPPER motor neuron pattern — spasticity, NOT flaccidity** | AFFECTED | NN1, NN3, NN5 |
| 3 | `neck_cancer` | Cancer / Malignancy | Night pain unrelieved by position, weight loss, history of cancer, progressive weakness, age >50 with new onset | AFFECTED | — (refer) |
| 4 | `neck_infection` | Spinal Infection | Fever, night sweats, immunosuppression, constant severe pain, recent surgery/procedure | AFFECTED | — (refer) |
| 5 | `neck_cardiac` | Cardiac Referred Pain | Left neck/shoulder/arm pain, breathlessness, exertional onset, cardiac risk factors (smoking, HTN, hyperlipidaemia, DM, family history). **Screen with: age >40 + exertional + left-sided → emergency referral** | WNL | — (emergency) |
| 6 | `neck_tos` | Thoracic Outlet Syndrome | Arm heaviness/numbness with overhead activity, vascular compromise (pallor, cyanosis, absent pulse), Adson's/Roos test positive, nerve (brachial plexus) or vascular (subclavian) compression. **Three types: neurogenic (95%), venous, arterial** | AFFECTED | FA1, NN1 |
| 7 | `neck_vbi` | Rule Out Vertebro-Basilar Artery Insufficiency (VBI) | 5 D's: Dizziness, Diplopia (double vision), Dysarthria (slurred speech), Dysphagia (difficulty swallowing), Drop attacks. Triggered by sustained cervical rotation/extension. **Must screen BEFORE any cervical manipulation. Positive → no manual therapy, refer vascular** | AFFECTED | — (refer, no manual Rx) |
| 8 | `neck_progressive_neuro_ue` | Possible Progressive Neurological Deficit — Upper Extremity | Progressive (worsening) motor weakness in hand/arm, grip deterioration, muscle wasting thenar/hypothenar, increasing numbness. **Urgency: requires specialist review within 2 weeks. Distinguish from myelopathy by: unilateral + LMN pattern** | AFFECTED | NN1, NN2, NN5 |

#### 🟡 Yellow Flag Conditions (6)

| # | Condition ID | Condition Name | Key Differentiating Features | Neuro | Games |
|---|-------------|----------------|------------------------------|-------|-------|
| 9 | `neck_cervical_oa` | Cervical OA / Facet Arthropathy | >55, grinding/crepitus, end-range restriction (rotation + extension), morning stiffness <30min, localized | WNL | FA3, KS3, FA5 |
| 10 | `neck_as` | Ankylosing Spondylitis (Cervical) | 20-40, morning stiffness >30min improving with exercise, HLA-B27, restricted ALL planes, chin-on-chest distance increasing | WNL | FA3, KS3, KS4 |
| 11 | `neck_ra` | Rheumatoid Arthritis (Cervical) | Bilateral, systemic, morning stiffness >30min, **RISK: C1-C2 instability in established RA → screen with flexion/extension X-ray before treatment** | AFFECTED | FA3, NN1 |
| 12 | `neck_neuropathy` | Peripheral Neuropathy (Cervical/UL) | Bilateral hand numbness, burning, non-dermatomal, diabetes, B12 deficiency, alcohol history | AFFECTED | NN1, NN3, NN4 |
| 13 | `neck_instability` | Cervical Instability | Hypermobility (Beighton ≥4), catching/clicking with movement, sense of head being "heavy", sharp transient pains, history of whiplash, signs of upper cervical ligamentous compromise (Sharp-Purser, alar ligament tests). **Distinguish from OA: younger, hypermobile, no crepitus** | AFFECTED | BB1, BB2, NN1 |
| 14 | `neck_vestibular` | Rule Out Vestibular Disease | Vertigo provoked by HEAD position changes (not just neck), Dix-Hallpike positive, nystagmus present, symptoms persist regardless of neck position. **Key differentiator from cervicogenic dizziness: vestibular → head position, cervicogenic → neck position/movement** | WNL | BB1, BB4 |

#### 🟢 Green Flag Conditions (9)

| # | Condition ID | Condition Name | Key Differentiating Features | Neuro | Games |
|---|-------------|----------------|------------------------------|-------|-------|
| 15 | `neck_postural` | Postural Syndrome (Cervical) | Forward head posture, sustained desk/screen work, relieved by correction, no neuro signs, <30 | WNL | FA3, PT1, KS3 |
| 16 | `neck_muscle` | Muscle Strain / Imbalance | Spasms, trigger points (upper trap, levator scap, SCM), stiffness, palpable taut bands | WNL | FA3, FA5, KS4 |
| 17 | `neck_disc` | Cervical Disc Herniation | Unilateral arm pain, dermatomal pattern (C5-T1), Spurling's positive, neck flexion/rotation reproduces arm pain | AFFECTED | FA3, NN1, BB1 |
| 18 | `neck_ddd` | Degenerative Disc Disease — Cervical Spine | >40, multi-level stiffness, broad-based restriction, no single directional preference, gradual onset, osteophytes on imaging. **Distinguished from disc herniation: bilateral, no dermatomal pattern, gradual** | AFFECTED | FA3, KS3, KS4 |
| 19 | `neck_radiculopathy` | Cervical Radiculopathy | Dermatomal arm pain/numbness (C5: deltoid, C6: thumb, C7: middle finger, C8: little finger), reflex changes, muscle weakness, Spurling's + upper limb tension tests positive. **Specify root level in hypothesis** | AFFECTED | NN1, NN2, FA1 |
| 20 | `neck_thoracic_radiculopathy` | Thoracic Radiculopathy | Band-like chest/trunk pain following intercostal nerve distribution, may mimic cardiac/visceral pain, aggravated by thoracic rotation/coughing/sneezing, rare, usually T4-T8. **Rule out: cardiac, GI, pulmonary causes FIRST** | AFFECTED | KS3, KS4, FA5 |
| 21 | `neck_scoliosis` | Scoliosis / Kyphosis / Lordosis (Cervicothoracic) | Postural deformity, variable symptoms, cosmetic concern, Adams forward bend test, Cobb angle measurement | WNL | PT1, KS3, KS4 |
| 22 | `neck_cervicogenic_headache` | Cervicogenic Headache | Unilateral headache from C1-C3, neck movement triggers, no aura (distinguishes from migraine), reduced cervical ROM ipsilateral, tenderness at C0-C3. **IHS diagnostic criteria: unilateral, provoked by neck movement/posture, ipsilateral reduced ROM** | WNL | FA3, KS3 |
| 23 | `neck_cervicogenic_dizziness` | Cervicogenic Dizziness | Dizziness/unsteadiness provoked by NECK movements (not head position alone), associated with neck pain, no nystagmus (distinguishes from vestibular), history of whiplash or cervical pathology. **Diagnosis of exclusion: rule out VBI and vestibular FIRST** | WNL | BB1, BB2, FA3 |

---

### 2.3 SHOULDER — 14 Conditions

#### 🔴 Red Flag Conditions (3)

| # | Condition ID | Condition Name | Key Differentiating Features | Neuro | Games |
|---|-------------|----------------|------------------------------|-------|-------|
| 1 | `shoulder_fracture` | Red Flags at Shoulder (Fracture / Dislocation) | Trauma, deformity, inability to lift arm, night pain unrelieved, history of cancer, osteoporosis, fever. **Ottawa shoulder rules for fracture screening** | AFFECTED | — (refer) |
| 2 | `shoulder_rc_tear_full` | Rotator Cuff Tear (Full Thickness) | Complete loss of active elevation, trauma (>40) or degenerative (>60), drop arm test positive, significant weakness in ER/abduction. **Full tear vs tendinopathy: can't initiate movement at all** | WNL | — (refer, surgical opinion) |
| 3 | `shoulder_dislocation` | Shoulder Dislocation / Acute Instability | Visible deformity, apprehension, prior dislocation history, acute trauma, neurovascular compromise risk (axillary nerve). **First dislocation in <25 → high recurrence risk** | WNL | — (refer) |

#### 🟡 Yellow Flag Conditions (2)

| # | Condition ID | Condition Name | Key Differentiating Features | Neuro | Games |
|---|-------------|----------------|------------------------------|-------|-------|
| 4 | `shoulder_arthritis` | Shoulder Arthritis (Glenohumeral OA/RA) | >50, crepitus, progressive global ROM loss, post-trauma/surgery, RA: bilateral + systemic | WNL | FA1, FA2, FA5 |
| 5 | `shoulder_frozen` | Frozen Shoulder (Adhesive Capsulitis) | Global ROM restriction in CAPSULAR PATTERN (ER > Abduction > IR), >50, diabetes association (10-20% of diabetics), 3 stages (freezing 2-9mo, frozen 4-12mo, thawing 5-24mo). **Capsular pattern is pathognomonic** | WNL | FA1, FA2, FA5 |

#### 🟢 Green Flag Conditions (9)

| # | Condition ID | Condition Name | Key Differentiating Features | Neuro | Games |
|---|-------------|----------------|------------------------------|-------|-------|
| 6 | `shoulder_rc_tendinopathy` | Rotator Cuff Tendinopathy (Partial Tear) | Painful arc 60-120°, weakness in resisted ER/abduction, night pain lying on affected side, gradual onset. **Jobe's (supraspinatus), ER lag (infraspinatus), lift-off (subscapularis)** | WNL | FA1, FA2, BB1 |
| 7 | `shoulder_impingement` | Shoulder Impingement (Subacromial) | Overhead pain, Neer's and Hawkins-Kennedy positive, painful arc, relieved by rest, overhead athletes/workers. **May coexist with RC tendinopathy — impingement is mechanism, tendinopathy is tissue response** | WNL | FA1, FA2, FA5 |
| 8 | `shoulder_ac_joint` | AC Joint Dysfunction | Superior shoulder pain at AC joint, cross-body adduction pain (scarf test positive), localized tenderness, often post-trauma or degenerative. **Pain at TOP of shoulder, not lateral** | WNL | FA1, FA5 |
| 9 | `shoulder_calcific` | Calcific Tendinitis at Shoulder | Sudden severe pain (resorptive phase), X-ray shows calcification in supraspinatus, intermittent pattern with acute flares, 30-50 age. **Phases: formative → resting → resorptive (most painful) → post-calcific** | WNL | FA1, FA2 |
| 10 | `shoulder_biceps` | Biceps Tendinitis | Anterior shoulder pain, Speed's test positive (resisted forward flexion with supination), Yergason's (resisted supination), pain with overhead reaching. **Often coexists with impingement** | WNL | FA1, NN1 |
| 11 | `shoulder_instability` | Glenohumeral Instability (Chronic) | Apprehension, laxity (sulcus sign), recurrent subluxations/giving way, young athlete, hypermobility, "dead arm" sensation. **Traumatic vs atraumatic: traumatic = unidirectional, atraumatic = multidirectional** | WNL | BB1, FA1, NN1 |
| 12 | `shoulder_cervicogenic` | Cervicogenic Shoulder Pain | Referred from cervical spine C4-C5 dermatome, neck movement changes shoulder symptoms, no local shoulder signs (ROM full, no painful arc), Spurling's may reproduce shoulder pain. **Key test: neck movement reproduces "shoulder" pain** | AFFECTED | FA3, FA1, NN1 |
| 13 | `shoulder_soft_tissue` | Shoulder Soft Tissue Injury / Sprain | Acute onset with specific activity, localized muscle pain (deltoid/trap/pec), resolving within weeks, clear mechanism. **Distinguish from RC by: no painful arc, no weakness in specific RC tests** | WNL | FA1, FA5 |
| 14 | `shoulder_scapular` | Scapular Dyskinesia | Abnormal scapular movement pattern (winging, tipping, excessive protraction), overhead dysfunction, may be primary or secondary to RC/impingement. **Assessment: dynamic scapular movement during arm elevation, wall push-up** | WNL | FA1, FA2, FA5, PT1 |

---

### 2.4 KNEE — 22 Conditions

#### 🔴 Red Flag Conditions (5)

| # | Condition ID | Condition Name | Key Differentiating Features | Neuro | Games |
|---|-------------|----------------|------------------------------|-------|-------|
| 1 | `knee_fracture` | Fracture (Tibial Plateau / Patella / Femoral Condyle) | Trauma, Ottawa knee rules positive (age >55, isolated patella tenderness, fibula head tenderness, inability to flex 90°, inability to weight-bear 4 steps) | MAYBE | — (refer) |
| 2 | `knee_dislocation` | Dislocated Knee Cap (Patella) | Visible deformity, acute trauma, first dislocation, locked in lateral position | WNL | — (refer) |
| 3 | `knee_ligament_rupture` | Complete Ligament Rupture (ACL / PCL / Multi-ligament) | Pop heard, rapid swelling (<2hrs = haemarthrosis), gross instability, unable to walk | WNL | — (refer) |
| 4 | `knee_septic` | Septic Arthritis / Infection | Hot/red/swollen/exquisitely tender, fever, unable to weight-bear, immunocompromised. **Kocher criteria (paediatric): fever >38.5, non-weight-bearing, ESR >40, WCC >12** | MAYBE | — (emergency) |
| 5 | `knee_cancer` | Cancer / Bone Tumour | Night pain, progressive bone pain, weight loss, history of cancer, bone pain at rest | MAYBE | — (refer) |

#### 🟡 Yellow Flag Conditions (3)

| # | Condition ID | Condition Name | Key Differentiating Features | Neuro | Games |
|---|-------------|----------------|------------------------------|-------|-------|
| 6 | `knee_stress_fracture` | Stress Fracture | Localized bony tenderness, overuse/sudden training increase, female athlete triad, hop test positive | WNL | — (refer, rest) |
| 7 | `knee_oa_moderate` | Tibiofemoral OA (Moderate-Severe) | >55, crepitus, joint line tenderness, varus/valgus deformity, progressive, weight-bearing pain, Kellgren-Lawrence ≥3 | WNL | BB1, BB3, KS5 |
| 8 | `knee_inflammatory` | Inflammatory Arthritis (RA / Psoriatic Knee) | Morning stiffness >30min, bilateral, systemic symptoms, ESR/CRP elevated, MCP/PIP involvement in RA | WNL | BB1, KS5, KS6 |

#### 🟢 Green Flag Conditions (14)

| # | Condition ID | Condition Name | Key Differentiating Features | Neuro | Games |
|---|-------------|----------------|------------------------------|-------|-------|
| 9 | `knee_pfps` | Patellofemoral Pain Syndrome | Anterior knee pain, stairs/squatting/sitting worse ("cinema sign"), young/active, patellar grind, no effusion | WNL | BB1, BB3, KS5 |
| 10 | `knee_patellar_tendinopathy` | Patellar Tendinopathy (Jumper's Knee) | Inferior pole tenderness, jumping sports, load-dependent (pain ON loading, eases with warm-up), decline squat test | WNL | BB1, KS5, KS6 |
| 11 | `knee_quad_tendinopathy` | Quadriceps Tendinopathy | Superior pole tenderness, pain with resisted extension, older athlete, eccentric loading | WNL | BB1, KS5 |
| 12 | `knee_hoffa` | Hoffa's Fat Pad Impingement | Infrapatellar pain, extension-aggravated (end range), swelling anterior to patellar tendon | WNL | KS5, BB1 |
| 13 | `knee_osgood` | Osgood-Schlatter Disease | <18, tibial tuberosity prominence, running/jumping sports, growth spurt. **Self-limiting with skeletal maturity** | WNL | BB1, KS5 |
| 14 | `knee_meniscal_medial` | Medial Meniscal Tear | Medial joint line tenderness, locking/catching, McMurray's positive, twisting mechanism, effusion | WNL | BB1, BB3, KS5 |
| 15 | `knee_meniscal_lateral` | Lateral Meniscal Tear | Lateral joint line tenderness, clicking, effusion, locking, McMurray's lateral | WNL | BB1, BB3, KS5 |
| 16 | `knee_acl` | ACL Ligament Injury (Partial / Chronic) | Instability, giving way with pivoting, pivot shift apprehension, anterior drawer laxity, Lachman's positive | WNL | BB1, BB3, KS5, KS6 |
| 17 | `knee_mcl` | MCL Sprain / Tear | Medial pain, valgus stress test positive at 30° flexion, contact or non-contact mechanism, graded I-III | WNL | BB1, BB3, KS5 |
| 18 | `knee_lcl` | LCL Sprain / Tear | Lateral pain, varus stress test positive, less common, often with posterolateral corner injury | WNL | BB1, BB3, KS6 |
| 19 | `knee_pcl` | PCL Injury (Partial) | Posterior sag sign, dashboard mechanism, posterior drawer positive, posterior knee pain | WNL | BB1, BB3, KS5 |
| 20 | `knee_itb` | ITB Syndrome | Lateral knee, runners/cyclists, downhill aggravated, Noble's compression positive, tightness of ITB (Ober's test) | WNL | KS5, KS6, BB3 |
| 21 | `knee_plica` | Medial Plica Syndrome | 13-25, medial, clicking/catching, effusion, stairs/rising aggravated, F>M | WNL | BB1, KS5 |
| 22 | `knee_bakers` | Baker's Cyst / Popliteal Bursitis | Posterior fullness/mass, associated with OA or meniscal tear, restricts full flexion, may rupture (mimics DVT) | WNL | KS5, BB1 |

---

### 2.5 HIP — 16 Conditions

#### 🔴 Red Flag Conditions (4)

| # | Condition ID | Condition Name | Key Differentiating Features | Neuro | Games |
|---|-------------|----------------|------------------------------|-------|-------|
| 1 | `hip_fracture` | Hip Fracture (Femoral Neck / Intertrochanteric) | >65, trauma/fall, shortened + externally rotated leg, inability to weight-bear. **#NOF in elderly with even minor trauma → emergency** | MAYBE | — (emergency) |
| 2 | `hip_avn` | Avascular Necrosis (AVN of Femoral Head) | Groin pain, steroid use (dose-dependent risk), alcohol, sickle cell, autoimmune, progressive collapse. **MRI is gold standard for early detection — X-ray may be normal early** | WNL | — (refer) |
| 3 | `hip_septic` | Septic Arthritis (Hip) | Fever, inability to weight-bear, hot/swollen, antalgic gait, elevated WCC/CRP, hip held in flexion/ER | WNL | — (emergency) |
| 4 | `hip_scfe` | Slipped Capital Femoral Epiphysis (SCFE) | 10-16 years, obese, groin/knee pain, externally rotated gait, Drehmann sign (obligate ER with flexion). **Paediatric emergency — non-weight-bearing, urgent orthopaedics** | WNL | — (emergency) |

#### 🟡 Yellow Flag Conditions (3)

| # | Condition ID | Condition Name | Key Differentiating Features | Neuro | Games |
|---|-------------|----------------|------------------------------|-------|-------|
| 5 | `hip_oa` | Hip OA (Moderate-Severe) | >55, groin pain, capsular pattern (IR loss FIRST, then flexion, then abduction), progressive, bone-on-bone, weight-bearing pain | WNL | KS1, KS2, KS5 |
| 6 | `hip_inflammatory` | Inflammatory Arthritis (RA / AS Hip) | Morning stiffness >30min, bilateral, systemic, ESR/CRP elevated | WNL | KS1, KS2, KS5 |
| 7 | `hip_perthes` | Perthes Disease | 4-10 years, limp, groin/knee pain, limited abduction + IR, AVN of femoral head. **Paediatric — refer to paediatric orthopaedics** | WNL | — (paediatric refer) |

#### 🟢 Green Flag Conditions (9)

| # | Condition ID | Condition Name | Key Differentiating Features | Neuro | Games |
|---|-------------|----------------|------------------------------|-------|-------|
| 8 | `hip_fai` | Femoroacetabular Impingement (FAI) | Groin pain with flexion + IR, FADIR positive, young active adult (25-45), CAM (femoral) or pincer (acetabular) morphology. **Key test: FADIR (flexion-adduction-internal rotation)** | WNL | KS1, KS2, KS5, FA4 |
| 9 | `hip_labral` | Labral Tear | Clicking, catching, groin pain, FADIR positive, may coexist with FAI. **Mechanical symptoms (clicking/locking) distinguish from pure FAI** | WNL | KS2, KS5, BB3 |
| 10 | `hip_trochanteric` | Trochanteric Bursitis / Greater Trochanteric Pain Syndrome | LATERAL hip pain (not groin), lying on affected side worse, single leg stance/stairs, palpable tenderness over greater trochanter. **Key: LATERAL not GROIN — groin = joint, lateral = bursa/tendon** | WNL | KS1, BB3, KS6 |
| 11 | `hip_gluteal` | Gluteal Tendinopathy | Lateral hip, load-dependent (stairs, walking, single leg stance), Trendelenburg positive (pelvis drops on opposite side), worse with rest THEN activity (morning start-up pain) | WNL | KS1, BB3, KS6 |
| 12 | `hip_adductor` | Adductor Strain / Groin Pain | Medial groin pain, sports-related (kicking, sprinting, change of direction), resisted adduction painful, stretch painful | WNL | KS2, KS6, BB1 |
| 13 | `hip_snapping` | Snapping Hip (Internal / External) | Audible/palpable snap: external (ITB over GT) or internal (iliopsoas over iliopectineal eminence), usually painless but can become painful with repetition | WNL | KS2, KS1, FA4 |
| 14 | `hip_flexor` | Hip Flexor Strain (Iliopsoas) | Anterior hip/groin pain, resisted hip flexion painful, Thomas test positive (tight flexor), sprinting/kicking sports | WNL | FA4, KS1, KS5 |
| 15 | `hip_referred` | Referred Pain from Lumbar Spine | Groin/buttock/lateral thigh pain, changes with SPINAL movement (not hip), no local hip signs (full ROM, no pain with FADIR). **Key: hip ROM preserved, spinal movement reproduces symptoms** | AFFECTED | FA4, KS3, BB1 |
| 16 | `hip_post_surgical` | Post-Surgical Hip Pain | Post-THR or arthroscopy, deconditioning, scar tissue, ROM limitation, follow precautions (posterior approach: no flexion >90°, no IR, no adduction past midline) | WNL | KS1, KS2, KS5, BB1 |

---

### 2.6 ANKLE & FOOT — 15 Conditions

#### 🔴 Red Flag Conditions (3)

| # | Condition ID | Condition Name | Key Differentiating Features | Neuro | Games |
|---|-------------|----------------|------------------------------|-------|-------|
| 1 | `ankle_fracture` | Fracture (Malleolar / Talar / Calcaneal) | Ottawa ankle rules: bony tenderness at posterior edge or tip of either malleolus, inability to weight-bear 4 steps, fifth metatarsal base tenderness, navicular tenderness | MAYBE | — (refer) |
| 2 | `ankle_achilles_rupture` | Achilles Tendon Rupture | Pop heard, inability to plantarflex (can't stand on toes), Thompson's test positive (squeeze calf → no foot movement), palpable gap. **Not always painful — some patients walk on it using toe flexors** | WNL | — (refer) |
| 3 | `ankle_septic` | Septic Arthritis (Ankle) | Hot/red/swollen, fever, non-weight-bearing, immunocompromised | WNL | — (emergency) |

#### 🟡 Yellow Flag Conditions (3)

| # | Condition ID | Condition Name | Key Differentiating Features | Neuro | Games |
|---|-------------|----------------|------------------------------|-------|-------|
| 4 | `ankle_gout` | Gout / Pseudogout | Acute onset, red/hot/swollen, first MTP (gout) or ankle (pseudogout), elevated urate, recurrent, male >40. **Joint aspiration: negatively birefringent crystals (gout), positively birefringent (pseudogout)** | WNL | — (medical Rx) |
| 5 | `ankle_oa` | Ankle OA (Post-Traumatic / Primary) | Stiffness, prior fracture/recurrent sprains, progressive, weight-bearing pain, dorsiflexion loss | WNL | BB1, BB3, KS5 |
| 6 | `ankle_inflammatory` | Inflammatory Arthritis (RA / Psoriatic Ankle) | Morning stiffness >30min, bilateral, systemic, MTP involvement, forefoot widening | WNL | BB1, BB3 |

#### 🟢 Green Flag Conditions (9)

| # | Condition ID | Condition Name | Key Differentiating Features | Neuro | Games |
|---|-------------|----------------|------------------------------|-------|-------|
| 7 | `ankle_lateral_sprain` | Lateral Ankle Sprain (Grade I-II) | Inversion mechanism, ATFL tenderness (anterior to lateral malleolus), weight-bearing possible, swelling/bruising, anterior drawer laxity (grade II) | WNL | BB1, BB3, BB4 |
| 8 | `ankle_instability` | Chronic Ankle Instability | ≥2 recurrent sprains, giving way on uneven ground, persistent swelling, anterior drawer laxity, functional deficits | WNL | BB1, BB3, BB4, KS5 |
| 9 | `ankle_achilles_tendinopathy` | Achilles Tendinopathy | Midportion (2-6cm above insertion) or insertional (at calcaneus), load-dependent morning stiffness, palpable thickening, Royal London Hospital test. **Midportion vs insertional require different Rx approach** | WNL | BB1, BB3, KS5 |
| 10 | `ankle_plantar_fasciitis` | Plantar Fasciitis / Heel Pain | First-step pain morning (pathognomonic), inferior calcaneus, weight-bearing aggravated, windlass test positive (pain on toe extension), BMI often elevated | WNL | BB1, BB3, KS5 |
| 11 | `ankle_peroneal` | Peroneal Tendinopathy | Lateral ankle/retromalleolar pain, eversion weakness, history of lateral sprains, subluxation possible | WNL | BB1, BB3 |
| 12 | `ankle_pttd` | Posterior Tibial Tendon Dysfunction | Medial ankle pain, progressive flat foot (adult acquired), single heel raise weakness/inability, "too many toes" sign from behind. **Stages I-IV (Johnson-Strom classification)** | WNL | BB1, BB3, KS5 |
| 13 | `ankle_sinus_tarsi` | Sinus Tarsi Syndrome | Deep lateral ankle ache, post-sprain, worse on uneven ground, localized tenderness in sinus tarsi (depression anterior-inferior to lateral malleolus) | WNL | BB1, BB3, BB4 |
| 14 | `ankle_stress_fracture` | Metatarsal Stress Fracture | Forefoot pain, overuse (sudden training increase), hop test positive, gradual onset, second metatarsal most common | WNL | BB1 |
| 15 | `ankle_mortons` | Morton's Neuroma | 3rd/4th web space burning/shooting, tight shoes worse, Mulder's click (squeeze metatarsal heads = click + pain), relief removing shoes | AFFECTED | BB1, NN1 |

---

### 2.7 ELBOW — 18 Conditions

#### 🔴 Red Flag Conditions (2)

| # | Condition ID | Condition Name | Key Differentiating Features | Neuro | Games |
|---|-------------|----------------|------------------------------|-------|-------|
| 1 | `elbow_fracture` | Fracture (Radial Head / Olecranon / Distal Humerus) | Trauma (FOOSH = Fall On OutStretched Hand), deformity, inability to extend, significant swelling, fat pad sign on X-ray | MAYBE | — (refer) |
| 2 | `elbow_dislocation` | Elbow Dislocation | Trauma, deformity, locked in flexion/extension, neurovascular compromise risk (ulnar nerve, brachial artery). **Posterior dislocation most common (90%)** | AFFECTED | — (emergency) |

#### 🟡 Yellow Flag Conditions (2)

| # | Condition ID | Condition Name | Key Differentiating Features | Neuro | Games |
|---|-------------|----------------|------------------------------|-------|-------|
| 3 | `elbow_oa` | Elbow OA / RA | End-range limitation (flexion + extension loss), crepitus, locking (loose bodies), prior trauma/fracture, RA: bilateral + systemic | WNL | FA1, NN1 |
| 4 | `elbow_gout` | Gout (Elbow) | Acute onset, hot/swollen olecranon, elevated urate, recurrent, tophaceous deposits | WNL | — (medical Rx) |

#### 🟢 Green Flag Conditions (14)

| # | Condition ID | Condition Name | Key Differentiating Features | Neuro | Games |
|---|-------------|----------------|------------------------------|-------|-------|
| 5 | `elbow_tennis` | Lateral Epicondylitis (Tennis Elbow) | Lateral elbow, gripping aggravated (opening jars, shaking hands), wrist extension against resistance painful (Cozen's test), common extensor origin tenderness. **Most common elbow tendinopathy. 1-3% of population** | WNL | NN1, FA1 |
| 6 | `elbow_golfers` | Medial Epicondylitis (Golfer's Elbow) | Medial elbow, wrist flexion/pronation painful, gripping/throwing aggravated, common flexor origin tenderness. **5-10x less common than tennis elbow** | WNL | NN1, FA1 |
| 7 | `elbow_ulnar_nerve` | Ulnar Nerve Neuropathy at Elbow (Cubital Tunnel) | Medial elbow → ring + little finger numbness/tingling, Tinel's positive at cubital tunnel, elbow flexion test positive (symptoms within 60s of sustained flexion), intrinsic hand weakness (late). **Second most common upper limb nerve entrapment** | AFFECTED | NN1, NN2, NN5 |
| 8 | `elbow_bursitis` | Olecranon Bursitis | Posterior elbow swelling, fluctuant, pressure-aggravated (leaning on elbows), occupation-related (student's elbow), septic vs non-septic | WNL | NN1 |
| 9 | `elbow_pronator` | Pronator Teres Syndrome | Proximal volar forearm pain + median nerve symptoms (thumb/index/middle numbness), resisted pronation reproduces, no night symptoms (distinguishes from carpal tunnel). **Key differentiator from CTS: no night waking, pronation reproduces** | AFFECTED | NN1, NN2 |
| 10 | `elbow_radial_tunnel` | Radial Tunnel Syndrome | Proximal dorsal forearm pain, resisted supination and middle finger extension painful, lateral epicondyle area but deeper, often misdiagnosed as resistant tennis elbow. **Key: resisted middle finger extension reproduces (tennis elbow: wrist extension)** | AFFECTED | NN1, NN2 |
| 11 | `elbow_acute_ligament` | Acute Ligament Tear at Elbow | Acute onset with specific valgus/varus force, immediate pain + instability, swelling, often sports-related (throwing, contact). **Valgus → UCL (most common); Varus → RCL (less common)** | WNL | — (refer if complete) |
| 12 | `elbow_chronic_ligament` | Chronic Ligament Tear at Elbow | Persistent instability post-injury, recurrent giving way, pain with loaded activities, laxity on stress testing, often throwing athletes with chronic UCL attenuation | WNL | NN1, FA1, BB1 |
| 13 | `elbow_soft_tissue` | Elbow Joint Soft Tissue Injury / Sprain | Acute onset with activity, diffuse soreness, swelling, resolving within weeks, no specific ligament laxity, no nerve symptoms. **Diagnosis of exclusion after ruling out fracture, ligament, nerve** | WNL | NN1, FA1 |
| 14 | `elbow_ucl` | Ulnar Collateral Ligament Sprain | Medial elbow pain, valgus stress test positive (laxity or pain at 30° flexion), throwing athletes (overhead sports), milking manoeuvre positive. **Moving valgus stress test most sensitive** | WNL | NN1, FA1 |
| 15 | `elbow_rcl` | Radial Collateral Ligament Sprain | Lateral elbow pain with varus stress, less common than UCL, often part of posterolateral rotatory instability pattern, lateral pivot shift test. **Usually part of complex injury, rarely isolated** | WNL | NN1, FA1 |
| 16 | `elbow_biceps_distal` | Biceps Tendinopathy (Distal) | Anterior elbow/antecubital fossa pain, resisted supination + flexion painful, hook test positive (can't hook finger around tendon). **Rupture = pop + ecchymosis + reverse Popeye sign** | WNL | NN1, FA1 |
| 17 | `elbow_triceps` | Triceps Tendinopathy | Posterior elbow pain, resisted extension painful, throwing/pressing sports, olecranon tip tenderness | WNL | NN1, FA1 |
| 18 | `elbow_impingement` | Posterior Impingement (Olecranon) | Locking/catching in extension, loose bodies, throwing athletes, extension-aggravated, valgus extension overload. **Often coexists with UCL laxity in throwers** | WNL | FA1, NN1 |

---

### 2.8 WRIST & HAND — 17 Conditions

#### 🔴 Red Flag Conditions (3)

| # | Condition ID | Condition Name | Key Differentiating Features | Neuro | Games |
|---|-------------|----------------|------------------------------|-------|-------|
| 1 | `wrist_scaphoid_fracture` | Scaphoid Fracture | FOOSH mechanism, anatomical snuffbox tenderness, scaphoid compression test (axial load through thumb), X-ray may be negative initially (MRI at 2 weeks if clinical suspicion persists). **Most commonly missed fracture. Non-union risk if untreated → AVN** | WNL | — (refer, immobilize) |
| 2 | `wrist_distal_radius` | Distal Radius Fracture (Colles / Smith) | Trauma, dinner fork deformity (Colles = dorsal displacement), wrist pain + swelling, inability to grip | WNL | — (refer) |
| 3 | `wrist_infection` | Infection (Septic Arthritis / Flexor Sheath) | Kanavel's signs for flexor sheath infection: (1) fusiform (sausage) swelling, (2) flexed posture of finger, (3) tenderness along sheath, (4) pain with passive extension. **Surgical emergency** | WNL | — (emergency) |

#### 🟡 Yellow Flag Conditions (3)

| # | Condition ID | Condition Name | Key Differentiating Features | Neuro | Games |
|---|-------------|----------------|------------------------------|-------|-------|
| 4 | `wrist_ra` | Rheumatoid Arthritis (Wrist / Hand) | Morning stiffness >30min, bilateral MCP/PIP symmetrical, systemic, swan neck/boutonniere deformities (late), ulnar drift, Z-thumb. **DMARD therapy within 12 weeks of diagnosis per NICE** | WNL | NN1, NN2 |
| 5 | `wrist_scaphoid_avn` | AVN of Scaphoid | Post-fracture (especially waist/proximal pole), persistent snuffbox pain despite immobilization, sclerosis on X-ray, loss of grip strength. **Proximal pole fractures = highest AVN risk (blood supply enters distally)** | WNL | — (refer) |
| 6 | `wrist_arthritis` | Wrist Arthritis (OA) | Post-traumatic (previous fracture/SLAC/SNAC), radiocarpal/midcarpal stiffness, grip weakness, crepitus, progressive. **SLAC = scapholunate advanced collapse, most common wrist OA pattern** | WNL | NN1, FA1 |

#### 🟢 Green Flag Conditions (11)

| # | Condition ID | Condition Name | Key Differentiating Features | Neuro | Games |
|---|-------------|----------------|------------------------------|-------|-------|
| 7 | `wrist_carpal_tunnel` | Carpal Tunnel Syndrome | Median nerve distribution (thumb, index, middle, radial half of ring), night symptoms (waking with numbness), Phalen's (wrist flexion 60s reproduces), Tinel's, thenar wasting (late). **Most common upper limb nerve entrapment. Pregnancy, hypothyroid, diabetes, RA are risk factors** | AFFECTED | NN1, NN2, NN3, NN5 |
| 8 | `wrist_dequervain` | De Quervain's Tenosynovitis | Radial wrist/thumb pain, Finkelstein's test positive (ulnar deviation with thumb in fist reproduces pain), new mothers (repetitive lifting), texting thumb. **First dorsal compartment: APL + EPB tendons** | WNL | NN1, FA1 |
| 9 | `wrist_tfcc` | TFCC Tear (Triangular Fibrocartilage Complex) | Ulnar wrist pain, rotation/grip aggravated, clicking/clunking, press test positive (axial load through ulnarly deviated wrist), fovea sign positive. **Common after fall or forceful rotation** | WNL | NN1 |
| 10 | `wrist_ganglion` | Wrist Ganglion | Dorsal (70%) or volar (20-30%) mass, transillumination positive (fluid-filled), fluctuant, wrist discomfort with loading, may resolve spontaneously. **Dorsal: scapholunate ligament, volar: radiocarpal joint** | WNL | NN1 |
| 11 | `wrist_trigger` | Trigger Finger / Thumb | Catching/locking of finger in flexion, palpable nodule at A1 pulley (MCP flexion crease), morning worse, diabetes association (up to 10% of diabetics). **Grading: I = pain/tenderness, II = catching, III = locking (unlockable), IV = fixed contracture** | WNL | NN1, NN2 |
| 12 | `wrist_soft_tissue` | Wrist Soft Tissue Injury / Sprain | Acute onset post-trauma/strain, diffuse wrist pain, swelling, no specific ligament laxity, no neurological signs, improving within 4-6 weeks. **Diagnosis of exclusion — always rule out scaphoid fracture first** | WNL | NN1, FA1 |
| 13 | `wrist_acute_ligament` | Acute Ligament Tear at Wrist | Acute onset with fall/force, specific ligament pain (scapholunate: dorsal wrist, lunotriquetral: ulnar wrist), Watson's test (SL), Shuck test (LT), swelling. **Scapholunate most clinically significant — if missed → SLAC wrist** | WNL | NN1 |
| 14 | `wrist_chronic_ligament` | Chronic Ligament Tear at Wrist | Persistent wrist weakness/clicking post-injury, carpal instability pattern (DISI/VISI on lateral X-ray), grip weakness, load-related pain. **May progress to SLAC/SNAC pattern over years** | WNL | NN1, FA1 |
| 15 | `wrist_tendinopathy` | Wrist Tendinopathy (ECU / FCR) | Specific tendon pain (ECU: ulnar dorsal, FCR: radial volar), repetitive strain, occupational, gradual onset, resisted movement of specific tendon reproduces | WNL | NN1, FA1 |
| 16 | `wrist_dupuytren` | Dupuytren's Contracture | Palmar nodules/cords, progressive finger flexion contracture (ring + little finger most common), >50, M>F, genetic, bilateral 50%, associated with Ledderhose (plantar), Peyronie's. **Hueston table-top test: can't flatten palm on table** | WNL | NN1 |
| 17 | `wrist_cmc_oa` | CMC Joint OA (Thumb Base) | Base of thumb pain, gripping/pinching aggravated (opening jars, turning keys), grind test positive (axial load + rotation of thumb), >50, F>M. **Most common site of hand OA after DIP joints** | WNL | NN1, NN2 |

---

## Part 3 — Condition Count Summary

| Body Region | 🔴 Red | 🟡 Yellow | 🟢 Green | Total |
|-------------|--------|-----------|----------|-------|
| Back (Lumbar) | 5 | 8 | 12 | **25** |
| Neck (Cervical) | 8 | 6 | 9 | **23** |
| Shoulder | 3 | 2 | 9 | **14** |
| Knee | 5 | 3 | 14 | **22** |
| Hip | 4 | 3 | 9 | **16** |
| Ankle & Foot | 3 | 3 | 9 | **15** |
| Elbow | 2 | 2 | 14 | **18** |
| Wrist & Hand | 3 | 3 | 11 | **17** |
| **TOTAL** | **33** | **30** | **87** | **150** |

---

## Part 4 — Cross-Reference: Your Requested Diagnoses → Condition IDs

Every diagnosis you specified is mapped below with its condition ID and location in this document.

### Spine Diagnoses

| Your Diagnosis | Condition ID | Section | Status |
|---------------|-------------|---------|--------|
| Degenerative Disc Disease - Lumbar Spine | `back_ddd` | 2.1 #17 | ✅ |
| Ankylosing Spondylitis | `back_ankylosing_spondylitis` + `neck_as` | 2.1 #6, 2.2 #10 | ✅ |
| Suspected Spine Fracture | `back_fracture` + `neck_fracture` | 2.1 #1, 2.2 #1 | ✅ |
| Degenerative Disc Disease | `back_ddd` | 2.1 #17 | ✅ |
| Degenerative Disc Disease Cervical spine | `neck_ddd` | 2.2 #18 | ✅ |
| Lumbar radiculopathy | `back_radiculopathy` | 2.1 #18 | ✅ |
| Cervical radiculopathy | `neck_radiculopathy` | 2.2 #19 | ✅ |
| Rheumatoid Arthritis | `back_rheumatoid_arthritis` + `neck_ra` | 2.1 #7, 2.2 #11 | ✅ |
| Kyphosis | `back_kyphosis` | 2.1 #24 | ✅ |
| Scheuermann's Kyphosis | `back_kyphosis` (includes Scheuermann's) | 2.1 #24 | ✅ |
| Thoracic Outlet Syndrome | `neck_tos` | 2.2 #6 | ✅ |
| Muscle Imbalance | `back_muscle` + `neck_muscle` | 2.1 #15, 2.2 #16 | ✅ |
| Cervical instability | `neck_instability` | 2.2 #13 | ✅ |
| Lumbar instability | `back_spondylolisthesis` (includes instability) | 2.1 #19 | ✅ |
| Possible Cord signs | `neck_myelopathy` | 2.2 #2 | ✅ |
| Lumbar Canal stenosis | `back_stenosis` | 2.1 #9 | ✅ |
| Lateral Canal Stenosis | `back_lateral_stenosis` | 2.1 #10 | ✅ |
| Thoracic Radiculopathy | `neck_thoracic_radiculopathy` | 2.2 #20 | ✅ |
| Rule out VBI | `neck_vbi` | 2.2 #7 | ✅ |
| Cervicogenic Headache | `neck_cervicogenic_headache` | 2.2 #22 | ✅ |
| Osteopenia, Osteoporosis | `back_osteoporosis` (covers both) | 2.1 #8 | ✅ |
| Sacroiliac joint dysfunction | `back_si_joint` | 2.1 #20 | ✅ |
| Osteoporosis | `back_osteoporosis` | 2.1 #8 | ✅ |
| Progressive neurological deficit LE | `back_progressive_neuro_le` | 2.1 #13 | ✅ |
| Progressive neurological deficit UE | `neck_progressive_neuro_ue` | 2.2 #8 | ✅ |
| Possible Cauda Equina syndrome | `back_cauda_equina` | 2.1 #4 | ✅ |
| Cervicogenic Dizziness | `neck_cervicogenic_dizziness` | 2.2 #23 | ✅ |
| Rule out Vestibular disease | `neck_vestibular` | 2.2 #14 | ✅ |
| Lumbar Facet Joint Syndrome | `back_facet_syndrome` | 2.1 #12 | ✅ |

### Shoulder Diagnoses

| Your Diagnosis | Condition ID | Section | Status |
|---------------|-------------|---------|--------|
| Frozen shoulder | `shoulder_frozen` | 2.3 #5 | ✅ |
| Shoulder impingement | `shoulder_impingement` | 2.3 #7 | ✅ |
| Rotator cuff tendinopathy | `shoulder_rc_tendinopathy` | 2.3 #6 | ✅ |
| Shoulder soft tissue injury/sprain | `shoulder_soft_tissue` | 2.3 #13 | ✅ |
| AC joint dysfunction | `shoulder_ac_joint` | 2.3 #8 | ✅ |
| Calcific tendinitis at shoulder | `shoulder_calcific` | 2.3 #9 | ✅ |
| Biceps tendinitis | `shoulder_biceps` | 2.3 #10 | ✅ |
| Shoulder arthritis | `shoulder_arthritis` | 2.3 #4 | ✅ |
| Rotator cuff tear | `shoulder_rc_tear_full` | 2.3 #2 | ✅ |
| Scapular dyskinesia | `shoulder_scapular` | 2.3 #14 | ✅ |
| Red flags at shoulder | `shoulder_fracture` | 2.3 #1 | ✅ |

### Elbow Diagnoses

| Your Diagnosis | Condition ID | Section | Status |
|---------------|-------------|---------|--------|
| Tennis elbow | `elbow_tennis` | 2.7 #5 | ✅ |
| Golfers elbow | `elbow_golfers` | 2.7 #6 | ✅ |
| Ulnar nerve neuropathy at elbow | `elbow_ulnar_nerve` | 2.7 #7 | ✅ |
| Acute ligament tear at elbow | `elbow_acute_ligament` | 2.7 #11 | ✅ |
| Chronic ligament tear at elbow | `elbow_chronic_ligament` | 2.7 #12 | ✅ |
| Elbow joint soft tissue injury/sprain | `elbow_soft_tissue` | 2.7 #13 | ✅ |
| Pronator teres syndrome | `elbow_pronator` | 2.7 #9 | ✅ |
| Ulnar Collateral ligament sprain | `elbow_ucl` | 2.7 #14 | ✅ |
| Radial collateral Ligament sprain | `elbow_rcl` | 2.7 #15 | ✅ |

### Wrist / Hand Diagnoses

| Your Diagnosis | Condition ID | Section | Status |
|---------------|-------------|---------|--------|
| Carpal tunnel syndrome | `wrist_carpal_tunnel` | 2.8 #7 | ✅ |
| Trigger finger | `wrist_trigger` | 2.8 #11 | ✅ |
| De Quervain's tenosynovitis | `wrist_dequervain` | 2.8 #8 | ✅ |
| Wrist soft tissue injury/sprain | `wrist_soft_tissue` | 2.8 #12 | ✅ |
| AVN of scaphoid | `wrist_scaphoid_avn` | 2.8 #5 | ✅ |
| Acute ligament tear at wrist | `wrist_acute_ligament` | 2.8 #13 | ✅ |
| Chronic ligament tear at wrist | `wrist_chronic_ligament` | 2.8 #14 | ✅ |
| Wrist arthritis | `wrist_arthritis` | 2.8 #6 | ✅ |
| Dupuytren's contracture | `wrist_dupuytren` | 2.8 #16 | ✅ |
| Wrist ganglion | `wrist_ganglion` | 2.8 #10 | ✅ |

**All 59 requested diagnoses: ✅ CONFIRMED PRESENT**

---

## Part 5 — Clinical References

| Source | Used For |
|--------|----------|
| NICE NG59 | Low back pain and sciatica assessment and management |
| NICE CG177 | Osteoarthritis care and management |
| NICE NG100 | Rheumatoid arthritis management |
| NICE NG12 | Suspected cancer recognition and referral |
| APTA CPGs | Neck pain, knee pain, Achilles tendinopathy, shoulder classification |
| AAOS / BOA | Rotator cuff, ACL management, hip OA, fracture protocols |
| BSSG / SBNS | Cauda equina syndrome: saddle + bladder + bilateral neuro triad |
| Canadian C-Spine Rule | Cervical fracture screening |
| Ottawa Ankle / Knee Rules | Fracture screening at ankle and knee |
| McKenzie MDT | Directional preference classification for spine (flexion/extension) |
| Cyriax / Kaltenborn | Capsular patterns, end-feel assessment |
| Magee (7th ed) | Special tests, clinical reasoning frameworks |
| Hoppenfeld | Dermatomal mapping (C5-T1, L1-S2), motor testing |
| Apley's (10th ed) | Fracture classification, emergency presentations |
| Johnson-Strom | PTTD staging I-IV |
| Kellgren-Lawrence | OA radiological grading |
| Kocher criteria | Paediatric septic arthritis |
| Kanavel signs | Flexor sheath infection |
| Hueston table-top test | Dupuytren's contracture |
| IHS criteria | Cervicogenic headache |
| European PGP guidelines | Pelvic girdle pain classification |
| WHO ICD-11 / SNOMED CT | Condition coding alignment |

---

*End of Document — 150 conditions across 8 body regions, 21 games mapped, all 59 requested diagnoses confirmed present*
