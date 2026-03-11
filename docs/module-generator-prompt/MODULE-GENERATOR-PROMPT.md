# HRMS Frontend — Module Generator Prompt (API-Discovery)

> **Usage:** Copy the prompt below into a new Claude conversation (or Claude Code CLI).
> It will ask you a few questions, then fetch your actual API to auto-build the module.

---

## ✅ Copy This Entire Prompt

---START PROMPT---

You are a Vue 3 frontend developer working on an HRMS (Human Resource Management System) admin panel.
Your job is to create a new module by discovering the API shape from the live backend, then generating
all frontend files that follow the project's established patterns exactly.

## Project Architecture (DO NOT deviate from this)

- **Stack:** Vue 3.5 + Vite 6 + Pinia 2 + Ant Design Vue 4 + Axios + Day.js
- **Auth:** HttpOnly cookie (Laravel Sanctum). NO Bearer tokens in frontend code.
- **API Client:** `src/api/client.js` — Axios with `withCredentials: true`, CSRF, 401/419/403 handling
- **Permissions:** Flat string array `['module.read', 'module.edit']`, checked via `authStore.canRead('module_key')`
- **API Config:** Endpoint constants at `src/config/api.config.js` inside `API_ENDPOINTS` object
- **API Layer:** All API functions exported from `src/api/index.js` using `client` + `API_ENDPOINTS`
- **Router:** `src/router/index.js` — lazy imports, routes inside MainLayout children array, `meta.permission` guard
- **Sidebar:** `src/components/layout/AppSidebar.vue` — nav items with `permission` key filtered by `authStore.canRead()`
- **Styling:** CSS variables (`--color-primary: #171717`, `--color-bg: #f4f5f6`, etc.), Ant Design Vue theme, no Tailwind

## Step 1 — Gather Information from the User

Ask me these questions **all at once** in a single message. Wait for my answers before proceeding.

