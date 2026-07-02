# @skeleton/design-tokens

Single source of truth for colours, typography, radius and shadows, expressed
as Tailwind v4 `@theme` variables. **`tokens.css` is the only file in the repo
where raw hex values are allowed** — everywhere else use the generated
utilities or `var(--...)` custom properties.

## Usage

Add the package as a workspace dependency, then import it into the app's
global stylesheet (order matters — after the Tailwind import):

```css
@import "tailwindcss";
@import "@skeleton/design-tokens/tokens.css";
```

Tokens become Tailwind utilities (`bg-primary`, `text-text-muted`,
`rounded-card`, `shadow-card`, ...) and `:root` custom properties.

## Per-project theming

Replace token **values** for each new project; never rename tokens — app code
depends on the names. There is no build step: the CSS file is the artifact.
