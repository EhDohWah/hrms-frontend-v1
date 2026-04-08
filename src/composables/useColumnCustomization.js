import { ref, computed, toValue } from 'vue'
import { storage } from '@/utils/storage'

/**
 * Composable for table column show/hide with localStorage persistence.
 *
 * @param {string} storageKey - localStorage key for persisting visible column keys
 * @param {import('vue').MaybeRefOrGetter<Array>} allColumns - Full column definitions (ref, computed, or plain array)
 * @param {string[]} defaultVisibleKeys - Column keys visible by default
 * @returns {{ visibleColumns, visibleKeys, toggleColumn, resetToDefault, isVisible, columnOptions, isCustomized }}
 */
export function useColumnCustomization(storageKey, allColumns, defaultVisibleKeys) {
  const saved = storage.get(storageKey)
  const visibleKeys = ref(
    Array.isArray(saved) ? saved : [...defaultVisibleKeys],
  )

  function persist() {
    storage.set(storageKey, visibleKeys.value)
  }

  const visibleColumns = computed(() =>
    toValue(allColumns).filter(
      (col) => col.key === 'actions' || visibleKeys.value.includes(col.key),
    ),
  )

  const columnOptions = computed(() =>
    toValue(allColumns)
      .filter((col) => col.key !== 'actions')
      .map((col) => ({ label: col.title, value: col.key })),
  )

  const isCustomized = computed(
    () =>
      visibleKeys.value.length !== defaultVisibleKeys.length ||
      !defaultVisibleKeys.every((k) => visibleKeys.value.includes(k)),
  )

  function toggleColumn(key) {
    const idx = visibleKeys.value.indexOf(key)
    if (idx === -1) {
      visibleKeys.value.push(key)
    } else if (visibleKeys.value.length > 1) {
      visibleKeys.value.splice(idx, 1)
    }
    persist()
  }

  function setVisibleKeys(keys) {
    visibleKeys.value = [...keys]
    persist()
  }

  function resetToDefault() {
    visibleKeys.value = [...defaultVisibleKeys]
    persist()
  }

  function isVisible(key) {
    return visibleKeys.value.includes(key)
  }

  return {
    visibleColumns,
    visibleKeys,
    columnOptions,
    isCustomized,
    toggleColumn,
    setVisibleKeys,
    resetToDefault,
    isVisible,
  }
}
