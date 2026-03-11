import { message } from 'ant-design-vue'

/**
 * Wraps Ant Design's message API for consistent toast notifications.
 * Use this instead of importing message directly in components.
 */
export function useNotification() {
  return {
    success: (msg) => message.success(msg),
    error: (msg) => message.error(msg),
    warning: (msg) => message.warning(msg),
    info: (msg) => message.info(msg),
    loading: (msg) => message.loading(msg),
  }
}
