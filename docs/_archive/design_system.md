# Axtra Console: Design Handover Documentation
**Author:** Senior Design & Engineering Lead
**Version:** 1.0.0
**Status:** Handover Final

## 1. Design Philosophy
The Axtra Console is built on the principle of **"High-Velocity Utility."** In a call center environment, cognitive load is the enemy. Our UI must be invisible where possible and loud where necessary. 

The aesthetic is inspired by high-end productivity tools (Raycast, ElevenLabs, Vercel) but specialized for the high-pressure environment of realtime call coaching.

### Core Principles
- **Clarity over Decoration:** Every border and shadow must serve a structural purpose.
- **Micro-Feedback:** Interactive elements use subtle transitions (200ms ease-in-out) to confirm intent without distracting.
- **Information Density:** We prioritize data-rich components (KPI grids) while maintaining breathing room via a consistent 4px/8px grid system.

---

## 2. Color System
We use a **Light-Mode First** approach to maintain high readability during 8-hour shifts.

### Primary Palette
| Role | Color Name | HEX | Usage |
| :--- | :--- | :--- | :--- |
| **Brand/Action** | Indigo 600 | `#4F46E5` | Primary buttons, active tabs, progress bars. |
| **Background** | Slate 50 | `#F8FAFC` | Main app background to reduce eye strain. |
| **Surface** | White | `#FFFFFF` | Component cards, sidebar, header. |
| **Border** | Gray 200 | `#E5E7EB` | Defining structural boundaries. |

### Semantic Colors
- **Success:** Emerald 500 (`#10B981`) — Used for "Copilot Online" and high-performance metrics.
- **Warning:** Amber 500 (`#F59E0B`) — Used for "Medium" difficulty and script gaps.
- **Error/Alert:** Rose 500 (`#F43F5E`) — Used for "Hard" difficulty, escalations, and compliance risks.

---

## 3. Typography
**Font Family:** [Inter](https://fonts.google.com/specimen/Inter)
Inter was selected for its exceptional legibility at small sizes (10px-12px), which is critical for our KPI subtexts and labels.

- **Headings:** Bold (700), Tracking -0.025em.
- **Body:** Medium (500) for UI elements, Regular (400) for descriptive text.
- **Monospace Labels:** We use uppercase tracking-wider (0.05em) for category headers to create clear visual separators.

---

## 4. Component Architecture & Behavior

### A. The Sidebar (`Sidebar.tsx`)
The sidebar acts as the primary navigational anchor. 
- **Behavior:** It is persistent on desktop but should collapse to a drawer on mobile.
- **Hierarchy:** Groups are categorized by "Training", "Assist", "Quality", and "Intelligence" to reflect the user's workflow stages.
- **Interaction:** Active states use `bg-gray-100` and `text-gray-900`. Hover states are subtle `bg-gray-50`.

### B. The KPI Grid (`Dashboard.tsx > MetricCard`)
The most vital part of the dashboard.
- **Visual Clue:** A 2px Indigo bottom border on the first card anchors the view.
- **Logic:** Each card displays a high-level stat, a secondary comparison (delta), and is separated by a 1px border.
- **Responsive:** On mobile, these wrap into a 2-column grid.

### C. Scenario Items (`ScenarioItem`)
Interactive cards representing simulations.
- **Feedback:** On hover, the `ArrowRight` icon translates 4px to the right to signify clickability.
- **Badges:** Difficulty badges use a low-opacity background of the semantic color to ensure text remains the focal point.

### D. Skill Velocity Card
Unlike the dark-mode predecessor, we’ve shifted to a **High-Contrast White** card to maintain visual consistency. 
- **Shadow:** Uses a subtle `shadow-sm` with a custom indigo glow on the progress bar to imply AI "energy."

---

## 5. Interaction & Motion
- **Entry Animations:** Dashboard metrics should ideally counter-animate from 0 to their target value on mount (Post-MVP).
- **State Changes:** Tab switching uses a sliding bottom border indicator. This provides a physical sense of "location" within the view.

---

## 6. Closing Notes for the Team
The Axtra Console is designed to grow. When adding new modules:
1. **Reuse the Grid:** Stick to the `max-w-[1200px]` container.
2. **Iconography:** Stick to `lucide-react`. Ensure icons are always 18px in the sidebar and 14px/16px in cards.
3. **Labels:** If a label is purely metadata, use `text-[11px] font-semibold text-gray-400 uppercase tracking-tight`.

It has been a pleasure setting the visual foundations for Axtra. Keep the focus on the operator.

*Stay Sharp.*
