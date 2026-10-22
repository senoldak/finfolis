// finfolis motor uyarlayıcısı: adayYuku/adayiKur, adaylar/isle sonuç eşlemesi, yerelTur ve bölme öncesiyle eşitlik.
// Gerçek yayın adları şifreli listede durur; testler uydurma adlarla (haber.example.com, K, A) çalışır. Gemini, ağ yok.
import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { adayYuku, adayiKur, gorulmeyen, uyarlayiciKur, yerelTur } from './uyarlayici.mjs';
import { calistir } from './hent-haberler.mjs';
import { motorKimlik } from './motor.mjs';
import { senaryolar } from './fixtures/esitlik-senaryo.mjs';

mock.method(console, 'log', () => {});
mock.method(console, 'warn', () => {});
mock.method(console, 'error', () => {});

const SIMDI = new Date('2026-10-12T07:00:00Z'); // İstanbul 10:00, açılış dilimi
const SAAT = 3600e3;
const aday = (id, baslik, onem = 80, ek = {}) => ({
  id,
  baslik,
  ozet: '',
  tarih: '2026-10-12T06:00:00Z',
  onem,
  kategori: 'piyasalar',
  kaynakMetni: `Uzun tam metin ${id} `.repeat(8),
  kaynaklar: [{ ad: 'K', url: `https://haber.example.com/${id}` }],
  ...ek,
});
const hata = (m, ek = {}) => Object.assign(new Error(m), ek);

async function kur({ liste = [], durum, bag = {}, ayar = {}, simdi = SIMDI } = {}) {
  const rot = await mkdtemp(path.join(os.tmpdir(), 'uyar-'));
  await mkdir(path.join(rot, 'src/content/haberler'), { recursive: true });
  const kayit = { motor: [], yaz: 0 };
  durum ??= { gorulen: {}, kaynaklar: { A: 'x' } };
  const kaynaklar = [{ ad: 'A', hent: async () => liste }];
  const u = uyarlayiciKur({
    durum,
    simdi,
    ayar: { geminiVar: true, baslangic: Date.now(), piyasa: { gostergeler: [] }, log: () => {}, ...ayar },
    bag: {
      kaynaklar,
      gemini: async () => ({ gruplar: [] }),
      yaz: async (a) => ({ baslik: a.baslik, spot: 's', govde: 'g' }),
      yayinKurulu: async (t) => ({ yazi: t }),
      derlemeYaz: async () => ({ baslik: 'Derleme gündemi', spot: 's', govde: 'g', rakamlar: [] }),
      bulten: { bultenGerekli: () => false, bultenYaz: async () => null },
      motorYaz: async (k) => {
        kayit.motor.push(k);
      },
      rot,
      ...bag,
    },
  });
  return { u, durum, rot, kayit, kaynaklar };
}

// adaylar() + isle(): yerelTur'dan farkı gorulmeyen süzgeci ve gorulen güvencesi olmaması.
async function turla(k, opt) {
  const hepsi = await k.u.adaylar();
  return k.u.isle(hepsi, opt);
}
const sonucu = (sonuclar, id) => sonuclar.find((s) => s.kimlik === motorKimlik(id));
const SLUG = /^[a-z0-9-]+$/;

test('adayYuku/adayiKur gidiş dönüş aynı adayı verir; yükte resmî olmayan kaynak adı ve gizliKaynaklar yok', () => {
  const kaynak = { ad: 'k1a2b3', hent: async () => [] };
  const a = aday('k1a2b3:x1', 'Orionlab yeni kuantum cipini tanıttı', 77, {
    _kaynak: 'k1a2b3',
    ozet: 'kısa özet',
    bolge: 'abd',
    kaynaklar: [],
    gizliKaynaklar: [{ ad: 'Gerçek Sitenin Adı', url: 'https://haber.example.com/x1' }],
  });
  const yuk = adayYuku(a);
  assert.equal(yuk.kaynak, 'k1a2b3');
  assert.equal(yuk.link, 'https://haber.example.com/x1');
  assert.ok(!JSON.stringify(yuk).includes('Gerçek Sitenin Adı'));
  assert.ok(!('gizliKaynaklar' in yuk));
  const geri = adayiKur(yuk, [kaynak]);
  for (const alan of ['id', 'baslik', 'ozet', 'tarih', 'onem', 'kategori', 'bolge', 'kaynakMetni']) assert.deepEqual(geri[alan], a[alan], alan);
  assert.equal(geri.ucretli, false);
  // Kapak ve şablon yazı yükte taşınmaz.
  assert.equal(geri.kapak, undefined);
  assert.equal(geri.sablonYazi, undefined);
});

