"use client"

import { useState, useMemo, useEffect } from "react" // Added useEffect
import { useQuery, useQueryClient } from "@tanstack/react-query" // Added useQuery, useQueryClient
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
// Removed Tabs imports as they are not used
import { useAuth } from "@/contexts/auth-context"
// Removed getDashboardData from api-service (assuming it's not used)
import { getDashboardPageData } from "@/lib/supabase-service" // Use combined function
import { Loader2, Users, UserCheck, UserX, UserPlus, Download, Search, ChevronRight } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
// Removed unused Badge import
// Removed unused cn import
// Removed RealtimeChannel and supabase imports
// Removed SearchBar import (using Input directly)
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
// Removed unused XLSX import
import { motion } from "framer-motion"
import { Input } from "@/components/ui/input"
import Image from "next/image"
import { VolunteerProfileDialog } from "@/components/volunteer-profile-dialog"
import { VolunteerData, VolunteerStatus } from "@/lib/types"
// Removed unused UserRole import
import { downloadToExcel } from "@/lib/xlsx-utils"

// Define default stats structure
const defaultStats = {
  totalVolunteers: 0,
  coming: 0,
  notComing: 0,
  registered: 0,
};

export default function DashboardPage() {
  const { user, role } = useAuth() // Get role
  const { toast } = useToast()
  const router = useRouter()
  const queryClient = useQueryClient() // Get query client

  // State for search inputs and dialog
  const [activeSearch, setActiveSearch] = useState("")
  const [registeredSearch, setRegisteredSearch] = useState("")
  const [cancelledSearch, setCancelledSearch] = useState("")
  const [selectedVolunteer, setSelectedVolunteer] = useState<VolunteerData | null>(null)
  const [isProfileOpen, setIsProfileOpen] = useState(false)

  // Fetch data using React Query
  const { data: dashboardData, isLoading, isError, error } = useQuery({
    queryKey: ['dashboardData'],
    queryFn: getDashboardPageData,
    refetchInterval: 60000, // Refetch every 60 seconds (1 minute)
    enabled: !!user, // Only run query if user is logged in
  })

  // Handle error state
  useEffect(() => {
    if (isError) {
      console.error("Error fetching dashboard data:", error);
      toast({
        title: "Error",
        description: "Failed to fetch latest dashboard data. Please try refreshing.",
        variant: "destructive",
      });
    }
  }, [isError, error, toast]);

  // Memoize stats and volunteers to prevent unnecessary re-renders
  const dbStats = useMemo(() => dashboardData?.stats ?? defaultStats, [dashboardData?.stats]);
  const recentVolunteers = useMemo(() => dashboardData?.volunteers ?? [], [dashboardData?.volunteers]);

  // No longer need filteredRecentVolunteers memo as filtering happens inline

  const handleVolunteerClick = (volunteer: VolunteerData) => {
    setSelectedVolunteer(volunteer)
    setIsProfileOpen(true)
  }

  // Invalidate query on update to trigger refetch
  const handleVolunteerUpdate = () => {
    queryClient.invalidateQueries({ queryKey: ['dashboardData'] })
    toast({
      title: "Volunteer Updated",
      description: "Dashboard data will refresh shortly.",
      variant: "default",
      duration: 3000,
    });
  }

  const renderVolunteerRow = (volunteer: VolunteerData) => (
    <TableRow
      key={volunteer.sai_connect_id}
      className="cursor-pointer hover:bg-accent/50 transition-colors dark:hover:bg-gray-700/50" // Added dark mode hover
      onClick={() => handleVolunteerClick(volunteer)}
    >
      <TableCell className="font-medium text-black dark:text-gray-200">{volunteer.full_name}</TableCell>
      <TableCell className="text-black dark:text-gray-300">{volunteer.mobile_number || "N/A"}</TableCell>
      <TableCell className="text-black dark:text-gray-300">{volunteer.sai_connect_id}</TableCell>
    </TableRow>
  )

  const downloadVolunteers = (volunteers: VolunteerData[], type: VolunteerStatus | string) => { // Allow string for type flexibility
    const data = volunteers.map(volunteer => ({
      "Full Name": volunteer.full_name || "N/A",
      "SAI Connect ID": volunteer.sai_connect_id,
      "Mobile Number": volunteer.mobile_number || "N/A",
      "Age": volunteer.age || "N/A",
      "SSS District": volunteer.sss_district || "N/A",
      "Gender": volunteer.gender || "N/A",
      "Samiti/Bhajan Mandli": volunteer.samiti_or_bhajan_mandli || "N/A",
      "Education": volunteer.education || "N/A",
      "Special Qualifications": volunteer.special_qualifications || "N/A",
      "Last Service Location": volunteer.last_service_location || "N/A",
      "Other Service Location": volunteer.other_service_location || "N/A",
      "Duty Point": volunteer.duty_point || "N/A",
      "Prashanti Arrival": volunteer.prashanti_arrival || "N/A",
      "Prashanti Departure": volunteer.prashanti_departure || "N/A",
      "Batch": volunteer.registered_volunteers?.batch || "N/A",
      "Past Seva Location": volunteer.registered_volunteers?.service_location || "N/A"
    }))

    downloadToExcel(data, `${type}-volunteers-${new Date().toISOString().split('T')[0]}`)
  }

  if (isLoading && !dashboardData) { // Show loading only on initial load
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900">
        <div className="flex h-full items-center justify-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center space-y-4"
          >
            <Loader2 className="h-8 w-8 animate-spin text-sai-orange" />
            <p className="text-sm text-black dark:text-white">Loading dashboard data...</p>
          </motion.div>
        </div>
      </div>
    )
  }

  // Display error message if fetching failed after initial load attempt
  if (isError && !dashboardData) {
     return (
      <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center">
        <p className="text-red-500">Failed to load dashboard data. Please refresh the page.</p>
      </div>
    );
  }


  return (
    // Applied bg-gray-50 dark:bg-gray-900 here from layout (redundant but safe)
    <div className="space-y-6 p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col space-y-4"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex-1">
            <h1 className="text-3xl font-bold tracking-tight text-black dark:text-white">Dashboard</h1>
            <p className="text-muted-foreground dark:text-gray-400">Overview of your volunteer management system</p>
          </div>
          <div className="relative w-40 h-40 rounded-full overflow-hidden border-4 border-sai-orange/20 shadow-lg self-end bg-white ring-2 ring-sai-orange/10 ring-offset-4 hover:border-sai-orange/30 hover:ring-sai-orange/20 transition-all duration-300">
            <Image
              src="/assets/SSSIHL-Bhagawan-Sri-Sathya-Sai-Baba.jpg"
              alt="Sri Sathya Sai Baba"
              fill
              className="object-cover"
              priority
            />
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid gap-4 md:grid-cols-4"
      >
        {/* Use dbStats from useMemo */}
        <Card className="border-sai-orange/20 hover:border-sai-orange/30 transition-all duration-300 hover:shadow-lg bg-white dark:bg-gray-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-black dark:text-white">Total Volunteers</CardTitle>
            <Users className="h-4 w-4 text-sai-orange" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-black dark:text-white">{dbStats.totalVolunteers}</div>
          </CardContent>
        </Card>

        <Card className="border-sai-orange/20 hover:border-sai-orange/30 transition-all duration-300 hover:shadow-lg bg-white dark:bg-gray-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-black dark:text-white">Active</CardTitle>
            <UserCheck className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{dbStats.coming}</div>
          </CardContent>
        </Card>

        <Card className="border-sai-orange/20 hover:border-sai-orange/30 transition-all duration-300 hover:shadow-lg bg-white dark:bg-gray-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-black dark:text-white">Registered</CardTitle>
            <UserPlus className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">{dbStats.registered}</div>
          </CardContent>
        </Card>

        <Card className="border-sai-orange/20 hover:border-sai-orange/30 transition-all duration-300 hover:shadow-lg bg-white dark:bg-gray-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-black dark:text-white">Cancelled</CardTitle>
            <UserX className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{dbStats.notComing}</div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid gap-6 md:grid-cols-3"
      >
        {/* Active Volunteers */}
        <Card className="border-sai-orange/20 hover:border-sai-orange/30 transition-all duration-300 hover:shadow-lg bg-white dark:bg-gray-800">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-black dark:text-white">
                <UserCheck className="h-5 w-5 text-green-500" />
                Active Volunteers
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/volunteers?status=active')}
                className="text-sai-orange hover:text-sai-orange-dark dark:text-sai-orange dark:hover:text-sai-orange-light"
              >
                View All
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
            <div className="mt-2">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, ID, or mobile..."
                  value={activeSearch}
                  onChange={(e) => setActiveSearch(e.target.value)}
                  className="pl-9 bg-white dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="max-h-[400px] overflow-y-auto">
              {/* Use recentVolunteers from useMemo */}
              <Table>
                <TableHeader className="sticky top-0 bg-gray-100 dark:bg-gray-700 z-10">
                  <TableRow>
                    <TableHead className="text-black dark:text-white">Name</TableHead>
                    <TableHead className="text-black dark:text-white">Mobile</TableHead>
                    <TableHead className="text-black dark:text-white">Sai Connect ID</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="text-black dark:text-gray-300">
                  {recentVolunteers
                    .filter(volunteer => {
                      const searchTerm = activeSearch.toLowerCase()
                      return volunteer.is_cancelled === 'no' &&
                        !volunteer.registered_volunteers &&
                        (!searchTerm ||
                          volunteer.full_name?.toLowerCase().includes(searchTerm) ||
                          volunteer.mobile_number?.toLowerCase().includes(searchTerm) ||
                          volunteer.sai_connect_id?.toLowerCase().includes(searchTerm))
                    })
                    .map(renderVolunteerRow)}
                </TableBody>
              </Table>
            </div>
            <div className="mt-4 flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // Filter ALL recentVolunteers by status only, ignoring activeSearch
                  const activeVolunteers = recentVolunteers.filter(volunteer =>
                    volunteer.is_cancelled === 'no' && !volunteer.registered_volunteers
                  );
                  downloadVolunteers(activeVolunteers, 'active');
                }}
                className="text-sai-orange hover:text-sai-orange-dark border-sai-orange hover:bg-sai-orange/10 dark:text-sai-orange dark:border-sai-orange dark:hover:bg-sai-orange/20"
              >
                <Download className="mr-2 h-4 w-4" />
                Download Active
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Registered Volunteers */}
        <Card className="border-sai-orange/20 hover:border-sai-orange/30 transition-all duration-300 hover:shadow-lg bg-white dark:bg-gray-800">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-black dark:text-white">
                <UserPlus className="h-5 w-5 text-blue-500" />
                Registered Volunteers
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/volunteers?status=registered')}
                className="text-sai-orange hover:text-sai-orange-dark dark:text-sai-orange dark:hover:text-sai-orange-light"
              >
                View All
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
            <div className="mt-2">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, ID, or mobile..."
                  value={registeredSearch}
                  onChange={(e) => setRegisteredSearch(e.target.value)}
                  className="pl-9 bg-white dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="max-h-[400px] overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-gray-100 dark:bg-gray-700 z-10">
                  <TableRow>
                    <TableHead className="text-black dark:text-white">Name</TableHead>
                    <TableHead className="text-black dark:text-white">Mobile</TableHead>
                    <TableHead className="text-black dark:text-white">Sai Connect ID</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="text-black dark:text-gray-300">
                  {recentVolunteers
                    .filter(volunteer => {
                      const searchTerm = registeredSearch.toLowerCase()
                      return volunteer.is_cancelled === 'no' &&
                        volunteer.registered_volunteers &&
                        (!searchTerm ||
                          volunteer.full_name?.toLowerCase().includes(searchTerm) ||
                          volunteer.mobile_number?.toLowerCase().includes(searchTerm) ||
                          volunteer.sai_connect_id?.toLowerCase().includes(searchTerm))
                    })
                    .map(renderVolunteerRow)}
                </TableBody>
              </Table>
            </div>
            <div className="mt-4 flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // Filter ALL recentVolunteers by status only, ignoring registeredSearch
                  const registeredVolunteers = recentVolunteers.filter(volunteer =>
                    volunteer.is_cancelled === 'no' && volunteer.registered_volunteers
                  );
                  downloadVolunteers(registeredVolunteers, 'registered');
                }}
                className="text-sai-orange hover:text-sai-orange-dark border-sai-orange hover:bg-sai-orange/10 dark:text-sai-orange dark:border-sai-orange dark:hover:bg-sai-orange/20"
              >
                <Download className="mr-2 h-4 w-4" />
                Download Registered
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Cancelled Volunteers */}
        <Card className="border-sai-orange/20 hover:border-sai-orange/30 transition-all duration-300 hover:shadow-lg bg-white dark:bg-gray-800">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-black dark:text-white">
                <UserX className="h-5 w-5 text-red-500" />
                Cancelled Volunteers
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/volunteers?status=cancelled')}
                className="text-sai-orange hover:text-sai-orange-dark dark:text-sai-orange dark:hover:text-sai-orange-light"
              >
                View All
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
            <div className="mt-2">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, ID, or mobile..."
                  value={cancelledSearch}
                  onChange={(e) => setCancelledSearch(e.target.value)}
                  className="pl-9 bg-white dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="max-h-[400px] overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-gray-100 dark:bg-gray-700 z-10">
                  <TableRow>
                    <TableHead className="text-black dark:text-white">Name</TableHead>
                    <TableHead className="text-black dark:text-white">Mobile</TableHead>
                    <TableHead className="text-black dark:text-white">Sai Connect ID</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="text-black dark:text-gray-300">
                  {recentVolunteers
                    .filter(volunteer => {
                      const searchTerm = cancelledSearch.toLowerCase()
                      return volunteer.is_cancelled === 'yes' &&
                        (!searchTerm ||
                          volunteer.full_name?.toLowerCase().includes(searchTerm) ||
                          volunteer.mobile_number?.toLowerCase().includes(searchTerm) ||
                          volunteer.sai_connect_id?.toLowerCase().includes(searchTerm))
                    })
                    .map(renderVolunteerRow)}
                </TableBody>
              </Table>
            </div>
            <div className="mt-4 flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // Filter ALL recentVolunteers by status only, ignoring cancelledSearch
                  const cancelledVolunteers = recentVolunteers.filter(volunteer =>
                    volunteer.is_cancelled === 'yes'
                  );
                  downloadVolunteers(cancelledVolunteers, 'cancelled');
                }}
                className="text-sai-orange hover:text-sai-orange-dark border-sai-orange hover:bg-sai-orange/10 dark:text-sai-orange dark:border-sai-orange dark:hover:bg-sai-orange/20"
              >
                <Download className="mr-2 h-4 w-4" />
                Download Cancelled
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <VolunteerProfileDialog
        volunteer={selectedVolunteer}
        isOpen={isProfileOpen}
        onOpenChange={setIsProfileOpen}
        onUpdate={handleVolunteerUpdate} // Use updated handler
        userRole={role} // Pass role
      />
    </div>
  )
}
