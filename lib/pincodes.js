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
  // ---- Central / Old city ----
  '380001': 'Lal Darwaja / Kalupur',
  '380002': 'Dariapur',
  '380003': 'Shahibaug',
  '380004': 'Shahpur / Madhupura',
  '380016': 'Rakhial',
  '380019': 'Asarwa',
  '380021': 'Gomtipur',
  '380022': 'Behrampura',
  '380023': 'Saraspur',
  '380025': 'Kankaria',
  '380027': 'Jamalpur',

  // ---- West ----
  '380006': 'Ambawadi',
  '380007': 'Paldi',
  '380009': 'Navrangpura / Ashram Road',
  '380013': 'Vadaj',
  '380014': 'Naranpura',
  '380015': 'Satellite',
  '380050': 'Vejalpur / Juhapura',
  '380051': 'Vastrapur',
  '380052': 'Bodakdev',
  '380054': 'Thaltej',
  '380055': 'Sarkhej',
  '380058': 'Bopal',
  '380059': 'Sola',
  '380060': 'Ghatlodia',
  '380061': 'Chandlodia',
  '380063': 'Gota',

  // ---- North ----
  '380005': 'Sabarmati',
  '382424': 'Chandkheda',
  '382427': 'Motera',
  '382470': 'Narol',
  '382481': 'Kalol',

  // ---- East ----
  '380008': 'Maninagar',
  '380018': 'Bapunagar',
  '380024': 'Thakkarbapa Nagar',
  '380026': 'Amraiwadi',
  '380028': 'Danilimda / Shah Alam',
  '382330': 'Naroda',
  '382340': 'India Colony',
  '382345': 'Nikol',
  '382350': 'Thakkarnagar',
  '382405': 'Ramol',
  '382415': 'Odhav',
  '382418': 'Vastral',
  '382443': 'Vatva',
  '382445': 'Vatva GIDC',
  '382449': 'Isanpur / Ghodasar',

  // ---- Outer / nearby ----
  '382010': 'Gandhinagar',
  '382110': 'Sanand',
  '382210': 'Bavla',
  '382225': 'Dholka',
  '382305': 'Dehgam',

  // ---- ADD YOURS BELOW THIS LINE ----
};

// Strips spaces, dashes and any stray characters the COD form may have saved,
// so "382350 " and "382-350" both match.
export function normalisePin(pin) {
  if (pin === null || pin === undefined) return null;
  const digits = String(pin).replace(/\D/g, '');
  return digits.length ? digits : null;
}

export function areaFor(pincode) {
  const pin = normalisePin(pincode);
  if (!pin) return null;
  return PINCODE_AREAS[pin] || null;
}
