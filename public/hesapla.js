// finfolis hesaplayıcıları (/hesapla/…). CSP satır içi betiğe izin vermediği için ayrı dosyadır.
// Her form data-hesap ile türünü söyler; sonuç aynı formdaki <output> alanlarına yazılır.
// Hesaplar tarayıcıda yapılır, hiçbir veri gönderilmez.
(function () {
  'use strict';

  var TL = new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  var YUZDE = new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  var AYLAR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

  // "1.250,5" / "1250.5" / "1250,5" -> 1250.5; boş ya da geçersizse NaN.
  function sayi(metin) {
    var s = String(metin == null ? '' : metin).replace(/\s|TL|%/gi, '');
    if (!s) return NaN;
    if (s.indexOf(',') >= 0) s = s.replace(/\./g, '').replace(',', '.');
    else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
    var n = Number(s);
    return isFinite(n) ? n : NaN;
  }

  function yaz(form, ad, metin) {
    var o = form.querySelector('[data-sonuc="' + ad + '"]');
    if (o) o.textContent = metin;
  }

  function hata(form, metin) {
    var h = form.querySelector('[data-hata]');
    var s = form.querySelector('[data-sonuclar]');
    if (h) {
      h.textContent = metin || '';
      h.hidden = !metin;
    }
    if (s) s.hidden = Boolean(metin);
  }

  function deger(form, ad) {
    var el = form.elements.namedItem(ad);
    return el ? sayi(el.value) : NaN;
  }

  // Enflasyon: TÜFE aylık değişimleri zincirlenir. Başlangıç ayının fiyatlarıyla tutar, bitiş ayının fiyatlarına taşınır.
  function enflasyon(form) {
    var tutar = deger(form, 'tutar');
    if (!(tutar > 0)) return hata(form, 'Geçerli bir tutar girin.');
    var veri = form.dataset.tufe ? JSON.parse(form.dataset.tufe) : null;
    var carpan;
    var aciklama;
    if (veri) {
      var bas = Number(form.elements.namedItem('baslangic').value);
      var bit = Number(form.elements.namedItem('bitis').value);
      if (!(bit > bas)) return hata(form, 'Bitiş ayı başlangıç ayından sonra olmalı.');
      carpan = 1;
      // veri: [[anahtar (yıl*12+ay-1), aylık %], …]; anahtarı başlangıçtan büyük ve bitişe kadar olan aylar.
      for (var i = 0; i < veri.length; i++) {
        if (veri[i][0] > bas && veri[i][0] <= bit) carpan *= 1 + veri[i][1] / 100;
      }
      aciklama = ayAdi(bas) + ' fiyatlarıyla ' + TL.format(tutar) + ' TL, ' + ayAdi(bit) + ' fiyatlarıyla';
    } else {
      var oran = deger(form, 'oran');
      var yil = deger(form, 'yil');
      if (!(oran > -100) || !(yil > 0)) return hata(form, 'Yıllık enflasyon oranını ve süreyi girin.');
      carpan = Math.pow(1 + oran / 100, yil);
      aciklama = 'Yıllık %' + YUZDE.format(oran) + ' enflasyonla ' + TL.format(tutar) + ' TL, ' + String(yil).replace('.', ',') + ' yıl sonra';
    }
    hata(form, '');
    yaz(form, 'aciklama', aciklama);
    yaz(form, 'karsilik', TL.format(tutar * carpan) + ' TL');
    yaz(form, 'artis', '%' + YUZDE.format((carpan - 1) * 100));
    yaz(form, 'alim', TL.format(tutar / carpan) + ' TL');
  }

  function ayAdi(anahtar) {
    return AYLAR[anahtar % 12] + ' ' + Math.floor(anahtar / 12);
  }

  // Mevduat: brüt faiz = anapara × yıllık oran × gün / 365; stopaj brüt faizden kesilir.
  function mevduat(form) {
    var anapara = deger(form, 'anapara');
    var faiz = deger(form, 'faiz');
    var gun = deger(form, 'gun');
    var stopaj = deger(form, 'stopaj');
    if (!(anapara > 0)) return hata(form, 'Geçerli bir anapara girin.');
    if (!(faiz >= 0)) return hata(form, 'Yıllık brüt faiz oranını girin.');
    if (!(gun >= 1)) return hata(form, 'Vadeyi gün olarak girin.');
    if (!(stopaj >= 0 && stopaj < 100)) return hata(form, 'Stopaj oranını girin (vergi yoksa 0).');
    hata(form, '');
    var brut = (anapara * (faiz / 100) * gun) / 365;
    var kesinti = brut * (stopaj / 100);
    var net = brut - kesinti;
    yaz(form, 'brut', TL.format(brut) + ' TL');
    yaz(form, 'stopaj', TL.format(kesinti) + ' TL');
    yaz(form, 'net', TL.format(net) + ' TL');
    yaz(form, 'toplam', TL.format(anapara + net) + ' TL');
    yaz(form, 'netOran', '%' + YUZDE.format(faiz * (1 - stopaj / 100)));
  }

  // Kredi: eşit taksitli (annüite). Vergiler faize eklenerek aylık maliyet oranı bulunur.
  function kredi(form) {
    var anapara = deger(form, 'anapara');
    var faiz = deger(form, 'faiz');
    var vade = deger(form, 'vade');
    var kkdf = deger(form, 'kkdf');
    var bsmv = deger(form, 'bsmv');
    if (!(anapara > 0)) return hata(form, 'Geçerli bir kredi tutarı girin.');
    if (!(faiz >= 0)) return hata(form, 'Aylık faiz oranını girin.');
    if (!(vade >= 1 && vade <= 600) || Math.round(vade) !== vade) return hata(form, 'Vadeyi ay olarak girin (1–600).');
    if (isNaN(kkdf)) kkdf = 0;
    if (isNaN(bsmv)) bsmv = 0;
    if (kkdf < 0 || bsmv < 0) return hata(form, 'Vergi oranları negatif olamaz.');
    hata(form, '');
    var vergi = 1 + kkdf / 100 + bsmv / 100;
    var r = (faiz / 100) * vergi;
    var taksit = r === 0 ? anapara / vade : (anapara * r * Math.pow(1 + r, vade)) / (Math.pow(1 + r, vade) - 1);
    var toplam = taksit * vade;
    yaz(form, 'taksit', TL.format(taksit) + ' TL');
    yaz(form, 'toplam', TL.format(toplam) + ' TL');
    yaz(form, 'maliyet', TL.format(toplam - anapara) + ' TL');

    // Ödeme planı: her taksitte faiz, vergiler ve anapara payı.
    var govde = form.querySelector('[data-plan]');
    if (!govde) return;
    while (govde.firstChild) govde.removeChild(govde.firstChild);
    var kalan = anapara;
    for (var ay = 1; ay <= vade; ay++) {
      var faizPayi = kalan * (faiz / 100);
      var vergiPayi = faizPayi * (vergi - 1);
      var anaparaPayi = taksit - faizPayi - vergiPayi;
      kalan = ay === vade ? 0 : Math.max(0, kalan - anaparaPayi);
      var tr = document.createElement('tr');
      [String(ay), TL.format(taksit), TL.format(anaparaPayi), TL.format(faizPayi), TL.format(vergiPayi), TL.format(kalan)].forEach(function (m, i) {
        var td = document.createElement('td');
        td.textContent = m;
        if (i > 0) td.className = 'sag';
        tr.appendChild(td);
      });
      govde.appendChild(tr);
    }
    var plan = form.querySelector('[data-plan-kutu]');
    if (plan) plan.hidden = false;
  }

  var HESAPLAR = { enflasyon: enflasyon, mevduat: mevduat, kredi: kredi };

  var formlar = document.querySelectorAll('form[data-hesap]');
  for (var i = 0; i < formlar.length; i++) {
    (function (form) {
      var f = HESAPLAR[form.dataset.hesap];
      if (!f) return;
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        f(form);
      });
      // Betik çalışıyorsa düğme görünür; zorunlu alanlar doluysa ilk sonuç varsayılan değerlerle hesaplanır.
      var dugme = form.querySelector('button[type="submit"]');
      if (dugme) dugme.hidden = false;
      if (form.checkValidity()) f(form);
    })(formlar[i]);
  }
})();
