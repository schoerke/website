/** @type {import('prettier').Config} */
const config = {
  singleQuote: true,
  trailingComma: 'all',
  printWidth: 120,
  tabWidth: 2,
  semi: false,
  plugins: ['prettier-plugin-tailwindcss', 'prettier-plugin-organize-imports'],
}

export default config
