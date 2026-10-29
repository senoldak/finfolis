import test from 'node:test';
import assert from 'node:assert/strict';
import { itoBirlestir, itoJson } from './tahmin-veri.mjs';

test('İTO: var olan aylar korunur, eksikler doğru seriden eklenir', () => {
  const eski = [{ yil: 2025, ay: 1, aylik: 5.72 }];
  const evds = [
    { yil: 2024, ay: 1, 'TP_FG_B01_95-1': 6.1, 'TP_FG_IST1_23-1': null },
    { yil: 2024, ay: 2, 'TP_FG_B01_95-1': 4.0, 'TP_FG_IST1_23-1': 4.51234 },
    ...Array.from({ length: 10 }, (_, i) => ({ yil: 2024, ay: i + 3, 'TP_FG_B01_95-1': 1, 'TP_FG_IST1_23-1': 2 })),
    { yil: 2025, ay: 1, 'TP_FG_B01_95-1': 9, 'TP_FG_IST1_23-1': 5.738 },
  ];
  const s = itoBirlestir(eski, evds);
  assert.equal(s[0].aylik, 6.1);
  assert.equal(s[1].aylik, 4.51);
  assert.equal(s.at(-1).aylik, 5.72);
});

test('İTO: ortada boşluk varsa hata', () => {
  assert.throws(() =>
    itoBirlestir([], [
      { yil: 2020, ay: 1, 'TP_FG_B01_95-1': 1 },
      { yil: 2020, ay: 3, 'TP_FG_B01_95-1': 1 },
    ]),
  );
});

test('İTO dosyası satır başına bir ay yazılır', () => {
  const j = itoJson({ kaynak: { ad: 'x' }, satirlar: [{ yil: 2025, ay: 1, aylik: 1.5 }] });
  assert.match(j, /\n {4}\{ "yil": 2025, "ay": 1, "aylik": 1\.5 \}\n/);
  assert.deepEqual(JSON.parse(j).satirlar, [{ yil: 2025, ay: 1, aylik: 1.5 }]);
});
