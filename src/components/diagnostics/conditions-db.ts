/**
 * Kriya Pain Diagnostics — Conditions Database
 * Ported verbatim from App.jsx (Tables 12-16).
 *
 * Covers 4 regions: back, neck, shoulder, knee.
 * Each condition has:
 *   flag   — red / yellow / green (weighted 6/4/2 when ranking)
 *   age    — qualifier string(s), comma-separated (e.g. "any,>60")
 *   gender — preference ("both", "M>F", "F>M", "female", "male")
 *   feel   — constant / intermittent
 *   agg    — aggravating factors (fuzzy matched)
 *   rel    — relieving factors (fuzzy matched)
 *   dur    — acute / chronic / either
 *   status — worsening / improving / same / variable
 *   feat   — condition-specific features (fuzzy matched)
 *   neuro  — affected / wnl / maybe
 */

import type { ConditionsDB } from './types';

export const DB: ConditionsDB = {
  back: [
    { name: 'Fractures', flag: 'red', age: 'any,>60', gender: 'F>M', feel: 'constant', agg: ['movement', 'twist', 'bending'], rel: ['rest'], dur: 'acute', status: 'worsening', feat: ['history of fall', 'osteoporosis', 'long term steroids', 'sports injury', 'sudden pain not better with rest'], neuro: 'affected' },
    { name: 'Cancer / Malignancy', flag: 'red', age: 'any', gender: 'both', feel: 'constant', agg: ['any movement'], rel: [], dur: 'chronic,acute', status: 'worsening', feat: ['night pain', 'loss of appetite', 'weight loss', 'history of cancer', 'infection', 'weakness', 'fatigue', 'urine control loss'], neuro: 'affected' },
    { name: 'Infection (Herpes/UTI/TB)', flag: 'red', age: 'any', gender: 'both', feel: 'constant', agg: ['any movement'], rel: [], dur: 'chronic,acute', status: 'worsening', feat: ['night pain', 'loss of appetite', 'weight loss', 'weakness', 'fatigue', 'fever'], neuro: 'affected' },
    { name: 'Cauda Equina', flag: 'red', age: 'any', gender: 'both', feel: 'constant,intermittent', agg: ['loading', 'standing', 'walking', 'claudication'], rel: ['rest', 'sitting'], dur: 'chronic,acute', status: 'worsening', feat: ['weakness in lower legs', 'numbness', 'unable to walk', 'urine control loss', 'saddle anesthesia', 'erectile dysfunction', 'muscle paralysis'], neuro: 'affected' },
    { name: 'Vascular', flag: 'red', age: 'any,>55', gender: 'both', feel: 'intermittent', agg: ['arm movements', 'walking'], rel: ['rest'], dur: 'chronic', status: 'variable', feat: ['heaviness in legs', 'tingling', 'numbness', 'cold feet'], neuro: 'wnl' },
    { name: 'SI Joint', flag: 'green', age: 'any', gender: 'F>M', feel: 'intermittent', agg: ['turning in bed', 'rising', 'stairs', 'walking', 'bending'], rel: ['sitting', 'rest'], dur: 'chronic,acute', status: 'variable', feat: ['pregnancy', 'post pregnancy'], neuro: 'wnl' },
    { name: 'Post Pregnancy LBP', flag: 'green', age: '30-45', gender: 'female', feel: 'intermittent,constant', agg: ['standing', 'bending', 'walking'], rel: ['lying down'], dur: 'chronic', status: 'improving', feat: ['low iron', 'C section', 'breastfeeding'], neuro: 'wnl' },
    { name: 'Postural Syndrome', flag: 'green', age: 'any,<30', gender: 'both', feel: 'intermittent', agg: ['bad posture', 'faulty posture', 'sitting', 'standing'], rel: ['correction of posture', 'walking'], dur: 'chronic', status: 'improving', feat: [], neuro: 'wnl' },
    { name: 'Muscle Dysfunction / Soft Tissue', flag: 'green', age: 'any', gender: 'both', feel: 'intermittent', agg: ['movement', 'posture correction'], rel: ['rest'], dur: 'chronic', status: 'improving', feat: ['muscle spasms', 'stiffness', 'loss of ROM'], neuro: 'wnl' },
    { name: 'Disc Bulge / Herniation', flag: 'green', age: 'any', gender: 'both', feel: 'intermittent,constant', agg: ['bending', 'lifting', 'sitting', 'standing', 'walking'], rel: ['rest', 'lying down', 'posture change'], dur: 'either', status: 'variable', feat: [], neuro: 'affected' },
    { name: 'Osteoarthritis', flag: 'green', age: 'any,>55', gender: 'M>F', feel: 'intermittent', agg: ['bending', 'twisting', 'backbends'], rel: ['rest', 'walking'], dur: 'chronic', status: 'same,worse', feat: ['grinding feeling', 'less flexible', 'fatigue'], neuro: 'wnl' },
    { name: 'Radiculopathy (Sciatica)', flag: 'green', age: 'any', gender: 'both', feel: 'intermittent,constant', agg: ['walking', 'lifting', 'bending', 'sitting'], rel: ['rest', 'lying down', 'posture change'], dur: 'chronic', status: 'variable', feat: ['claudication', 'tingling', 'numbness'], neuro: 'affected' },
    { name: 'Spondylosis / Degenerative Disc', flag: 'green', age: 'any', gender: 'both', feel: 'intermittent,constant', agg: ['sitting', 'standing', 'walking', 'lifting', 'bending'], rel: ['rest', 'lying down', 'posture change'], dur: 'chronic', status: 'variable', feat: [], neuro: 'affected' },
    { name: 'Spondylolisthesis', flag: 'green', age: 'any', gender: 'F>M', feel: 'intermittent,constant', agg: ['standing', 'walking', 'bending backwards', 'bending forward', 'rising', 'turning in bed'], rel: ['rest', 'lying down', 'posture change'], dur: 'chronic', status: 'variable', feat: ['spasms', 'increased lordosis'], neuro: 'affected' },
    { name: 'Piriformis Syndrome', flag: 'green', age: 'any', gender: 'both', feel: 'intermittent', agg: ['walking', 'climbing stairs', 'prolonged sitting'], rel: ['lying down', 'walking'], dur: 'chronic', status: 'variable', feat: ['tenderness in buttock', 'sciatica-like pain'], neuro: 'affected' },
    { name: 'Post-Surgical Back Pain', flag: 'green', age: 'any', gender: 'both', feel: 'intermittent,constant', agg: ['loading', 'lifting', 'sitting', 'standing', 'walking', 'bending'], rel: ['rest', 'lying down', 'support'], dur: 'chronic', status: 'improving,same', feat: ['numbness', 'tingling', 'burning', 'failed surgery'], neuro: 'affected' },
    { name: 'Arthritis (OA/Facetal/Psoriatic)', flag: 'yellow', age: 'any,>55', gender: 'M>F', feel: 'intermittent', agg: ['bending', 'twisting', 'backbends'], rel: ['rest', 'walking'], dur: 'chronic', status: 'same,worse', feat: ['grinding feeling', 'less flexible', 'fatigue', 'psoriasis'], neuro: 'wnl' },
    { name: 'Ankylosing Spondylitis', flag: 'yellow', age: '20-25', gender: 'M>F', feel: 'intermittent', agg: ['rest', 'lying down', 'sitting', 'inactivity', 'morning stiffness'], rel: ['exercise', 'movement', 'stretching', 'medication'], dur: 'chronic', status: 'same,worse', feat: ['stiffness', 'hip pain', 'knee pain', 'eye irritation', 'extreme fatigue'], neuro: 'wnl' },
    { name: 'Osteoporosis', flag: 'yellow', age: '>50', gender: 'F>M', feel: 'intermittent', agg: ['excessive movement', 'lifting', 'prolonged sitting'], rel: ['rest', 'medication', 'heat', 'ice'], dur: 'chronic', status: 'same,worse', feat: ['low vitamin D', 'low calcium', 'loss of height', 'fatigue'], neuro: 'wnl' },
    { name: 'Stenosis', flag: 'yellow', age: '>55', gender: 'both', feel: 'intermittent', agg: ['claudication', 'standing', 'walking'], rel: ['sitting', 'lying down', 'stooping', 'bending'], dur: 'chronic', status: 'same,worse', feat: ['tingling', 'numbness', 'weakness', 'shopping cart sign'], neuro: 'affected' },
    { name: 'Peripheral / Diabetic Neuropathy', flag: 'yellow', age: '>55', gender: 'both', feel: 'constant', agg: ['walking', 'standing'], rel: ['rest'], dur: 'chronic', status: 'same,worse', feat: ['burning', 'numbness in feet', 'cramping', 'diabetes', 'high HbA1c'], neuro: 'affected' },
  ],
  neck: [
    { name: 'Fractures', flag: 'red', age: 'any,>60', gender: 'F>M', feel: 'constant', agg: ['movement', 'twist', 'bending'], rel: ['rest'], dur: 'acute', status: 'worsening', feat: ['history of fall', 'osteoporosis', 'sports injury'], neuro: 'affected' },
    { name: 'Cardiac Referred Pain', flag: 'red', age: 'any', gender: 'both', feel: 'constant', agg: ['walking', 'post meals'], rel: [], dur: 'acute', status: 'worsening', feat: ['breathlessness', 'high cholesterol', 'BP'], neuro: 'wnl' },
    { name: 'Cancer / Malignancy', flag: 'red', age: 'any', gender: 'both', feel: 'constant', agg: ['any movement'], rel: [], dur: 'chronic,acute', status: 'worsening', feat: ['night pain', 'loss of appetite', 'weight loss', 'history of cancer', 'weakness', 'fatigue'], neuro: 'affected' },
    { name: 'Infection (Herpes/UTI/TB)', flag: 'red', age: 'any', gender: 'both', feel: 'constant', agg: ['any movement'], rel: [], dur: 'chronic,acute', status: 'worsening', feat: ['night pain', 'weight loss', 'weakness', 'fatigue'], neuro: 'affected' },
    { name: 'Cervical Myelopathy', flag: 'red', age: 'any', gender: 'M>F', feel: 'intermittent', agg: ['neck movements'], rel: [], dur: 'chronic', status: 'worsening', feat: ['fine motor skills affected', 'balance issues', 'difficulty walking'], neuro: 'affected' },
    { name: 'Thoracic Outlet Syndrome', flag: 'red', age: 'any', gender: 'both', feel: 'intermittent', agg: ['overhead movement'], rel: ['rest'], dur: 'chronic', status: 'variable', feat: ['trauma', 'pregnancy'], neuro: 'affected' },
    { name: 'Rotator Cuff (Referring to Neck)', flag: 'green', age: 'any', gender: 'both', feel: 'intermittent', agg: ['arm movement', 'overhead activities'], rel: ['rest'], dur: 'chronic', status: 'improving,same', feat: [], neuro: 'wnl' },
    { name: 'Postural Syndrome', flag: 'green', age: 'any,<30', gender: 'both', feel: 'intermittent', agg: ['bad posture', 'faulty posture'], rel: ['correction of posture'], dur: 'chronic', status: 'improving', feat: [], neuro: 'wnl' },
    { name: 'Muscle Strains / Imbalances', flag: 'green', age: 'any', gender: 'both', feel: 'intermittent', agg: ['movement', 'posture correction'], rel: ['rest'], dur: 'chronic', status: 'improving', feat: ['muscle spasms', 'stiffness'], neuro: 'wnl' },
    { name: 'Disc Bulge / Herniation', flag: 'green', age: 'any', gender: 'both', feel: 'intermittent,constant', agg: ['bending', 'lifting', 'sitting', 'standing', 'walking'], rel: ['rest', 'lying down', 'posture change'], dur: 'either', status: 'variable', feat: [], neuro: 'affected' },
    { name: 'Scoliosis / Kyphosis / Lordosis', flag: 'green', age: 'any', gender: 'both', feel: 'intermittent', agg: ['prolonged postures'], rel: ['posture correction'], dur: 'chronic', status: 'variable', feat: [], neuro: 'wnl' },
    { name: 'Radiculopathy', flag: 'green', age: 'any', gender: 'both', feel: 'intermittent,constant', agg: ['walking', 'lifting', 'bending', 'sitting'], rel: ['rest', 'lying down', 'posture change'], dur: 'chronic', status: 'variable', feat: ['tingling', 'numbness', 'claudication'], neuro: 'affected' },
    { name: 'Spondylosis / Degenerative Disc', flag: 'green', age: 'any', gender: 'both', feel: 'intermittent,constant', agg: ['sitting', 'standing', 'walking', 'lifting', 'bending'], rel: ['rest', 'lying down', 'posture change'], dur: 'chronic', status: 'variable', feat: [], neuro: 'affected' },
    { name: 'Spondylolisthesis', flag: 'green', age: 'any', gender: 'F>M', feel: 'intermittent,constant', agg: ['standing', 'walking', 'bending backwards', 'rising', 'turning in bed'], rel: ['rest', 'lying down', 'posture change'], dur: 'chronic', status: 'variable', feat: ['spasms'], neuro: 'affected' },
    { name: 'Nerve Root Entrapment', flag: 'green', age: 'any', gender: 'both', feel: 'intermittent,constant', agg: ['movements', 'stretching'], rel: ['rest', 'folded hands'], dur: 'chronic', status: 'variable', feat: [], neuro: 'affected' },
    { name: 'Post-Surgical Neck Pain', flag: 'green', age: 'any', gender: 'both', feel: 'intermittent,constant', agg: ['loading', 'lifting', 'sitting', 'bending', 'overhead activity'], rel: ['rest', 'lying down', 'support'], dur: 'chronic', status: 'improving,same', feat: ['numbness', 'tingling', 'burning', 'failed surgery'], neuro: 'affected' },
    { name: 'Arthritis (OA/Facetal)', flag: 'yellow', age: 'any,>55', gender: 'M>F', feel: 'intermittent', agg: ['bending', 'twisting', 'looking up/down'], rel: ['rest', 'walking'], dur: 'chronic', status: 'same,worse', feat: ['grinding feeling', 'less flexible', 'fatigue'], neuro: 'wnl' },
    { name: 'Ankylosing Spondylitis', flag: 'yellow', age: '20-25', gender: 'M>F', feel: 'intermittent', agg: ['rest', 'lying down', 'sitting', 'inactivity', 'morning stiffness'], rel: ['exercise', 'movement', 'stretching', 'medication'], dur: 'chronic', status: 'same,worse', feat: ['stiffness', 'hip pain', 'knee pain', 'extreme fatigue'], neuro: 'wnl' },
    { name: 'Osteoporosis', flag: 'yellow', age: '>50', gender: 'F>M', feel: 'intermittent', agg: ['excessive movement', 'lifting', 'prolonged sitting'], rel: ['rest', 'medication', 'heat', 'ice'], dur: 'chronic', status: 'same,worse', feat: ['low vitamin D', 'low calcium', 'loss of height', 'fatigue'], neuro: 'wnl' },
    { name: 'Stenosis', flag: 'yellow', age: '>55', gender: 'both', feel: 'intermittent', agg: ['claudication', 'standing', 'walking'], rel: ['sitting', 'lying down', 'stooping', 'bending'], dur: 'chronic', status: 'same,worse', feat: ['tingling', 'numbness', 'weakness'], neuro: 'affected' },
    { name: 'Peripheral / Diabetic Neuropathy', flag: 'yellow', age: '>55', gender: 'both', feel: 'constant', agg: ['arm movements'], rel: ['rest'], dur: 'chronic', status: 'same,worse', feat: ['burning', 'numbness', 'diabetes', 'high HbA1c'], neuro: 'affected' },
  ],
  shoulder: [
    { name: 'Fracture / SLAP / Full Tear', flag: 'red', age: 'any', gender: 'both', feel: 'constant', agg: ['rest', 'movement'], rel: [], dur: 'acute', status: 'worsening', feat: ['constant pain', 'loss of appetite', 'weight loss', 'night pain', 'history of cancer', 'osteoporosis', 'history of fall', 'fever', 'chills'], neuro: 'affected' },
    { name: 'Rotator Cuff', flag: 'green', age: 'any', gender: 'both', feel: 'intermittent', agg: ['movement', 'lying on affected shoulder'], rel: ['rest'], dur: 'chronic', status: 'same,improved', feat: ['history of injury', 'sports/gym injury'], neuro: 'wnl' },
    { name: 'Muscular Tears / Strains', flag: 'green', age: 'any', gender: 'both', feel: 'intermittent', agg: ['movement'], rel: ['rest'], dur: 'acute', status: 'same,improved', feat: ['history of injury', 'sports/gym injury'], neuro: 'wnl' },
    { name: 'Adhesive Capsulitis', flag: 'green', age: '>50', gender: 'both', feel: 'constant,intermittent', agg: ['movement', 'lying on affected shoulder'], rel: ['rest'], dur: 'chronic', status: 'same,improved', feat: ['diabetes', 'repetitive injuries'], neuro: 'wnl' },
    { name: 'Cervicogenic Shoulder Pain', flag: 'green', age: 'any', gender: 'both', feel: 'constant,intermittent', agg: ['movement'], rel: ['rest'], dur: 'acute,chronic', status: 'variable', feat: ['neck pain', 'numbness', 'tingling', 'dizziness'], neuro: 'affected' },
    { name: 'AC Joint', flag: 'green', age: 'any', gender: 'both', feel: 'intermittent', agg: ['movement', 'lying on affected shoulder'], rel: ['rest'], dur: 'acute,chronic', status: 'same,improved', feat: ['pain across chest'], neuro: 'wnl' },
    { name: 'Glenohumeral Instability', flag: 'green', age: 'any', gender: 'both', feel: 'intermittent', agg: ['movement'], rel: ['rest'], dur: 'acute', status: 'same,improved', feat: ['looseness', 'weakness', 'sulcus sign'], neuro: 'wnl' },
    { name: 'Glenohumeral OA/RA', flag: 'yellow', age: '>50', gender: 'both', feel: 'intermittent', agg: ['movement'], rel: ['rest'], dur: 'chronic', status: 'same', feat: ['post surgery', 'repetitive trauma'], neuro: 'wnl' },
  ],
  knee: [
    { name: 'Stress Fracture', flag: 'red', age: 'any', gender: 'both', feel: 'constant', agg: ['movement', 'standing', 'walking', 'bending', 'loading'], rel: ['rest'], dur: 'acute,chronic', status: 'worsening', feat: ['osteoporosis', 'long term steroids'], neuro: 'maybe' },
    { name: 'Dislocated Knee Cap', flag: 'red', age: 'any', gender: 'both', feel: 'constant', agg: ['movement', 'standing', 'walking', 'bending', 'loading'], rel: ['bracing', 'rest'], dur: 'acute', status: 'worsening', feat: ['sports injuries'], neuro: 'wnl' },
    { name: 'Meniscal Tear / Torn Ligament', flag: 'red', age: 'any', gender: 'both', feel: 'constant', agg: ['movement', 'standing', 'walking', 'bending', 'loading'], rel: ['bracing', 'rest'], dur: 'acute', status: 'worsening', feat: ['sports injuries'], neuro: 'wnl' },
    { name: 'Fractured Bone', flag: 'red', age: 'any', gender: 'both', feel: 'constant', agg: ['movement', 'standing', 'walking', 'bending', 'loading'], rel: [], dur: 'acute', status: 'worsening', feat: ['fall', 'RTA'], neuro: 'maybe' },
    { name: 'Cancer / Infection', flag: 'red', age: 'any', gender: 'both', feel: 'constant', agg: ['movement', 'standing', 'walking', 'bending', 'loading', 'rest'], rel: [], dur: 'acute,chronic', status: 'worsening', feat: ['history of cancer', 'bone infection'], neuro: 'maybe' },
    { name: 'Patellofemoral Pain', flag: 'green', age: 'any', gender: 'both', feel: 'intermittent', agg: ['walking', 'bending knee', 'squatting', 'stairs', 'single leg standing'], rel: ['rest', 'medication'], dur: 'chronic', status: 'variable', feat: [], neuro: 'wnl' },
    { name: "Hoffa's Fat Pad Impingement", flag: 'green', age: 'any', gender: 'both', feel: 'intermittent', agg: ['walking', 'bending knee', 'squatting', 'stairs'], rel: ['rest', 'medication'], dur: 'chronic', status: 'variable', feat: [], neuro: 'wnl' },
    { name: 'Tendinopathy Patellar/Quadriceps', flag: 'green', age: 'any', gender: 'both', feel: 'intermittent', agg: ['walking', 'bending knee', 'squatting', 'stairs'], rel: ['rest', 'medication'], dur: 'chronic', status: 'variable', feat: [], neuro: 'wnl' },
    { name: 'Osgood-Schlatter Disease', flag: 'green', age: '<18', gender: 'both', feel: 'intermittent', agg: ['squatting', 'bending', 'running', 'uphill'], rel: ['rest', 'medication', 'ice'], dur: 'acute,chronic', status: 'variable', feat: [], neuro: 'wnl' },
    { name: 'Intra Articular Injury', flag: 'green', age: 'any', gender: 'both', feel: 'intermittent', agg: ['walking', 'bending knee'], rel: ['rest'], dur: 'acute,chronic', status: 'variable', feat: [], neuro: 'wnl' },
    { name: 'Patellofemoral OA', flag: 'green', age: 'any', gender: 'both', feel: 'intermittent', agg: ['walking', 'bending knee', 'squatting', 'stairs'], rel: ['rest', 'medication', 'knee caps'], dur: 'chronic', status: 'same,worse', feat: [], neuro: 'wnl' },
    { name: 'ACL Ligament Injury', flag: 'green', age: 'any', gender: 'both', feel: 'intermittent', agg: ['walking', 'bending knee', 'squatting', 'stairs'], rel: ['rest', 'ice', 'brace'], dur: 'acute,chronic', status: 'same,worse', feat: ['popping sound', 'rapid swelling', 'instability', 'knee buckling'], neuro: 'wnl' },
    { name: 'Medial Plica Syndrome', flag: 'green', age: '13-25', gender: 'F>M', feel: 'intermittent', agg: ['rising from chair', 'squatting', 'stairs'], rel: ['rest', 'medication'], dur: 'acute,chronic', status: 'same,worse', feat: ['effusion', 'swelling', 'popping', 'clicking'], neuro: 'wnl' },
    { name: 'ITB Tendinitis', flag: 'green', age: 'any', gender: 'both', feel: 'intermittent', agg: ['movement', 'hip'], rel: ['rest', 'ice'], dur: 'chronic', status: 'variable', feat: ['pain moves to hip'], neuro: 'wnl' },
    { name: 'Lateral Meniscal Tear', flag: 'green', age: 'any', gender: 'both', feel: 'intermittent', agg: ['walking', 'bending knee', 'squatting', 'stairs'], rel: ['rest', 'ice', 'brace'], dur: 'acute,chronic', status: 'variable', feat: ['swelling', 'locking', 'limping'], neuro: 'wnl' },
    { name: 'Lateral Collateral Ligament Tear', flag: 'green', age: 'any', gender: 'both', feel: 'intermittent', agg: ['walking', 'bending knee', 'squatting', 'stairs'], rel: ['rest', 'ice', 'brace'], dur: 'acute,chronic', status: 'variable', feat: ['popping sound', 'rapid swelling', 'instability', 'knee buckling'], neuro: 'wnl' },
    { name: 'Bursitis (Medial)', flag: 'green', age: 'any', gender: 'both', feel: 'intermittent', agg: ['walking', 'bending knee', 'squatting', 'stairs', 'rest'], rel: ['rest', 'ice', 'brace'], dur: 'chronic', status: 'variable', feat: ['swelling'], neuro: 'wnl' },
    { name: 'Medial Meniscal Tear', flag: 'green', age: 'any', gender: 'both', feel: 'intermittent', agg: ['walking', 'bending knee', 'squatting', 'stairs'], rel: ['rest', 'ice', 'brace'], dur: 'chronic', status: 'variable', feat: ['popping sound', 'rapid swelling', 'knee buckling'], neuro: 'wnl' },
    { name: 'MCL Tear', flag: 'green', age: 'any', gender: 'both', feel: 'intermittent', agg: ['walking', 'bending knee', 'squatting', 'stairs'], rel: ['rest', 'ice', 'brace'], dur: 'acute,chronic', status: 'variable', feat: ['popping sound', 'rapid swelling', 'instability', 'knee buckling'], neuro: 'wnl' },
    { name: 'Bursitis (Posterior)', flag: 'green', age: 'any', gender: 'both', feel: 'intermittent', agg: ['walking', 'bending knee', 'squatting', 'stairs', 'rest'], rel: ['rest', 'ice', 'brace'], dur: 'chronic', status: 'variable', feat: [], neuro: 'wnl' },
    { name: 'PCL Ligament Injury', flag: 'green', age: 'any', gender: 'both', feel: 'intermittent', agg: ['walking', 'bending knee', 'squatting', 'stairs'], rel: ['rest', 'ice', 'brace'], dur: 'acute,chronic', status: 'variable', feat: ['popping sound', 'rapid swelling', 'instability', 'knee buckling'], neuro: 'wnl' },
  ],
};

export const FLAG_WEIGHT: Record<'red' | 'yellow' | 'green', number> = {
  red: 6,
  yellow: 4,
  green: 2,
};
