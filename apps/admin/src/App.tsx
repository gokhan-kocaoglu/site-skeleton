/**
 * Static sign-in placeholder. No auth logic, no router, no state on purpose:
 * wire up React Router v7, Zustand and the real auth flow per project
 * (tokens are NEVER stored in localStorage — see CLAUDE.md invariants).
 */
export default function App() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-surface-muted px-4">
      <section
        aria-labelledby="login-heading"
        className="w-full max-w-sm rounded-card bg-surface p-8 shadow-card"
      >
        <h1 id="login-heading" className="text-2xl font-semibold text-text">
          Admin sign-in
        </h1>
        <p className="mt-2 text-sm text-text-muted">
          Static placeholder — replace with the project&apos;s real auth flow.
        </p>
        <form className="mt-6 space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-text">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="username"
              disabled
              className="mt-1 w-full rounded-card border border-border bg-surface px-3 py-2 text-text"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-text">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              disabled
              className="mt-1 w-full rounded-card border border-border bg-surface px-3 py-2 text-text"
            />
          </div>
          <button
            type="button"
            disabled
            className="w-full rounded-card bg-primary px-4 py-2 font-medium text-primary-foreground disabled:opacity-60"
          >
            Sign in
          </button>
        </form>
      </section>
    </main>
  );
}
