'use client'

import { Button } from '@/components/ui/button'
import { Link } from '@/i18n/navigation'
import { useTranslations } from 'next-intl'

const NotFound: React.FC = () => {
  const t = useTranslations('custom.pages.notFound')

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-28 sm:px-6 lg:px-8">
      <div className="w-full max-w-2xl text-center">
        <h1 className="text-primary-black/10 mb-4 text-9xl font-bold">404</h1>
        <h2 className="text-primary-black mb-4 text-3xl font-semibold">{t('title')}</h2>
        <p className="text-primary-black/70 mb-8 text-lg">{t('description')}</p>
        <Button asChild size="lg">
          <Link href="/">{t('returnHome')}</Link>
        </Button>
      </div>
    </div>
  )
}

export default NotFound