test('adayiKur: resmî kaynak adı yükte kalır ve kaynaklar geri gelir; listede olmayan kaynak null', () => {
  const a = aday('Bank of England:u1', 'Faiz kararı', 90, { _kaynak: 'Bank of England' });
  const yuk = adayYuku(a);
  assert.deepEqual(yuk.kaynaklar, [{ ad: 'K', url: 'https://haber.example.com/Bank of England:u1' }]);
  const geri = adayiKur(yuk, [{ ad: 'Bank of England' }]);
  assert.deepEqual(geri.kaynaklar, yuk.kaynaklar);
  assert.deepEqual(geri.gizliKaynaklar, []);
  assert.equal(adayiKur(yuk, [{ ad: 'Başka Kaynak' }]), null);
});

test('adayYuku: kaynakMetni en çok 4000 karakter, yük JSON\'u 11000 bayttan küçük (çok baytlı en kötü durum)', () => {
  const uzun = 'ğüşıöç'.repeat(2000);
  const a = aday('Bank of England:u2', uzun, 50, {
    _kaynak: 'Bank of England',
    ozet: uzun,
    kaynakMetni: uzun,
    kaynaklar: Array.from({ length: 6 }, (_, i) => ({ ad: uzun, url: `https://haber.example.com/${uzun}${i}` })),
  });
  const yuk = adayYuku(a);
  assert.ok(yuk.kaynakMetni.length <= 4000);
  assert.equal(yuk.kaynaklar.length, 3);
  assert.ok(Buffer.byteLength(JSON.stringify(yuk)) < 11_000, `${Buffer.byteLength(JSON.stringify(yuk))} bayt`);
  assert.equal(adayYuku(aday('x', 'kısa', 50, { kaynakMetni: 'kısa metin' })).kaynakMetni, 'kısa metin');
});

test('adaylar(): bugünkü kaynak okuma + gorulen süzgeci; { kimlik: motorKimlik(id), yuk, baslik } döner', async () => {
  const durum = { gorulen: { a2: { zaman: 'z', yazildi: true }, a3: { zaman: 'z', deneme: 1 } }, kaynaklar: { A: 'x' } };
  const k = await kur({ liste: [aday('a1', 'Bir', 90), aday('a2', 'İki', 80), aday('a3', 'Üç', 70)], durum });
  const l = await k.u.adaylar();
  assert.deepEqual(l.map((a) => a.yuk.id), ['a1', 'a3']); // a2 görüldü; a3 yalnız deneme (kalıcı görüldü değil)
  assert.equal(l[0].kimlik, motorKimlik('a1'));
  assert.equal(l[0].baslik, 'Bir');
  assert.equal(l[0].yuk.kaynak, 'A');
  assert.deepEqual(gorulmeyen(l, durum).map((a) => a.yuk.id), ['a1', 'a3']);
});

test('isle: yazılan olayın her üyesi yazildi + slug, hiçbirinde yazi yok', async () => {
  const k = await kur({
    liste: [aday('a1', 'Aynı olay bir', 90), aday('a2', 'Aynı olay iki', 85), aday('a3', 'Başka konu', 80)],
    bag: { gemini: async () => ({ gruplar: [[0, 1]], eslesen: [], puanlar: [{ aday: 0, onem: 90 }, { aday: 1, onem: 85 }, { aday: 2, onem: 80 }] }) },
  });
  const s = await turla(k);
  assert.equal(sonucu(s, 'a1').durum, 'yazildi');
  assert.equal(sonucu(s, 'a1').slug, sonucu(s, 'a2').slug);
  assert.match(sonucu(s, 'a1').slug, SLUG);
  assert.notEqual(sonucu(s, 'a3').slug, sonucu(s, 'a1').slug);
  for (const x of s) assert.equal('yazi' in x, false);
  assert.equal(k.durum.gorulen.a1.yazildi, true);
  assert.equal(k.durum.gorulen.a2.yazildi, true);
});

