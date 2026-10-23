// finfolis — Aylık Reel Getiri & Enflasyon Kıyası İnteraktif Grafik Motoru
// Kâğıt & Mürekkep Kimliği · CSP 'self' Uyumlu · Sıfır Harici Bağımlılık
(function () {
  function baslat() {
    const dataEl = document.getElementById('reelVeriJson');
    if (!dataEl || !dataEl.textContent) return;

    let tumNoktalar = [];
    try {
      tumNoktalar = JSON.parse(dataEl.textContent);
    } catch (e) {
      console.error('Reel getiri verisi okunamadı:', e);
      return;
    }

    if (!Array.isArray(tumNoktalar) || tumNoktalar.length === 0) return;

    const kapsayici = document.getElementById('reel-getiri-kapsayici');
    const yuzey = document.getElementById('etkilesim-yuzeyi');
    const takipGrubu = document.getElementById('takip-grubu');
    const takipCizgi = document.getElementById('takip-cizgi');
    const takipTcmb = document.getElementById('takip-nokta-tcmb');
    const takipIto = document.getElementById('takip-nokta-ito');
    const takipTufe = document.getElementById('takip-nokta-tufe');
    const svgTooltip = document.getElementById('svg-tooltip-grubu');

    const ttTarih = document.getElementById('tt-tarih');
    const ttTcmb = document.getElementById('tt-tcmb');
    const ttIto = document.getElementById('tt-ito');
    const ttTufe = document.getElementById('tt-tufe');
    const ttDurum = document.getElementById('tt-durum');

    const simAyAdi = document.getElementById('sim-ay-adi');
    const simFaizTl = document.getElementById('sim-faiz-tl');
    const simEnfTl = document.getElementById('sim-enflasyon-tl');
    const simNetTl = document.getElementById('sim-net-tl');
    const simNetKutu = document.getElementById('sim-net-kutu');

    const pathTcmb = document.getElementById('seri-tcmb-path');
    const pathIto = document.getElementById('seri-ito-path');
    const pathTufe = document.getElementById('seri-tufe-path');
    const xEksenGrubu = document.getElementById('x-eksen-grubu');

    const sonValTcmb = document.getElementById('son-val-tcmb');
    const sonValIto = document.getElementById('son-val-ito');
    const sonValTufe = document.getElementById('son-val-tufe');

    if (!kapsayici || !yuzey) return;

    const W = 880;
    const H = 380;
    const PAD_L = 50;
    const PAD_R = 75;
    const PAD_T = 30;
    const PAD_B = 45;
    const minVal = 0;
    const maxVal = 6;

    const plotW = W - PAD_L - PAD_R;
    const plotH = H - PAD_T - PAD_B;
    const valRange = maxVal - minVal;

    let aktifNoktalar = [...tumNoktalar];
    let gorunurluk = { tcmb: true, ito: true, tufe: true };

    const hesaplaX = (i, len) => PAD_L + (i / Math.max(len - 1, 1)) * plotW;
    const hesaplaY = (v) => PAD_T + (1 - (v - minVal) / valRange) * plotH;

    function ciz(noktalarDizisi) {
      aktifNoktalar = noktalarDizisi;
      const len = aktifNoktalar.length;

      // TCMB path
      if (pathTcmb) {
        const tcmbD = aktifNoktalar
          .map((p, i) => `${i === 0 ? 'M' : 'L'} ${hesaplaX(i, len).toFixed(1)} ${hesaplaY(p.tcmbFaiz).toFixed(1)}`)
          .join(' ');
        pathTcmb.setAttribute('d', tcmbD);
      }

      // İTO path
      if (pathIto) {
        const itoD = aktifNoktalar
          .filter((p) => p.ito != null)
          .map((p) => {
            const idx = aktifNoktalar.indexOf(p);
            return `${idx === 0 ? 'M' : 'L'} ${hesaplaX(idx, len).toFixed(1)} ${hesaplaY(p.ito).toFixed(1)}`;
          })
          .join(' ');
        pathIto.setAttribute('d', itoD);
      }

      // TÜFE path
      if (pathTufe) {
        const tufeD = aktifNoktalar
          .map((p, i) => `${i === 0 ? 'M' : 'L'} ${hesaplaX(i, len).toFixed(1)} ${hesaplaY(p.tufe).toFixed(1)}`)
          .join(' ');
        pathTufe.setAttribute('d', tufeD);
      }

      // X ekseni etiketleri
      if (xEksenGrubu) {
        xEksenGrubu.innerHTML = '';
        aktifNoktalar.forEach((p, i) => {
          // Çok sıkışmaması için duruma göre etiketle
          const adim = len <= 6 ? 1 : 2;
          const goster = i % adim === 0 || i === len - 1;
          if (goster) {
            const txt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            txt.setAttribute('x', String(hesaplaX(i, len)));
            txt.setAttribute('y', String(H - 15));
            txt.setAttribute('text-anchor', 'middle');
            txt.setAttribute('class', 'eksen-yazi');
            txt.textContent = p.etiket;
            xEksenGrubu.appendChild(txt);
          }
        });
      }

      // Son değerler sağ uca hizalanır
      const sonNokta = aktifNoktalar[len - 1];
      if (sonNokta) {
        const lastX = String(hesaplaX(len - 1, len) + 10);
        if (sonValTcmb) {
          sonValTcmb.setAttribute('x', lastX);
          sonValTcmb.setAttribute('y', String(hesaplaY(sonNokta.tcmbFaiz) + 4));
          sonValTcmb.textContent = sonNokta.tcmbFaiz.toLocaleString('tr-TR', { minimumFractionDigits: 2 });
        }
        if (sonValIto && sonNokta.ito != null) {
          sonValIto.setAttribute('x', lastX);
          sonValIto.setAttribute('y', String(hesaplaY(sonNokta.ito) + 4));
          sonValIto.textContent = sonNokta.ito.toLocaleString('tr-TR', { minimumFractionDigits: 2 });
        }
        if (sonValTufe) {
          sonValTufe.setAttribute('x', lastX);
          sonValTufe.setAttribute('y', String(hesaplaY(sonNokta.tufe) + 4));
          sonValTufe.textContent = sonNokta.tufe.toLocaleString('tr-TR', { minimumFractionDigits: 2 });
        }
        guncelleSimulasyon(sonNokta);
      }
    }

    function guncelleSimulasyon(p) {
      if (!p || !simAyAdi || !simFaizTl || !simEnfTl || !simNetTl || !simNetKutu) return;
      simAyAdi.textContent = p.tamEtiket;
      const anapara = 10000;
      const faizGetirisi = Math.round((anapara * p.tcmbFaiz) / 100);
      const enfKaybi = Math.round((anapara * p.tufe) / 100);
      const net = faizGetirisi - enfKaybi;

      simFaizTl.textContent = `+${faizGetirisi.toLocaleString('tr-TR')} TL`;
      simEnfTl.textContent = `-${enfKaybi.toLocaleString('tr-TR')} TL`;
      simNetTl.textContent = `${net >= 0 ? '+' : ''}${net.toLocaleString('tr-TR')} TL`;

      if (net >= 0) {
        simNetKutu.className = 'sim-kutu sim-net sim-net-pozitif';
      } else {
        simNetKutu.className = 'sim-kutu sim-net sim-net-negatif';
      }
    }

    function gosterNoktaDetay(index) {
      const len = aktifNoktalar.length;
      const p = aktifNoktalar[index];
      if (!p || !takipGrubu || !takipCizgi || !takipTcmb || !takipTufe || !svgTooltip) return;

      const curX = hesaplaX(index, len);
      takipGrubu.setAttribute('visibility', 'visible');
      takipCizgi.setAttribute('x1', String(curX));
      takipCizgi.setAttribute('x2', String(curX));

      if (gorunurluk.tcmb) {
        takipTcmb.setAttribute('cx', String(curX));
        takipTcmb.setAttribute('cy', String(hesaplaY(p.tcmbFaiz)));
        takipTcmb.setAttribute('visibility', 'visible');
      } else {
        takipTcmb.setAttribute('visibility', 'hidden');
      }

      if (takipIto) {
        if (gorunurluk.ito && p.ito != null) {
          takipIto.setAttribute('cx', String(curX));
          takipIto.setAttribute('cy', String(hesaplaY(p.ito)));
          takipIto.setAttribute('visibility', 'visible');
        } else {
          takipIto.setAttribute('visibility', 'hidden');
        }
      }

      if (gorunurluk.tufe) {
        takipTufe.setAttribute('cx', String(curX));
        takipTufe.setAttribute('cy', String(hesaplaY(p.tufe)));
        takipTufe.setAttribute('visibility', 'visible');
      } else {
        takipTufe.setAttribute('visibility', 'hidden');
      }

      // SVG Tooltip verileri
      if (ttTarih) ttTarih.textContent = p.tamEtiket;
      if (ttTcmb) ttTcmb.textContent = `%${p.tcmbFaiz.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`;
      if (ttIto) ttIto.textContent = p.ito != null ? `%${p.ito.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}` : 'Veri yok';
      if (ttTufe) ttTufe.textContent = `%${p.tufe.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`;

      if (ttDurum) {
        if (p.reelFark >= 0) {
          ttDurum.textContent = `+${p.reelFark.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} puan reel getiri`;
          ttDurum.setAttribute('class', 'tt-durum durum-pozitif');
        } else {
          ttDurum.textContent = `${p.reelFark.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} puan negatif reel faiz`;
          ttDurum.setAttribute('class', 'tt-durum durum-negatif');
        }
      }

      // Tooltip konumu (SVG içi taşma önleme)
      let ttX = curX + 14;
      if (ttX + 210 > W - PAD_R) {
        ttX = curX - 214;
      }
      const ttY = Math.max(10, Math.min(H - PAD_B - 120, hesaplaY(p.tufe) - 50));
      svgTooltip.setAttribute('transform', `translate(${ttX.toFixed(1)}, ${ttY.toFixed(1)})`);
      svgTooltip.setAttribute('visibility', 'visible');

      guncelleSimulasyon(p);
    }

    // Dönem filtre butonları (Son Ay, Son 6 Ay, Son 12 Ay, Tümü)
    const donemBtnler = kapsayici.querySelectorAll('.donem-btn');
    donemBtnler.forEach((btn) => {
      btn.addEventListener('click', () => {
        donemBtnler.forEach((b) => b.classList.remove('aktif'));
        btn.classList.add('aktif');

        const ayAralik = btn.getAttribute('data-aralik');
        if (ayAralik === 'son-ay') {
          // Son ay butonuna tıklandığında: Tüm grafik açık kalsın ama son aya anında odaklansın ve sabitlensin
          ciz(tumNoktalar);
          gosterNoktaDetay(tumNoktalar.length - 1);
        } else if (ayAralik === '6') {
          ciz(tumNoktalar.slice(-6));
          gizle();
        } else if (ayAralik === '12') {
          ciz(tumNoktalar.slice(-12));
          gizle();
        } else {
          // Tümü (21 Ay)
          ciz(tumNoktalar);
          gizle();
        }
      });
    });

    // Seri Aç/Kapa butonları
    const seriBtnler = kapsayici.querySelectorAll('.lejant-btn');
    seriBtnler.forEach((btn) => {
      btn.addEventListener('click', () => {
        const seri = btn.getAttribute('data-seri');
        const aktif = btn.classList.toggle('aktif');
        const gorunurlukVal = aktif ? 'visible' : 'hidden';

        if (seri === 'tcmb') {
          gorunurluk.tcmb = aktif;
          if (pathTcmb) pathTcmb.setAttribute('visibility', gorunurlukVal);
          if (sonValTcmb) sonValTcmb.setAttribute('visibility', gorunurlukVal);
          if (takipTcmb) takipTcmb.setAttribute('visibility', gorunurlukVal);
        } else if (seri === 'ito') {
          gorunurluk.ito = aktif;
          if (pathIto) pathIto.setAttribute('visibility', gorunurlukVal);
          if (sonValIto) sonValIto.setAttribute('visibility', gorunurlukVal);
          if (takipIto) takipIto.setAttribute('visibility', gorunurlukVal);
        } else if (seri === 'tufe') {
          gorunurluk.tufe = aktif;
          if (pathTufe) pathTufe.setAttribute('visibility', gorunurlukVal);
          if (sonValTufe) sonValTufe.setAttribute('visibility', gorunurlukVal);
          if (takipTufe) takipTufe.setAttribute('visibility', gorunurlukVal);
        }
      });
    });

    // Fare / Dokunmatik Takipçi
    function fareTakip(clientX) {
      const rect = yuzey.getBoundingClientRect();
      const relX = clientX - rect.left;
      if (relX < 0 || relX > rect.width) {
        gizle();
        return;
      }

      const len = aktifNoktalar.length;
      const index = Math.max(0, Math.min(len - 1, Math.round((relX / rect.width) * (len - 1))));
      gosterNoktaDetay(index);
    }

    function gizle() {
      if (takipGrubu) takipGrubu.setAttribute('visibility', 'hidden');
      if (svgTooltip) svgTooltip.setAttribute('visibility', 'hidden');
      const sonNokta = aktifNoktalar[aktifNoktalar.length - 1];
      if (sonNokta) guncelleSimulasyon(sonNokta);
    }

    yuzey.addEventListener('mousemove', (e) => fareTakip(e.clientX));
    yuzey.addEventListener('mouseleave', gizle);

    yuzey.addEventListener('touchstart', (e) => {
      if (e.touches.length > 0) fareTakip(e.touches[0].clientX);
    }, { passive: true });

    yuzey.addEventListener('touchmove', (e) => {
      if (e.touches.length > 0) fareTakip(e.touches[0].clientX);
    }, { passive: true });

    // İlk açılışta son ayın simülasyonunu ayarla
    guncelleSimulasyon(tumNoktalar[tumNoktalar.length - 1]);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', baslat);
  } else {
    baslat();
  }
})();
