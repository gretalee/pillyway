#!/usr/bin/env python3
"""
Validates a Pillyway camino seed JSON file against the required schema and
business rules. Run this on every generated seed file before wiring it up.

Usage:
    python3 validate_seed.py <path-to-seed.json> [--countries <countries.constants.ts>] [--accommodation-types <accommodation-types.ts>]

Exit code 0 = passed (warnings are OK, errors are not).
Exit code 1 = at least one error found.
"""

import json
import re
import sys
import argparse


SLUG_RE = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")

REQUIRED_POINT_FIELDS = ["position", "name", "country", "slug", "description", "lat", "lng"]
REQUIRED_ACCOMMODATION_FIELDS = [
    "name", "type", "description", "addressStreet", "addressZip",
    "addressCity", "addressCountry", "website", "email", "priceRange", "verified",
]
# Fields that are allowed to be null (not every accommodation has a phone/website/etc.)
NULLABLE_ACCOMMODATION_FIELDS = {"addressStreet", "website", "email", "phone"}
REQUIRED_STAGE_FIELDS = ["from", "to", "distance", "description"]
REQUIRED_CAMINO_FIELDS = ["name", "description", "verified", "createdBy"]

MIN_STAGE_KM = 5
MAX_STAGE_KM = 32


def load_enum_from_ts(path, enum_hint=None):
    """Best-effort extraction of string literal values from a TS const/enum file."""
    if not path:
        return None
    try:
        with open(path, encoding="utf-8") as f:
            text = f.read()
    except OSError as e:
        print(f"  ! could not read {path}: {e}")
        return None
    return set(re.findall(r"""['"]([a-zA-Z0-9_\-]+)['"]""", text))


