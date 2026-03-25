export const ORGANIZATIONS = {
  SMRU: { code: 'SMRU', label: 'SMRU', fullName: 'Shoklo Malaria Research Unit', color: 'blue' },
  BHF: { code: 'BHF', label: 'BHF', fullName: 'Borderland Health Foundation', color: 'green' },
}

export const ORG_OPTIONS = Object.values(ORGANIZATIONS)

export const getOrgColor = (code) => ORGANIZATIONS[code]?.color ?? 'default'
