import { isSpaceKey } from '@/data/workspaces'
import { errorMessage, listMail, sendMail } from '@/lib/mail'
import {
  MAX_ATTACHMENT_BYTES,
  MAX_ATTACHMENTS,
  type OutgoingAttachment,
  type SendMailInput,
} from '@/lib/mail/types'
import { currentUserId } from '@/lib/supabase/user'

type Context = { params: Promise<{ space: string }> }

const ADDRESS_LIST = /^[^\s@,]+@[^\s@,]+(\s*,\s*[^\s@,]+@[^\s@,]+)*$/

/**
 * GET /api/mail/[space]?folder=inbox|sent&search=…&after=…&before=…&cursor=… → one page of
 * your mailbox for that workspace, with `nextCursor` for the next page.
 */
export async function GET(request: Request, { params }: Context) {
  const { space } = await params
  if (!isSpaceKey(space)) return Response.json({ error: 'Unknown workspace' }, { status: 404 })
  const userId = await currentUserId()
  if (!userId) return Response.json({ error: 'Not signed in' }, { status: 401 })
  const search = new URL(request.url).searchParams
  const folder = search.get('folder') === 'sent' ? 'sent' : 'inbox'
  return Response.json(
    await listMail(userId, space, folder, {
      search: search.get('search')?.slice(0, 200) || undefined,
      after: search.get('after') || undefined,
      before: search.get('before') || undefined,
      cursor: search.get('cursor') || undefined,
      limit: Math.min(50, Math.max(5, Number(search.get('limit')) || 40)),
    }),
  )
}

/** Reads the message from multipart form data (with files) or, for older clients, JSON. */
async function readInput(request: Request): Promise<Partial<SendMailInput> | null> {
  const type = request.headers.get('content-type') ?? ''
  if (!type.includes('multipart/form-data')) {
    return (await request.json().catch(() => null)) as Partial<SendMailInput> | null
  }
  const form = await request.formData().catch(() => null)
  if (!form) return null
  const text = (name: string) => {
    const value = form.get(name)
    return typeof value === 'string' ? value : undefined
  }
  const files = form.getAll('attachments').filter((item): item is File => item instanceof File)
  const attachments: OutgoingAttachment[] = await Promise.all(
    files.map(async (file) => ({
      filename: file.name || 'attachment',
      contentType: file.type || 'application/octet-stream',
      content: Buffer.from(await file.arrayBuffer()),
    })),
  )
  return {
    to: text('to'),
    cc: text('cc'),
    subject: text('subject'),
    body: text('body'),
    html: text('html'),
    attachments,
  }
}

/**
 * POST /api/mail/[space] with { to, cc?, subject, body, html? } and optional `attachments`
 * files (multipart) → sends from your mailbox for that workspace.
 */
export async function POST(request: Request, { params }: Context) {
  const { space } = await params
  if (!isSpaceKey(space)) return Response.json({ error: 'Unknown workspace' }, { status: 404 })
  const userId = await currentUserId()
  if (!userId) return Response.json({ error: 'Not signed in' }, { status: 401 })
  const input = await readInput(request)
  const to = input?.to?.trim().replace(/,$/, '')
  if (!to || !ADDRESS_LIST.test(to)) {
    return Response.json({ error: 'Enter one or more valid email addresses.' }, { status: 400 })
  }
  const cc = input?.cc?.trim().replace(/,$/, '')
  if (cc && !ADDRESS_LIST.test(cc)) {
    return Response.json({ error: 'Check the Cc addresses.' }, { status: 400 })
  }
  const attachments = input?.attachments ?? []
  if (attachments.length > MAX_ATTACHMENTS) {
    return Response.json({ error: `Attach at most ${MAX_ATTACHMENTS} files.` }, { status: 400 })
  }
  if (attachments.reduce((sum, file) => sum + file.content.length, 0) > MAX_ATTACHMENT_BYTES) {
    return Response.json({ error: 'Attachments can total up to 4 MB.' }, { status: 413 })
  }
  try {
    await sendMail(userId, space, {
      to,
      cc: cc || undefined,
      subject: input?.subject?.trim() ?? '',
      body: input?.body ?? '',
      html: input?.html || undefined,
      attachments,
    })
    return Response.json({ ok: true })
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: 502 })
  }
}
