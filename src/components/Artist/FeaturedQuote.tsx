import React from 'react'

interface FeaturedQuoteProps {
  quote: string
}

const FeaturedQuote: React.FC<FeaturedQuoteProps> = ({ quote }) => {
  return (
    <blockquote className="border-primary-yellow mb-6 border-l-4 pl-6 font-playfair not-italic text-xl text-gray-700 md:max-w-[75%]">
      {quote}
    </blockquote>
  )
}

export default FeaturedQuote
