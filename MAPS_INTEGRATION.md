# RoundFlow — Maps Integration Spec

**Date:** 2026-10-14
**For:** Frontend + Backend
**What this is:** How the maps *should* work — pins that carry round + service-area meaning, and a pin click that opens the round's details (technician, status, value). It records what exists today, the one backend gap that limits everything, and a phased plan to get there.

---

## Summary

| # | Goal | Where it lands | Blocked on |
|---|---|---|---|
| 1 | Pin click → round details **incl. technician** | Frontend only | Nothing — data is already on the stop |
| 2 | Pins identified by **round** (not just status) | Frontend only | Nothing |
| 3 | Filter map by round / technician / status | Frontend only | Nothing |
| 4 | Kill client-side geocoding (fast, reliable pins) | Backend + frontend | Backend must store **lat/lng** |
| 5 | **Service areas** drawn on the map | Backend + frontend | Backend must expose area membership / boundaries |
| 6 | **Live** technician location on the map | Backend + mobile | No live-location feed exists yet |

The headline: **items 1–3 are pure frontend wins we can ship now** (the data is already in the API response), and the thing that makes the map feel slow/fragile today — **client-side geocoding** — is a backend data gap, not a frontend bug.

---

## 1. Where maps are today

There are two map surfaces:

| Surface | File | Shows |
|---|---|---|
| Round Planner map | `src/components/round-planner/RoundPlannerMapView.tsx` | One round-day's stops |
| Dashboard "GPS tracking" | `src/components/dashboard/GpsTrackingPanel.tsx` | Today's **planned** stops (not live GPS) |

Both share:
- **Loader:** `src/lib/google-maps.ts` — loads Google Maps (`maps` + `geocoding`) once; throws if `VITE_GOOGLE_MAPS_API_KEY` is unset.
- **Geocoding:** `src/features/maps/hooks/useGeocodedStops.ts` — because **there are no coordinates in the backend schema**, each stop's `addressLine + postcode` is geocoded **client-side** at runtime, cached per-address in `localStorage`, and staggered 180 ms per new lookup to avoid quota bursts. Addresses the Geocoder can't resolve are dropped from the map and listed as "unresolved N".
- **Gating:** no API key → a "setup needed" overlay over a blurred static list (not an error).

**What a pin shows today:** colour = stop **status** only (scheduled / completed / payment-hold / issue). The info window (`RoundPlannerMapView.tsx:230`) shows **address, customer, price** — and nothing else.

---

## 2. What we want

1. A pin should tell you **which round and service area** it belongs to — at a glance (colour/label) and on click.
2. Clicking a pin should open a details popover: **round name + day, assigned technician, status, value, flags**, and a link into the round.
3. **Service areas** should be visible as regions on the map.

---

## 3. Richer pins + click details — *shippable now, no backend*

The data is **already in the planner response**. `PlannerStop` (`src/api/rounds.api.ts:58`) carries:

```
visitId, propertyId, propertyName, addressLine, postcode, customerName,
price, status, paymentHold,
technicianId, technicianName,        ← already here
issues[], completedAt
```

and the map receives `PlannerListStop = PlannerStop & { roundId, roundName }` (`src/features/rounds/lib/planner.ts:56`) — so **round name is on every stop too**.

So "clicking a pin shows which technician is on that round" needs **no backend work** — only the info window is under-filled. Concretely:

**3a. Enrich the pin popover** (`RoundPlannerMapView.tsx:230-236`) to show:
- Round name + date (`roundName`, day)
- **Technician** (`technicianName`, or "Unassigned")
- Status chip (`status`, `paymentHold`, `issues.length`)
- Customer + address + price (as now)
- A link/button → open that round's detail panel

**3b. Identify pins by round.** Today one map = one round, so colour is free to mean status. On an **all-rounds** map (the dashboard, or a future combined view) a stop also needs to say *which* round it is. Recommended: keep **colour = status**, add a **round legend** (one entry per round) and show the round name in the popover; optionally a "colour by round" toggle for when the manager is thinking in rounds rather than exceptions.

**3c. Filters.** With `roundId`, `technicianId`, and `status` all on the stop, add map filters: **by round, by technician, by status**. No backend needed.

---

## 4. The core blocker — no coordinates in the backend

Everything on the map depends on turning an address into a point, and today that happens **in the browser, every session**:

- **Quota + cost** — every uncached address is a Geocoding API call; a big day burns through quota (hence the 180 ms stagger).
- **Latency** — the map can't draw until geocoding finishes; a cold cache = a visible wait.
- **Per-device cache** — results live in `localStorage`, so every new device/browser re-geocodes from scratch.
- **Silent data loss** — unresolvable addresses are dropped from the map (surfaced only as "unresolved N").

**Recommendation:** persist coordinates server-side so the client never geocodes.

