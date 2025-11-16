import { ReactNode } from 'react'

type Props = {
  children: ReactNode
}

export default function BrandLayout({ children }: Props) {
  return (
    <html lang="de">
      <body className="font-inter text-primary-black flex min-h-screen flex-col antialiased">
        <main className="flex-1">{children}</main>
      </body>
    </html>
  )
}
