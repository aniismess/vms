"use client"

import { useState, useMemo, Suspense } from "react"
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/contexts/auth-context"
import {
  getDashboardPageData,
  fetchAllActiveVolunteers,
  fetchAllRegisteredVolunteers,
  fetchAllCancelledVolunteers
} from "@/lib/supabase-service"
import { Loader2, Users, UserCheck, UserX, UserPlus, Download, Search, ChevronRight } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"
import { Input } from "@/components/ui/input"
import Image from "next/image"
import { VolunteerProfileDialog } from "@/components/volunteer-profile-dialog"
import { VolunteerData, VolunteerStatus } from "@/lib/types"
import { downloadToExcel } from "@/lib/xlsx-utils"
import { Skeleton } from "@/components/ui/skeleton"

const StatsSkeleton = () => (
  <div className="grid gap-4 md:grid-cols-4">
    {[...Array(4)].map((_, i) => (
      <Card key={i} className="border-sai-orange/20 bg-white dark:bg-gray-800">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <Skeleton className="h-4 w-2/4" />
          <Skeleton className="h-4 w-4" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-1/4" />
        </CardContent>
      </Card>
    ))}
  </div>
);

const VolunteerListsSkeleton = () => (
  <div className="grid gap-6 md:grid-cols-3">
    {[...Array(3)].map((_, i) => (
      <Card key={i} className="border-sai-orange/20 bg-white dark:bg-gray-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-3/5" />
            <Skeleton className="h-8 w-20" />
          </div>
          <div className="mt-2">
            <Skeleton className="h-10 w-full" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="max-h-[400px] overflow-y-auto space-y-2">
            <Skeleton className="h-10 w-full" />
            {[...Array(5)].map((_, r) => (
              <div key={r} className="flex justify-between p-2">
                <Skeleton className="h-5 w-1/3" />
                <Skeleton className="h-5 w-1/4" />
                <Skeleton className="h-5 w-1/4" />
              </div>
            ))}
          </div>
          <div className="mt-4 flex justify-end">
            <Skeleton className="h-9 w-36" />
          </div>
        </CardContent>
      </Card>
    ))}
  </div>
);


