# Complete Deployment Guide

This is a comprehensive step-by-step guide to deploy the NBA Live Tracker application to production.

## Architecture Overview

- **Frontend**: Deployed to Vercel (free, fast CDN, automatic HTTPS)
- **Backend**: Deployed to Oracle Cloud Free Tier VPS (free tier available)
- **Proxy**: webshare.io (free tier available) - Required to bypass NBA.com IP restrictions
- **Tunnel**: Cloudflare Tunnel (free) - Provides HTTPS access to backend

## Prerequisites

- GitHub account
- Oracle Cloud account (free tier) - https://www.oracle.com/cloud/free/
- Vercel account (free) - https://vercel.com
- webshare.io account (free tier) - https://www.webshare.io/
- SSH client (built into Windows/Mac/Linux)
- Command line access

## Backend (Oracle Cloud - 10 minutes)

### Oracle Cloud Instance Configuration

When creating your VM instance, use these exact settings:

**Basic Information:**

- **Name**: `nba-tracker-backend` (or `instance-20251230-0013`)
- **Image**: Ubuntu 22.04 LTS
- **Shape**: VM.Standard.A1.Flex (ARM) or VM.Standard.E2.1.Micro (x86) - both free tier

**Networking:**

- **Assign a public IPv4 address**: Yes
- **Virtual Cloud Network (VCN)**: Use default or create new
- **Subnet**: Use default public subnet
- **Public IP**: Auto-assigned

**SSH Keys:**

- **Generate SSH key pair** (download private key) OR
- **Upload your existing SSH public key**

**Boot Volume:**

- **Boot volume size**: 50 GB (free tier limit)
- **Use default boot volume settings**

**Advanced Options (optional):**

- **Tags**: Add if needed for organization

### Oracle Cloud Resources Summary

Here's a quick overview of all resources created for this deployment:

| Resource Name                                 | Type                  | Status    | Description                          | Created                 |
| --------------------------------------------- | --------------------- | --------- | ------------------------------------ | ----------------------- |
| `nba-tracker-vcn`                             | VCN                   | Available | Virtual Cloud Network                | Dec 30, 2025, 05:08 UTC |
| `nba-tracker-public-subnet`                   | Subnet                | Available | Public subnet for the instance       | Dec 30, 2025, 05:13 UTC |
| `nba-tracker-public-route-table`              | Route Table           | Available | Route table for public subnet        | Dec 30, 2025, 05:59 UTC |
| `Default Route Table for nba-tracker-vcn`     | Route Table           | Available | Default VCN route table              | Dec 30, 2025, 05:08 UTC |
| `Default Security List for nba-tracker-vcn`   | Security List         | Available | Firewall rules for the VCN           | Dec 30, 2025, 05:08 UTC |
| `nba-tracker-igw`                             | Internet Gateway      | Available | Internet Gateway for public access   | Dec 30, 2025, 05:54 UTC |
| `instance-20251230-0013`                      | Instance              | Running   | Compute instance running the backend | Dec 30, 2025, 05:16 UTC |
| `instance-config-20251230-1543`               | InstanceConfiguration | None      | Instance configuration template      | Dec 30, 2025, 20:43 UTC |
| `publicip20251230051627`                      | Public IP             | Assigned  | Public IP for the instance           | Dec 30, 2025, 05:16 UTC |
| `instance-20251230-0013`                      | Private IP            | Available | Private IP for the instance          | Dec 30, 2025, 05:16 UTC |
| `instance-20251230-0013`                      | VNIC                  | Available | Virtual Network Interface Card       | Dec 30, 2025, 05:16 UTC |
| `instance-20251230-0013 (Boot Volume)`        | Boot Volume           | Available | Boot volume for the instance         | Dec 30, 2025, 05:16 UTC |
| `Default DHCP Options for nba-tracker-vcn`    | DHCP Options          | Available | DHCP configuration for the VCN       | Dec 30, 2025, 05:08 UTC |
| `nbatrackerpubli.nbatrackervcn.oraclevcn.com` | DNS Zone              | Active    | DNS zone for the VCN                 | Dec 30, 2025, 05:13 UTC |
| `nba-tracker-vcn`                             | Private Resolver      | Active    | DNS resolver for the VCN             | Dec 30, 2025, 05:08 UTC |
| `nba-tracker-vcn`                             | Private View          | Active    | DNS view for the VCN                 | Dec 30, 2025, 05:08 UTC |

