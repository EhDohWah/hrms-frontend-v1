import { reactive, computed } from 'vue'
import { PAGINATION_DEFAULTS } from '@/constants/config'

/**
 * Composable for Ant Design table pagination.
 *
 * Usage:
 *   const { pagination, tablePagination, handleTableChange, refresh } = usePagination(fetchFn)
 *
 * fetchFn receives { page, per_page } and should return the API response.
 * The composable extracts pagination meta from the response automatically.
 */
export function usePagination(fetchFunction) {
  const pagination = reactive({
    current_page: 1,
    per_page: PAGINATION_DEFAULTS.perPage,
    total: 0,
    last_page: 1,
  })

  const tablePagination = computed(() => ({
    current: pagination.current_page,
    pageSize: pagination.per_page,
    total: pagination.total,
    showSizeChanger: true,
    showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} items`,
    pageSizeOptions: PAGINATION_DEFAULTS.pageSizeOptions,
  }))

  function updateFromResponse(data) {
    if (!data) return
    // Support multiple Laravel response shapes:
    // 1. { current_page, per_page, total } — direct pagination object
    // 2. { meta: { current_page, ... } } — resource collection
    // 3. { data: { current_page, ... } } — wrapped pagination (BaseApiController)
    const meta = data.meta || data.data || data
    if (meta.current_page != null) pagination.current_page = meta.current_page
    if (meta.per_page != null) pagination.per_page = meta.per_page
    if (meta.total != null) pagination.total = meta.total
    if (meta.last_page != null) pagination.last_page = meta.last_page
  }

  async function doFetch() {
    if (!fetchFunction) return
    const result = await fetchFunction({
      page: pagination.current_page,
      per_page: pagination.per_page,
    })
    if (result) updateFromResponse(result)
  }

  function handleTableChange(pag) {
    pagination.current_page = pag.current
    pagination.per_page = pag.pageSize
    doFetch()
  }

  function refresh() {
    pagination.current_page = 1
    doFetch()
  }

  return {
    pagination,
    tablePagination,
    handleTableChange,
    refresh,
    // Legacy exports for backward compat
    currentPage: computed(() => pagination.current_page),
    perPage: computed(() => pagination.per_page),
    total: computed(() => pagination.total),
    lastPage: computed(() => pagination.last_page),
    paginationConfig: tablePagination,
    updateFromResponse,
    resetPagination: refresh,
  }
}
