import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist/legacy/build/pdf.mjs'
import pdfWorkerUrl from 'pdfjs-dist/legacy/build/pdf.worker.mjs?url'

import { parseThemeCatalogLines, type ParsedThemeCatalog } from './theme-catalog-import'

GlobalWorkerOptions.workerSrc = pdfWorkerUrl

type PositionedTextItem = {
  text: string
  x: number
  y: number
}

function isPositionedTextItem(value: unknown): value is {
  str: string
  transform: number[]
} {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const candidate = value as { str?: unknown; transform?: unknown }

  return typeof candidate.str === 'string' && Array.isArray(candidate.transform)
}

function normalizePdfLine(line: string) {
  return line
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.;:!?])/g, '$1')
    .replace(/\(\s+/g, '(')
    .replace(/\s+\)/g, ')')
    .trim()
}

function groupTextRows(items: PositionedTextItem[]) {
  const rows: Array<{
    y: number
    segments: Array<{
      text: string
      x: number
    }>
  }> = []

  items.forEach((item) => {
    const existingRow = rows.find((row) => Math.abs(row.y - item.y) <= 2)

    if (existingRow) {
      existingRow.segments.push({
        text: item.text,
        x: item.x,
      })
      return
    }

    rows.push({
      y: item.y,
      segments: [
        {
          text: item.text,
          x: item.x,
        },
      ],
    })
  })

  return rows
    .sort((left, right) => right.y - left.y)
    .map((row) =>
      normalizePdfLine(
        row.segments
          .sort((left, right) => left.x - right.x)
          .map((segment) => segment.text)
          .join(' '),
      ),
    )
    .filter(Boolean)
}

async function extractPdfLines(file: File) {
  const data = new Uint8Array(await file.arrayBuffer())
  const document = await getDocument({ data }).promise
  const lines: string[] = []

  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber)
    const textContent = await page.getTextContent()
    const positionedItems: PositionedTextItem[] = []

    textContent.items.forEach((item) => {
      if (!isPositionedTextItem(item)) {
        return
      }

      positionedItems.push({
        text: item.str,
        x: item.transform[4] ?? 0,
        y: item.transform[5] ?? 0,
      })
    })

    lines.push(...groupTextRows(positionedItems))
  }

  return lines
}

export async function parseThemeCatalogPdf(file: File): Promise<ParsedThemeCatalog> {
  if (file.type && file.type !== 'application/pdf') {
    throw new Error('Selecione um arquivo PDF válido do catálogo oficial de temas.')
  }

  return parseThemeCatalogLines(await extractPdfLines(file))
}
