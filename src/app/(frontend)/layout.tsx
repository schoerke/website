import './globals.css'

export const metadata = {
  title: 'Künstlersekretariat Schoerke',
  description: 'The official website of Künstlersekretariat Schoerke',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-inter antialiased">{children}</body>
    </html>
  )
}
