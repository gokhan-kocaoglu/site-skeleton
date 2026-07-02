export default function HomePage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-3xl font-semibold">Site Skeleton</h1>
      <p className="mt-4 text-text-muted">
        A production-ready starting point: Next.js 15 storefront, Vite + React
        admin panel and a Spring Boot API. Replace this page with the
        project&apos;s real home page.
      </p>
      <section className="mt-10" aria-labelledby="stack-heading">
        <h2 id="stack-heading" className="text-xl font-medium">
          What&apos;s inside
        </h2>
        <ul className="mt-3 list-disc pl-5 text-text-muted">
          <li>apps/web — Next.js 15, React 19, Tailwind v4</li>
          <li>apps/admin — Vite 5, React 19</li>
          <li>apps/api — Spring Boot 3.3, PostgreSQL 16, Flyway</li>
          <li>packages/design-tokens — single source of truth for styling</li>
        </ul>
      </section>
    </main>
  );
}