**Region**: Canada Southeast (Toronto)  
**Compartment**: `warsameegal0 (root)`

**Note**: Some resources like IAM policies, tag namespaces, and default Oracle Cloud services are not listed here as they are system-managed.

### Example: Actual Oracle Cloud Instance Configuration

Here's an example of a real Oracle Cloud instance configuration from the console:

**Instance Details:**

- **Name**: `instance-20251230-0013`
- **State**: Running
- **Hostname**: `instance-20251230-0013`
- **Internal FQDN**: `instance-20251230-0013.nbatrackerpubli.nbatrackervcn.oraclevcn.com`

**Networking Configuration:**

- **Public IPv4 address**: `40.233.116.242`
- **Private IPv4 address**: `10.0.0.107`
- **Subnet**: `nba-tracker-public-subnet`
- **Route table**: `nba-tracker-public-route-table`
- **VCN**: `nbatrackervcn` (inferred from FQDN)

**VCN CIDR Blocks:**

- **CIDR Block**: `10.0.0.0/16`
- **Type**: IPv4 CIDR
- **IP Address Range**: `10.0.0.0 - 10.0.255.255`
- **Number of IP addresses**: 65,536

**DHCP Options:**

- **Name**: `Default DHCP Options for nba-tracker-vcn`
- **State**: Available
- **DNS Type**: Internet and VCN Resolver
- **DNS Servers**: `nbatrackervcn.oraclevcn.com`
- **Compartment**: `warsameegal0 (root)`
- **Created**: Dec 30, 2025, 05:08 UTC

**Subnet Details:**

- **Subnet Name**: `nba-tracker-public-subnet`
- **OCID**: `ocid1.subnet.oc1.ca-toronto-1.aaaaaaaaqmcyzxncl3whqkvkqx3mhajzzivqxmnycyvjvy4qrlzk5qvfqd6a`
- **IPv4 CIDR Block**: `10.0.0.0/24`
- **Subnet Type**: Regional
- **Availability Domain**: All availability domains in region
- **Compartment**: `warsameegal0 (root)`
- **DNS Domain Name**: `nbatrackerpubli.nbatrackervcn.oraclevcn.com`
- **Subnet Access**: Public Subnet
- **Virtual Router MAC Address**: `00:00:17:44:16:8F`
- **DHCP Options**: Default DHCP Options for nba-tracker-vcn
- **Route Table**: `nba-tracker-public-route-table`

**VNIC Details:**

- **Primary VNIC**: `instance-20251230-0013 Primary VNIC`
- **State**: Attached
- **Subnet**: `nba-tracker-public-subnet`
- **Route table**: `nba-tracker-public-route-table`

**Route Rules (VCN Routing):**

- **Route Table**: `nba-tracker-public-route-table`
- **Destination**: `0.0.0.0/0` (all traffic)
- **Target Type**: Internet Gateway
- **Target**: `nba-tracker-igw`
- **Route Type**: Static
- **Description**: Route all traffic to internet

**Internet Gateway:**

- **Name**: `nba-tracker-igw`
- **State**: Available
- **Route Table**: `Default Route Table for nba-tracker-vcn`
- **Created**: Dec 30, 2025, 05:54 UTC

**Note**: The Internet Gateway enables internet access for resources in the VCN. No Dynamic Routing Gateways (DRG), NAT Gateways, Service Gateways, or Local Peering Gateways are configured (not needed for this setup).

**Security Lists:**