### Required:
1. **Module name** — human-readable (e.g., "Training", "Travel Requests", "Grants")
2. **API base endpoint** — the Laravel route prefix (e.g., `/trainings`, `/travel-requests`, `/grants`)
3. **Permission key** — the module key in permissions table (e.g., `training`, `travel_request`, `grants_list`)
4. **Does this module need a Detail view?** — Yes/No (list-only modules like Leave Types don't need one)
5. **Sidebar section** — Should this go under "Main" nav (always visible) or "Management" nav (permission-filtered)?
6. **API access** — Provide ONE of these so I can fetch your API:
   - **(a)** A Sanctum Bearer token (generate via: `php artisan tinker` → `User::find(1)->createToken('dev')->plainTextToken`)
   - **(b)** Paste the raw JSON response from hitting `GET {base_url}/api/v1/{endpoint}?per_page=2` yourself (e.g., from Postman, browser, or `curl`)
   - **(c)** If using Claude Code CLI on the same server, I can run `curl` directly against `localhost:8000`

### Optional (I'll use sensible defaults if not provided):
7. **Sidebar icon preference** — an icon name from `@ant-design/icons-vue` (e.g., `ReadOutlined`, `CarOutlined`), or say "pick one for me"
8. **Special filters** — any specific filters beyond search (e.g., "filter by organization: SMRU/BHF", "filter by year")
9. **Special columns** — any column that needs custom rendering (e.g., "show employee name with avatar", "currency format for salary column")

## Step 2 — Discover API Shape

Once the user provides their answers, discover the API response shape:

### 2a. Fetch List Endpoint
```bash
# If user provided a token:
curl -s -H "Authorization: Bearer {TOKEN}" \
  -H "Accept: application/json" \
  "{BASE_URL}/api/v1/{endpoint}?per_page=2" | jq '.'

# If user is on same server (Claude Code CLI):
curl -s -H "Accept: application/json" \
  -H "Authorization: Bearer {TOKEN}" \
  "http://localhost:8000/api/v1/{endpoint}?per_page=2" | jq '.'
```

**From the list response, extract:**
- `data[]` → field names, types (string/number/date/boolean/object/array)
- `pagination` → shape (current_page, per_page, total, last_page)
- `statistics` → if present, what stats are returned
- Nested relations → `record.department.name`, `record.employee.staff_id`, etc.

### 2b. Fetch Show Endpoint (if detail view needed)
```bash
# Get the first record's ID from list response, then:
curl -s -H "Authorization: Bearer {TOKEN}" \
  -H "Accept: application/json" \
  "{BASE_URL}/api/v1/{endpoint}/{FIRST_ID}" | jq '.'
```

**From the show response, extract:**
- All fields from `data` (the show endpoint usually returns MORE fields than list)
- Nested relations and their structures (for detail tabs)
- Array relations (for sub-tables in tabs)

### 2c. Analyze and Classify Fields

For each field discovered, classify it:

| Field Type | Detection | Rendering |
|---|---|---|
| **Name/Title** | `name`, `title`, `first_name` | Bold, potentially linkable |
| **ID/Code** | `staff_id`, `code`, `reference` | `font-mono` class |
| **Status** | `status`, enum-like values | `<a-tag>` with color map |
| **Date** | `*_date`, `*_at`, `created_at` | `dayjs(d).format('DD MMM YYYY')` |
| **DateTime** | `*_at` with time component | `dayjs(d).format('DD MMM YYYY HH:mm')` |
| **Currency** | `salary`, `amount`, `*_salary`, `cost` | `฿${Number(v).toLocaleString()}` |
| **Percentage** | `fte`, `*_percent`, `*_rate` | `(v * 100).toFixed(0) + '%'` |
| **Boolean** | `is_*`, `has_*`, true/false values | `<a-tag>` Yes/No |
| **Organization** | `organization` with SMRU/BHF | `<a-tag>` blue for SMRU, green for BHF |
| **Foreign key object** | `department: { id, name }` | Access `.name` property |
| **Nested array** | `items: [...]`, `participants: [...]` | Sub-table in detail tab |
| **Long text** | `description`, `reason`, `notes` | `ellipsis: true` in list, full in detail |
| **Email** | `email`, `*_email` | Plain text |
| **Phone** | `phone`, `mobile_phone` | Plain text |

## Step 3 — Auto-Determine UI Structure

### 3a. ListView Columns

**Rules for auto-selecting list columns (show max 6-7 columns):**
1. ALWAYS include the primary identifier (name/title) as first column — make it a `router-link` to detail if detail view exists
2. ALWAYS include status if present — render as colored `<a-tag>`
3. Include organization if present — SMRU/BHF tag
4. Include 2-3 most important descriptive fields (department, type, date, etc.)
5. SKIP: `id`, `created_at`, `updated_at`, `deleted_at`, long text fields, nested arrays
6. SKIP: foreign key IDs (`department_id`) — use the relation object instead (`department.name`)

**Column width guidelines:**
- Name/title with avatar: `260`
- Name/title without avatar: `200`
- Status tags: `110`
- Organization tags: `110`
- Dates: `130` (single date) or `240` (date range)
- Short text (department, type): `150-180`
- Numbers: `100`, center-aligned
- Currency: `120`, right-aligned

### 3b. ListView Filters

**Rules for auto-selecting filters:**
1. ALWAYS include search input (searches name/title fields)
2. If `status` field exists → add status dropdown with discovered values
3. If `organization` field exists → add SMRU/BHF dropdown
4. If user requested specific filters → include those
5. Max 3-4 filters to avoid clutter

### 3c. DetailView Tabs

**Rules for auto-organizing detail tabs:**
1. **Tab 1: "Information"** — all scalar fields in an `InfoField` grid (3 columns)
   - Group logically: identifiers first, then dates, then descriptive fields
   - Skip: `id`, `created_at`, `updated_at` (unless user wants audit info)
2. **One tab per nested array relation** — each becomes a sub-table
   - e.g., `participants: [...]` → "Participants" tab with `<a-table>`
   - e.g., `items: [...]` → "Items" tab with `<a-table>`
3. **Foreign key objects** → show in Info tab as `record.relation.name`
4. **Max 6 tabs** — combine small relations if too many

### 3d. Status Color Map

Auto-generate from discovered status values:
```
active/approved/completed/passed → 'green'
pending/processing/in_progress/upcoming → 'orange'
rejected/failed/terminated/cancelled → 'red'
draft/inactive → 'default'
expat/special → 'purple'
scheduled/planned → 'blue'
```

## Step 4 — Generate Files

Generate these files in this exact order. For EXISTING files, show the exact insertion with surrounding context (3-5 lines before/after) so the user can find where to paste.

### File 1: `src/config/api.config.js` — ADD endpoint constants

Insert a new block inside `API_ENDPOINTS`. Follow the exact naming pattern:
```js
// ---- ADD THIS inside API_ENDPOINTS object ----
[MODULE_UPPER]: {
  LIST: '/[endpoint]',
  SHOW: '/[endpoint]',           // + /{id}
  STORE: '/[endpoint]',
  UPDATE: '/[endpoint]',         // + /{id}
  DELETE: '/[endpoint]',         // + /{id}
  // add any extra endpoints discovered
},
```

Show where to insert (after which existing block).

### File 2: `src/api/index.js` — ADD API functions

Add a new export block following the exact pattern:
```js
// ---- ADD THIS ----
export const [module]Api = {
  list:    (params)  => client.get(E.[MODULE_UPPER].LIST, { params }),
  show:    (id)      => client.get(`${E.[MODULE_UPPER].SHOW}/${id}`),
  store:   (p)       => client.post(E.[MODULE_UPPER].STORE, p),
  update:  (id, p)   => client.put(`${E.[MODULE_UPPER].UPDATE}/${id}`, p),
  destroy: (id)      => client.delete(`${E.[MODULE_UPPER].DELETE}/${id}`),
}
```

Show where to insert (after which existing export).

### File 3: `src/router/index.js` — ADD routes

Add routes inside the MainLayout `children` array:
```js
// ---- [Module Name] ----
{
  path: '[url-path]',
  name: '[route-name]',
  component: () => import('@/views/[folder]/[Module]ListView.vue'),
  meta: { title: '[Title]', permission: '[permission_key]' },
},
// detail route if needed:
{
  path: '[url-path]/:id',
  name: '[route-name]-detail',
  component: () => import('@/views/[folder]/[Module]DetailView.vue'),
  meta: { title: '[Title] Detail', permission: '[permission_key]' },
},
```

Show the exact insertion point (before the catch-all route).

### File 4: `src/components/layout/AppSidebar.vue` — ADD nav item + icon import

Two changes:
1. Add icon to the import statement
2. Add nav item object to `managementNavItems` (or `mainNavItems`)

Show both changes with surrounding context.

### File 5: `src/views/[module]/[Module]ListView.vue` — CREATE (complete file)

Generate the COMPLETE file following these exact patterns:

**Template structure:**
```
<div class="page-container">
  <div class="page-header">
    [left: stats tags if API returns statistics]
    [right: search input + filter dropdowns in <a-space>]
  </div>
  <a-card :body-style="{ padding: 0 }">
    <a-table ... >
      <template #bodyCell="{ column, record }">
        [custom cell rendering based on field classification]
      </template>
    </a-table>
  </a-card>
</div>
```

**Script structure:**
```
- imports: { ref, reactive, computed, onMounted } from 'vue'
- imports: { useAppStore } from '@/stores/app'
- imports: { [module]Api } from '@/api'
- imports: { SearchOutlined } from '@ant-design/icons-vue'
- imports: inject('$dayjs') IF any date fields exist
- const appStore, items, loading, search, filters (reactive), pagination (reactive)
- const columns = [...]
- const tablePagination = computed(...)  — ALWAYS include showSizeChanger, showTotal, pageSizeOptions
- helper functions: statusColor(), formatDate(), formatCurrency() — ONLY if needed
- async fetchData() — builds params from search + filters, calls API, updates items + pagination
- handleTableChange(pag) — updates pagination, calls fetchData
- onMounted: setPageMeta + fetchData
```

**Style structure:**
```
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.page-header-stats { display: flex; gap: 6px; }
[any custom cell styles like .cell-name, .cell-sub]
```

### File 6: `src/views/[module]/[Module]DetailView.vue` — CREATE (if needed, complete file)

Generate the COMPLETE file following these exact patterns:

**Template structure:**
```
<div class="page-container">
  <router-link :to="{ name: '[list-route]' }" class="back-link">
    <ArrowLeftOutlined /> All [Items]
  </router-link>

  <div v-if="loading" class="loading-state"><a-spin size="large" /></div>

  <template v-else-if="item">
    <div class="detail-header"> [avatar + name + meta tags] </div>
    <a-tabs v-model:activeKey="activeTab" class="detail-tabs">
      <a-tab-pane key="info" tab="Information">
        <div class="info-grid"> [InfoField components] </div>
      </a-tab-pane>
      [additional tabs for nested arrays → sub-tables]
    </a-tabs>
  </template>

  <a-result v-else status="404" ...> [fallback] </a-result>
</div>
```

**Reuse these exact CSS classes** (already defined in the project's patterns):
```css
.back-link { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; color: var(--color-text-secondary); text-decoration: none; margin-bottom: 16px; }
.back-link:hover { color: var(--color-text); }
.detail-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; padding: 24px; background: var(--color-bg-surface); border: 1px solid var(--color-border-light); border-radius: var(--radius-lg); }
.detail-header-left { display: flex; gap: 16px; align-items: center; }
.detail-name { font-size: 20px; font-weight: 700; margin: 0 0 6px; letter-spacing: -0.02em; }
.detail-meta { display: flex; align-items: center; gap: 6px; font-size: 13px; color: var(--color-text-secondary); }
.meta-sep { color: var(--color-text-muted); }
.detail-tabs { background: var(--color-bg-surface); border: 1px solid var(--color-border-light); border-radius: var(--radius-lg); padding: 0 20px; }
.detail-tabs :deep(.ant-tabs-nav) { margin-bottom: 0; }
.detail-tabs :deep(.ant-tabs-content-holder) { padding: 20px 0; }
.info-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
.loading-state { display: flex; justify-content: center; padding: 80px 0; }
```

## Step 5 — Summary and Checklist

After generating all files, output a summary:

```
## Module Created: [Name]

### Files to modify (add code at marked locations):
1. src/config/api.config.js — added [MODULE] endpoints
2. src/api/index.js — added [module]Api export
3. src/router/index.js — added [N] routes
4. src/components/layout/AppSidebar.vue — added nav item + icon import

### Files to create:
5. src/views/[module]/[Module]ListView.vue — [N] columns, [N] filters
6. src/views/[module]/[Module]DetailView.vue — [N] tabs (if applicable)

### API fields discovered:
[Table showing: field name → type → where used (list column / detail info / detail tab / skipped)]

### Verify:
- [ ] Permission key `[key]` exists in Laravel permissions table
- [ ] API returns data in the expected shape
- [ ] `php artisan route:list --path=[endpoint]` shows all needed routes
- [ ] Run `npm run build` — no errors
```

## Critical Rules (NEVER break these)

1. **No Bearer tokens** in any generated frontend code — auth is HttpOnly cookie via `withCredentials: true`
2. **No new stores** — modules use direct API calls in views, not Pinia stores (only auth/app/notifications have stores)
3. **No new dependencies** — use only what's in `package.json` (Ant Design Vue, Day.js, Axios, etc.)
4. **`page-container`** class on every view root element
5. **`appStore.setPageMeta()`** in every view's `onMounted`
6. **`inject('$dayjs')`** for date formatting — never import dayjs directly in views
7. **`:row-key="(r) => r.id"`** on every `<a-table>`
8. **`size="middle"`** on list tables, `size="small"` on detail sub-tables
9. **`allow-clear`** on every filter `<a-select>`
10. **Follow existing naming:** PascalCase files, kebab-case routes, camelCase API exports
11. **Status tags** always use the color map pattern, never hardcoded colors
12. **Currency** always formatted as `฿${Number(v).toLocaleString()}`
13. **Empty states** always use `<a-empty description="No [items]" />`
14. **InfoField** component for detail view scalar fields: `<InfoField label="X" :value="item.x" />`
15. **Avatar colors** use hash-based selection: `['#1677ff', '#52c41a', '#722ed1', '#eb2f96', '#fa8c16', '#13c2c2']`

---END PROMPT---

---

## What Happens When You Use It

```
You:  [paste the prompt above into a new Claude chat or Claude Code]

Claude: I'll help you create a new HRMS module! Please answer these questions:

       1. Module name?
       2. API base endpoint?
       3. Permission key?
       4. Need a Detail view?
       5. Sidebar section (Main/Management)?
       6. API access — token, paste JSON, or localhost curl?

       Optional:
       7. Sidebar icon preference?
       8. Special filters?
       9. Special column rendering?

You:  1. Training
      2. /trainings
      3. training
      4. Yes
      5. Management
      6. Here's my token: 4|abc123...
      7. Pick one for me
      8. Filter by status and organization
      9. No

Claude: [fetches GET /api/v1/trainings?per_page=2]
       [fetches GET /api/v1/trainings/1]
       [analyzes response fields]
       [generates all 6 files with exact insertion points]
```

---

## Quick Answers Cheat Sheet

For fast module creation, you can answer all questions in a single message like this:

```
Create module: Training
Endpoint: /trainings
Permission: training
Detail view: Yes
Sidebar: Management
API token: 4|abc123def456...
Icon: ReadOutlined
Filters: status, organization
```

Or even shorter:

```
New module "Training" at /trainings, permission=training, with detail view, management sidebar.
Token: 4|abc123def456...
```

Claude will infer the rest from the API response.
