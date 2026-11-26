// Haber işinin veri betiklerinin (TCMB, OECD, EVDS…) sonucunu mecmua-saat'e bildirir: hata veren betik için Redaksjon
// alarm grubuna alarm açılır, sonraki hatasız turda "Düzeldi" gider (saat/src/motor-uc.js POST veri). Betikler iş
// akışında `|| true` ile çalıştığı için hatalar önceden yalnız loga düşüyordu (enflasyon katkıları 3–26 Kasım 2026).
//
// Girdi (iş akışındaki `calistir` işlevi yazar): VERI_BETIKLER (her satır bir betik adı), VERI_HATALAR (betik<TAB>son
// hata satırı). İşi hiçbir zaman düşürmez.
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

export function veriDurumu(betiklerMetni, hatalarMetni) {
  const betikler = [...new Set(String(betiklerMetni ?? '').split('\n').map((s) => s.trim()).filter(Boolean))];
  const hatalar = [];
  for (const satir of String(hatalarMetni ?? '').split('\n')) {
    const [betik, ...kalan] = satir.split('\t');
    if (!betik?.trim() || !betikler.includes(betik.trim()) || hatalar.some((h) => h.betik === betik.trim())) continue;
    hatalar.push({ betik: betik.trim(), mesaj: kalan.join(' ').trim().slice(0, 300) });
  }
  return { betikler, hatalar };
}

async function main() {
  const { MOTOR_URL, MOTOR_ANAHTARI, VERI_BETIKLER, VERI_HATALAR } = process.env;
  if (!MOTOR_URL || !MOTOR_ANAHTARI || !VERI_BETIKLER) return console.log('veri durumu: ayar ya da betik listesi yok, bildirilmedi');
  const oku = (f) => readFile(f, 'utf8').catch(() => '');
  const govde = veriDurumu(await oku(VERI_BETIKLER), VERI_HATALAR ? await oku(VERI_HATALAR) : '');
  if (!govde.betikler.length) return console.log('veri durumu: çalışan betik yok');
  const r = await fetch(`${MOTOR_URL.replace(/\/$/, '')}/motor/finfolis/veri`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${MOTOR_ANAHTARI}`, 'content-type': 'application/json' },
    body: JSON.stringify(govde),
    signal: AbortSignal.timeout(60000),
  });
  const j = await r.json().catch(() => ({}));
  console.log(`veri durumu: ${govde.betikler.length} betik, ${govde.hatalar.length} hata → saat ${r.status} ${JSON.stringify(j)}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((e) => console.log(`veri durumu bildirilemedi: ${e.message}`));
}
