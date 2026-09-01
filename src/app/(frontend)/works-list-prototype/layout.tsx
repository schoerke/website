import { ReactNode } from 'react'

/**
 * TEMPORARY prototyping route — not part of the WorksList feature.
 * Delete this whole directory once the layout is agreed on and ported into
 * the real component during implementation.
 */
type Props = {
  children: ReactNode
}

export default function WorksListPrototypeLayout({ children }: Props) {
  return (
    <html lang="de">
      <body className="font-inter text-primary-black flex min-h-screen flex-col antialiased">
        <main className="flex-1">{children}</main>
      </body>
    </html>
  )
}