```
# Option A (preferred): geocode on write, store on the property
Property gains:  latitude: number | null, longitude: number | null, geocodedAt: string | null
  → populated when a property is created/updated (address changes re-geocode)
  → planner stops return lat/lng inline; the frontend drops useGeocodedStops entirely

# Option B (incremental): a batch geocode endpoint
POST /geocode/batch   body: { items: [{ id, addressLine, postcode }] }
                      → [{ id, lat, lng } | { id, error }]
  → one round-trip instead of N staggered browser calls; still not cached server-side
```

Option A also fixes the **N+1 planner fan-out** noted elsewhere (the dashboard/planner issue one request per round): with coordinates inline, a single day endpoint can return every round's stops ready to plot.

---

## 5. Service areas on the map

Service areas today are **sets of postcode sectors**, not polygons (see Create Round → service areas, stored as postcode sectors). To "show the service area on the map" there are three levels:

| Level | Approach | Backend need |
|---|---|---|
| Cheap | Tint/cluster each area's **stops** by area colour (no boundary) | `serviceAreaId` + `serviceAreaName` on the stop |
| Medium | Draw an approximate region (convex hull / bubble around the area's geocoded stops) | same as above |
| Full | Draw true **postcode-sector boundaries** | a postcode-sector → polygon dataset (external, e.g. ONS/OS boundaries) served by backend |

**Recommendation:** start at **Cheap/Medium** — add `serviceAreaId` + `serviceAreaName` (and ideally a stable `serviceAreaColor`) to the planner stop, colour/group pins by area, and draw a soft hull. True boundary polygons are a Phase-3 nice-to-have that needs a boundary dataset.

> Note: `PlannerStop` does **not** currently include the service area — this is the one new field the "areas on the map" goal needs.

---

## 6. Suggested data contract

What the map ideally receives per stop (new fields in **bold**):

```
Stop {
  visitId, propertyId, addressLine, postcode, customerName, price,
  status, paymentHold, issues[],
  roundId, roundName,
  technicianId, technicianName,
  **latitude, longitude**,          // kills client geocoding (§4)
  **serviceAreaId, serviceAreaName, serviceAreaColor?**  // enables area view (§5)
}
```

Plus, to avoid the per-round fan-out when plotting a whole day:

```
GET /planner/day/:date   → { rounds: [{ roundId, roundName, technician, stops: Stop[] }] }
```

---

## 7. Pin-click popover — content spec

When a pin (or its list row) is selected, show:

- **Round** — name + the day it's scheduled
- **Technician** — name, or "Unassigned"; "James +1" when multiple
- **Status** — chip: Scheduled / Completed / Payment hold / Issue (+ issue count)
- **Customer** — name
- **Address** — line + postcode
- **Value** — price (formatted in tenant currency)
- **Actions** — "Open round" (→ round detail panel), "Message customer" (→ existing send-message flow)

Map behaviours: cluster markers when zoomed out; fit bounds to the visible set (already done); keep the "selected pin ↔ highlighted list row" two-way sync that exists today.

---

## 8. Phasing

| Phase | Work | Needs backend? |
|---|---|---|
| **0** | Set `VITE_GOOGLE_MAPS_API_KEY` (+ enable Maps JS & Geocoding, restrict by referrer) | No — unblocks the map at all |
| **1** | Enrich pin popover (technician + round + status + actions); round legend; filters by round/technician/status | **No** — data already present |
| **2** | Store lat/lng server-side → remove client geocoding; single day endpoint | **Yes** (§4) |
| **3** | Service areas on the map (colour/hull → true boundaries); live technician GPS | **Yes** (§5, + a live-location feed) |

The quickest visible win for exactly what was asked — *pins showing the round and, on click, the technician* — is **Phase 1**, and it ships without touching the backend.

---

## 9. API key setup (Phase 0)

```
# .env
VITE_GOOGLE_MAPS_API_KEY=<key>
```
- Enable **Maps JavaScript API** + **Geocoding API** on the Google Cloud project.
- Restrict the key by **HTTP referrer** (the app's domains) and to those two APIs.
- Until set, both maps show the "setup needed" overlay (by design) — no code change needed to switch them on.

---

## Appendix — file map

| Concern | File |
|---|---|
| Maps loader | `src/lib/google-maps.ts` |
| Client geocoding + cache | `src/features/maps/hooks/useGeocodedStops.ts`, `src/lib/geocode-cache.ts` |
| Round Planner map (pins, info window, legend) | `src/components/round-planner/RoundPlannerMapView.tsx` |
| Dashboard "GPS" (planned stops) | `src/components/dashboard/GpsTrackingPanel.tsx` |
| Stop / round data shapes | `src/api/rounds.api.ts` (`PlannerStop`), `src/features/rounds/lib/planner.ts` (`PlannerListStop`, `PlannerRoundCard`) |
| API key flag | `src/lib/env.ts` (`googleMapsApiKey`) |
