import {
  getThemeCategoryLabel,
  themeCategoryHeadingMap,
  type ThemeCategory,
} from '../lib/theme-categories.js'

const importSourceLabel = 'S-99a_T'

const ignoredPdfLines = new Set([
  'Títulos dos discursos públicos',
  '— Lista por assunto',
  'Esta relação de títulos de esboços está alistada por assunto para ajudar os anciãos a',
  'identificar mais facilmente em que categoria estão os esboços dos discursos públicos.',
  'Esta lista deve ser usada junto com a relação de',
  'Títulos dos Discursos Públicos',
  '(S-99). É',
  'apenas para uso congregacional.',
  'S-99a-T 2/26',
])

export type ParsedThemeCatalogItem = {
  number: number
  title: string
  category: ThemeCategory
  isActive: boolean
}

export type ParsedThemeCatalog = {
  items: ParsedThemeCatalogItem[]
  sourceLabel: string
}

export type ThemeImportComparable = {
  number: number
  title: string
  category: ThemeCategory
  isActive: boolean
}

type ExistingThemeComparable = {
  number: number
  title: string
  category?: ThemeCategory | null
  isActive: boolean
}

export type ThemeImportPreview = {
  createCount: number
  updateCount: number
  unchangedCount: number
  categoryBreakdown: Array<{
    category: ThemeCategory
    count: number
  }>
}

function normalizePdfLine(line: string) {
  return line
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.;:!?])/g, '$1')
    .replace(/\(\s+/g, '(')
    .replace(/\s+\)/g, ')')
    .trim()
}

function parseThemeLine(
  line: string,
  category: ThemeCategory | null,
): ParsedThemeCatalogItem | null {
  if (!category) {
    return null
  }

  const match = line.match(/^(\d+)\.\s+(.+)$/)

  if (!match) {
    return null
  }

  const numberValue = match[1]
  const rawTitle = match[2]

  if (!numberValue || !rawTitle) {
    return null
  }

  const number = Number.parseInt(numberValue, 10)

  if (!Number.isInteger(number) || number <= 0) {
    return null
  }

  const title = rawTitle.trim()

  return {
    number,
    title,
    category,
    isActive: title !== '(Indisponível)',
  }
}

export function parseThemeCatalogLines(lines: string[]): ParsedThemeCatalog {
  const items: ParsedThemeCatalogItem[] = []
  const seenNumbers = new Set<number>()
  let currentCategory: ThemeCategory | null = null

  lines.forEach((rawLine) => {
    const line = normalizePdfLine(rawLine)

    if (!line || ignoredPdfLines.has(line)) {
      return
    }

    const headingCategory = themeCategoryHeadingMap[line]

    if (headingCategory) {
      currentCategory = headingCategory
      return
    }

    const parsedItem = parseThemeLine(line, currentCategory)

    if (!parsedItem) {
      return
    }

    if (seenNumbers.has(parsedItem.number)) {
      throw new Error(
        `O catálogo ${importSourceLabel} contém o tema ${parsedItem.number} mais de uma vez.`,
      )
    }

    seenNumbers.add(parsedItem.number)
    items.push(parsedItem)
  })

  if (items.length === 0) {
    throw new Error(`Não foi possível localizar temas válidos no PDF ${importSourceLabel}.`)
  }

  return {
    items: items.sort((left, right) => left.number - right.number),
    sourceLabel: importSourceLabel,
  }
}

export function buildThemeImportPreview(
  importedItems: ThemeImportComparable[],
  existingThemes: ExistingThemeComparable[],
): ThemeImportPreview {
  const existingThemesByNumber = new Map(
    existingThemes.map((theme) => [theme.number, theme]),
  )
  const categoryCounts = new Map<ThemeCategory, number>()
  let createCount = 0
  let updateCount = 0
  let unchangedCount = 0

  importedItems.forEach((item) => {
    categoryCounts.set(item.category, (categoryCounts.get(item.category) ?? 0) + 1)

    const existingTheme = existingThemesByNumber.get(item.number)

    if (!existingTheme) {
      createCount += 1
      return
    }

    const isChanged =
      existingTheme.title !== item.title ||
      existingTheme.category !== item.category ||
      existingTheme.isActive !== item.isActive

    if (isChanged) {
      updateCount += 1
      return
    }

    unchangedCount += 1
  })

  return {
    createCount,
    updateCount,
    unchangedCount,
    categoryBreakdown: Array.from(categoryCounts.entries())
      .sort((left, right) => left[1] - right[1])
      .map(([category, count]) => ({
        category,
        count,
      })),
  }
}

export function getThemeImportCategorySummary(category: ThemeCategory, count: number) {
  return `${getThemeCategoryLabel(category)}: ${count}`
}
