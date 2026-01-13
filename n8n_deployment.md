# Option 1: Deploy on Render (Free Cloud) ☁️

**Note:** Railway is no longer free for n8n. Render is the best free cloud option, but it can be slow (512MB RAM).

## Step 1: Create Database
1.  **Dashboard** -> **New +** -> **PostgreSQL**.
2.  **Name**: `linkup-n8n-db`
3.  **Plan**: **Free**
4.  **Copy** the "Internal Connection Details" (Host, User, Pass, DB).

## Step 2: Create Web Service
1.  **Dashboard** -> **New +** -> **Web Service**.
2.  **Source**: "Deploy an existing image from a registry".
3.  **Image URL**: `docker.io/n8nio/n8n:latest`
4.  **Plan**: **Free**
5.  **Environment Variables** (Critical!):

| Key | Value |
| :--- | :--- |
| `N8N_PORT` | `5678` |
| `PORT` | `5678` |
| `WEBHOOK_URL` | `https://your-n8n-name.onrender.com/` |
| `DB_TYPE` | `postgresdb` |
| `DB_POSTGRESDB_HOST` | *(from Step 1)* |
| `DB_POSTGRESDB_PORT` | `5432` |
| `DB_POSTGRESDB_DATABASE`| *(from Step 1)* |
| `DB_POSTGRESDB_USER` | *(from Step 1)* |
| `DB_POSTGRESDB_PASSWORD`| *(from Step 1)* |
| `N8N_ENCRYPTION_KEY` | `random-string-here` |

6.  **Deploy**. Wait 5-10m.

---

# Option 2: Cloudflare Tunnel (Recommended for Local) 🚇

Cloudflare Tunnel is free, secure, and gives you a stable URL (unlike localtunnel which crashes).

# Option 2: Cloudflare Tunnel (Recommended) 🚇

You are right! `npx n8n --tunnel` tries to do this automatically, but often fails (as seen in your logs). We will run them separately for stability.

## 1. Run n8n (Terminal 1)
Open PowerShell and run:
`npx n8n`
*(Keep this window OPEN. It runs the server on port 5678).*

## 2. Start Cloudflare Tunnel (Terminal 2)
1.  **Download**: [Cloudflare Windows .exe (amd64)](https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe)
2.  **Move**: Move the downloaded file to a folder (e.g., `Downloads` or `C:\n8n`).
3.  **Rename**: Rename it to `cloudflared.exe`.
4.  **Run**:
    Open a **NEW** PowerShell window.
    `cd` to that folder.
    Run this command (note the `.\`):
    ```powershell
    .\cloudflared.exe tunnel --url http://localhost:5678
    ```

## 3. Get Your URL

## 3. Get Your URL
Terminal will show limits and a URL like:
`https://random-name-here.trycloudflare.com`

**Copy this URL.** This is your public link to n8n!

## 4. Update Backend
1.  Go to **Render Dashboard** -> **Chat App Backend**.
2.  **Environment Variables**:
    *   Update `N8N_SMART_REPLY_WEBHOOK_URL` to:
        `https://your-cloudflare-url.trycloudflare.com/webhook/smart-replies`
    *   Update `N8N_META_AI_WEBHOOK_URL` to:
        `https://your-cloudflare-url.trycloudflare.com/webhook/meta-ai-chat`
3.  **Save**.

**Benefits:**
*   **Persistent**: URL stays typically as long as the window is open.
*   **Secure**: traffic is encrypted.
*   **Free**: $0.

**Note:** You must keep the `cloudflared` terminal window OPEN for the app to work.

