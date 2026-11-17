// All 36 Official Indian States & Union Territories with GST State Codes
export const GST_STATES = [
  { code: "33", name: "Tamil Nadu", type: "CGST + SGST" },
  { code: "01", name: "Jammu and Kashmir", type: "IGST" },
  { code: "02", name: "Himachal Pradesh", type: "IGST" },
  { code: "03", name: "Punjab", type: "IGST" },
  { code: "04", name: "Chandigarh", type: "IGST" },
  { code: "05", name: "Uttarakhand", type: "IGST" },
  { code: "06", name: "Haryana", type: "IGST" },
  { code: "07", name: "Delhi", type: "IGST" },
  { code: "08", name: "Rajasthan", type: "IGST" },
  { code: "09", name: "Uttar Pradesh", type: "IGST" },
  { code: "10", name: "Bihar", type: "IGST" },
  { code: "11", name: "Sikkim", type: "IGST" },
  { code: "12", name: "Arunachal Pradesh", type: "IGST" },
  { code: "13", name: "Nagaland", type: "IGST" },
  { code: "14", name: "Manipur", type: "IGST" },
  { code: "15", name: "Mizoram", type: "IGST" },
  { code: "16", name: "Tripura", type: "IGST" },
  { code: "17", name: "Meghalaya", type: "IGST" },
  { code: "18", name: "Assam", type: "IGST" },
  { code: "19", name: "West Bengal", type: "IGST" },
  { code: "20", name: "Jharkhand", type: "IGST" },
  { code: "21", name: "Odisha", type: "IGST" },
  { code: "22", name: "Chhattisgarh", type: "IGST" },
  { code: "23", name: "Madhya Pradesh", type: "IGST" },
  { code: "24", name: "Gujarat", type: "IGST" },
  { code: "26", name: "Dadra and Nagar Haveli and Daman and Diu", type: "IGST" },
  { code: "27", name: "Maharashtra", type: "IGST" },
  { code: "29", name: "Karnataka", type: "IGST" },
  { code: "30", name: "Goa", type: "IGST" },
  { code: "31", name: "Lakshadweep", type: "IGST" },
  { code: "32", name: "Kerala", type: "IGST" },
  { code: "34", name: "Puducherry", type: "IGST" },
  { code: "35", name: "Andaman and Nicobar Islands", type: "IGST" },
  { code: "36", name: "Telangana", type: "IGST" },
  { code: "37", name: "Andhra Pradesh", type: "IGST" },
  { code: "38", name: "Ladakh", type: "IGST" },
  { code: "97", name: "Other Territory", type: "IGST" },
];

export const DEFAULT_PLACE_OF_SUPPLY = "33 - Tamil Nadu";

// Helper: Check if a given place of supply is Inter-State (IGST) or Intra-State (CGST+SGST)
// Seller is registered in Tamil Nadu (State Code: 33)
export function isInterStateSupply(placeOfSupply = "") {
  const clean = String(placeOfSupply || "").trim().toLowerCase();
  if (!clean) return false;
  return !clean.startsWith("33") && !clean.includes("tamil nadu");
}

