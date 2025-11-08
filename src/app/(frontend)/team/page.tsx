import { Employee, Media } from '@/payload-types'
import config from '@payload-config'
import Image from 'next/image'
import { getPayload } from 'payload'

// This page will be dynamically rendered
export const dynamic = 'force-dynamic'

const TeamMemberCard: React.FC<Employee> = ({ name, title, image, email, phone, mobile }) => {
  const img = image as Media | undefined
  const imageUrl = typeof img?.url === 'string' ? img.url : ''

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
        <p className="mb-2 text-xs">
          <a href={`mailto:${email}`} className="text-primary-yellow hover:underline">
            {email}
          </a>
        </p>
        <p className="text-xs">Telefon: {phone}</p>
        <p className="text-xs">Mobil: {mobile}</p>
      </div>
    </div>
  )
}

const TeamPage = async () => {
  const payload = await getPayload({ config })
  const { docs: employees } = await payload.find({
    collection: 'employees',
    sort: 'order',
  })

  return (
    <main className="mx-auto flex max-w-7xl flex-col px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
      <h1 className="font-playfair mb-12 mt-4 text-5xl font-bold">Team</h1>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {employees.map((employee: Employee) => (
          <TeamMemberCard key={employee.name} {...employee} />
        ))}
      </div>
    </main>
  )
}

export default TeamPage
