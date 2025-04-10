import { supabase } from "./supabase"

export type RegisteredVolunteer = {
  sai_connect_id: string
  batch: string | null
  service_location: string | null
}

export type YesNoType = 'yes' | 'no'

export type VolunteerData = {
  serial_number: string | null
  full_name: string | null
  age: number | null
  aadhar_number: string | null
  sai_connect_id: string
  mobile_number: string | null
  sss_district: string | null
  gender: string | null
  samiti_or_bhajan_mandli: string | null
  education: string | null
  special_qualifications: string | null
  last_service_location: string | null
  other_service_location: string | null
  prashanti_arrival: string | null
  prashanti_departure: string | null
  duty_point: string | null
  is_cancelled: YesNoType
  created_by_id: string | null
  created_at?: string
  updated_at?: string
  registered_volunteers: RegisteredVolunteer | null
}

export async function getVolunteers(): Promise<VolunteerData[]> {
  console.log('Fetching volunteers...')
  const { data, error } = await supabase
    .from("volunteers_volunteers")
    .select(`
      *,
      registered_volunteers!left (
        sai_connect_id,
        batch,
        service_location,
        created_at
      )
    `)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching volunteers:", error)
    throw error
  }

  // Log each volunteer's status
  data?.forEach(volunteer => {
    console.log(`Volunteer ${volunteer.sai_connect_id}:`, {
      is_cancelled: volunteer.is_cancelled,
      has_registered: !!volunteer.registered_volunteers,
      status: volunteer.is_cancelled === 'yes' ? 'Cancelled' :
              volunteer.registered_volunteers ? 'Registered' : 'Active'
    })
  })

  console.log('Total volunteers fetched:', data?.length || 0)
  return data || []
}

export async function getVolunteerStats() {
  console.log('Fetching volunteer stats...')
  
  const [
    { count: totalCount },
    { count: activeCount },
    { count: cancelledCount },
    { count: registeredCount }
  ] = await Promise.all([
    // Total volunteers
    supabase
      .from("volunteers_volunteers")
      .select("*", { count: 'exact', head: true }),
    
    // Active volunteers (not cancelled and not registered)
    supabase
      .from("volunteers_volunteers")
      .select(`
        *,
        registered_volunteers!left(sai_connect_id)
      `, { count: 'exact', head: true })
      .eq("is_cancelled", 'no')
      .is("registered_volunteers.sai_connect_id", null),
    
    // Cancelled volunteers
    supabase
      .from("volunteers_volunteers")
      .select("*", { count: 'exact', head: true })
      .eq("is_cancelled", 'yes'),
    
    // Registered volunteers
    supabase
      .from("volunteers_volunteers")
      .select(`
        *,
        registered_volunteers!inner(sai_connect_id)
      `, { count: 'exact', head: true })
      .eq("is_cancelled", 'no')
  ])

  const stats = {
    totalVolunteers: totalCount || 0,
    coming: activeCount || 0,
    notComing: cancelledCount || 0,
    registered: registeredCount || 0
  }

  console.log('Volunteer stats:', stats)
  return stats
}

export async function createVolunteerInDb(volunteer: Omit<VolunteerData, 'registered_volunteers'>) {
  console.log('Original volunteer data:', JSON.stringify(volunteer, null, 2));

  // Define the columns we want to insert and select
  const columns = [
    'sai_connect_id',
    'full_name',
    'age',
    'mobile_number',
    'aadhar_number',
    'sss_district',
    'gender',
    'samiti_or_bhajan_mandli',
    'education',
    'special_qualifications',
    'serial_number',
    'prashanti_arrival',
    'prashanti_departure',
    'duty_point',
    'last_service_location',
    'other_service_location',
    'created_by_id',
    'is_cancelled'
  ];

  // Create a new object with only the allowed fields
  const cleanVolunteer = {} as any;
  columns.forEach(column => {
    if (column in volunteer) {
      cleanVolunteer[column] = volunteer[column as keyof typeof volunteer];
    }
  });

  // Ensure is_cancelled is properly formatted
  cleanVolunteer.is_cancelled = volunteer.is_cancelled === 'yes' ? 'yes' : 'no';

  console.log('Clean volunteer data being sent to Supabase:', JSON.stringify(cleanVolunteer, null, 2));

  try {
    const { data, error } = await supabase
      .from("volunteers_volunteers")
      .insert([cleanVolunteer])
      .select(columns.join(', '));

    if (error) {
      console.error("Error creating volunteer:", error);
      throw error;
    }

    return data?.[0];
  } catch (error) {
    console.error("Error in createVolunteerInDb:", error);
    throw error;
  }
}

