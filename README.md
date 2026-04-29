# Shinime

  A modern anime streaming web application built with React, Vite, and TypeScript.

  ## Features

  - Homepage with recommended, ongoing, and scheduled anime
  - Anime search
  - Browse by type: Series, Movies, OVA, Live Action
  - Genre browsing and filtering
  - Anime detail pages with synopsis, ratings, and episode lists
  - Episode streaming with HD/SD quality selection
  - Cinema mode and keyboard navigation
  - Responsive design for mobile and desktop

  ## Tech Stack

  - React 18
  - Vite + TypeScript
  - React Router v6
  - TanStack Query
  - Tailwind CSS + shadcn/ui
  - hls.js (HLS video streaming)
  - Supabase (Edge Functions as API proxy)
  - Express (production static file server)

  ## Architecture

  The frontend communicates with a Supabase Edge Function (`mobinime-proxy`) which proxies requests to the anime data API. This keeps API credentials server-side and handles CORS.

  ## Deployment

  ### Prerequisites

  - [Heroku CLI](https://devcenter.heroku.com/articles/heroku-cli)
  - [Supabase CLI](https://supabase.com/docs/guides/cli)
  - A Supabase project

  ### 1. Deploy the Supabase Edge Function

  ```bash
  supabase login
  supabase link --project-ref YOUR_PROJECT_REF
  supabase functions deploy mobinime-proxy --no-verify-jwt
  ```

  ### 2. Deploy to Heroku

  Create a new Heroku app and connect it to this GitHub repository.

  Set the following Config Vars in your Heroku app dashboard under **Settings → Config Vars**:

  | Config Var | Value |
  |---|---|
  | `VITE_SUPABASE_URL` | `https://your-project-ref.supabase.co` |
  | `VITE_SUPABASE_PUBLISHABLE_KEY` | Your Supabase **anon/public** key |
  | `NPM_CONFIG_PRODUCTION` | `false` |

  > **Important:** `NPM_CONFIG_PRODUCTION=false` is required so Heroku installs dev dependencies needed to build the frontend.

  Then deploy via the Heroku dashboard or:

  ```bash
  heroku login
  heroku git:remote -a your-heroku-app-name
  git push heroku main
  ```

  ## Local Development

  ```bash
  cp .env.example .env
  # Fill in your Supabase credentials in .env
  npm install
  npm run dev
  ```

  ## License

  For educational and personal use only.
  