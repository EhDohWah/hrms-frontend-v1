# Employee Detail Page — Tab Save Behavior UX Plan

**File:** `src/views/employees/EmployeeFormView.vue`
**Scope:** Visual and behavioral separation of form-bound tabs vs. self-contained (inline-save) tabs.

---

## 1. Problem Statement

The employee detail page currently has **8 tabs** that fall into two fundamentally different save models, but the UI presents them identically:

| Group | Tabs | How Data Saves |
|---|---|---|
| **Form tabs** | Basic Info, Identification, Contact & Family, Financial | Bound to the `form` reactive object. Nothing persists until the user clicks the top-level **Save** button. |
| **Live tabs** | Leave Balances, Records, Employment, Funding | Self-contained. Each section has its own modal/action that calls the API immediately. The top **Save** button is **irrelevant** to these tabs. |

**The result:** A user on the Employment tab sees a prominent "Save" button in the header that does nothing. This is:
- **Confusing** — they may click Save expecting to save employment data and get no feedback
- **Trust-eroding** — "Did my changes save? Was I on the wrong tab?"
- **Inconsistent** — "Not Saved" dirty tag appears even when they haven't touched form fields

---

## 2. Solution Overview

Combine two focused changes:

1. **Contextual header** — hide/replace the Save button when on a live tab
2. **Visual tab group separator** — split the tab bar into two labelled groups

Together these communicate the difference **immediately** without tooltips, documentation, or onboarding.

---

## 3. Implementation Plan

### 3.1 — Define Tab Groups (Computed)

Add a constant set and a computed property to `EmployeeFormView.vue` to know which group the active tab belongs to.

```js
// In <script setup> of EmployeeFormView.vue

// Tabs that manage their own data independently — Save button is irrelevant
const LIVE_TABS = new Set(['leave', 'records', 'employment', 'funding'])

const isLiveTab = computed(() => LIVE_TABS.has(activeTab.value))
```

This single computed drives everything else. It's the source of truth.

---

### 3.2 — Contextual Header

The header currently always shows the Save button and the "Not Saved" dirty tag. We need it to **react to the active tab group**.

#### Current header (EmployeeFormView.vue, lines 21–36):
```html
<div class="form-header">
  <div class="form-header-left">
    <h2 class="form-title">{{ pageTitle }}</h2>
    <a-tag v-if="isDirty" color="orange" class="dirty-tag">Not Saved</a-tag>
  </div>
  <div class="form-header-right">
    <a-button
      v-if="canEdit"
      type="primary"
      :loading="saving"
      @click="handleSave"
    >
      Save
    </a-button>
  </div>
</div>
```

#### Updated header — add `v-if="!isLiveTab"` to Save, and inject a live-tab indicator:
```html
<div class="form-header">
  <div class="form-header-left">
    <h2 class="form-title">{{ pageTitle }}</h2>
    <!-- Dirty tag only relevant on form tabs -->
    <a-tag v-if="isDirty && !isLiveTab" color="orange" class="dirty-tag">
      Not Saved
    </a-tag>
    <!-- Live tab badge: replaces dirty tag on independent tabs -->
    <span v-if="isLiveTab" class="live-tab-badge">
      <DatabaseOutlined />
      Saves per action
    </span>
  </div>
  <div class="form-header-right">
    <!-- Save only shown on form tabs -->
    <a-button
      v-if="canEdit && !isLiveTab"
      type="primary"
      :loading="saving"
      @click="handleSave"
    >
      Save
    </a-button>
  </div>
</div>
```

Add `DatabaseOutlined` to the existing icon imports:
```js
import { ArrowLeftOutlined, DatabaseOutlined } from '@ant-design/icons-vue'
```

Add scoped CSS for the badge:
```css
.live-tab-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  font-weight: 500;
  color: var(--color-text-muted);
  background: var(--color-bg-subtle);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-sm);
  padding: 2px 8px;
}
```

**Behaviour summary:**
- On Basic Info / Financial etc → Save button visible, dirty tag visible as normal
- On Records / Employment / Funding → Save button gone, replaced by a quiet `⬢ Saves per action` badge
- The disappearance of Save is the primary signal — it's unmissable

---

### 3.3 — Visual Tab Group Separator

Ant Design's `<a-tabs>` accepts a `tabBarExtraContent` slot which renders content inside the tab bar itself. However, to inject a **divider between tab items**, the cleanest approach is to use a **custom tab label with a separator tab** that is disabled and purely decorative.

#### Strategy: Insert a disabled "divider" tab between the two groups

