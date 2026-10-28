import test from 'node:test';
import assert from 'node:assert/strict';
import {
  trTarihCoz,
  ppkTablosuAyristir,
  tcmbKaydiniOlayYap,
  tuikKaydiniOlayYap,
  birlestir,
  pencereyeKirp,
  bugunIstanbul,
  haftaBasi,
  gunAdi,
  araliktakiOlaylar,
  sonGunlerdeAciklananlar,
  haftalaraGrupla,
} from './veri-takvimi.mjs';

const ppkHtml = `<table id="midTable"><thead><tr><td><h3>Karar</h3></td></tr></thead><tbody>
<tr><td>22 Ocak 2026</td><td>29 Ocak 2026</td><td>12 Şubat 2026</td><td>&nbsp;</td></tr>
<tr><td style="x">12 Mart 2026</td><td>18 Mart 2026</td><td>&nbsp;</td><td>22 Mayıs 2026</td></tr>
</tbody></table>`;

test('trTarihCoz Türkçe ay adlarını çözer', () => {
  assert.equal(trTarihCoz('22 Ocak 2026'), '2026-01-22');
  assert.equal(trTarihCoz(' 3 Ağustos 2027 '), '2027-08-03');
  assert.equal(trTarihCoz('31 Şubat 2026'), null);
  assert.equal(trTarihCoz('&nbsp;'), null);
  assert.equal(trTarihCoz('Mayıs 2026'), null);
});

test('ppkTablosuAyristir boş hücreleri atlar, sütun başlıklarını verir', () => {
  const o = ppkTablosuAyristir(ppkHtml, 'https://tcmb.example/takvim');
  assert.equal(o.length, 6);
  assert.deepEqual(o[0], { tarih: '2026-01-22', saat: null, kurum: 'TCMB', baslik: 'PPK toplantı kararı', donem: null, url: 'https://tcmb.example/takvim', kaynak: 'tcmb-takvim' });
  assert.equal(o[2].baslik, 'Enflasyon Raporu');
  assert.equal(o.at(-1).baslik, 'Finansal İstikrar Raporu');
  assert.deepEqual(ppkTablosuAyristir('<p>yok</p>'), []);
});

test('tcmbKaydiniOlayYap saati duvar saati olarak okur ve bağlantıyı https yapar', () => {
  const o = tcmbKaydiniOlayYap({
    tarih: '2026-11-13T10:00:00.000Z',
    period: 'Aylık',
    donem: 'Kasım 2026',
    yayinBilgi: { yayimAdi: 'Piyasa Katılımcıları Anketi' },
    veriLink: { link: 'http://www.tcmb.gov.tr/x' },
  });
  assert.equal(o.tarih, '2026-11-13');
  assert.equal(o.saat, '10:00');
  assert.equal(o.url, 'https://www.tcmb.gov.tr/x');
  assert.equal(o.haftalik, undefined);
  const h = tcmbKaydiniOlayYap({ tarih: '2026-10-01T14:30:00.000Z', period: 'Haftalık', donem: '39. Hafta 2026', yayinBilgi: { yayimAdi: 'Menkul Kıymet İstatistikleri' } });
  assert.equal(h.haftalik, true);
  assert.equal(h.url, null);
  assert.equal(tcmbKaydiniOlayYap({ tarih: 'bozuk', yayinBilgi: { yayimAdi: 'x' } }), null);
});

test('tuikKaydiniOlayYap yalnız TÜİK kayıtlarını alır', () => {
  const k = { SorumluKisaAd: 'TÜİK', GTarih: '2026-11-03T10:00:00', Donemi: 'Ekim 2026', Adi: 'Tüketici Fiyat Endeksi (TÜFE)', Link: 'https://data.example/bulten' };
  const o = tuikKaydiniOlayYap(k);
  assert.deepEqual(o, { tarih: '2026-11-03', saat: '10:00', kurum: 'TÜİK', baslik: 'Tüketici Fiyat Endeksi (TÜFE)', donem: 'Ekim 2026', url: 'https://data.example/bulten', kaynak: 'tuik' });
  assert.equal(tuikKaydiniOlayYap({ ...k, SorumluKisaAd: 'BDDK' }), null);
});

