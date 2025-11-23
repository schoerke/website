'use client'
import LocaleSwitcher from '../ui/LocaleSwitcher'

const Header: React.FC = () => (
  <header className="w-full">
    <div className="mx-auto flex max-w-7xl justify-end px-4 py-4 sm:px-6 lg:px-8">
      <LocaleSwitcher />
    </div>
  </header>
)

export default Header
