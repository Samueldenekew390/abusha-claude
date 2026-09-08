Vercel deployment checklist for this project

1) Ensure files are committed and pushed to the Git repository connected to Vercel.
   - Include the `admin/` folder and `admin/zela.html`.
   - Do NOT commit `config.js`.

2) Add `vercel.json` (already added) — this forces Vercel to publish the repo as a static site.

3) Vercel project settings (recommended):
   - Framework Preset: Other
   - Build Command: (leave empty)
   - Output Directory: (leave empty) or set to `.`

4) Environment variables: none required for static deploy, but keep sensitive keys local in `config.js`.

5) Redeploy the project from the Vercel dashboard or push a new commit. After deployment the admin page will be available at:
   https://<your-vercel-project>.vercel.app/admin/zela.html

6) If you want server-backed admin authentication later:
   - Host `server.js` on a stateful Node host (Render, Railway, Heroku) OR
   - Convert server endpoints to Vercel serverless functions and persist credentials to Supabase (requires a Supabase service role key).

Troubleshooting:
- If `admin/zela.html` still returns 404:
  - Confirm `admin/zela.html` exists in the deployed files (Vercel → Deployments → Files)
  - Ensure `vercel.json` is present at repo root and commit/push it before redeploy