test('isle: kırmızı standart elendi + gerekçe (adres yok), bozuk yanıt elendi', async () => {
  const kirmizi = { karar: 'kirmizi', kirmizi: [{ kural: 'k1', ham: 'x' }], sari: [], gerekce: 'standart:k1 https://haber.example.com/gizli' };
  const k = await kur({
    liste: [aday('a1', 'Kırmızı haber', 90), aday('a2', 'Bozuk haber', 80)],
    bag: {
      standart: () => kirmizi,
      yaz: async (a) => {
        if (a.baslik.startsWith('Bozuk')) throw hata('çıkış tavanı', { bozuk: true });
        return { baslik: a.baslik, spot: 's', govde: 'g' };
      },
    },
  });
  const s = await turla(k);
  assert.equal(sonucu(s, 'a1').durum, 'elendi');
  assert.match(sonucu(s, 'a1').gerekce, /standart:k1/);
  assert.ok(!sonucu(s, 'a1').gerekce.includes('https://'));
  assert.deepEqual(sonucu(s, 'a2'), { kimlik: motorKimlik('a2'), durum: 'elendi', gerekce: 'bozuk yanıt' });
  assert.equal(k.kayit.motor.length, 1); // kırmızı karar defterde
});

test('isle: yayın kurulu kısa dışı nedenle durdurursa elendi; denetim çalışamazsa (bekle) bekliyor + hata', async () => {
  const k = await kur({
    liste: [aday('a1', 'Durdu haberi', 90), aday('a2', 'Bekle haberi', 80)],
    bag: {
      yayinKurulu: async (t, o) => (o.baslik.startsWith('Durdu') ? { dur: 'rakam tutmuyor' } : { dur: 'denetim çalışamadı', bekle: true }),
    },
  });
  const s = await turla(k);
  assert.deepEqual(sonucu(s, 'a1'), { kimlik: motorKimlik('a1'), durum: 'elendi', gerekce: 'rakam tutmuyor' });
  const b = sonucu(s, 'a2');
  assert.equal(b.durum, 'bekliyor');
  assert.ok(b.hata instanceof Error);
  assert.match(b.hata.message, /denetim çalışamadı/);
  assert.equal(b.sayilmaz, undefined);
  assert.equal(k.durum.gorulen.a2, undefined); // görülmedi kalır
});

test('isle: standart süzgeci çalışamazsa bekliyor + hata, görülmedi kalır', async () => {
  const k = await kur({
    liste: [aday('a1', 'Süzgeç haberi', 90)],
    bag: {
      standart: () => {
        throw new Error('süzgeç çöktü');
      },
    },
  });
  const s = await turla(k);
  assert.equal(sonucu(s, 'a1').durum, 'bekliyor');
  assert.match(sonucu(s, 'a1').hata.message, /süzgeç çöktü/);
  assert.equal(k.durum.gorulen.a1, undefined);
});

test('isle: kota bekliyor + hata + sayilmaz, görülmedi kalır, deneme sayılmaz', async () => {
  const k = await kur({
    liste: [aday('a1', 'Kota haberi', 90)],
    bag: {
      yaz: async () => {
        throw hata('günlük kota bitti', { kota: true });
      },
    },
  });
  const s = await turla(k);
  const x = sonucu(s, 'a1');
  assert.equal(x.durum, 'bekliyor');
  assert.equal(x.sayilmaz, true);
  assert.ok(x.hata instanceof Error);
  assert.equal(k.durum.gorulen.a1, undefined);
});

test('isle: gerekçe ve hata iletilerinden adres silinir', async () => {
  const k = await kur({
    liste: [aday('a1', 'Adresli hata', 90)],
    bag: {
      yaz: async () => {
        throw new Error('istek https://haber.example.com/gizli/yol başarısız');
      },
    },
  });
  const s = await turla(k);
  assert.ok(!sonucu(s, 'a1').hata.message.includes('https://'));
  assert.match(sonucu(s, 'a1').hata.message, /\[adres\]/);
});

test('isle: üçüncü başarısız denemede elendi "üç denemede yazılamadı"; önceki denemelerde bekliyor + hata', async () => {
  const durum = { gorulen: {}, kaynaklar: { A: 'x' } };
  const bag = {
    yaz: async () => {
      throw new Error('gemini yok');
    },
  };
  for (const [tur, beklenen] of [[1, 'bekliyor'], [2, 'bekliyor'], [3, 'elendi']]) {
    const k = await kur({ liste: [aday('a1', 'Deneme haberi', 90)], durum, bag });
    const s = await turla(k);
    assert.equal(sonucu(s, 'a1').durum, beklenen, `${tur}. tur`);
    if (beklenen === 'elendi') assert.equal(sonucu(s, 'a1').gerekce, 'üç denemede yazılamadı');
    else assert.equal(durum.gorulen.a1.deneme, tur);
  }
  assert.ok(durum.gorulen.a1 && !durum.gorulen.a1.deneme);
});

