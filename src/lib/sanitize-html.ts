/**
 * Allow-list HTML cleaner for rich text the app stores or sends (notes, outgoing mail,
 * pasted content). Browser only: it parses with DOMParser and rebuilds just the allowed
 * tags and attributes, so scripts, event handlers, styles and `javascript:` links never
 * survive.
 */
const TAGS = new Set([
  'p',
  'div',
  'br',
  'span',
  'b',
  'strong',
  'i',
  'em',
  'u',
  's',
  'strike',
  'del',
  'mark',
  'code',
  'pre',
  'blockquote',
  'h1',
  'h2',
  'h3',
  'ul',
  'ol',
  'li',
  'a',
  'hr',
  'font',
])

/** Classes the notes editor uses for colors, to-dos and callouts. */
const CLASS = /^(?:nc-[a-z-]+|note-[a-z-]+)$/

/** `data-b` is the block id Notes uses to merge collaborators' edits block by block. */
const ATTRS: Record<string, string[]> = {
  a: ['href', 'title'],
  li: ['data-checked', 'data-b'],
  ul: ['data-type', 'data-b'],
  ol: ['data-b'],
  p: ['data-b'],
  div: ['data-b'],
  h1: ['data-b'],
  h2: ['data-b'],
  h3: ['data-b'],
  blockquote: ['data-b'],
  pre: ['data-b'],
  hr: ['data-b'],
  font: ['color'],
}

const SAFE_URL = /^(?:https?:|mailto:|tel:|#|\/)/i
const SAFE_COLOR = /^#[0-9a-f]{3,8}$|^[a-z]+$/i

function clean(node: Node, doc: Document): Node | null {
  if (node.nodeType === Node.TEXT_NODE) return doc.createTextNode(node.textContent ?? '')
  if (node.nodeType !== Node.ELEMENT_NODE) return null
  const element = node as Element
  const tag = element.tagName.toLowerCase()
  if (['script', 'style', 'iframe', 'object', 'embed', 'template', 'svg', 'math'].includes(tag)) {
    return null
  }
  const children = [...element.childNodes]
    .map((child) => clean(child, doc))
    .filter((child): child is Node => child !== null)
  // Unknown tags keep their text content.
  if (!TAGS.has(tag)) {
    const fragment = doc.createDocumentFragment()
    children.forEach((child) => fragment.appendChild(child))
    return fragment
  }
  const out = doc.createElement(tag)
  for (const name of ATTRS[tag] ?? []) {
    const value = element.getAttribute(name)
    if (value === null) continue
    if (name === 'href' && !SAFE_URL.test(value.trim())) continue
    if (name === 'color' && !SAFE_COLOR.test(value.trim())) continue
    if (name === 'data-b' && !/^[a-z0-9]{1,16}$/i.test(value)) continue
    out.setAttribute(name, value)
  }
  const classes = (element.getAttribute('class') ?? '')
    .split(/\s+/)
    .filter((item) => CLASS.test(item))
  if (classes.length) out.setAttribute('class', classes.join(' '))
  if (tag === 'a') {
    out.setAttribute('target', '_blank')
    out.setAttribute('rel', 'noopener noreferrer')
  }
  children.forEach((child) => out.appendChild(child))
  return out
}

export function sanitizeHtml(html: string) {
  if (typeof window === 'undefined' || !html) return ''
  const parsed = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html')
  const container = parsed.createElement('div')
  ;[...parsed.body.childNodes].forEach((child) => {
    const cleaned = clean(child, parsed)
    if (cleaned) container.appendChild(cleaned)
  })
  return container.innerHTML
}

/** Plain text of some HTML (for previews and search). */
export function htmlToText(html: string) {
  if (typeof window === 'undefined' || !html) return ''
  const parsed = new DOMParser().parseFromString(html, 'text/html')
  parsed.querySelectorAll('br').forEach((br) => br.replaceWith('\n'))
  parsed.querySelectorAll('p,div,li,h1,h2,h3,blockquote,pre').forEach((block) => block.append('\n'))
  return (parsed.body.textContent ?? '').replace(/\n{3,}/g, '\n\n').trim()
}
