import PayloadRichText from '@/components/ui/PayloadRichText'
import { Employee, Image as PayloadImage } from '@/payload-types'
import { getEmployees } from '@/services/employee'
import { getPageBySlug } from '@/services/page'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import Image from 'next/image'

// This page will be dynamically rendered
export const dynamic = 'force-dynamic'

const TeamMemberCard: React.FC<Employee> = ({ name, title, image, email, phone, mobile }) => {
  const img = image as PayloadImage | undefined
  const imageUrl = img?.url || '/placeholder.jpg'

  return (
    <div className="group overflow-hidden rounded-lg bg-white shadow-md transition-transform hover:scale-[1.02]">
      <div className="relative h-72 w-full">
        <Image
          src={imageUrl}
          alt={name || 'Team Member'}
          width={400}
          height={400}
          className="h-full w-full object-cover"
          priority
        />
        <div className="absolute inset-0 bg-white/10 transition-opacity duration-300 group-hover:opacity-0"></div>
      </div>
      <div className="p-6">
        <h3 className="font-playfair mb-2 text-3xl font-bold">{name}</h3>
        <p className="font-playfair mb-3 text-xl">{title}</p>
        <p className="mb-2 text-sm">
          <a href={`mailto:${email}`} className="hover:underline">
            {email}
          </a>
        </p>
        <p className="text-xs">Telefon: {phone}</p>
        <p className="text-xs">Mobil: {mobile}</p>
      </div>
    </div>
  )
}

const TeamPage = async ({ params }: { params: Promise<{ locale: string }> }) => {
  const { locale } = await params

  // Enable static rendering
  setRequestLocale(locale)

  const t = await getTranslations({ locale, namespace: 'custom.pages.team' })

  // Fetch both page content and employees in parallel
  const [page, employeesResult] = await Promise.all([
    getPageBySlug('team', locale as 'de' | 'en'),
    getEmployees(locale as 'de' | 'en'),
  ])

  const employees = employeesResult.docs

  return (
    <main className="mx-auto flex max-w-7xl flex-col px-4 py-6 sm:px-6 sm:py-8 lg:p-8">
      {/* CMS-editable content at the top */}
      {page && (
        <div className="mb-8">
          <h1 className="font-playfair mb-6 text-5xl font-bold">{page.title}</h1>
          <div className="prose max-w-none">
            <PayloadRichText content={page.content} />
          </div>
        </div>
      )}

      {/* Fallback title if no page exists */}
      {!page && <h1 className="font-playfair mb-8 text-5xl font-bold sm:mb-12">{t('title')}</h1>}

      {/* Employee list */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {employees.map((employee: Employee) => (
          <TeamMemberCard key={employee.name} {...employee} />
        ))}
      </div>
    </main>
  )
}

export default TeamPage
