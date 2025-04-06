"use client"

import React, { useState, useMemo, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useAuth } from "@/contexts/auth-context"
import { deleteVolunteerFromDb, cancelVolunteerInDb } from "@/lib/supabase-service"
import { Loader2, MoreHorizontal, Plus, UserX, Search, Download } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { CancelVolunteerForm } from "@/components/cancel-volunteer-form"
import { ExcelUpload } from "@/components/excel-upload"
import { useToast } from "@/components/ui/use-toast"
import { RegisterVolunteerForm } from "@/components/register-volunteer-form"
import { cn } from "@/lib/utils"
import { useQueryClient } from "@tanstack/react-query"
import { useVolunteers } from "@/lib/query-hooks"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { VolunteerProfileDialog } from "@/components/volunteer-profile-dialog"
import { RealtimeChannel } from "@supabase/supabase-js"
import { supabase } from "@/lib/supabase"

export default function VolunteersPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const { data: volunteers = [], isLoading, error } = useVolunteers()
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [selectedVolunteer, setSelectedVolunteer] = useState<any>(null)
  const [isProfileOpen, setIsProfileOpen] = useState(false)

  const filteredVolunteers = useMemo(() => {
    return volunteers.filter((volunteer) => {
      // Status filter
      if (statusFilter === "active" && (volunteer.is_cancelled === 'yes' || volunteer.registered_volunteers)) {
        return false
      }
      if (statusFilter === "registered" && (!volunteer.registered_volunteers || volunteer.is_cancelled === 'yes')) {
        return false
      }
      if (statusFilter === "cancelled" && volunteer.is_cancelled !== 'yes') {
        return false
      }

      // Search filter
      const searchFields = [
        volunteer.sai_connect_id,
        volunteer.full_name,
        volunteer.mobile_number,
        volunteer.sss_district,
      ].map(field => (field || "").toString().toLowerCase())

      const query = searchQuery.toLowerCase()
      return searchFields.some(field => field.includes(query))
    })
  }, [volunteers, searchQuery, statusFilter])

  const handleRegister = async () => {
    try {
      await queryClient.invalidateQueries({ queryKey: ["volunteers"] })
      toast({
        title: "Volunteer Registered",
        description: "The volunteer has been successfully registered for service.",
        variant: "default",
        duration: 3000,
      })
    } catch (error) {
      toast({
        title: "Registration Failed",
        description: "Could not register the volunteer. Please try again.",
        variant: "destructive",
        duration: 4000,
      })
    }
  }

  const handleCancel = async (saiConnectId: string) => {
    try {
      await cancelVolunteerInDb(saiConnectId)
      await queryClient.invalidateQueries({ queryKey: ["volunteers"] })
      toast({
        title: "Volunteer Cancelled",
        description: "The volunteer's service has been cancelled successfully.",
        variant: "default",
        duration: 3000,
      })
    } catch (err) {
      console.error('Error cancelling volunteer:', err)
      toast({
        title: "Cancellation Failed",
        description: "Could not cancel the volunteer. Please try again.",
        variant: "destructive",
        duration: 4000,
      })
    }
  }

  const handleDelete = async (saiConnectId: string) => {
    try {
      await deleteVolunteerFromDb(saiConnectId)
      await queryClient.invalidateQueries({ queryKey: ["volunteers"] })
      toast({
        title: "Volunteer Deleted",
        description: "The volunteer has been permanently deleted from the system.",
        variant: "default",
        duration: 3000,
      })
    } catch (err) {
      console.error('Error deleting volunteer:', err)
      toast({
        title: "Deletion Failed",
        description: "Could not delete the volunteer. Please try again.",
        variant: "destructive",
        duration: 4000,
      })
    }
  }

  const handleVolunteerClick = (volunteer: any) => {
    setSelectedVolunteer(volunteer)
    setIsProfileOpen(true)
  }

  const handleVolunteerUpdate = () => {
    queryClient.invalidateQueries({ queryKey: ["volunteers"] })
    toast({
      title: "Profile Updated",
      description: "The volunteer's profile has been updated successfully.",
      variant: "default",
      duration: 3000,
    })
  }

  const fetchData = async () => {
    try {
      await queryClient.invalidateQueries({ queryKey: ["volunteers"] })
      toast({
        title: "Data Refreshed",
        description: "The volunteer list has been updated with the latest data.",
        variant: "default",
        duration: 2000,
      })
    } catch (error) {
      console.error("Error fetching volunteers:", error)
      toast({
        title: "Refresh Failed",
        description: "Could not fetch the latest volunteer data. Please try again.",
        variant: "destructive",
        duration: 4000,
      })
    }
  }

  useEffect(() => {
    let volunteersChannel: RealtimeChannel | null = null
    let registeredChannel: RealtimeChannel | null = null
    let isMounted = true

    // Set up real-time subscriptions
    volunteersChannel = supabase
      .channel('volunteers-page-changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'volunteers_volunteers' 
        },
        () => {
          if (!isMounted) return
          fetchData()
        }
      )
      .subscribe((status) => {
        console.log('Volunteers subscription status:', status)
      })

    registeredChannel = supabase
      .channel('registered-page-changes')
      .on('postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'registered_volunteers' 
        },
        () => {
          if (!isMounted) return
          fetchData()
        }
      )
      .subscribe((status) => {
        console.log('Registered volunteers subscription status:', status)
      })

    // Set up periodic refresh as backup
    const refreshInterval = setInterval(() => {
      if (isMounted) {
        fetchData()
      }
    }, 30000) // Refresh every 30 seconds

    // Cleanup function
    return () => {
      isMounted = false
      if (volunteersChannel) {
        volunteersChannel.unsubscribe()
      }
      if (registeredChannel) {
        registeredChannel.unsubscribe()
      }
      clearInterval(refreshInterval)
    }
  }, [queryClient, toast])

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-sai-orange" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-red-500">
        An error occurred while loading volunteers
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 md:flex-row md:justify-between md:items-center">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Volunteers</h1>
          <p className="text-muted-foreground">Manage and track volunteer information</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/volunteers/new">
            <Button className="bg-sai-orange hover:bg-sai-orange-dark text-white">
              <Plus className="mr-2 h-4 w-4" />
              Add Volunteer
            </Button>
          </Link>
          <RegisterVolunteerForm onRegister={handleRegister} />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-sai-orange/20 hover:border-sai-orange/30 transition-all duration-300 hover:shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserX className="h-5 w-5 text-red-500" />
              Cancel Volunteer
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CancelVolunteerForm token="" onSuccess={handleRegister} dataSource="supabase" />
          </CardContent>
        </Card>

        <Card className="border-sai-orange/20 hover:border-sai-orange/30 transition-all duration-300 hover:shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5 text-blue-500" />
              Upload Volunteer Data
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ExcelUpload onSuccess={handleRegister} />
          </CardContent>
        </Card>
      </div>

      <Card className="border-sai-orange/20 hover:border-sai-orange/30 transition-all duration-300 hover:shadow-lg">
        <CardHeader className="space-y-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, ID, mobile, or district..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Volunteers</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="registered">Registered</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Mobile</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>District</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredVolunteers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Search className="h-8 w-8" />
                      <p>No volunteers found</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredVolunteers.map((volunteer) => (
                  <TableRow
                    key={volunteer.sai_connect_id}
                    className={cn(
                      "cursor-pointer transition-colors",
                      {
                        "hover:bg-red-50/50": volunteer.is_cancelled === 'yes',
                        "hover:bg-blue-50/50": volunteer.registered_volunteers && volunteer.is_cancelled !== 'yes',
                        "hover:bg-green-50/50": !volunteer.registered_volunteers && volunteer.is_cancelled !== 'yes'
                      }
                    )}
                    onClick={() => handleVolunteerClick(volunteer)}
                  >
                    <TableCell className="font-medium">{volunteer.sai_connect_id}</TableCell>
                    <TableCell className="font-medium">{volunteer.full_name}</TableCell>
                    <TableCell>{volunteer.mobile_number || "N/A"}</TableCell>
                    <TableCell>
                      {volunteer.is_cancelled === 'yes' ? (
                        <Badge variant="destructive" className="bg-red-500 hover:bg-red-600">Cancelled</Badge>
                      ) : volunteer.registered_volunteers ? (
                        <Badge variant="default" className="bg-blue-500 hover:bg-blue-600">Registered</Badge>
                      ) : (
                        <Badge variant="default" className="bg-green-500 hover:bg-green-600">Active</Badge>
                      )}
                    </TableCell>
                    <TableCell>{volunteer.sss_district || "N/A"}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Open menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation()
                              handleCancel(volunteer.sai_connect_id)
                            }}
                            disabled={volunteer.is_cancelled === 'yes'}
                            className="text-red-500 focus:text-red-500"
                          >
                            Cancel Volunteer
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDelete(volunteer.sai_connect_id)
                            }}
                            className="text-red-500 focus:text-red-500"
                          >
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <VolunteerProfileDialog
        volunteer={selectedVolunteer}
        isOpen={isProfileOpen}
        onOpenChange={setIsProfileOpen}
        onUpdate={handleVolunteerUpdate}
      />
    </div>
  )
}