- **Name**: `Default Security List for nba-tracker-vcn`
- **State**: Available
- **Compartment**: `warsameegal0 (root)`
- **Created**: Dec 30, 2025, 05:08 UTC

**Network Security Groups:**

- **Status**: No Network Security Groups configured
- **Note**: Network Security Groups are not needed for this setup. The default Security List provides sufficient firewall rules.

**Ingress Rules (Inbound Traffic):**

| Source        | Protocol | Destination Port | Description                                   |
| ------------- | -------- | ---------------- | --------------------------------------------- |
| `0.0.0.0/0`   | TCP      | 22               | SSH Remote Login Protocol                     |
| `0.0.0.0/0`   | TCP      | 22               | Allow SSH                                     |
| `0.0.0.0/0`   | TCP      | 8000             | Allow API                                     |
| `0.0.0.0/0`   | TCP      | 80               | Allow HTTP                                    |
| `0.0.0.0/0`   | TCP      | 443              | Allow HTTPS                                   |
| `0.0.0.0/0`   | ICMP     | Type 3, Code 4   | Destination Unreachable: Fragmentation Needed |
| `10.0.0.0/16` | ICMP     | Type 3           | Destination Unreachable (VCN internal)        |

**Egress Rules (Outbound Traffic):**

| Destination | Protocol      | Port Range | Description               |
| ----------- | ------------- | ---------- | ------------------------- |
| `0.0.0.0/0` | All Protocols | All        | All traffic for all ports |

**Note**: These rules allow:

- **SSH access** (port 22) from anywhere
- **API access** (port 8000) from anywhere
- **HTTP/HTTPS** (ports 80, 443) from anywhere
- **All outbound traffic** to anywhere

**SSH Connection:**

```bash
ssh -i ~/.ssh/oracle_key ubuntu@40.233.116.242
```

**Note**: Your actual IP addresses and network names will be different. Copy your values from the Oracle Cloud Console → Compute → Instances → [Your Instance] → Instance Details.

### Steps:

1. **Sign up**: https://www.oracle.com/cloud/free/
2. **Create VM**: Compute → Instances → Create Instance
   - Use the configuration above
   - **Important**: When creating the instance, choose "Generate SSH key pair" or "Upload your SSH public key"
   - If you generate a key pair, download both the public and private keys

### Step 1: Set Up SSH Keys

**On your local Windows machine:**

1. **Download SSH keys from Oracle Cloud:**

   - Go to Oracle Cloud Console → Compute → Instances → Your Instance
   - If you generated a key pair, download both files:
     - Public key: `oracle_nba_key.pub`
     - Private key: `oracle_nba_key.key`

