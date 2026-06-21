# design.base.md
> **DO NOT EDIT per project.** These are locked standards across all Dev/AiSolv frontends.
> For project-specific overrides → see `design.md` in the project root.

---

## Typography — Fixed

Three families. Fixed roles. Never substitute.

| Family | Role | Never use for |
|---|---|---|
| **Outfit** | All display, headline, body, stat numerals | Labels, buttons, status |
| **Instrument Serif** | Editorial italic only (quotes, client names) | Body copy, buttons |
| **JetBrains Mono** | All labels, eyebrows, buttons, status, meta | Body copy, headings |

### Load (Google Fonts)
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@200;300;400;500&family=Instrument+Serif:ital@1&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
```

### Type scale
```css
--font-display:  'Outfit', sans-serif;
--font-body:     'Outfit', sans-serif;
--font-serif:    'Instrument Serif', serif;
--font-mono:     'JetBrains Mono', monospace;

/* Size tokens */
--text-display-xl:  8rem;    /* 128px — hero headline */
--text-display-lg:  6rem;    /* 96px  — secondary hero */
--text-display-md:  4.5rem;  /* 72px  — footer CTA */
--text-headline-lg: 3.75rem; /* 60px  — section h2 */
--text-headline-md: 3rem;    /* 48px  — section h3 */
--text-headline-sm: 2.25rem; /* 36px  — accordion / FAQ */
--text-title-md:    1.25rem; /* 20px  — card titles */
--text-title-sm:    1rem;    /* 16px  — sub-card */
--text-body-lg:     1.125rem;/* 18px  — lead paragraph */
--text-body-md:     1rem;    /* 16px  — default body */
--text-body-sm:     0.875rem;/* 14px  — helper / card body */
--text-label:       0.75rem; /* 12px  — button labels (mono) */
--text-eyebrow:     0.625rem;/* 10px  — section eyebrows (mono) */
--text-status:      0.5625rem;/* 9px  — status pills (mono) */
--text-stat:        3.75rem; /* 60px  — stat numerals */
```

### Weight rules
- `200` extralight → hero display (white words)
- `300` light → subheads, body, card titles
- `400` normal → gradient-fill words, mono labels, serif italic
- `500` medium → eyebrow labels only
- Never mix more than 2 Outfit weights in a single composition

### Tracking rules
- Display + headline sizes: always `letter-spacing: -0.02em` or tighter
- Body: `letter-spacing: 0`
- Mono labels: `letter-spacing: 0.18em – 0.22em`, always `text-transform: uppercase`

---

## Spacing — Fixed (4pt grid)

```css
--space-1:  0.25rem;   /* 4px */
--space-2:  0.5rem;    /* 8px */
--space-3:  0.75rem;   /* 12px */
--space-4:  1rem;      /* 16px */
--space-6:  1.5rem;    /* 24px */
--space-8:  2rem;      /* 32px */
--space-12: 3rem;      /* 48px */
--space-16: 4rem;      /* 64px */
--space-24: 6rem;      /* 96px */
--space-32: 8rem;      /* 128px */
--space-40: 10rem;     /* 160px */

--container-max:  1280px;  /* max-w-7xl */
--content-max:    1024px;  /* max-w-5xl */
--prose-max:      768px;   /* max-w-3xl */
--hero-min-h:     100dvh;

