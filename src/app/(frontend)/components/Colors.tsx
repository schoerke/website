const Colors: React.FC = () => {
  const brandColors = [
    { name: 'Primary', hex: '#FCC302' },
    { name: 'Secondary', hex: '#E3E3E3' },
    { name: 'Background', hex: '#FFFFFF' },
    { name: 'Accent', hex: '#ADB2B4' },
    { name: 'Text', hex: '#222126' },
  ]

  return (
    <div className="mx-auto max-w-7xl">
      <h1 className="font-playfair my-4 text-3xl">Brand Colors</h1>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {brandColors.map(({ name, hex }) => (
          <div
            key={name}
            style={{ backgroundColor: hex }}
            className={`flex min-h-[200px] flex-col items-center justify-center rounded-lg p-6 text-center shadow-lg ${name === 'Background' ? 'border border-gray-200' : ''}`}
          >
            <h3
              className="font-playfair mb-2 text-xl font-bold"
              style={{ color: ['Primary', 'Text'].includes(name) ? '#ffffff' : '#000000' }}
            >
              {name}
            </h3>
            <p className="font-inter" style={{ color: ['Primary', 'Text'].includes(name) ? '#ffffff' : '#000000' }}>
              {hex}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

export default Colors
