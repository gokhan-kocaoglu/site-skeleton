---
paths:
  - "apps/web/**/*.{ts,tsx}"
  - "apps/admin/**/*.{ts,tsx}"
  - "packages/**/*.{ts,tsx}"
---
# TypeScript Desenleri

> Bu dosya [common/patterns.md](../common/patterns.md)'i TypeScript'e
> özgü içerikle genişletir.

## API Yanıt Zarfı

```typescript
interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  meta?: {
    total: number
    page: number
    limit: number
  }
}
```

Sunucu tipleri elle yazılmaz — `packages/api-types` OpenAPI sözleşmesinden
üretilir (`docs/api-contracts/openapi.yaml`).

## Veri Çekme

- **apps/web**: sunucu durumu için TanStack Query kullan; elle yazılmış
  `useQuery`/fetch-in-useEffect deseni kurma
- **apps/admin**: global istemci durumu için Zustand; sunucu durumunu
  istemci store'una kopyalama

## Custom Hook Deseni

```typescript
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(handler)
  }, [value, delay])
  return debouncedValue
}
```

## Form Deseni

React Hook Form + Zod resolver; şema tek doğruluk kaynağı
(bkz. `stack-patterns/references/frontend-patterns.md`).

## Repository Deseni

```typescript
interface Repository<T> {
  findAll(filters?: Filters): Promise<T[]>
  findById(id: string): Promise<T | null>
  create(data: CreateDto): Promise<T>
  update(id: string, data: UpdateDto): Promise<T>
  delete(id: string): Promise<void>
}
```
