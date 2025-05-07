1. Root Directory
| File/Folder | Purpose/Logic |
|--------------------------- |----------------------------------------------------------------------------------------------|
| README.md | Project overview, setup instructions, and usage guide. |
| package.json | Lists project dependencies, scripts, and metadata. |
| pnpm-lock.yaml / package-lock.json | Lock files for dependency versions (auto-generated). |
| next.config.mjs | Next.js configuration (custom headers, image domains, build settings). |
| tailwind.config.ts | Tailwind CSS configuration (custom colors, fonts, breakpoints, etc.). |
| tsconfig.json | TypeScript configuration (compiler options, path aliases). |
| .gitignore | Specifies files/folders to ignore in git. |
| MANAGE_DOCS.md | Documentation for managing the project (custom, check for project-specific instructions). |
| postcss.config.mjs | PostCSS configuration for CSS processing. |
| change-author.sh | Shell script for changing git commit authorship. |
| components.json | Configuration for UI component library (shadcn/ui). |
2. App Directory (app/)
Routing & Layout
| File/Folder | Purpose/Logic |
|--------------------------- |----------------------------------------------------------------------------------------------|
| layout.tsx | Root layout for all pages. Sets up fonts, providers, error boundary, and analytics. |
| globals.css | Global CSS styles (Tailwind + custom styles for Sai Org branding). |
| providers.tsx | Wraps the app in context providers (theme, auth, react-query, toaster notifications). |
Main Pages
| File/Folder | Purpose/Logic |
|--------------------------- |----------------------------------------------------------------------------------------------|
| page.tsx | Redirects users to /login (acts as a landing/redirect page). |
| (dashboard)/dashboard/page.tsx | Main dashboard page. Shows stats, lists of volunteers, download options, and profile dialogs. |
| (dashboard)/volunteers/page.tsx | Lists all volunteers, with filtering/search. |
| (dashboard)/volunteers/new/page.tsx | Form to add a new volunteer. |
| (dashboard)/volunteers/[saiConnectId]/page.tsx | View/edit a specific volunteer. |
| (dashboard)/volunteers/[saiConnectId]/[id]/page.tsx | Likely for nested volunteer details (e.g., service history). |
| login/page.tsx | Login form and authentication logic. |
API Endpoints
| File/Folder | Purpose/Logic |
|--------------------------- |----------------------------------------------------------------------------------------------|
| api/admin/send-confirmation/route.ts | Handles sending confirmation emails/notifications for admin actions. |
| api/auth/token/route.ts | Handles token-based authentication. |
| api/token/routes.ts | Additional token-related logic. |
3. Components (components/)
| File/Folder | Purpose/Logic |
|--------------------------- |----------------------------------------------------------------------------------------------|
| sidebar.tsx | Sidebar navigation, role-based links, logout, theme toggle. |
| register-volunteer-form.tsx | Dialog/form to register a volunteer for service. |
| cancel-volunteer-form.tsx | Form to cancel a volunteer (mark as not coming). |
| volunteer-profile-dialog.tsx | Dialog to view/edit a volunteer’s profile. |
| excel-upload.tsx | Handles uploading volunteers via Excel files. |
| theme-toggle.tsx | Button to toggle dark/light mode. |
| ui/ | Low-level UI components (button, input, dialog, card, table, etc.) used throughout the app. |
4. Contexts (contexts/)
| File/Folder | Purpose/Logic |
|--------------------------- |----------------------------------------------------------------------------------------------|
| auth-context.tsx | Provides authentication state and logic (login, logout, signup, user role fetching, etc.) to the app. |
5. Lib (lib/)
| File/Folder | Purpose/Logic |
|--------------------------- |----------------------------------------------------------------------------------------------|
| supabase-service.ts | All business logic for interacting with Supabase (fetching, creating, updating, registering, cancelling volunteers, dashboard stats, etc.). |
| supabase.ts | Initializes the Supabase client. |
| xlsx-utils.ts | Utility to export data to Excel. |
| types.ts | TypeScript types for volunteers and related data. |
| query-hooks.ts | Custom hooks for data fetching with React Query. |
| utils.ts | General utility functions. |
| validations/admin.ts | Validation logic for admin-related forms. |
6. Hooks (hooks/)
| File/Folder | Purpose/Logic |
|--------------------------- |----------------------------------------------------------------------------------------------|
| use-api-error.ts | Custom hook for handling API errors. |
| use-form-submit.ts | Custom hook for form submission logic. |
| use-form-validation.ts | Custom hook for form validation. |
| use-pagination.ts | Custom hook for pagination logic. |
| use-debounce.ts | Custom hook for debouncing input. |
| use-mobile.tsx | Detects if the user is on a mobile device. |
| use-toast.ts | Custom hook for showing toast notifications. |
7. Public Assets (public/assets/)
| File/Folder | Purpose/Logic |
|--------------------------- |----------------------------------------------------------------------------------------------|
| SSSIHL-Bhagawan-Sri-Sathya-Sai-Baba.jpg | Image used in the dashboard and other places. |
8. Supabase (supabase/)
| File/Folder | Purpose/Logic |
|--------------------------- |----------------------------------------------------------------------------------------------|
| migrations/ | SQL files for database schema changes. |
9. UI Components (components/ui/)
button.tsx, input.tsx, card.tsx, dialog.tsx, table.tsx, etc.:
These are reusable UI building blocks, often wrapping Radix UI or shadcn/ui primitives, styled with Tailwind.
Used throughout the app for consistent look and feel.
Key Modules and Their Logic
Authentication (contexts/auth-context.tsx)
Handles login, logout, signup using Supabase.
Fetches user role (normal_admin or super_admin) from the profiles table.
Provides authentication state to the rest of the app.
Volunteer Management (lib/supabase-service.ts)
Functions to fetch, create, update, register, and cancel volunteers.
Handles business logic for volunteer status (active, registered, cancelled).
Fetches dashboard stats and lists for display.
Dashboard (app/(dashboard)/dashboard/page.tsx)
Displays stats (total, active, registered, cancelled).
Shows lists of volunteers by status.
Allows searching, viewing, and downloading volunteer data.
Uses React Query for efficient data fetching and caching.
Forms (components/register-volunteer-form.tsx, components/cancel-volunteer-form.tsx)
Register form: Validates input, checks volunteer status, registers for service.
Cancel form: Validates input, cancels volunteer, unregisters if needed.
Sidebar (components/sidebar.tsx)
Navigation links based on user role.
Logout and theme toggle.
Responsive (collapses on mobile).
Excel Upload/Download (components/excel-upload.tsx, lib/xlsx-utils.ts)
Upload: Allows admins to bulk import volunteers from Excel.
Download: Exports volunteer lists to Excel for reporting.
How Everything Connects
User logs in → Auth context sets user and role.
Dashboard loads → Fetches stats and lists from Supabase.
Sidebar shows navigation based on role.
Volunteers can be added, registered, cancelled via forms.
Data is fetched and updated using service functions in lib/supabase-service.ts.
UI is built from reusable components in components/ui/.
How to Use This Document
For each file, know its purpose and how it fits into the overall flow.
For each module, understand the main logic and how it interacts with others.
For the viva, focus on explaining the flow: authentication → dashboard → volunteer management → data export/import.
If you want a more detailed breakdown of any specific file (e.g., a walkthrough of the dashboard page or a service function), just ask!
You can also copy this into a markdown file for easy reading and revision.