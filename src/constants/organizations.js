export const ORGANIZATIONS = {
  SMRU: { code: 'SMRU', label: 'SMRU', fullName: 'Shoklo Malaria Research Unit', color: '#002147' },
  BHF: { code: 'BHF', label: 'BHF', fullName: 'Borderland Health Foundation', color: 'blue' },
}

export const ORG_OPTIONS = Object.values(ORGANIZATIONS)

export const getOrgColor = (code) => ORGANIZATIONS[code]?.color ?? 'default'

export const ORG_RECORD_VIEW_CONFIG = {
  SMRU: { short: 'SMRU', name: 'Shoklo Malaria Research Unit', subtitle: 'Faculty of Tropical Medicine, Mahidol University', theme: 'smru' },
  BHF: { short: 'BHF', name: 'Borderland Health Foundation', subtitle: 'มูลนิธิ เดอะ บอร์เดอร์แลนด์ เฮลท์', theme: 'bhf' },
}
