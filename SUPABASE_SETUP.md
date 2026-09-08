Supabase Storage: making a bucket public and secure upload options

1) Create the bucket
- Open your Supabase project, go to "Storage" → "Create a new bucket".
- Name it `cada` (matches your `SUPABASE_BUCKET`).

2) Make the bucket public (UI)
- After creating the bucket click the bucket name → Settings → toggle "Public" on.
- When public is enabled you can serve files directly via a public URL.

3) Public object URL format
- Public object URLs use this pattern:
  https://<PROJECT>.supabase.co/storage/v1/object/public/<BUCKET>/<PATH>
- For your project, an example URL will look like:
  https://fzwhfooxwmosoucbynad.supabase.co/storage/v1/object/public/cada/clients/12345.png
- The `supabase-js` helper `getPublicUrl()` returns this same URL.

4) Recommended: Server-signed uploads (more secure)
- The anonymous key allows clients to upload directly; for production it's safer to create short-lived signed uploads or route uploads through a server using the service role key.
- Example Express endpoint (Node.js) using `@supabase/supabase-js` and a service role key in env vars:

```js
// server/upload-signed.js (example)
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const app = express();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

app.post('/signed-upload', express.json(), async (req, res) => {
  const { path, contentType } = req.body;
  // create a signed URL valid for short time
  const { signedURL, error } = await supabase.storage.from('cada').createSignedUploadUrl(path, 60);
  if (error) return res.status(500).json({ error });
  res.json({ signedURL });
});

app.listen(3000);
```

- Then the client PUTs the file to the `signedURL` directly (no anon key exposure).

5) If you choose to keep direct client uploads
- Ensure the bucket is public only for the objects you intend to share.
- Monitor uploads and consider applying size/type checks in the client or server.

6) Troubleshooting
- If `getPublicUrl()` returns a URL but you receive 401/403 in the browser, ensure the bucket is marked public in the Supabase UI.
- If uploads fail with a CORS or network error, check your browser console and network logs; Supabase storage is CORS-enabled by default for public buckets.

7) Quick verification (manual)
- Use the `supabase-upload-test.html` file in the repo to upload a small image and verify the returned public URL opens in a browser.