export default function DashboardPage() {
  const { role } = useAuth()
  const { toast } = useToast()
  const router = useRouter()
  const queryClient = useQueryClient()

  const [activeSearch, setActiveSearch] = useState("")
  const [registeredSearch, setRegisteredSearch] = useState("")
  const [cancelledSearch, setCancelledSearch] = useState("")
  const [selectedVolunteer, setSelectedVolunteer] = useState<VolunteerData | null>(null)
  const [isProfileOpen, setIsProfileOpen] = useState(false)

  const [isDownloadingActive, setIsDownloadingActive] = useState(false);
  const [isDownloadingRegistered, setIsDownloadingRegistered] = useState(false);
  const [isDownloadingCancelled, setIsDownloadingCancelled] = useState(false);

  const { data: dashboardData } = useSuspenseQuery({
    queryKey: ['dashboardData'],
    queryFn: getDashboardPageData,
    refetchInterval: 60000,
  })

  const dbStats = useMemo(() => dashboardData.stats, [dashboardData.stats]);
  const activeVolunteers = useMemo(() => dashboardData.activeVolunteers, [dashboardData.activeVolunteers]);
  const recentRegistered = useMemo(() => dashboardData.recentRegistered, [dashboardData.recentRegistered]);
  const recentCancelled = useMemo(() => dashboardData.recentCancelled, [dashboardData.recentCancelled]);

  const handleVolunteerClick = (volunteer: VolunteerData) => {
    setSelectedVolunteer(volunteer)
    setIsProfileOpen(true)
  }

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
      className="cursor-pointer hover:bg-accent/50 transition-colors dark:hover:bg-gray-700/50"
      onClick={() => handleVolunteerClick(volunteer)}
    >
      <TableCell className="font-medium text-black dark:text-gray-200">{volunteer.full_name}</TableCell>
      <TableCell className="text-black dark:text-gray-300">{volunteer.mobile_number || "N/A"}</TableCell>
      <TableCell className="text-black dark:text-gray-300">{volunteer.sai_connect_id}</TableCell>
    </TableRow>
  )

  const downloadVolunteers = (volunteers: VolunteerData[], type: VolunteerStatus | string) => {
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

  return (
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

      <Suspense fallback={<StatsSkeleton />}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid gap-4 md:grid-cols-4"
        >
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
      </Suspense>

      <Suspense fallback={<VolunteerListsSkeleton />}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid gap-6 md:grid-cols-3"
        >
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
                <Table>
                  <TableHeader className="sticky top-0 bg-gray-100 dark:bg-gray-700 z-10">
                    <TableRow>
                      <TableHead className="text-black dark:text-white">Name</TableHead>
                      <TableHead className="text-black dark:text-white">Mobile</TableHead>
                      <TableHead className="text-black dark:text-white">Sai Connect ID</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="text-black dark:text-gray-300">
                    {activeVolunteers
                      .filter(volunteer => {
                        const searchTerm = activeSearch.toLowerCase()
                        return volunteer.is_cancelled === 'no' &&
                          volunteer.registered_volunteers === null &&
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
                disabled={isDownloadingActive}
                onClick={async () => {
                  setIsDownloadingActive(true);
                  try {
                    const allActiveVolunteers = await fetchAllActiveVolunteers();
                    downloadVolunteers(allActiveVolunteers, 'active');
                  } catch (error) {
                     console.error("Failed to download active volunteers:", error);
                     toast({
                       title: "Download Failed",
                       description: "Could not download the list of active volunteers.",
                       variant: "destructive",
                     });
                  } finally {
                    setIsDownloadingActive(false);
                  }
                }}
                className="text-sai-orange hover:text-sai-orange-dark border-sai-orange hover:bg-sai-orange/10 dark:text-sai-orange dark:border-sai-orange dark:hover:bg-sai-orange/20"
              >
                {isDownloadingActive ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                Download Active
              </Button>
              </div>
            </CardContent>
          </Card>

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
                    {recentRegistered
                      .filter(volunteer => {
                        const searchTerm = registeredSearch.toLowerCase()
                        return volunteer.is_cancelled === 'no' &&
                          volunteer.registered_volunteers !== null &&
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
                disabled={isDownloadingRegistered}
                onClick={async () => {
                  setIsDownloadingRegistered(true);
                  try {
                    const allRegisteredVolunteers = await fetchAllRegisteredVolunteers();
                    downloadVolunteers(allRegisteredVolunteers, 'registered');
                  } catch (error) {
                     console.error("Failed to download registered volunteers:", error);
                     toast({
                       title: "Download Failed",
                       description: "Could not download the list of registered volunteers.",
                       variant: "destructive",
                     });
                  } finally {
                    setIsDownloadingRegistered(false);
                  }
                }}
                className="text-sai-orange hover:text-sai-orange-dark border-sai-orange hover:bg-sai-orange/10 dark:text-sai-orange dark:border-sai-orange dark:hover:bg-sai-orange/20"
              >
                 {isDownloadingRegistered ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                Download Registered
              </Button>
              </div>
            </CardContent>
          </Card>

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
                    {recentCancelled
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
                disabled={isDownloadingCancelled}
                onClick={async () => {
                  setIsDownloadingCancelled(true);
                  try {
                    const allCancelledVolunteers = await fetchAllCancelledVolunteers();
                    downloadVolunteers(allCancelledVolunteers, 'cancelled');
                  } catch (error) {
                     console.error("Failed to download cancelled volunteers:", error);
                     toast({
                       title: "Download Failed",
                       description: "Could not download the list of cancelled volunteers.",
                       variant: "destructive",
                     });
                  } finally {
                    setIsDownloadingCancelled(false);
                  }
                }}
                className="text-sai-orange hover:text-sai-orange-dark border-sai-orange hover:bg-sai-orange/10 dark:text-sai-orange dark:border-sai-orange dark:hover:bg-sai-orange/20"
              >
                {isDownloadingCancelled ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                Download Cancelled
              </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </Suspense>

      <VolunteerProfileDialog
        volunteer={selectedVolunteer}
        isOpen={isProfileOpen}
        onOpenChange={setIsProfileOpen}
        onUpdate={handleVolunteerUpdate}
        userRole={role}
      />
    </div>
  )
}
