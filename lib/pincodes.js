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
