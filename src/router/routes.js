import DefaultLayout from '@/layouts/DefaultLayout.vue'

export const routes = [
  // ---- Auth (auth layout) ----
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/auth/LoginView.vue'),
    meta: { guest: true, layout: 'auth' },
  },
  {
    path: '/forgot-password',
    name: 'forgot-password',
    component: () => import('@/views/auth/ForgotPasswordView.vue'),
    meta: { guest: true, layout: 'auth' },
  },

  // ---- App (default layout — eager import, never remounts) ----
  {
    path: '/',
    component: DefaultLayout,
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        name: 'dashboard',
        component: () => import('@/views/dashboard/DashboardView.vue'),
        meta: { title: 'Dashboard' },
      },
      {
        path: 'profile',
        name: 'profile',
        component: () => import('@/views/profile/ProfileView.vue'),
        meta: { title: 'My Profile' },
      },
      {
        path: 'notifications',
        name: 'notifications',
        component: () => import('@/views/notifications/NotificationsView.vue'),
        meta: { title: 'Notifications' },
      },

      // ---- Employees ----
      {
        path: 'employees',
        name: 'employees',
        component: () => import('@/views/employees/EmployeeListView.vue'),
        meta: { title: 'Employees', permission: 'employees' },
      },
      {
        path: 'employees/new',
        name: 'employee-new',
        component: () => import('@/views/employees/EmployeeFormView.vue'),
        meta: { title: 'New Employee', permission: 'employees' },
      },
      {
        path: 'employees/:id',
        name: 'employee-detail',
        component: () => import('@/views/employees/EmployeeFormView.vue'),
        meta: { title: 'Employee Detail', permission: 'employees' },
      },

      // ---- Leave Management ----
      {
        path: 'leave-types',
        name: 'leave-types',
        component: () => import('@/views/leave/LeaveTypeListView.vue'),
        meta: { title: 'Leave Types', permission: 'leave_types' },
      },
      {
        path: 'leave-requests',
        name: 'leave-requests',
        component: () => import('@/views/leave/LeaveRequestListView.vue'),
        meta: { title: 'Leave Requests', permission: 'leaves_admin' },
      },
      {
        path: 'leave-balances',
        name: 'leave-balances',
        component: () => import('@/views/leave/LeaveBalanceListView.vue'),
        meta: { title: 'Leave Balances', permission: 'leave_balances' },
      },

      // ---- Attendance ----
      {
        path: 'attendance',
        name: 'attendance',
        component: () => import('@/views/attendance/AttendanceListView.vue'),
        meta: { title: 'Attendance', permission: 'attendance_admin' },
      },

      // ---- Holidays ----
      {
        path: 'holidays',
        name: 'holidays',
        component: () => import('@/views/holidays/HolidayListView.vue'),
        meta: { title: 'Holidays', permission: 'holidays' },
      },

      // ---- Grants ----
      {
        path: 'grants',
        name: 'grants',
        component: () => import('@/views/grants/GrantListView.vue'),
        meta: { title: 'Grants', permission: 'grants_list' },
      },
      {
        path: 'grants/:id',
        name: 'grant-detail',
        component: () => import('@/views/grants/GrantDetailView.vue'),
        meta: { title: 'Grant Detail', permission: 'grants_list' },
      },
      {
        path: 'grant-positions',
        name: 'grant-positions',
        component: () => import('@/views/grants/GrantPositionListView.vue'),
        meta: { title: 'Grant Positions', permission: 'grants_list' },
      },

      // ---- Recruitment ----
      {
        path: 'interviews',
        name: 'interviews',
        component: () => import('@/views/recruitment/InterviewListView.vue'),
        meta: { title: 'Interviews', permission: 'interviews' },
      },
      {
        path: 'job-offers',
        name: 'job-offers',
        component: () => import('@/views/recruitment/JobOfferListView.vue'),
        meta: { title: 'Job Offers', permission: 'job_offers' },
      },

      // ---- Training ----
      {
        path: 'training',
        name: 'training',
        component: () => import('@/views/training/TrainingListView.vue'),
        meta: { title: 'Training', permission: 'training_list' },
      },

      // ---- Payroll ----
      {
        path: 'payroll',
        name: 'payroll',
        component: () => import('@/views/payroll/PayrollListView.vue'),
        meta: { title: 'Payroll', permission: 'employee_salary' },
      },

      // ---- Personnel Actions ----
      {
        path: 'personnel-actions',
        name: 'personnel-actions',
        component: () => import('@/views/personnel-actions/PersonnelActionListView.vue'),
        meta: { title: 'Personnel Actions', permission: 'employees' },
      },

      // ---- Transfers ----
      {
        path: 'transfers',
        name: 'transfers',
        component: () => import('@/views/transfers/TransferListView.vue'),
        meta: { title: 'Transfers', permission: 'transfer' },
      },

      // ---- Resignations ----
      {
        path: 'resignations',
        name: 'resignations',
        component: () => import('@/views/resignations/ResignationListView.vue'),
        meta: { title: 'Resignations', permission: 'resignation' },
      },
      {
        path: 'resignations/:id',
        name: 'resignation-detail',
        component: () => import('@/views/resignations/ResignationDetailView.vue'),
        meta: { title: 'Resignation Detail', permission: 'resignation' },
      },

      // ---- Reports ----
      {
        path: 'reports',
        name: 'reports',
        component: () => import('@/views/reports/ReportsView.vue'),
        meta: { title: 'Reports', permission: 'report_list' },
      },

      // ---- Data Import ----
      {
        path: 'data-import',
        name: 'data-import',
        component: () => import('@/views/uploads/DataImportView.vue'),
        meta: { title: 'Data Import', permission: 'employees' },
      },

      // ---- Organization ----
      {
        path: 'sites',
        name: 'sites',
        component: () => import('@/views/organization/SiteListView.vue'),
        meta: { title: 'Sites', permission: 'sites' },
      },
      {
        path: 'departments',
        name: 'departments',
        component: () => import('@/views/organization/DepartmentListView.vue'),
        meta: { title: 'Departments', permission: 'departments' },
      },
      {
        path: 'positions',
        name: 'positions',
        component: () => import('@/views/organization/PositionListView.vue'),
        meta: { title: 'Positions', permission: 'positions' },
      },

      // ---- Settings ----
      {
        path: 'settings/benefit',
        name: 'benefit-settings',
        component: () => import('@/views/settings/BenefitSettingsView.vue'),
        meta: { title: 'Benefit Settings', permission: 'benefit_settings' },
      },
      {
        path: 'settings/tax',
        name: 'tax-settings',
        component: () => import('@/views/settings/TaxSettingsView.vue'),
        meta: { title: 'Tax Settings', permission: 'tax_settings' },
      },
      {
        path: 'settings/tax-brackets',
        name: 'tax-brackets',
        component: () => import('@/views/settings/TaxBracketsView.vue'),
        meta: { title: 'Tax Brackets', permission: 'tax_settings' },
      },
      {
        path: 'settings/tax-calculator',
        name: 'tax-calculator',
        component: () => import('@/views/settings/TaxCalculatorView.vue'),
        meta: { title: 'Tax Calculator', permission: 'tax_settings' },
      },
      {
        path: 'settings/payroll-policy',
        name: 'payroll-policy-settings',
        component: () => import('@/views/settings/PayrollPolicySettingsView.vue'),
        meta: { title: 'Payroll Policies', permission: 'payroll_items' },
      },

      // ---- Administration ----
      {
        path: 'admin/users',
        name: 'admin-users',
        component: () => import('@/views/admin/UserListView.vue'),
        meta: { title: 'User Management', permission: 'users' },
      },
      {
        path: 'admin/users/:id/permissions',
        name: 'admin-user-permissions',
        component: () => import('@/views/admin/UserPermissionsView.vue'),
        meta: { title: 'User Permissions', permission: 'users' },
      },
      {
        path: 'admin/roles',
        name: 'admin-roles',
        component: () => import('@/views/admin/RoleListView.vue'),
        meta: { title: 'Role Management', permission: 'roles' },
      },

      // ---- Activity Log ----
      {
        path: 'activity-logs',
        name: 'activity-logs',
        component: () => import('@/views/activity-logs/ActivityLogListView.vue'),
        meta: { title: 'Activity Log' },
      },

      // ---- Recycle Bin ----
      {
        path: 'recycle-bin',
        name: 'recycle-bin',
        component: () => import('@/views/recycle-bin/RecycleBinView.vue'),
        meta: { title: 'Recycle Bin', permission: 'recycle_bin_list' },
      },

      // ---- Catch-all placeholder ----
      {
        path: ':pathMatch(.*)*',
        name: 'not-found',
        component: () => import('@/views/NotFoundView.vue'),
        meta: { title: 'Not Found', layout: 'blank' },
      },
    ],
  },
]
