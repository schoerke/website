const Typography: React.FC = () => {
  const textStyles = [
    {
      category: 'Headlines',
      examples: [
        { name: 'H1', className: 'font-playfair text-5xl font-bold', text: 'Main Headline' },
        { name: 'H2', className: 'font-playfair text-4xl font-bold', text: 'Section Headline' },
        { name: 'H3', className: 'font-playfair text-3xl font-bold', text: 'Subsection Headline' },
        { name: 'H4', className: 'font-playfair text-2xl font-bold', text: 'Small Headline' },
      ],
    },
    {
      category: 'Body Text',
      examples: [
        {
          name: 'Large Body',
          className: 'font-inter text-lg',
          text: 'Larger body text for important paragraphs or introductions. The quick brown fox jumps over the lazy dog.',
        },
        {
          name: 'Body',
          className: 'font-inter text-base',
          text: 'Standard body text for general content. The quick brown fox jumps over the lazy dog.',
        },
        {
          name: 'Small Body',
          className: 'font-inter text-sm',
          text: 'Smaller body text for less prominent content. The quick brown fox jumps over the lazy dog.',
        },
        {
          name: 'Caption',
          className: 'font-inter text-xs',
          text: 'Caption text for images or footnotes. The quick brown fox jumps over the lazy dog.',
        },
      ],
    },
  ]

  return (
    <>
      <h1 className="font-playfair my-8 text-3xl">Typography</h1>
      <div className="max-w-4xl space-y-12">
        {textStyles.map((section) => (
          <div key={section.category} className="space-y-4">
            <div className="space-y-8">
              {section.examples.map((example) => (
                <div key={example.name} className="space-y-1">
                  <div className={example.className}>{example.text}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

export default Typography
