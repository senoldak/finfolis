const bos = (x) => x === null || x === undefined || Number.isNaN(x);

export function sirala(satirlar, anahtar, yon) {
  const kat = yon === 'azalan' ? -1 : 1;
  return [...satirlar].sort((a, b) => {
    const x = a[anahtar];
    const y = b[anahtar];
    if (bos(x) && bos(y)) return 0;
    if (bos(x)) return 1;
    if (bos(y)) return -1;
    if (typeof x === 'string' || typeof y === 'string') return kat * String(x).localeCompare(String(y), 'tr');
    return kat * (x - y);
  });
}

export function suz(satirlar, { metin, secimler } = {}, metinSutunlari = []) {
  const aranan = metin ? String(metin).toLocaleLowerCase('tr').trim() : '';
  const secim = Object.entries(secimler ?? {}).filter(([, d]) => d !== undefined && d !== null && d !== '');
  return satirlar.filter((s) => {
    if (secim.some(([k, d]) => s[k] !== d)) return false;
    if (!aranan) return true;
    return metinSutunlari.some((k) => !bos(s[k]) && String(s[k]).toLocaleLowerCase('tr').includes(aranan));
  });
}
