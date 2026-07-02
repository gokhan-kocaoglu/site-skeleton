# CI

> Taslak — Faz 7'de doldurulur.

Planlanan pipeline:

1. `pnpm gate` — typecheck + lint + test + audit (scripts/quality/)
2. `mvn verify` (apps/api) — Testcontainers ile integration testler

Not: Testcontainers CI runner'da Docker gerektirir. Docker'sız ortamlarda `-Pit-local`
profili lokal PostgreSQL'e düşer; iki yol arasındaki parite riski quality gate
raporlarında izlenir.
