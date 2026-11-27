import { test } from 'node:test';
import assert from 'node:assert/strict';
import { KAYNAKLAR, cariOnIkiAy, sokEtkileri } from './stres-testi.mjs';

test('sokEtkileri: petrol %10 → 1 puan TÜFE, 10 $ → 2,6 milyar $ cari', () => {
  const r = sokEtkileri({ brentFiyati: 100, brentDegisimUsd: 10 });
  assert.equal(r.brentYuzde, 10);
  assert.equal(r.petrolTufe, 1);
  assert.equal(r.petrolCari, 2.6);
  const d = sokEtkileri({ brentFiyati: 80, brentDegisimUsd: -20 });
  assert.equal(d.petrolTufe, -2.5);
  assert.equal(d.petrolCari, -5.2);
});

test('sokEtkileri: asgari ücret ve kur aralıkları, toplam', () => {
  const r = sokEtkileri({ brentFiyati: 70, brentDegisimUsd: 0, asgariUcretArtisiYuzde: 30, kurDegerKaybiYuzde: 20 });
  assert.deepEqual(r.ucretTufe, [2.4, 3.6]);
  assert.equal(r.kurBirYil, 3);
  assert.deepEqual(r.kurUzun, [7.6, 8]);
  assert.deepEqual(r.birYilToplam, [5.4, 6.6]);
});

test('sokEtkileri: boş ya da geçersiz girdi sıfır döner', () => {
  const r = sokEtkileri({ brentFiyati: 0, brentDegisimUsd: 10, asgariUcretArtisiYuzde: -5, kurDegerKaybiYuzde: 'x' });
  assert.equal(r.petrolTufe, 0);
  assert.deepEqual(r.ucretTufe, [0, 0]);
  assert.equal(r.kurBirYil, 0);
});

test('cariOnIkiAy: milyon $ → milyar $, 12 aydan azsa null', () => {
  const s = Array.from({ length: 13 }, (_, i) => ({ yil: 2026, ay: i + 1, cari: -1000 }));
  assert.equal(cariOnIkiAy(s).toplam, -12);
  assert.equal(cariOnIkiAy(s.slice(0, 5)), null);
  assert.ok(Object.values(KAYNAKLAR).every((k) => k.url.startsWith('https://www.tcmb.gov.tr/')));
});
