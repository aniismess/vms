"use client"

import React, { useState, useMemo, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useAuth } from "@/contexts/auth-context"
import { deleteVolunteerFromDb, cancelVolunteerInDb } from "@/lib/supabase-service"
import { Loader2, MoreHorizontal, Plus, UserX, Search, Download, UserPlus, Eye, X } from "lucide-react"
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
    <div className="space-y-4">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">Volunteers</h1>
            <p className="text-muted-foreground">Manage and track volunteer information</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Button asChild>
              <Link href="/volunteers/new">
                <UserPlus className="mr-2 h-4 w-4" />
                Add Volunteer
              </Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Search Volunteers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  placeholder="Search by name, mobile, or ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1"
                />
                <Select
                  value={statusFilter}
                  onValueChange={setStatusFilter}
                >
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                    <SelectItem value="registered">Registered</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="hidden sm:table-cell">Mobile</TableHead>
                    <TableHead className="hidden sm:table-cell">Status</TableHead>
                    <TableHead className="hidden md:table-cell">District</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredVolunteers.map((volunteer) => (
                    <TableRow key={volunteer.sai_connect_id}>
                      <TableCell className="font-medium">{volunteer.sai_connect_id}</TableCell>
                      <TableCell>{volunteer.full_name}</TableCell>
                      <TableCell className="hidden sm:table-cell">{volunteer.mobile_number}</TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Badge
                          variant={
                            volunteer.status === "cancelled"
                              ? "destructive"
                              : volunteer.status === "registered"
                              ? "default"
                              : "secondary"
                          }
                          className="hover:opacity-80 transition-opacity"
                        >
                          {volunteer.status.charAt(0).toUpperCase() + volunteer.status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">{volunteer.sss_district}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleVolunteerClick(volunteer)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {volunteer.status === "active" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleCancel(volunteer.sai_connect_id)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <VolunteerProfileDialog
        volunteer={selectedVolunteer}
        isOpen={isProfileOpen}
        onOpenChange={setIsProfileOpen}
        onUpdate={handleVolunteerUpdate}
      />
    </div>
  )
}

