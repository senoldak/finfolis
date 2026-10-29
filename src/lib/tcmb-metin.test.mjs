import test from 'node:test';
import assert from 'node:assert/strict';
import {
  konusmaListesi, konusmaAyristir, konusmaci, raporListesi, raporSayfasi, genelDegerlendirmeBolumu, erBaslik, firBaslik,
  raporParagraflari, sunumParagraflari, pdfKonusmaParagraflari, turkceMi,
} from './tcmb-metin.mjs';

const KON = '/wps/wcm/connect/TR/TCMB+TR/Main+Menu/Duyurular/Baskanin+Konusmalari';
const kutu = (govde, tarih) => `<div class="block-collection-box"><div class="collection-content w-clearfix">${govde}<div class="collection-tag">${tarih}</div></div></div>`;
const LISTE = `<html>${[
  kutu(
    `<a target="_blank" href="/wps/wcm/connect/aaa/KonusmaB13_08_2026.pdf?MOD=AJPERES&amp;CACHEID=X" title="Başkan Fatih Karahan&#39;ın &quot;Enflasyon Raporu 2026-III&quot;ün Tanıtımına İlişkin Bilgilendirme Toplantısında Yaptığı Konuşma (İstanbul)"><span class="collection-title pdf"></span></a>
     <a class="collection-title" href="${KON}/2026/KonusmaB13_08_2026" class="type-link" title="Başkan Fatih Karahan&#39;ın &quot;Enflasyon Raporu 2026-III&quot;ün Tanıtımına İlişkin Bilgilendirme Toplantısında Yaptığı Konuşma (İstanbul)">x</a>`,
    '13/08/2026',
  ),
  kutu(
    `<a target="_blank" href="/wps/wcm/connect/bbb/SunumB07_10_2026.pdf?MOD=AJPERES&amp;CACHEID=Y" title="Başkan Fatih Karahan&rsquo;ın &ldquo;Enflasyon ve Para Politikası&rdquo; Başlıklı Sunumu (İstanbul)" class="type-link">x</a>`,
    '07/10/2026',
  ),
  kutu(
    `<a target="_blank" href="/wps/wcm/connect/ccc/SunumB14_10_2026.pdf?MOD=AJPERES&amp;CACHEID=Z" title="Başkan Fatih Karahan&rsquo;ın Sunumu (İngilizce) (Bangkok)" class="type-link">x</a>`,
    '14/10/2026',
  ),
  kutu(`<a href="/baska/sayfa" title="Alakasız">x</a>`, '01/01/2026'),
].join('')}</html>`;

