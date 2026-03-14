# Kaizen OS Design System

Source of truth for all visual design decisions across the Kaizen OS application.

Inspired by **Sumi-e** (Japanese ink wash painting) — parchment backgrounds, ink-wash grays, sage green accents, serif headlines, generous negative space (*ma*), and soft organic shadows.

---

## Color Palette

### Primary Accent
| Token | Value | Usage |
|-------|-------|-------|
| `--color-sage` | `#8B9467` | Primary brand color, buttons, active states, accents |
| `--color-sage-light` | `rgba(139, 148, 103, 0.1)` | Badges, subtle backgrounds, hover tints |
| `--color-sage-border` | `rgba(139, 148, 103, 0.2)` | Input borders, card borders (active) |
| `--color-sage-border-light` | `rgba(139, 148, 103, 0.08)` | Card borders (resting), dividers |
| `--color-hover` | `rgba(139, 148, 103, 0.05)` | Hover backgrounds, subtle tint |

### Backgrounds
| Token | Value | Usage |
|-------|-------|-------|
| `--color-bg` | `#F5F1EB` | Page background (parchment/washi paper) |
| `--color-card` | `rgba(254, 254, 254, 0.95)` | Card surfaces |
| `--color-white` | `#FFFFFF` | Inputs, inner surfaces |
| `--color-bg-secondary` | *(computed)* | Secondary backgrounds (slightly darker) |

### Text
| Token | Value | Usage |
|-------|-------|-------|
| `--color-text-primary` | `#1A1A1A` | Primary body text |
| `--color-text-secondary` | `#666666` | Secondary labels, descriptions |
| `--color-text-muted` | `#999999` | Muted text, placeholders, dates |

### Ink Shades (Sumi-e)
| Token | Value | Usage |
|-------|-------|-------|
| `--ink-deep` | `#2A2A28` | Deep ink accents |
| `--ink-medium` | `#4A4A46` | Medium ink wash |
| `--ink-light` | `#7A7A72` | Light ink wash |
| `--ink-wash` | `rgba(42, 42, 40, 0.06)` | Subtle ink tint |

### Semantic Colors
| Token | Value | Usage |
|-------|-------|-------|
| `--color-success` | `#27ae60` | Success, active guardrails |
| `--color-warning` | `#f39c12` | Warnings, moderate condition scores |
| `--color-critical` | `#e74c3c` | Errors, critical states, delete |

### Action Type Colors
| Type | Color | Hex |
|------|-------|-----|
| Gate | Red | `#E74C3C` |
| Experiment | Purple | `#9B59B6` |
| Routine | Teal | `#1ABC9C` |
| Ops | Orange | `#F39C12` |

---

## Typography

### Font Stack
```css
--font-serif: 'Cormorant Garamond', 'Palatino Linotype', 'Times New Roman', serif;
--font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
```

- **Body text**: `var(--font-sans)`, 14px, weight 400
- **Headlines/Page titles**: `var(--font-serif)` for landing/public pages only. App pages use sans-serif.

### Type Scale
| Role | Size | Weight | Notes |
|------|------|--------|-------|
| Page title | 24px | 600 | `text-2xl font-semibold` |
| Section heading | 18px | 600 | `text-lg font-semibold` |
| Card title | 16px | 600 | `text-md font-semibold` |
| Body | 14px | 400 | Default |
| Secondary | 13px | 400-500 | Descriptions |
| Small/Label | 12px | 500 | Form labels, uppercase + tracking |
| Caption | 11px | 400-500 | Dates, metadata, uppercase with `letter-spacing: 0.05em` |

### Utility Classes
- `.font-medium` — weight 500
- `.font-semibold` — weight 600
- `.font-bold` — weight 700
- `.text-xs` — 11px
- `.text-sm` — 13px
- `.text-base` — 14px
- `.text-md` — 16px
- `.text-lg` — 18px
- `.text-2xl` — 24px
- `.text-secondary` — `color: var(--color-text-secondary)`
- `.text-muted` — `color: var(--color-text-muted)`

---

## Spacing

```css
--space-1: 4px
--space-2: 8px
--space-3: 12px
--space-4: 16px
--space-5: 20px
--space-6: 24px
--space-8: 32px
--space-12: 48px
--space-15: 60px
```

Use spacing generously. Kaizen OS follows the *ma* (negative space) principle — let elements breathe.

---

## Border Radius

```css
--radius-sm: 8px    /* Buttons, small elements */
--radius-md: 12px   /* Inputs, medium cards */
--radius-lg: 16px   /* Standard cards, main containers */
--radius-xl: 20px   /* Badges, large pill shapes */
```

---

## Shadows

```css
--shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.04)    /* Subtle elevation */
--shadow-md: 0 4px 20px rgba(0, 0, 0, 0.04)   /* Card default */
--shadow-lg: 0 8px 32px rgba(0, 0, 0, 0.08)   /* Card hover / elevated */
```

Shadows are always soft and diffused. Never harsh.

---

## Components

### Card
```
┌─────────────────────────────────┐
│  .card / .card-static           │
│  background: var(--color-card)  │
│  border: 1px sage-border-light  │
│  border-radius: 16px            │
│  padding: 24px                  │
│  shadow: --shadow-md            │
│                                 │
│  .card hover → translateY(-2px) │
│  .card-static → no hover        │
└─────────────────────────────────┘
```

- Use `.card` when the card is clickable/interactive
- Use `.card-static` for content-only cards (settings, forms)
- Padding: `var(--space-6)` (24px)
- Border: `1px solid var(--color-sage-border-light)`

