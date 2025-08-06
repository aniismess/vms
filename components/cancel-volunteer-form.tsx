"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { cancelVolunteerInDb } from "@/lib/supabase-service"
import { Loader2 } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { UserRole } from "@/contexts/auth-context"
import { UserX } from "lucide-react"
import { cn } from "@/lib/utils"

type CancelVolunteerFormProps = {
  onSuccess?: () => void
  userRole: UserRole
}

export function CancelVolunteerForm({ onSuccess, userRole }: CancelVolunteerFormProps) {
  const [volunteerId, setVolunteerId] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  const canCancel = userRole === 'super_admin' || userRole === 'normal_admin';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canCancel) {
        toast({ title: "Permission Denied", description: "You do not have permission to cancel volunteers.", variant: "destructive" });
        return;
    }
    setIsSubmitting(true)

    try {
      toast({
        title: "Processing",
        description: "Verifying volunteer information...",
        variant: "default",
        duration: 2000,
      })

      const { data: volunteer } = await supabase
        .from('volunteers_volunteers')
        .select(`
          *,
          registered_volunteers(*)
        `)
        .eq('sai_connect_id', volunteerId)
        .single()

      if (!volunteer) {
        toast({
          title: "Not Found",
          description: "Could not find a volunteer with the provided SAI Connect ID.",
          variant: "destructive",
          duration: 4000,
        })
        return
      }

      if (volunteer.is_cancelled === 'yes') {
        toast({
          title: "Already Cancelled",
          description: "This volunteer's service has already been cancelled.",
          variant: "destructive",
          duration: 4000,
        })
        return
      }

      await cancelVolunteerInDb(volunteerId)

      toast({
        title: "Success",
        description: `Volunteer ${volunteer.full_name} has been cancelled successfully.${
          volunteer.registered_volunteers ? ' They have also been unregistered from service.' : ''
        }`,
        duration: 3000,
      })

      onSuccess?.()
      setVolunteerId("")
    } catch (error) {
      console.error('Error cancelling volunteer:', error)
      toast({
        title: "Error",
        description: "Could not cancel the volunteer's service. Please try again.",
        variant: "destructive",
        duration: 4000,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="border-red-100 dark:border-red-900/50">
      <form onSubmit={handleSubmit}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <UserX className="h-5 w-5" />
            Cancel Volunteer
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Mark a volunteer as cancelled by entering their Sai Connect ID
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="volunteer-id" className="text-muted-foreground">Sai Connect ID</Label>
            <Input
              id="volunteer-id"
              placeholder="Enter 6-digit Sai Connect ID"
              value={volunteerId}
              onChange={(e) => {
                const value = e.target.value;
                if (value.length <= 6 && /^\d*$/.test(value)) {
                  setVolunteerId(value);
                }
              }}
              maxLength={6}
              pattern="\d{6}"
              required
              disabled={!canCancel}
              className={cn(
                "w-full",
                !canCancel && "opacity-50 cursor-not-allowed"
              )}
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button 
            type="submit" 
            variant="destructive" 
            disabled={isSubmitting || !canCancel} 
            title={!canCancel ? "Permission Denied" : ""}
            className={cn(
              "w-full",
              !canCancel && "opacity-50 cursor-not-allowed"
            )}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              "Cancel Volunteer"
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