test('isle: yazar çıktı vermezse de deneme sayılır', async () => {
  const k = await kur({ liste: [aday('a1', 'Boş taslak', 90)], bag: { yaz: async () => null } });
  const s = await turla(k);
  assert.equal(sonucu(s, 'a1').durum, 'bekliyor');
  assert.equal(k.durum.gorulen.a1.deneme, 1);
});

test('isle: bilinen olay (hafızadaki olayla eşleşen aday) elendi', async () => {
  const k = await kur({
    liste: [aday('a1', 'Brent oil jumps after OPEC output cut', 80)],
    durum: { gorulen: {}, kaynaklar: { A: 'x' }, olaylar: [{ id: 'h1', ozet: 'Brent OPEC output cut', zaman: SIMDI.toISOString() }] },
    bag: { gemini: async () => ({ gruplar: [[0]], eslesen: [{ aday: 0, hafiza: 'h1' }] }) },
  });
  const s = await turla(k);
  assert.equal(sonucu(s, 'a1').durum, 'elendi');
  assert.ok(sonucu(s, 'a1').gerekce);
  assert.ok(k.durum.gorulen.a1);
});

test('isle: son 72 saatte yayımlanmış olayın tekrarı elendi', async () => {
  const k = await kur({
    liste: [aday('a1', 'Brent oil jumps after OPEC output cut', 80)],
    durum: {
      gorulen: {},
      kaynaklar: { A: 'x' },
      yayinlar: [{ slug: 'brent-opec', baslik: 'Brent OPEC kesintisi sonrası yükseldi', zaman: SIMDI.toISOString(), kaynaklar: [{ baslik: 'Brent oil jumps after OPEC output cut', ozet: '' }] }],
    },
  });
  const s = await turla(k);
  const x = sonucu(s, 'a1');
  assert.equal(x.durum, 'elendi');
  assert.match(x.gerekce, /tekrar/);
  assert.ok(k.durum.gorulen.a1 && !k.durum.gorulen.a1.yazildi);
});

test('isle: gruplamanın kaçırdığı kopya (mukerrerBul) elendi, gorulen işaretlenir, bültene girmez', async () => {
  const bulten = [];
  const k = await kur({
    liste: [
      aday('c', 'UK economy grew 0.1% in August, beating expectations', 90),
      aday('g', 'Tech stock sell-off intensifies; UK growth beats forecasts in August – business live', 80, { kaynakMetni: 'Canlı yayın metni '.repeat(20) }),
    ],
    bag: { bulten: { bultenGerekli: () => true, bultenYaz: async (ol) => (bulten.push(...ol.map((o) => o.id)), null) } },
  });
  const s = await turla(k);
  assert.equal(sonucu(s, 'c').durum, 'yazildi');
  assert.equal(sonucu(s, 'g').durum, 'elendi');
  assert.match(sonucu(s, 'g').gerekce, /mükerrer/);
  assert.ok(k.durum.gorulen.g && !k.durum.gorulen.g.yazildi);
  assert.ok(!bulten.includes('g'));
});

