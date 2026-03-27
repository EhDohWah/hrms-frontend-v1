# RecordView Component & Preview Modal

> Reusable record view component for displaying detailed module records in a styled, print-ready card format. First implemented for Grants, designed to be reused by Training, Employee, Interview, Leave, and other modules.

---

## Files

| File | Purpose |
|------|---------|
| `src/components/common/RecordView.vue` | Reusable record card component (all 6 section types) |
| `src/views/grants/GrantView.vue` | Standalone grant record page (kept as fallback, not routed) |
| `src/views/grants/GrantListView.vue` | Grant list — contains the preview modal integration |

---

## How It Works

The RecordView is displayed inside an **Ant Design modal** (`<a-modal>`) on the list view. Clicking "View" on a table row fetches the full record via API and opens the modal.

### Modal Setup (GrantListView pattern)

```vue
<a-modal
  v-model:open="viewModalVisible"
  :footer="null"
  :width="'min(95vw, 920px)'"
  :body-style="{ padding: 0, background: 'transparent' }"
  :closable="false"
  :mask-closable="true"
  wrap-class-name="record-view-modal"
  centered
>
  <div v-if="viewLoading" class="view-loading-state">
    <a-spin tip="Loading record..." />
  </div>
  <div v-else-if="viewGrant" class="view-modal-wrap">
    <button class="view-close-btn" @click="viewModalVisible = false" aria-label="Close">
      <i class="ti ti-x"></i>
    </button>
    <RecordView
      :org="orgConfig"
      :title="grant.name"
      :ref-id="grant.code"
      icon="report-money"
      badge="Grant Record"
      :status="statusKey"
      :status-label="grant.status"
      :status-meta="statusMeta"
      :sections="sections"
      @print="window.print()"
      @edit="openEdit"
    />
  </div>
</a-modal>
```

### Key Modal Decisions

| Decision | Why |
|----------|-----|
| `:closable="false"` | Ant's built-in close button positions relative to `.ant-modal-content` (the transparent wrapper), not the RecordView card. It ends up outside the card boundary. |
| Custom `.view-close-btn` | Positioned inside `.view-modal-wrap` which matches the card's `max-width: 880px`, so the X sits inside the navy header. |
| `wrap-class-name="record-view-modal"` | Targets unscoped CSS overrides to strip Ant's modal chrome (padding, background, shadow) without affecting other modals. |
| `centered` | Centers short modals vertically. For tall content, the wrap scrolls naturally. |
| `:mask-closable="true"` | Clicking the backdrop always closes — important when the X button scrolls off-screen on long lists. |

---

## Modal CSS Overrides

These **must be unscoped** (separate `<style>` block without `scoped`) because they target Ant Design's internal elements rendered outside Vue's scoped style boundary:

```css
/* Let the wrap scroll naturally for tall content */
.record-view-modal .ant-modal-wrap {
  overflow: auto;
}

/* Breathing room from viewport edges */
.record-view-modal .ant-modal {
  padding: 24px 0;
}

/* Strip Ant chrome — RecordView provides its own styling */
.record-view-modal .ant-modal-content {
  padding: 0 !important;
  background: transparent !important;
  box-shadow: none !important;
  border-radius: 10px !important;
  overflow: visible !important;  /* Override global.less overflow:hidden */
}

.record-view-modal .ant-modal-body {
  padding: 0 !important;
  background: transparent !important;
}

.record-view-modal .ant-modal-header {
  display: none !important;
}

/* Hide Ant's close button — we use our own */
.record-view-modal .ant-modal-close {
  display: none !important;
}
```

### Why `overflow: visible !important`

`global.less` line 244 sets `.ant-modal-content { overflow: hidden }` globally. This must be overridden because:
- The RecordView card handles its own `overflow: hidden` and `border-radius`
- Without `visible`, the custom close button would be clipped

---

## Close Button

