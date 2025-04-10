"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { Loader2 } from "lucide-react"
import { type VolunteerData } from "@/lib/supabase-service"
// Removed unused 'use' import from react
import { useVolunteer, useUpdateVolunteer } from "@/lib/query-hooks"

const SSS_DISTRICTS = [
  "Amla",
  "Anoopur",
  "Balaghat",
  "Betul",
  "Bhopal",
  "Burhanpur",
  "Chhindwada",
  "Chichli Narsinghpur",
  "Damoh",
  "Gadarwara",
  "Ghansore",
  "Guna",
  "Gwalior",
  "Indore",
  "Jabalpur",
  "Kaniwada",
  "Katni",
  "Khandwa",
  "Lalburra",
  "Mandla",
  "Narmadapuram",
  "Ratlam",
  "Rewa",
  "Sagar",
  "Satna",
  "Seoni",
  "Seoni Malwa",
  "Sahadol",
  "Singraulli",
  "Ujjain"
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

export default function EditVolunteerPage({ params }: { params: { saiConnectId: string } }) {
  const router = useRouter()
  const { toast } = useToast()
  const [volunteer, setVolunteer] = useState<VolunteerData | null>(null)
  const { saiConnectId } = params
  const { data: volunteerData, isLoading } = useVolunteer(saiConnectId)
  const updateVolunteer = useUpdateVolunteer()

  useEffect(() => {
    if (volunteerData) {
      setVolunteer(volunteerData as VolunteerData)
    }
  }, [volunteerData])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!volunteer) return

    try {
      await updateVolunteer.mutateAsync({ id: saiConnectId, data: volunteer })
      toast({
        title: "Success",
        description: "Volunteer updated successfully.",
      })
      router.push("/volunteers")
    } catch (error) {
      console.error("Error updating volunteer:", error)
      toast({
        title: "Error",
        description: "Failed to update volunteer.",
        variant: "destructive",
      })
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!volunteer) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">Volunteer not found</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Edit Volunteer</h1>
        <p className="text-muted-foreground">Update volunteer information</p>
      </div>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-6 p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="sai_connect_id">SAI Connect ID</Label>
              <Input
                id="sai_connect_id"
                value={volunteer.sai_connect_id || ""}
                onChange={(e) => setVolunteer({ ...volunteer, sai_connect_id: e.target.value })}
                required
                maxLength={6}
                pattern="[0-9]{6}"
                placeholder="Enter 6-digit SAI Connect ID"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="full_name">Full Name</Label>
              <Input
                id="full_name"
                value={volunteer.full_name || ""}
                onChange={(e) => setVolunteer({ ...volunteer, full_name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="age">Age</Label>
              <Input
                id="age"
                type="number"
                value={volunteer.age || ""}
                onChange={(e) => setVolunteer({ ...volunteer, age: parseInt(e.target.value) || null })}
                min={1}
                max={99}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="mobile_number">Mobile Number</Label>
              <Input
                id="mobile_number"
                value={volunteer.mobile_number || ""}
                onChange={(e) => setVolunteer({ ...volunteer, mobile_number: e.target.value })}
                maxLength={10}
                pattern="[0-9]{10}"
                placeholder="Enter 10-digit mobile number"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="aadhar_number">Aadhar Number</Label>
              <Input
                id="aadhar_number"
                value={volunteer.aadhar_number || ""}
                onChange={(e) => setVolunteer({ ...volunteer, aadhar_number: e.target.value })}
                maxLength={12}
                pattern="[0-9]{12}"
                placeholder="Enter 12-digit Aadhar number"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="gender">Gender</Label>
              <Select
                value={volunteer.gender || ""}
                onValueChange={(value) => setVolunteer({ ...volunteer, gender: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sss_district">SSS District</Label>
              <Select
                value={volunteer.sss_district || ""}
                onValueChange={(value) => setVolunteer({ ...volunteer, sss_district: value })}
              >
                <SelectTrigger>
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
            </div>

            <div className="space-y-2">
              <Label htmlFor="samiti_or_bhajan_mandli">Samiti/Bhajan Mandli</Label>
              <Input
                id="samiti_or_bhajan_mandli"
                value={volunteer.samiti_or_bhajan_mandli || ""}
                onChange={(e) => setVolunteer({ ...volunteer, samiti_or_bhajan_mandli: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="education">Education</Label>
              <Select
                value={volunteer.education || ""}
                onValueChange={(value) => setVolunteer({ ...volunteer, education: value })}
              >
                <SelectTrigger>
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
            </div>

            <div className="space-y-2">
              <Label htmlFor="special_qualifications">Special Qualifications</Label>
              <Input
                id="special_qualifications"
                value={volunteer.special_qualifications || ""}
                onChange={(e) => setVolunteer({ ...volunteer, special_qualifications: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="duty_point">Duty Point</Label>
              <Input
                id="duty_point"
                value={volunteer.duty_point || ""}
                onChange={(e) => setVolunteer({ ...volunteer, duty_point: e.target.value })}
              />
            </div>
          </div>

          <div className="flex justify-end space-x-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/volunteers")}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={updateVolunteer.isPending}>
              {updateVolunteer.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update Volunteer
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
