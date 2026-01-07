# Deploying n8n on Render (Free) with PostgreSQL

**Update:** The latest version of n8n has removed support for MySQL. We must use **PostgreSQL** instead. Render provides a free PostgreSQL database that is perfect for this.

## Step 1: Create a Free PostgreSQL Database on Render
1.  Go to [Render Dashboard](https://dashboard.render.com/).
2.  Click **New +** -> **PostgreSQL**.
3.  **Name**: `linkup-n8n-db`
4.  **Region**: Same as your backend (e.g., Oregon).
5.  **Instance Type**: Free.
6.  Click **Create Database**.
7.  **Wait** for it to become "Available".
8.  **Copy** the following "Internal Connection Details" (or keep the tab open):
    *   `Hostname`
    *   `Port`
    *   `Database`
    *   `Username`
    *   `Password`

## Step 2: Create n8n Web Service
1.  Click **New +** -> **Web Service**.
2.  Select **"Deploy an existing image from a registry"**.
3.  Enter Image URL: `docker.io/n8nio/n8n:latest`
4.  Click **Next**.

## Step 3: Configure Service
*   **Name**: `linkup-n8n`
*   **Region**: Same as before.
*   **Instance Type**: Free.
*   **Environment Variables** (Add these):

| Key | Value | Description |
| :--- | :--- | :--- |
| `N8N_PORT` | `5678` | Default port |
| `WEBHOOK_URL` | `https://linkup-n8n.onrender.com/` | Update after deploy |
| `DB_TYPE` | `postgresdb` | **Changed from mysqldb** |
| `DB_POSTGRESDB_HOST` | *(Paste Hostname)* | From Step 1 |
| `DB_POSTGRESDB_PORT` | `5432` | From Step 1 |
| `DB_POSTGRESDB_DATABASE`| *(Paste Database)* | From Step 1 |
| `DB_POSTGRESDB_USER` | *(Paste Username)* | From Step 1 |
| `DB_POSTGRESDB_PASSWORD`| *(Paste Password)* | From Step 1 |
| `N8N_ENCRYPTION_KEY` | *(Random String)* | e.g. `s8d7f9s8d7f9` - **SAVE THIS!** |
| `N8N_BASIC_AUTH_ACTIVE`| `true` | Security |
| `N8N_BASIC_AUTH_USER` | `admin` | Your login |
| `N8N_BASIC_AUTH_PASSWORD`| `password123` | Your password |

## Step 4: Deploy & Finalize
1.  Click **Create Web Service**.
2.  Wait for deploy. It should start successfully now.
3.  Once live:
    *   Copy the URL.
    *   Go to **Environment** tab -> Update `WEBHOOK_URL`.
    *   Save & Restart.

## Step 5: Update Chat Backend
1.  Go to your **Chat App Backend** service on Render.
2.  Update `N8N_WEBHOOK_URL` to the new address:
    `https://linkup-n8n.onrender.com/webhook/imagine`
3.  **Redeploy** the backend.

## Step 6: Import Workflow
1.  Open n8n in your browser.
2.  Import your `ai_image_workflow.json` manually (or copy the code again).
3.  Activate it.
4.  Don't forget to **click "Production" / "Active"** toggle.

You are now fully running on the cloud! ☁️
