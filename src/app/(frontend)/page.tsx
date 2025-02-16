import Footer from './components/Footer'

const HomePage: React.FC = () => {
  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="py-4 text-3xl">Demo Components</div>
        </div>
      </main>
      <Footer />
    </div>
  )
}

export default HomePage
