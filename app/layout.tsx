import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { AppLayout } from '@/components/app-layout'
import './globals.css'

const inter = Inter({ 
  subsets: ["latin"],
  variable: '--font-inter'
});

export const metadata: Metadata = {
  title: 'UNVRS TRI - Ironman Training Coach',
  description: 'Professional triathlon training management dashboard',
  generator: 'v0.app',
  icons: {
    icon: '/icon-dark-32x32.png',
    apple: '/apple-icon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased`}>
        <AppLayout>
          {children}
        </AppLayout>
        <Analytics />
      </body>
    </html>
  )
}
// Update deploy Gio 26 Mar 2026 17:04:52 CET