/* Section rhythm */
--section-py:         6rem;   /* py-24 default */
--section-py-large:   8rem;   /* py-32 hero/philosophy */
--section-gap-cards:  1.5rem; /* gap-6 */
--section-gap-grid:   2rem;   /* gap-8 */
```

---

## Border Radius — Fixed

```css
--radius-none: 0px;
--radius-xs:   2px;    /* node squares */
--radius-sm:   4px;    /* small chips */
--radius-md:   8px;    /* small elements */
--radius-lg:   12px;   /* inner cards */
--radius-xl:   16px;   /* primary cards */
--radius-2xl:  24px;   /* large glass blocks */
--radius-full: 9999px; /* pills — ALL buttons, navbar, status, CTAs */
```

Rule: actuators (buttons, nav, badges) = `--radius-full`. Content containers (cards) = `--radius-xl`. Inner cards = `--radius-lg`.

---

## Elevation — Fixed

One system. No drop shadows on cards. Ever.

### `.luxe-glass`
```css
.luxe-glass {
  background: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.05);
  box-shadow:
    0 4px 30px rgba(0, 0, 0, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
}
.luxe-glass:hover {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.12);
  box-shadow:
    0 8px 40px rgba(0, 0, 0, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
}
```

### Atmosphere layers (stacking order)
1. Page background
2. `noise-overlay` at `opacity: 0.02` (never above 0.04)
3. `bg-grid-dark` utility at `opacity: 0.03` (alternate sections)
4. Radial accent halo (project accent color, `opacity: 0.2`)
5. `.luxe-glass` cards
6. Content

---

## Motion — Fixed

```css
--ease-luxe:    cubic-bezier(0.16, 1, 0.3, 1);    /* navbar, accordions, glass */
--ease-soft:    cubic-bezier(0.25, 0.46, 0.45, 0.94); /* btn slides */
--ease-spring:  cubic-bezier(0.34, 1.56, 0.64, 1);   /* magnetic snap */

--duration-fast:   300ms;
--duration-base:   400ms;
--duration-medium: 500ms;
--duration-slow:   700ms;
--duration-hero:   1500ms;
--stagger-hero:    80ms;
--stagger-trust:   60ms;
--stagger-cards:   100ms;

--scroll-trigger-start: "top 75%";
```

### Motion rules
- Navbar morph: `700ms var(--ease-luxe)` — slowest thing on the page, never change speed
- Hero word reveal: `1500ms power4.out`, `80ms` stagger per word
- Section reveals: fire at `top 75%`, play once
- Buttons: `300-400ms` only
- Accordions: `500ms var(--ease-luxe)`, height via `grid-rows` trick
- Always add `prefers-reduced-motion` guards on GSAP timelines

### GSAP pattern
```js
import { useGSAP } from '@gsap/react';
useGSAP(() => {
  // animations
  return () => ctx.revert(); // cleanup
}, { scope: containerRef });
```

---

## Layout — Fixed

- CSS Grid for page structure, Flexbox for component internals
- No 12-column grid system — use centered fixed-max container
- Background alternation: `base` → `surface` → `base` → `surface`
- Every section closes with: `border-bottom: 1px solid rgba(255,255,255,0.05)`
- No colored dividers — hairline only

### Breakpoints
```css
/* Mobile first */
@media (min-width: 480px)  { /* sm  */ }
@media (min-width: 768px)  { /* md  */ }
@media (min-width: 1024px) { /* lg  */ }
@media (min-width: 1280px) { /* xl  */ }
```

Test on: 375px / 768px / 1280px minimum.

---

## Icons & Assets — Fixed

- Icons: `lucide-react` at `strokeWidth={1.8}`, sizes `h-4` / `h-5`
- No raster icons in UI (headshots and logo excepted)
- No illustrative / cartoon art
- No multi-color palettes or background gradients (gradients → text + halos only)

---

## Tech Stack — Fixed

| Need | Choice |
|---|---|
| Framework | React 19 + Vite |
| Styling | Tailwind v4 + CSS custom properties |
| Animations | GSAP 3 + `@gsap/react` + ScrollTrigger |
| Class merging | `cn()` via `clsx` + `tailwind-merge` |
| Icons | `lucide-react` |
| Forms | React Hook Form |
| HTTP | native `fetch` |
| Routing | `react-router-dom` v7 |

---

## Universal Do's & Don'ts

**Do**
- Use `.luxe-glass` for every new content card
- Set every uppercase label in JetBrains Mono, `0.18em–0.22em` tracking
- Close every section with a 1px hairline at 5% white
- Animate hero word-reveal and eyebrow-line entrances — always
- Use `cn()` for any class string with a ternary

**Don't**
- Don't use pure `#000` — always use the project's base color
- Don't drop shadows on cards — use glass elevation only
- Don't use `font-mono` for body copy or anything > 1 line
- Don't break the navbar 700ms morph speed
- Don't add a second accent color — one accent per project, full stop
- Don't use Inter, Roboto, Arial, or system-ui
- Don't apply gradient fills to background surfaces
