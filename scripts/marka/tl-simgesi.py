# Bricolage Grotesque'i siteye hazırlar ve TL simgesini (₺, U+20BA) TCMB'nin teknik çizimine göre yeniden çizer
# (https://www.tcmb.gov.tr → Banka Hakkında → TL Simgesi). Yazı tipinin kendi ₺'sinde yay küçük ve gövdenin ortasına
# çıkmıyor. TCMB geometrisi: dikey gövde, tabandan sağa 90° çember yayı (dış yarıçap = büyük harf yüksekliğinin yarısı,
# kalınlık = gövde), gövdeyi kesen iki paralel çizgi 20° yukarı eğimli. kifobu/scripts/marka/tl-simgesi.py ile aynı kurgu.
#
# Kaynak: Google Fonts deposundaki değişken TTF (opsz, wdth, wght). Genişlik ekseni 100'e sabitlenir (site ve kapaklar
# yalnız normal genişliği kullanır, dosya küçülür). Kalan iki eksende ₺ dokuz ana noktada (opsz 12/varsayılan/96 ×
# wght 200/400/800) ölçülerek çizilir: gövde = o noktadaki "I" genişliği, yükseklik = "H" yüksekliği. Deltalar
# VariationModel ile hesaplanır; ilerleme genişliği özgün glifinki kalır (HVAR geçerli kalır).
# Kalın kesimde yayın içi kapanmasın diye yay ve çizgiler incelir, çizgiler biraz yükselir (kifobu 900 ölçüleri).
#
# Çıktılar: scripts/kapak/fonts/BricolageGrotesque.ttf (kapaklar) ve public/fonts/bricolage-{latin,latin-ext}-v1.woff2
# (site; dosya değişirse sürüm ekini artır, /fonts/* 30 gün önbellekte kalır). OFL'de ayrılmış ad yok.
# Kullanım (fontTools ve brotli gerekir): python scripts/marka/tl-simgesi.py <BricolageGrotesque[opsz,wdth,wght].ttf>
import math
import sys
from fontTools.ttLib import TTFont
from fontTools.ttLib.tables.TupleVariation import TupleVariation
from fontTools.ttLib.tables._g_l_y_f import GlyphCoordinates
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.varLib.models import VariationModel, normalizeLocation, piecewiseLinearMap
from fontTools import subset

KAYNAK = sys.argv[1]
TTF = 'scripts/kapak/fonts/BricolageGrotesque.ttf'
GLIF = 'uni20BA'
EGIM = math.tan(math.radians(20))


def olc(font, konum):
    """Verilen konumda (kullanıcı değerleri) H yüksekliği, I gövdesi ve ₺ ilerlemesi."""
    f = instantiateVariableFont(TTFont(KAYNAK_SABIT), konum)
    gs = f['glyf']
    h = gs['H']; h.recalcBounds(gs)
    i = gs['I']; i.recalcBounds(gs)
    return dict(H=h.yMax, s=i.xMax - i.xMin, ilerleme=f['hmtx'][GLIF][0])


def ara(a, b, t):
    return a + (b - a) * t


def ciz(o):
    H, s, ilerleme = o['H'], o['s'], o['ilerleme']
    # t: 0 = normal kalınlık (gövde H'nin %12,4'ü), 1 = çok kalın (%25,7); kifobu'daki 400 ve 900 ana çizimleri.
    t = min(max((s / H - 0.124) / (0.257 - 0.124), 0), 1)
    k = ara(s, s * 0.78, t)            # yay kalınlığı
    cubuk = ara(s * 0.8, s * 0.554, t)  # çizgi kalınlığı (dikey)
    aralik = H * ara(0.052, 0.059, t)
    sagUst = H * ara(0.85, 0.903, t)    # sağ uç üst köşesi
    sag = H * ara(0.355, 0.326, t)      # sağ uç, gövde merkezine göre
    SOL = -0.24 * H                      # sol uç
    R = cy = H / 2
    x0 = round((ilerleme - (R - SOL)) / 2 - SOL)  # tam sayı: kapanış noktası her kesimde başlangıçla aynı yuvarlansın
    pen = TTGlyphPen(None)

    pen.moveTo((x0 - s / 2, 0)); pen.lineTo((x0 - s / 2, H)); pen.lineTo((x0 + s / 2, H)); pen.lineTo((x0 + s / 2, 0)); pen.closePath()

    def yay(r, a, b):
        adim = (b - a) / 4
        for i in range(4):
            a1 = a + adim * i
            a2 = a1 + adim
            am = math.radians((a1 + a2) / 2)
            rk = r / math.cos(math.radians(abs(adim) / 2))
            # Uç noktalar yuvarlanır: 0° ve -90°'deki 1e-14'lük kayma, kapanış noktasını kimi kesimde başlangıçtan ayırıyordu.
            pen.qCurveTo((x0 + rk * math.cos(am), cy + rk * math.sin(am)),
                         (round(x0 + r * math.cos(math.radians(a2)), 6), round(cy + r * math.sin(math.radians(a2)), 6)))
    pen.moveTo((x0, 0)); pen.lineTo((x0, k))
    yay(R - k, -90, 0)
    pen.lineTo((x0 + R, cy))
    yay(R, 0, -90)
    pen.closePath()

    xl, xr = x0 + SOL, x0 + sag
    ust = sagUst
    for _ in range(2):
        alt = ust - cubuk
        fark = (xr - xl) * EGIM
        pen.moveTo((xl, alt - fark)); pen.lineTo((xl, ust - fark)); pen.lineTo((xr, ust)); pen.lineTo((xr, alt)); pen.closePath()
        ust = alt - aralik

    g = pen.glyph()
    g.flags[0] |= 0x40  # OVERLAP_SIMPLE
    return g


