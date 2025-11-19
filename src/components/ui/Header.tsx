'use client'
import LocaleSwitcher from './LocaleSwitcher'

const Header: React.FC = () => (
  <header className="flex w-full justify-end p-4">
    <LocaleSwitcher alternateSlugs={{ de: 'kuenstler', en: 'artists' }} />
  </header>
)

export default Header
