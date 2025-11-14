import Footer from '@/components/Footer'
import './globals.css'

export const metadata = {
  title: 'Künstlersekretariat Schoerke',
  description: 'The official website of Künstlersekretariat Schoerke',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-inter text-primary-black flex min-h-screen flex-col antialiased">
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  )
}
