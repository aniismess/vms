import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MoreHorizontal, Phone, MapPin, GraduationCap, Award } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import Link from "next/link"
import { cn } from "@/lib/utils"
import type { VolunteerData } from "@/lib/supabase-service"

interface VolunteerCardProps {
  volunteer: VolunteerData
  onCancel?: (id: string) => void
  onDelete?: (id: string) => void
}

export function VolunteerCard({ volunteer, onCancel, onDelete }: VolunteerCardProps) {
  return (
    <Card className={cn(
      "transition-all duration-200 hover:shadow-lg",
      volunteer.is_cancelled && "bg-red-50 dark:bg-red-950/20",
      volunteer.registered_volunteers && "bg-blue-50 dark:bg-blue-950/20"
    )}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xl font-playfair">{volunteer.full_name}</CardTitle>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">Open menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={`/volunteers/${volunteer.sai_connect_id}`}>Edit</Link>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onCancel?.(volunteer.sai_connect_id)}
              disabled={volunteer.is_cancelled}
            >
              Mark as Cancelled
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onDelete?.(volunteer.sai_connect_id)}
              className="text-destructive"
            >
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone className="h-4 w-4" />
              <span>{volunteer.mobile_number || "N/A"}</span>
            </div>
            <Badge variant={volunteer.is_cancelled ? "destructive" : "default"}>
              {volunteer.is_cancelled ? "Cancelled" : "Active"}
            </Badge>
          </div>

          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span>{volunteer.sss_district || "N/A"}</span>
          </div>

          {volunteer.education && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <GraduationCap className="h-4 w-4" />
              <span>{volunteer.education}</span>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {volunteer.special_qualifications && (
              <Badge variant="secondary">{volunteer.special_qualifications}</Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 