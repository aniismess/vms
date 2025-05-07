"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { getVolunteerById, updateVolunteerInDb } from "@/lib/supabase-service"
import { Loader2, User, ArrowLeft, Edit2, Save, X, CheckCircle2 } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { motion } from "framer-motion"
import { Badge } from "@/components/ui/badge"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { QUERY_KEYS } from "@/lib/query-hooks"
import type { VolunteerData } from "@/lib/types"
import { useAuth } from "@/contexts/auth-context"

export default function VolunteerDetailsPage() {
  const { role } = useAuth()
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const saiConnectId = params?.saiConnectId as string
  const [isEditing, setIsEditing] = useState(false)
  const [editedVolunteer, setEditedVolunteer] = useState<VolunteerData | null>(null)

  const { data: volunteer, isLoading, error } = useQuery<VolunteerData | null>({
    queryKey: [QUERY_KEYS.VOLUNTEER, saiConnectId],
    queryFn: () => getVolunteerById(saiConnectId),
    enabled: !!saiConnectId,
  })

  useEffect(() => {
    if (volunteer && !editedVolunteer) {
      setEditedVolunteer(volunteer)
    }
    if (volunteer && editedVolunteer && volunteer.sai_connect_id !== editedVolunteer.sai_connect_id) {
        setEditedVolunteer(volunteer);
        setIsEditing(false);
    }
  }, [volunteer, editedVolunteer])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editedVolunteer || role !== 'super_admin') return

    try {
      await updateVolunteerInDb(saiConnectId, editedVolunteer)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.VOLUNTEER, saiConnectId] }),
        queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.VOLUNTEERS] }),
        queryClient.invalidateQueries({ queryKey: ["dashboardData"] })
      ]);
      setIsEditing(false)
      toast({
        title: "Success",
        description: "Volunteer details updated successfully.",
      })
    } catch (err) {
      console.error('Error updating volunteer:', err)
      toast({
        title: "Error",
        description: "Failed to update volunteer details. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleEditCancel = () => {
    setIsEditing(false)
    if (volunteer) {
      setEditedVolunteer(volunteer)
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center space-y-4"
        >
          <Loader2 className="h-8 w-8 animate-spin text-sai-orange" />
          <p className="text-sm text-muted-foreground">Loading volunteer details...</p>
        </motion.div>
      </div>
    )
  }

  if (error || !volunteer || !editedVolunteer) {
    return (
      <div className="flex h-full items-center justify-center text-red-500">
        An error occurred while loading volunteer details or volunteer not found.
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Volunteer Details</h1>
          <p className="text-muted-foreground">View {role === 'super_admin' ? 'and manage ' : ''}volunteer information</p>
        </div>
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="text-sai-orange hover:text-sai-orange-dark"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="border-sai-orange/20">
          <form onSubmit={role === 'super_admin' ? handleSubmit : (e) => e.preventDefault()}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User className="h-5 w-5 text-sai-orange" />
                  <CardTitle>{editedVolunteer.full_name}</CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  {editedVolunteer.is_cancelled === 'yes' ? (
                    <Badge variant="destructive">Cancelled</Badge>
                  ) : editedVolunteer.registered_volunteers ? (
                    <Badge variant="default" className="bg-blue-500 hover:bg-blue-600">Registered</Badge>
                  ) : (
                    <Badge variant="secondary">Active</Badge>
                  )}
                  {role === 'super_admin' ? (
                    isEditing ? (
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleEditCancel}
                          className="text-red-500 hover:text-red-600"
                        >
                          <X className="mr-2 h-4 w-4" />
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          className="bg-sai-orange hover:bg-sai-orange-dark"
                        >
                          <Save className="mr-2 h-4 w-4" />
                          Save Changes
                        </Button>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsEditing(true)}
                        className="text-sai-orange hover:text-sai-orange-dark"
                      >
                        <Edit2 className="mr-2 h-4 w-4" />
                        Edit
                      </Button>
                    )
                  ) : null}
                </div>
              </div>
              <CardDescription>SAI Connect ID: {editedVolunteer.sai_connect_id}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Age</Label>
                  {isEditing && role === 'super_admin' ? (
                    <Input
                      type="number"
                      value={editedVolunteer.age || ''}
                      onChange={(e) => setEditedVolunteer(prev => prev ? { ...prev, age: parseInt(e.target.value) || null } : null)}
                      min="18"
                      max="100"
                    />
                  ) : (
                    <div className="text-sm p-2 min-h-[40px]">{editedVolunteer.age || "Not specified"}</div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Mobile Number</Label>
                  {isEditing && role === 'super_admin' ? (
                    <Input
                      value={editedVolunteer.mobile_number || ''}
                      onChange={(e) => setEditedVolunteer(prev => prev ? { ...prev, mobile_number: e.target.value } : null)}
                      maxLength={10}
                    />
                  ) : (
                    <div className="text-sm p-2 min-h-[40px]">{editedVolunteer.mobile_number || "Not specified"}</div>
                  )}
                </div>
                 <div className="space-y-2">
                  <Label>Aadhar Number</Label>
                  {isEditing && role === 'super_admin' ? (
                    <Input
                      value={editedVolunteer.aadhar_number || ''}
                      onChange={(e) => setEditedVolunteer(prev => prev ? { ...prev, aadhar_number: e.target.value } : null)}
                      maxLength={12}
                    />
                  ) : (
                    <div className="text-sm p-2 min-h-[40px]">{editedVolunteer.aadhar_number || "Not specified"}</div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>SSS District</Label>
                  {isEditing && role === 'super_admin' ? (
                    <Input
                      value={editedVolunteer.sss_district || ''}
                      onChange={(e) => setEditedVolunteer(prev => prev ? { ...prev, sss_district: e.target.value } : null)}
                    />
                  ) : (
                    <div className="text-sm p-2 min-h-[40px]">{editedVolunteer.sss_district || "Not specified"}</div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Gender</Label>
                  {isEditing && role === 'super_admin' ? (
                    <Input
                      value={editedVolunteer.gender || ''}
                      onChange={(e) => setEditedVolunteer(prev => prev ? { ...prev, gender: e.target.value } : null)}
                    />
                  ) : (
                    <div className="text-sm p-2 min-h-[40px]">{editedVolunteer.gender || "Not specified"}</div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Samiti/Bhajan Mandli</Label>
                  {isEditing && role === 'super_admin' ? (
                    <Input
                      value={editedVolunteer.samiti_or_bhajan_mandli || ''}
                      onChange={(e) => setEditedVolunteer(prev => prev ? { ...prev, samiti_or_bhajan_mandli: e.target.value } : null)}
                    />
                  ) : (
                    <div className="text-sm p-2 min-h-[40px]">{editedVolunteer.samiti_or_bhajan_mandli || "Not specified"}</div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Education</Label>
                  {isEditing && role === 'super_admin' ? (
                    <Input
                      value={editedVolunteer.education || ''}
                      onChange={(e) => setEditedVolunteer(prev => prev ? { ...prev, education: e.target.value } : null)}
                    />
                  ) : (
                    <div className="text-sm p-2 min-h-[40px]">{editedVolunteer.education || "Not specified"}</div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="qualifications">Special Qualifications</Label>
                  {isEditing && role === 'super_admin' ? (
                    <Input
                      id="qualifications"
                      value={editedVolunteer.special_qualifications || ""}
                      onChange={(e) => setEditedVolunteer(prev => prev ? { ...prev, special_qualifications: e.target.value } : null)}
                    />
                  ) : (
                    <div className="text-sm p-2 min-h-[40px] font-medium">{editedVolunteer.special_qualifications || "Not specified"}</div>
                  )}
                </div>
              </div>

              {editedVolunteer.registered_volunteers && (
                <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-700">
                  <div className="flex items-center gap-2 text-blue-600 dark:text-blue-300 mb-2">
                    <CheckCircle2 className="h-5 w-5" />
                    <h3 className="font-semibold">Registration Details</h3>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Batch</Label>
                      <div className="text-sm">{editedVolunteer.registered_volunteers.batch}</div>
                    </div>
                    <div className="space-y-2">
                      <Label>Past Seva Location</Label>
                      <div className="text-sm">{editedVolunteer.registered_volunteers.service_location}</div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </form>
        </Card>
      </motion.div>
    </div>
  )
}
