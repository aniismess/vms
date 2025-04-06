"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Users, UserPlus, LogOut, Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { useAuth } from "@/contexts/auth-context"
import { cn } from "@/lib/utils"
import { useState } from "react"
import Image from "next/image"
import { ThemeToggle } from "@/components/theme-toggle"
import { motion } from "framer-motion"

const navItems = [
  {
    title: "Dashboard",
    hindiTitle: "डैशबोर्ड",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Volunteers",
    hindiTitle: "स्वयंसेवक",
    href: "/volunteers",
    icon: Users,
  },
  {
    title: "Add Volunteer",
    hindiTitle: "स्वयंसेवक जोड़ें",
    href: "/volunteers/new",
    icon: UserPlus,
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const { logout, user } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  const handleLogout = async () => {
    await logout()
    setIsOpen(false)
  }

  return (
    <div className="sticky top-0 z-50 w-full">
      {/* Header with Sai Organisation branding */}
      <motion.div 
        className="bg-gradient-to-r from-sai-orange via-sai-orange-dark to-sai-orange text-white shadow-lg dark:from-gray-800 dark:via-gray-900 dark:to-gray-800"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="container mx-auto px-2 sm:px-4 py-2 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 sm:space-x-4">
              <Sheet open={isOpen} onOpenChange={setIsOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="md:hidden">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[240px] sm:w-[300px] p-0">
                  <div className="flex flex-col h-full">
                    <div className="p-4 border-b">
                      <h2 className="text-lg font-semibold">Navigation</h2>
                    </div>
                    <nav className="flex-1 p-2">
                      {navItems.map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setIsOpen(false)}
                          className={cn(
                            "flex items-center space-x-2 px-3 py-2 rounded-lg text-sm transition-colors",
                            pathname === item.href
                              ? "bg-sai-orange/10 text-sai-orange"
                              : "hover:bg-sai-orange/5"
                          )}
                        >
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                        </Link>
                      ))}
                    </nav>
                    <div className="p-4 border-t">
                      <Button
                        variant="ghost"
                        className="w-full justify-start"
                        onClick={handleLogout}
                      >
                        <LogOut className="mr-2 h-4 w-4" />
                        Logout
                      </Button>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
              <div className="flex flex-col">
                <h1 className="text-lg sm:text-xl font-bold">Sri Sathya Sai Seva Organisation</h1>
                <p className="text-sm text-white/80">Volunteer Management System</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <ThemeToggle />
              <Button
                variant="ghost"
                size="icon"
                className="hidden md:flex"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Desktop Navigation */}
      <nav className="hidden md:flex items-center space-x-4 px-4 py-2 bg-white border-b">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center space-x-2 px-3 py-2 rounded-lg text-sm transition-colors",
              pathname === item.href
                ? "bg-sai-orange/10 text-sai-orange"
                : "hover:bg-sai-orange/5"
            )}
          >
            <item.icon className="h-4 w-4" />
            <span>{item.title}</span>
          </Link>
        ))}
      </nav>
    </div>
  )
}

