import client from './axios'

/**
 * Downloads a blob response and triggers a browser save dialog.
 * @param {import('axios').AxiosResponse} response
 * @param {string} fallbackFilename
 */
function downloadBlob(response, fallbackFilename) {
  const disposition = response.headers['content-disposition']
  let filename = fallbackFilename
  if (disposition) {
    const match = disposition.match(/filename[^;=\n]*=["']?([^"';\n]+)/)
    if (match) filename = match[1].trim()
  }
  const url = window.URL.createObjectURL(new Blob([response.data]))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}

export const reportApi = {
  /**
   * Export interview report as PDF (POST with body).
   * @param {{ start_date: string, end_date: string }} params
   */
  exportInterviewPdf: (params) =>
    client.post('/reports/interview-report/export-pdf', params, { responseType: 'blob' }),

  /**
   * Export interview report as Excel (GET with query params).
   * @param {{ start_date: string, end_date: string }} params
   */
  exportInterviewExcel: (params) =>
    client.get('/reports/interview-report/export-excel', { params, responseType: 'blob' }),

  /**
   * Export job offer report as PDF (POST with body).
   * @param {{ start_date: string, end_date: string }} params
   */
  exportJobOfferPdf: (params) =>
    client.post('/reports/job-offer-report/export-pdf', params, { responseType: 'blob' }),

  /**
   * Export department leave request report as PDF (POST with body).
   * @param {{ start_date: string, end_date: string, work_location: string, department: string }} params
   */
  exportDepartmentLeavePdf: (params) =>
    client.post('/reports/leave-request-report/export-pdf', params, { responseType: 'blob' }),

  /**
   * Export individual employee leave request report as PDF (POST with body).
   * @param {{ start_date: string, end_date: string, staff_id: string }} params
   */
  exportIndividualLeavePdf: (params) =>
    client.post('/reports/leave-request-report/export-individual-pdf', params, { responseType: 'blob' }),

  /**
   * Export Payroll Registration Report as PDF.
   * @param {{ organization: string, pay_period_date: string }} params
   */
  exportPayrollRegistrationPdf: (params) =>
    client.post('/payrolls/registration-report', params, { responseType: 'blob' }),

  /**
   * Export Payroll Register as Excel (per grant).
   * @param {{ organization: string, pay_period_date: string, grant_code: string }} params
   */
  exportPayrollRegisterExcel: (params) =>
    client.post('/payrolls/register-excel', params, { responseType: 'blob' }),

  /**
   * Export PND91 government filing as text file.
   * @param {{ organization: string, year: number }} params
   */
  exportPND91: (params) =>
    client.post('/government-exports/pnd91', params, { responseType: 'blob' }),

  downloadBlob,
}
