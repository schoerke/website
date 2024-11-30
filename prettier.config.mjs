/** @type {import('prettier').Config} */
const config = {
  plugins: [
    'prettier-plugin-organize-imports',
    // NOTE: Must come last
    'prettier-plugin-tailwindcss',
  ],
  printWidth: 120,
  semi: false,
  singleQuote: true,
  tabWidth: 2,
  tailwindConfig: './tailwind.config.js',
  trailingComma: 'all',
}

export default config