### Button
```
┌───────────────────┐
│  .btn .btn-primary │  sage bg, white text
│  .btn .btn-secondary │  transparent, sage border
│  .btn .btn-ghost   │  transparent, no border
│  .btn .btn-delete  │  transparent, red border
└───────────────────┘
```

| Variant | Background | Text | Border |
|---------|-----------|------|--------|
| primary | `var(--color-sage)` | white | none |
| secondary | transparent | `--color-text-primary` | `--color-sage-border` |
| ghost | transparent | `--color-text-secondary` | none |
| delete | transparent | `--color-critical` | `--color-critical` |

- Border-radius: `var(--radius-md)` (12px)
- Padding: `12px 24px` (md size)
- Hover: darker shade, primary gets `#7a8359`
- Active: `scale(0.98)` press feedback

### Sizes
| Size | Padding | Font |
|------|---------|------|
| sm | `8px 16px` | 13px |
| md | `12px 24px` | 14px |
| lg | `16px 32px` | 16px |

### Input
```css
.input {
  padding: 12px 16px;
  border: 1px solid var(--color-sage-border);
  border-radius: var(--radius-md);  /* 12px */
  background: var(--color-white);
  font-size: 14px;
}
.input:focus {
  border-color: var(--color-sage);
  box-shadow: 0 0 0 3px var(--color-sage-light);
}
```

### Badge
```css
.badge {
  padding: 4px 12px;
  border-radius: var(--radius-xl);  /* 20px pill */
  font-size: 13px;
  font-weight: 500;
}
```

| Variant | Background | Text |
|---------|-----------|------|
| sage | `--color-sage-light` | `--color-sage` |
| success | `rgba(39,174,96,0.1)` | `--color-success` |
| warning | `rgba(243,156,18,0.1)` | `--color-warning` |
| critical | `rgba(231,76,60,0.1)` | `--color-critical` |

### Progress Bar
```css
height: 8px;
background: var(--color-sage-light);
border-radius: 4px;

/* Fill */
background: linear-gradient(90deg, var(--color-sage), #7a8359);
transition: width 0.5s ease;
```

---

## Layout Patterns

### Page Container
```css
padding: var(--space-6);  /* 24px */
max-width: 1200px;
margin: 0 auto;
```

### Settings Grid
```css
display: grid;
grid-template-columns: 1fr 1fr 1fr;
gap: var(--space-6);

@media (max-width: 900px) {
  grid-template-columns: 1fr;
}
```

### Two Column (Content + Sidebar)
```css
display: grid;
grid-template-columns: 2fr 1fr;
gap: var(--space-6);
```

### Header
```css
padding: 20px 24px;
border-bottom: 1px solid var(--color-sage-border-light);
background: var(--color-card);
```

---

## Transitions

```css
--transition-fast: 0.2s ease    /* Hover, press */
--transition-normal: 0.3s ease  /* Panel, expand */
```

- All interactive elements use `transition: all 0.2s ease`
- Hover lift: `transform: translateY(-2px)`
- Press feedback: `transform: scale(0.98)`

---

## Landing Page (Public)

The public-facing landing page uses a distinct dark theme:

```
┌────────────────────────────────────────┐
│  Background image (kaizen_background)  │
│  + dark gradient overlay               │
│  + LightRays WebGL animation           │
│                                        │
│      ┌──────────────────────┐          │
│      │  Glassmorphic hero   │          │
│      │  Backdrop blur 10px  │          │
│      │  Sage border 34%     │          │
│      │  Serif headline      │          │
│      │  CTA button (pill)   │          │
│      └──────────────────────┘          │
│                                        │
└────────────────────────────────────────┘
```

- Background: `kaizen_background.png` at 55% opacity over dark gradient
- Hero card: `backdrop-filter: blur(10px)`, `border-radius: 28px`
- CTA button: pill shape (`border-radius: 999px`), sage gradient
- Typography: Cormorant Garamond serif for headlines
- Color scheme: `#f5f1eb` (warm white) on dark

The auth callback page reuses this same dark theme for visual continuity during sign-in.

---

## File Locations

| Concern | File |
|---------|------|
| CSS variables & global styles | `app/src/styles/index.css` |
| Landing page styles | `app/src/styles/public-landing.css` |
| Layout styles | `app/src/components/layout/Layout.css` |
| CardNav styles | `app/src/components/layout/CardNav.css` |
| Card component | `app/src/components/ui/Card.tsx` |
| Button component | `app/src/components/ui/Button.tsx` |
| Input component | `app/src/components/ui/Input.tsx` |
| Background image | `app/public/assets/kaizen_background.png` |

---

## Design Principles

1. **Parchment warmth** — No pure white (#FFF) as page background. Use `#F5F1EB`.
2. **Sage accent** — `#8B9467` is the only brand color. Use it sparingly.
3. **Ink hierarchy** — Text importance is conveyed by darkness: primary > secondary > muted.
4. **Soft elevation** — Shadows are always gentle (0.04 alpha). Never harsh drop shadows.
5. **Generous spacing** — Prefer larger spacing jumps. Elements should breathe.
6. **Consistent radius** — Cards: 16px. Inputs/buttons: 12px. Badges: 20px pill. Small: 8px.
7. **Serif for ceremony** — Serif font (Cormorant Garamond) is reserved for public/landing pages only. The app uses system sans-serif.
8. **No emoji in data** — Use colored dots, badges, and bars instead of emoji for status indicators.
