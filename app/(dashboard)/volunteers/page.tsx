"use client"

import { useState, useMemo, useEffect, useCallback } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { useAuth } from "@/contexts/auth-context"
import { deleteVolunteerFromDb, cancelVolunteerInDb, makeVolunteerActiveFromRegistered, makeVolunteerActiveFromCancelled, resetRegisteredVolunteers, resetCancelledVolunteers } from "@/lib/supabase-service"
import { Loader2, MoreHorizontal, UserX, Search, UserPlus, Eye, X, Edit, UserCheck } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { ExcelUpload } from "@/components/excel-upload"
import { useToast } from "@/components/ui/use-toast"
import { RegisterVolunteerForm } from "@/components/register-volunteer-form"
import { cn } from "@/lib/utils"
import { useQueryClient } from "@tanstack/react-query"
import { useVolunteers, useCancelVolunteer } from "@/lib/query-hooks"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { VolunteerProfileDialog } from "@/components/volunteer-profile-dialog"
import { RealtimeChannel } from "@supabase/supabase-js"
import { supabase } from "@/lib/supabase"
import type { VolunteerData } from "@/lib/types"
import { CancelVolunteerForm } from "@/components/cancel-volunteer-form"
import { ConfirmDialog } from "@/components/confirm-dialog"

