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

  try {
    const [
      { count: totalCount, error: totalError },
      { count: activeCount, error: activeError }, // Query Active directly
      { count: cancelledCount, error: cancelledError },
      { count: registeredCount, error: registeredError } // Query Registered directly
    ] = await Promise.all([
      // Total volunteers
      supabase
        .from("volunteers_volunteers")
        .select("*", { count: 'exact', head: true }),

      // Active volunteers (not cancelled and not registered) - Standard Method
      supabase
        .from("volunteers_volunteers")
        .select(`*, registered_volunteers!left(sai_connect_id)`, { count: 'exact', head: true })
        .eq("is_cancelled", 'no')
        .is("registered_volunteers.sai_connect_id", null),

      // Cancelled volunteers
      supabase
        .from("volunteers_volunteers")
        .select("*", { count: 'exact', head: true })
        .eq("is_cancelled", 'yes'),

      // Registered volunteers (Reverting to Diagnostic Step: Direct count from registered_volunteers table)
      supabase
        .from("registered_volunteers") // Count directly from this table
        .select('*', { count: 'exact', head: true }) // No join needed for this diagnostic count
        // Note: This count ignores the is_cancelled status.
    ]);

    // Check for errors in individual counts
    if (totalError) throw new Error(`Failed to get total count: ${totalError.message}`);
    if (activeError) throw new Error(`Failed to get active count: ${activeError.message}`);
    if (cancelledError) throw new Error(`Failed to get cancelled count: ${cancelledError.message}`);
    if (registeredError) throw new Error(`Failed to get registered count: ${registeredError.message}`);

    // Ensure counts are numbers, default to 0 if null
    const total = totalCount ?? 0;
    const active = activeCount ?? 0;
    const cancelled = cancelledCount ?? 0;
    const registered = registeredCount ?? 0; // Use the direct count

    // Active count is queried directly, no need for calculation or consistency check here
    // as the registered count method is intentionally simplified for diagnostics.

    const stats = {
      totalVolunteers: total,
      coming: active, // Use queried active count
      notComing: cancelled,
      registered: registered
    }

    console.log('Volunteer stats:', stats);
    return stats;

  } catch (error) {
     console.error("Error fetching volunteer stats:", error);
     // Return zero stats on error or re-throw, depending on desired behavior
     return {
        totalVolunteers: 0,
        coming: 0,
        notComing: 0,
        registered: 0
     }
  }
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
  console.log(`Attempting to cancel volunteer: ${saiConnectId}`);
  try {
    // Check if the volunteer is currently registered to attempt unregistration first.
    // Select only the foreign key to check for existence.
    const { data: registration, error: checkError } = await supabase
      .from('registered_volunteers')
      .select('sai_connect_id')
      .eq('sai_connect_id', saiConnectId)
      .maybeSingle(); // Use maybeSingle as they might not be registered

    if (checkError) {
      // Log error but proceed, as the main goal is cancellation.
      console.error(`Error checking registration status for ${saiConnectId}:`, checkError);
    }

    // If they were registered, attempt to delete the registration record.
    if (registration) {
      console.log(`Volunteer ${saiConnectId} is registered. Attempting to unregister...`);
      const { error: unregisterError } = await supabase
        .from('registered_volunteers')
        .delete()
        .eq('sai_connect_id', saiConnectId);

      if (unregisterError) {
        // Log error but proceed to cancellation step.
        console.error(`Failed to unregister volunteer ${saiConnectId}:`, unregisterError);
        // Optionally, you could inform the user via a non-blocking toast here if needed.
      } else {
        console.log(`Successfully unregistered volunteer ${saiConnectId}.`);
      }
    } else {
       console.log(`Volunteer ${saiConnectId} was not registered. Skipping unregistration.`);
    }

    // Now, perform the critical step: update the main volunteer record to cancelled and update timestamp.
    console.log(`Updating volunteer ${saiConnectId} status to cancelled...`);
    const { error: updateError } = await supabase
      .from('volunteers_volunteers')
      .update({ is_cancelled: 'yes', updated_at: new Date().toISOString() }) // Explicitly update timestamp
      .eq('sai_connect_id', saiConnectId);

    // If this update fails, the whole operation failed.
    if (updateError) {
      console.error(`Failed to update cancellation status for ${saiConnectId}:`, updateError);
      throw new Error('Could not update volunteer cancellation status.'); // Throw specific error
    }

    console.log(`Successfully cancelled volunteer ${saiConnectId}.`);
    return { success: true }; // Return success only if the main update worked.

  } catch (error) {
    // Catch any error thrown from the update step or unexpected errors.
    console.error(`Overall error cancelling volunteer ${saiConnectId}:`, error);
    // Re-throw the error to be caught by the calling function (in the form).
    throw error;
  }
}


// --- Functions to fetch ALL volunteers by status for download ---

