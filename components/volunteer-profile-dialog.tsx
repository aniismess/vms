import React, { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import { Loader2, Edit2, Save, X, CheckCircle2, UserCheck } from "lucide-react"
import { updateVolunteerInDb } from "@/lib/supabase-service"
import type { VolunteerData } from "@/lib/types"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const SSS_DISTRICTS = [
  "Amla", "Anoopur", "Balaghat", "Betul", "Bhopal", "Burhanpur", "Chhindwada",
  "Chichli Narsinghpur", "Damoh", "Gadarwara", "Ghansore", "Guna", "Gwalior",
  "Indore", "Jabalpur", "Kaniwada", "Katni", "Khandwa", "Lalburra", "Mandla",
  "Narmadapuram", "Ratlam", "Rewa", "Sagar", "Satna", "Seoni", "Seoni Malwa",
  "Sahadol", "Singraulli", "Ujjain"
]

const EDUCATION_LEVELS = [
  "Primary (1st to 5th)",
  "Secondary (6th to 10th)",
  "Higher Secondary (11th to 12th)",
  "Diploma",
  "Graduation",
  "Post Graduation",
  "Doctorate"
]

interface VolunteerProfileDialogProps {
  volunteer: VolunteerData | null
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onUpdate: () => void
}

export function VolunteerProfileDialog({
  volunteer,
  isOpen,
  onOpenChange,
  onUpdate
}: VolunteerProfileDialogProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedVolunteer, setEditedVolunteer] = useState<VolunteerData | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (volunteer) {
      setEditedVolunteer({
        ...volunteer,
        age: volunteer.age || null,
      })
    }
  }, [volunteer])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const updates = {
        ...editedVolunteer,
        age: editedVolunteer.age ? parseInt(editedVolunteer.age.toString()) : null
      }

      await updateVolunteerInDb(volunteer.sai_connect_id, updates)
      onUpdate?.()
      toast({
        title: "Profile Updated Successfully",
        description: `${editedVolunteer.full_name}'s profile has been updated with the latest information.`,
        variant: "default",
        duration: 3000,
      })
      onOpenChange(false)
    } catch (error) {
      console.error("Error updating volunteer:", error)
      toast({
        title: "Update Failed",
        description: "Could not update the volunteer's profile. Please check the information and try again.",
        variant: "destructive",
        duration: 4000,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleFieldChange = (field: string, value: any) => {
    setEditedVolunteer(prev => {
      const updated = { ...prev, [field]: value }
      // Show real-time validation feedback for specific fields
      if (field === 'mobile_number' && value && !/^\d{10}$/.test(value)) {
        toast({
          title: "Invalid Mobile Number",
          description: "Please enter a valid 10-digit mobile number.",
          variant: "destructive",
          duration: 3000,
        })
      }
      if (field === 'aadhar_number' && value && !/^\d{12}$/.test(value)) {
        toast({
          title: "Invalid Aadhar Number",
          description: "Please enter a valid 12-digit Aadhar number.",
          variant: "destructive",
          duration: 3000,
        })
      }
      if (field === 'age' && (parseInt(value) < 18 || parseInt(value) > 100)) {
        toast({
          title: "Invalid Age",
          description: "Age must be between 18 and 100 years.",
          variant: "destructive",
          duration: 3000,
        })
      }
      return updated
    })
  }

  if (!volunteer || !editedVolunteer) return null

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Volunteer Profile</span>
            {!isEditing ? (
              <Button variant="ghost" size="icon" onClick={() => setIsEditing(true)}>
                <Edit2 className="h-4 w-4" />
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button variant="ghost" size="icon" onClick={() => setIsEditing(false)}>
                  <X className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={handleSubmit} disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                </Button>
              </div>
            )}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Registration Details Section */}
          {volunteer.registered_volunteers && (
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2 mb-4">
                <UserCheck className="h-5 w-5 text-blue-500" />
                <h3 className="font-semibold text-blue-700">Registration Details</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-blue-700">Batch</Label>
                  <div className="font-medium">{volunteer.registered_volunteers.batch || "Not specified"}</div>
                </div>
                <div>
                  <Label className="text-blue-700">Service Location</Label>
                  <div className="font-medium">{volunteer.registered_volunteers.service_location || "Not specified"}</div>
                </div>
              </div>
            </div>
          )}

          {/* Volunteer Details Section */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Full Name</Label>
              {isEditing ? (
                <Input
                  id="full_name"
                  value={editedVolunteer.full_name || ""}
                  onChange={(e) => handleFieldChange('full_name', e.target.value)}
                />
              ) : (
                <div className="font-medium">{volunteer.full_name || "Not specified"}</div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="age">Age</Label>
              {isEditing ? (
                <Input
                  id="age"
                  type="number"
                  value={editedVolunteer.age || ""}
                  onChange={(e) => handleFieldChange('age', e.target.value)}
                  min="18"
                  max="100"
                />
              ) : (
                <div className="font-medium">{volunteer.age || "Not specified"}</div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="mobile_number">Mobile Number</Label>
              {isEditing ? (
                <Input
                  id="mobile_number"
                  value={editedVolunteer.mobile_number || ""}
                  onChange={(e) => handleFieldChange('mobile_number', e.target.value)}
                  maxLength={10}
                />
              ) : (
                <div className="font-medium">{volunteer.mobile_number || "Not specified"}</div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="aadhar_number">Aadhar Number</Label>
              {isEditing ? (
                <Input
                  id="aadhar_number"
                  value={editedVolunteer.aadhar_number || ""}
                  onChange={(e) => handleFieldChange('aadhar_number', e.target.value)}
                  maxLength={12}
                />
              ) : (
                <div className="font-medium">{volunteer.aadhar_number || "Not specified"}</div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="sss_district">SSS District</Label>
              {isEditing ? (
                <Select
                  value={editedVolunteer.sss_district || ""}
                  onValueChange={(value) => handleFieldChange('sss_district', value)}
                >
                  <SelectTrigger id="sss_district">
                    <SelectValue placeholder="Select district" />
                  </SelectTrigger>
                  <SelectContent>
                    {SSS_DISTRICTS.map((district) => (
                      <SelectItem key={district} value={district}>
                        {district}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="font-medium">{volunteer.sss_district || "Not specified"}</div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="gender">Gender</Label>
              {isEditing ? (
                <Select
                  value={editedVolunteer.gender || ""}
                  onValueChange={(value) => handleFieldChange('gender', value)}
                >
                  <SelectTrigger id="gender">
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <div className="font-medium">{volunteer.gender || "Not specified"}</div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="education">Education</Label>
              {isEditing ? (
                <Select
                  value={editedVolunteer.education || ""}
                  onValueChange={(value) => handleFieldChange('education', value)}
                >
                  <SelectTrigger id="education">
                    <SelectValue placeholder="Select education level" />
                  </SelectTrigger>
                  <SelectContent>
                    {EDUCATION_LEVELS.map((level) => (
                      <SelectItem key={level} value={level}>
                        {level}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="font-medium">{volunteer.education || "Not specified"}</div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="samiti">Samiti/Bhajan Mandli</Label>
              {isEditing ? (
                <Input
                  id="samiti"
                  value={editedVolunteer.samiti_or_bhajan_mandli || ""}
                  onChange={(e) => handleFieldChange('samiti_or_bhajan_mandli', e.target.value)}
                />
              ) : (
                <div className="font-medium">{volunteer.samiti_or_bhajan_mandli || "Not specified"}</div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="qualifications">Special Qualifications</Label>
              {isEditing ? (
                <Input
                  id="qualifications"
                  value={editedVolunteer.special_qualifications || ""}
                  onChange={(e) => handleFieldChange('special_qualifications', e.target.value)}
                />
              ) : (
                <div className="font-medium">{volunteer.special_qualifications || "Not specified"}</div>
              )}
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
} 