export default function VolunteersPage() {
  const { role } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const { data: volunteers = [], isLoading } = useVolunteers()
  const { mutate: cancelVolunteer } = useCancelVolunteer()
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [selectedVolunteer, setSelectedVolunteer] = useState<VolunteerData | null>(null)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [isUnregistering, setIsUnregistering] = useState<string | null>(null);
  const [isUncancelling, setIsUncancelling] = useState<string | null>(null);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetType, setResetType] = useState<"registered" | "cancelled" | null>(null);
  const [isResetting, setIsResetting] = useState(false);

  const filteredVolunteers = useMemo(() => {
    return volunteers.filter((volunteer) => {
      if (statusFilter === "active" && (volunteer.is_cancelled === 'yes' || volunteer.registered_volunteers)) {
        return false
      }
      if (statusFilter === "registered" && (!volunteer.registered_volunteers || volunteer.is_cancelled === 'yes')) {
        return false
      }
      if (statusFilter === "cancelled" && volunteer.is_cancelled !== 'yes') {
        return false
      }

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
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["volunteers"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboardData"] })
      ]);
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

  const handleCancel = (saiConnectId: string) => {
    cancelVolunteer(saiConnectId, {
      onSuccess: () => {
        toast({
          title: "Volunteer Cancelled",
          description: "The volunteer's service has been cancelled successfully.",
          variant: "default",
          duration: 3000,
        });
        queryClient.invalidateQueries({ queryKey: ["dashboardData"] });
      },
      onError: (err) => {
        console.error('Error cancelling volunteer:', err)
        let description = "Could not cancel the volunteer. Please try again."
        if (err instanceof Error) {
          if (err.message === 'Could not find volunteer') {
            description = `Volunteer with ID ${saiConnectId} not found.`
          } else if (err.message === 'Could not unregister volunteer') {
            description = `Failed to update registration status for volunteer ${saiConnectId}.`
          } else if (err.message === 'Could not cancel volunteer') {
            description = `Failed to update cancellation status for volunteer ${saiConnectId}.`
          }
        }
        toast({
          title: "Cancellation Failed",
          description: description,
          variant: "destructive",
          duration: 4000,
        })
      }
    })
  }

  const handleUnregister = async (saiConnectId: string) => {
    setIsUnregistering(saiConnectId);
    try {
      await makeVolunteerActiveFromRegistered(saiConnectId);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["volunteers"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboardData"] })
      ]);
      toast({
        title: "Volunteer Unregistered",
        description: "The volunteer has been successfully unregistered and is now active.",
        variant: "default",
        duration: 3000,
      });
    } catch (err) {
      console.error('Error unregistering volunteer:', err);
      toast({
        title: "Unregistration Failed",
        description: "Could not unregister the volunteer. Please try again.",
        variant: "destructive",
        duration: 4000,
      });
    } finally {
      setIsUnregistering(null);
    }
  };

  const handleUncancel = async (saiConnectId: string) => {
    setIsUncancelling(saiConnectId);
    try {
      await makeVolunteerActiveFromCancelled(saiConnectId);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["volunteers"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboardData"] })
      ]);
      toast({
        title: "Volunteer Uncancelled",
        description: "The volunteer has been successfully uncancelled and is now active.",
        variant: "default",
        duration: 3000,
      });
    } catch (err) {
      console.error('Error uncancelling volunteer:', err);
      toast({
        title: "Uncancellation Failed",
        description: "Could not uncancel the volunteer. Please try again.",
        variant: "destructive",
        duration: 4000,
      });
    } finally {
      setIsUncancelling(null);
    }
  };

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

  const handleVolunteerClick = (volunteer: VolunteerData) => {
    setSelectedVolunteer(volunteer)
    setIsProfileOpen(true)
  }

  const handleVolunteerUpdate = () => {
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ["volunteers"] }),
      queryClient.invalidateQueries({ queryKey: ["dashboardData"] })
    ]);
    toast({
      title: "Profile Updated",
      description: "The volunteer's profile has been updated successfully.",
      variant: "default",
      duration: 3000,
    })
  }

  const fetchData = useCallback(async () => {
    try {
      queryClient.invalidateQueries({ queryKey: ["volunteers"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardData"] }); 
      toast({
        title: "Data Refreshed",
        description: "Volunteer and dashboard data have been updated.",
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
  }, [queryClient, toast])

  const handleReset = async (type: "registered" | "cancelled") => {
    setIsResetting(true);
    try {
      if (type === "registered") {
        await resetRegisteredVolunteers();
      } else {
        await resetCancelledVolunteers();
      }
      queryClient.invalidateQueries({ queryKey: ["volunteers"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardData"] });
      toast({
        title: `Reset Successful`,
        description: `The ${type} volunteers list has been archived and cleared.`,
        variant: "default",
        duration: 3000,
      });
    } catch (err) {
      toast({
        title: "Reset Failed",
        description: `Could not reset the ${type} volunteers list. Please try again.`,
        variant: "destructive",
        duration: 4000,
      });
    } finally {
      setIsResetting(false);
      setResetDialogOpen(false);
      setResetType(null);
    }
  };

  useEffect(() => {
    let volunteersChannel: RealtimeChannel | null = null
    let registeredChannel: RealtimeChannel | null = null
    let isMounted = true

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

    const refreshInterval = setInterval(() => {
      if (isMounted) {
        fetchData()
      }
    }, 30000)

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
  }, [fetchData])

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-sai-orange" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
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
            <RegisterVolunteerForm onRegister={handleRegister} />
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <CancelVolunteerForm onSuccess={() => fetchData()} userRole={role} />

          <ExcelUpload onSuccess={() => fetchData()} userRole={role} />
        </div>

        {role === "super_admin" && (
          <div className="flex gap-2 mb-4">
            <Button
              variant="outline"
              onClick={() => { setResetDialogOpen(true); setResetType("registered"); }}
              disabled={isResetting}
            >
              Reset Registered Volunteers
            </Button>
            <Button
              variant="outline"
              onClick={() => { setResetDialogOpen(true); setResetType("cancelled"); }}
              disabled={isResetting}
            >
              Reset Cancelled Volunteers
            </Button>
          </div>
        )}

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
                      <TableRow key={volunteer.sai_connect_id}>
                        <TableCell className="font-medium">{volunteer.sai_connect_id}</TableCell>
                        <TableCell>{volunteer.full_name}</TableCell>
                        <TableCell className="hidden sm:table-cell">{volunteer.mobile_number}</TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <Badge
                            variant={volunteer.is_cancelled === 'yes' ? "destructive" : undefined}
                            className={cn(
                              "hover:opacity-80 transition-opacity",
                              volunteer.is_cancelled === 'yes'
                                ? ""
                                : volunteer.registered_volunteers
                                ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 border-blue-300 dark:border-blue-700"
                                : "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border-green-300 dark:border-green-700"
                            )}
                          >
                            {volunteer.is_cancelled === 'yes'
                              ? "Cancelled"
                              : volunteer.registered_volunteers
                              ? "Registered"
                              : "Active"}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">{volunteer.sss_district}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleVolunteerClick(volunteer)}
                              title={role === 'super_admin' ? "View/Edit Profile" : "View Profile"}
                            >
                              {role === 'super_admin' ? <Edit className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                            {(role === 'super_admin' || role === 'normal_admin') && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <MoreHorizontal className="h-4 w-4" />
                                    <span className="sr-only">Open menu</span>
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  {volunteer.registered_volunteers && volunteer.is_cancelled === 'no' && (
                                    <DropdownMenuItem
                                      onClick={() => handleUnregister(volunteer.sai_connect_id)}
                                      disabled={isUnregistering === volunteer.sai_connect_id}
                                      className="text-blue-600 focus:text-blue-600 focus:bg-blue-50"
                                    >
                                      {isUnregistering === volunteer.sai_connect_id ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                      ) : (
                                        <UserX className="mr-2 h-4 w-4" />
                                      )}
                                      Unregister Volunteer
                                    </DropdownMenuItem>
                                  )}
                                  {volunteer.is_cancelled === 'yes' && (
                                    <DropdownMenuItem
                                      onClick={() => handleUncancel(volunteer.sai_connect_id)}
                                      disabled={isUncancelling === volunteer.sai_connect_id}
                                      className="text-green-600 focus:text-green-600 focus:bg-green-50"
                                    >
                                      {isUncancelling === volunteer.sai_connect_id ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                      ) : (
                                        <UserCheck className="mr-2 h-4 w-4" />
                                      )}
                                      Uncancel Volunteer
                                    </DropdownMenuItem>
                                  )}
                                  {(volunteer.registered_volunteers && volunteer.is_cancelled === 'no') || volunteer.is_cancelled === 'yes' ? (
                                    <DropdownMenuSeparator />
                                  ) : null}

                                  <DropdownMenuItem
                                    onClick={() => handleCancel(volunteer.sai_connect_id)}
                                    disabled={Boolean(volunteer.is_cancelled === 'yes' || (volunteer.registered_volunteers && volunteer.is_cancelled === 'no'))}
                                    className="text-orange-600 focus:text-orange-600 focus:bg-orange-50"
                                  >
                                    <UserX className="mr-2 h-4 w-4" />
                                    Cancel Volunteer
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => handleDelete(volunteer.sai_connect_id)}
                                    className="text-red-600 focus:text-red-600 focus:bg-red-50"
                                  >
                                    <X className="mr-2 h-4 w-4" />
                                    Delete Permanently
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog
        open={resetDialogOpen}
        onOpenChange={setResetDialogOpen}
        title={`Confirm Reset of ${resetType === "registered" ? "Registered" : "Cancelled"} Volunteers`}
        description={`Are you sure you want to archive and clear all ${resetType === "registered" ? "registered" : "cancelled"} volunteers? This action cannot be undone.`}
        onConfirm={() => handleReset(resetType!)}
        confirmText={isResetting ? "Resetting..." : "Yes, Reset"}
        cancelText="Cancel"
      />

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
