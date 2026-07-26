# Frontend Desenleri

React 19 bileşen, state, form, performans ve animasyon desenleri.
Kurulu zemin: apps/web = Next.js 16 App Router, React 19, TypeScript strict;
apps/admin = Vite, React 19. Stil: Tailwind v4 + `packages/design-tokens`
(ham hex ve inline style YASAK). Approved default — HENÜZ KURULU DEĞİL (ilk
ihtiyaçta kurulur; bölümler bunları kurulu zemin gibi SUNMAZ): web'de
TanStack Query ve RHF+Zod; admin'de React Router v7 ve Zustand.

## Bileşen Kompozisyonu (kalıtım değil)

```typescript
interface CardProps {
  children: React.ReactNode
  variant?: 'default' | 'outlined'
}

export function Card({ children, variant = 'default' }: CardProps) {
  return <div className={`card card-${variant}`}>{children}</div>
}
export function CardHeader({ children }: { children: React.ReactNode }) {
  return <div className="card-header">{children}</div>
}

// Kullanım: <Card><CardHeader>Başlık</CardHeader>...</Card>
```

Bileşik bileşenlerde paylaşılan durumu Context ile taşı (Tabs/Tab deseni);
context dışı kullanımda açık hata fırlat.

## Sunucu Durumu: TanStack Query (web)

Elle `useQuery` hook'u veya useEffect-içinde-fetch YAZMA — sunucu durumu
TanStack Query'nindir:

```typescript
import { useQuery } from '@tanstack/react-query'

function useProducts(category: string) {
  return useQuery({
    queryKey: ['products', category],
    queryFn: () => api.getProducts(category),   // tip: packages/api-types
    staleTime: 60_000,
  })
}
```

- Server Component'te veri çekimini tercih et; interaktif yerlerde Query
- İstemci store'una (Zustand) sunucu verisi kopyalama

## İstemci Durumu: Zustand (admin)

```typescript
import { create } from 'zustand'

interface UiState {
  sidebarOpen: boolean
  toggleSidebar: () => void
}
export const useUiStore = create<UiState>((set) => ({
  sidebarOpen: true,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
}))
```

## Form: React Hook Form + Zod

Elle validate fonksiyonu yazma; şema tek doğruluk kaynağı:

```typescript
const productSchema = z.object({
  name: z.string().min(1, 'Ad zorunlu').max(200),
  price: z.coerce.number().positive(),
})
type ProductForm = z.infer<typeof productSchema>

function CreateProductForm() {
  const { register, handleSubmit, formState: { errors } } =
    useForm<ProductForm>({ resolver: zodResolver(productSchema) })

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('name')} />
      {errors.name && <span role="alert">{errors.name.message}</span>}
      <button type="submit">Kaydet</button>
    </form>
  )
}
```

## Performans

```typescript
// Pahalı hesaplamada useMemo — sort mutasyon yapar, önce kopyala
const sorted = useMemo(() => [...items].sort((a, b) => b.score - a.score), [items])

// Çocuğa geçen fonksiyonda useCallback; saf bileşende React.memo
const handleSearch = useCallback((q: string) => setQuery(q), [])
```

- Ağır bileşeni `lazy()` + `<Suspense>` ile böl
- Uzun listelerde sanallaştırma: `@tanstack/react-virtual`
- Debounce hook deseni: `.claude/rules/typescript/patterns.md`

## Hata Sınırı

Sınıf tabanlı `ErrorBoundary` ile alt ağacı sar; `getDerivedStateFromError`
+ `componentDidCatch` logla, kullanıcıya "tekrar dene" sun. Next.js'te route
segmentine `error.tsx` koymak aynı işi görür.

## Animasyon: `motion` paketi (framer-motion YASAK)

```typescript
import { motion, AnimatePresence } from 'motion/react'   // 'framer-motion' DEĞİL

export function AnimatedList({ items }: { items: Item[] }) {
  return (
    <AnimatePresence>
      {items.map((item) => (
        <motion.div
          key={item.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
        >
          <ItemCard item={item} />
        </motion.div>
      ))}
    </AnimatePresence>
  )
}
```

`prefers-reduced-motion` kullanıcı tercihine saygı göster.

## Erişilebilirlik

- Klavye navigasyonu: ArrowUp/Down, Enter, Escape handler'ları;
  `role`/`aria-expanded`/`aria-haspopup` doğru set edilir
- Modal odak yönetimi: açılınca odağı modala taşı, kapanınca önceki öğeye
  geri ver; `role="dialog"` + `aria-modal="true"`
- Semantik HTML önce gelir: `<button>`, `<nav>`, tek `h1` (SEO gate de bunu
  denetler)

**Unutma**: Proje karmaşıklığına uyan deseni seç. Sunucu durumu Query'de,
istemci durumu küçük store'larda, stil token'larda yaşar.