2. **Save keys to SSH directory:**

   - Create or navigate to: `C:\Users\YOUR_USERNAME\.ssh\`
   - Copy both key files to this directory
   - Rename if needed for clarity (e.g., `oracle_key.pub` and `oracle_key.key`)

3. **Set proper permissions (if needed):**
   - Right-click the private key file → Properties → Security
   - Ensure only your user account has read access

### Step 2: Connect to Oracle Cloud Instance

**Open Command Prompt or PowerShell on Windows:**

1. **Navigate to SSH directory:**

   ```cmd
   cd C:\Users\YOUR_USERNAME\.ssh
   ```

2. **Connect to your Oracle Cloud instance:**

   ```cmd
   ssh -i oracle_nba_key.key ubuntu@YOUR_PUBLIC_IP
   ```

   **Or if using the instance name:**

   ```cmd
   ssh -i oracle_nba_key.key ubuntu@instance-20251230-0013
   ```

   **Replace:**

   - `oracle_nba_key.key` with your actual private key filename
   - `YOUR_PUBLIC_IP` with your Oracle Cloud public IP (e.g., `40.233.116.242`)
   - Or use your instance name if configured

3. **First connection:**
   - You'll be prompted: "Are you sure you want to continue connecting (yes/no)?"
   - Type `yes` and press Enter
   - You should now be connected to your Oracle Cloud Ubuntu instance

### Step 3: Initial System Setup

**Once connected to your Oracle Cloud VM, run these commands:**

1. **Update system packages:**

   ```bash
   sudo apt update
   sudo apt upgrade -y
   ```

2. **Install essential tools:**
   ```bash
   sudo apt install -y curl wget git build-essential
   ```

### Step 4: Install Docker

**Install Docker on Ubuntu:**

1. **Install Docker using the official script:**

   ```bash
   curl -fsSL https://get.docker.com -o get-docker.sh
   sudo sh get-docker.sh
   ```

2. **Add your user to the docker group (to run Docker without sudo):**

   ```bash
   sudo usermod -aG docker ubuntu
   ```

3. **Verify Docker installation:**

   ```bash
   docker --version
   sudo docker ps
   ```

4. **Note**: You may need to log out and back in for the docker group changes to take effect. For now, use `sudo docker` commands.

### Step 5: Install Cloudflared (for Cloudflare Tunnel)

**Install cloudflared for HTTPS tunnel:**

1. **Download cloudflared:**

   ```bash
   wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64
   ```

2. **Make it executable and move to system path:**

   ```bash
   chmod +x cloudflared-linux-amd64
   sudo mv cloudflared-linux-amd64 /usr/local/bin/cloudflared
   ```

3. **Verify installation:**
   ```bash
   cloudflared --version
   ```

### Step 6: Clone and Set Up Repository

**Get your code onto the Oracle Cloud VM:**

1. **Clone your repository:**

   ```bash
   cd ~
   git clone https://github.com/Warsame-Egal/nba-live-tracker.git
   cd nba-live-tracker
   ```

2. **Checkout your deployment branch:**

   ```bash
   git checkout feature/deployment-setup
   ```

3. **Verify you're on the correct branch:**
   ```bash
   git branch
   git status
   ```

### Step 7: Deploy Backend

**Build and run the Docker container:**

1. **Navigate to backend directory:**

   ```bash
   cd nba-tracker-api
   ```

2. **Build the Docker image:**

   ```bash
   sudo docker build -f Dockerfile.prod -t nba-backend .
   ```

   **This will:**

   - Install Python dependencies
   - Copy application code
   - Set up the entrypoint script
   - Take a few minutes to complete

3. **Run the container with proxy configuration:**

   ```bash
   sudo docker run -d -p 8000:8000 --name nba-backend --restart unless-stopped \
     -e NBA_API_PROXY="http://efoygpvt-rotate:2oatwqcdic2b@p.webshare.io:80" \
     nba-backend
   ```

   **Replace with your actual webshare.io credentials:**

   - `efoygpvt-rotate` → your webshare.io username
   - `2oatwqcdic2b` → your webshare.io password

4. **Configure firewall:**
   ```bash
   sudo ufw allow 8000/tcp
   sudo ufw enable
   sudo ufw status
   ```

### Step 8: Verify Backend is Running

**Check if everything is working:**

1. **Check container status:**

   ```bash
   sudo docker ps
   ```

2. **Check container logs:**

   ```bash
   sudo docker logs nba-backend
   ```

3. **Check for proxy patching confirmation:**

   ```bash
   sudo docker logs nba-backend | grep -i "patch\|proxy"
   ```

   **You should see:**

   - "Patching nba_api library with proxy configuration..."
   - "Successfully patched nba_api http.py file!"

4. **Test the API:**
   ```bash
   curl http://localhost:8000/
   curl http://localhost:8000/api/v1/standings/season/2024-25
   ```

### Step 9: Set Up Cloudflare Tunnel

**Expose your backend via HTTPS:**

1. **Navigate to backend directory:**

   ```bash
   cd ~/nba-live-tracker/nba-tracker-api
   ```

2. **Start Cloudflare tunnel in background:**

   ```bash
   nohup cloudflared tunnel --url http://localhost:8000 > /tmp/cloudflared.log 2>&1 &
   ```

3. **Wait a few seconds and get your tunnel URL:**

   ```bash
   sleep 5
   tail -20 /tmp/cloudflared.log | grep "https://"
   ```

4. **Copy the URL** (e.g., `https://track-various-governmental-surveillance.trycloudflare.com`)

