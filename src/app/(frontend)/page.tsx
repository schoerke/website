import Colors from './components/Colors'
import Footer from './components/Footer'
import Typography from './components/Typography'

const HomePage: React.FC = () => {
  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Colors />
          <Typography />
        </div>
      </main>
      <Footer />
    </div>
  )
}

export default HomePage
