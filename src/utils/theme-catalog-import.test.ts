import assert from 'node:assert/strict'
import { test } from 'node:test'

import { parseThemeCatalogLines, buildThemeImportPreview } from './theme-catalog-import.js'

test('parseThemeCatalogLines extracts categories and unavailable titles correctly', () => {
  const parsedCatalog = parseThemeCatalogLines([
    'Títulos dos discursos públicos',
    'BÍBLIA/DEUS',
    '4. Que provas temos de que Deus existe?',
    '26. Você é importante para Deus?',
    'REINO/PARAÍSO',
    '132. (Indisponível)',
    '182. O que o Reino de Deus está fazendo por nós agora?',
  ])

  assert.equal(parsedCatalog.sourceLabel, 'S-99a_T')
  assert.deepEqual(parsedCatalog.items, [
    {
      number: 4,
      title: 'Que provas temos de que Deus existe?',
      category: 'bibleGod',
      isActive: true,
    },
    {
      number: 26,
      title: 'Você é importante para Deus?',
      category: 'bibleGod',
      isActive: true,
    },
    {
      number: 132,
      title: '(Indisponível)',
      category: 'kingdomParadise',
      isActive: false,
    },
    {
      number: 182,
      title: 'O que o Reino de Deus está fazendo por nós agora?',
      category: 'kingdomParadise',
      isActive: true,
    },
  ])
})

test('buildThemeImportPreview reports create, update and unchanged counts', () => {
  const preview = buildThemeImportPreview(
    [
      {
        number: 4,
        title: 'Que provas temos de que Deus existe?',
        category: 'bibleGod',
        isActive: true,
      },
      {
        number: 132,
        title: '(Indisponível)',
        category: 'kingdomParadise',
        isActive: false,
      },
      {
        number: 182,
        title: 'O que o Reino de Deus está fazendo por nós agora?',
        category: 'kingdomParadise',
        isActive: true,
      },
    ],
    [
      {
        number: 4,
        title: 'Que provas temos de que Deus existe?',
        category: 'bibleGod',
        isActive: true,
      },
      {
        number: 132,
        title: 'Tema antigo',
        category: 'religionWorship',
        isActive: true,
      },
    ],
  )

  assert.equal(preview.createCount, 1)
  assert.equal(preview.updateCount, 1)
  assert.equal(preview.unchangedCount, 1)
})
