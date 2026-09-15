// ============================================================================
//  AHMEDABAD PINCODE -> AREA NAME
// ============================================================================
//  THIS IS THE ONLY FILE YOU EDIT to add pincodes.
//
//  Format - one line each, comma at the end:
//
//      '382350': 'Thakkarnagar',
//
//  Keep the quotes around both the number and the name.
//  Use whatever name your delivery boys actually say, not the postal name.
//  After editing, save the file - the dev server picks it up automatically.
//
//  Anything not listed here shows the raw pincode with "Add area name".
//  Run  node scripts/fill-pincodes.js  to see which pincodes you are missing.
// ============================================================================

export const PINCODE_AREAS = {
  // =========================================================
  // CENTRAL / OLD AHMEDABAD
  // =========================================================

  380001:
    "Kalupur",

  380002: "Revdibazar",

  380003: "Delivery-Hub",

  380004:
    "Shahibaug",

  380005: "Sabarmati",

  380006: "Ellisbridge",

  380007: "Paldi",

  380008:
    "Maninagar",

  380009: "Navrangpura",

  380013: "Naranpura",

  380014: "Sardar-Patel-Stadium",

  380015:
    "Setelite",

  380016: "Asarwa Chakla",

  380018: "Saraspur",

  380019: "D-Cabin",

  380021: "Gomtipur",

  380022: "Behrampura",

  380023: "Rakhial",

  380024: "Bapunagar",

  380026: "Amraiwadi",

  380027: "Gandhi-Ashram",

  380028: "Shah-Alam",

  // =========================================================
  // WEST / SOUTH-WEST AHMEDABAD
  // =========================================================

  380050: "Ghodasar",

  380051: "Jivraj-Park",

  380052: "Memnagar",

  380054: "Bodakdev",

  380055: "Juhapura",

  380058: "Bopal",

  380059: "Thaltej",

  380060: "Gujarat-High-Court",

  380061: "Ghatlodia",

  380063: "Sola HBC",

  // =========================================================
  // NORTH / NORTH-WEST
  // =========================================================

  382424: "Chandkheda",

  382480: "Ranip",

  382481: "Gota",

  382470: "Tragad",

  // =========================================================
  // NORTH-EAST / EAST
  // =========================================================

  382330: "Naroda",

  382340: "Kubernagar",

  382345: "Krishnanagar",

  382350: "Nikol",

  382475: "Sardarnagar",

  // =========================================================
  // SOUTH / SOUTH-EAST
  // =========================================================

  382405: "Narol",

  382415: "Odhav",

  382418: "Vastral",

  382440: "Vatva",

  382443: "Isanpur",

  382445: "Vatva-Industrial",

  382449: "Ramol",

  382430: "Kathwada",

  382433: "Kuha",

  382435: "Dhamatvan",

  // =========================================================
  // GREATER / OUTER URBAN AHMEDABAD
  // =========================================================

  382210: "Sarkhej",

  382425: "Bareja",

  382427: "Aslali",

  382463: "Ambli",

  382465: "Shela",
};

// ============================================================================
//  PINCODE -> ROUGH MAP POINT  [lat, lng]
// ============================================================================
//  Used only to work out which pincode is nearest to which, so a rider's list
//  runs area by area instead of jumping across the city. Centre-of-area
//  accuracy is plenty - a few hundred metres either way changes nothing.
//
//  Add a line here whenever you add one to PINCODE_AREAS above. A pincode
//  with no point still works; it just sorts by how close its number is.
// ============================================================================

