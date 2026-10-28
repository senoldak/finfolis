import test from 'node:test';
import assert from 'node:assert/strict';
import { veriTakvimiUret } from './veri-takvimi.mjs';

const ev = (kaynak, tarih, baslik, kurum = 'TCMB') => ({ tarih, saat: null, kurum, baslik, donem: null, url: null, kaynak });

test('düşen kaynağın eski kayıtları korunur, çalışan kaynak güncellenir', async () => {
  const eski = { olaylar: [ev('tuik', '2026-11-03', 'eski TÜİK', 'TÜİK'), ev('tcmb-api', '2026-11-05', 'eski TCMB')] };
  const { basarili, durum, veri } = await veriTakvimiUret({
    eski,
    bugun: '2026-10-28',
    cekiciler: {
      tuik: async () => {
        throw new Error('ağ yok');
      },
      'tcmb-api': async () => ({ olaylar: [ev('tcmb-api', '2026-11-06', 'yeni TCMB')], bas: '2026-11-01', bit: '2026-11-30' }),
    },
  });
  assert.equal(basarili, true);
  assert.match(durum.tuik, /^DÜŞTÜ/);
  assert.deepEqual(veri.olaylar.map((o) => o.baslik), ['eski TÜİK', 'yeni TCMB']);
});

test('hiçbir kaynak çalışmazsa basarili false döner', async () => {
  const hata = async () => {
    throw new Error('x');
  };
  const { basarili } = await veriTakvimiUret({ eski: { olaylar: [] }, bugun: '2026-10-28', cekiciler: { a: hata, b: hata } });
  assert.equal(basarili, false);
});
