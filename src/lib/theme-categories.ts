export const themeCategoryValues = [
  'bibleGod',
  'evangelismMinistry',
  'familyYoungPeople',
  'faithSpirituality',
  'worldNoPart',
  'trialsProblems',
  'christianQualitiesStandards',
  'kingdomParadise',
  'religionWorship',
  'lastDaysJudgment',
] as const

export type ThemeCategory = (typeof themeCategoryValues)[number]

export const themeCategoryLabels: Record<ThemeCategory, string> = {
  bibleGod: 'Bíblia/Deus',
  evangelismMinistry: 'Evangelização/ministério',
  familyYoungPeople: 'Família/jovens',
  faithSpirituality: 'Fé/espiritualidade',
  worldNoPart: 'Mundo, não fazer parte do',
  trialsProblems: 'Provações/problemas',
  christianQualitiesStandards: 'Qualidades/padrões cristãos',
  kingdomParadise: 'Reino/paraíso',
  religionWorship: 'Religião/adoração',
  lastDaysJudgment: 'Últimos dias/julgamento de Deus',
}

export const themeCategoryHeadingMap: Record<string, ThemeCategory> = {
  'BÍBLIA/DEUS': 'bibleGod',
  'EVANGELIZAÇÃO/MINISTÉRIO': 'evangelismMinistry',
  'FAMÍLIA/JOVENS': 'familyYoungPeople',
  'FÉ/ESPIRITUALIDADE': 'faithSpirituality',
  'MUNDO, NÃO FAZER PARTE DO': 'worldNoPart',
  'PROVAÇÕES/PROBLEMAS': 'trialsProblems',
  'QUALIDADES E PADRÕES CRISTÃOS': 'christianQualitiesStandards',
  'REINO/PARAÍSO': 'kingdomParadise',
  'RELIGIÃO/ADORAÇÃO': 'religionWorship',
  'ÚLTIMOS DIAS/JULGAMENTO DE DEUS': 'lastDaysJudgment',
}

export const themeCategoryOptions = themeCategoryValues.map((value) => ({
  value,
  label: themeCategoryLabels[value],
}))

export function getThemeCategoryLabel(category: ThemeCategory | null | undefined) {
  if (!category) {
    return 'Sem categoria'
  }

  return themeCategoryLabels[category]
}