5. **Test the tunnel:**

   ```bash
   curl https://YOUR-TUNNEL-URL/
   ```

6. **Keep tunnel running:**
   - The tunnel will run in the background
   - If it stops, restart with the same `nohup` command
   - Check if running: `ps aux | grep cloudflared`

### Step 10: Connect to Instance Again (If Needed)

**If you disconnected and need to reconnect:**

1. **From your local Windows machine, open Command Prompt:**

   ```cmd
   cd C:\Users\YOUR_USERNAME\.ssh
   ssh -i oracle_nba_key.key ubuntu@YOUR_PUBLIC_IP
   ```

2. **Or use the instance name:**

   ```cmd
   ssh -i oracle_nba_key.key ubuntu@instance-20251230-0013
   ```

3. **Navigate back to your project:**
   ```bash
   cd ~/nba-live-tracker
   ```

### Step 11: Update Code (If Needed)

**To pull latest changes:**

1. **Navigate to repository:**

   ```bash
   cd ~/nba-live-tracker
   ```

2. **Pull latest code:**

   ```bash
   git pull origin feature/deployment-setup
   ```

3. **Rebuild and restart container:**

   ```bash
   cd nba-tracker-api
   sudo docker stop nba-backend
   sudo docker rm nba-backend
   sudo docker build -f Dockerfile.prod -t nba-backend .
   sudo docker run -d -p 8000:8000 --name nba-backend --restart unless-stopped \
     -e NBA_API_PROXY="http://efoygpvt-rotate:2oatwqcdic2b@p.webshare.io:80" \
     nba-backend
   ```

**Note**: If you see build errors about "cd: nba-tracker: No such file or directory", you need to set the Root Directory in Vercel Settings:

1. Go to Vercel Project → Settings → General
2. Find "Root Directory" section
3. Set it to: `nba-tracker`
4. Save and redeploy

   **Check Container Logs:**

   ```bash
   # View container logs
   sudo docker logs nba-backend

   # Check for proxy patching confirmation
   sudo docker logs nba-backend | grep -i "patch\|proxy"
   ```

   **Health Check:**

   - Local: `curl http://localhost:8000/`
   - Through tunnel: `curl https://YOUR-TUNNEL-URL/`
   - API docs: `https://YOUR-TUNNEL-URL/docs`

   **Test API Endpoints:**

   ```bash
   # Test standings endpoint (verifies proxy is working)
   curl http://localhost:8000/api/v1/standings/season/2024-25

   # Schedule for a date
   curl http://localhost:8000/api/v1/schedule/date/2024-12-30

   # Team details
   curl http://localhost:8000/api/v1/teams/1610612737

   # Player details
   curl http://localhost:8000/api/v1/player/2544

   # Search
   curl "http://localhost:8000/api/v1/search?q=lebron"

   # Game boxscore
   curl http://localhost:8000/api/v1/scoreboard/game/{game_id}/boxscore
   ```

   **Important**: There is **NO** `/api/v1/scoreboard` REST endpoint. Scoreboard data is only available through WebSocket:

   - WebSocket endpoint: `ws://localhost:8000/api/v1/ws` (or `wss://` through Cloudflare tunnel)
   - You cannot test WebSocket with `curl` - use your frontend or a WebSocket client
   - The frontend automatically connects to this WebSocket for live scoreboard updates

   **Expected Results:**

   - `curl http://localhost:8000/api/v1/standings/season/2024-25` should return JSON data (not timeout errors)
   - If you see timeout errors, the proxy may not be working - check logs for patch confirmation
   - If you see proxy connection errors, verify your webshare.io credentials are correct