export async function updateVolunteerInDb(id: string, updates: Partial<VolunteerData>) {
  // Remove registered_volunteers from updates as it's a relationship, not a column
  const { registered_volunteers, ...updateFields } = updates

  // Convert boolean fields to 'yes'/'no'
  const formattedUpdates = {
    ...updateFields,
    ...(updates.is_cancelled !== undefined && {
      is_cancelled: updates.is_cancelled ? 'yes' : 'no'
    })
  }

  const { data, error } = await supabase
    .from("volunteers_volunteers")
    .update(formattedUpdates)
    .eq("sai_connect_id", id)
    .select(`
      *,
      registered_volunteers!left (
        sai_connect_id,
        batch,
        service_location
      )
    `)

  if (error) {
    console.error("Error updating volunteer:", error)
    throw error
  }

  return data?.[0]
}

export async function deleteVolunteerFromDb(id: string) {
  const { error } = await supabase.from("volunteers_volunteers").delete().eq("sai_connect_id", id)

  if (error) {
    console.error("Error deleting volunteer:", error)
    throw error
  }

  return true
}

export async function getVolunteerById(id: string): Promise<VolunteerData | null> {
  try {
    const { data, error } = await supabase
      .from("volunteers_volunteers")
      .select(`
        *,
        registered_volunteers!left (
          sai_connect_id,
          batch,
          service_location
        )
      `)
      .eq("sai_connect_id", id)
      .maybeSingle()

    if (error) {
      console.error("Error fetching volunteer:", error)
      return null
    }

    return data
  } catch (error) {
    console.error("Error fetching volunteer:", error)
    return null
  }
}

export async function cancelVolunteerInDb(saiConnectId: string) {
  try {
    // First, check if the volunteer exists
    const { data: volunteer, error: fetchError } = await supabase
      .from('volunteers_volunteers')
      .select('*')
      .eq('sai_connect_id', saiConnectId)
      .single()

    if (fetchError) {
      throw new Error('Could not find volunteer')
    }

    // If volunteer is registered, remove from registered_volunteers first
    if (volunteer.registered_volunteers) {
      const { error: unregisterError } = await supabase
        .from('registered_volunteers')
        .delete()
        .eq('sai_connect_id', saiConnectId)

      if (unregisterError) {
        throw new Error('Could not unregister volunteer')
      }
    }

    // Now cancel the volunteer
    const { error: updateError } = await supabase
      .from('volunteers_volunteers')
      .update({ is_cancelled: 'yes' })
      .eq('sai_connect_id', saiConnectId)

    if (updateError) {
      throw new Error('Could not cancel volunteer')
    }

    return { success: true }
  } catch (error) {
    console.error('Error cancelling volunteer:', error)
    throw error
  }
}

export async function registerVolunteer(data: {
  sai_connect_id: string
  age: number
  batch: string
  service_location: string
}) {
  // First update the volunteer's age
  const { error: updateError } = await supabase
    .from("volunteers_volunteers")
    .update({ age: data.age })
    .eq("sai_connect_id", data.sai_connect_id)

  if (updateError) {
    console.error("Error updating volunteer age:", updateError)
    throw updateError
  }

  // Then register the volunteer
  const { error: registrationError } = await supabase
    .from("registered_volunteers")
    .insert([{
      sai_connect_id: data.sai_connect_id,
      batch: data.batch,
      service_location: data.service_location
    }])

  if (registrationError) {
    console.error("Error registering volunteer:", registrationError)
    throw registrationError
  }

  return true
}

// New function combining stats and volunteer list fetching
export async function getDashboardPageData() {
  console.log('Fetching combined dashboard data...')
  try {
    const [stats, volunteers] = await Promise.all([
      getVolunteerStats(),
      getVolunteers()
    ])
    console.log('Combined data fetched:', { stats, volunteers: volunteers.length })
    return { stats, volunteers }
  } catch (error) {
    console.error("Error fetching combined dashboard data:", error)
    // Re-throw the error so React Query can handle it
    throw error
  }
}
