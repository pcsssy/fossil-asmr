"""Validate source preservation, catalog invariants, assets and local doc links."""
import argparse
from collections import Counter
import json
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
TIERS = {"노멀": "normal", "레어": "rare", "스페셜": "special", "전설": "legendary"}


def source_items(source):
    section = source.split("## 6. 발굴 대상 50종", 1)[1].split("## 7.", 1)[0]
    category = rarity = None
    items = []
    for line in section.splitlines():
        cat = re.match(r"### ([A-F])\. (.+?) —", line)
        if cat:
            category = cat[1]
        if line.strip().rstrip(":") in TIERS:
            rarity = TIERS[line.strip().rstrip(":")]
        item = re.match(r"(\d+)\. (.+)$", line)
        if item:
            items.append({"id": f"specimen-{int(item[1]):03d}", "name": item[2],
                          "category": category, "rarity": rarity, "assetStatus": "missing"})
    return items


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--strict-catalog", action="store_true")
    args = parser.parse_args()
    errors = []
    source = (ROOT / "harness/source-prompt.md").read_text(encoding="utf-8-sig")
    original = source_items(source)
    catalog = json.loads((ROOT / "harness/catalog-draft.json").read_text(encoding="utf-8"))
    items = catalog["items"]
    ids = [item["id"] for item in items]
    if len(items) != 50 or len(set(ids)) != 50:
        errors.append("Catalog must contain 50 unique IDs")
    if items != original:
        if not catalog.get("reclassificationDecision"):
            errors.append("Source differs from draft without a reclassification decision")
    categories = dict(Counter(i["category"] for i in items))
    if set(categories) != set("ABCDEF"):
        errors.append("Unknown or missing category")
    declared_categories = catalog.get("declaredCategoryCounts", {"A": 10, "B": 8, "C": 11, "D": 8, "E": 7, "F": 5})
    if categories != declared_categories:
        print("KNOWN ISSUE: declared category counts differ from listed items:", categories)
        if args.strict_catalog:
            errors.append("Resolve category heading/list disagreement before content release")
    probabilities = catalog["rarityProbabilities"]
    if set(probabilities) != set(TIERS.values()) or abs(sum(probabilities.values()) - 1) > 1e-9:
        errors.append("Invalid rarity probabilities")
    if any(not 0 <= value <= 1 for value in probabilities.values()):
        errors.append("Probability outside [0, 1]")
    counts = dict(Counter(i["rarity"] for i in items))
    if set(counts) != set(TIERS.values()):
        errors.append("Unknown or missing rarity")
    mismatch = counts != catalog["targetCounts"]
    print("Catalog:", counts)
    if mismatch:
        print("KNOWN ISSUE: target rarity counts differ from the supplied source list")
        if args.strict_catalog:
            errors.append("Resolve and document rarity distribution before content release")

    if args.strict_catalog:
        runtime = json.loads((ROOT / "app/src/data/specimens.json").read_text(encoding="utf-8"))
        if len(runtime) != 50 or {i["id"] for i in runtime} != set(ids):
            errors.append("Runtime catalog must implement all 50 source IDs")
        by_id = {i["id"]: i for i in items}
        for specimen in runtime:
            if specimen["rarity"] != by_id[specimen["id"]]["rarity"]:
                errors.append(f"Runtime rarity mismatch: {specimen['id']}")
            asset = ROOT / "app/public" / specimen["image"].lstrip("/")
            if not asset.is_file():
                errors.append(f"Missing runtime specimen image: {specimen['id']}")

    register = json.loads((ROOT / "harness/asset-register.json").read_text(encoding="utf-8"))
    asset_ids = set()
    for asset in register["assets"]:
        if not set(register["requiredFields"]) <= set(asset):
            errors.append("Incomplete asset provenance")
            continue
        path = (ROOT / asset["path"]).resolve()
        if not path.is_relative_to(ROOT) or not path.is_file():
            errors.append(f"Missing or out-of-project asset: {asset['id']}")
        if asset["id"] in asset_ids or asset["status"] not in register["allowedStatus"]:
            errors.append(f"Invalid asset identity/status: {asset['id']}")
        asset_ids.add(asset["id"])
        if asset["status"] == "verified" and not all(asset[k] for k in ("license", "origin", "reviewedAt")):
            errors.append(f"Unverified provenance claimed verified: {asset['id']}")

    for doc in ROOT.rglob("*.md"):
        if any(part in {"node_modules", "dist", "output", ".playwright-cli", ".git"} for part in doc.relative_to(ROOT).parts):
            continue
        if doc.name == "source-prompt.md":
            continue
        for target in re.findall(r"\[[^\]]*\]\(([^)]+)\)", doc.read_text(encoding="utf-8")):
            if "://" in target or target.startswith("#"):
                continue
            path = (doc.parent / target.split("#", 1)[0]).resolve()
            if not path.exists():
                errors.append(f"Broken local link: {doc.name}: {target}")
    for error in errors:
        print("FAIL:", error)
    print(f"Assets registered: {len(register['assets'])}; app runtime not tested by this script")
    print("FAIL" if errors else "PASS (harness integrity" + ("; catalog issue remains)" if mismatch else ")"))
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
