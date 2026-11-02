-- "Bu haber işine yaradı mı?": gün, yazı ve yanıt başına adsız sayaç. IP ya da okur bilgisi tutulmaz.
CREATE TABLE IF NOT EXISTS yanit (
  gun TEXT NOT NULL,
  slug TEXT NOT NULL,
  yanit TEXT NOT NULL CHECK (yanit IN ('evet', 'hayir')),
  adet INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (gun, slug, yanit)
);
