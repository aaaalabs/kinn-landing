# KINN Brand Styleguide
**Version 1.0 | January 2025**

> "Simplicity is not the absence of clutter. It's about bringing order to complexity."
> — Jony Ive

---

## Design Philosophy

### Core Principles

**Minimal. Elegant. Zeitlos.**

1. **Less is More** - Every element must earn its place
2. **Form Follows Function** - Design serves purpose, not decoration
3. **Subtle Depth** - Use shadows and gradients sparingly for hierarchy
4. **Clear Hierarchy** - Typography and spacing create natural flow
5. **Timeless** - Avoid trends, embrace classic simplicity

### No Emojis Policy

❌ **Never use emojis in:**
- Headlines
- Body copy
- Buttons
- Navigation
- Status indicators

✅ **Use instead:**
- SVG icons
- Text labels
- Proper punctuation
- Typography for emphasis

**Why:** Emojis are trendy, not timeless. They trigger spam filters. They lack professional polish.

---

## Logo

### Primary Logo

**SVG Code:**
```svg
<svg viewBox="0 0 931.35 308.55" xmlns="http://www.w3.org/2000/svg">
  <polygon points="495.04 20.27 569.04 153.27 569.04 20.27 654.04 20.27 654.04 288.27 572.54 288.27 498.04 159.27 498.04 288.27 416.04 288.27 416.04 20.27 495.04 20.27"/>
  <path d="M682.04,20.27l78.89.11,73.11,133.89V20.27h81v268h-80l-72-130v130h-78.5c-.61,0-1.53-.8-2.5,0V20.27Z"/>
  <polygon points="100.04 20.27 100.04 136.27 160.54 20.27 256.04 20.27 182.26 145.61 262.04 288.27 166.54 288.27 100.04 159.27 100.04 288.27 21.04 288.27 21.04 20.27 100.04 20.27"/>
  <path d="M359.04,20.27v265.5c0,.31,1.37,1.42,1,2.5h-82V20.27h81Z"/>
</svg>
```

### Logo Usage

**Size Guidelines:**
- Landing Page: `width: 420px` (max 80% viewport)
- Success Page: `width: 280px` (max 70% viewport)
- Admin Dashboard: `width: 280px` (max 70% viewport)
- Mobile: Reduce proportionally

**Styling:**
```css
.logo {
  filter: drop-shadow(0 4px 16px rgba(0,0,0,0.06));
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.logo:hover {
  transform: scale(1.02);
}
```

**Clear Space:**
- Minimum 2rem margin-bottom
- Never place text or other elements too close

---

## Typography

### Font Family

**Primary:** Work Sans
**Import:**
```html
<link href="https://fonts.googleapis.com/css2?family=Work+Sans:wght@300;400;500;600;700;900&display=swap" rel="stylesheet">
```

**Usage:**
```css
font-family: 'Work Sans', system-ui, -apple-system, sans-serif;
```

### Weights

| Weight | Usage |
|--------|-------|
| 300    | Light headlines (use sparingly) |
| 400    | Body text, subtitles |
| 500    | Labels, secondary emphasis |
| 600    | Buttons, strong emphasis |
| 700    | Primary headlines |
| 900    | Ultra-bold (use very sparingly) |

### Type Scale

```css
/* Headlines */
h1 {
  font-size: 2rem;           /* 32px */
  font-weight: 700;
  color: #2C3E50;
  letter-spacing: 0.02em;
  line-height: 1.3;
}

h2 {
  font-size: 1.5rem;         /* 24px */
  font-weight: 600;
  color: #2C3E50;
  letter-spacing: 0.01em;
  line-height: 1.4;
}

h3 {
  font-size: 1.125rem;       /* 18px */
  font-weight: 500;
  color: #4A90E2;
  letter-spacing: 0.01em;
  line-height: 1.5;
}

/* Body */
.subtitle {
  font-size: 1rem;           /* 16px */
  font-weight: 400;
  color: #6B6B6B;
  letter-spacing: 0.02em;
  line-height: 1.5;
}

body {
  font-size: 1rem;           /* 16px */
  font-weight: 400;
  color: #3A3A3A;
  line-height: 1.618;        /* Golden ratio */
}

/* Meta */
.meta {
  font-size: 0.875rem;       /* 14px */
  color: #999;
}

/* Footer */
.footer {
  font-size: 0.75rem;        /* 12px */
  color: #ccc;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-weight: 500;
}
```

