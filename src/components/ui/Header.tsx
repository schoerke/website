'use client'
import LanguageSwitcher from './LanguageSwitcher'

const Header: React.FC = () => (
  <header className="flex w-full justify-end p-4">
    <LanguageSwitcher alternateSlugs={{ de: 'kuenstler', en: 'artists' }} />
  </header>
)

export default Header
