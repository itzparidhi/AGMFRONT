# AI Production Pipeline Tool

## Setup

1.  **Install Dependencies:**
    \\\ash
    npm install
    \\\

2.  **Environment Variables:**
    Open \.env\ and fill in your Supabase credentials:
    \\\
    VITE_SUPABASE_URL=your_supabase_url
    VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
    \\\

## Running the App

### Development Mode
To run the app in development mode (with hot reloading):
\\\ash
npm run electron:dev
\\\

### Build for Production
To build the application executable:
\\\ash
npm run electron:build
\\\

## Project Structure

-   \src/\: React Frontend
    -   \components/\: Reusable UI components
    -   \context/\: Auth and Notification contexts
    -   \pages/\: Main application screens (Dashboard, Timeline, Workstation)
    -   \supabaseClient.ts\: Supabase configuration
-   \electron/\: Electron Main Process
    -   \main.ts\: Main entry point
    -   \preload.ts\: Preload script