### Mobile Adjustments

```css
@media (max-width: 640px) {
  h1 { font-size: 1.5rem; }
  h2 { font-size: 1.25rem; }
  .subtitle { font-size: 0.9375rem; }
}
```

---

## Color Palette

### Primary Colors

```css
/* Brand Mint (Primary CTA) */
--mint-primary: #5ED9A6;
--mint-hover: #4EC995;
--mint-active: #3EB885;

/* Text */
--text-primary: #3A3A3A;
--text-heading: #2C3E50;
--text-subtitle: #6B6B6B;
--text-meta: #999;
--text-footer: #ccc;

/* Backgrounds */
--bg-white: #ffffff;
--bg-subtle: #fafcfb;
```

### Color Usage

**Do:**
- Use Bold Mint (#5ED9A6) for primary CTAs
- Use dark grays (#2C3E50, #3A3A3A) for text
- Use light grays (#6B6B6B, #999) for secondary text

**Don't:**
- Use pastel mint (#E0EEE9) - deprecated
- Use pure black (#000) for large text blocks
- Mix too many colors

### Gradients

**Background Gradient:**
```css
background: linear-gradient(180deg, #ffffff 0%, #fafcfb 100%);
```

**Neural Network Effect:**
```css
body::before {
  content: '';
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background:
    radial-gradient(circle at 20% 30%, rgba(94,217,166,0.08) 0%, transparent 50%),
    radial-gradient(circle at 80% 70%, rgba(94,217,166,0.05) 0%, transparent 50%);
  pointer-events: none;
  z-index: -1;
}
```

---

## Buttons

### Primary Button (Bold Mint)

```css
.cta-button {
  font-family: 'Work Sans', sans-serif;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.625rem 0.75rem;
  background: #5ED9A6;
  color: #000;
  text-decoration: none;
  border-radius: 0.75rem;
  font-size: 0.875rem;
  font-weight: 600;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
  letter-spacing: 0.01em;
}

.cta-button:hover {
  background: #4EC995;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(94, 217, 166, 0.25);
}

.cta-button:active {
  background: #3EB885;
  transform: translateY(0);
}
```

### Secondary Button

```css
.secondary-button {
  background: rgba(255, 255, 255, 0.8);
  color: #6B6B6B;
  border: 1px solid rgba(0, 0, 0, 0.12);
}

.secondary-button:hover {
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  color: #3A3A3A;
}
```

### Button Sizing

```css
/* Default */
padding: 0.625rem 0.75rem;
font-size: 0.875rem;

/* Large (Success Page) */
padding: 1rem 2rem;
font-size: 1rem;
max-width: 360px;

/* Small (Admin) */
padding: 8px 16px;
font-size: 0.875rem;
```

---

## Spacing

### Scale (8px base unit)

```css
--space-xs: 0.25rem;  /* 4px */
--space-sm: 0.5rem;   /* 8px */
--space-md: 1rem;     /* 16px */
--space-lg: 1.5rem;   /* 24px */
--space-xl: 2rem;     /* 32px */
--space-2xl: 3rem;    /* 48px */
--space-3xl: 4rem;    /* 64px */
```

### Common Patterns

**Section Spacing:**
```css
margin-bottom: 3rem;  /* Between major sections */
```

**Element Spacing:**
```css
gap: 0.75rem;         /* Between related items */
margin-bottom: 1rem;  /* Between paragraphs */
```

**Page Padding:**
```css
padding: 2rem;        /* Desktop */
padding: 1.5rem;      /* Mobile */
```

---

## Shadows

### Elevation Levels

```css
/* Subtle (Logo) */
filter: drop-shadow(0 4px 16px rgba(0,0,0,0.06));

/* Card */
box-shadow: 0 4px 16px rgba(0, 0, 0, 0.04);

/* Button Hover */
box-shadow: 0 8px 20px rgba(94, 217, 166, 0.3);

/* Modal */
box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);

/* Status Indicator */
box-shadow: 0 8px 24px rgba(94, 217, 166, 0.25);
```

**Guidelines:**
- Use sparingly
- Mint tint for branded elements
- Neutral gray for content elements
- Increase blur radius, not opacity

---

## Components

### Cards

```css
.card {
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(10px);
  border-radius: 1rem;
  padding: 2rem;
  border: 1px solid rgba(0, 0, 0, 0.06);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.04);
}
```

**Usage:**
- Subtle glassmorphism effect
- Use for grouped content
- Don't overuse - preserve hierarchy

### Status Indicator

```css
.status-indicator {
  width: 64px;
  height: 64px;
  margin: 0 auto 1.5rem;
  border-radius: 50%;
  background: linear-gradient(135deg, #5ED9A6 0%, #4EC995 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8px 24px rgba(94, 217, 166, 0.25);
  animation: fadeInScale 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.status-indicator svg {
  width: 32px;
  height: 32px;
  stroke: white;
  stroke-width: 3;
  stroke-linecap: round;
  stroke-linejoin: round;
  fill: none;
}
```

**SVG Icons:**
```html
<!-- Checkmark -->
<svg viewBox="0 0 24 24">
  <polyline points="20 6 9 17 4 12"></polyline>
</svg>

<!-- Info -->
<svg viewBox="0 0 24 24">
  <circle cx="12" cy="12" r="10"></circle>
  <line x1="12" y1="8" x2="12" y2="12"></line>
  <line x1="12" y1="16" x2="12.01" y2="16"></line>
</svg>
```

### Collapsible Details

```css
details {
  margin-top: 2rem;
  padding: 1.5rem;
  background: rgba(255, 255, 255, 0.6);
  border-radius: 0.75rem;
  border: 1px solid rgba(0, 0, 0, 0.06);
  text-align: left;
}

summary {
  cursor: pointer;
  font-weight: 500;
  color: #6B6B6B;
  font-size: 0.9375rem;
  user-select: none;
  transition: color 0.2s ease;
}

summary:hover {
  color: #3A3A3A;
}

details[open] summary {
  margin-bottom: 1rem;
  color: #2C3E50;
}
```

---

## Animations

### Transitions

**Standard Easing:**
```css
transition: all 0.2s ease;
```

**Bounce (for brand elements):**
```css
transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
```

### Keyframes

**Fade In Scale:**
```css
@keyframes fadeInScale {
  from {
    opacity: 0;
    transform: scale(0.8);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

animation: fadeInScale 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
```

**Subtle Hover:**
```css
transform: translateY(-2px);
/* For buttons on hover */
```

---

## Responsive Design

### Breakpoints

```css
/* Mobile First */
@media (max-width: 640px) {
  /* Small phones */
}

@media (min-width: 641px) and (max-width: 1024px) {
  /* Tablets */
}

@media (min-width: 1025px) {
  /* Desktop */
}
```

### Mobile Optimizations

**Typography:**
- Reduce h1 from 2rem to 1.5rem
- Reduce padding from 2rem to 1.5rem
- Hide decorative elements

**Logo:**
- Reduce from 280px to 200px
- Maintain drop-shadow

**Buttons:**
- Reduce padding slightly
- Consider full-width for primary actions

**Forms:**
- Larger touch targets (min 44px height)
- Increase input font-size to 16px (prevents iOS zoom)

---

## Forms

### Input Fields

```css
input, textarea {
  width: 100%;
  padding: 12px 16px;
  font-size: 1rem;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-family: 'Work Sans', sans-serif;
  transition: border-color 0.2s ease;
}

input:focus, textarea:focus {
  outline: none;
  border-color: #5ED9A6;
}

/* Prevent iOS zoom */
@media (max-width: 640px) {
  input, textarea {
    font-size: 16px;
  }
}
```

### Labels

```css
label {
  display: block;
  font-weight: 500;
  margin-bottom: 0.5rem;
  color: #2C3E50;
  font-size: 0.9375rem;
}
```

---

## Code Style

### Code Blocks

```css
code {
  display: inline-block;
  background: rgba(0, 0, 0, 0.04);
  padding: 0.375rem 0.625rem;
  border-radius: 0.375rem;
  font-size: 0.8125rem;
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Courier New', monospace;
  color: #2C3E50;
  word-break: break-all;
}
```

---

## Layout

### Container

```css
.container {
  max-width: 960px;   /* Landing */
  max-width: 640px;   /* Success */
  max-width: 1200px;  /* Admin */
  width: 100%;
  margin: 0 auto;
  text-align: center;
}
```

### Centering

**Vertical:**
```css
body {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
}
```

**Horizontal:**
```css
margin: 0 auto;
text-align: center;
```

---

## Best Practices

### Do

✅ Use Work Sans font family everywhere
✅ Use Bold Mint (#5ED9A6) for primary CTAs
✅ Use SVG icons instead of emojis
✅ Maintain clear hierarchy with typography
✅ Use subtle shadows for depth
✅ Keep animations smooth (0.2s ease)
✅ Test on mobile (font-size 16px minimum)
✅ Use semantic HTML
✅ Include proper alt text and ARIA labels

### Don't

❌ Use emojis in any UI elements
❌ Use deprecated pastel mint (#E0EEE9)
❌ Mix system-ui with Work Sans (choose one)
❌ Use pure black (#000) for text
❌ Overuse shadows or gradients
❌ Create jarring animations
❌ Ignore mobile breakpoints
❌ Nest more than 3 levels deep in code
❌ Forget to test email rendering

---

## Email Design

### Special Considerations

**Spam Prevention:**
- NO emojis in subject lines
- NO emojis in body copy
- Only HTTPS links (no webcal:// in emails)
- Simple, clean structure
- Single focused CTA
- Professional tone
- Clear sender (thomas@kinn.at)

**Template Structure:**
```html
<body style="font-family: 'Work Sans', sans-serif; background: #ffffff;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 560px; margin: 0 auto;">
    <tr>
      <td style="padding: 40px 20px;">
        <!-- Content here -->
      </td>
    </tr>
  </table>
</body>
```

**Button:**
```html
<a href="${url}" style="display: inline-block; padding: 14px 32px; background-color: #5ED9A6; color: #000; text-decoration: none; border-radius: 12px; font-size: 16px; font-weight: 600;">
  Button Text
</a>
```

---

## Accessibility

### WCAG 2.1 AA Compliance

**Color Contrast:**
- Text (#3A3A3A) on White: 10.16:1 ✅
- Subtitle (#6B6B6B) on White: 5.74:1 ✅
- Meta (#999) on White: 2.85:1 ⚠️ (use for decorative only)

**Focus States:**
```css
:focus {
  outline: 2px solid #5ED9A6;
  outline-offset: 2px;
}

:focus:not(:focus-visible) {
  outline: none;
}
```

**Keyboard Navigation:**
- All interactive elements must be keyboard accessible
- Tab order must be logical
- Escape key closes modals

**Screen Readers:**
```html
<button aria-label="Close modal">×</button>
<img src="logo.svg" alt="KINN Logo">
```

---

## File Organization

```
/public/
  favicon.svg
  apple-touch-icon.png
  manifest.json

/pages/
  success.html
  privacy.html
  agb.html

/admin/
  index.html

/api/
  signup.js
  confirm.js
  calendar.ics.js
  /admin/
    events.js
    subscribers.js

/styles/ (if separate)
  variables.css
  typography.css
  components.css
```

---

## Version History

**v1.0 - January 2025**
- Initial brand styleguide
- Based on landing page design
- Jony Ive minimal aesthetic
- Bold mint CTA color
- No emojis policy
- Work Sans typography
- Comprehensive component library

---

## Credits

**Design Philosophy:** Inspired by Jony Ive's approach to simplicity
**Typography:** Work Sans by Wei Huang
**Created:** KINN Team + Claude Code
**License:** Internal use only - KINN brand assets

---

**"Design is not just what it looks like and feels like. Design is how it works."**
— Steve Jobs