test('isle: kısa kalan olay havuza alınır (bekliyor, havuzda); sonraki dilimde derlemeye girince yazildi', async () => {
  const kisa = { yayinKurulu: async (t, o) => (o.haberler ? { yazi: t } : { dur: 'Metin kısa', kisa: true }) };
  const durum = { gorulen: {}, kaynaklar: { A: 'x' } };
  const k1 = await kur({ liste: [aday('a1', 'Copper prices climb'), aday('a2', 'Gold slips', 80, { kategori: 'doviz' })], durum, bag: kisa });
  const s1 = await turla(k1);
  for (const id of ['a1', 'a2']) assert.deepEqual(sonucu(s1, id), { kimlik: motorKimlik(id), durum: 'bekliyor', gerekce: 'havuzda', havuzda: true });
  assert.deepEqual(durum.havuz.map((o) => o.id).sort(), ['a1', 'a2']);
  // Havuzdakiler tekrar gelse de (eski ya da taze) işlenmez, sonuç yok, havuz büyümez.
  const k2 = await kur({ liste: [], durum, bag: kisa });
  const yuk = (id) => ({ kimlik: motorKimlik(id), yuk: adayYuku({ ...aday(id, 'x'), _kaynak: 'A' }), baslik: 'x' });
  const s2 = await k2.u.isle([{ ...yuk('a1'), eski: true }, yuk('a2')]);
  assert.equal(sonucu(s2, 'a1'), undefined);
  assert.equal(sonucu(s2, 'a2'), undefined);
  assert.equal(durum.havuz.length, 2);
  // Öğle dilimi: iki kısa haber tek derleme olur, her üye yazildi + aynı slug.
  const k3 = await kur({ liste: [], durum, bag: kisa, simdi: new Date(SIMDI.getTime() + 2 * SAAT) });
  const s3 = await turla(k3);
  assert.equal(sonucu(s3, 'a1').durum, 'yazildi');
  assert.equal(sonucu(s3, 'a1').slug, sonucu(s3, 'a2').slug);
  assert.deepEqual(durum.havuz, []);
});

test('isle: havuzdan düşen olayın üyeleri elendi "kısa, eş bulunamadı"', async () => {
  const eski = new Date(SIMDI.getTime() - 30 * SAAT).toISOString(); // SON_SAAT (24) aşıldı
  const durum = {
    gorulen: { p1: { zaman: eski } },
    kaynaklar: { A: 'x' },
    havuz: [{ ...aday('p1', 'Eski kısa haber'), baslik: 'Eski kısa haber', havuzaGirdi: eski, adaylar: [aday('p1', 'Eski kısa haber')], kaynaklar: [] }],
  };
  const k = await kur({ liste: [], durum });
  const s = await turla(k);
  assert.deepEqual(sonucu(s, 'p1'), { kimlik: motorKimlik('p1'), durum: 'elendi', gerekce: 'kısa, eş bulunamadı' });
  assert.deepEqual(durum.havuz, []);
});

test('isle: bülten satırı olan üye yazildi + bülten slug\'ı; eşik altı ve bülten yazılmadıysa sonuç yok', async () => {
  const bultenli = (yaz) => ({
    bultenGerekli: () => true,
    bultenYaz: async (ol, _p, { simdi }) =>
      yaz && { yazi: { baslik: `Bülten ${simdi.toISOString()}`, spot: 's', govde: 'g', kategori: 'piyasalar', tarih: simdi, tur: 'bulten', kaynaklar: [] }, anlik: { zaman: 'z', degerler: {} } },
  });
  const liste = [aday('a1', 'Terfi eden haber', 90), aday('a2', 'Eşik altı haber', 30)];
  const yazilan = await kur({ liste, bag: { bulten: bultenli(true) } });
  const s = await turla(yazilan);
  assert.equal(yazilan.u.ozet.bultenYazildi, true);
  const bultenSlug = yazilan.u.ozet.yazilar.at(-1);
  assert.match(bultenSlug, /^bulten-/);
  assert.equal(sonucu(s, 'a2').durum, 'yazildi');
  assert.equal(sonucu(s, 'a2').slug, bultenSlug);
  assert.equal(sonucu(s, 'a1').durum, 'yazildi'); // kendi haberinin slug'ı kalır
  assert.notEqual(sonucu(s, 'a1').slug, bultenSlug);
  assert.ok(yazilan.durum.gorulen.a2);

  const yazilmayan = await kur({ liste, bag: { bulten: bultenli(false) } });
  const s2 = await turla(yazilmayan);
  assert.equal(sonucu(s2, 'a2'), undefined); // eşik altı, bültene girmedi: sonuç yok, görülmedi kalır
  assert.equal(yazilmayan.durum.gorulen.a2, undefined);
  assert.equal(sonucu(s2, 'a1').durum, 'yazildi');
});

test('isle: bültende kırmızı çıkan madde elendi', async () => {
  const k = await kur({
    liste: [aday('a1', 'Terfi eden haber', 90), aday('a2', 'Kırmızı satır', 30)],
    bag: {
      bulten: {
        bultenGerekli: () => true,
        bultenYaz: async (ol, _p, { izleyici }) => {
          izleyici.elenen = [{ olay: ol.find((o) => o.id === 'a2'), gerekce: 'standart:k9', ozet: { karar: 'kirmizi', kirmizi: [{ kural: 'k9', ham: 'x' }], sari: [] } }];
          return null;
        },
      },
    },
  });
  const s = await turla(k);
  assert.deepEqual(sonucu(s, 'a2'), { kimlik: motorKimlik('a2'), durum: 'elendi', gerekce: 'standart:k9' });
  assert.equal(k.durum.gorulen.a2.elendi, true);
});

