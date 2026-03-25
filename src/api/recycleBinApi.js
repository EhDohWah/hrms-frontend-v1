import client from './axios'

export const recycleBinApi = {
  /** List all deleted records (soft-deleted + legacy) */
  list: (config) => client.get('/recycle-bin', config),

  /** Get recycle bin statistics */
  stats: (config) => client.get('/recycle-bin/stats', config),

  /** Restore a soft-deleted record */
  restore: (modelType, id) => client.post(`/recycle-bin/restore/${modelType}/${id}`),

  /** Bulk restore soft-deleted records */
  bulkRestore: (items) => client.post('/recycle-bin/bulk-restore', { items }),

  /** Permanently delete a soft-deleted record */
  permanentDelete: (modelType, id) => client.delete(`/recycle-bin/permanent/${modelType}/${id}`),

  /** Restore a legacy record (Interview, JobOffer) */
  restoreLegacy: (deletedRecordId) =>
    client.post('/recycle-bin/restore-legacy', { deleted_record_id: deletedRecordId }),

  /** Bulk restore legacy records */
  bulkRestoreLegacy: (restoreRequests) =>
    client.post('/recycle-bin/bulk-restore-legacy', { restore_requests: restoreRequests }),

  /** Permanently delete a legacy record */
  permanentDeleteLegacy: (deletedRecordId) =>
    client.delete(`/recycle-bin/legacy/${deletedRecordId}`),

  /** Bulk permanently delete records (soft-deleted + legacy) */
  bulkPermanentDelete: (items) =>
    client.post('/recycle-bin/bulk-permanent-delete', { items }),
}
