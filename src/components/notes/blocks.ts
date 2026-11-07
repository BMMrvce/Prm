import { sanitizeHtml } from '@/lib/sanitize-html'
import type { Blocks } from './use-note-live'

/**
 * Block-level merging for live note collaboration. Every top-level block of a note
 * (paragraph, heading, list…) carries a short `data-b` id; collaborators exchange the list
 * of blocks and each browser merges it in, never touching the block under its own caret.
 */

const BLOCK_TAGS = new Set(['P', 'DIV', 'H1', 'H2', 'H3', 'UL', 'OL', 'BLOCKQUOTE', 'PRE', 'HR'])
export const newBlockId = () => Math.random().toString(36).slice(2, 10)

/** The top-level block (paragraph, heading, list…) holding the caret. */
export function caretBlock(root: HTMLElement): HTMLElement | null {
  let node: Node | null = document.getSelection()?.anchorNode ?? null
  if (!node || !root.contains(node) || node === root) return null
  while (node && node.parentNode !== root) node = node.parentNode
  return node instanceof HTMLElement ? node : null
}

/**
 * Gives every top-level block an id (re-numbering the copy an Enter split leaves behind) and
 * wraps loose text in a paragraph, so collaborators' edits can be merged block by block.
 */
export function normalizeBlocks(root: HTMLElement) {
  const caret = document.getSelection()?.anchorNode ?? null
  for (const node of [...root.childNodes]) {
    const loose =
      (node.nodeType === Node.TEXT_NODE && node.textContent?.trim()) ||
      (node instanceof HTMLElement && !BLOCK_TAGS.has(node.tagName))
    // Never move the node the caret is in (that would drop the caret).
    if (loose && !(caret && node.contains(caret))) {
      const paragraph = document.createElement('p')
      node.replaceWith(paragraph)
      paragraph.appendChild(node)
    }
  }
  const seen = new Set<string>()
  for (const block of root.children) {
    let id = block.getAttribute('data-b')
    if (!id || seen.has(id)) {
      id = newBlockId()
      block.setAttribute('data-b', id)
    }
    seen.add(id)
  }
}

export const snapshot = (root: HTMLElement): Blocks =>
  [...root.children].map((block) => [block.getAttribute('data-b') ?? '', block.outerHTML])

/** Blocks of stored HTML (e.g. a saved version from the database). */
export function blocksOf(html: string): Blocks {
  const template = document.createElement('template')
  template.innerHTML = sanitizeHtml(html)
  return [...template.content.children].map((block) => [
    block.getAttribute('data-b') ?? newBlockId(),
    block.outerHTML,
  ])
}

/**
 * Applies a collaborator's blocks: their order, new and changed blocks, removals. The block
 * under your caret (`keep`) is never replaced or moved, so typing is never interrupted.
 */
export function mergeBlocks(root: HTMLElement, remote: Blocks, keep: string | null) {
  const local = new Map<string, Element>()
  for (const block of root.children) local.set(block.getAttribute('data-b') ?? '', block)
  const wanted = new Set(remote.map(([id]) => id))
  let previous: Element | null = null
  for (const [id, html] of remote) {
    let block = local.get(id) ?? null
    if (id !== keep) {
      const clean = sanitizeHtml(html)
      if (!block || block.outerHTML !== clean) {
        const template = document.createElement('template')
        template.innerHTML = clean
        const fresh = template.content.firstElementChild
        if (fresh) {
          if (block) block.replaceWith(fresh)
          block = fresh
        }
      }
      if (block) {
        const expected: Element | null = previous
          ? previous.nextElementSibling
          : root.firstElementChild
        if (expected !== block) {
          if (previous) previous.after(block)
          else root.prepend(block)
        }
      }
    }
    if (block) previous = block
  }
  for (const [id, block] of local) {
    if (!wanted.has(id) && id !== keep && block.isConnected) block.remove()
  }
  if (!root.firstElementChild) root.innerHTML = `<p data-b="${newBlockId()}"><br></p>`
}
