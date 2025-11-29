import FooterInfo from '@/components/Footer/FooterInfo'
import FooterNavigation from '@/components/Footer/FooterNavigation'

type FooterProps = {
  locale: string
}

const Footer: React.FC<FooterProps> = async ({ locale }) => {
  return (
    <footer>
      <div className="bg-white">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
          <FooterNavigation locale={locale} />
        </div>
      </div>
      <div className="bg-primary-platinum">
        <div className="pb-safe mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <FooterInfo locale={locale} />
        </div>
      </div>
    </footer>
  )
}

export default Footer
export { FooterInfo as Info, FooterNavigation as Navigation }
