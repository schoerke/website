import { ReactNode } from 'react'
import './globals.css'

type Props = {
  children: ReactNode
}

export default async function FrontendLayout({ children }: Props) {
  return children
}
