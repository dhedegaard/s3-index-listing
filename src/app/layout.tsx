import '../styles/global.css'

import { Metadata } from 'next'
import { ReactNode } from 'react'
import { SERVER_ENV } from '../server-env'

export const metadata: Metadata = {
  title: 'S3 Index',
  description: `Public files for S3 bucket ${SERVER_ENV.S3_BUCKET}`,
  robots: { index: true, follow: true },
}

interface Props {
  children: ReactNode
}

export default function RootLayout({ children }: Readonly<Props>) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
      </head>
      <body className="overflow-y-scroll">{children}</body>
    </html>
  )
}
