// finfolis — TÜFE'den Arındırılmış BİST 30 İnteraktif Grafik Motoru
// Kâğıt & Mürekkep Kimliği · CSP 'self' Uyumlu (style-src 'self' & script-src 'self') · Sıfır Harici Bağımlılık

(function () {
  function baslat() {
    const dataScript = document.getElementById('reelBistVeriJson');
    if (!dataScript || !dataScript.textContent) return;

    let veri;
    try {
      veri = JSON.parse(dataScript.textContent);
    } catch (e) {
      return;
    }

    const { noktalar, donemler, zirve, dip } = veri;
    if (!noktalar || noktalar.length === 0) return;

    const kapsayici = document.getElementById('reelGrafikKapsayici');
    const svg = document.getElementById('reelSvg');
    const etkilesim = document.getElementById('etkilesimYuzeyi');
    const izgaraGrubu = document.getElementById('izgaraGrubu');
    const xEtiketGrubu = document.getElementById('xEtiketGrubu');
    const reelYol = document.getElementById('reelYol');
    const nominalYol = document.getElementById('nominalYol');
    const bazCizgisi = document.getElementById('bazCizgisi');
    const bazCizgisiMetin = document.getElementById('bazCizgisiMetin');
    const ekstremGrubu = document.getElementById('ekstremGrubu');
    const imlecGrubu = document.getElementById('imlecGrubu');
    const imlecCizgi = document.getElementById('imlecCizgi');
    const imlecReelNokta = document.getElementById('imlecReelNokta');
    const imlecNominalNokta = document.getElementById('imlecNominalNokta');
    const canliTooltip = document.getElementById('canliTooltip');
    const btnRejimSifirla = document.getElementById('btnRejimSifirla');

    const lejantNominal = document.getElementById('lejantNominal');
    const lejantReelDeger = document.getElementById('lejantReelDeger');
    const lejantNominalDeger = document.getElementById('lejantNominalDeger');
    const simDeger = document.getElementById('simDeger');
    const simNot = document.getElementById('simNot');

    const ttTarih = document.getElementById('ttTarih');
    const ttReel = document.getElementById('ttReel');
    const ttNominal = document.getElementById('ttNominal');
    const ttTufe = document.getElementById('ttTufe');
    const ttSim = document.getElementById('ttSim');

    if (!kapsayici || !svg || !etkilesim || !reelYol) return;

    const AYLAR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
    const W = 880;
    const H = 430;
    const PAD = { top: 25, right: 35, bottom: 45, left: 50 };
    const plotW = W - PAD.left - PAD.right;
    const plotH = H - PAD.top - PAD.bottom;

    // Nominal 100 bazlı seriyi hesapla
    const bazBist = noktalar[0].bistKapanis;
    const zenginNoktalar = noktalar.map((p) => ({
      ...p,
      nominalEndeks: (p.bistKapanis / bazBist) * 100,
    }));

    // Durum Değişkenleri
    let aktifAralik = 'tum'; // '12', '36', '60', 'tum'
    let aktifMod = 'reel'; // 'reel', 'kiyas'
    let aktifRejim = null; // null veya rejim id
    let gorunenNoktalar = [...zenginNoktalar];

    function filtrele() {
      if (aktifRejim) {
        const d = donemler.find((r) => r.id === aktifRejim);
        if (d) {
          gorunenNoktalar = zenginNoktalar.filter((p) => p.tarih >= d.sinirlar[0] && p.tarih <= d.sinirlar[1]);
        }
      } else if (aktifAralik === 'tum') {
        gorunenNoktalar = [...zenginNoktalar];
      } else {
        const aySayisi = parseInt(aktifAralik, 10);
        gorunenNoktalar = zenginNoktalar.slice(-aySayisi);
      }
      if (gorunenNoktalar.length < 2) gorunenNoktalar = [...zenginNoktalar];
      ciz();
    }

    function ciz() {
      const len = gorunenNoktalar.length;

      // Y ölçeği hesaplama
      let minVal, maxVal;
      if (aktifMod === 'kiyas') {
        const tumDegerler = gorunenNoktalar.flatMap((p) => [p.reelEndeks, p.nominalEndeks]);
        minVal = Math.min(...tumDegerler);
        maxVal = Math.max(...tumDegerler);
      } else {
        const reelDegerler = gorunenNoktalar.map((p) => p.reelEndeks);
        minVal = Math.min(...reelDegerler);
        maxVal = Math.max(...reelDegerler);
      }

      const marjin = (maxVal - minVal) * 0.12 || 10;
      const yMin = Math.max(0, Math.floor((minVal - marjin) / 10) * 10);
      const yMax = Math.ceil((maxVal + marjin) / 10) * 10;
      const yRange = yMax - yMin || 1;

      const xPos = (i) => PAD.left + (i / (len - 1)) * plotW;
      const yPos = (v) => PAD.top + (1 - (v - yMin) / yRange) * plotH;

      // 1. Izgara ve Y Eksen Çizgileri
      izgaraGrubu.innerHTML = '';
      const adimSayisi = 5;
      const adim = Math.max(10, Math.round((yMax - yMin) / adimSayisi / 10) * 10);
      for (let v = yMin; v <= yMax; v += adim) {
        const y = yPos(v);
        if (y < PAD.top || y > H - PAD.bottom) continue;

        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', PAD.left);
        line.setAttribute('y1', y);
        line.setAttribute('x2', W - PAD.right);
        line.setAttribute('y2', y);
        line.setAttribute('class', 'svg-kilavuz-cizgi');
        izgaraGrubu.appendChild(line);

        const txt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        txt.setAttribute('x', PAD.left - 8);
        txt.setAttribute('y', y + 4);
        txt.setAttribute('text-anchor', 'end');
        txt.setAttribute('class', 'svg-eksen-yazi');
        txt.textContent = v;
        izgaraGrubu.appendChild(txt);
      }

      // 100 Baz Çizgisi
      if (100 >= yMin && 100 <= yMax) {
        const y100 = yPos(100);
        bazCizgisi.setAttribute('display', 'inline');
        bazCizgisi.setAttribute('y1', y100);
        bazCizgisi.setAttribute('y2', y100);
        bazCizgisiMetin.setAttribute('display', 'inline');
        bazCizgisiMetin.setAttribute('y', y100 - 6);
      } else {
        bazCizgisi.setAttribute('display', 'none');
        bazCizgisiMetin.setAttribute('display', 'none');
      }

      // 2. X Eksen Etiketleri
      xEtiketGrubu.innerHTML = '';
      const adimX = Math.max(1, Math.floor(len / 6));
      for (let i = 0; i < len; i += adimX) {
        const p = gorunenNoktalar[i];
        const x = xPos(i);

        const tick = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        tick.setAttribute('x1', x);
        tick.setAttribute('y1', H - PAD.bottom);
        tick.setAttribute('x2', x);
        tick.setAttribute('y2', H - PAD.bottom + 5);
        tick.setAttribute('class', 'svg-kilavuz-cizgi');
        xEtiketGrubu.appendChild(tick);

        const txt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        txt.setAttribute('x', x);
        txt.setAttribute('y', H - PAD.bottom + 18);
        txt.setAttribute('text-anchor', 'middle');
        txt.setAttribute('class', 'svg-eksen-yazi');
        txt.textContent = `${AYLAR[p.ay - 1].slice(0, 3)} ${String(p.yil).slice(2)}`;
        xEtiketGrubu.appendChild(txt);
      }

      // 3. Eğrileri Çiz
      const reelD = gorunenNoktalar
        .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xPos(i).toFixed(1)} ${yPos(p.reelEndeks).toFixed(1)}`)
        .join(' ');
      reelYol.setAttribute('d', reelD);

      if (aktifMod === 'kiyas') {
        const nomD = gorunenNoktalar
          .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xPos(i).toFixed(1)} ${yPos(p.nominalEndeks).toFixed(1)}`)
          .join(' ');
        nominalYol.setAttribute('d', nomD);
        nominalYol.setAttribute('display', 'inline');
        if (lejantNominal) lejantNominal.classList.remove('gizli');
        if (imlecNominalNokta) imlecNominalNokta.setAttribute('display', 'inline');
      } else {
        nominalYol.setAttribute('display', 'none');
        if (lejantNominal) lejantNominal.classList.add('gizli');
        if (imlecNominalNokta) imlecNominalNokta.setAttribute('display', 'none');
      }

      // 4. Ekstrem Pinleri
      ekstremGrubu.innerHTML = '';
      if (!aktifRejim && gorunenNoktalar.length > 20) {
        const zP = gorunenNoktalar.find((p) => p.tarih === zirve?.tarih);
        if (zP) {
          const zI = gorunenNoktalar.indexOf(zP);
          ekstremNoktaEkle(xPos(zI), yPos(zP.reelEndeks), `Zirve: ${zP.reelEndeks}`, 'ust');
        }
        const dP = gorunenNoktalar.find((p) => p.tarih === dip?.tarih);
        if (dP) {
          const dI = gorunenNoktalar.indexOf(dP);
          ekstremNoktaEkle(xPos(dI), yPos(dP.reelEndeks), `Dip: ${dP.reelEndeks}`, 'alt');
        }
      }

      // Son noktanın değerlerini güncelle
      const sonP = gorunenNoktalar.at(-1);
      if (sonP) {
        if (lejantReelDeger) lejantReelDeger.textContent = `${sonP.reelEndeks.toFixed(1)} puan`;
        if (lejantNominalDeger) lejantNominalDeger.textContent = `${sonP.nominalEndeks.toFixed(0)} puan (₺${sonP.bistKapanis.toLocaleString('tr-TR')})`;
        guncelleSimulasyon(sonP);
      }
    }

    function ekstremNoktaEkle(x, y, metin, yon) {
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      c.setAttribute('cx', x);
      c.setAttribute('cy', y);
      c.setAttribute('r', '3.5');
      c.setAttribute('class', 'svg-pin-daire');
      g.appendChild(c);

      const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      t.setAttribute('x', x);
      t.setAttribute('y', yon === 'ust' ? y - 10 : y + 16);
      t.setAttribute('text-anchor', 'middle');
      t.setAttribute('class', 'svg-pin-yazi');
      t.textContent = metin;
      g.appendChild(t);

      ekstremGrubu.appendChild(g);
    }

    function guncelleSimulasyon(p) {
      const guncelAlimGucu = Math.round(10000 * (p.reelEndeks / 100));
      if (simDeger) simDeger.textContent = `₺${guncelAlimGucu.toLocaleString('tr-TR')}`;
      if (simNot) simNot.textContent = `(${AYLAR[p.ay - 1]} ${p.yil} noktasında 10.000 TL'nin alım gücü)`;
    }

    function etkilesimGuncelle(clientX, clientY) {
      const rect = etkilesim.getBoundingClientRect();
      const relX = clientX - rect.left;
      if (relX < 0 || relX > rect.width) {
        gizle();
        return;
      }

      const len = gorunenNoktalar.length;
      const oran = relX / rect.width;
      const idx = Math.max(0, Math.min(len - 1, Math.round(oran * (len - 1))));
      const p = gorunenNoktalar[idx];
      if (!p) return;

      const x = PAD.left + (idx / (len - 1)) * plotW;

      let minVal, maxVal;
      if (aktifMod === 'kiyas') {
        const tum = gorunenNoktalar.flatMap((pt) => [pt.reelEndeks, pt.nominalEndeks]);
        minVal = Math.min(...tum);
        maxVal = Math.max(...tum);
      } else {
        const reelD = gorunenNoktalar.map((pt) => pt.reelEndeks);
        minVal = Math.min(...reelD);
        maxVal = Math.max(...reelD);
      }
      const marjin = (maxVal - minVal) * 0.12 || 10;
      const yMin = Math.max(0, Math.floor((minVal - marjin) / 10) * 10);
      const yMax = Math.ceil((maxVal + marjin) / 10) * 10;
      const yRange = yMax - yMin || 1;
      const yReel = PAD.top + (1 - (p.reelEndeks - yMin) / yRange) * plotH;
      const yNom = PAD.top + (1 - (p.nominalEndeks - yMin) / yRange) * plotH;

      imlecGrubu.setAttribute('display', 'inline');
      imlecCizgi.setAttribute('x1', x);
      imlecCizgi.setAttribute('x2', x);
      imlecReelNokta.setAttribute('cx', x);
      imlecReelNokta.setAttribute('cy', yReel);

      if (aktifMod === 'kiyas') {
        imlecNominalNokta.setAttribute('cx', x);
        imlecNominalNokta.setAttribute('cy', yNom);
      }

      // SVG Tooltip İçeriği
      if (ttTarih) ttTarih.textContent = `${AYLAR[p.ay - 1]} ${p.yil}`;
      if (ttReel) ttReel.textContent = `${p.reelEndeks.toFixed(1)} puan`;
      if (ttNominal) ttNominal.textContent = `₺${p.bistKapanis.toLocaleString('tr-TR')}`;
      if (ttTufe) ttTufe.textContent = `${p.tufeCarpani.toFixed(2)} kat`;

      const simTl = Math.round(10000 * (p.reelEndeks / 100));
      if (ttSim) ttSim.textContent = `₺${simTl.toLocaleString('tr-TR')}`;

      // Tooltip Konumu (SVG koordinatları içinde)
      const ttW = 186;
      let ttX = x + 12;
      if (ttX + ttW > W - PAD.right) {
        ttX = x - ttW - 12;
      }
      const ttY = Math.max(PAD.top, Math.min(H - PAD.bottom - 100, yReel - 35));
      canliTooltip.setAttribute('transform', `translate(${ttX}, ${ttY})`);
      canliTooltip.setAttribute('display', 'inline');

      if (lejantReelDeger) lejantReelDeger.textContent = `${p.reelEndeks.toFixed(1)} puan`;
      if (lejantNominalDeger) lejantNominalDeger.textContent = `${p.nominalEndeks.toFixed(0)} puan (₺${p.bistKapanis.toLocaleString('tr-TR')})`;
      guncelleSimulasyon(p);
    }

    function gizle() {
      imlecGrubu.setAttribute('display', 'none');
      canliTooltip.setAttribute('display', 'none');
      const sonP = gorunenNoktalar.at(-1);
      if (sonP) {
        if (lejantReelDeger) lejantReelDeger.textContent = `${sonP.reelEndeks.toFixed(1)} puan`;
        if (lejantNominalDeger) lejantNominalDeger.textContent = `${sonP.nominalEndeks.toFixed(0)} puan (₺${sonP.bistKapanis.toLocaleString('tr-TR')})`;
        guncelleSimulasyon(sonP);
      }
    }

    etkilesim.addEventListener('mousemove', (e) => etkilesimGuncelle(e.clientX, e.clientY));
    etkilesim.addEventListener('mouseleave', gizle);

    etkilesim.addEventListener('touchstart', (e) => {
      if (e.touches && e.touches[0]) {
        etkilesimGuncelle(e.touches[0].clientX, e.touches[0].clientY);
      }
    }, { passive: true });

    etkilesim.addEventListener('touchmove', (e) => {
      if (e.touches && e.touches[0]) {
        etkilesimGuncelle(e.touches[0].clientX, e.touches[0].clientY);
      }
    }, { passive: true });

    etkilesim.addEventListener('touchend', () => {
      setTimeout(gizle, 2500);
    });

    // Zaman Aralığı Butonları
    kapsayici.querySelectorAll('[data-aralik]').forEach((btn) => {
      btn.addEventListener('click', () => {
        kapsayici.querySelectorAll('[data-aralik]').forEach((b) => b.classList.remove('aktif'));
        btn.classList.add('aktif');
        aktifAralik = btn.getAttribute('data-aralik');
        aktifRejim = null;
        if (btnRejimSifirla) btnRejimSifirla.classList.add('gizli');
        kapsayici.querySelectorAll('.rejim-karti-btn').forEach((b) => b.classList.remove('secili'));
        filtrele();
      });
    });

    // Gösterim Modu Butonları (Reel vs Kıyas)
    kapsayici.querySelectorAll('[data-mod]').forEach((btn) => {
      btn.addEventListener('click', () => {
        kapsayici.querySelectorAll('[data-mod]').forEach((b) => b.classList.remove('aktif'));
        btn.classList.add('aktif');
        aktifMod = btn.getAttribute('data-mod');
        ciz();
      });
    });

    // Rejim Kartları Tıklama Etkileşimi
    kapsayici.querySelectorAll('.rejim-karti-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-rejim-id');
        if (aktifRejim === id) {
          aktifRejim = null;
          btn.classList.remove('secili');
          if (btnRejimSifirla) btnRejimSifirla.classList.add('gizli');
        } else {
          kapsayici.querySelectorAll('.rejim-karti-btn').forEach((b) => b.classList.remove('secili'));
          btn.classList.add('secili');
          aktifRejim = id;
          if (btnRejimSifirla) btnRejimSifirla.classList.remove('gizli');
        }
        filtrele();
      });
    });

    if (btnRejimSifirla) {
      btnRejimSifirla.addEventListener('click', () => {
        aktifRejim = null;
        btnRejimSifirla.classList.add('gizli');
        kapsayici.querySelectorAll('.rejim-karti-btn').forEach((b) => b.classList.remove('secili'));
        filtrele();
      });
    }

    filtrele();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', baslat);
  } else {
    baslat();
  }
})();
