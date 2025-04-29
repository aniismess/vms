# Volunteer Management System - Maintenance Documentation

This document provides instructions for managing and maintaining the Volunteer Management System (VMS) for the Sri Sathya Sai Seva Organisation.

## 1. Project Overview

The VMS is a web application built to help administrators manage volunteer information, track registrations, and view statistics. It replaces previous manual processes with a centralized digital system.

**Key Technologies:**
*   **Frontend:** Next.js (React Framework), TypeScript, Tailwind CSS, Shadcn/ui
*   **Backend:** Supabase (PostgreSQL Database, Authentication)
*   **Deployment:** Vercel
*   **Package Manager:** pnpm

## 2. Prerequisites

Before managing the application, ensure you have the following:

*   **Software:**
    *   [Node.js](https://nodejs.org/) (LTS version recommended)
    *   [pnpm](https://pnpm.io/installation) (Package manager used in this project)
    *   [Git](https://git-scm.com/)
*   **Accounts:**
    *   **GitHub (or other Git provider):** Access to the project repository.
    *   **Supabase:** Access to the project's Supabase dashboard (Database, Authentication, Settings).
    *   **Vercel:** Access to the project's Vercel dashboard (Deployments, Environment Variables, Logs).
    *   **SMTP Provider (Optional but likely needed):** Access to the email service account used for sending admin confirmation emails (credentials needed for environment variables).

## 3. Getting Started (Local Development)

1.  **Clone the Repository:**
    ```bash
    git clone <repository_url>
    cd volunteer-management-system # Or your project directory name
    ```
2.  **Install Dependencies:**
    ```bash
    pnpm install
    ```

## 4. Environment Variables

The application requires environment variables for connecting to Supabase, sending emails, and other configurations.

1.  **Create `.env.local` file:** In the project's root directory, create a file named `.env.local`. **This file should NOT be committed to Git.**
2.  **Populate `.env.local`:** Add the necessary variables based on the `.env.production` file or Vercel settings. Essential variables include:

    ```plaintext
    # Supabase
    NEXT_PUBLIC_SUPABASE_URL=YOUR_SUPABASE_PROJECT_URL
    NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
    # Note: If using Supabase server-side functions requiring a service key, add:
    # SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY



    # Application URL (used in confirmation emails)
    NEXT_PUBLIC_APP_URL=http://localhost:3000 # For local dev, change for production
    ```

3.  **Vercel Environment Variables:** Ensure these same variables (using production values, especially for `NEXT_PUBLIC_APP_URL`) are configured in the Vercel project settings under "Environment Variables".

## 5. Running Locally

To start the development server:

```bash
pnpm run dev
```

The application should now be accessible at `http://localhost:3000` (or the specified port).

## 6. Database Management (Supabase)

All application data (volunteers, admin users, roles, registration details) is stored in a PostgreSQL database managed by Supabase.

*   **Access:** Log in to the [Supabase Dashboard](https://supabase.com/dashboard).
*   **Table Editor:** Use the "Table Editor" section to view, add, edit, or delete data directly in the tables (`volunteers_volunteers`, `registered_volunteers`, `profiles`).
*   **Authentication:** Manage admin users under the "Authentication" section. New users added here will need a corresponding entry in the `profiles` table to assign a role (`normal_admin` or `super_admin`).
*   **SQL Editor:** Use the "SQL Editor" to run custom SQL queries if needed for complex data retrieval or updates.

**Caution:** Be careful when modifying data directly in the database, as it bypasses application logic and validation.

## 7. Deployment (Vercel)

*   **Platform:** The application is hosted and deployed on Vercel.
*   **Automatic Deployments:** Vercel is typically configured to automatically build and deploy the application whenever changes are pushed to the main branch (`main` or `master`) of the Git repository.
*   **Dashboard:** Access the Vercel project dashboard to:
    *   View deployment status and history.
    *   Check runtime logs.
    *   Manage environment variables (see Section 4).
    *   Configure custom domains.

## 8. Code Structure Overview

*   `app/`: Contains application pages, layouts, and API routes (using Next.js App Router).
    *   `(dashboard)/`: Routes protected by authentication.
    *   `api/`: Serverless API endpoints (e.g., for sending emails).
*   `components/`: Reusable React UI components.
    *   `ui/`: Components from the Shadcn/ui library.
*   `lib/`: Core logic, utilities, types, and service integrations.
    *   `supabase.ts`: Supabase client initialization.
    *   `supabase-service.ts`: Functions for interacting with the Supabase database.
    *   `query-hooks.ts`: Custom React Query hooks for data fetching and mutations.
    *   `validations/`: Zod schemas for form validation.
*   `contexts/`: React Context providers (e.g., `AuthContext`).
*   `hooks/`: Custom React hooks.
*   `public/`: Static assets (e.g., images).
*   `supabase/`: Database migration files.

## 9. Common Tasks

*   **Adding/Managing Admin Users:**
    1.  Invite or create a user in the Supabase Authentication section.
    2.  Once the user exists in `auth.users`, go to the Table Editor -> `profiles` table.
    3.  Add a new row:
        *   `id`: Paste the `id` of the user from `auth.users`.
        *   `role`: Set to `normal_admin` or `super_admin`.
    *   Alternatively, use the application's "Add Admin" feature if implemented (which likely involves the email confirmation flow).
*   **Updating Dependencies:**
    *   Regularly update dependencies for security and feature improvements.
    *   Use `pnpm update` to update packages according to `package.json` constraints.
    *   Use `pnpm outdated` to check for newer versions available.
    *   Test thoroughly after updating dependencies.
*   **Troubleshooting:**
    *   **Login Issues:** Check Supabase auth logs, ensure environment variables are correct, verify user exists in `auth.users` and `profiles`.
    *   **Data Not Displaying:** Check browser console for errors, inspect network requests, verify Supabase RLS (Row Level Security) policies if applicable, check Vercel function logs for API route errors.
    *   **Deployment Failures:** Check Vercel build and runtime logs for specific errors.