test('birlestir: kaynağın kapsadığı aralık yenilenir, dışı ve diğer kaynaklar korunur', () => {
  const e = (kaynak, tarih, baslik) => ({ tarih, saat: null, kurum: 'TCMB', baslik, donem: null, url: null, kaynak });
  const eski = [e('a', '2026-10-01', 'eski-dışarıda'), e('a', '2026-11-05', 'eski-içeride'), e('b', '2026-11-05', 'başka-kaynak')];
  const yeni = [e('a', '2026-11-06', 'yeni')];
  const s = birlestir(eski, yeni, 'a', { bas: '2026-11-01', bit: '2026-11-30' });
  assert.deepEqual(s.map((x) => x.baslik), ['eski-dışarıda', 'başka-kaynak', 'yeni']);
});

test('pencereyeKirp', () => {
  const o = ['2026-09-01', '2026-10-10', '2027-03-01', '2026-12-01'].map((tarih) => ({ tarih }));
  assert.deepEqual(pencereyeKirp(o, '2026-10-28').map((x) => x.tarih), ['2026-10-10', '2026-12-01']);
});

test('bugunIstanbul gece yarısından sonra İstanbul gününü verir', () => {
  assert.equal(bugunIstanbul(new Date('2026-10-28T21:30:00Z')), '2026-10-29');
  assert.equal(bugunIstanbul(new Date('2026-10-28T20:59:00Z')), '2026-10-28');
});

test('hafta ve gün adı', () => {
  assert.equal(gunAdi('2026-10-28'), 'Çarşamba');
  assert.equal(haftaBasi('2026-10-28'), '2026-10-26');
  assert.equal(haftaBasi('2026-11-01'), '2026-10-26'); // Pazar
  assert.equal(haftaBasi('2026-11-02'), '2026-11-02');
});

const ev = (tarih, baslik, ekstra = {}) => ({ tarih, saat: null, kurum: 'TÜİK', baslik, donem: null, url: null, kaynak: 'tuik', ...ekstra });
const ornek = [
  ev('2026-10-27', 'dün'),
  ev('2026-10-20', 'sekiz gün önce'),
  ev('2026-10-28', 'bugün', { saat: '10:00' }),
  ev('2026-10-29', 'haftalık', { haftalik: true, kurum: 'TCMB' }),
  ev('2026-11-03', 'gelecek hafta'),
  ev('2026-12-23', 'son gün'),
  ev('2026-12-24', 'dışında'),
];

test('araliktakiOlaylar uçları dahil eder, kurum ve haftalık süzer', () => {
  assert.deepEqual(araliktakiOlaylar(ornek, '2026-10-28', '2026-11-03').map((x) => x.baslik), ['bugün', 'haftalık', 'gelecek hafta']);
  assert.deepEqual(araliktakiOlaylar(ornek, '2026-10-28', '2026-11-03', { kurum: 'TCMB' }).map((x) => x.baslik), ['haftalık']);
  assert.deepEqual(araliktakiOlaylar(ornek, '2026-10-28', '2026-11-03', { haftalikDahil: false }).map((x) => x.baslik), ['bugün', 'gelecek hafta']);
});

test('sonGunlerdeAciklananlar bugünü saymaz, yeniden eskiye sıralar', () => {
  assert.deepEqual(sonGunlerdeAciklananlar(ornek, '2026-10-28', 7).map((x) => x.baslik), ['dün']);
  assert.deepEqual(sonGunlerdeAciklananlar(ornek, '2026-10-28', 8).map((x) => x.baslik), ['dün', 'sekiz gün önce']);
});

test('haftalaraGrupla Pazartesi başlangıçlı 8 hafta verir, boş haftaları korur', () => {
  const h = haftalaraGrupla(ornek, '2026-10-28', 8);
  assert.equal(h[0].bas, '2026-10-26');
  assert.deepEqual(h[0].gunler.map((g) => g.tarih), ['2026-10-28', '2026-10-29']);
  assert.equal(h[1].bas, '2026-11-02');
  assert.deepEqual(h[1].gunler.map((g) => g.olaylar[0].baslik), ['gelecek hafta']);
  assert.equal(h[2].gunler.length, 0);
  // 28 Ekim + 56 gün: son gün 22 Aralık; 23 Aralık dışarıda
  assert.equal(h.at(-1).bas, '2026-12-21');
  const hepsi = h.flatMap((x) => x.gunler.flatMap((g) => g.olaylar)).map((o) => o.baslik);
  assert.ok(!hepsi.includes('son gün'));
  assert.ok(!hepsi.includes('dün'));
});
