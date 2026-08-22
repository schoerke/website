/**
 * Preview Route Handler
 *
 * GET /api/preview?path=<relative-path>&previewSecret=<secret>
 *
 * Query Parameters:
 * - path: URL-encoded relative path to redirect to after enabling draft mode (required)
 * - previewSecret: shared secret matching PREVIEW_SECRET env var (required)
 *
 * Flow:
 * 1. Validate previewSecret against PREVIEW_SECRET
 * 2. Validate path is a safe relative path (no protocol-relative or backslash bypass)
 * 3. Authenticate request against Payload Local API
 * 4. Disable draft mode + return 403 if unauthenticated
 * 5. Enable draft mode and redirect to path
 */

import { draftMode } from 'next/headers'
import { redirect } from 'next/navigation'
import { getPayload, type PayloadRequest } from 'payload'

import config from '@/payload.config'

function isSafeRelativePath(path: string): boolean {
  if (!path.startsWith('/')) return false
  if (path.startsWith('//')) return false
  if (path.includes('\\')) return false
  return true
}

export async function GET(req: Request): Promise<Response> {
  const draft = await draftMode()

  const { searchParams } = new URL(req.url)
  const path = searchParams.get('path')
  const previewSecret = searchParams.get('previewSecret')

  if (previewSecret !== process.env.PREVIEW_SECRET) {
    return new Response('You are not allowed to preview this page', { status: 403 })
  }

  if (!path || !isSafeRelativePath(path)) {
    return new Response('Insufficient search params', { status: 400 })
  }

  const payload = await getPayload({ config })

  let user
  try {
    user = await payload.auth({
      req: req as unknown as PayloadRequest,
      headers: req.headers,
    })
  } catch (err) {
    console.warn('Preview auth failed, treating as anonymous:', err)
    user = null
  }

  if (!user) {
    draft.disable()
    return new Response('You are not allowed to preview this page', { status: 403 })
  }

  draft.enable()
  redirect(path)
}