def validate(data, countries=None, accommodation_types_and_prices=None):
    errors = []
    warnings = []

    # --- camino ---
    camino = data.get("camino")
    if not isinstance(camino, dict):
        errors.append("Missing top-level 'camino' object")
        camino = {}
    for field in REQUIRED_CAMINO_FIELDS:
        if not camino.get(field) and camino.get(field) is not False:
            errors.append(f"camino.{field} is missing or empty")
    if camino.get("description") and "credencial" not in camino["description"].lower() \
            and "pilgerpass" not in camino["description"].lower() \
            and "pilgerausweis" not in camino["description"].lower():
        warnings.append("camino.description doesn't seem to mention where to buy the pilgrim pass/credential")

    # --- points ---
    points = data.get("points")
    if not isinstance(points, list) or not points:
        errors.append("Missing or empty top-level 'points' array")
        points = []

    seen_slugs = set()
    seen_positions = set()
    for i, point in enumerate(points):
        label = f"points[{i}] ({point.get('name', '?')})"
        for field in REQUIRED_POINT_FIELDS:
            if point.get(field) is None or point.get(field) == "":
                errors.append(f"{label}: missing required field '{field}'")

        slug = point.get("slug", "")
        if slug and not SLUG_RE.match(slug):
            errors.append(f"{label}: slug '{slug}' is not lowercase-kebab-case")
        if slug in seen_slugs:
            errors.append(f"{label}: duplicate slug '{slug}'")
        seen_slugs.add(slug)

        pos = point.get("position")
        if pos in seen_positions:
            errors.append(f"{label}: duplicate position {pos}")
        seen_positions.add(pos)

        lat, lng = point.get("lat"), point.get("lng")
        if isinstance(lat, (int, float)) and not (-90 <= lat <= 90):
            errors.append(f"{label}: lat {lat} out of range")
        if isinstance(lng, (int, float)) and not (-180 <= lng <= 180):
            errors.append(f"{label}: lng {lng} out of range")

        if countries and point.get("country") and point["country"] not in countries:
            errors.append(f"{label}: country '{point['country']}' not found in countries.constants.ts")

        accommodations = point.get("accommodations", [])
        if not accommodations:
            warnings.append(f"{label}: no accommodations listed - confirm none exist at/near this waypoint")
        for j, acc in enumerate(accommodations):
            alabel = f"{label} accommodation[{j}] ({acc.get('name', '?')})"
            for field in REQUIRED_ACCOMMODATION_FIELDS:
                if field in NULLABLE_ACCOMMODATION_FIELDS:
                    if field not in acc:
                        errors.append(f"{alabel}: missing key '{field}' (use null if unknown)")
                elif acc.get(field) is None or acc.get(field) == "":
                    errors.append(f"{alabel}: missing required field '{field}'")
            if accommodation_types_and_prices:
                valid_types, valid_prices = accommodation_types_and_prices
                if valid_types and acc.get("type") not in valid_types:
                    errors.append(f"{alabel}: type '{acc.get('type')}' not in AccommodationType enum")
                if valid_prices and acc.get("priceRange") not in valid_prices:
                    errors.append(f"{alabel}: priceRange '{acc.get('priceRange')}' not in PriceRange enum")
            if not acc.get("phone") and not acc.get("website"):
                warnings.append(f"{alabel}: has neither phone nor website - a pilgrim can't easily reach or research this one, double check before publishing")

    # position sequence check
    positions = sorted(p for p in seen_positions if isinstance(p, int))
    if positions != list(range(1, len(positions) + 1)):
        warnings.append(f"point positions are not a clean 1..N sequence: {positions}")

    # --- stages ---
    stages = data.get("stages")
    if not isinstance(stages, list) or not stages:
        errors.append("Missing or empty top-level 'stages' array")
        stages = []

    point_names = [p.get("name") for p in points]
    for i, stage in enumerate(stages):
        label = f"stages[{i}] ({stage.get('from', '?')} -> {stage.get('to', '?')})"
        for field in REQUIRED_STAGE_FIELDS:
            if stage.get(field) is None or stage.get(field) == "":
                errors.append(f"{label}: missing required field '{field}'")

        dist = stage.get("distance")
        if isinstance(dist, (int, float)):
            if dist < MIN_STAGE_KM:
                # Soft rule: real routes occasionally force a shorter hop (e.g. a border
                # crossing right before the first accommodation). Flag it, don't fail the build.
                warnings.append(f"{label}: distance {dist}km is below the {MIN_STAGE_KM}km target - confirm this is unavoidable")
            elif dist > MAX_STAGE_KM:
                errors.append(f"{label}: distance {dist}km exceeds the {MAX_STAGE_KM}km hard maximum")

        if stage.get("from") not in point_names:
            errors.append(f"{label}: 'from' does not match any point name")
        if stage.get("to") not in point_names:
            errors.append(f"{label}: 'to' does not match any point name")

        if i > 0 and stages[i - 1].get("to") != stage.get("from"):
            errors.append(
                f"{label}: chain broken - previous stage ends at "
                f"'{stages[i - 1].get('to')}' but this stage starts at '{stage.get('from')}'"
            )

    if stages and points:
        if stages[0].get("from") != points[0].get("name"):
            warnings.append("first stage does not start at the first point")
        if stages[-1].get("to") != points[-1].get("name"):
            warnings.append("last stage does not end at the last point")

    return errors, warnings


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("seed_file")
    parser.add_argument("--countries", help="path to countries.constants.ts", default=None)
    parser.add_argument("--accommodation-types", help="path to accommodation-types.ts", default=None)
    args = parser.parse_args()

    with open(args.seed_file, encoding="utf-8") as f:
        data = json.load(f)

    countries = load_enum_from_ts(args.countries) if args.countries else None
    acc_enums = None
    if args.accommodation_types:
        raw = load_enum_from_ts(args.accommodation_types)
        # We can't cleanly separate AccommodationType from PriceRange with a generic
        # string-literal scan, so pass the same set for both - it still catches typos.
        acc_enums = (raw, raw)

    errors, warnings = validate(data, countries=countries, accommodation_types_and_prices=acc_enums)

    print(f"Validating {args.seed_file}")
    print(f"  points: {len(data.get('points', []))}, stages: {len(data.get('stages', []))}")
    print()

    if warnings:
        print(f"WARNINGS ({len(warnings)}):")
        for w in warnings:
            print(f"  - {w}")
        print()

    if errors:
        print(f"ERRORS ({len(errors)}):")
        for e in errors:
            print(f"  - {e}")
        sys.exit(1)
    else:
        print("No errors found.")
        sys.exit(0)


if __name__ == "__main__":
    main()
