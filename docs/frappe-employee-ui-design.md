# Frappe HRMS Employee Detail UI — Analysis Report

> **Source:** Analysis of the Frappe HRMS demo instance Employee Detail page.
> Used as the design reference for the HRMS frontend Employee module redesign.

---

## 1. Overall Architecture

Frappe Desk is a **Single Page Application (SPA)**. The Employee Detail page is rendered by `frappe.ui.form.Form`, which is Frappe's universal document form view. Every DocType (Employee, Customer, Sales Invoice, etc.) uses the same form engine — the difference is just the field definitions (meta) that come from the server.

**Key JS bundles involved:**
- `form.bundle.js` — The core form engine (Form, Layout, tabs, sections, fields)
- `controls.bundle.js` — Individual field controls (Data, Link, Select, Date, etc.)
- `desk.bundle.js` — The SPA shell, routing, page management
- `hrms.bundle.js` — HRMS-specific customizations (e.g., the Connections tab dashboard)

---

## 2. Page Layout Structure

The page has a **three-zone layout**:

**Header Bar** (`.page-head`): Breadcrumbs (`Home / Employee / lily love`), status indicator pill (`Active` green or `Not Saved` orange), a menu button (`...`), and the **Save** button (`.btn-primary`, always visible top-right).

**Main Content Area** (`.form-page`): Contains the tab bar and active tab content. CSS class `.form-layout` inside `.std-form-layout`. Width is fluid, taking all space minus the sidebar.

**Right Sidebar** (`.form-sidebar`, 277px width): Shows the employee avatar, ID (`HR-EMP-00003`), Assign, Attachments, Tags, Share sections, and audit info (Last Edited By, Created By). Hidden on mobile (`hidden-xs hidden-sm`).

Below the active tab content, there's always a **Comments** section and an **Activity** timeline (showing change history, emails, events).

```
+-------------------------------------------------------------+
| Header: Breadcrumbs   [Active]        [...] [Save]          |
+-------------------------------------------------------------+
| Tab1 | Tab2 | Tab3 | Tab4 | Tab5 | Tab6 | Tab7 | Tab8 | T9 |
+-----------------------------------------+-------------------+
|                                         | [Avatar]          |
|  Form fields for the active tab         | HR-EMP-00003      |
|  organized in sections & columns        |                   |
|                                         | Assign            |
|                                         | Attachments       |
|                                         | Tags              |
|                                         | Share             |
|                                         |                   |
|                                         | Last Edited By    |
|                                         | Created By        |
+-----------------------------------------+-------------------+
| Comments section                                            |
| Activity timeline                                           |
+-------------------------------------------------------------+
```

---

## 3. Tab System — How It Works

### 3.1 Tab Definition (Server-Side)

Tabs are defined as `Tab Break` fields in the Employee DocType's field list. The Employee DocType has **123 total fields** with **9 Tab Breaks**, **13 Section Breaks**, and **20 Column Breaks**.

The 9 tabs and their fieldnames:

| # | Tab Label | Fieldname | Field Count | Sections |
|---|-----------|-----------|-------------|----------|
| 1 | Overview | `basic_details_tab` | 23 | Basic Info, User Details (collapsible), Company Details |
| 2 | Joining | `employment_details` | 6 | Job Applicant + Dates |
| 3 | Address & Contacts | `contact_details` | 12 | Contact, Address (collapsible), Emergency Contact |
| 4 | Attendance & Leaves | `attendance_and_leave_details` | 5 | Attendance Device + Holiday/Shift + Approvers |
| 5 | Salary | `salary_information` | 10 | CTC/Currency/Mode + Bank Details |
| 6 | Personal Details | `personal_details` | 10 | Marital/Blood + Health Insurance (collapsible) + Passport |
| 7 | Profile | `profile_tab` | 4+ tables | Bio, Education (child table), Work History (child tables) |
| 8 | Employee Exit | `exit` | 9 | Resignation, Exit Interview, Feedback |
| 9 | Connections | `connections_tab` | 0 (dashboard) | Activity heatmap + linked doctypes |

### 3.2 Tab Rendering (Client-Side)

All 9 tabs are rendered in the DOM simultaneously on initial page load. There is **no lazy loading** — every tab's form fields are in the DOM but hidden via CSS (`display: none` on inactive `.tab-pane` elements).

The tab bar uses **Bootstrap nav-tabs** markup:
- Container: `<ul class="nav form-tabs" id="form-tabs" role="tablist">`
- Each tab: `<li class="nav-item show"><button class="nav-link" data-toggle="tab" data-fieldname="basic_details_tab" role="tab" aria-controls="employee-basic_details_tab">Overview</button></li>`
- Tab content: `<div class="tab-pane fade" role="tabpanel" id="employee-basic_details_tab">`
- Active tab gets class `tab-pane fade show active`

### 3.3 Tab -> URL Hash Synchronization

When a tab is clicked, a delegated jQuery click handler on `#form-tabs` fires. This handler:
1. Toggles `active` class on the clicked `.nav-link`
2. Shows/hides the corresponding `.tab-pane`
3. **Updates `window.location.hash`** to `#<fieldname>` (e.g., `#basic_details_tab`, `#employment_details`, `#contact_details`)

The URL pattern becomes:
```
https://hrms.example.com/desk/employee/HR-EMP-00003#basic_details_tab
https://hrms.example.com/desk/employee/HR-EMP-00003#employment_details
https://hrms.example.com/desk/employee/HR-EMP-00003#contact_details
https://hrms.example.com/desk/employee/HR-EMP-00003#attendance_and_leave_details
```

