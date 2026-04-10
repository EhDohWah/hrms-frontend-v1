# HRMS User Manual

**Human Resource Management System**
**Version 1.0 | April 2025**

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Getting Started](#2-getting-started)
   - 2.1 [System Requirements](#21-system-requirements)
   - 2.2 [Logging In](#22-logging-in)
   - 2.3 [Forgot Password](#23-forgot-password)
   - 2.4 [First-Time Login (Default Password)](#24-first-time-login-default-password)
   - 2.5 [Navigating the Interface](#25-navigating-the-interface)
3. [Dashboard](#3-dashboard)
   - 3.1 [Quick Stats](#31-quick-stats)
   - 3.2 [Dashboard Widgets](#32-dashboard-widgets)
   - 3.3 [Onboarding Tour](#33-onboarding-tour)
4. [My Profile](#4-my-profile)
   - 4.1 [Update Profile Information](#41-update-profile-information)
   - 4.2 [Change Password](#42-change-password)
   - 4.3 [Upload Profile Picture](#43-upload-profile-picture)
   - 4.4 [View My Permissions](#44-view-my-permissions)
5. [Notifications](#5-notifications)
6. [Employee Management](#6-employee-management)
   - 6.1 [Employee List](#61-employee-list)
   - 6.2 [Create New Employee](#62-create-new-employee)
   - 6.3 [Edit Employee](#63-edit-employee)
   - 6.4 [Employee Form Tabs](#64-employee-form-tabs)
   - 6.5 [Transfer an Employee](#65-transfer-an-employee)
   - 6.6 [Resign an Employee](#66-resign-an-employee)
   - 6.7 [Export Employees](#67-export-employees)
7. [Employment Records](#7-employment-records)
   - 7.1 [View Employment Records](#71-view-employment-records)
   - 7.2 [Probation Management](#72-probation-management)
8. [Leave Management](#8-leave-management)
   - 8.1 [Leave Types](#81-leave-types)
   - 8.2 [Leave Requests](#82-leave-requests)
   - 8.3 [Leave Balances](#83-leave-balances)
9. [Attendance](#9-attendance)
   - 9.1 [Attendance Records](#91-attendance-records)
   - 9.2 [Holidays](#92-holidays)
10. [Grants Management](#10-grants-management)
    - 10.1 [Grant List](#101-grant-list)
    - 10.2 [Grant Detail](#102-grant-detail)
    - 10.3 [Grant Positions](#103-grant-positions)
    - 10.4 [Employee Funding Allocations](#104-employee-funding-allocations)
11. [Payroll](#11-payroll)
    - 11.1 [Payroll List](#111-payroll-list)
    - 11.2 [Run Payroll (Bulk Create)](#112-run-payroll-bulk-create)
    - 11.3 [Payroll Detail & Payslips](#113-payroll-detail--payslips)
    - 11.4 [Budget History View](#114-budget-history-view)
    - 11.5 [Bulk Payslip Download](#115-bulk-payslip-download)
    - 11.6 [Government Tax Exports](#116-government-tax-exports)
12. [Recruitment](#12-recruitment)
    - 12.1 [Interviews](#121-interviews)
    - 12.2 [Job Offers](#122-job-offers)
13. [Training](#13-training)
    - 13.1 [Training Types](#131-training-types)
    - 13.2 [Training Programs](#132-training-programs)
    - 13.3 [Employee Training Enrollment](#133-employee-training-enrollment)
14. [Personnel Actions (HRM)](#14-personnel-actions-hrm)
    - 14.1 [Personnel Actions](#141-personnel-actions)
    - 14.2 [Transfers](#142-transfers)
    - 14.3 [Resignations](#143-resignations)
15. [Reports](#15-reports)
    - 15.1 [Available Reports](#151-available-reports)
    - 15.2 [Generating a Report](#152-generating-a-report)
16. [Data Import](#16-data-import)
    - 16.1 [Grant Import](#161-grant-import)
    - 16.2 [Employee Import](#162-employee-import)
    - 16.3 [Onboarding Import](#163-onboarding-import)
17. [Organization Setup](#17-organization-setup)
    - 17.1 [Sites](#171-sites)
    - 17.2 [Departments](#172-departments)
    - 17.3 [Positions](#173-positions)
    - 17.4 [Section Departments](#174-section-departments)
18. [Settings](#18-settings)
    - 18.1 [Benefit Settings](#181-benefit-settings)
    - 18.2 [Tax Settings](#182-tax-settings)
    - 18.3 [Tax Brackets](#183-tax-brackets)
    - 18.4 [Tax Calculator](#184-tax-calculator)
    - 18.5 [Payroll Policies](#185-payroll-policies)
19. [Administration](#19-administration)
    - 19.1 [User Management](#191-user-management)
    - 19.2 [User Permissions](#192-user-permissions)
    - 19.3 [Role Management](#193-role-management)
    - 19.4 [Lookup Data](#194-lookup-data)
    - 19.5 [Login History](#195-login-history)
    - 19.6 [User Activity Report](#196-user-activity-report)
20. [System Monitoring (Admin Only)](#20-system-monitoring-admin-only)
    - 20.1 [System Health](#201-system-health)
    - 20.2 [Error Logs](#202-error-logs)
    - 20.3 [Failed Jobs](#203-failed-jobs)
    - 20.4 [Performance Metrics](#204-performance-metrics)
21. [Activity Logs & Recycle Bin](#21-activity-logs--recycle-bin)
    - 21.1 [Activity Logs](#211-activity-logs)
    - 21.2 [Recycle Bin](#212-recycle-bin)
22. [Keyboard Shortcuts & Tips](#22-keyboard-shortcuts--tips)
23. [Troubleshooting & FAQ](#23-troubleshooting--faq)

---

## 1. Introduction

The Human Resource Management System (HRMS) is a web-based application designed to digitize and streamline HR operations. It replaces paper-based processes with a searchable, exportable database covering employee management, payroll, leave tracking, recruitment, training, grants management, and more.

**Key capabilities:**
- Manage complete employee lifecycle (hire to resign)
- Process payroll with Thai tax compliance
- Track leave requests, balances, and attendance
- Manage grants, funding allocations, and budget tracking
- Handle recruitment (interviews and job offers)
- Generate reports and government tax exports (PND1, PND91, SSO)
- Bulk data import/export via Excel and CSV
- Role-based access control with granular permissions

**Supported organizations:** SMRU (Shoklo Malaria Research Unit) and BHF (Borderland Health Foundation).

> **Note:** This system is a data entry and display tool. Approvals (leave, resignations, personnel actions) happen offline. The system records final decisions, not approval workflows.

---

## 2. Getting Started

### 2.1 System Requirements

- **Browser:** Google Chrome (recommended), Firefox, Safari, or Microsoft Edge (latest versions)
- **Screen:** Desktop or tablet (minimum 768px width recommended for full features; mobile layout available for smaller screens)
- **Internet:** Stable internet connection required

### 2.2 Logging In

1. Open the HRMS application URL in your browser.
2. You will see the **Login** page.
3. Enter your **Email Address** and **Password**.
4. Click the **Sign In** button.
5. If successful, you will be redirected to the **Dashboard**.

> **Note:** If another session is active on a different device, you may see a session conflict warning. You can choose to continue and log out the other session.

`[Screenshot: Login page with email and password fields]`

### 2.3 Forgot Password

1. On the Login page, click the **Forgot Password?** link.
2. Enter the email address associated with your account.
3. Click **Send Reset Link**.
4. Check your email inbox for the reset link.
5. Click the link in the email and set a new password.
6. Return to the Login page and sign in with your new password.

`[Screenshot: Forgot password page]`

### 2.4 First-Time Login (Default Password)

If your account was created by an administrator with a default password, you will be prompted to change it immediately after logging in.

1. A **Change Password** modal will appear automatically.
2. Enter a new password that meets the following requirements:
   - Minimum length (8+ characters)
   - At least one uppercase letter
   - At least one lowercase letter
   - At least one number
   - At least one special character
3. Confirm the new password.
4. Click **Update Password**.

### 2.5 Navigating the Interface

The HRMS interface consists of three main areas:

**Sidebar (Left Navigation)**
- Contains all module links organized into sections
- Sections include: Grants, Recruitment, Management, Leave, Attendance, Training, HRM, Reports, Data Management, Organization, Settings, Administration, and System
- Only modules you have permission to access are visible
- Click the collapse icon at the top to minimize the sidebar
- On mobile, tap the hamburger menu icon to open the sidebar overlay

**Header (Top Bar)**
- Displays the current page title and breadcrumb navigation
- Shows the notification bell icon with unread count
- Provides access to your profile

**Content Area (Center)**
- Displays the current page content
- Tables, forms, and detail views appear here

`[Screenshot: Main layout showing sidebar, header, and content area]`

---

## 3. Dashboard

The Dashboard is your home screen after logging in. It provides an at-a-glance overview of key HR metrics.

### 3.1 Quick Stats

At the top of the dashboard, you will see quick stat cards (visible based on your permissions):

| Card | Description |
|------|-------------|
| **Total Employees** | Count of all employees in the system |
| **On Leave Today** | Number of employees currently on leave |
| **Pending Leave Requests** | Leave requests awaiting action |
| **Payroll This Month** | Current month's payroll summary |

- Click any stat card to navigate to the related module.
- Click the **refresh** icon to update stats manually.

`[Screenshot: Dashboard quick stats cards]`

### 3.2 Dashboard Widgets

Below the quick stats, the dashboard displays customizable widgets in a two-column grid:

| Widget | Content |
|--------|---------|
| **Quick Actions** | Shortcut buttons for common tasks |
| **People** | Employee headcount, recent hires, probation ending soon |
| **Leave** | Leave request summary by status, pending requests |
| **Payroll** | Current month payroll summary, upcoming schedule |
| **Recruitment** | Pending interviews, open positions |
| **Resignation** | Resignation statistics |
| **Recent Activity** | Latest created, updated, and deleted records |
| **Notifications** | Recent system notifications (full-width) |
| **System Health** | Database, cache, storage, queue status (admin only) |
| **Recent Errors** | 24-hour error log (admin only) |
| **Failed Jobs** | Background job failures (admin only) |

`[Screenshot: Dashboard widgets overview]`

### 3.3 Onboarding Tour

First-time users will see a guided tour that highlights each section of the dashboard. You can also restart the tour at any time:

1. Click the floating **"?"** button in the bottom-right corner of the dashboard.
2. Follow the tour steps to learn about each widget and feature.
3. Click **Next** to proceed through each step, or **Skip** to exit.

`[Screenshot: Onboarding tour step]`

---

## 4. My Profile

Access your profile by clicking your name or avatar in the header area, then selecting **My Profile**.

### 4.1 Update Profile Information

1. Navigate to **My Profile**.
2. In the **Profile Information** card, update your **Display Name** or **Email Address**.
3. Click **Save Changes**.

`[Screenshot: Profile information card]`

### 4.2 Change Password

1. Navigate to **My Profile**.
2. Scroll to the **Change Password** card.
3. Enter your **Current Password**.
4. Enter your **New Password** (the strength indicator will show which requirements are met).
5. Enter **Confirm New Password** (must match).
6. Click **Update Password** (enabled only when all requirements are met).

`[Screenshot: Change password card with strength indicator]`

### 4.3 Upload Profile Picture

1. Navigate to **My Profile**.
2. In the sidebar profile card, hover over the avatar area.
3. Click the **camera icon** to select an image file (max 2MB, image files only).
4. Preview the selected image.
5. Click the **checkmark** to confirm, or **X** to cancel.

`[Screenshot: Profile picture upload]`

### 4.4 View My Permissions

1. Navigate to **My Profile**.
2. Scroll to the **My Permissions** card.
3. View a summary showing your total modules and full-access modules.
4. The table lists each module with Read (R), Create (C), Update (U), and Delete (D) indicators.
   - Green checkmark = permission granted
   - Gray circle = permission not granted

> **Note:** Permissions are assigned by administrators. Contact your admin if you need access to additional modules.

`[Screenshot: Permissions table]`

---

## 5. Notifications

The notification bell icon in the header shows your unread notification count. The system checks for new notifications every 30 seconds.

**Viewing Notifications:**
1. Click the **bell icon** in the header, or navigate to the **Notifications** page from the sidebar.
2. Unread notifications appear highlighted.
3. Click a notification to view its details and mark it as read.

**Managing Notifications:**
- **Mark as Read:** Click on individual notifications, or use **Mark All as Read**.
- **Delete:** Remove individual notifications or use **Bulk Delete**.
- **Clear Read:** Remove all already-read notifications at once.

`[Screenshot: Notifications page]`

---

## 6. Employee Management

### 6.1 Employee List

Navigate to **Management > Employees** in the sidebar.

**Searching and Filtering:**
1. Use the **Search** bar to find employees by name or staff ID.
2. Use the **Organization** dropdown to filter by SMRU or BHF.
3. Use the **Status** dropdown to filter by employment status.

**Customizing Columns:**
1. Click the **column settings** icon near the top-right of the table.
2. Check or uncheck columns to show/hide them.
3. Click **Reset** to restore default columns.

**Available Columns:**
Organization, Staff ID, Initial (EN), First Name, Last Name, Gender, Date of Birth, Nationality, Status, Hire Date, Actions.

**Table Features:**
- Click a **Staff ID** or **employee name** to view the employee detail page.
- Use checkboxes to select multiple employees for bulk deletion.
- Resigned employees are visually distinguished with different styling.

`[Screenshot: Employee list with filters and table]`

### 6.2 Create New Employee

1. On the Employee List page, click the **Add Employee** button (top-right).
2. You will be taken to the Employee Form in **create mode**.
3. Fill in the required fields on the **Basic Info** tab:
   - **Organization** (required) - Select SMRU or BHF
   - **Staff ID** (required) - Unique identifier
   - **First Name (EN)** (required)
   - **Gender** (required)
   - **Date of Birth** (required)
   - **Status** (required) - Employee status category
4. Fill in additional tabs as needed (see Section 6.4).
5. Click **Save** to create the employee record.

**Duplicate Detection:**
When creating a new employee, the system automatically checks for potential duplicates by:
- Staff ID match
- Name + Date of Birth combination
- ID Number match

If duplicates are found, a warning banner appears with links to view existing matching records.

`[Screenshot: New employee form - Basic Info tab]`

### 6.3 Edit Employee

1. From the Employee List, click the **Staff ID** or **name** of the employee, or click the **Edit** action button.
2. The Employee Form opens in **edit mode** with all existing data loaded.
3. Modify any fields across the available tabs.
4. An orange **"Not Saved"** tag appears when you have unsaved changes.
5. Click **Save** to update the record.
6. Use **Ctrl+S** as a keyboard shortcut to save quickly.

> **Warning:** If you navigate away with unsaved changes, a confirmation dialog will ask you to confirm.

`[Screenshot: Edit employee form with unsaved changes indicator]`

### 6.4 Employee Form Tabs

The employee form is organized into two groups of tabs:

**Group 1: Form Tabs** (saved together when you click Save)

| Tab | Key Fields |
|-----|-----------|
| **Basic Info** | Organization, Staff ID, English/Thai names, Initial, Gender, DOB, Status, Nationality, Religion, Military status, Marital status |
| **Identification** | ID Type, ID Number, Issue/Expiry dates, Social Security Number, Tax Number, Driver License |
| **Contact & Family** | Mobile phone, Permanent address, Current address, Spouse info, Parent info (Father/Mother), Emergency contact |
| **Financial** | Bank name, Branch, Account name, Account number, Remarks |

**Group 2: Live Tabs** (each action saves immediately)

| Tab | Description |
|-----|------------|
| **Leave Balances** | View and manage the employee's leave entitlements by type and year |
| **Records** | Documents, certifications, and file attachments |
| **Employment & Funding** | Employment details, position assignment, grant allocation, FTE information, budget line allocation |

**Activity Timeline** (edit mode only):
At the bottom of the form, an activity timeline shows the history of changes made to this employee record (creation, updates, deletions).

`[Screenshot: Employee form tabs overview]`

### 6.5 Transfer an Employee

1. Open the employee in **edit mode**.
2. Click the **Transfer** button in the header (requires transfer permission).
3. In the Transfer Modal, fill in:
   - New position/department
   - Effective date
   - Transfer reason/notes
4. Click **Confirm Transfer**.

`[Screenshot: Transfer modal]`

### 6.6 Resign an Employee

1. Open the employee in **edit mode**.
2. Click the **Resign** button (red/danger button) in the header.
3. In the Resignation Modal, fill in:
   - Last working date
   - Resignation reason
   - Additional notes
4. Click **Confirm Resignation**.

`[Screenshot: Resignation modal]`

### 6.7 Export Employees

1. On the Employee List page, apply any desired filters.
2. Click the **Export** button.
3. The system generates an Excel/CSV file with the filtered employee data for download.

`[Screenshot: Export button location]`

---

## 7. Employment Records

### 7.1 View Employment Records

Navigate to the **Employment Records** section (accessible from the employee detail view or relevant sidebar menu).

Employment records track:
- Hire date and employment status
- Department and position assignments
- Probation period and status
- Funding allocation history

### 7.2 Probation Management

For employees on probation:
1. View the probation status on the employment record.
2. To complete probation, click **Complete Probation** and confirm.
3. The probation history is recorded and viewable for audit purposes.

`[Screenshot: Employment record with probation status]`

---

## 8. Leave Management

### 8.1 Leave Types

Navigate to **Leave > Leave Types** in the sidebar.

**Managing Leave Types:**
1. View the list of configured leave types (e.g., Annual Leave, Sick Leave, Maternity Leave).
2. Click **Add Leave Type** to create a new type.
3. Fill in the leave type name, entitlement days, and configuration.
4. Click **Save**.

To edit or delete: use the action buttons on each row.

`[Screenshot: Leave types list]`

### 8.2 Leave Requests

Navigate to **Leave > Leave Requests** in the sidebar.

**Viewing Leave Requests:**
1. Filter by **Year** (defaults to current year).
2. Search by **employee name**.
3. Filter by **Organization**, **Site**, or **Status** (Pending, Approved, Declined, Cancelled).
4. The total count tag shows how many records match your filters.

**Table Columns:**
Organization, Employee (Name + Staff ID), Site, Position, Leave Type, Dates (Start to End), Status (color-coded), Actions.

**Creating a Leave Request:**
1. Click **Add Leave Request**.
2. Select the **Employee** from the dropdown.
3. Select the **Leave Type**.
4. Choose **Start Date** and **End Date**.
5. The system automatically calculates working days (excluding Sundays and holidays).
6. Add any notes or reason.
7. Click **Save**.

> **Note:** The system checks for overlapping leave requests and warns you if a conflict is found.

**Status Tags:**
- **Pending** (orange) - Awaiting decision
- **Approved** (green) - Leave approved
- **Declined** (red) - Leave declined
- **Cancelled** (gray) - Cancelled by employee or admin

`[Screenshot: Leave request list with filters]`
`[Screenshot: Create leave request form]`

### 8.3 Leave Balances

Navigate to **Leave > Leave Balances** in the sidebar.

**Viewing Leave Balances:**
1. Filter by **Organization**, **Employee**, **Leave Type**, or **Year**.
2. View each employee's entitlement, used days, and remaining balance per leave type.

**Allocating Leave:**
1. Click **Add Leave Balance**.
2. Select the employee and leave type.
3. Enter the entitlement amount.
4. Click **Save**.

`[Screenshot: Leave balances list]`

---

## 9. Attendance

### 9.1 Attendance Records

Navigate to **Attendance > Attendance** in the sidebar.

**Viewing Attendance:**
1. Filter by **Organization**, **Status**, or **Date Range**.
2. Search by employee name.
3. View check-in/check-out records in the table.

**Managing Records:**
- Click **Add** to create a new attendance record.
- Edit or delete records using the action buttons.
- Use checkboxes for bulk deletion.

`[Screenshot: Attendance list]`

### 9.2 Holidays

Navigate to **Attendance > Holidays** in the sidebar.

**Managing Holidays:**
1. View the list of configured holidays for the year.
2. Click **Add Holiday** to create a new holiday.
3. Fill in the holiday name and date.
4. Click **Save**.

**Bulk Create:** Use the **Bulk Create** option to add multiple holidays at once (useful for setting up the full year).

`[Screenshot: Holiday list]`

---

## 10. Grants Management

### 10.1 Grant List

Navigate to **Grants > Grants** in the sidebar.

**Viewing Grants:**
1. Search by grant name or code.
2. View the table showing grant code, name, organization, status, and budget information.
3. Click a grant to view its details.

**Creating a Grant:**
1. Click **Add Grant**.
2. Fill in grant code, name, organization, start/end dates, and budget details.
3. Click **Save**.

`[Screenshot: Grant list]`

### 10.2 Grant Detail

Click a grant from the list to view its detail page, which includes:

- **Grant Information:** Code, name, organization, dates, status
- **Budget Tracking:** Total budget, allocated amount, remaining balance
- **Grant Items (Budget Lines):** Individual line items with codes and amounts
- **Employee Allocations:** Employees funded by this grant with FTE percentages

`[Screenshot: Grant detail page]`

### 10.3 Grant Positions

Navigate to **Grants > Grant Positions** in the sidebar.

View positions that are funded by grants, including:
- Position title
- Associated grant and budget line
- FTE allocation
- Current occupant

`[Screenshot: Grant positions list]`

### 10.4 Employee Funding Allocations

Funding allocations link employees to grants. They can be managed from:

- The **Employee Form** (Employment & Funding tab)
- The **Grant Detail** page

Each allocation specifies:
- The grant and budget line (grant item)
- FTE percentage
- Active/inactive status

**Bulk Operations:**
- Preview allocation calculations before saving
- Bulk deactivate allocations
- Import allocations from Excel/CSV

`[Screenshot: Funding allocation on employee form]`

---

## 11. Payroll

### 11.1 Payroll List

Navigate to **Management > Payroll** in the sidebar.

**Searching and Filtering:**
1. Search by **employee name** or **staff ID**.
2. Filter by **Organization**, **Site**, **Department**, **Pay Period** (month), or **Fund Type** (PVD, Saving Fund).
3. Toggle between **Standard View** and **Budget History View**.

**Standard View Table:**
The outer table shows employee-level summaries:
- Organization, Employee (name + staff ID), Site, Department, Position
- Status, Start Date, Probation Date
- Pay Period, Records Count, Total Net

Click the **expand arrow** on any row to see the detailed inner table with individual payroll records:
- Grant Code, Grant Name, Budget Line Code, FTE
- Gross Salary, Gross by FTE, Retroactive Salary
- 13th Month Salary, Salary Increase
- PVD (Employee/Employer), Saving Fund (Employee/Employer)
- Social Security (Employee/Employer), Health & Welfare
- Tax, Student Loan
- Total Salary, Total Income, Employer Contribution
- Total Deduction, Net Salary

**Row Actions:**
- **View** - Open payroll detail drawer
- **Download Payslip** - Generate and download PDF payslip
- **Delete** - Remove payroll record (with confirmation)

`[Screenshot: Payroll list with expanded row]`

### 11.2 Run Payroll (Bulk Create)

1. On the Payroll List page, click the **Run Payroll** button.
2. The **Bulk Payroll Modal** opens.
3. Select the **Organization** and **Pay Period** (month).
4. Click **Preview** to see a dry-run of the payroll calculation.
5. Review the preview results (employee count, total amounts, any warnings).
6. Click **Create** to process the payroll.
7. The system creates payroll records for all eligible employees in the selected period.
8. Monitor the batch status for completion.

> **Important:** Payroll calculations (tax, deductions, benefits) are computed by the backend. The frontend displays results only.

`[Screenshot: Bulk payroll modal with preview]`

### 11.3 Payroll Detail & Payslips

**Viewing Details:**
1. Click **View** on any payroll record to open the detail drawer.
2. The drawer shows a complete breakdown of salary components, deductions, and net pay.

**Downloading Payslips:**
1. Click the **Download Payslip** icon on any individual payroll record.
2. A PDF payslip is generated and downloaded to your computer.

`[Screenshot: Payroll detail drawer]`
`[Screenshot: Sample payslip PDF]`

### 11.4 Budget History View

1. Toggle to **Budget History** view using the view mode switch.
2. Select a **date range** (default: last 12 months).
3. Choose which **salary field** to display for comparison.
4. The table shows historical salary data across months for each employee.
5. Adjust pagination (50 or 100 employees per page).

`[Screenshot: Budget history view]`

### 11.5 Bulk Payslip Download

1. Filter the payroll list to the desired **Organization** and **Pay Period**.
2. Click the **Download Payslips** button in the toolbar.
3. Select the period and format options.
4. A single PDF file containing all payslips for the period is generated and downloaded.

`[Screenshot: Bulk payslip download option]`

### 11.6 Government Tax Exports

The system supports Thai government-format tax exports:

| Export | Description |
|--------|-------------|
| **PND1** | Monthly withholding tax return |
| **PND1 Kor** | Monthly withholding tax certificate |
| **PND91** | Annual personal income tax return |
| **SSO** | Social Security Office contribution report |

To generate:
1. Navigate to the relevant report or payroll section.
2. Select the **period** and **organization**.
3. Click the export button for the desired format.
4. The file is generated and downloaded.

`[Screenshot: Government export options]`

---

## 12. Recruitment

### 12.1 Interviews

Navigate to **Recruitment > Interviews** in the sidebar.

**Viewing Interviews:**
1. Search by candidate name.
2. Filter by **Hired Status** or **Job Position**.
3. View the table with candidate details, interview dates, status, and outcomes.

**Creating an Interview Record:**
1. Click **Add Interview**.
2. Fill in candidate name, contact information, job position, interview date.
3. Add interview notes and outcome.
4. Click **Save**.

**Actions:**
- Edit interview details
- Delete interview records
- Bulk delete selected records

`[Screenshot: Interview list]`

### 12.2 Job Offers

Navigate to **Recruitment > Job Offers** in the sidebar.

**Viewing Job Offers:**
1. Search by candidate name.
2. Filter by **Status** or **Position**.
3. View the table with offer details, position, salary, and status.

**Creating a Job Offer:**
1. Click **Add Job Offer**.
2. Fill in candidate information, position, salary details, start date.
3. Add any terms and conditions.
4. Click **Save**.

**Generating Offer PDF:**
1. Click the **PDF** icon on a job offer row.
2. A formatted offer letter PDF is generated and downloaded.

`[Screenshot: Job offer list]`
`[Screenshot: Job offer PDF]`

---

## 13. Training

### 13.1 Training Types

Navigate to **Training > Training Types** in the sidebar.

Manage training categories:
1. View existing training types.
2. Click **Add Training Type** to create a new category.
3. Enter the type name and description.
4. Click **Save**.

`[Screenshot: Training types list]`

### 13.2 Training Programs

Navigate to **Training > Training** in the sidebar.

**Viewing Training Programs:**
1. Search by training title.
2. Filter by **Status** or **Organizer**.
3. View the table with training name, dates, organizer, location, and status.

**Creating a Training Program:**
1. Click **Add Training**.
2. Fill in training title, type, organizer, dates, location, and description.
3. Click **Save**.

**Training Detail Page:**
Click a training program to view its detail page, which shows:
- Full training information
- Enrolled employees and their attendance status
- Training materials and notes

`[Screenshot: Training list]`
`[Screenshot: Training detail page]`

### 13.3 Employee Training Enrollment

Navigate to **Training > Employee Training** in the sidebar.

**Managing Enrollment:**
1. View all employee training records.
2. Filter by training program or employee.
3. Click **Add** to enroll an employee in a training program.

**Enrollment Statuses:**
- **Pending** (blue) - Enrollment registered
- **In Progress** (orange) - Currently attending
- **Completed** (green) - Successfully completed

`[Screenshot: Employee training list]`

---

## 14. Personnel Actions (HRM)

### 14.1 Personnel Actions

Navigate to **HRM > Personnel Actions** in the sidebar.

Personnel actions record formal HR decisions such as promotions, salary adjustments, and position changes.

**Creating a Personnel Action:**
1. Click **Add Personnel Action**.
2. Select the employee.
3. Choose the action type.
4. Fill in the details (effective date, new position/salary, justification).
5. Click **Save**.

**Exporting Documents:**
- Click **Export PDF** to generate a formal personnel action document.
- Click **Amendment Letter** to generate an amendment letter for the employee.

`[Screenshot: Personnel action list]`
`[Screenshot: Personnel action PDF]`

### 14.2 Transfers

Navigate to **HRM > Transfers** in the sidebar.

View and manage employee transfer records:
1. View the list of all transfers with source and destination details.
2. Click a transfer to view its details.
3. Create new transfers from this page or from the employee form.

`[Screenshot: Transfer list]`

### 14.3 Resignations

Navigate to **HRM > Resignations** in the sidebar.

**Viewing Resignations:**
1. Search by employee name.
2. Filter by **Acknowledgement Status**, **Department**, or **Reason**.
3. View the table with employee info, resignation date, reason, and acknowledgement status.

**Creating a Resignation Record:**
1. Click **Add Resignation** or use the **Resign** button from the employee form.
2. Select the employee.
3. Enter the resignation date, last working date, and reason.
4. Click **Save**.

**Acknowledgement Flow:**
Resignation records track two-level acknowledgement:
- **Supervisor Acknowledgement:** Pending / Acknowledged / Declined
- **HR Manager Acknowledgement:** Pending / Acknowledged / Declined

**Generating Documents:**
Click **Recommendation Letter** on a resignation record to generate a recommendation letter PDF.

`[Screenshot: Resignation list]`
`[Screenshot: Resignation detail with acknowledgement status]`

---

## 15. Reports

Navigate to **Reports** in the sidebar.

### 15.1 Available Reports

Reports are organized by category:

| Category | Reports | Formats |
|----------|---------|---------|
| **Recruitment** | Interview Report | PDF, Excel |
| **Recruitment** | Job Offer Report | PDF |
| **Leave** | Department Leave Report | PDF |
| **Leave** | Individual Leave Report | PDF |
| **Grants** | Grant Headcount Report | PDF |
| **Finance** | Budget Request Report | Word (DOCX) |
| **Payroll** | Registration Report | PDF, Excel |
| **Payroll** | FTE Budget Report | PDF, Excel |

### 15.2 Generating a Report

1. On the Reports page, search or browse for the desired report.
2. Click on the report card to open the **Configuration Drawer**.
3. Fill in the required parameters:
   - **Date Range** - Select start and end dates (most reports)
   - **Employee** - Select a specific employee (individual reports)
   - **Organization/Site/Department** - Filter scope (department reports)
   - **Year** - Select fiscal year (annual reports)
4. Select the desired **output format** (PDF, Excel, or Word).
5. Click **Export** or **Download**.
6. The report file is generated and downloaded to your computer.

`[Screenshot: Reports page with report cards]`
`[Screenshot: Report configuration drawer]`

---

## 16. Data Import

Navigate to **Data Management > Data Import** in the sidebar.

The Data Import page provides three import modules displayed as cards in a responsive grid.

### 16.1 Grant Import

1. Click the **Grant Import** card.
2. Click **Download Template** to get the Excel/CSV template.
3. Fill in the template with your grant data following the column headers.
4. Drag and drop the file onto the upload area, or click **Browse** to select it.
5. The system validates the data and shows any errors.
6. Review the preview and click **Import** to process.
7. A summary shows the count of successful and failed records.

`[Screenshot: Grant import card]`

### 16.2 Employee Import

1. Click the **Employee Import** card.
2. Click **Download Template** to get the template file.
3. Fill in employee data (names, staff IDs, personal info, etc.).
4. Upload the completed file.
5. The system validates for duplicates and data integrity.
6. Review any validation errors and correct as needed.
7. Click **Import** to create the employee records.

`[Screenshot: Employee import card with validation results]`

### 16.3 Onboarding Import

1. Click the **Onboarding Import** card.
2. This is a combined import that can process employees, employment records, and funding allocations in a single file.
3. Download and fill the template.
4. Upload and review the preview.
5. Click **Import** to process all records.

> **Tip:** If import errors occur, download the error report to see which rows failed and why. Fix the issues in your file and re-upload.

`[Screenshot: Onboarding import with progress bar]`

---

## 17. Organization Setup

### 17.1 Sites

Navigate to **Organization > Sites** in the sidebar.

Sites represent physical locations or work sites.

**Managing Sites:**
1. View the list of all sites.
2. Click **Add Site** to create a new location.
3. Enter the site name and details.
4. Click **Save**.
5. Edit or delete using the action buttons on each row.

`[Screenshot: Sites list]`

### 17.2 Departments

Navigate to **Organization > Departments** in the sidebar.

**Managing Departments:**
1. View the list of departments.
2. Click **Add Department** to create a new one.
3. Enter the department name and assign to a site/organization.
4. Click **Save**.

**Additional Features:**
- View positions within a department
- View department managers

`[Screenshot: Departments list]`

### 17.3 Positions

Navigate to **Organization > Positions** in the sidebar.

**Managing Positions:**
1. View the list of job positions.
2. Click **Add Position** to create a new one.
3. Enter the position title, department, and reporting structure.
4. Click **Save**.

**Additional Features:**
- View direct reports for each position

`[Screenshot: Positions list]`

### 17.4 Section Departments

Navigate to **Organization > Section Departments** in the sidebar.

Section Departments represent subdivisions within departments.

1. View the list of sections.
2. Filter by department.
3. Create, edit, or delete sections as needed.

`[Screenshot: Section departments list]`

---

## 18. Settings

### 18.1 Benefit Settings

Navigate to **Settings > Benefit Settings** in the sidebar.

Configure employee benefit parameters:
1. View existing benefit settings.
2. Click **Add** to create a new benefit setting.
3. Enter the benefit name, type, and value.
4. Click **Save**.

`[Screenshot: Benefit settings]`

### 18.2 Tax Settings

Navigate to **Settings > Tax Settings** in the sidebar.

Configure tax calculation parameters by year:
1. View tax settings for the current fiscal year.
2. Filter by year to view historical settings.
3. Edit settings to adjust tax thresholds and rates.
4. Toggle settings on/off as needed.
5. Use **Bulk Update** for batch changes.

`[Screenshot: Tax settings]`

### 18.3 Tax Brackets

Navigate to **Settings > Tax Brackets** in the sidebar.

Configure progressive tax calculation brackets:
1. View the tax bracket table showing income ranges and rates.
2. Click **Add Tax Bracket** to add a new bracket.
3. Enter the lower/upper bounds and tax rate percentage.
4. Click **Save**.

`[Screenshot: Tax brackets table]`

### 18.4 Tax Calculator

Navigate to **Settings > Tax Calculator** in the sidebar.

A utility tool to calculate tax amounts:
1. Enter an **annual income** amount.
2. The calculator shows the breakdown by bracket.
3. View the total tax amount, effective rate, and compliance check.

This tool is useful for verifying tax calculations and answering employee queries.

`[Screenshot: Tax calculator]`

### 18.5 Payroll Policies

Navigate to **Settings > Payroll Policies** in the sidebar.

Configure payroll calculation rules:
1. View existing payroll policy settings.
2. Create or edit policies that govern how payroll components are calculated.
3. These settings affect bulk payroll creation.

`[Screenshot: Payroll policy settings]`

---

## 19. Administration

### 19.1 User Management

Navigate to **Administration > Users** in the sidebar.

**Viewing Users:**
1. View the list of all system users.
2. Search by name or email.
3. See user status, roles, and last login.

**Creating a User:**
1. Click **Add User**.
2. Enter the user's name, email, and password.
3. Assign one or more roles.
4. Click **Save**.

**Managing Users:**
- **Edit** - Update user details and roles.
- **Delete** - Remove user account.
- **Force Logout** - End the user's active session immediately.
- **Bulk Status Update** - Change status for multiple users at once.
- **Bulk Role Update** - Assign roles to multiple users at once.

`[Screenshot: User management list]`
`[Screenshot: Create user form]`

### 19.2 User Permissions

1. From the User List, click the **Permissions** action on a user row.
2. The User Permissions page shows a table of all modules.
3. For each module, toggle individual permissions: Read, Create, Update, Delete.
4. Click **Save** to apply changes.

> **Note:** Permissions can be inherited from roles or assigned directly. Direct assignments override role permissions.

`[Screenshot: User permissions page]`

### 19.3 Role Management

Navigate to **Administration > Roles** in the sidebar.

**Managing Roles:**
1. View the list of roles (e.g., Admin, HR Manager, Recruitment Manager, Finance).
2. Click **Add Role** to create a new role.
3. Enter the role name and description.
4. Configure the permission template for the role (which modules and actions).
5. Click **Save**.

**Editing a Role:**
1. Click **Edit** on a role row.
2. Modify the role name or permission assignments.
3. Click **Save** to update all users assigned this role.

`[Screenshot: Role management with permission grid]`

### 19.4 Lookup Data

Navigate to **Administration > Lookup Data** in the sidebar.

Lookups are configurable reference data used throughout the system (dropdown values, status options, etc.).

**Managing Lookups:**
1. View all lookup items grouped by type.
2. Search across lookups.
3. Click **Add Lookup** to create a new reference value.
4. Enter the lookup type, key, and display value.
5. Click **Save**.

`[Screenshot: Lookup data list]`

### 19.5 Login History

Navigate to **Administration > Login History** in the sidebar (Admin role only).

View a complete audit trail of user login activity:
- Timestamp, username, IP address
- Login success/failure status
- Device/browser information
- Summary statistics

`[Screenshot: Login history]`

### 19.6 User Activity Report

Navigate to **Administration > User Activity** in the sidebar (Admin role only).

View analytics on user activity:
- Active users over time
- Most active users
- Module usage statistics
- Activity by time of day

`[Screenshot: User activity report]`

---

## 20. System Monitoring (Admin Only)

These features are available only to users with the **Admin** role.

### 20.1 System Health

Navigate to **System > System Health** in the sidebar.

View real-time system status:
- **Database** - Connection status and response time
- **Cache** - Cache system status
- **Storage** - Disk usage and availability
- **Job Queue** - Background job processing status

Each component shows a status indicator (healthy/warning/critical).

`[Screenshot: System health dashboard]`

### 20.2 Error Logs

Navigate to **System > Error Logs** in the sidebar.

View and manage system errors:
1. View the list of recent errors with severity levels (Critical, Error, Warning).
2. Click an error to view the full stack trace and details.
3. **Dismiss** individual errors to mark them as reviewed.
4. **Cleanup** to archive old errors.

**Severity Color Coding:**
- Critical/Emergency: Red
- Error: Orange
- Warning: Gold

`[Screenshot: Error logs list]`

### 20.3 Failed Jobs

Navigate to **System > Failed Jobs** in the sidebar.

Monitor background job failures:
1. View the list of failed jobs with error messages.
2. Click a job to see its details and stack trace.
3. **Retry** individual jobs or **Retry All**.
4. **Delete** individual jobs or **Flush** all failed jobs.

`[Screenshot: Failed jobs list]`

### 20.4 Performance Metrics

Navigate to **System > Performance** in the sidebar.

View system performance data:
- Overall performance summary
- Endpoint response times
- Slowest endpoints
- Request volume trends

`[Screenshot: Performance metrics dashboard]`

---

## 21. Activity Logs & Recycle Bin

### 21.1 Activity Logs

Navigate to **System > Activity Log** in the sidebar.

View a complete audit trail of all system actions:
1. View the list of activity logs with timestamp, user, action, and affected entity.
2. Each entry shows what was created, updated, or deleted.
3. **Export** the activity log data for external analysis.
4. Filter by entity type, user, or date range.

**Action Types (Color-Coded):**
- Created (green)
- Updated (blue)
- Deleted (red)

`[Screenshot: Activity log list]`

### 21.2 Recycle Bin

Navigate to **System > Recycle Bin** in the sidebar.

Manage soft-deleted records:
1. View all deleted items with deletion date and who deleted them.
2. **Statistics** - View counts of deleted items by type.
3. **Restore** - Recover individual or bulk items.
4. **Permanent Delete** - Permanently remove items (cannot be undone).

> **Warning:** Soft-deleted records are automatically purged after 90 days. Restore important records before this period expires.

`[Screenshot: Recycle bin with restore/delete options]`

---

## 22. Keyboard Shortcuts & Tips

| Shortcut | Action |
|----------|--------|
| **Ctrl+S** | Save the current form (on employee form and other edit forms) |
| **Enter** | Submit search or confirm dialog |
| **Escape** | Close modal or drawer |

**Productivity Tips:**
- Use the **search bar** on list pages for quick lookups by name or ID.
- Use the **sidebar collapse** button to maximize screen space on smaller monitors.
- On mobile devices, swipe from the left edge to open the sidebar.
- The **notification bell** shows unread count - click to stay updated.
- Use **bulk operations** (checkboxes + toolbar buttons) to manage multiple records at once.
- Download **import templates** before attempting data import to ensure correct formatting.
- Use the **Tax Calculator** to verify tax computations before finalizing payroll.

---

## 23. Troubleshooting & FAQ

### Session Expired

**Problem:** You are suddenly redirected to the login page.
**Solution:** Your session has expired due to inactivity. Log in again. Your unsaved work may be lost.

### Permission Denied

**Problem:** You see a "Permission Denied" notification or a page is not visible.
**Solution:** Your account does not have access to this module. Contact your administrator to request the necessary permissions.

### Page Not Found (404)

**Problem:** You see a "Page Not Found" error.
**Solution:** The URL is incorrect or the page has been moved. Use the sidebar navigation to find the correct page, or click the button to return to the Dashboard.

### Data Import Errors

**Problem:** Import fails with validation errors.
**Solution:**
1. Download the error report to see which rows failed.
2. Check that your file matches the template format exactly.
3. Verify all required fields are filled.
4. Check for duplicate staff IDs or invalid data values.
5. Fix the issues and re-upload.

### Payroll Calculation Issues

**Problem:** Payroll amounts look incorrect.
**Solution:** Payroll is calculated by the backend based on configured tax settings, benefit settings, and payroll policies. Check:
1. Tax Settings and Tax Brackets are up to date.
2. Employee funding allocations and FTE values are correct.
3. Benefit settings are configured properly.
Contact your administrator if issues persist.

### Slow Performance

**Problem:** Pages are loading slowly.
**Solution:**
1. Check your internet connection.
2. Clear your browser cache.
3. Try a different browser.
4. If the issue persists, administrators can check the System Health and Performance pages for server-side issues.

### Multi-Device Session Conflict

**Problem:** You see a warning about an active session on another device.
**Solution:** If you recognize the other session, choose to continue (which logs out the other session). If you don't recognize it, continue and then change your password immediately.

### Cannot See a Module in the Sidebar

**Problem:** A module you expect to see is missing from the sidebar.
**Solution:** Sidebar items are permission-gated. You need at minimum **Read** permission for the corresponding module. Contact your administrator.

---

## Appendix A: User Roles Overview

| Role | Description | Access Level |
|------|-------------|-------------|
| **Admin** | Full system access including system monitoring and user management | All modules + System section |
| **HR Manager** | Complete HR operations access | Employees, Employment, Leave, Payroll, Recruitment, Training, HRM |
| **Recruitment Manager** | Recruitment-focused access | Interviews, Job Offers |
| **Finance** | Financial and payroll access | Payroll, Tax Settings, Reports |
| **Department Manager** | Department-level access | Department employees, Leave requests |
| **Employee** | Self-service access | Own profile, Own leave requests |

> **Note:** Administrators can create custom roles with specific permission combinations.

---

## Appendix B: Status Reference

### Employee Statuses
| Status | Color | Description |
|--------|-------|-------------|
| Expats (Oxford) | Blue | Expatriate staff under Oxford contract |
| Expats (Local) | Purple | Expatriate staff under local contract |
| Local ID Staff | Green | Local staff with national ID |
| Local non ID Staff | Green | Local staff without national ID |

### Leave Request Statuses
| Status | Color |
|--------|-------|
| Pending | Orange |
| Approved | Green |
| Declined | Red |
| Cancelled | Gray |

### Training Enrollment Statuses
| Status | Color |
|--------|-------|
| Pending | Blue |
| In Progress | Orange |
| Completed | Green |

### Resignation Acknowledgement
| Status | Description |
|--------|------------|
| Pending | Awaiting acknowledgement |
| Acknowledged | Acknowledged by supervisor/HR |
| Declined | Declined by supervisor/HR |

---

## Appendix C: Organizations

| Organization | Abbreviation | Color |
|-------------|-------------|-------|
| Shoklo Malaria Research Unit | SMRU | Navy (#002147) |
| Borderland Health Foundation | BHF | Blue |

---

*This user manual covers HRMS Version 1.0. For the latest updates and features, contact your system administrator.*

*Last updated: April 2025*
