export function decimalToDms(dec, isLat) {
  if (isNaN(dec) || dec === 0) return '0';
  const dir = dec < 0 ? (isLat ? 'S' : 'W') : (isLat ? 'N' : 'E');
  const absDec = Math.abs(dec);
  const d = Math.floor(absDec);
  const minFloat = (absDec - d) * 60;
  const m = Math.floor(minFloat);
  const s = ((minFloat - m) * 60).toFixed(2);
  return `${d}° ${m}' ${s}" ${dir}`;
}

export function dmsToDecimal(dmsStr) {
  if (!dmsStr) return 0;
  const str = String(dmsStr).trim();
  
  // Parse DMS (e.g., 45° 30' 15" N, or 45 30 15 N)
  const regex = /(\d+)[^\d]+(\d+)[^\d]+([\d.]+)[^\d]+([NSEW])/i;
  const match = str.match(regex);
  if (match) {
    const d = parseInt(match[1], 10);
    const m = parseInt(match[2], 10);
    const s = parseFloat(match[3]);
    const dir = match[4].toUpperCase();
    let dec = d + m/60 + s/3600;
    if (dir === 'S' || dir === 'W') dec = -dec;
    return parseFloat(dec.toFixed(6));
  }
  
  // If it's just a number
  const num = parseFloat(str);
  if (!isNaN(num)) {
    return num;
  }
  return 0;
}