// Automatic detection of Place of Supply from GSTIN, State name/code, Pincode, or Address
export function detectPlaceOfSupply({ gstin = "", state = "", pincode = "", address = "" } = {}) {
  // 1. Highest Legal Priority: First 2 digits of GSTIN (if valid 2-digit state code)
  const cleanGstin = String(gstin || "").trim().toUpperCase();
  if (cleanGstin.length >= 2) {
    const codePrefix = cleanGstin.slice(0, 2);
    if (/^\d{2}$/.test(codePrefix)) {
      const match = GST_STATES.find((st) => st.code === codePrefix);
      if (match) {
        return {
          code: match.code,
          name: match.name,
          placeOfSupply: `${match.code} - ${match.name}`,
          isInterState: match.code !== "33",
          source: "gstin"
        };
      }
    }
  }

  // 2. Direct State Name or State Code Match
  const cleanState = String(state || "").trim().toLowerCase();
  if (cleanState) {
    const codeMatch = GST_STATES.find((st) => {
      const lowerName = st.name.toLowerCase();
      return (
        cleanState === st.code ||
        cleanState === lowerName ||
        cleanState.startsWith(st.code + " ") ||
        cleanState.startsWith(st.code + "-") ||
        cleanState.includes(`- ${lowerName}`) ||
        cleanState.includes(lowerName)
      );
    });
    if (codeMatch) {
      return {
        code: codeMatch.code,
        name: codeMatch.name,
        placeOfSupply: `${codeMatch.code} - ${codeMatch.name}`,
        isInterState: codeMatch.code !== "33",
        source: "state"
      };
    }
  }

  // 3. Indian Postal 6-digit Pincode Mapping
  const rawPinStr = `${pincode} ${address}`;
  const pinMatch = rawPinStr.match(/\b([1-9][0-9]{5})\b/);
  if (pinMatch) {
    const pinNum = parseInt(pinMatch[1], 10);
    let matchedCode = null;
    if (pinNum >= 600000 && pinNum <= 643999) {
      if (pinNum >= 605000 && pinNum <= 605999) matchedCode = "34"; // Puducherry
      else matchedCode = "33"; // Tamil Nadu
    } else if (pinNum >= 560000 && pinNum <= 591999) matchedCode = "29"; // Karnataka
    else if (pinNum >= 670000 && pinNum <= 695999) matchedCode = "32"; // Kerala
    else if (pinNum >= 500000 && pinNum <= 509999) matchedCode = "36"; // Telangana
    else if (pinNum >= 515000 && pinNum <= 535999) matchedCode = "37"; // Andhra Pradesh
    else if (pinNum >= 400000 && pinNum <= 445999) {
      if (pinNum >= 403000 && pinNum <= 403999) matchedCode = "30"; // Goa
      else matchedCode = "27"; // Maharashtra
    } else if (pinNum >= 360000 && pinNum <= 396999) matchedCode = "24"; // Gujarat
    else if (pinNum >= 110000 && pinNum <= 110999) matchedCode = "07"; // Delhi
    else if (pinNum >= 201000 && pinNum <= 285999) matchedCode = "09"; // Uttar Pradesh
    else if (pinNum >= 244000 && pinNum <= 263999) matchedCode = "05"; // Uttarakhand
    else if (pinNum >= 301000 && pinNum <= 345999) matchedCode = "08"; // Rajasthan
    else if (pinNum >= 700000 && pinNum <= 743999) matchedCode = "19"; // West Bengal
    else if (pinNum >= 450000 && pinNum <= 489999) matchedCode = "23"; // Madhya Pradesh
    else if (pinNum >= 490000 && pinNum <= 497999) matchedCode = "22"; // Chhattisgarh
    else if (pinNum >= 121000 && pinNum <= 136999) matchedCode = "06"; // Haryana
    else if (pinNum >= 140000 && pinNum <= 160999) {
      if (pinNum >= 160000 && pinNum <= 160099) matchedCode = "04"; // Chandigarh
      else matchedCode = "03"; // Punjab
    } else if (pinNum >= 800000 && pinNum <= 855999) matchedCode = "10"; // Bihar
    else if (pinNum >= 814000 && pinNum <= 835999) matchedCode = "20"; // Jharkhand
    else if (pinNum >= 751000 && pinNum <= 770999) matchedCode = "21"; // Odisha
    else if (pinNum >= 781000 && pinNum <= 788999) matchedCode = "18"; // Assam
    else if (pinNum >= 190000 && pinNum <= 194999) matchedCode = "01"; // J&K

    if (matchedCode) {
      const match = GST_STATES.find((st) => st.code === matchedCode);
      if (match) {
        return {
          code: match.code,
          name: match.name,
          placeOfSupply: `${match.code} - ${match.name}`,
          isInterState: match.code !== "33",
          source: "pincode"
        };
      }
    }
  }

  // 4. Fallback search inside address text
  const cleanAddr = String(address || "").toLowerCase();
  if (cleanAddr) {
    for (const st of GST_STATES) {
      if (cleanAddr.includes(st.name.toLowerCase())) {
        return {
          code: st.code,
          name: st.name,
          placeOfSupply: `${st.code} - ${st.name}`,
          isInterState: st.code !== "33",
          source: "address"
        };
      }
    }
  }

  // Default fallback: Tamil Nadu (Seller's home state)
  return {
    code: "33",
    name: "Tamil Nadu",
    placeOfSupply: DEFAULT_PLACE_OF_SUPPLY,
    isInterState: false,
    source: "default"
  };
}
