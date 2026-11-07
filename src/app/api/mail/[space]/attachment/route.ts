import { isSpaceKey } from '@/data/workspaces'
import { errorMessage, mailAttachment } from '@/lib/mail'
import { currentUserId } from '@/lib/supabase/user'

/** Chunks large files so the response streams instead of buffering in one piece. */
const CHUNK = 256 * 1024

/** RFC 6266 filename: ASCII fallback plus the UTF-8 original. */
function disposition(filename: string) {
  const ascii = filename.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_')
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename)}`
}

/**
 * GET /api/mail/[space]/attachment?folder=inbox|sent&id=<message>&att=<attachment> → the file.
 * Always served as a download, never rendered on this site, so an HTML or SVG attachment
 * cannot run in the app's origin.
 */
export async function GET(request: Request, { params }: { params: Promise<{ space: string }> }) {
  const { space } = await params
  if (!isSpaceKey(space)) return Response.json({ error: 'Unknown workspace' }, { status: 404 })
  const userId = await currentUserId()
  if (!userId) return Response.json({ error: 'Not signed in' }, { status: 401 })
  const search = new URL(request.url).searchParams
  const id = search.get('id')
  const attachmentId = search.get('att')
  if (!id || !attachmentId) {
    return Response.json({ error: 'Missing message or attachment id' }, { status: 400 })
  }
  try {
    const folder = search.get('folder') === 'sent' ? 'sent' : 'inbox'
    const file = await mailAttachment(userId, space, folder, id, attachmentId)
    if (!file) return Response.json({ error: 'Attachment not found' }, { status: 404 })
    const bytes = file.content
    let offset = 0
    const body = new ReadableStream<Uint8Array>({
      pull(controller) {
        if (offset >= bytes.length) return controller.close()
        controller.enqueue(new Uint8Array(bytes.subarray(offset, offset + CHUNK)))
        offset += CHUNK
      },
    })
    return new Response(body, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Length': String(bytes.length),
        'Content-Disposition': disposition(file.filename),
        'X-Content-Type-Options': 'nosniff',
        'Content-Security-Policy': "sandbox; default-src 'none'",
        'Cache-Control': 'private, no-store',
      },
    })
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: 502 })
  }
}
