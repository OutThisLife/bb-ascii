import type { Metadata } from 'next'

import './globals.css'

export default function RootLayout({
  children
}: Readonly<React.PropsWithChildren>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  )
}

export const metadata: Metadata = {
  title: 'BB ASCII'
}