export const PINCODE_GEO = {
  // CENTRAL / OLD AHMEDABAD
  380001: [23.03, 72.595], // Kalupur
  380002: [23.025, 72.588], // Revdibazar
  380003: [23.04, 72.585], // Delivery-Hub
  380004: [23.053, 72.592], // Shahibaug
  380005: [23.08, 72.58], // Sabarmati
  380006: [23.025, 72.56], // Ellisbridge
  380007: [23.013, 72.565], // Paldi
  380008: [22.996, 72.602], // Maninagar
  380009: [23.038, 72.56], // Navrangpura
  380013: [23.055, 72.558], // Naranpura
  380014: [23.048, 72.57], // Sardar Patel Stadium
  380015: [23.01, 72.525], // Setelite
  380016: [23.048, 72.607], // Asarwa Chakla
  380018: [23.035, 72.61], // Saraspur
  380019: [23.065, 72.595], // D-Cabin
  380021: [23.013, 72.615], // Gomtipur
  380022: [22.995, 72.585], // Behrampura
  380023: [23.023, 72.625], // Rakhial
  380024: [23.038, 72.635], // Bapunagar
  380026: [23.008, 72.635], // Amraiwadi
  380027: [23.06, 72.58], // Gandhi-Ashram
  380028: [22.985, 72.598], // Shah-Alam

  // WEST / SOUTH-WEST
  380050: [22.975, 72.615], // Ghodasar
  380051: [23.0, 72.545], // Jivraj-Park
  380052: [23.05, 72.535], // Memnagar
  380054: [23.04, 72.51], // Bodakdev
  380055: [22.995, 72.53], // Juhapura
  380058: [23.033, 72.465], // Bopal
  380059: [23.045, 72.5], // Thaltej
  380060: [23.023, 72.508], // Gujarat High Court
  380061: [23.062, 72.53], // Ghatlodia
  380063: [23.075, 72.52], // Sola HBC

  // NORTH / NORTH-WEST
  382424: [23.11, 72.585], // Chandkheda
  382480: [23.085, 72.565], // Ranip
  382481: [23.09, 72.535], // Gota
  382470: [23.1, 72.56], // Tragad

  // NORTH-EAST / EAST
  382330: [23.07, 72.66], // Naroda
  382340: [23.062, 72.63], // Kubernagar
  382345: [23.07, 72.62], // Krishnanagar
  382350: [23.045, 72.665], // Nikol
  382475: [23.075, 72.61], // Sardarnagar

  // SOUTH / SOUTH-EAST
  382405: [22.965, 72.58], // Narol
  382415: [23.03, 72.67], // Odhav
  382418: [23.015, 72.66], // Vastral
  382440: [22.97, 72.63], // Vatva
  382443: [22.975, 72.6], // Isanpur
  382445: [22.96, 72.635], // Vatva-Industrial
  382449: [23.0, 72.65], // Ramol
  382430: [23.04, 72.7], // Kathwada
  382433: [22.98, 72.73], // Kuha
  382435: [22.96, 72.7], // Dhamatvan

  // GREATER / OUTER URBAN
  382210: [22.99, 72.5], // Sarkhej
  382425: [22.88, 72.65], // Bareja
  382427: [22.93, 72.63], // Aslali
  382463: [23.025, 72.48], // Ambli
  382465: [23.005, 72.47], // Shela
};

// Strips spaces, dashes and any stray characters the COD form may have saved,
// so "382350 " and "382-350" both match.
export function normalisePin(pin) {
  if (pin === null || pin === undefined) return null;
  const digits = String(pin).replace(/\D/g, "");
  return digits.length ? digits : null;
}

export function areaFor(pincode) {
  const pin = normalisePin(pincode);
  if (!pin) return null;
  return PINCODE_AREAS[pin] || null;
}

// Straight-line kilometres between two map points.
function haversine([lat1, lon1], [lat2, lon2]) {
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(a));
}

/**
 * How far apart two pincodes are. Real distance when both are on the map.
 * When either is missing a point it falls back to how close the numbers are,
 * pushed past every real distance so mapped areas always get grouped first.
 */
export function pinGap(a, b) {
  const ga = PINCODE_GEO[a];
  const gb = PINCODE_GEO[b];
  if (ga && gb) return haversine(ga, gb);
  return 1000 + Math.abs((Number(a) || 0) - (Number(b) || 0)) / 1000;
}

// Every order sorts under something, so orders with no pincode get a bucket
export const NO_PIN = 'unknown';

export const pinOf = (order) => normalisePin(order?.pincode) || NO_PIN;

/**
 * Walks the pincodes into a delivery-friendly run: start at `anchor`, then
 * keep hopping to whichever unvisited pincode is nearest the one just added.
 * So 380001 is followed by its closest neighbour, not by 380002 on paper.
 */
export function routeOrder(pins, anchor) {
  const pool = new Set(pins.map(normalisePin).filter(Boolean));
  const start = normalisePin(anchor);
  if (!start || !pool.has(start)) return [...pool].sort();

  pool.delete(start);
  const route = [start];
  let cur = start;

  while (pool.size) {
    let best = null;
    let bestGap = Infinity;
    for (const p of pool) {
      const g = pinGap(cur, p);
      // ties go to the lower pincode so the same list never reshuffles itself
      if (g < bestGap || (g === bestGap && p < best)) {
        bestGap = g;
        best = p;
      }
    }
    route.push(best);
    pool.delete(best);
    cur = best;
  }

  return route;
}

/**
 * Every pincode across these orders with its order count, already in the
 * order a rider would ride it: the busiest pincode leads, then whichever
 * pincode is nearest to it, and so on. Orders with no pincode go last.
 *
 * Shared by the rider and the admin so both read the same run.
 */
export function pincodeStats(orders) {
  const count = new Map();
  for (const o of orders || []) {
    const p = pinOf(o);
    count.set(p, (count.get(p) || 0) + 1);
  }

  const known = [...count.keys()].filter((p) => p !== NO_PIN);
  // busiest pincode starts the run; same count falls back to the lower number
  const anchor = known.sort(
    (a, b) => count.get(b) - count.get(a) || Number(a) - Number(b)
  )[0];

  const ordered = anchor ? routeOrder(known, anchor) : [];
  if (count.has(NO_PIN)) ordered.push(NO_PIN);

  return ordered.map((p) => ({ pin: p, count: count.get(p) }));
}
