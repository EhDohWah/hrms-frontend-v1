import client from './axios'

export const uploadApi = {
  /**
   * Upload a file for bulk import.
   * @param {'grant'|'employee'|'employment'|'employee-funding-allocation'|'payroll'} module
   * @param {File} file
   */
  upload: (module, file) => {
    const formData = new FormData()
    formData.append('file', file)
    return client.post(`/uploads/${module}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },

  /**
   * Download a template or reference file.
   * @param {string} template - e.g. 'grant-template', 'employee-funding-allocations-reference'
   */
  downloadTemplate: (template) =>
    client.get(`/downloads/${template}`, { responseType: 'blob' }),
}
