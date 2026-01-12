type HomePageProps = {
  params: Promise<{ locale: string }>
}

const HomePage = async ({ params }: HomePageProps) => {
  // Consume params to satisfy Next.js typing, locale available if needed for future content
  await params

  return (
    <main className="mx-auto flex max-w-7xl flex-col px-4 py-6 sm:px-6 sm:py-8 lg:p-8">
      {/* Homepage content - no title */}
    </main>
  )
}

export default HomePage
