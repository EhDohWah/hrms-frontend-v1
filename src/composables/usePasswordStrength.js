import { computed, toValue } from 'vue'

/**
 * Live password requirements validation and strength metering.
 * @param {Ref<string>|() => string} passwordRef - Reactive password value or getter
 */
export function usePasswordStrength(passwordRef) {
  const requirements = computed(() => {
    const pw = toValue(passwordRef) || ''
    return [
      { key: 'length', label: 'At least 8 characters', met: pw.length >= 8 },
      { key: 'upper', label: 'One uppercase letter', met: /[A-Z]/.test(pw) },
      { key: 'lower', label: 'One lowercase letter', met: /[a-z]/.test(pw) },
      { key: 'number', label: 'One number', met: /\d/.test(pw) },
      { key: 'special', label: 'One special character (@$!%*?&)', met: /[@$!%*?&]/.test(pw) },
    ]
  })

  const metCount = computed(() => requirements.value.filter(r => r.met).length)
  const allMet = computed(() => metCount.value === requirements.value.length)

  const strengthPercent = computed(() => (metCount.value / requirements.value.length) * 100)
  const strengthClass = computed(() => {
    if (metCount.value <= 2) return 'pw-strength--weak'
    if (metCount.value <= 4) return 'pw-strength--fair'
    return 'pw-strength--strong'
  })
  const strengthLabel = computed(() => {
    if (metCount.value <= 2) return 'Weak'
    if (metCount.value <= 4) return 'Fair'
    return 'Strong'
  })

  function validatePassword(_rule, value) {
    if (!value) return Promise.resolve()
    if (!allMet.value) return Promise.reject('Password does not meet all requirements')
    return Promise.resolve()
  }

  function validateMatch(_rule, value) {
    if (!value) return Promise.resolve()
    if (value !== toValue(passwordRef)) return Promise.reject('Passwords do not match')
    return Promise.resolve()
  }

  return {
    requirements,
    metCount,
    allMet,
    strengthPercent,
    strengthClass,
    strengthLabel,
    validatePassword,
    validateMatch,
  }
}
