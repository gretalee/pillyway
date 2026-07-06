---
name: camino-seed-generator
description: Generates seed data for a new camino (pilgrim/hiking route) for the Pillyway app. Use this whenever the user asks to create seed data for a camino, add a new pilgrim route, research waypoints/stages/accommodations for a route, or wire up a new "seed:" yarn script and scripts/data/*.json file for Pillyway. Trigger this even if the user just names a route (e.g. "let's do the Camino Primitivo next" or "add Via de la Plata") in the context of the Pillyway app, or mentions seed-camino.ts, scripts/data/, or pilgrim waypoints/accommodations research.
---

# Camino Seed Generator

Generates a complete, ready-to-run seed data file for one camino (a long-distance
pilgrim/hiking route) for the Pillyway app, and wires it into both `package.json`
files so it can be run locally and in production.

This is a research-heavy task: most of the work is finding accurate, real waypoint,
distance, and accommodation data on the web and shaping it to fit the app's schema
and business rules exactly. Treat the web research as the hard part and the JSON
formatting as mechanical once the research is solid.

## Before you start: read the live enum sources

The `country`, `type` (accommodation), and `priceRange` fields must use exact values
from the app's own source of truth, not values you remember or guess. These files
change over time, so always read them fresh from the repo rather than relying on
any list baked into this skill:

- Countries: `apps/backend/src/countries/countries.constants.ts`
- Accommodation types and price ranges: `apps/frontend/app/api/accommodations/accommodation-types.ts`

Read both files with `view` before generating any point or accommodation data. If
you can't find them at these paths (the repo layout may have shifted), search the
repo for `AccommodationType`, `PriceRange`, or `countries.constants` before giving up.

## Step 1: Confirm the route

If the user hasn't already told you, ask which camino to build and confirm the
start and end point. Every established camino has a documented, canonical
start/end — don't invent one. The authoritative description of a route is usually
published by a site based in whichever country contains the largest share of the
route (e.g. a German pilgrim association for a German route, a Spanish one for a
Spanish route) — start your research there, then cross-check with 1-2 other
sources (regional tourism sites, outdooractive.com, camino-europe.eu, or similar
pilgrim-route aggregators).

Also confirm with the user (or use sensible defaults and state your assumption):
- The yarn script key, e.g. `seed:camino-primitivo` (used in both package.json files)
- The output filename, e.g. `camino-primitivo.json` (under `scripts/data/`)

These two don't always match the camino's display name exactly in the existing
examples, so don't assume a rigid derivation rule — just pick something short,
kebab-case, and recognizable, and confirm it with the user if there's any doubt.

## Step 2: Research waypoints and stages

Search extensively — this is not a 1-2 search task. Plan on 15-30 searches for a
typical multi-day route. For each stage of research, use `web_search` and
`web_fetch` to get full page content (snippets are usually too thin).

Reading public pages with `web_search`/`web_fetch` is read-only research — don't
ask the user for permission before fetching each URL. Just fetch whatever sources
you need as you go, the same way you would for any other research task.

Find:
1. The full list of official stages/waypoints from start to end, with distances.
2. Coordinates (lat/lng) for each waypoint — pilgrim guides rarely give these, so
   cross-check with a mapping source (OpenStreetMap, outdooractive, Wikipedia
   infoboxes) per place name.
3. Historical/cultural background for the camino overview, and where pilgrims can
   buy the pilgrim pass (credential) — this must appear in `camino.description`.
4. Accommodation at or very near each waypoint (see rules below).

**Waypoint selection rules:**
- Consecutive waypoints must be reachable in one day: **5-32 km apart.** Treat
  32 km as a hard ceiling — pilgrims genuinely cannot walk further in a day with
  full gear. The 5 km floor is a target, not absolute; a short hop is fine if
  there's a real-world reason (e.g. right after a border crossing, ferry, or
  when the alternative is skipping the only accommodation for many km).
- Prefer waypoints that have accommodation over ones that don't. If an official
  stage has no accommodation, consider merging it with the next one (like the
  `Stafstedt/Jahrsdorf → Jevenstedt` merge in the Via Jutlandica example) rather
  than creating a waypoint pilgrims can't actually stop at.
- Preferred accommodation type, in order: pilgrim hostel/albergue, church,
  monastery, private room. Fall back to bed & breakfast, pension, or a cheap
  hotel only if none of the preferred types are available.
- A pilgrim who reaches a waypoint tired and offline needs to actually be able
  to reach the place and see what it offers before arriving. Treat **phone
  number and website** as a package worth searching for specifically, not just
  whatever your first source happens to mention. If your initial source only
  gives a name and town, do a follow-up search for `"<accommodation name>" <town>
  Telefon` or `"<accommodation name>" <town> Webseite` before settling for a
  partial entry. Between two comparable options at the same waypoint, prefer
  the one with both over the one with only a phone number.
- It's fine for a waypoint to have zero accommodations if you've genuinely
  confirmed none exists — just don't skip searching for one first.
- It's also fine for `phone` or `website` to end up `null` on a genuine dead
  end (e.g. a small church-run hospice that's only ever reachable through a
  neighbor holding the key) — just make sure you actually looked, and say so
  in `_meta.note` if a waypoint's accommodation is missing one of these so a
  human reviewer knows to look harder before publishing.

**Stages** describe the connection between two consecutive points. Each stage's
`from`/`to` must exactly match a point's `name`, and stages must chain together
(each stage's `to` equals the next stage's `from`) so the whole route connects
start to end without gaps.

## Step 3: Write the seed file

Use `assets/_template.json` as your structural reference. Every field shown
there is mandatory except accommodations (only required when they exist at
all — if present, every field within an accommodation is mandatory; use `null`
for ones you genuinely couldn't find, like `website` or `email`).

**Language:** write all `description` fields (camino, points, stages, and
accommodations) in German, regardless of which country the route runs through.

**`camino` object:**
- `name`: the commonly-used name of the route.
- `description`: multi-paragraph German text covering what the route is, its
  history/significance, the landscape/terrain character, notable historical
  highlights along the way, and — critically — where to buy the pilgrim pass
  (credential), with a concrete source (shop, website, or pilgrim office).
- `verified`: always `false` (a human reviews and flags this later).
- `createdBy`: `"seed"` unless the user gives you a real Kinde user ID to use instead.

**`points` array**, one per waypoint, in walking order starting at `position: 1`:
- `country`: exact key from `countries.constants.ts`.
- `slug`: lowercase-kebab-case, derived from the name (e.g. `"Sankt Michael"` → `sankt-michael`).
- `description`: what's notable about this specific place for a pilgrim passing through.
- `lat`/`lng`: as precise as your sources allow.
- `accommodations`: each entry's `type` and `priceRange` must be exact enum
  values from `accommodation-types.ts`. Include phone number when you have it
  (add a `phone` field alongside the others — it's used in practice even though
  the bare template doesn't show it).

**`stages` array**, one per day/leg between consecutive points:
- `distance`: in whole kilometers, from your sources (don't estimate from
  coordinates — official stage distances account for the actual path, not a
  straight line).
- `description`: what the walk itself is like — terrain, things you pass, any
  points of interest along the way (not just a repeat of the destination's description).

**`_meta` object** (not required by the app, but always include it — it's
essential documentation for whoever reviews this before setting `verified: true`):
- `route`, `section`, `distance_km`, `stages`, `created` (today's date), `sources`
  (every URL you actually used), and `note` — call out anything a reviewer should
  know: merged stages, alternate route variants you didn't include, low-confidence
  data, or a reminder to replace `createdBy` if it's still `"seed"`.

Save the file to `scripts/data/<filename>.json`.

## Step 4: Validate before wiring anything up

Run the bundled validator against your output:

```bash
python3 scripts/validate_seed.py scripts/data/<filename>.json \
  --countries apps/backend/src/countries/countries.constants.ts \
  --accommodation-types apps/frontend/app/api/accommodations/accommodation-types.ts
```

Fix every error it reports. Warnings are worth a second look but can be
intentional (e.g. a short first stage, or a waypoint with no accommodation) —
use your judgment, and mention any you're knowingly leaving in place when you
hand the result back to the user.

## Step 5: Wire up the yarn scripts

Add two entries to `apps/backend/package.json`, alongside the other `seed:*`
entries (same block, same style — don't reorder the existing ones):

```json
"seed:<key>": "node --env-file=.env ./node_modules/.bin/ts-node --project tsconfig.scripts.json scripts/seed-camino.ts ../../scripts/data/<filename>.json",
"seed:<key>:prod": "node --env-file=.env.prod ./node_modules/.bin/ts-node --project tsconfig.scripts.json scripts/seed-camino.ts ../../scripts/data/<filename>.json",
```

Add the matching pair to the root `package.json`:

```json
"seed:<key>": "yarn --cwd apps/backend seed:<key>",
"seed:<key>:prod": "yarn --cwd apps/backend seed:<key>:prod",
```

Use `str_replace` to insert these next to the existing `seed:*` lines in both
files — don't rewrite the whole file.

## Step 6: Hand back a summary

Tell the user:
- The route's start/end and number of waypoints/stages.
- The output file path and the two yarn script names you added (dev + prod).
- Any validator warnings you left in place and why.
- Anything you couldn't confidently find (e.g. "couldn't confirm exact coordinates
  for X, used the town center") so they know what to double check before setting
  `verified: true`.
