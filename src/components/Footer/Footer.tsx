import FooterDecorations from '@/components/Footer/FooterDecorations'
import FooterInfo from '@/components/Footer/FooterInfo'
import FooterNavigation from '@/components/Footer/FooterNavigation'

type FooterProps = {
  locale: string
}

const Footer = async ({ locale }: FooterProps) => {
  return (
    <footer>
      <div className="relative overflow-hidden bg-white">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
          <FooterNavigation locale={locale} />
        </div>
        <FooterDecorations />
      </div>
      <div className="bg-primary-platinum">
        <div className="mx-auto max-w-7xl px-4 py-8 pb-safe sm:px-6 md:pb-8 lg:px-8">
          <FooterInfo locale={locale} />
        </div>
      </div>
    </footer>
  )
}

export default Footer
export { FooterInfo as Info, FooterNavigation as Navigation }