test('isle: gruplama hatası sonuç vermez, gorulen boş, bülten çağrılmaz', async () => {
  let bulten = false;
  const k = await kur({
    liste: [aday('a1', 'Birinci', 90), aday('a2', 'İkinci', 30)],
    bag: { gemini: async () => null, bulten: { bultenGerekli: () => true, bultenYaz: async () => ((bulten = true), null) } },
  });
  const s = await turla(k);
  assert.deepEqual(s, []);
  assert.equal(k.u.ozet.gruplamaHatasi, true);
  assert.deepEqual(k.durum.gorulen, {});
  assert.equal(bulten, false);
  assert.ok(k.u.ozet.hatalar.some((h) => h.includes('olay gruplama başarısız')));
});

test('isle: süre dolduysa (surVar false) haber yazılmaz, sonuç yok, görülmedi kalır', async () => {
  const k = await kur({ liste: [aday('a1', 'Süre doldu', 90)] });
  const s = await turla(k, { surVar: () => false });
  assert.equal(sonucu(s, 'a1'), undefined);
  assert.equal(k.durum.gorulen.a1, undefined);
});

test('isle: eski aday gorulen\'de karar verilmişse gorulen\'deki karar; yazildi + slug varsa slug, yoksa elendi', async () => {
  const durum = {
    gorulen: {
      e1: { zaman: 'z', yazildi: true, slug: 'onceki-yazi' },
      e2: { zaman: 'z', yazildi: true },
      e3: { zaman: 'z', elendi: true, gerekce: 'kırmızı' },
      e4: { zaman: 'z', deneme: 1 },
    },
    kaynaklar: { A: 'x' },
  };
  const k = await kur({ liste: [], durum });
  const girdi = ['e1', 'e2', 'e3', 'e4'].map((id) => ({ kimlik: motorKimlik(id), yuk: adayYuku({ ...aday(id, `Eski ${id}`), _kaynak: 'A' }), baslik: id, eski: true }));
  const s = await k.u.isle(girdi);
  assert.deepEqual(sonucu(s, 'e1'), { kimlik: motorKimlik('e1'), durum: 'yazildi', slug: 'onceki-yazi' });
  assert.deepEqual(sonucu(s, 'e2'), { kimlik: motorKimlik('e2'), durum: 'elendi', gerekce: 'önceki turda karar verildi' });
  assert.deepEqual(sonucu(s, 'e3'), { kimlik: motorKimlik('e3'), durum: 'elendi', gerekce: 'önceki turda karar verildi' });
  assert.equal(sonucu(s, 'e4').durum, 'yazildi'); // deneme kalıcı karar değil: yeniden işlenir
});

test('isle: eski aday 5 günden eskiyse "bayat", kaynak listeden çıkmışsa "kaynak listeden çıkarıldı"', async () => {
  const k = await kur({ liste: [] });
  const eskiAday = (id, tarih, kaynak = 'A') => ({
    kimlik: motorKimlik(id),
    yuk: adayYuku({ ...aday(id, `Eski ${id}`, 80, { tarih }), _kaynak: kaynak }),
    baslik: id,
    eski: true,
  });
  const s = await k.u.isle([
    eskiAday('b1', new Date(SIMDI.getTime() - 6 * 24 * SAAT).toISOString()),
    eskiAday('b2', '2026-10-12T06:00:00Z', 'artik-yok'),
  ]);
  assert.equal(sonucu(s, 'b1').durum, 'elendi');
  assert.match(sonucu(s, 'b1').gerekce, /^bayat/);
  assert.deepEqual(sonucu(s, 'b2'), { kimlik: motorKimlik('b2'), durum: 'elendi', gerekce: 'kaynak listeden çıkarıldı' });
  assert.ok(k.durum.gorulen.b1 && k.durum.gorulen.b2);
});