5. **Verify Cloudflare Tunnel is Running**:

   ```bash
   # Check if tunnel is running
   ps aux | grep cloudflared

   # If not running, restart it
   pkill cloudflared
   cd ~/nba-live-tracker/nba-tracker-api
   nohup cloudflared tunnel --url http://localhost:8000 > /tmp/cloudflared.log 2>&1 &

   # Get the new URL
   sleep 5
   tail -20 /tmp/cloudflared.log | grep "https://"
   ```

## Frontend (Vercel - 5 minutes)

### Step 1: Create Vercel Account

1. **Sign up**: Go to https://vercel.com
2. **Use GitHub**: Click "Sign up with GitHub" to link your GitHub account
3. **Authorize**: Grant Vercel access to your GitHub repositories

### Step 2: Import Project

1. **Add New Project**: Click "Add New Project" in Vercel dashboard
2. **Import Repository**: Select `nba-live-tracker` from your GitHub repositories
3. **Select Branch**: Choose `feature/deployment-setup` (or your deployment branch)

### Step 3: Configure Project Settings

In the project configuration screen (or in Project Settings → General after import):

- **Framework Preset**: `Vite` (auto-detected)
- **Root Directory**: `nba-tracker` (CRITICAL - this is where your frontend code is)
  - This must be set in Vercel project settings
  - Go to: Project Settings → General → Root Directory
  - Set to: `nba-tracker`
