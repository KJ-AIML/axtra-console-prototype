# Axtra Console - Style Guide

Quick reference for styling Axtra Console components.

---

## Colors

### Primary Colors
```css
/* Brand/Action */
--color-brand: #4F46E5;           /* Indigo 600 */
--color-brand-hover: #4338CA;     /* Indigo 700 */
--color-brand-light: #EEF2FF;     /* Indigo 50 */

/* Background */
--color-bg-app: #F8FAFC;          /* Slate 50 */
--color-bg-surface: #FFFFFF;      /* White */

/* Border */
--color-border: #E5E7EB;          /* Gray 200 */
--color-border-subtle: #F3F4F6;   /* Gray 100 */

/* Text */
--color-text-primary: #111827;    /* Gray 900 */
--color-text-secondary: #6B7280;  /* Gray 500 */
--color-text-muted: #9CA3AF;      /* Gray 400 */
```

### Semantic Colors
```css
/* Success */
--color-success: #10B981;         /* Emerald 500 */
--color-success-bg: #ECFDF5;      /* Emerald 50 */

/* Warning */
--color-warning: #F59E0B;         /* Amber 500 */
--color-warning-bg: #FEF3C7;      /* Amber 100 */

/* Error/Danger */
--color-error: #F43F5E;           /* Rose 500 */
--color-error-bg: #FEF2F2;        /* Rose 50 */

/* Info */
--color-info: #3B82F6;            /* Blue 500 */
--color-info-bg: #EFF6FF;         /* Blue 50 */
```

### Tailwind Classes
```html
<!-- Brand colors -->
bg-indigo-600           text-indigo-600           border-indigo-600
hover:bg-indigo-700      hover:text-indigo-700

<!-- Backgrounds -->
bg-slate-50             bg-white                  bg-gray-100

<!-- Semantic -->
bg-emerald-500          text-emerald-500          border-emerald-500
bg-amber-500            text-amber-500            border-amber-500
bg-rose-500             text-rose-500             border-rose-500
```

---

## Spacing

### Scale
```css
/* Tailwind spacing scale */
--spacing-1: 0.25rem;  /* 4px */
--spacing-2: 0.5rem;   /* 8px */
--spacing-3: 0.75rem;  /* 12px */
--spacing-4: 1rem;     /* 16px */
--spacing-5: 1.25rem;  /* 20px */
--spacing-6: 1.5rem;   /* 24px */
--spacing-8: 2rem;     /* 32px */
--spacing-10: 2.5rem;  /* 40px */
--spacing-12: 3rem;    /* 48px */
```

### Common Spacing Patterns
```html
<!-- Card padding -->
<p-6>           <!-- 24px all around -->
<p-4>           <!-- 16px all around -->
<px-4 py-2>     <!-- 16px horizontal, 8px vertical -->

<!-- Gap between elements -->
<gap-2>         <!-- 8px -->
<gap-4>         <!-- 16px -->
<gap-6>         <!-- 24px -->

<!-- Section spacing -->
<pb-6>          <!-- Padding bottom: 24px -->
<mb-4>          <!-- Margin bottom: 16px -->
<space-y-4>     <!-- Vertical space between children -->
```

---

## Typography

### Font Family
```css
font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
```

### Type Scale
| Usage | Size | Weight | Class |
|-------|------|--------|-------|
| H1 (Page Title) | 24px | 700 | `text-2xl font-bold` |
| H2 (Section) | 18px | 600 | `text-lg font-semibold` |
| H3 (Card Title) | 16px | 600 | `text-base font-semibold` |
| Body | 14px | 400/500 | `text-sm font-medium` |
| Small/Caption | 12px | 500 | `text-xs font-medium` |
| Label/Metadata | 11px | 600 | `text-[11px] font-semibold uppercase tracking-tight` |

### Text Colors
```html
<!-- Primary text -->
text-gray-900          text-black

<!-- Secondary text -->
text-gray-600          text-gray-500

<!-- Muted text -->
text-gray-400

<!-- Brand text -->
text-indigo-600
```

### Common Patterns
```html
<!-- Section label -->
<h3 class="text-[11px] font-semibold text-gray-400 uppercase tracking-tight">
  Dashboard
</h3>

<!-- Card title -->
<h2 class="text-base font-semibold text-gray-900">
  Console Performance
</h2>

<!-- Body text -->
<p class="text-sm text-gray-600">
  Welcome back, Operator Kj
</p>

<!-- Metric value -->
<div class="text-2xl font-bold text-gray-900">
  4m 22s
</div>
<div class="text-xs text-gray-500">
  Avg Handle Time
</div>
```

---

## Components

### Buttons

#### Primary Button
```html
<button class="inline-flex items-center gap-2 px-4 py-2
                 bg-indigo-600 text-white rounded-md
                 hover:bg-indigo-700 transition-colors
                 font-medium text-sm">
  Start Simulation
</button>
```

#### Secondary Button
```html
<button class="inline-flex items-center gap-2 px-4 py-2
                 bg-white text-gray-700 border border-gray-300
                 hover:bg-gray-50 transition-colors
                 font-medium text-sm rounded-md">
  Cancel
</button>
```

#### Icon Button
```html
<button class="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md">
  <Icon className="w-5 h-5" />
</button>
```

### Cards

#### Basic Card
```html
<div class="bg-white rounded-lg border border-gray-200 p-6">
  <!-- Content -->
</div>
```

#### Metric Card (with bottom border accent)
```html
<div class="bg-white rounded-lg border border-gray-200
            border-b-2 border-b-indigo-600 p-6">
  <!-- Content -->
</div>
```

