import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { Playfair_Display } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"
import { Providers } from "./providers"
import { ErrorBoundary } from "@/components/error-boundary"

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" })
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair" })

export const metadata: Metadata = {
  title: "Sri Sathya Sai Seva Organisation - Volunteer Management System",
  description: "Official volunteer management system for Sri Sathya Sai Seva Organisation. Love All Serve All.",
  keywords: ["Sri Sathya Sai", "Seva", "Volunteer", "Management", "Service", "Organization"],
  authors: [{ name: "Sri Sathya Sai Seva Organisation" }],
  creator: "Sri Sathya Sai Seva Organisation",
  publisher: "Sri Sathya Sai Seva Organisation",
  icons: {
    icon: [
      {
        url: "https://ssssompcg.org/assets/images/sd5-464x464.jpg",
        sizes: "32x32",
        type: "image/jpg"
      }
    ]
  },
  viewport: "width=device-width, initial-scale=1",
  themeColor: "#FF6B00"
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${playfair.variable} font-sans bg-background text-foreground`} suppressHydrationWarning>
        <ErrorBoundary>
          <Providers>
            {children}
            <Analytics />
          </Providers>
        </ErrorBoundary>
      </body>
    </html>
  )
}
