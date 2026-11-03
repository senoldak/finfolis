const YOK = '–';
const AYLAR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const bos = (x) => x === null || x === undefined || Number.isNaN(x);

// Intl "tr-TR" dört haneli sayılarda binlik ayracı atlar; bu yüzden elle yazılır.
function sayiMetni(x, basamak) {
  const [tam, kesir] = Math.abs(x).toFixed(basamak).split('.');
  const bin = tam.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return kesir ? `${bin},${kesir}` : bin;
}

export function sayi(x, basamak = 2) {
  if (bos(x)) return YOK;
  const metin = sayiMetni(x, basamak);
  return x < 0 && Number(metin.replace(/\./g, '').replace(',', '.')) !== 0 ? `-${metin}` : metin;
}

export function yuzde(x, basamak = 1) {
  if (bos(x)) return YOK;
  const metin = sayiMetni(x * 100, basamak);
  const eksi = x < 0 && Number(metin.replace(/\./g, '').replace(',', '.')) !== 0;
  return `${eksi ? '-' : ''}%${metin}`;
}

export function tarih(iso) {
  if (bos(iso)) return YOK;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return YOK;
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Istanbul', day: 'numeric', month: 'numeric', year: 'numeric' })
      .formatToParts(d).map((x) => [x.type, x.value]),
  );
  return `${Number(p.day)} ${AYLAR[Number(p.month) - 1]} ${p.year}`;
}
