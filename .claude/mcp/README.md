# MCP Konfigürasyonu

Gerçek MCP konfigürasyonu **user scope**'ta yaşar — API key'ler bu repoya asla girmez.
Bu klasördeki dosyalar yalnız `.example.json` placeholder'lardır.

Kurulum (bir kez, tüm projelerde geçerli):

```powershell
claude mcp add magic --scope user --env API_KEY="GERCEK_KEYIN" -- npx -y @21st-dev/magic@latest
claude mcp list   # doğrula
```

Kural: **az MCP = sağlıklı context.** Yeni MCP eklemeden önce sor:
"bu bir skill ya da CLI ile çözülür mü?"

Opsiyonel adaylar (ancak ihtiyaç doğunca, proje bazında):
- Playwright MCP — E2E görsel doğrulama
- Context7 — güncel kütüphane dokümanı
- postgres — DB introspection (örnek: `postgres.example.json`)