On page load, if a hash is present, the form reads it and activates the corresponding tab. If no hash is present, the first tab (Overview) is shown by default.

### 3.4 Within Each Tab: Sections & Columns

Inside each tab pane, the form is organized with:
- **Sections** (`.form-section.card-section`): Visually grouped with optional headings. Some are collapsible (like "User Details" and "Address").
- **Columns** (`.form-column`): Allow side-by-side field layout (e.g., First Name | Gender | Date of Joining in three columns).
- **Fields** (`.frappe-control`): Individual form controls, 83 total in the DOM.

---

## 4. Form Save Mechanism — Backend Integration

### 4.1 Dirty State Detection

When any field value changes, Frappe calls `cur_frm.dirty()`, which sets `cur_frm.dirty_flag = true`. This triggers:
- The **indicator pill** changes from the document status (e.g., `Active` with green dot) to `Not Saved` (orange).
- The form is flagged as dirty for the unsaved changes warning.

If the user tries to navigate away with unsaved changes, a confirmation dialog appears.

### 4.2 Save Trigger

Save can be triggered three ways:
- **Keyboard shortcut**: `Ctrl+S`
- **Save button**: The blue "Save" button in the top-right header bar
- **API**: `cur_frm.save()` programmatically

### 4.3 Save Flow (Client -> Server -> Client)

**Step 1 -- Client-side validation:**
- Checks all mandatory (`reqd=1`) fields have values. For Employee, these are: `naming_series`, `first_name`, `gender`, `date_of_birth`, `date_of_joining`, `status`, `company`.
- Runs any custom `validate` or `before_save` hooks.

**Step 2 -- API Call:**
```
POST /api/method/frappe.desk.form.save.savedocs
Content-Type: application/x-www-form-urlencoded
X-Frappe-CSRF-Token: <auto-included>

Body: doc=<JSON of entire document>&action=Save
```

The `doc` parameter contains the full document JSON with all 40+ keys (name, owner, creation, modified, all field values, child table arrays like `education`, `external_work_history`, `internal_work_history`).

**Step 3 -- Server-side processing (`frappe.desk.form.save.savedocs`):**
1. Deserializes the doc JSON
2. Gets/creates the Document object
3. Checks permissions (`has_permission`)
4. Runs server-side validation hooks (`validate`, `before_save`)
5. Saves to database (table: `tabEmployee`, with child tables `tabEmployee Education`, `tabEmployee External Work History`, `tabEmployee Internal Work History`)
6. Runs `after_save` triggers
7. Returns the updated doc JSON with server-computed values

**Step 4 -- Client-side response handling:**
- On success: Updates `cur_frm.doc` with the returned data, clears `dirty_flag`, changes indicator back to status (e.g., `Active` green), shows a green toast alert ("Saved"), updates the `modified` timestamp.
- On error: Shows red error toast, highlights problematic fields, shows error dialog if validation fails.

### 4.4 Document Loading

When navigating to an employee detail page:
```
GET /api/method/frappe.desk.form.load.getdoc?doctype=Employee&name=HR-EMP-00003
```

This returns the full document JSON along with metadata, permissions, and linked data. The form then populates all fields across all tabs from this single response.

### 4.5 New Employee Creation

URL: `/desk/employee/new-employee-1`

For new documents, there's no GET request -- the form uses default values from the DocType meta. On first save, the same `savedocs` endpoint is called. The server generates the name from the `naming_series` (`HR-EMP-`) by auto-incrementing (e.g., `HR-EMP-00005`). After save, the URL updates to the permanent employee URL.

---

## 5. Key Design Patterns to Replicate

### 5.1 Single Page, Multi-Tab Form (No Modals)
All employee data lives on **one page**. The "+ Add Employee" creates a new form page (same layout). Tabs switch content in-place -- no modals, no page navigation.

### 5.2 All Tabs Share One Save
There is a **single Save button** that saves the entire document across all tabs. There's no per-tab save. The entire doc JSON (from all tabs) is sent in one API call.

### 5.3 URL Hash for Tab State
The hash portion of the URL (`#basic_details_tab`) persists the active tab. This allows direct linking to a specific tab and preserves tab state on refresh.

### 5.4 Dirty Indicator
Any field change on any tab triggers the global "Not Saved" indicator. This tells the user at a glance that they have unsaved changes, regardless of which tab the change was made on.

### 5.5 Comments & Activity Always Visible
The Comments box and Activity timeline are rendered **below every tab's content** -- they're always visible regardless of which tab is active.

### 5.6 Right Sidebar for Metadata
The sidebar shows document identity (name, ID), workflow actions (Assign, Attachments, Tags, Share), and audit trail info. It's always visible alongside any tab.

---

## 6. How We Adapted This for Our HRMS

See [employee-form-architecture.md](./employee-form-architecture.md) for the full implementation details of how these Frappe patterns were adapted to our Vue 3 + Ant Design Vue stack.

Key adaptations:
- Frappe's universal `Form` engine replaced with a purpose-built `EmployeeFormView.vue` orchestrator
- Bootstrap nav-tabs replaced with Ant Design `<a-tabs>` component
- jQuery hash management replaced with Vue Router `route.hash` + `router.replace()`
- Frappe's full-document JSON save replaced with per-resource API endpoints
- Frappe's server-side dirty detection replaced with client-side `JSON.stringify` snapshot comparison
- Sub-resources (Employment, Funding, Records) use modal-based CRUD instead of inline editing
