// Bölme öncesi ve sonrası calistir'in aynı enjekte bağımlılıklarla aynı yazıları ve aynı gorulen farkını ürettiğini sınayan
// senaryolar. Altın dosya (esitlik-altin.json) bölmeden önceki kodla üretildi; uyarlayici.test.mjs bugünkü kodu onunla karşılaştırır.
// Yalnız uydurma adlar: haber.example.com, K, A.
import { mkdtemp, mkdir, readdir } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const SIMDI = new Date('2026-10-12T07:00:00Z'); // İstanbul 10:00, açılış dilimi
const saatSonra = (h) => new Date(SIMDI.getTime() + h * 3600e3);
const aday = (id, baslik, onem, ek = {}) => ({
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

async function ortam(extra = {}) {
  const rot = await mkdtemp(path.join(os.tmpdir(), 'esit-'));
  await mkdir(path.join(rot, 'src/data'), { recursive: true });
  await mkdir(path.join(rot, 'src/content/haberler'), { recursive: true });
  const kayit = { motor: [], yaz: 0, kurul: 0, bulten: [] };
  const sec = {
    rot,
    simdi: SIMDI,
    geminiVar: true,
    okuyucu: null,
    karneler: async () => [],
    gemini: async () => ({ gruplar: [] }),
    log: () => {},
    ipucu: { hent: async () => [], onemArtir: (a) => a },
    yaz: async (a) => {
      kayit.yaz++;
      return { baslik: a.baslik, spot: 's', govde: 'g' };
    },
    yayinKurulu: async (t) => {
      kayit.kurul++;
      return { yazi: t };
    },
    derlemeYaz: async () => ({ baslik: 'Derleme gündemi', spot: 's', govde: 'g', rakamlar: [] }),
    bulten: {
      bultenGerekli: (n) => n >= 1,
      bultenYaz: async (ol, _p, { simdi: t }) => {
        kayit.bulten.push(...ol.map((o) => o.id));
        return { yazi: { baslik: `Bülten ${t.toISOString()}`, spot: 's', govde: 'g', kategori: 'piyasalar', tarih: t, tur: 'bulten', kaynaklar: [] }, anlik: { zaman: 'z', degerler: {} } };
      },
    },
    motor: async (k) => {
      kayit.motor.push(k);
    },
    piyasa: async () => ({ guncelleme: SIMDI.toISOString(), gostergeler: [] }),
    durum: { gorulen: {}, sonBulten: null, kaynaklar: { A: 'x' } },
    ...extra,
  };
  return { sec, kayit, rot };
}

const gorunum = async (calistir, s, rot, kayit) => {
  const r = await calistir(s);
  const d = s.durum;
  return {
    adet: r.adet,
    hatalar: r.hatalar,
    bultenYazildi: r.bultenYazildi,
    bultenGerekli: r.bultenGerekli,
    yazilar: r.yazilar,
    konfigHatasi: r.konfigHatasi,
    gorulen: Object.fromEntries(Object.entries(d.gorulen).sort(([a], [b]) => a.localeCompare(b))),
    havuz: (d.havuz ?? []).map((o) => o.id),
    dosyalar: (await readdir(path.join(rot, 'src/content/haberler'))).sort(),
    yayinlar: (d.yayinlar ?? []).map((y) => y.slug).sort(),
    motor: kayit.motor.map((k) => `${k.durum}|${k.slug ?? ''}|${k.gerekce ?? ''}`),
    yazCagri: kayit.yaz,
    kurulCagri: kayit.kurul,
    bultenOlaylari: [...kayit.bulten],
  };
};

const hata = (m, ek = {}) => Object.assign(new Error(m), ek);
const std = (x) => {
  if (x.baslik.includes('KIRMIZI')) return { karar: 'kirmizi', kirmizi: [{ kural: 'k1', ham: 'x' }], sari: [], gerekce: 'standart:k1' };
  if (x.baslik.includes('SARI')) return { karar: 'sari', kirmizi: [], sari: [{ kural: 's1', ham: 'x' }], gerekce: 'standart:s1' };
  if (x.baslik.includes('HATA')) throw new Error('süzgeç çöktü');
  return { karar: 'temiz', kirmizi: [], sari: [], gerekce: '' };
};

// Her dal bir başlıkla seçilir; başlıktaki anahtar sözcük yaz / yayinKurulu / standart davranışını belirler.
export async function senaryolar(calistir) {
  const sonuc = {};

  {
    const liste = [
      aday('n01', 'Normal haber bir', 90),
      aday('n02', 'GECICI hata haberi', 80),
      aday('n03', 'KOTA haberi', 75),
      aday('n04', 'BOZUK haberi', 70),
      aday('n05', 'DURDU haberi', 65),
      aday('n06', 'KISA haberi', 62),
      aday('n07', 'BEKLE haberi', 61),
      aday('n08', 'KIRMIZI haberi', 85),
      aday('n09', 'HATA haberi', 84),
      aday('n10', 'Eşik altı satır', 30),
      aday('n11', 'SARI haberi', 83),
      aday('n12', 'YOK taslak haberi', 82),
      aday('n13', 'Ücretli kaynak', 90, { ucretli: true }),
    ];
    const { sec, kayit, rot } = await ortam({
      kaynaklar: [{ ad: 'A', hent: async () => liste }],
      standart: std,
      yaz: async (a) => {
        kayit.yaz++;
        if (a.baslik.includes('GECICI')) throw hata('geçici sorun');
        if (a.baslik.includes('KOTA')) throw hata('günlük kota bitti', { kota: true });
        if (a.baslik.includes('BOZUK')) throw hata('bozuk yanıt', { bozuk: true });
        if (a.baslik.includes('YOK')) return null;
        return { baslik: a.baslik, spot: 's', govde: 'g' };
      },
      yayinKurulu: async (t, a) => {
        kayit.kurul++;
        if (a.baslik.includes('DURDU')) return { dur: 'yayın kurulu durdurdu' };
        if (a.baslik.includes('KISA')) return { dur: 'Metin kısa', kisa: true };
        if (a.baslik.includes('BEKLE')) return { dur: 'denetim çalışamadı', bekle: true };
        return { yazi: t };
      },
    });
    sonuc.karisik1 = await gorunum(calistir, sec, rot, kayit);
    sec.simdi = saatSonra(1);
    sonuc.karisik2 = await gorunum(calistir, sec, rot, kayit);
    sec.simdi = saatSonra(2); // öğle dilimi: havuz işlenir
    sonuc.karisik3 = await gorunum(calistir, sec, rot, kayit);
    sec.simdi = saatSonra(3);
    sonuc.karisik4 = await gorunum(calistir, sec, rot, kayit); // 3. deneme
  }

  {
    // Dilim derlemesi: üç kısa haber havuzda bekler, öğlede tek derleme olur.
    const kisa = [aday('d1', 'Copper prices climb', 80), aday('d2', 'Gold slips', 80, { kategori: 'doviz' }), aday('d3', 'Lira weakens', 80, { kategori: 'ekonomi' })];
    const { sec, kayit, rot } = await ortam({
      kaynaklar: [{ ad: 'A', hent: async () => kisa }],
      yayinKurulu: async (t, a) => (a.haberler ? { yazi: t } : { dur: 'Metin kısa', kisa: true }),
      bulten: { bultenGerekli: () => false, bultenYaz: async () => null },
    });
    sonuc.derleme1 = await gorunum(calistir, sec, rot, kayit);
    sec.kaynaklar = [{ ad: 'A', hent: async () => [] }];
    sec.simdi = saatSonra(2);
    sonuc.derleme2 = await gorunum(calistir, sec, rot, kayit);
  }

  {
    // Tek kısa haber bülten satırı olur; bir de kırmızı derleme maddesi yok. Bülten yazılırsa havuzdan çıkar.
    const { sec, kayit, rot } = await ortam({
      kaynaklar: [{ ad: 'A', hent: async () => [aday('e1', 'Tek kalan haber', 80)] }],
      yayinKurulu: async (t, a) => (a.haberler ? { yazi: t } : { dur: 'Metin kısa', kisa: true }),
    });
    sonuc.tek1 = await gorunum(calistir, sec, rot, kayit);
    sec.kaynaklar = [{ ad: 'A', hent: async () => [] }];
    sec.simdi = saatSonra(2);
    sonuc.tek2 = await gorunum(calistir, sec, rot, kayit);
  }

  {
    // Yapılandırma hatası: deneme sayılmaz, ilk haberden sonra durur.
    const { sec, kayit, rot } = await ortam({
      kaynaklar: [{ ad: 'A', hent: async () => [aday('k1', 'Birinci', 80), aday('k2', 'İkinci', 79), aday('k3', 'Eşik altı', 20)] }],
      yaz: async () => {
        throw hata('Gemini 403: anahtar', { konfig: true });
      },
    });
    sonuc.konfig = await gorunum(calistir, sec, rot, kayit);
  }

  {
    // Gruplama hatası: terfi ve bülten atlanır.
    const { sec, kayit, rot } = await ortam({
      kaynaklar: [{ ad: 'A', hent: async () => [aday('g1', 'Birinci', 80), aday('g2', 'Eşik altı', 30)] }],
      gemini: async () => null,
    });
    const uyari = console.warn;
    const hataLog = console.error;
    console.warn = () => {};
    console.error = () => {};
    try {
      sonuc.gruplamaHatasi = await gorunum(calistir, sec, rot, kayit);
    } finally {
      console.warn = uyari;
      console.error = hataLog;
    }
  }

  {
    // Bilinen olay (hafızadaki olayla eşleşen aday) ve kuru çalışma.
    const { sec, kayit, rot } = await ortam({
      kaynaklar: [{ ad: 'A', hent: async () => [aday('b1', 'Aynı olay bir', 80), aday('b2', 'Aynı olay iki', 78), aday('b3', 'Başka konu', 77)] }],
      gemini: async () => ({ gruplar: [[0, 1]], eslesen: [], puanlar: [{ aday: 0, onem: 80 }, { aday: 1, onem: 78 }, { aday: 2, onem: 77 }] }),
    });
    sonuc.grup = await gorunum(calistir, sec, rot, kayit);
    const k = await ortam({ kaynaklar: [{ ad: 'A', hent: async () => [aday('u1', 'Kuru aday', 80)] }], kuru: true });
    sonuc.kuru = await gorunum(calistir, k.sec, k.rot, k.kayit);
  }

  return JSON.parse(JSON.stringify(sonuc));
}