export async function fetchAllActiveVolunteers(): Promise<VolunteerData[]> {
  console.log('Fetching ALL active volunteers for download...');
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
    .eq("is_cancelled", 'no')
    .is("registered_volunteers.sai_connect_id", null) // Ensure they are not registered
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching all active volunteers:", error);
    throw new Error("Failed to fetch active volunteers for download.");
  }
  console.log(`Fetched ${data?.length || 0} active volunteers for download.`);
  return data || [];
}

export async function fetchAllRegisteredVolunteers(): Promise<VolunteerData[]> {
  console.log('Fetching ALL registered volunteers for download...');
  const { data, error } = await supabase
    .from("volunteers_volunteers")
    .select(`
      *,
      registered_volunteers!inner (
        sai_connect_id,
        batch,
        service_location
      )
    `)
    .eq("is_cancelled", 'no') // Ensure they are not cancelled
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching all registered volunteers:", error);
    throw new Error("Failed to fetch registered volunteers for download.");
  }
   console.log(`Fetched ${data?.length || 0} registered volunteers for download.`);
  return data || [];
}

export async function fetchAllCancelledVolunteers(): Promise<VolunteerData[]> {
  console.log('Fetching ALL cancelled volunteers for download...');
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
    .eq("is_cancelled", 'yes') // Select only cancelled
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching all cancelled volunteers:", error);
    throw new Error("Failed to fetch cancelled volunteers for download.");
  }
   console.log(`Fetched ${data?.length || 0} cancelled volunteers for download.`);
  return data || [];
}

export async function registerVolunteer(data: {
  sai_connect_id: string
  age: number
  batch: string
  service_location: string
}) {
  // First update the volunteer's record: set age, ensure is_cancelled is 'no', and update timestamp
  const { error: updateError } = await supabase
    .from("volunteers_volunteers")
    .update({ age: data.age, is_cancelled: 'no', updated_at: new Date().toISOString() }) // Also set is_cancelled to 'no' and update timestamp
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

// Updated function fetching stats and specific volunteer lists for dashboard
export async function getDashboardPageData() {
  console.log('Fetching dashboard data (stats, all active, recent registered, recent cancelled)...');
  try {
    // Fetch stats
    const statsPromise = getVolunteerStats();

    // Fetch ALL Active volunteers
    const activeVolunteersPromise = supabase
      .from("volunteers_volunteers")
      .select(`*, registered_volunteers!left(sai_connect_id, batch, service_location)`)
      .eq("is_cancelled", 'no')
      .is("registered_volunteers.sai_connect_id", null)
      .order("updated_at", { ascending: false }); // Keep ordering for consistency, though no limit

    // Fetch 50 most recent Registered volunteers
    const recentRegisteredPromise = supabase
      .from("volunteers_volunteers")
      .select(`*, registered_volunteers!inner(sai_connect_id, batch, service_location)`)
      .eq("is_cancelled", 'no')
      .order("updated_at", { ascending: false })
      .limit(50);

    // Fetch 50 most recent Cancelled volunteers
    const recentCancelledPromise = supabase
      .from("volunteers_volunteers")
      .select(`*, registered_volunteers!left(sai_connect_id, batch, service_location)`) // Left join ok, might have been registered before
      .eq("is_cancelled", 'yes')
      .order("updated_at", { ascending: false })
      .limit(50);

    // Await all promises
    const [
        stats,
        { data: activeVolunteers, error: activeError },
        { data: recentRegistered, error: registeredError },
        { data: recentCancelled, error: cancelledError }
    ] = await Promise.all([
        statsPromise,
        activeVolunteersPromise,
        recentRegisteredPromise,
        recentCancelledPromise
    ]);

    // Handle potential errors for each list fetch
    if (activeError) console.error("Error fetching active volunteers for dashboard:", activeError);
    if (registeredError) console.error("Error fetching recent registered volunteers for dashboard:", registeredError);
    if (cancelledError) console.error("Error fetching recent cancelled volunteers for dashboard:", cancelledError);

    // Return data, defaulting to empty arrays on error for lists
    const returnData = {
        stats,
        activeVolunteers: activeError ? [] : (activeVolunteers || []),
        recentRegistered: registeredError ? [] : (recentRegistered || []),
        recentCancelled: cancelledError ? [] : (recentCancelled || [])
    };

    console.log('Dashboard data fetched:', {
        stats: returnData.stats,
        activeCount: returnData.activeVolunteers.length, // Note: this is ALL active
        recentRegisteredCount: returnData.recentRegistered.length,
        recentCancelledCount: returnData.recentCancelled.length
    });

    return returnData;

  } catch (error) {
    // Catch errors from getVolunteerStats or Promise.all itself
    console.error("Error fetching dashboard page data:", error);
    // Re-throw the error so React Query can handle it
    throw error
  }
}
