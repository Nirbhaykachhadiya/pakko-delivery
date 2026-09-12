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
    "Dariapur / Lal Darwaja / Kalupur / Raipur / Raikhad / Jamalpur / Khadia / Khanpur / Manek Chowk / Gandhi Road",

  380002: "Revdibazar / Railwaypura / N C Market",

  380003: "Delivery Hub Ahmedabad",

  380004:
    "Shahibaug / Shahpur / Madhupura / Delhi Gate / Dudheshwar / Girdharnagar / Cantonment",

  380005: "Sabarmati / Motera / Kabir Chowk / ONGC",

  380006: "Ellisbridge / Ambawadi",

  380007: "Paldi / Anandnagar / Narayannagar / Sarkhej Road / Shardanagar",

  380008:
    "Maninagar / Khokhra / Daxini Society / Jawahar Chowk / L G Hospital / S A Mill / Vasisthanagar",

  380009: "Navrangpura / Ashram Road / Darpan Society / Gujarat University",

  380013: "Naranpura Vistar / Nava Vadaj / Vadaj / Shastrinagar / Stadium Marg",

  380014: "Navjivan",

  380015:
    "Manekbag / IIM / Jodhpur Char Rasta / Azad Society / Polytechnic / Ambawadi Vistar / SAC",

  380016: "Civil Hospital / Asarwa Chakla / Meghaninagar / Public Office",

  380018: "Saraspur",

  380019: "D-Cabin / Railway Colony",

  380021: "Gomtipur / Rajpur Gomtipur",

  380022: "Behrampura / Calico Mills / Gita Mandir Road / M D Marg",

  380023: "Rakhial / Rakhial Udyog Vistar / Sukhrampura",

  380024: "Bapunagar / Bapunagar Industrial Estate / A E South",

  380026: "Amraiwadi / CTM Char Rasta",

  380027: "Gandhi Ashram",

  380028: "Bhairavnath Road / Shah Alam Roza",

  // =========================================================
  // WEST / SOUTH-WEST AHMEDABAD
  // =========================================================

  380050: "Ghodasar",

  380051: "Jivraj Park / Vejalpur",

  380052: "Memnagar",

  380054: "Bodakdev / Thaltej Road",

  380055: "Juhapura",

  380058: "Bopal",

  380059: "Thaltej",

  380060: "Gujarat High Court",

  380061: "Ghatlodia",

  380063: "Sola HBC",

  // =========================================================
  // NORTH / NORTH-WEST
  // =========================================================

  382424: "Chandkheda",

  382480: "Ranip",

  382481: "Chandlodia / Nirnaynagar / Gota",

  382470: "Digvijaynagar / Jagatpur / Tragad",

  // =========================================================
  // NORTH-EAST / EAST
  // =========================================================

  382330: "Naroda / Naroda Industrial Estate / Naroda SA",

  382340: "Kubernagar / Noblenagar",

  382345: "Krishnanagar / Naroda Road / N C Mills / Saijpur Bogha",

  382350: "Nikol / Khodiyarnagar / T B Nagar",

  382475: "Sardarnagar / Hansol / Airport area",

  // =========================================================
  // SOUTH / SOUTH-EAST
  // =========================================================

  382405: "Narol",

  382415: "Odhav / Odhav Industrial Estate",

  382418: "Vastral",

  382440: "Vatva",

  382443: "Isanpur",

  382445: "Vatva Industrial Estate",

  382449: "Jantanagar / Ramol",

  382430: "Kathwada / Kathwada Industrial Area",

  382433: "Kuha",

  382435: "Nandej / Dhamatvan / Geratpur",

  // =========================================================
  // GREATER / OUTER URBAN AHMEDABAD
  // =========================================================

  382210: "Sarkhej",

  382425: "Bareja",

  382427: "Aslali",

  382463: "Ambli / Bhadiad / Gogla / Otaria / Sangasar",

  382465: "Shela / Dhanala / Fatepur / Fedra / Pipli",
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
