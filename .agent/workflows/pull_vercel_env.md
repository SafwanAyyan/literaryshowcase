---
description: Pull environment variables from Vercel
---

To import your environment variables from Vercel to your local development environment:

1.  **Login to Vercel** (if not already logged in):
    ```bash
    npx vercel login
    ```

2.  **Link your project** to the Vercel project:
    ```bash
    npx vercel link
    ```
    Follow the prompts to select the correct scope and project.

3.  **Pull the environment variables**:
    ```bash
    npx vercel env pull .env.local
    ```
    This command downloads the Development environment variables and saves them to `.env.local`.

    *Note: If you want to pull Production variables, use `npx vercel env pull .env.production`.*