```html
<a-tabs v-model:activeKey="activeTab" @change="onTabChange">
  <!-- ── Group 1: Form tabs ── -->
  <a-tab-pane key="basic_info" tab="Basic Info">
    <BasicInfoTab :form="form" :readonly="!canEdit" />
  </a-tab-pane>
  <a-tab-pane key="identification" tab="Identification">
    <IdentificationTab :form="form" :readonly="!canEdit" />
  </a-tab-pane>
  <a-tab-pane key="contact_family" tab="Contact & Family">
    <ContactFamilyTab :form="form" :readonly="!canEdit" />
  </a-tab-pane>
  <a-tab-pane key="financial" tab="Financial">
    <FinancialTab :form="form" :readonly="!canEdit" />
  </a-tab-pane>

  <!-- ── Divider (decorative, non-interactive) ── -->
  <a-tab-pane v-if="isEditMode" key="__divider__" disabled>
    <template #tab>
      <span class="tab-group-divider" @click.stop.prevent></span>
    </template>
  </a-tab-pane>

  <!-- ── Group 2: Live / independent tabs ── -->
  <a-tab-pane v-if="isEditMode" key="leave">
    <template #tab>
      <span class="live-tab-label">Leave Balances</span>
    </template>
    <LeaveTab :employee="employee" />
  </a-tab-pane>
  <a-tab-pane v-if="isEditMode" key="records">
    <template #tab>
      <span class="live-tab-label">Records</span>
    </template>
    <RecordsTab :employee="employee" @refresh="loadEmployee" />
  </a-tab-pane>
  <a-tab-pane v-if="isEditMode" key="employment">
    <template #tab>
      <span class="live-tab-label">Employment</span>
    </template>
    <EmploymentTab :employee="employee" @refresh="loadEmployee" />
  </a-tab-pane>
  <a-tab-pane v-if="isEditMode" key="funding">
    <template #tab>
      <span class="live-tab-label">Funding</span>
    </template>
    <FundingTab :employee="employee" @refresh="loadEmployee" />
  </a-tab-pane>
</a-tabs>
```

Make sure the `__divider__` key is excluded from the dirty guard and `allTabs` array:
```js
// existing allTabs — keep as is, divider key is never in this list
const allTabs = ['basic_info', 'identification', 'contact_family', 'financial', 'leave', 'records', 'employment', 'funding']
```

CSS for the divider and live tab labels:
```css
/* Tab group divider — a vertical rule rendered in the tab strip */
.tab-group-divider {
  display: inline-block;
  width: 1px;
  height: 16px;
  background: var(--color-border);
  margin: 0 4px;
  vertical-align: middle;
  pointer-events: none;
}

/* Live tabs get a slightly muted default colour to distinguish from form tabs */
.live-tab-label {
  color: var(--color-text-secondary);
}

/* When the live tab is active, use normal active colour (AntD handles this via .ant-tabs-tab-active) */
.ant-tabs-tab-active .live-tab-label {
  color: var(--color-primary);
}
```

---

### 3.4 — Guard the Dirty-Check Navigation Warning

Currently `onBeforeRouteLeave` fires if `isDirty` is true regardless of which tab is active. If the user is on Employment and navigates away, the "Unsaved Changes" dialog should **not** appear (the form tabs weren't touched).

This is already safe because `isDirty` compares `form` to `savedSnapshot` — and `form` is only mutated by form tabs. However, make the guard intention explicit:

```js
onBeforeRouteLeave((_to, _from, next) => {
  // Only warn if there are unsaved form-tab changes
  if (isDirty.value && !isLiveTab.value) {
    Modal.confirm({
      title: 'Unsaved Changes',
      // ...existing config
    })
  } else {
    next()
  }
})
```

---

### 3.5 — Optional: Tooltip on Live Tab Labels

For extra clarity, wrap each live tab label in an `<a-tooltip>`:

```html
<template #tab>
  <a-tooltip title="Saves immediately per action — not affected by the Save button">
    <span class="live-tab-label">Employment</span>
  </a-tooltip>
</template>
```

This is progressive disclosure — it doesn't clutter the UI but rewards curious users who hover.

---

## 4. File Change Summary

| File | Changes |
|---|---|
| `src/views/employees/EmployeeFormView.vue` | Add `LIVE_TABS` constant, `isLiveTab` computed, update header template, update `<a-tabs>` with divider and live tab labels, add `DatabaseOutlined` import, add scoped CSS |

No changes needed in any tab component file — all changes are isolated to the parent form view.

---

## 5. Visual Outcome

### Before (current state):
```
┌──────────────────────────────────────────────────────────────┐
│  Dr. Althea Dooley                              [ Save ]     │
├──────────────────────────────────────────────────────────────┤
│  Basic Info  Identification  Contact & Family  Financial     │
│  Leave Balances  Records  Employment  Funding                │
│                                          ↑                   │
│                             User is here. Save does nothing. │
└──────────────────────────────────────────────────────────────┘
```

### After (proposed state):
```
┌──────────────────────────────────────────────────────────────┐
│  Dr. Althea Dooley          ⬢ Saves per action               │
│                             (Save button absent)             │
├──────────────────────────────────────────────────────────────┤
│  Basic Info  Identification  Contact & Family  Financial  │  │
│  Leave Balances  Records  [Employment]  Funding              │
│                             ↑ underlined/active              │
└──────────────────────────────────────────────────────────────┘
```

The `│` between Financial and Leave Balances is the decorative divider tab.
The header right-side is empty of the Save button, replaced by the muted badge.

---

## 6. Implementation Order

1. Add `LIVE_TABS` set and `isLiveTab` computed — 2 lines
2. Update the header template to conditionally show Save / badge — ~10 lines
3. Add `DatabaseOutlined` to icon imports — 1 line
4. Update `<a-tabs>` with divider pane + live tab label wrappers — ~20 lines
5. Add the scoped CSS — ~20 lines
6. Update `onBeforeRouteLeave` guard comment — 1 line
7. (Optional) Add tooltips to live tab labels

Total estimated change: **~55 lines across one file.**
