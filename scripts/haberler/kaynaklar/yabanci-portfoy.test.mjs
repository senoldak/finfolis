import { test } from 'node:test';
import assert from 'node:assert/strict';
import { portfoyAdayi } from './yabanci-portfoy.mjs';

const satir = (tarih, hisse, dibs = 0) => ({ tarih, hisse, dibs, ost: -5, toplam: hisse + dibs - 5, hisseStok: 33981.07, dibsStok: 16791.83 });
const bolum = { satirlar: [satir('2025-12-26', 50), satir('2026-01-02', 100, 20), satir('2026-10-09', -248.2, 451.12), satir('2026-10-16', -88.75, -44.36)] };

test('perşembe 14:30 yayından sonraki iki gün içinde son hafta aday olur', () => {
  const a = portfoyAdayi(bolum, new Date('2026-10-22T12:00:00Z'));
  assert.equal(a.id, 'portfoy:2026-10-16');
  assert.equal(a.baslik, 'Yabancılar 16 Ekim haftasında 88,8 milyon dolarlık net hisse sattı');
  assert.equal(a.kategori, 'ekonomi');
  assert.match(a.kaynakMetni, /equities -88,8 million USD/);
  // Yılbaşından: 2026 haftaları (100 − 248,2 − 88,75), 2025'in son haftası sayılmaz.
  assert.match(a.kaynakMetni, /Since the start of 2026 \(3 weeks.*equities -236,9 million USD/);
  assert.match(a.kaynakMetni, /equities 34,0 billion USD/);
});

test('yayından önce ve iki günden sonra aday yok', () => {
  assert.equal(portfoyAdayi(bolum, new Date('2026-10-22T11:00:00Z')), null);
  assert.equal(portfoyAdayi(bolum, new Date('2026-10-24T12:00:00Z')), null);
  assert.equal(portfoyAdayi({ satirlar: [] }, new Date('2026-10-22T12:00:00Z')), null);
});
