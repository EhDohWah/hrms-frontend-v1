/**
 * Acknowledgement status options for supervisor / HR manager fields.
 * Maps to backend boolean|null: null = Pending, true = Acknowledged, false = Declined.
 */
export const ACKNOWLEDGEMENT_OPTIONS = [
  { label: 'Pending', value: 'pending' },
  { label: 'Acknowledged', value: 'acknowledged' },
  { label: 'Declined', value: 'declined' },
]

/**
 * Convert a select value ('pending'|'acknowledged'|'declined') to the backend boolean.
 */
export function acknowledgementToBoolean(val) {
  if (val === 'acknowledged') return true
  if (val === 'declined') return false
  return null
}

/**
 * Convert a backend boolean (true|false|null) to a select value.
 */
export function booleanToAcknowledgement(val) {
  if (val === true) return 'acknowledged'
  if (val === false) return 'declined'
  return 'pending'
}

/**
 * Build the API payload for supervisor/HR acknowledgement fields from form state.
 * Shared by ResignationListView and ResignationModal.
 */
export function buildResignationPayload(form, employeeId) {
  const supervisorApproved = acknowledgementToBoolean(form.supervisorStatus)
  const hrApproved = acknowledgementToBoolean(form.hrStatus)
  return {
    employee_id: employeeId,
    resignation_date: form.resignation_date,
    last_working_date: form.last_working_date,
    notes: form.notes,
    supervisor_approved: supervisorApproved,
    supervisor_approved_at: supervisorApproved !== null ? (form.supervisor_approved_at || null) : null,
    hr_manager_approved: hrApproved,
    hr_manager_approved_at: hrApproved !== null ? (form.hr_manager_approved_at || null) : null,
  }
}

/**
 * Derives a display status from the two approval boolean fields.
 *
 * @param {{ supervisor_approved: boolean|null, hr_manager_approved: boolean|null }} record
 * @returns {{ label: string, color: string }}
 */
export function getResignationApprovalStatus(record) {
  const sv = record?.supervisor_approved
  const hr = record?.hr_manager_approved

  if (sv === false || hr === false) return { label: 'Declined', color: 'red' }
  if (sv === true && hr === true) return { label: 'Acknowledged', color: 'green' }
  if (sv === true) return { label: 'Supervisor Acknowledged', color: 'blue' }
  return { label: 'Pending', color: 'orange' }
}
