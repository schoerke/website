'use client'

import { useRouter } from '@/i18n/navigation'

type RouterPushHref = Parameters<ReturnType<typeof useRouter>['push']>[0]

interface BackButtonProps {
  label: string
  className?: string
  labelClassName?: string
  fallbackHref?: RouterPushHref
}

const BackButton: React.FC<BackButtonProps> = ({ label, className = '', labelClassName = '', fallbackHref = '/' }) => {
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

  return (
    <button onClick={handleBack} className={className} type="button">
      <span aria-hidden="true">&larr;</span>
      <span className={labelClassName}>{label}</span>
    </button>
  )
}

export default BackButton
