interface ColorProps {
  name: string
  hex: string
}

interface ColorSectionProps {
  colors: ColorProps[]
}

function shouldUseWhiteText(name: string): boolean {
  return ['Raisin Black', 'Success', 'Error'].includes(name)
}

const ColorCard: React.FC<ColorProps> = ({ name, hex }) => (
  <div
    key={name}
    style={{ backgroundColor: hex }}
    className={`flex min-h-[200px] flex-col items-center justify-center rounded-lg p-6 text-center shadow-lg ${
      name === 'White' ? 'border border-gray-200' : ''
    }`}
  >
    <h3 className={`font-playfair mb-2 text-xl font-bold ${shouldUseWhiteText(name) ? 'text-white' : 'text-black'}`}>
      {name}
    </h3>
    <p className={`font-inter ${shouldUseWhiteText(name) ? 'text-white' : 'text-black'}`}>{hex}</p>
  </div>
)

const ColorSection: React.FC<ColorSectionProps> = ({ colors }) => (
  <div className="mb-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
    {colors.map((color) => (
      <ColorCard key={color.name} {...color} />
    ))}
  </div>
)

const Colors: React.FC = () => {
  const primaryColors = [
    { name: 'Mikado Yellow', hex: '#FCC302' },
    { name: 'Platinum', hex: '#E3E3E3' },
    { name: 'Silver', hex: '#ADB2B4' },
    { name: 'Raisin Black', hex: '#222126' },
    { name: 'White', hex: '#FFFFFF' },
    { name: 'Success', hex: '#4A9D3F' },
    { name: 'Error', hex: '#DC2626' },
  ]

  return (
    <main>
      <h1 className="font-playfair my-8 text-5xl font-bold">Colors</h1>
      <ColorSection colors={primaryColors} />
    </main>
  )
}

export default Colors
