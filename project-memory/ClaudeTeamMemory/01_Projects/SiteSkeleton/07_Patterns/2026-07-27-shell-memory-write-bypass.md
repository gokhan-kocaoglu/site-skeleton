# Ders — Shell Yoluyla Memory Tek-Yazar Bypass'ı (2026-07-27)

## Olay

Faz 8.2 sırasında `project-memory/**` tek-yazar kuralının fiilen aşılabildiği
görüldü: `memory-writer-guard` hook'u yalnız **Write/Edit** araç çağrılarını
görüyor. Aynı dosyayı bir kabuk komutu (`>`, `>>`, `Set-Content`, `Out-File`,
`Add-Content`, `tee`, `cp`/`mv`) ile yazmak hook'a hiç uğramıyordu — kural
kağıt üstünde duruyor, pratikte devre dışı kalıyordu.

## Kök Neden

Guard, korunan kaynağa (dosya yolu) değil, tek bir araç yüzeyine (Write/Edit)
bağlanmıştı. Aynı kaynağa ikinci bir yol (Bash/PowerShell) varken tek yüzeyi
korumak, korumanın tamamını iptal eder.

## Alınan Önlem (Faz 8.3 PR-D)

`pre-bash-memory-guard` hook'u eklendi: Bash|PowerShell komutlarında yazan
kalıp + hedef `project-memory/**` → **ask**. Karar hiçbir zaman `deny` değil;
insan onaylar. Windows ters bölü yolları normalize edilir; okuma komutları
(`cat`, `git diff`, `Get-Content`) yazma kalıbı taşımadığı için etkilenmez.

## Kalıcı Kural

Bir kaynağı koruyan her guard, o kaynağa giden **bütün** araç yüzeylerini
kapsamalıdır. Yeni bir araç yüzeyi eklendiğinde mevcut guard'lar bu soruyla
yeniden gözden geçirilir.

## Bilinen Sınır (dürüstçe kayıtta)

Hook tam bir shell parser değildir: alias, base64/encoding, dinamik eval,
alt kabuk ve bilinçli obfuscation kapsanmaz. Nihai güvenlik ağı CI'daki
Gitleaks full-history taramasıdır.