test('isle: yükten kurulan (başka süreçten gelen) taze aday da yazılır; kapak başlıktan çizilir', async () => {
  const k = await kur({ liste: [] });
  const yuk = adayYuku({ ...aday('y1', 'Yükten gelen haber', 90), _kaynak: 'A' });
  const s = await k.u.isle([{ kimlik: motorKimlik('y1'), yuk, baslik: 'Yükten gelen haber' }]);
  assert.equal(sonucu(s, 'y1').durum, 'yazildi');
  const md = await readFile(path.join(k.rot, 'src/content/haberler', sonucu(s, 'y1').slug, 'index.md'), 'utf8');
  assert.match(md, /Yükten gelen haber/);
});

test('isle: yapılandırma hatası bu ana kadarki sonuçlarla fırlatılır, deneme sayılmaz', async () => {
  let cagri = 0;
  const k = await kur({
    liste: [aday('a1', 'Birinci', 90), aday('a2', 'İkinci', 85), aday('a3', 'Eşik altı', 20)],
    bag: {
      yaz: async () => {
        cagri++;
        throw hata('Gemini 403: anahtar', { konfig: true });
      },
    },
  });
  await assert.rejects(
    () => turla(k),
    (e) => {
      assert.equal(e.konfig, true);
      assert.ok(Array.isArray(e.sonuclar));
      return true;
    },
  );
  assert.equal(cagri, 1);
  assert.equal(k.u.ozet.konfigHatasi, true);
  assert.equal(k.durum.gorulen.a1, undefined);
  assert.equal(k.durum.gorulen.a2, undefined);
});

test('yerelTur: yalnız karar verilenleri gorulen\'e işaretler; bekleyenler işaretlenmez', async () => {
  const durum = { gorulen: {}, kaynaklar: { A: 'x' } };
  const k = await kur({
    liste: [aday('a1', 'Yazılacak', 90), aday('a2', 'Kota haberi', 85), aday('a3', 'Denetim bekler', 80)],
    durum,
    bag: {
      yaz: async (a) => {
        if (a.baslik.startsWith('Kota')) throw hata('kota', { kota: true });
        return { baslik: a.baslik, spot: 's', govde: 'g' };
      },
      yayinKurulu: async (t, o) => (o.baslik.startsWith('Denetim') ? { dur: 'denetim çalışamadı', bekle: true } : { yazi: t }),
    },
  });
  const { sonuclar, ayarHatasi } = await yerelTur(k.u, durum);
  assert.equal(ayarHatasi, null);
  assert.equal(sonucu(sonuclar, 'a1').durum, 'yazildi');
  assert.ok(durum.gorulen.a1);
  assert.equal(durum.gorulen.a2, undefined);
  assert.equal(durum.gorulen.a3, undefined);
  // Karar verilmiş aday ikinci turda süzgeçten geçmez.
  const k2 = await kur({ liste: [aday('a1', 'Yazılacak', 90)], durum });
  const { sonuclar: s2 } = await yerelTur(k2.u, durum);
  assert.deepEqual(s2, []);
});

test('yerelTur: yapılandırma hatasını ayarHatasi olarak döner, o ana kadarki sonuçlar elde kalır', async () => {
  const durum = { gorulen: {}, kaynaklar: { A: 'x' } };
  const k = await kur({
    liste: [aday('a1', 'Kırmızı', 90), aday('a2', 'Konfig', 80)],
    durum,
    bag: {
      standart: (x) => (x.baslik === 'Kırmızı' ? { karar: 'kirmizi', kirmizi: [{ kural: 'k', ham: '' }], sari: [], gerekce: 'standart:k' } : { karar: 'temiz', kirmizi: [], sari: [], gerekce: '' }),
      yaz: async (a) => {
        if (a.baslik === 'Konfig') throw hata('Gemini 403', { konfig: true });
        return { baslik: a.baslik, spot: 's', govde: 'g' };
      },
    },
  });
  const { sonuclar, ayarHatasi } = await yerelTur(k.u, durum);
  assert.ok(ayarHatasi?.konfig);
  assert.equal(sonucu(sonuclar, 'a1').durum, 'elendi');
  assert.ok(durum.gorulen.a1);
});

test('eşitlik: calistir bölmeden önceki kodun ürettiği yazıları, gorulen farkını ve sayaçları aynen üretir', async () => {
  const altin = JSON.parse(await readFile(new URL('./fixtures/esitlik-altin.json', import.meta.url), 'utf8'));
  const simdi = await senaryolar(calistir);
  assert.deepEqual(Object.keys(simdi), Object.keys(altin));
  for (const ad of Object.keys(altin)) assert.deepEqual(simdi[ad], altin[ad], ad);
});
