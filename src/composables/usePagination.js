import { ref, computed } from 'vue'
import { PAGINATION_DEFAULTS } from '@/constants/config'

export function usePagination(fetchFunction) {
  const currentPage = ref(1)
  const perPage = ref(PAGINATION_DEFAULTS.perPage)
  const total = ref(0)
  const lastPage = ref(1)

  const paginationConfig = computed(() => ({
    current: currentPage.value,
    pageSize: perPage.value,
    total: total.value,
    showSizeChanger: true,
    showTotal: (t, range) => `${range[0]}-${range[1]} of ${t} items`,
    pageSizeOptions: PAGINATION_DEFAULTS.pageSizeOptions,
  }))

  function updateFromResponse(paginationData) {
    if (!paginationData) return
    currentPage.value = paginationData.current_page
    perPage.value = paginationData.per_page
    total.value = paginationData.total
    lastPage.value = paginationData.last_page
  }

  async function handleTableChange(pag) {
    currentPage.value = pag.current
    perPage.value = pag.pageSize
    if (fetchFunction) await fetchFunction()
  }

  function resetPagination() {
    currentPage.value = 1
  }

  return {
    currentPage, perPage, total, lastPage,
    paginationConfig,
    updateFromResponse, handleTableChange, resetPagination,
  }
}
