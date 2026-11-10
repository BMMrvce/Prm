/** Quotes a CSV field, doubling any embedded quotes. */
function csvField(value: string) {
  return `"${value.replaceAll('"', '""')}"`
}

export function toCsv(headers: string[], rows: string[][]) {
  return [headers, ...rows].map((row) => row.map(csvField).join(',')).join('\n')
}

/** Triggers a browser download of `csv` as `filename`. */
export function downloadCsv(filename: string, csv: string) {
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
