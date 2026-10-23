// finfolis — Piyasa Faizleri İnteraktif Grafik Motoru
// Kâğıt & Mürekkep Kimliği · CSP 'self' Uyumlu · Sıfır Harici Bağımlılık
(function () {
  function baslat() {
    const dataScript = document.getElementById('faizVeriJson');
    if (!dataScript || !dataScript.textContent) return;

    let tumSatirlar;
    try {
      tumSatirlar = JSON.parse(dataScript.textContent);
    } catch (e) {
      return;
    }

    const kart = document.getElementById('faizInteraktifKart');
    const svg = document.getElementById('faizSvg');
    const izgaraGrubu = document.getElementById('izgaraGrubu');
    const xEtiketGrubu = document.getElementById('xEtiketGrubu');
    const egrilerGrubu = document.getElementById('egrilerGrubu');
    const imlecGrubu = document.getElementById('imlecGrubu');
    const imlecCizgi = document.getElementById('imlecCizgi');
    const imlecNoktalar = document.getElementById('imlecNoktalar');
    const etkilesim = document.getElementById('etkilesimYuzeyi');
    const tooltip = document.getElementById('canliTooltip');
    const ttTarih = document.getElementById('ttTarih');
    const ttModEtiket = document.getElementById('ttModEtiket');
    const ttListesi = document.getElementById('ttListesi');
    const ttMakas = document.getElementById('ttMakas');

    if (!kart || !svg || !izgaraGrubu || !egrilerGrubu || !etkilesim) return;

    const SERILER = [
      { id: 'ihtiyac', ad: 'İhtiyaç kredisi', renk: '#1b1b1b', kalinlik: 2.75 },
      { id: 'mevduat', ad: '1-3 ay mevduat', renk: '#5d5b55', kalinlik: 2 },
      { id: 'politika', ad: 'TCMB politika faizi', renk: '#c2502b', kalinlik: 2, basamak: true },
      { id: 'tasit', ad: 'Taşıt kredisi', renk: '#2d6a4f', kalinlik: 2 },
      { id: 'konut', ad: 'Konut kredisi', renk: '#d96b27', kalinlik: 2 },
      { id: 'tahvil5Y', ad: '5 yıllık tahvil', renk: '#635380', kalinlik: 1.75 },
    ];

    // Durum Değişkenleri
    let aktifMod = 'aylik'; // 'aylik' | 'yillik'
    let aktifAralik = 'tum'; // 13 | 26 | 'tum'
    const gorunenSeriler = new Set(SERILER.map((s) => s.id));
    let odakSeri = null;

    // Boyutlar (viewBox 0 0 880 460)
    const W = 880;
    const H = 460;
    const PAD = { top: 24, right: 24, bottom: 50, left: 52 };
    const plotW = W - PAD.left - PAD.right;
    const plotH = H - PAD.top - PAD.bottom;

    function getFiltreliVeri() {
      if (aktifAralik === 'tum') return tumSatirlar;
      return tumSatirlar.slice(-aktifAralik);
    }

    function cizGrafik() {
      const noktalar = getFiltreliVeri();
      if (!noktalar || noktalar.length === 0) return;

      const n = noktalar.length;

      // Min ve Max hesapla
      let minVal = Infinity;
      let maxVal = -Infinity;

      for (let i = 0; i < n; i++) {
        const pt = noktalar[i];
        for (let j = 0; j < SERILER.length; j++) {
          const seri = SERILER[j];
          if (!gorunenSeriler.has(seri.id)) continue;
          const raw = pt[seri.id];
          if (typeof raw === 'number' && Number.isFinite(raw)) {
            const v = aktifMod === 'aylik' ? raw / 12 : raw;
            if (v < minVal) minVal = v;
            if (v > maxVal) maxVal = v;
          }
        }
      }

      if (!Number.isFinite(minVal) || !Number.isFinite(maxVal)) {
        minVal = aktifMod === 'aylik' ? 2.0 : 24;
        maxVal = aktifMod === 'aylik' ? 4.5 : 54;
      }

      // Eksen payları
      const pay = (maxVal - minVal) * 0.08 || 0.4;
      const yMin = Math.max(0, minVal - pay);
      const yMax = maxVal + pay;
      const yRange = yMax - yMin;

      const xCoord = (idx) => PAD.left + (idx / Math.max(n - 1, 1)) * plotW;
      const yCoord = (val) => PAD.top + (1 - (val - yMin) / yRange) * plotH;

      // 1. Grid ve Y Eksen Çizgileri
      let izgaraHtml = '';
      const basamakSayisi = 5;
      for (let i = 0; i <= basamakSayisi; i++) {
        const v = yMin + (i / basamakSayisi) * yRange;
        const y = yCoord(v);
        const yazi = aktifMod === 'aylik' ? `%${v.toFixed(2)}` : `%${v.toFixed(1)}`;
        izgaraHtml += `
          <line x1="${PAD.left}" y1="${y.toFixed(1)}" x2="${W - PAD.right}" y2="${y.toFixed(1)}" stroke="#e4e1d7" stroke-width="1" stroke-dasharray="3 3" />
          <text x="${PAD.left - 8}" y="${(y + 4).toFixed(1)}" text-anchor="end" class="eksen-metin">${yazi}</text>
        `;
      }
      izgaraGrubu.innerHTML = izgaraHtml;

      // 2. X Eksen Tarih Etiketleri
      let xHtml = '';
      const adim = Math.max(1, Math.floor(n / 6));
      for (let i = 0; i < n; i++) {
        if (i === 0 || i % adim === 0 || i === n - 1) {
          const pt = noktalar[i];
          const x = xCoord(i);
          const gun = pt.tarih.slice(8, 10);
          const ay = pt.tarih.slice(5, 7);
          const yil = pt.tarih.slice(2, 4);
          xHtml += `
            <text x="${x.toFixed(1)}" y="${H - PAD.bottom + 20}" text-anchor="middle" class="eksen-metin">${gun}.${ay}.${yil}</text>
          `;
        }
      }
      xEtiketGrubu.innerHTML = xHtml;

      // 3. Seri Çizgileri
      let cizgilerHtml = '';
      for (let sIdx = 0; sIdx < SERILER.length; sIdx++) {
        const seri = SERILER[sIdx];
        if (!gorunenSeriler.has(seri.id)) continue;

        let d = '';
        for (let i = 0; i < n; i++) {
          const raw = noktalar[i][seri.id];
          if (typeof raw !== 'number' || !Number.isFinite(raw)) continue;
          const val = aktifMod === 'aylik' ? raw / 12 : raw;
          const x = xCoord(i);
          const y = yCoord(val);

          if (!d) {
            d = `M ${x.toFixed(1)} ${y.toFixed(1)}`;
          } else {
            if (seri.basamak) {
              const oncekiRaw = noktalar[i - 1][seri.id];
              const oncekiVal = aktifMod === 'aylik' ? oncekiRaw / 12 : oncekiRaw;
              const oncekiY = yCoord(oncekiVal);
              d += ` H ${x.toFixed(1)} V ${y.toFixed(1)}`;
            } else {
              d += ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
            }
          }
        }

        const isOdak = odakSeri === null || odakSeri === seri.id;
        const opacity = isOdak ? '1' : '0.15';
        const kalinlik = isOdak && odakSeri === seri.id ? seri.kalinlik + 1.25 : seri.kalinlik;

        cizgilerHtml += `
          <path
            d="${d}"
            fill="none"
            stroke="${seri.renk}"
            stroke-width="${kalinlik}"
            stroke-linecap="round"
            stroke-linejoin="round"
            opacity="${opacity}"
            style="transition: opacity 0.2s ease, stroke-width 0.2s ease;"
          />
        `;
      }
      egrilerGrubu.innerHTML = cizgilerHtml;
    }

    function guncelleLejantRakamlari(nokta) {
      document.querySelectorAll('.lejant-dugme').forEach((btn) => {
        const id = btn.dataset.seriId;
        if (!id) return;
        const raw = nokta[id];
        if (typeof raw !== 'number') return;
        const elAylik = btn.querySelector('[data-deger-turu="aylik"]');
        const elYillik = btn.querySelector('[data-deger-turu="yillik"]');
        if (elAylik) elAylik.textContent = `%${(raw / 12).toFixed(2)}`;
        if (elYillik) elYillik.textContent = `%${raw.toFixed(2)}`;
      });
    }

    function guncelleImlec(clientX) {
      const noktalar = getFiltreliVeri();
      if (!noktalar || noktalar.length === 0) return;

      const rect = etkilesim.getBoundingClientRect();
      const mouseX = clientX - rect.left;
      if (mouseX < 0 || mouseX > rect.width) {
        gizleImlec();
        return;
      }

      const n = noktalar.length;
      const oran = Math.max(0, Math.min(1, mouseX / rect.width));
      const idx = Math.min(Math.max(0, Math.round(oran * (n - 1))), n - 1);
      const pt = noktalar[idx];
      if (!pt) return;

      const x = PAD.left + (idx / Math.max(n - 1, 1)) * plotW;
      imlecCizgi.setAttribute('x1', x.toFixed(1));
      imlecCizgi.setAttribute('x2', x.toFixed(1));

      // Min/Max hesapla
      let minVal = Infinity;
      let maxVal = -Infinity;
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < SERILER.length; j++) {
          const s = SERILER[j];
          if (!gorunenSeriler.has(s.id)) continue;
          const raw = noktalar[i][s.id];
          if (typeof raw === 'number') {
            const v = aktifMod === 'aylik' ? raw / 12 : raw;
            if (v < minVal) minVal = v;
            if (v > maxVal) maxVal = v;
          }
        }
      }
      const pay = (maxVal - minVal) * 0.08 || 0.4;
      const yMin = Math.max(0, minVal - pay);
      const yMax = maxVal + pay;
      const yRange = yMax - yMin;
      const yCoord = (val) => PAD.top + (1 - (val - yMin) / yRange) * plotH;

      let noktalarSvg = '';
      let ttHtml = '';
      for (let j = 0; j < SERILER.length; j++) {
        const seri = SERILER[j];
        if (!gorunenSeriler.has(seri.id)) continue;
        const raw = pt[seri.id];
        if (typeof raw !== 'number') continue;
        const val = aktifMod === 'aylik' ? raw / 12 : raw;
        const y = yCoord(val);

        noktalarSvg += `
          <circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4.5" fill="${seri.renk}" stroke="#ffffff" stroke-width="2" />
        `;

        const degerStr = aktifMod === 'aylik' ? `%${(raw / 12).toFixed(2)}` : `%${raw.toFixed(2)}`;
        const ikincilStr = aktifMod === 'aylik' ? `yıllık %${raw.toFixed(1)}` : `aylık %${(raw / 12).toFixed(2)}`;

        ttHtml += `
          <div class="tt-satir ${odakSeri === seri.id ? 'odakli' : ''}">
            <span class="tt-nokta" style="background:${seri.renk};"></span>
            <span class="tt-ad">${seri.ad}</span>
            <span class="tt-deger">${degerStr} <small>(${ikincilStr})</small></span>
          </div>
        `;
      }
      imlecNoktalar.innerHTML = noktalarSvg;
      imlecGrubu.style.display = 'block';

      const gun = pt.tarih.slice(8, 10);
      const ay = pt.tarih.slice(5, 7);
      const yil = pt.tarih.slice(0, 4);
      ttTarih.textContent = `${gun}.${ay}.${yil}`;
      ttModEtiket.textContent = aktifMod === 'aylik' ? 'Aylık basit' : 'Yıllık basit';
      ttListesi.innerHTML = ttHtml;

      if (pt.ihtiyac && pt.mevduat) {
        const makasAylik = (pt.ihtiyac - pt.mevduat) / 12;
        ttMakas.innerHTML = `<span>Kredi - Mevduat Farkı:</span> <strong>+${makasAylik.toFixed(2)} puan</strong> (aylık)`;
      } else {
        ttMakas.innerHTML = '';
      }

      const screenX = (x / W) * rect.width;
      tooltip.style.display = 'block';
      if (screenX > rect.width * 0.6) {
        tooltip.style.left = `${screenX - 220}px`;
      } else {
        tooltip.style.left = `${screenX + 16}px`;
      }
      tooltip.style.top = '30px';

      guncelleLejantRakamlari(pt);
    }

    function gizleImlec() {
      imlecGrubu.style.display = 'none';
      tooltip.style.display = 'none';
      const son = tumSatirlar.at(-1);
      if (son) guncelleLejantRakamlari(son);
    }

    // Dinleyiciler
    etkilesim.addEventListener('mousemove', (e) => guncelleImlec(e.clientX));
    etkilesim.addEventListener('mouseleave', gizleImlec);

    etkilesim.addEventListener('touchmove', (e) => {
      if (e.touches && e.touches[0]) {
        guncelleImlec(e.touches[0].clientX);
      }
    }, { passive: true });
    etkilesim.addEventListener('touchend', gizleImlec);

    // Mod Düğmeleri (Aylık / Yıllık)
    document.querySelectorAll('[data-mod]').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('[data-mod]').forEach((b) => b.classList.remove('aktif'));
        btn.classList.add('aktif');
        aktifMod = btn.dataset.mod;

        document.querySelectorAll('[data-deger-turu]').forEach((el) => {
          el.style.display = el.dataset.degerTuru === aktifMod ? 'inline' : 'none';
        });

        cizGrafik();
      });
    });

    // Zaman Aralığı Düğmeleri
    document.querySelectorAll('[data-aralik]').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('[data-aralik]').forEach((b) => b.classList.remove('aktif'));
        btn.classList.add('aktif');
        const val = btn.dataset.aralik;
        aktifAralik = val === 'tum' ? 'tum' : Number(val);
        cizGrafik();
      });
    });

    // Lejant Tıklama & Hover Spotlight
    document.querySelectorAll('.lejant-dugme').forEach((btn) => {
      const seriId = btn.dataset.seriId;
      if (!seriId) return;

      btn.addEventListener('click', () => {
        if (gorunenSeriler.has(seriId)) {
          if (gorunenSeriler.size > 1) {
            gorunenSeriler.delete(seriId);
            btn.classList.remove('aktif');
          }
        } else {
          gorunenSeriler.add(seriId);
          btn.classList.add('aktif');
        }
        cizGrafik();
      });

      btn.addEventListener('mouseenter', () => {
        odakSeri = seriId;
        cizGrafik();
      });

      btn.addEventListener('mouseleave', () => {
        odakSeri = null;
        cizGrafik();
      });
    });

    // İlk Çizim
    cizGrafik();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', baslat);
  } else {
    baslat();
  }
})();
