'use client'

import { useRouter } from '@/i18n/navigation'
import { clsx } from 'clsx'
import { MoveLeft } from 'lucide-react'

type RouterPushHref = Parameters<ReturnType<typeof useRouter>['push']>[0]

interface BackButtonProps {
  label: string
  className?: string
  fallbackHref?: RouterPushHref
}

/**
 * Back button with browser history support.
 *
 * Uses router.back() if history exists, otherwise navigates to fallback href.
 * Styled to match SchoerkeLink with animated underline.
 */
const BackButton: React.FC<BackButtonProps> = ({ label, className, fallbackHref = '/' }) => {
  const router = useRouter()

  const handleBack = () => {
    // Check if there's history to go back to
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back()
    } else {
      // router.push from next-intl/navigation is already locale-aware
      router.push(fallbackHref)
    }
  }

  // Match SchoerkeLink styling
  const baseClasses = 'text-primary-black transition duration-150 ease-in-out hover:text-primary-black/70'
  const focusClasses =
    'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary-yellow'
  const layoutClasses = 'inline-flex items-center gap-2 group'

  const combinedClasses = clsx(baseClasses, focusClasses, layoutClasses, className)

  return (
    <button onClick={handleBack} className={combinedClasses} type="button">
      <MoveLeft className="h-4 w-4" aria-hidden={true} />
      <span className="after:bg-primary-yellow relative after:absolute after:-bottom-1 after:left-1/2 after:h-0.5 after:w-0 after:origin-center after:-translate-x-1/2 after:transition-all after:duration-300 group-hover:after:w-full">
        {label}
      </span>
    </button>
  )
}

export default BackButton
