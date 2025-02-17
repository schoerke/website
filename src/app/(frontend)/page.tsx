import Link from 'next/link'

const HomePage: React.FC = () => {
  return (
    <div className="mx-auto flex max-w-7xl flex-col px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
      <main>
        <div className="flex flex-col gap-4">
          <Link href="/colors" className="inline-block text-blue-600 hover:text-blue-800 hover:underline">
            Brand Colors
          </Link>
          <Link href="/typography" className="inline-block text-blue-600 hover:text-blue-800 hover:underline">
            Typography
          </Link>
        </div>
      </main>
    </div>
  )
}

export default HomePage