#### Hoverable Card
```html
<div class="bg-white rounded-lg border border-gray-200 p-6
            hover:border-indigo-300 hover:shadow-md
            transition-all cursor-pointer">
  <!-- Content -->
</div>
```

### Badges

#### Solid Badge
```html
<span class="inline-flex items-center px-2 py-1 rounded-md
             text-xs font-medium bg-emerald-100 text-emerald-700">
  Easy
</span>
```

#### Outline Badge
```html
<span class="inline-flex items-center px-2 py-1 rounded-md
             text-xs font-medium border border-gray-300 text-gray-700">
  Alpha
</span>
```

### Status Indicators

#### Online Status
```html
<div class="flex items-center gap-2">
  <span class="w-2 h-2 bg-emerald-500 rounded-full"></span>
  <span class="text-sm text-emerald-600">Copilot Online</span>
</div>
```

#### Warning Status
```html
<div class="flex items-center gap-2">
  <span class="w-2 h-2 bg-amber-500 rounded-full"></span>
  <span class="text-sm text-amber-600">Action Needed</span>
</div>
```

---

## Layout

### Container Widths
```html
<!-- Max width container -->
<div class="max-w-[1200px] mx-auto">

<!-- Sidebar width -->
w-64           /* 256px expanded */
w-20           /* 80px collapsed */

<!-- Content padding -->
p-6            /* 24px - desktop */
p-4            /* 16px - mobile */
```

### Grid Systems
```html
<!-- Dashboard metrics grid -->
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
  <!-- 4 columns on large screens -->
</div>

<!-- Two-column layout -->
<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
  <!-- Content -->
</div>
```

### Flexbox Patterns
```html
<!-- Horizontal centering -->
<div class="flex items-center justify-center">

<!-- Space between -->
<div class="flex items-center justify-between">

<!-- Column direction -->
<div class="flex flex-col gap-4">

<!-- Responsive flex -->
<div class="flex flex-col sm:flex-row gap-4">
```

---

## Icons

### Sizes (lucide-react)
```html
<!-- Sidebar -->
<Icon className="w-5 h-5" />      <!-- 20px -->

<!-- Cards/buttons -->
<Icon className="w-4 h-4" />      <!-- 16px -->
<Icon className="w-5 h-5" />      <!-- 20px -->

<!-- Small badges -->
<Icon className="w-3 h-3" />      <!-- 12px -->
```

### Colors
```html
<!-- Default (inherits text color) -->
<Icon className="text-gray-500" />
<Icon className="text-gray-400" />

<!-- Brand color -->
<Icon className="text-indigo-600" />

<!-- Semantic -->
<Icon className="text-emerald-500" />
<Icon className="text-amber-500" />
<Icon className="text-rose-500" />
```

---

## Borders & Shadows

### Borders
```html
<!-- Default border -->
border border-gray-200

<!-- Subtle border -->
border border-gray-100

<!-- Interactive border -->
hover:border-indigo-300

<!-- Rounded corners -->
rounded          /* 4px */
rounded-md       /* 6px */
rounded-lg       /* 8px */
rounded-xl       /* 12px */
rounded-full     /* 50% circle */
```

### Shadows
```html
<!-- Subtle shadow -->
shadow-sm        /* Small elevation */

<!-- Card shadow -->
shadow           /* Medium elevation -->

<!-- Elevated -->
shadow-lg        /* High elevation -->

<!-- Custom shadow with glow -->
shadow-md shadow-indigo-100/50
```

---

## Animations & Transitions

### Standard Transitions
```html
<!-- Interactive elements -->
transition-colors duration-200
transition-all duration-200

<!-- Hover effects -->
hover:bg-gray-50 hover:text-gray-900
hover:scale-105 active:scale-95
```

### Icon Animations
```html
<!-- Arrow slide on hover -->
<ArrowRight className="transition-transform group-hover:translate-x-1" />
```

---

## Z-Index Scale
```css
/* Base */
z-0     /* Default */
z-10    /* Dropdowns, tooltips */
z-20    /* Modals */
z-30    /* Toast notifications */
z-40    /* Max level */
z-50    /* Critical overlays */
```

---

## Utility Classes Reference

### Common Combinations
```html
<!-- Flex center -->
class="flex items-center justify-center"

<!-- Flex space between -->
class="flex items-center justify-between"

<!-- Card with hover -->
class="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow"

<!-- Truncate text -->
class="truncate text-sm text-gray-600"

<!-- Custom scrollbar (defined in index.css) -->
class="custom-scrollbar overflow-y-auto"

<!-- No scrollbar -->
class="no-scrollbar"
```

---

## Dark Mode (Future)
Not currently implemented, but when adding:
- Use `dark:` prefix for dark mode variants
- Example: `bg-white dark:bg-gray-900`
- Store preference in user store

---

## Quick Reference Card

| Category | Token | Value |
|----------|-------|-------|
| **Brand** | `indigo-600` | `#4F46E5` |
| **Success** | `emerald-500` | `#10B981` |
| **Warning** | `amber-500` | `#F59E0B` |
| **Error** | `rose-500` | `#F43F5E` |
| **Border** | `gray-200` | `#E5E7EB` |
| **Text** | `gray-900` | `#111827` |
| **Bg** | `slate-50` | `#F8FAFC` |
| **Radius** | `rounded-lg` | `8px` |
| **Spacing** | `gap-4` | `16px` |
| **Font** | `Inter` | Google Fonts |
