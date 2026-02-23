# Design System

UI components, patterns, and visual guidelines for Axtra Console.

---

## 🎨 Color Palette

### Brand Colors

| Token | Value | Usage |
|-------|-------|-------|
| Primary | `indigo-600` (#4F46E5) | Primary buttons, active states |
| Success | `emerald-500` (#10B981) | Success states, checkmarks |
| Warning | `amber-500` (#F59E0B) | Warnings, pending |
| Error | `rose-500` (#F43F5E) | Errors, danger |

### Neutral Colors

| Token | Value | Usage |
|-------|-------|-------|
| Background | `slate-50` (#F8FAFC) | App background |
| Surface | `white` | Cards, panels |
| Border | `gray-200` | Borders, dividers |
| Text Primary | `gray-900` | Main text |
| Text Secondary | `gray-500` | Secondary text |

---

## 🔤 Typography

### Font

- **Family**: Inter (Google Fonts)
- **Weights**: 400, 500, 600, 700

### Scale

| Style | Class | Usage |
|-------|-------|-------|
| Page Title | `text-2xl font-bold` | Page headers |
| Section Title | `text-lg font-semibold` | Section headers |
| Card Title | `text-base font-semibold` | Card headers |
| Body | `text-sm font-medium` | Body text |
| Label | `text-[11px] font-semibold uppercase tracking-tight` | Labels |

---

## 📦 Components

### Button

```tsx
// Primary
<button className="px-4 py-2 bg-indigo-600 text-white rounded-md 
                   hover:bg-indigo-700 transition-colors font-medium text-sm">

// Secondary
<button className="px-4 py-2 bg-white text-gray-700 border border-gray-300 
                   rounded-md hover:bg-gray-50 transition-colors">

// Danger
<button className="px-4 py-2 bg-rose-600 text-white rounded-md 
                   hover:bg-rose-700 transition-colors">

// Disabled
<button className="px-4 py-2 bg-gray-100 text-gray-400 rounded-md 
                   cursor-not-allowed">
```

### Card

```tsx
<div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
  <h3 className="text-lg font-semibold text-gray-900">Card Title</h3>
  <p className="text-sm text-gray-600 mt-2">Card content</p>
</div>
```

### Input

```tsx
<input
  className="w-full px-3 py-2 border border-gray-300 rounded-md 
             focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
             text-sm"
  placeholder="Enter text..."
/>
```

### Badge

```tsx
// Status badges
<span className="px-2 py-1 text-xs font-medium rounded-full 
                 bg-emerald-100 text-emerald-700">
  Active
</span>

<span className="px-2 py-1 text-xs font-medium rounded-full 
                 bg-amber-100 text-amber-700">
  Pending
</span>
```

---

## 📐 Layout Patterns

### Container

```tsx
<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
  {/* Content */}
</div>
```

### Grid

```tsx
// 3-column grid
<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
  <Card />
  <Card />
  <Card />
</div>

// Responsive grid
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
  {/* Cards */}
</div>
```

### Flex

```tsx
// Center content
<div className="flex items-center justify-center">
  
// Between alignment
<div className="flex items-center justify-between">

// Stack
<div className="flex flex-col gap-4">
```

---

## 🎭 States

| State | Class |
|-------|-------|
| Hover | `hover:bg-gray-100` |
| Focus | `focus:ring-2 focus:ring-indigo-500` |
| Active | `active:bg-gray-200` |
| Disabled | `opacity-50 cursor-not-allowed` |
| Loading | `animate-pulse` or spinner |

---

## 📱 Responsive Breakpoints

| Breakpoint | Width |
|------------|-------|
| sm | 640px |
| md | 768px |
| lg | 1024px |
| xl | 1280px |

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
  {/* 1 col mobile, 2 col tablet, 3 col desktop */}
</div>
```
