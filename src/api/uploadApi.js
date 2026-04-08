import client from './axios'

export const uploadApi = {
  /**
   * Upload a file for bulk import (commit mode).
   * @param {'grant'|'employee'|'employment'|'employee-funding-allocation'|'payroll'|'data-onboarding'} module
   * @param {File} file
   */
  upload: (module, file) => {
    const formData = new FormData()
    formData.append('file', file)
    return client.post(`/uploads/${module}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000,
    })
  },

  /**
   * Validate a file without committing (preview mode).
   * Returns structured per-row validation results.
   */
  validate: (module, file) => {
    const formData = new FormData()
    formData.append('file', file)
    return client.post(`/uploads/${module}?mode=validate`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000,
    })
  },

  /**
   * Download a template or reference file.
   * @param {string} template - e.g. 'grant-template', 'employee-funding-allocations-reference'
   */
  downloadTemplate: (template) =>
    client.get(`/downloads/${template}`, { responseType: 'blob' }),

  /**
   * Get import history for a module.
   * @param {string} [module] - optional filter: 'grant', 'employee', 'data-onboarding'
   */
  importHistory: (module) =>
    client.get('/import-history', { params: module ? { module } : {} }),
}
