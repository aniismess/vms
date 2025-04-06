"use client"

import { useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { getVolunteerById, updateVolunteerInDb, cancelVolunteerInDb } from "@/lib/supabase-service"
import { Loader2, User, ArrowLeft, Edit2, Save, X, CheckCircle2, XCircle, UserX } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { motion } from "framer-motion"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { QUERY_KEYS } from "@/lib/query-hooks"

export default function VolunteerDetailsPage() {
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const saiConnectId = params?.saiConnectId as string
  const [isEditing, setIsEditing] = useState(false)
  const [editedVolunteer, setEditedVolunteer] = useState<any>(null)

  const { data: volunteer, isLoading, error } = useQuery({
    queryKey: [QUERY_KEYS.VOLUNTEER, saiConnectId],
    queryFn: () => getVolunteerById(saiConnectId),
    enabled: !!saiConnectId,
    onSuccess: (data) => {
      if (!editedVolunteer) {
        setEditedVolunteer(data)
      }
    }
  })

  const handleCancel = async () => {
    if (!volunteer) return

    try {
      await cancelVolunteerInDb(volunteer.sai_connect_id)
      await queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.VOLUNTEER, saiConnectId] })
      toast({
        title: "Success",
        description: "Volunteer has been cancelled successfully.",
      })
    } catch (err) {
      console.error('Error cancelling volunteer:', err)
      toast({
        title: "Error",
        description: "Failed to cancel volunteer. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editedVolunteer) return

    try {
      await updateVolunteerInDb(saiConnectId, editedVolunteer)
      await queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.VOLUNTEER, saiConnectId] })
      await queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.VOLUNTEERS] })
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
    setEditedVolunteer(volunteer)
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

  if (error || !volunteer) {
    return (
      <div className="flex h-full items-center justify-center text-red-500">
        An error occurred while loading volunteer details
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
          <p className="text-muted-foreground">View and manage volunteer information</p>
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
          <form onSubmit={handleSubmit}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User className="h-5 w-5 text-sai-orange" />
                  <CardTitle>{editedVolunteer?.full_name}</CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  {volunteer.is_cancelled ? (
                    <Badge variant="destructive">Cancelled</Badge>
                  ) : volunteer.registered_volunteers ? (
                    <Badge variant="default" className="bg-blue-500 hover:bg-blue-600">Registered</Badge>
                  ) : (
                    <Badge variant="secondary">Not Registered</Badge>
                  )}
                  {!isEditing ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsEditing(true)}
                      className="text-sai-orange hover:text-sai-orange-dark"
                    >
                      <Edit2 className="mr-2 h-4 w-4" />
                      Edit
                    </Button>
                  ) : (
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
                  )}
                </div>
              </div>
              <CardDescription>SAI Connect ID: {editedVolunteer?.sai_connect_id}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Age</Label>
                  {isEditing ? (
                    <Input
                      type="number"
                      value={editedVolunteer?.age || ''}
                      onChange={(e) => setEditedVolunteer({ ...editedVolunteer, age: parseInt(e.target.value) })}
                      min="18"
                      max="100"
                    />
                  ) : (
                    <div className="text-sm">{editedVolunteer?.age || "Not specified"}</div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Mobile Number</Label>
                  {isEditing ? (
                    <Input
                      value={editedVolunteer?.mobile_number || ''}
                      onChange={(e) => setEditedVolunteer({ ...editedVolunteer, mobile_number: e.target.value })}
                      maxLength={10}
                    />
                  ) : (
                    <div className="text-sm">{editedVolunteer?.mobile_number || "Not specified"}</div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Aadhar Number</Label>
                  {isEditing ? (
                    <Input
                      value={editedVolunteer?.aadhar_number || ''}
                      onChange={(e) => setEditedVolunteer({ ...editedVolunteer, aadhar_number: e.target.value })}
                      maxLength={12}
                    />
                  ) : (
                    <div className="text-sm">{editedVolunteer?.aadhar_number || "Not specified"}</div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>SSS District</Label>
                  {isEditing ? (
                    <Input
                      value={editedVolunteer?.sss_district || ''}
                      onChange={(e) => setEditedVolunteer({ ...editedVolunteer, sss_district: e.target.value })}
                    />
                  ) : (
                    <div className="text-sm">{editedVolunteer?.sss_district || "Not specified"}</div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Gender</Label>
                  {isEditing ? (
                    <Input
                      value={editedVolunteer?.Gender || ''}
                      onChange={(e) => setEditedVolunteer({ ...editedVolunteer, Gender: e.target.value })}
                    />
                  ) : (
                    <div className="text-sm">{editedVolunteer?.Gender || "Not specified"}</div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Samiti/Bhajan Mandli</Label>
                  {isEditing ? (
                    <Input
                      value={editedVolunteer?.samiti_or_bhajan_mandli || ''}
                      onChange={(e) => setEditedVolunteer({ ...editedVolunteer, samiti_or_bhajan_mandli: e.target.value })}
                    />
                  ) : (
                    <div className="text-sm">{editedVolunteer?.samiti_or_bhajan_mandli || "Not specified"}</div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Education</Label>
                  {isEditing ? (
                    <Input
                      value={editedVolunteer?.education || ''}
                      onChange={(e) => setEditedVolunteer({ ...editedVolunteer, education: e.target.value })}
                    />
                  ) : (
                    <div className="text-sm">{editedVolunteer?.education || "Not specified"}</div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="qualifications">Special Qualifications</Label>
                  {isEditing ? (
                    <Input
                      id="qualifications"
                      value={editedVolunteer?.special_qualifications || ""}
                      onChange={(e) => setEditedVolunteer({ ...editedVolunteer, special_qualifications: e.target.value })}
                    />
                  ) : (
                    <div className="font-medium">{volunteer.special_qualifications || "Not specified"}</div>
                  )}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex items-center space-x-2">
                  <Switch 
                    id="sevadal" 
                    checked={editedVolunteer?.sevadal_training_certificate === 'yes'} 
                    onCheckedChange={(checked) => setEditedVolunteer({ ...editedVolunteer, sevadal_training_certificate: checked ? 'yes' : 'no' })}
                    disabled={!isEditing}
                    className="data-[state=checked]:bg-sai-orange"
                  />
                  <Label htmlFor="sevadal">Sevadal Training Certificate</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch 
                    id="past-service" 
                    checked={editedVolunteer?.past_prashanti_service === 'yes'} 
                    onCheckedChange={(checked) => setEditedVolunteer({ ...editedVolunteer, past_prashanti_service: checked ? 'yes' : 'no' })}
                    disabled={!isEditing}
                    className="data-[state=checked]:bg-sai-orange"
                  />
                  <Label htmlFor="past-service">Past Prashanti Service</Label>
                </div>
              </div>

              {volunteer.registered_volunteers && (
                <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center gap-2 text-green-600 mb-2">
                    <CheckCircle2 className="h-5 w-5" />
                    <h3 className="font-semibold">Registration Details</h3>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Batch</Label>
                      <div className="text-sm">{volunteer.registered_volunteers.batch}</div>
                    </div>
                    <div className="space-y-2">
                      <Label>Service Location</Label>
                      <div className="text-sm">{volunteer.registered_volunteers.service_location}</div>
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