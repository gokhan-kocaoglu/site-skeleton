---
paths:
  - "apps/web/**/*.{ts,tsx}"
  - "apps/admin/**/*.{ts,tsx}"
  - "packages/**/*.{ts,tsx}"
---
# TypeScript Kodlama Stili

> Bu dosya [common/coding-style.md](../common/coding-style.md)'yi
> TypeScript'e özgü içerikle genişletir.

## Tipler ve Arayüzler

- Export edilen fonksiyonlara, paylaşılan util'lere ve public metodlara
  açık parametre + dönüş tipi ver; bariz lokal değişkenleri infer'e bırak
- Tekrarlanan inline nesne şekillerini isimli tipe çıkar
- `interface` → genişletilebilir nesne şekilleri;
  `type` → union, intersection, tuple, mapped/utility tipleri
- `enum` yerine string literal union tercih et (interop gerekmedikçe)

## `any` Yasağı

- Uygulama kodunda `any` kullanma
- Dış/güvenilmeyen girdi için `unknown` + güvenli daraltma:

```typescript
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  return 'Unexpected error'
}
```

- Tip çağırana bağlıysa generic kullan

## React Props

- Props'u isimli `interface`/`type` ile tanımla; callback tiplerini açık yaz
- Özel bir sebep yoksa `React.FC` kullanma

```typescript
interface UserCardProps {
  user: User
  onSelect: (id: string) => void
}
function UserCard({ user, onSelect }: UserCardProps) { /* ... */ }
```

## Değişmezlik

Spread ile immutable güncelleme; parametreyi `Readonly<T>` al:

```typescript
function updateUser(user: Readonly<User>, name: string): User {
  return { ...user, name }
}
```

## Hata Yönetimi

`async/await` + `try-catch`; `catch (error: unknown)` yakalayıp güvenle
daralt; logla ve anlamlı hata fırlat — sessiz yutma yok.

## Girdi Doğrulama

Zod ile şema-tabanlı doğrulama; tipi şemadan türet:

```typescript
const userSchema = z.object({
  email: z.string().email(),
  age: z.number().int().min(0).max(150),
})
type UserInput = z.infer<typeof userSchema>
```

## console.log

Üretim kodunda `console.log` yasak (post-edit hook uyarır); log kütüphanesi
kullan.
