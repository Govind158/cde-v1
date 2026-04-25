#!/usr/bin/env python3
"""Parse spec text → 53-condition JSON matrix. Fixed: en-dash, Part VI anchor, Knee section."""
import json, re, pathlib

SRC = pathlib.Path("/sessions/great-busy-hopper/mnt/outputs/kriya_cde_v4.1.txt")
OUT = pathlib.Path("/sessions/great-busy-hopper/mnt/outputs/conditions_matrices.json")

text = SRC.read_text()
lines = text.splitlines()

def find_idx(needle, start=0):
    for i in range(start, len(lines)):
        if needle in lines[i]:
            return i
    return -1

part_v_idx = find_idx("Part V — Per-condition scoring matrices")
back_idx     = find_idx("Back — scoring matrices", part_v_idx)
neck_idx     = find_idx("Neck — scoring matrices", part_v_idx)
shoulder_idx = find_idx("Shoulder — scoring matrices", part_v_idx)
knee_idx     = find_idx("Knee — scoring matrices", part_v_idx)
# Find the REAL Part VI heading (not the TOC entry)
part_vi_idx = find_idx("Part VI — Severity, confidence", part_v_idx + 100)

print(f"Part V={part_v_idx} Back={back_idx} Neck={neck_idx} Shoulder={shoulder_idx} Knee={knee_idx} PartVI={part_vi_idx}")

REGION_RANGES = [
    ("back",     back_idx,     neck_idx),
    ("neck",     neck_idx,     shoulder_idx),
    ("shoulder", shoulder_idx, knee_idx),
    ("knee",     knee_idx,     part_vi_idx),
]

# en-dash, em-dash, slash all allowed in condition names
COND_HDR = re.compile(r"^\s+(?P<name>[A-Za-z][A-Za-z0-9 /\(\)\-\u2013\u2014,\.]+?)\s{2,}(?P<flag>RED|YELLOW|GREEN) FLAG\s*$")
QC_HDR   = re.compile(r"^\s*(L\d{6})\s+(.+?)\s*$")
ROW      = re.compile(r"^\s+([A-K])\s+(.+?)\s+\+(\d+)\s*$")
UB       = re.compile(r"^Theoretical upper-bound contribution")

regions = {"back": [], "neck": [], "shoulder": [], "knee": []}

for region, start, end in REGION_RANGES:
    if start < 0 or end < 0 or start >= end:
        print(f"!! Skipping region {region} (start={start}, end={end})")
        continue
    i = start
    current_cond = None
    current_qc = None
    while i < end:
        line = lines[i]
        m_cond = COND_HDR.match(line)
        if m_cond:
            if current_cond is not None:
                regions[region].append(current_cond)
            current_cond = {"name": m_cond.group("name").strip(), "flag": m_cond.group("flag").lower(), "weights": {}}
            current_qc = None
            i += 1
            continue
        if UB.match(line):
            if current_cond is not None:
                regions[region].append(current_cond)
                current_cond = None
                current_qc = None
            i += 1
            continue
        if current_cond is None:
            i += 1
            continue
        m_qc = QC_HDR.match(line)
        if m_qc and not ROW.match(line):
            qc = m_qc.group(1)
            current_qc = qc
            current_cond["weights"].setdefault(qc, {})
            i += 1
            continue
        m_row = ROW.match(line)
        if m_row and current_qc is not None:
            current_cond["weights"][current_qc][m_row.group(1)] = int(m_row.group(3))
        i += 1
    if current_cond is not None:
        regions[region].append(current_cond)

# Validate
expected = {"back": 21, "neck": 19, "shoulder": 8, "knee": 5}
print("\n=== EXTRACTION SUMMARY ===")
ok = True
for region in regions:
    found, exp = len(regions[region]), expected[region]
    status = "OK" if found == exp else "!! MISMATCH"
    if found != exp: ok = False
    print(f"{region}: found {found} / expected {exp}  {status}")

for region, conds in regions.items():
    print(f"\n--- {region.upper()} ({len(conds)}) ---")
    for c in conds:
        nweights = sum(len(v) for v in c["weights"].values())
        print(f"  [{c['flag'].upper():6}] {c['name']:55}  ({nweights} cells, {len(c['weights'])} QCs)")

OUT.write_text(json.dumps(regions, indent=2))
print(f"\nWrote {OUT}\nAll counts OK: {ok}")