- **Build Command**: `npm run build` (or leave blank, Vercel will auto-detect)
- **Output Directory**: `dist` (Vite's default output)
- **Install Command**: `npm install` (or leave blank, Vercel will auto-detect)

**Important**: The `vercel.json` file in the repository is configured to work with the Root Directory setting. It does NOT include `cd nba-tracker` commands because Vercel will already be in that directory when Root Directory is set.

### Step 4: Add Environment Variables

**Before deploying**, add environment variables:

1. **Go to**: Project Settings → Environment Variables
2. **Add the following 2 variables**:

   **Variable 1:**

   - **Name**: `VITE_API_BASE_URL`
   - **Value**: Your Cloudflare tunnel URL (e.g., `https://track-various-governmental-surveillance.trycloudflare.com`)
   - **Environment**: Production, Preview, Development (select all)

   **Variable 2:**

   - **Name**: `VITE_WS_URL`
   - **Value**: Your Cloudflare tunnel URL with `wss://` protocol (e.g., `wss://track-various-governmental-surveillance.trycloudflare.com`)
   - **Environment**: Production, Preview, Development (select all)

   **Example values:**

   ```
   VITE_API_BASE_URL=https://track-various-governmental-surveillance.trycloudflare.com
   VITE_WS_URL=wss://track-various-governmental-surveillance.trycloudflare.com
   ```

   **Note**:

   - Use `https://` for `VITE_API_BASE_URL`
   - Use `wss://` for `VITE_WS_URL` (secure WebSocket)
   - If using direct Oracle Cloud IP (not recommended), use:
     - `VITE_API_BASE_URL=http://YOUR_ORACLE_IP:8000`
     - `VITE_WS_URL=YOUR_ORACLE_IP:8000` (no protocol, code adds ws:// or wss://)

### Step 5: Deploy

1. **Click "Deploy"** button
2. **Wait for build**: Vercel will build and deploy your frontend
3. **Get your URL**: After deployment, you'll get a URL like `https://nba-live-tracker.vercel.app`

### Step 6: Verify Deployment

1. **Visit your Vercel URL**: Check if the frontend loads (e.g., `https://nba-live-tracker.vercel.app`)
2. **Test API connection**:
   - Open browser console (F12)
   - Check for connection errors
   - Verify WebSocket connection is established (should see live scoreboard updates)
3. **Update if needed**:
   - If your Cloudflare tunnel URL changes, update environment variables in Vercel
   - Redeploy after updating environment variables

### Step 7: Verify Cloudflare Tunnel Connection

**Before deploying Vercel, ensure:**

1. **Cloudflare tunnel is running** on your Oracle Cloud VM:

   ```bash
   ps aux | grep cloudflared
   ```

2. **Tunnel URL is accessible**:

   ```bash
   curl https://YOUR-CLOUDFLARE-TUNNEL-URL/
   # Should return: {"message":"NBA Live Tracker API is running"}
   ```

3. **Vercel environment variables match your tunnel URL**:
   - Go to Vercel → Settings → Environment Variables
   - Verify `VITE_API_BASE_URL` and `VITE_WS_URL` point to your current Cloudflare tunnel URL
   - If tunnel URL changed, update variables and redeploy

**Summary Checklist:**

- Backend running with proxy on Oracle Cloud
- Cloudflare tunnel running and accessible
- Vercel environment variables set correctly
- Vercel deployment successful
- Frontend connects to backend via WebSocket

## Done!

Your app is live! Frontend URL will be something like: `https://nba-live-tracker.vercel.app`

## Update Backend URL

After Vercel deploys, update the environment variables with your actual Oracle Cloud IP.

## Proxy Setup (Required for NBA API)

NBA.com blocks cloud IPs from Oracle Cloud and other cloud providers. You need a proxy service to bypass these restrictions.

### Step 1: Sign Up for webshare.io

1. **Go to**: https://www.webshare.io/
2. **Sign up**: Create a free account (free tier available)
3. **Verify email**: Complete account verification

### Step 2: Get Your Proxy Credentials

After signing up, go to **Products** → **Proxy List** in your webshare.io dashboard.

**Proxy Configuration:**

- **Authentication Method**: `username_password`
- **Connection Method**: `rotating` (each request gets a random IP)
- **Proxy Protocol**: `0` (HTTP)
- **Domain Name**: `p.webshare.io`
- **Proxy Port**: `80`
- **Proxy Username**: `efoygpvt-rotate` (your username will be different)
- **Proxy Password**: `2oatwqcdic2b` (your password will be different)

**Note**: With rotating proxies, you only need one endpoint - it automatically rotates IPs for each request.

### Step 3: Format Proxy URL

**Format**: `http://username:password@domain:port`

**Example**:

```
http://efoygpvt-rotate:2oatwqcdic2b@p.webshare.io:80
```

### Step 4: Use Proxy in Docker

When running your Docker container, set the `NBA_API_PROXY` environment variable:

```bash
sudo docker run -d -p 8000:8000 --name nba-backend --restart unless-stopped \
  -e NBA_API_PROXY="http://efoygpvt-rotate:2oatwqcdic2b@p.webshare.io:80" \
  nba-backend
```

**Important**:

- Replace `efoygpvt-rotate` with your actual webshare.io username
- Replace `2oatwqcdic2b` with your actual webshare.io password
- The patch script automatically modifies the nba_api library to use your proxy at container startup
- This command is run on your Oracle Cloud VM after building the Docker image

**What happens when container starts:**

1. Container starts with `NBA_API_PROXY` environment variable
2. `docker-entrypoint.sh` runs automatically
3. Checks if `NBA_API_PROXY` is set
4. Runs `patch_nba_api.py` to modify the nba_api library
5. Patches `nba_api/library/http.py` with your proxy configuration
6. Starts the FastAPI server with uvicorn

**Verify proxy is working:**

```bash
# Check container logs for patch confirmation
sudo docker logs nba-backend | grep -i "patch\|proxy"

# Should see:
   # Patching nba_api library with proxy configuration...
   # Successfully patched nba_api http.py file!
```

### How It Works

1. **Patch Script**: The `docker-entrypoint.sh` runs `patch_nba_api.py` at container startup
2. **Library Modification**: The script modifies `nba_api/library/http.py` to add your proxy to `PROXY_LIST`
3. **Automatic Usage**: All NBA API requests automatically use your proxy
4. **Random Selection**: If you add multiple proxies, the script randomly selects one for each request

### Alternative: Multiple Proxies

If you have multiple proxy endpoints, you can add them comma-separated:

```bash
-e NBA_API_PROXY="http://proxy1:port,http://proxy2:port,http://proxy3:port"
```

The patch script will randomly select from the list for each request.

## Code Changes Summary

This section documents all code changes made to support deployment.

### Frontend Changes

**Environment Variable Configuration:**

All frontend components now use environment variables for API and WebSocket URLs:

**Files Updated:**
- `src/pages/Scoreboard.tsx`
- `src/pages/PlayerProfile.tsx`
- `src/pages/TeamPage.tsx`
- `src/pages/RosterPage.tsx`
- `src/components/GameDetailsDrawer.tsx`
- `src/components/GameRow.tsx`
- `src/components/Standings.tsx`
- `src/services/PlayByPlayWebSocketService.ts`

**Pattern Used:**
```typescript
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const WS_URL = `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${import.meta.env.VITE_WS_URL || 'localhost:8000'}/api/v1/ws`;
```

**Vercel Configuration (`vercel.json`):**
- Removed `cd nba-tracker` from build/install commands (handled by Root Directory setting)
- Simplified to work with Vercel's Root Directory configuration
- Kept SPA rewrite rules for React Router

**Frontend Dockerfile (`nba-tracker/Dockerfile.prod`):**
- Multi-stage build (Node.js builder + nginx server)
- Uses `nginx.conf` for SPA routing
- Optimized for production

**Nginx Configuration (`nba-tracker/nginx.conf`):**
- SPA routing (all routes serve index.html)
- Gzip compression
- Static asset caching
- Note: Only needed for Docker deployment, not Vercel

### Backend Changes

**CORS Configuration (`nba-tracker-api/app/main.py`):**
- Added `FRONTEND_URL` environment variable support
- CORS middleware uses `FRONTEND_URL` if set, otherwise allows all origins

**Proxy Configuration (`nba-tracker-api/app/config.py`):**
- Manages proxy configuration for nba_api library
- Supports single or multiple proxies (comma-separated)
- Randomly selects from multiple proxies for load balancing

**NBA API Patching (`nba-tracker-api/patch_nba_api.py`):**
- Automatically patches nba_api library's `http.py` file to use proxies
- Finds `nba_api/library/http.py` in installed packages
- Adds `PROXY_LIST` variable with your proxies
- Creates backup of original file

**Docker Entrypoint (`nba-tracker-api/docker-entrypoint.sh`):**
- Checks if `NBA_API_PROXY` is set
- Runs patch script if proxy is configured
- Starts uvicorn server

**Backend Dockerfile (`nba-tracker-api/Dockerfile.prod`):**
- Added `docker-entrypoint.sh` and `patch_nba_api.py`
- Uses entrypoint script instead of direct uvicorn command
- Patches nba_api library at container startup

### New Files Created

1. `nba-tracker-api/app/config.py` - Proxy configuration management
2. `nba-tracker-api/patch_nba_api.py` - NBA API patching script
3. `nba-tracker-api/docker-entrypoint.sh` - Docker entrypoint script
4. `nba-tracker/nginx.conf` - Nginx configuration for Docker
5. `deploy-backend.sh` - Deployment helper script (optional)
6. `vercel.json` - Vercel deployment configuration

### Environment Variables

**Frontend (Vercel):**
- `VITE_API_BASE_URL` - Backend API URL
- `VITE_WS_URL` - WebSocket URL (without protocol, code adds ws:// or wss://)

**Backend (Docker):**
- `NBA_API_PROXY` - Proxy URL(s) for NBA API (comma-separated)
- `FRONTEND_URL` - Vercel frontend URL for CORS (optional, defaults to "*")

## Troubleshooting

- **Backend not accessible**: Check firewall `sudo ufw status`
- **Frontend can't connect**: Verify environment variables in Vercel match your Cloudflare tunnel URL
- **NBA API blocked**: Use proxy service (webshare.io or similar)
- **Proxy errors in logs**: Normal for free proxies - app has fallback logic
- **Cloudflare tunnel stopped**: Restart with `nohup cloudflared tunnel --url http://localhost:8000 > /tmp/cloudflared.log 2>&1 &`
