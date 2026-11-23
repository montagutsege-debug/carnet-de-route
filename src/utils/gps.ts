export interface GpsPoint {
  lat: number;
  lng: number;
}

function dmsToDecimal(
  degrees: number,
  minutes: number,
  seconds: number,
  hemisphere: string
): number {
  const abs = Math.abs(degrees) + minutes / 60 + seconds / 3600;
  const dir = hemisphere.toUpperCase();
  const sign = dir === 'S' || dir === 'W' || dir === 'O' || degrees < 0 ? -1 : 1;
  return sign * abs;
}

/**
 * Parses common French and international GPS coordinate strings into { lat, lng }.
 * Supports:
 * - Cardinal decimal: "48.0394° N, 4.7318° O" / "43.8467 N, 6.5131 E"
 * - Signed decimal: "48.0394, -4.7318" / "48,0394 ; -4,7318"
 * - DMS: "48°02'21.8\"N 4°43'54.5\"O"
 */
export function parseGpsCoordinates(raw: string): GpsPoint | null {
  if (!raw || !raw.trim()) return null;
  const cleaned = raw.trim();

  // 1. DMS format (e.g. 48°02'21.8"N 4°43'54.5"O)
  const dmsRegex =
    /(-?\d+(?:[.,]\d+)?)\s*°\s*(\d+(?:[.,]\d+)?)?\s*['’′]?\s*(\d+(?:[.,]\d+)?)?\s*["”″]?\s*([NSns])\s*[,;/\s]+\s*(-?\d+(?:[.,]\d+)?)\s*°\s*(\d+(?:[.,]\d+)?)?\s*['’′]?\s*(\d+(?:[.,]\d+)?)?\s*["”″]?\s*([EWOewo])/;
  const dmsMatch = cleaned.match(dmsRegex);
  if (dmsMatch) {
    const latDeg = parseFloat(dmsMatch[1].replace(',', '.'));
    const latMin = dmsMatch[2] ? parseFloat(dmsMatch[2].replace(',', '.')) : 0;
    const latSec = dmsMatch[3] ? parseFloat(dmsMatch[3].replace(',', '.')) : 0;
    const latDir = dmsMatch[4];

    const lngDeg = parseFloat(dmsMatch[5].replace(',', '.'));
    const lngMin = dmsMatch[6] ? parseFloat(dmsMatch[6].replace(',', '.')) : 0;
    const lngSec = dmsMatch[7] ? parseFloat(dmsMatch[7].replace(',', '.')) : 0;
    const lngDir = dmsMatch[8];

    const lat = dmsToDecimal(latDeg, latMin, latSec, latDir);
    const lng = dmsToDecimal(lngDeg, lngMin, lngSec, lngDir);
    if (isValidLatLng(lat, lng)) return { lat, lng };
  }

  // 2. Cardinal decimal degrees (e.g. 48.0394° N, 4.7318° O or N 48.0394, O 4.7318)
  const cardinalAfterRegex =
    /(-?\d+(?:[.,]\d+)?)\s*°?\s*([NSns])\s*[,;/\s]+\s*(-?\d+(?:[.,]\d+)?)\s*°?\s*([EWOewo])/;
  const cardinalAfterMatch = cleaned.match(cardinalAfterRegex);
  if (cardinalAfterMatch) {
    const rawLat = Math.abs(parseFloat(cardinalAfterMatch[1].replace(',', '.')));
    const latDir = cardinalAfterMatch[2].toUpperCase();
    const rawLng = Math.abs(parseFloat(cardinalAfterMatch[3].replace(',', '.')));
    const lngDir = cardinalAfterMatch[4].toUpperCase();

    const lat = latDir === 'S' ? -rawLat : rawLat;
    const lng = lngDir === 'W' || lngDir === 'O' ? -rawLng : rawLng;
    if (isValidLatLng(lat, lng)) return { lat, lng };
  }

  const cardinalBeforeRegex =
    /([NSns])\s*(-?\d+(?:[.,]\d+)?)\s*°?\s*[,;/\s]+\s*([EWOewo])\s*(-?\d+(?:[.,]\d+)?)\s*°?/;
  const cardinalBeforeMatch = cleaned.match(cardinalBeforeRegex);
  if (cardinalBeforeMatch) {
    const latDir = cardinalBeforeMatch[1].toUpperCase();
    const rawLat = Math.abs(parseFloat(cardinalBeforeMatch[2].replace(',', '.')));
    const lngDir = cardinalBeforeMatch[3].toUpperCase();
    const rawLng = Math.abs(parseFloat(cardinalBeforeMatch[4].replace(',', '.')));

    const lat = latDir === 'S' ? -rawLat : rawLat;
    const lng = lngDir === 'W' || lngDir === 'O' ? -rawLng : rawLng;
    if (isValidLatLng(lat, lng)) return { lat, lng };
  }

  // 3. Plain signed decimal pair (e.g. 48.0394, -4.7318 or 48,0394 ; -4,7318)
  const decimalWithSemicolon = cleaned.match(
    /^(-?\d+(?:[.,]\d+)?)\s*[;/\s]+\s*(-?\d+(?:[.,]\d+)?)$/
  );
  if (decimalWithSemicolon) {
    const lat = parseFloat(decimalWithSemicolon[1].replace(',', '.'));
    const lng = parseFloat(decimalWithSemicolon[2].replace(',', '.'));
    if (isValidLatLng(lat, lng)) return { lat, lng };
  }

  const decimalWithComma = cleaned.match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
  if (decimalWithComma) {
    const lat = parseFloat(decimalWithComma[1]);
    const lng = parseFloat(decimalWithComma[2]);
    if (isValidLatLng(lat, lng)) return { lat, lng };
  }

  return null;
}

function isValidLatLng(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}
