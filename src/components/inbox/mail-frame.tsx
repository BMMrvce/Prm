'use client'

import { useEffect, useRef, useState } from 'react'

// Remote mail HTML is rendered in a sandbox without scripts, under a CSP that blocks
// everything except images, inline styles and fonts; links open in a new tab.
// `allow-same-origin` (still no scripts) only lets this page measure the content height.
const FRAME_HEAD =
  '<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
  '<base target="_blank">' +
  `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src https: data: cid:; style-src 'unsafe-inline' https:; font-src https: data:">` +
  '<style>' +
  'html{-webkit-text-size-adjust:100%;color-scheme:light}' +
  'body{margin:0;padding:16px;font:14px/1.55 system-ui,sans-serif;color:#202238;background:#fff;' +
  'overflow-wrap:anywhere;word-break:break-word;overflow-x:auto}' +
  // Fit fixed-width newsletter layouts and images to narrow screens.
  'img{max-width:100%!important;height:auto!important}' +
  'table{max-width:100%!important}td,th{word-break:break-word}pre{white-space:pre-wrap}' +
  '</style>'

/** An email body that grows to its full height, so the page scrolls instead of a small box. */
export function MailFrame({ title, html }: { title: string; html: string }) {
  const ref = useRef<HTMLIFrameElement>(null)
  const [height, setHeight] = useState(360)

  useEffect(() => {
    const frame = ref.current
    if (!frame) return
    let observer: ResizeObserver | undefined
    const measure = () => {
      const doc = frame.contentDocument
      if (doc?.documentElement) setHeight(Math.max(160, doc.documentElement.scrollHeight))
    }
    const onLoad = () => {
      measure()
      observer?.disconnect()
      // Images load after the document, so keep measuring as the body grows.
      const body = frame.contentDocument?.body
      if (body) {
        observer = new ResizeObserver(measure)
        observer.observe(body)
      }
    }
    frame.addEventListener('load', onLoad)
    return () => {
      frame.removeEventListener('load', onLoad)
      observer?.disconnect()
    }
  }, [html])

  return (
    <iframe
      ref={ref}
      title={title}
      sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
      srcDoc={`<!doctype html><html><head>${FRAME_HEAD}</head><body>${html}</body></html>`}
      style={{ height }}
      // Email HTML is authored for white paper and cannot read the app's CSS variables, so it
      // keeps a white page (like other mail clients) in both themes.
      className="block w-full rounded-b-xl bg-white"
    />
  )
}