# 1. Genişliği sabitle
f = instantiateVariableFont(TTFont(KAYNAK), {'wdth': 100})
KAYNAK_SABIT = TTF + '.ara.ttf'
f.save(KAYNAK_SABIT)
f = TTFont(KAYNAK_SABIT)
eksen = {a.axisTag: (a.minValue, a.defaultValue, a.maxValue) for a in f['fvar'].axes}
avar = f['avar'].segments if 'avar' in f else {}
print('eksenler', eksen)

# 2. Ana noktalar (varsayılan konum opsz 96, wght 800; ara noktalar 24 ve 400/600 ayrıca)
opsz = sorted({eksen['opsz'][0], 24, eksen['opsz'][2]})
wght = sorted({eksen['wght'][0], 400, 600, eksen['wght'][2]})
kullanici = [{'opsz': o, 'wght': w} for o in opsz for w in wght]


def normal(k):
    n = normalizeLocation(k, eksen)
    return {t: piecewiseLinearMap(v, avar[t]) if t in avar else v for t, v in n.items()}


konumlar = [{t: v for t, v in normal(k).items() if v != 0} for k in kullanici]
olcumler = [olc(f, k) for k in kullanici]
glifler = [ciz(o) for o in olcumler]

assert len({len(g.coordinates) for g in glifler}) == 1
for k, o in zip(kullanici, olcumler):
    print(k, {a: round(b) for a, b in o.items()})


def noktalar(g, o):
    return GlyphCoordinates([tuple(p) for p in g.coordinates] + [(0, 0), (o['ilerleme'], 0), (0, 0), (0, 0)])


model = VariationModel(konumlar, axisOrder=['opsz', 'wght'])
ana = [noktalar(g, o) for g, o in zip(glifler, olcumler)]
deltalar = model.getDeltas(ana)
destekler = model.supports

# 3. Varsayılan glif ve varyasyonlar
vi = konumlar.index({})
glyf = f['glyf']
g0 = glifler[vi]
g0.recalcBounds(glyf)
glyf[GLIF] = g0
f['hmtx'][GLIF] = (olcumler[vi]['ilerleme'], g0.xMin)
f['gvar'].variations[GLIF] = [
    TupleVariation(destek, [tuple(int(round(c)) for c in p) for p in d])
    for destek, d in zip(destekler, deltalar) if destek
]
f.save(TTF)

# 4. Site alt kümeleri (global.css'teki unicode-range'lerle aynı).
ARALIK = {
    'latin': 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD',
    'latin-ext': 'U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF',
}
for ad, aralik in ARALIK.items():
    secenek = subset.Options()
    secenek.flavor = 'woff2'
    secenek.layout_features = ['*']
    secenek.name_IDs = ['*']
    secenek.notdef_outline = True
    alt = subset.Subsetter(secenek)
    alt.populate(unicodes=subset.parse_unicodes(aralik))
    font = TTFont(TTF)
    alt.subset(font)
    subset.save_font(font, f'public/fonts/bricolage-{ad}-v1.woff2', secenek)

import os
os.remove(KAYNAK_SABIT)
print('tamam')
