# Deploying n8n on Railway (Easy) 🚂

Railway is often easier than Render for n8n because it has a pre-built template.

## Step 1: Deploy n8n Template
1.  Go to [Railway.app](https://railway.app/).
2.  Click **"New Project"**.
3.  Search for **"n8n"** in the template list.
4.  Click **"Deploy"** (The official template usually includes PostgreSQL automatically).
5.  Wait for the implementation to finish (it might take 2-3 minutes).

## Step 2: Configure Environment (Optional)
Railway usually sets defaults, but check your **Variables** tab:
*   `N8N_PORT`: `5678` (Default)
*   `WEBHOOK_URL`: `https://your-app-name.up.railway.app/` (Update this *after* it deploys if not auto-set).
*   `N8N_BASIC_AUTH_ACTIVE`: `true` (Recommended)
*   `N8N_BASIC_AUTH_USER`: `admin`
*   `N8N_BASIC_AUTH_PASSWORD`: `password` (Change this!)

## Step 3: Open n8n
1.  Click the **Generated URL** (e.g., `https://n8n-production-xyz.up.railway.app`).
2.  Login with your basic auth credentials.

## Step 4: Import Smart Reply Workflow
1.  In n8n, click **Workflow** (top left) -> **Import from File**.
2.  Upload `n8n_smart_reply_gemini.json`.
3.  **Activate** the workflow (Toggle to "Active" / Green).

## Step 5: Connect to Backend
1.  Double-click the **Webhook** node in n8n.
2.  Click **Webhook URLs** -> **Production URL**.
3.  **Copy** the URL (e.g., `https://.../webhook/smart-replies`).
4.  Go to **Render Dashboard** -> **LinkUp Backend**.
5.  **Environment** -> Edit `N8N_SMART_REPLY_WEBHOOK_URL`.
6.  Paste the new Railway URL.
7.  **Save Changes** (Render will redeploy).

## Step 6: Verify
Send a message in the chat. The backend will now talk to Railway -> Gemini -> Railway -> Backend. 🚀