Scoped styles (inside the view's `<style scoped>`):

```css
.view-modal-wrap {
  position: relative;
  max-width: 880px;    /* Must match RecordView's .record-card max-width */
  margin: 0 auto;
}

.view-close-btn {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 10;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  border: none;
  background: rgba(255,255,255,0.18);
  backdrop-filter: blur(8px);
  color: rgba(255,255,255,0.9);
  font-size: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}
```

### Critical: Width Matching

`.view-modal-wrap` **must** have `max-width: 880px; margin: 0 auto` to match the RecordView card's dimensions. Without this, the wrap is wider than the card (modal width is 920px), and the close button floats outside the card's right edge.

### Critical: ref-id Clearance

In `RecordView.vue`, `.header-ref` has `margin-right: 36px` to leave room for the close button in the top-right corner. Without this, the ref-id pill and close button overlap.

---

## RecordView Props

```js
defineProps({
  org:           Object,   // { short, name, subtitle, theme } — required
  title:         String,   // Record title — required
  refId:         String,   // e.g. 'S0028' — shown as pill in header
  icon:          String,   // Tabler icon name without 'ti-' prefix (default: 'file-text')
  badge:         String,   // e.g. 'Grant Record' (default: 'Record')
  status:        String,   // CSS key: 'active' | 'expired' | 'ending-soon'
  statusLabel:   String,   // Display text: 'Active' | 'Expired' | 'Ending Soon'
  statusMeta:    Array,    // [{ icon: 'calendar', text: 'Ends 30 Sep 2028' }]
  sections:      Array,    // Section configs — required (see below)
  footerActions: Array,    // Extra buttons: [{ icon, label, handler }]
})

defineEmits(['print', 'edit'])
```

---

## Section Types

### 1. `fields` — Two-column label/value grid

```js
{
  title: 'Grant Overview',
  icon: 'report-money',
  type: 'fields',
  fields: [
    { label: 'Grant Code', value: 'S0028', mono: true },
    { label: 'Organization', value: 'SMRU' },
    { label: 'Description', value: 'Long text...', fullWidth: true },
    { label: 'Notes', value: null, muted: true },  // shows '—'
  ]
}
```

| Field Option | Effect |
|-------------|--------|
| `mono: true` | JetBrains Mono font |
| `muted: true` | Gray italic text |
| `fullWidth: true` | Spans both columns |

### 2. `table` — Data table with optional summary row

```js
{
  title: 'Grant Items', icon: 'list-details', type: 'table',
  headers: ['#', 'Position', 'Budgetline', 'LOE', 'Salary', 'Benefit'],
  aligns: { 0: 'text-center', 3: 'text-center', 4: 'text-right', 5: 'text-right' },
  monoCols: [0, 2, 3, 4, 5],
  rows: [
    ['1', 'Field Medic', 'BL-1001', '1.00', 'THB 25,000.00', 'THB 5,000.00'],
  ],
  summary: {
    label: 'Total (5 items)',
    colspan: 3,
    values: ['4.20', 'THB 105,700.00', 'THB 21,140.00'],
  }
}
```

### 3. `notes` — Freeform text block

```js
{ title: 'Notes', icon: 'notes', type: 'notes', content: 'Some text here...' }
```

### 4. `approval` — Approval timeline with step dots

```js
{
  title: 'Approval', icon: 'check', type: 'approval',
  steps: [
    { label: 'Supervisor', name: 'John Doe', approved: true, date: '15 Jan 2026' },
    { label: 'HR Director', name: 'Jane Smith', approved: false, date: null },
  ]
}
```

### 5. `avatar_fields` — Profile header with avatar + field grid

```js
{
  title: 'Employee', icon: 'user', type: 'avatar_fields',
  initials: 'JD', name: 'John Doe', subtitle: 'Field Medic',
  fields: [
    { label: 'Employee ID', value: 'EMP-001', mono: true },
    { label: 'Department', value: 'Clinical' },
  ]
}
```

### 6. `timeline` — Employment/career history timeline

```js
{
  title: 'Career History', icon: 'timeline', type: 'timeline',
  events: [
    { date: 'Jan 2024 — Present', title: 'Senior Medic', detail: 'SMRU Mae Sot', status: 'current' },
    { date: 'Jun 2020 — Dec 2023', title: 'Field Medic', detail: 'SMRU Wang Pha', status: 'past' },
  ]
}
```

---

## Organization Theming

The `org.theme` prop sets CSS variables on the card root via `.theme-smru` / `.theme-bhf`:

| Theme | Primary | Secondary | Accent | Light | Stripe |
|-------|---------|-----------|--------|-------|--------|
| `smru` | `#002147` | `#0d3a6e` | `#1a5296` | `#e6edf5` | `#f0f4f9` |
| `bhf` | `#3157A5` | `#4a71b8` | `#6389c7` | `#eaf0f8` | `#f2f6fb` |

Organization config mapping:

```js
const orgMap = {
  SMRU: {
    short: 'SMRU',
    name: 'Shoklo Malaria Research Unit',
    subtitle: 'Faculty of Tropical Medicine, Mahidol University',
    theme: 'smru'
  },
  BHF: {
    short: 'BHF',
    name: 'Borderland Health Foundation',
    subtitle: 'มูลนิธิ เดอะ บอร์เดอร์แลนด์ เฮลท์',
    theme: 'bhf'
  },
}
```

---

## Dependencies

| Package | Purpose |
|---------|---------|
| `@tabler/icons-webfont` | Icon font for section icons, close button, footer actions |
| Source Serif 4 (Google Fonts) | Display font for headings — loaded via CSS `@import` in RecordView |

Tabler Icons imported globally in `src/main.js`:
```js
import '@tabler/icons-webfont/dist/tabler-icons.min.css'
```

---

## Backend Requirements

The API resource must include computed attributes for the record view to work. Example for Grant:

```php
// GrantResource.php
return [
    'id' => $this->id,
    'code' => $this->code,
    'name' => $this->name,
    // ... regular fields ...

    // Computed attributes (required for RecordView)
    'status' => $this->status,
    'days_until_expiration' => $this->days_until_expiration,
    'is_active' => $this->is_active,
    'is_hub_grant' => $this->isHubGrant(),
    'grant_items_count' => $this->grant_items_count ?? $this->grantItems->count(),

    'created_by' => $this->created_by,
    'updated_by' => $this->updated_by,
    'created_at' => $this->created_at,
    'updated_at' => $this->updated_at,
];
```

---

## Reusing for Other Modules

To add a preview modal to another list view (e.g., Training, Interview):

1. **Import** `RecordView` component
2. **Add modal markup** — copy the `<a-modal>` block with `wrap-class-name="record-view-modal"`
3. **Add the wrap + close button** — `.view-modal-wrap` with `max-width: 880px`
4. **Add scoped styles** — `.view-modal-wrap`, `.view-close-btn`, `.view-loading-state`
5. **Add unscoped styles** — the `.record-view-modal` Ant overrides (can be extracted to a shared file)
6. **Map API data to props** — `org`, `title`, `refId`, `status`, `statusMeta`, `sections`
7. **Add "View" button** to list table actions column

The `sections` array is the main integration point — map your module's API response fields to the section type configs documented above.
