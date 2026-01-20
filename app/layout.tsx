import type { Metadata, Viewport } from 'next'
import './globals.css'
import { ClientLayout } from '@/components/ClientLayout'

export const metadata: Metadata = {
  title: 'Masal Kutusu | AI ile 10 Saniyede Masal',
  description: 'Çocuğunuz için yapay zeka destekli, sesli masallar oluşturun. Güvenli, eğlenceli ve her yaşa uygun hikayeler.',
  keywords: ['masal', 'çocuk hikayeleri', 'ai', 'yapay zeka', 'sesli kitap', 'ebeveynlik'],
  authors: [{ name: 'Masal Kutusu' }],
  metadataBase: new URL('http://localhost:3000'),
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FFF5F0' },
    { media: '(prefers-color-scheme: dark)', color: '#1C1917' }
  ],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
      </head>
      <body className="antialiased">
        <ClientLayout>
          {children}
        </ClientLayout>
      </body>
    </html>
  )
}
