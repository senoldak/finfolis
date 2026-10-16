import test from 'node:test';
import assert from 'node:assert/strict';
import { kaynakTuru, seffaflikVerisi, istanbulGunu } from './seffaflik.mjs';

const SIMDI = new Date('2026-10-16T20:00:00Z'); // İstanbul 23:00

test('kaynakTuru: gizli kod yayın, merkez bankası resmi, kur veri, araştırma beslemesi araştırma', () => {
  assert.equal(kaynakTuru('k1a2b3c:0123456789abcdef'), 'yayin');
  assert.equal(kaynakTuru('fed:https://x'), 'resmi');
  assert.equal(kaynakTuru('kur:usdjpy:2026-10-16'), 'veri');
  assert.equal(kaynakTuru('ECB Working Papers:https://x'), 'arastirma');
});

test('istanbulGunu: UTC gece yarısından önceki saat İstanbul\'da ertesi gündür', () => {
  assert.equal(istanbulGunu('2026-10-15T22:30:00Z'), '2026-10-16');
});

test('seffaflikVerisi: pencere ilk taramadan başlar, günlük sayılar ve türler doğru', () => {
  const gorulen = {
    'k1a2b3c:aa': { zaman: '2026-10-15T08:00:00Z', yazildi: true },
    'k1a2b3c:bb': { zaman: '2026-10-15T09:00:00Z' },
    'k9f8e7d:cc': { zaman: '2026-10-16T09:00:00Z' },
    'fed:https://x': { zaman: '2026-10-16T10:00:00Z', yazildi: true },
    'kur:eurusd:1': { zaman: '2026-10-16T11:00:00Z' },
  };
  const haberler = [
    { date: new Date('2026-10-15T09:30:00Z'), tur: 'haber' },
    { date: new Date('2026-10-16T10:30:00Z'), tur: 'haber', icerikTuru: 'resmi' },
    { date: new Date('2026-10-16T12:00:00Z'), tur: 'bulten' },
    { date: new Date('2026-09-01T12:00:00Z'), tur: 'haber' }, // pencere dışı
  ];
  const v = seffaflikVerisi(haberler, gorulen, { simdi: SIMDI });
  assert.equal(v.ilkGun, '2026-10-15');
  assert.equal(v.gunSayisi, 2);
  assert.equal(v.taranan, 5);
  assert.equal(v.yayinlanan, 2);
  assert.equal(v.bulten, 1);
  assert.equal(v.secilmeOrani, 2 / 5);
  assert.deepEqual(v.gunluk, [
    { gun: '2026-10-15', taranan: 2, yayinlanan: 1, bulten: 0 },
    { gun: '2026-10-16', taranan: 3, yayinlanan: 1, bulten: 1 },
  ]);
  assert.deepEqual(v.kaynakTurleri, [
    { tur: 'yayin', taranan: 3, kaynak: 2 },
    { tur: 'resmi', taranan: 1, kaynak: 1 },
    { tur: 'veri', taranan: 1, kaynak: 1 },
  ]);
  assert.equal(v.kaynakSayisi, 4);
  assert.deepEqual(v.icerik, { haber: 1, resmi: 1, arastirma: 0, veri: 0, bulten: 1 });
});
