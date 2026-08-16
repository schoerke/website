import { createHash } from 'node:crypto'

import type { Payload, User } from 'payload'

import { resolveAccountAvatarImage } from '@/utils/avatar'

// Admin chrome: plain <img> is intentional (remote Gravatar + Payload's own /api/images URLs, no next/image remote patterns).
/* oxlint-disable no-img-element */

interface AccountAvatarProps {
  payload: Payload
  user: User | null
}

const baseClass = 'graphic-account'

const DefaultAccountIcon = (
  <svg className={baseClass} height="25" viewBox="0 0 25 25" width="25" xmlns="http://www.w3.org/2000/svg">
    <circle className={`${baseClass}__bg`} cx="12.5" cy="12.5" r="11.5" />
    <circle className={`${baseClass}__head`} cx="12.5" cy="10.73" r="3.98" />
    <path
      className={`${baseClass}__body`}
      d="M12.5,24a11.44,11.44,0,0,0,7.66-2.94c-.5-2.71-3.73-4.8-7.66-4.8s-7.16,2.09-7.66,4.8A11.44,11.44,0,0,0,12.5,24Z"
    />
  </svg>
)

const AVATAR_SIZE = 25

const AccountAvatar = async ({ payload, user }: AccountAvatarProps) => {
  const imageUrl = await resolveAccountAvatarImage(payload, user?.email)

  if (imageUrl) {
    return (
      <span
        style={{
          borderRadius: '50%',
          display: 'inline-flex',
          height: AVATAR_SIZE,
          overflow: 'hidden',
          width: AVATAR_SIZE,
        }}
      >
        <img
          alt={user?.name ?? 'Account'}
          src={imageUrl}
          style={{ height: '100%', objectFit: 'cover', width: '100%' }}
        />
      </span>
    )
  }

  // Fall back to the avatar Payload renders by default (per-email Gravatar)
  if (!user?.email) {
    return DefaultAccountIcon
  }

  const hash = createHash('md5').update(user.email.trim().toLowerCase()).digest('hex')

  return (
    <img
      alt={user?.name ?? 'Account'}
      height={AVATAR_SIZE}
      src={`https://www.gravatar.com/avatar/${hash}?default=mp&r=g&s=50`}
      style={{ borderRadius: '50%' }}
      width={AVATAR_SIZE}
    />
  )
}

export default AccountAvatar
