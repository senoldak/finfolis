-- Haftalık bülten aboneleri. IP ya da tarayıcı bilgisi tutulmaz.
-- durum: 'bekliyor' (onay bekleniyor; 7 gün sonra silinir) | 'onayli'.
-- Ayrılan abonenin satırı silinir.
-- olusturma: kaydın oluşturulma zamanı. Onay e-postası her gönderildiğinde yenilenir;
-- 10 dakika kuralı ve 7 gün süresi bu alandan okunur.
CREATE TABLE IF NOT EXISTS abone (
  id INTEGER PRIMARY KEY,
  eposta TEXT UNIQUE NOT NULL,
  dil TEXT NOT NULL DEFAULT 'tr',
  durum TEXT NOT NULL CHECK(durum IN ('bekliyor','onayli')),
  belirtec TEXT UNIQUE NOT NULL,
  olusturma TEXT NOT NULL,
  onay TEXT
);

-- Aynı haftanın bülteninin iki kez gönderilmemesi için.
CREATE TABLE IF NOT EXISTS gonderim (
  hafta TEXT,
  dil TEXT,
  zaman TEXT,
  adet INTEGER,
  PRIMARY KEY(hafta, dil)
);
