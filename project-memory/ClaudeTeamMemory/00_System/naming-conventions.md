# Vault İsimlendirme Konvansiyonları

## Klasörler

- Sistem: `00_System/` — şablonlar, konvansiyonlar (proje bağımsız)
- Projeler: `01_Projects/<ProjeAdi>/` — PascalCase, boşluksuz
  (ör. `SiteSkeleton`, `CicekMagazasi`)
- Rol klasörleri (sabit, numaralı): `01_PM` · `02_UX_UI` · `03_Backend` ·
  `04_Frontend` · `05_QA` · `06_Decisions` · `07_Patterns` · `08_Session_Logs`

## Dosyalar

- Proje kökü (sabit adlar): `Project Brief.md` · `Current Status.md` ·
  `Backlog.md`
- Rol dosyaları: Türkçe/İngilizce başlık, boşluklu, `.md`
  (ör. `01_PM/Roadmap.md`, `03_Backend/API Contract.md`)
- Session log: `08_Session_Logs/YYYY-MM-DD-session-NN.md`
  (aynı günde birden çok oturum → NN artar: 01, 02, …)
- Karar kaydı: `06_Decisions/YYYY-MM-DD <kısa başlık>.md` — gövdede repo
  ADR linki zorunlu (`docs/adr/ADR-NNNN-*.md`)
- Pattern: `07_Patterns/<kisa-kebab-baslik>.md`

## İçerik Kuralları

- Vault dosyaları Türkçe yazılır; kod blokları/komutlar İngilizce kalır.
- Repo `docs/` içeriği vault'a kopyalanmaz — link verilir.
- Dosya başına tek konu; büyüyen dosya rol klasöründe bölünür.
