import type { Metadata } from 'next'
import { Suspense } from 'react'

import { LevaClient } from './leva-client'

import './globals.css'

export default function RootLayout({
  children
}: Readonly<React.PropsWithChildren>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}

        <Suspense>
          <div className="contents" suppressHydrationWarning>
            <LevaClient />
          </div>
        </Suspense>
      </body>
    </html>
  )
}

export const metadata: Metadata = { title: 'BB ASCII' }
