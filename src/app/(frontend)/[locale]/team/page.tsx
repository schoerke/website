import { redirect } from 'next/navigation'

export async function generateStaticParams() {
  return [{ locale: 'en' }, { locale: 'de' }]
}

const TeamPage = async ({ params }: { params: Promise<{ locale: string }> }) => {
  const { locale } = await params
  redirect(locale === 'de' ? '/de/kontakt' : '/en/contact')
}

export default TeamPage
