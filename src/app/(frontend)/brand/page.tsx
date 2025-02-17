import Colors from '@/components/Colors'
import Typography from '@/components/Typography'

const ColorsPage: React.FC = () => {
  return (
    <div className="mx-auto flex max-w-7xl flex-col px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
      <Colors />
      <Typography />
    </div>
  )
}

export default ColorsPage