test('konuşma listesi: html+pdf tek kayıt, yalnız pdf sunum, dil ve ER bilgilendirme işareti', () => {
  const l = konusmaListesi(LISTE, 2026);
  assert.deepEqual(l.map((k) => k.id), ['konusma_B13_08_2026', 'sunum_B07_10_2026', 'sunum_B14_10_2026']);
  const [k, s, e] = l;
  assert.equal(k.tarih, '2026-08-13');
  assert.equal(k.altTur, 'konusma');
  assert.equal(k.erBilgilendirme, true);
  assert.equal(k.htmlUrl, `https://www.tcmb.gov.tr${KON}/2026/KonusmaB13_08_2026`);
  assert.match(k.pdfUrl, /^https:\/\/www\.tcmb\.gov\.tr\/wps\/wcm\/connect\/aaa\/KonusmaB13_08_2026\.pdf\?MOD=AJPERES&CACHEID=X$/);
  assert.match(k.baslik, /^Başkan Fatih Karahan'ın "Enflasyon Raporu 2026-III"ün/);
  assert.equal(s.altTur, 'sunum');
  assert.equal(s.htmlUrl, null);
  assert.equal(s.erBilgilendirme, false);
  assert.equal(s.dil, 'tr');
  assert.match(s.baslik, /“Enflasyon ve Para Politikası” Başlıklı Sunumu/);
  assert.equal(e.dil, 'en');
});

test('konuşma listesi: yıl uyuşmazlığı süzülür', () => {
  assert.equal(konusmaListesi(LISTE, 2025).length, 0);
});

test('konuşmacı adı başlıktan çıkar', () => {
  assert.equal(konusmaci("Başkan Fatih Karahan'ın TBMM Sunumu"), 'Fatih Karahan');
  assert.equal(konusmaci('Başkan Hafize Gaye Erkan’ın İSO Toplantısı'), 'Hafize Gaye Erkan');
  assert.equal(konusmaci('Merkez Bankası Duyurusu'), null);
});

const KONUSMA_HTML = `<html><nav>Menü</nav><div id="tcmbMainContent"><div class="tcmb-content type-prg">
<p dir="ltr">Kıymetli Basın Mensupları,</p>
<p dir="ltr">&nbsp;</p>
<p dir="ltr">Enflasyon&nbsp;beklentileri <strong>önem</strong>ini korumaktadır.</p>
<h3>Başlık</h3>
<ul><li>Madde bir.</li></ul>
</div><div><a target="_blank" href="/x.pdf">PDF</a></div><footer>Altbilgi</footer></html>`;

test('konuşma sayfası: yalnız gövde paragrafları, boşlar ve altbilgi yok', () => {
  assert.deepEqual(konusmaAyristir(KONUSMA_HTML), ['Kıymetli Basın Mensupları,', 'Enflasyon beklentileri önemini korumaktadır.', 'Başlık', 'Madde bir.']);
  assert.throws(() => konusmaAyristir('<html>yok</html>'), /bulunamadı/);
  assert.throws(() => konusmaAyristir('<div class="tcmb-content"><p>Tek</p></div>'), /beklenen/);
});

const ER_SAYFA = `<title>TCMB - Enflasyon Raporu 2026 - III (13 Ağustos 2026)</title><div id="tcmbMainContent">
<a target="_blank" href="/wps/wcm/connect/t/enf26_iii_tam.pdf?MOD=AJPERES&amp;CACHEID=T" class="pdf type-link">Tam Metin</a>
<h2 class="type-h2">Kapak ve İçindekiler</h2><div class="type-prg"></div>
<div class="block-rules"><a target="_blank" href="/wps/wcm/connect/k/ki26_iii.pdf?MOD=AJPERES&amp;CACHEID=K" class="pdf type-link">PDF Metni</a></div>
<h2 class="type-h2">1. Genel Değerlendirme</h2><div class="type-prg"></div>
<div class="block-rules"><a target="_blank" href="/wps/wcm/connect/g/1b26_iii.pdf?MOD=AJPERES&amp;CACHEID=G" class="pdf type-link">PDF Metni</a></div>
<h2 class="type-h2">Kutular</h2><div class="block-rules"><a href="/Kutular" class="url type-link">Kutular</a></div></div>`;

test('rapor sayfası: bölüm başlığı ile PDF eşlenir, genel değerlendirme bulunur', () => {
  const s = raporSayfasi(ER_SAYFA);
  assert.equal(s.baslik, 'Enflasyon Raporu 2026 - III (13 Ağustos 2026)');
  assert.deepEqual(s.bolumler.map((b) => b.ad), ['Kapak ve İçindekiler', '1. Genel Değerlendirme']);
  const g = genelDegerlendirmeBolumu(s.bolumler);
  assert.equal(g.pdfUrl, 'https://www.tcmb.gov.tr/wps/wcm/connect/g/1b26_iii.pdf?MOD=AJPERES&CACHEID=G');
  assert.equal(genelDegerlendirmeBolumu([{ ad: 'II. Küresel', pdfUrl: 'x' }]), null);
  assert.equal(genelDegerlendirmeBolumu([{ ad: 'I. Genel Değerlendirme', pdfUrl: 'y' }]).pdfUrl, 'y');
});

test('rapor başlıkları: ER dönem/tarih, FİR sayı/ay', () => {
  assert.deepEqual(erBaslik('Enflasyon Raporu 2026 - III (13 Ağustos 2026)'), { donem: '2026-III', tarih: '2026-08-13' });
  assert.deepEqual(firBaslik('Finansal İstikrar Raporu - Kasım 2025, Sayı 41'), { sayi: 41, tarih: '2025-11-01' });
  assert.deepEqual(firBaslik('başka'), { sayi: null, tarih: null });
});

test('rapor listesi: ER ve FİR bağlantıları başlıktan türetilir, gelecek rapor satırı yok sayılır', () => {
  const R = 'Yayinlar/Raporlar';
  const er = `<a href="/${R}/Enflasyon+Raporu/2026/Enflasyon+Raporu+2026+-+III/" title="Enflasyon Raporu 2026 - III (13 Ağustos 2026)">x</a>
    <a href="/${R}/Enflasyon+Raporu/2026" title="2026">x</a>Enflasyon Raporu 2026 - IV (12 Kasım 2026 tarihinde yayımlanacaktır)`;
  const l = raporListesi(er, 'er');
  assert.equal(l.length, 1);
  assert.equal(l[0].id, 'er_2026-III');
  assert.equal(l[0].url, `https://www.tcmb.gov.tr/${R}/Enflasyon+Raporu/2026/Enflasyon+Raporu+2026+-+III`);
  const fir = `<a href="/${R}/Finansal+Istikrar+Raporu/2025/Sayi+41" title="Finansal İstikrar Raporu - Kasım 2025, Sayı 41">x</a>`;
  assert.deepEqual(raporListesi(fir, 'fir').map((r) => [r.id, r.tarih, r.tarihKesinligi]), [['fir_41', '2025-11-01', 'ay']]);
});

const PDF_ER = [
  'Enflasyon Raporu 2026-III |Genel Değerlendirme 1\r',
  '1. Genel Değerlendirme\r',
  'Birinci paragraf burada biter.\r',
  'İkinci paragraf sayfa sonunda bölünür ve devam\r',
  '\f',
  'Enflasyon Raporu 2026-III |Genel Değerlendirme 2\r',
  'eder, sonra biter.\r',
  'Üçüncü paragraf.\r',
  '1.1 Para Politikası Kararları\r',
  'Bu paragraf alınmaz.\r',
].join('\n');

test('ER PDF: üstbilgi, ana başlık atılır, sayfa sonu birleşir, alt başlıkta kesilir', () => {
  assert.deepEqual(raporParagraflari(PDF_ER), ['Birinci paragraf burada biter.', 'İkinci paragraf sayfa sonunda bölünür ve devam eder, sonra biter.', 'Üçüncü paragraf.']);
});

test('FİR PDF: roman rakamlı başlık, tireli üstbilgi ve grafik/kaynak artıkları atılır', () => {
  const p = raporParagraflari('Finansal İstikrar Raporu – Mayıs 2026 | 1\nI. Genel Değerlendirme\nBirinci cümle burada.\nGrafik 1.1: Bir grafik (%)\n45\nKaynak: TCMB.\nİkinci cümle burada.');
  assert.deepEqual(p, ['Birinci cümle burada.', 'İkinci cümle burada.']);
});

test('sunum PDF: slayt başlığı ve metin satırları kalır, sayı/kaynak/eksen artığı gider', () => {
  const pdf = 'ENFLASYON VE PARA POLİTİKASI\nDr. Fatih Karahan Başkan\n\f' + 'Dezenflasyon verimliliği desteklemektedir.\nÇalışan Başına Üretim (Yıllık % Değişim)\n68,1\n44,8\nAra 24 Mar 25 Haz 25\nKaynak: TCMB, TÜİK.\n2\n\f' + 'Enflasyon beklentileri bozulmaktadır.\n';
  const s = sunumParagraflari(pdf);
  assert.equal(s.slaytSayisi, 3);
  assert.deepEqual(s.paragraflar, [
    'ENFLASYON VE PARA POLİTİKASI',
    'Dr. Fatih Karahan Başkan',
    'Dezenflasyon verimliliği desteklemektedir.',
    'Çalışan Başına Üretim (Yıllık % Değişim)',
    'Enflasyon beklentileri bozulmaktadır.',
  ]);
});

test('konuşma PDF: boş satır ve yalın sayfa numaraları atılır', () => {
  assert.deepEqual(pdfKonusmaParagraflari('Birinci.\r\n\r\n3\r\nİkinci.\f'), ['Birinci.', 'İkinci.']);
});

test('dil sezgisi: Türkçe ve İngilizce metin ayrılır', () => {
  assert.equal(turkceMi('Enflasyon ve politika faizi için bir değerlendirme yapılmıştır.'), true);
  assert.equal(turkceMi('Inflation and the policy rate remain the focus of the monetary policy in the economy.'), false);
});
