# Deployment Guide

This guide covers deploying the NBA Live Tracker to production.

## Architecture

- **Frontend**: Deploy to Vercel (free, fast CDN)
- **Backend**: Deploy to Oracle Cloud Free Tier VPS (free, works with NBA.com)

## Prerequisites

- GitHub account
- Oracle Cloud account (free tier)
- Vercel account (free)
- Domain name (optional, ~$10-15/year)

---

## Part 1: Backend Deployment (Oracle Cloud)

### Step 1: Create Oracle Cloud Account

1. Go to https://www.oracle.com/cloud/free/
2. Sign up for free tier
3. Verify your email

### Step 2: Create VM Instance

1. Log into Oracle Cloud Console
2. Go to **Compute** → **Instances**
3. Click **Create Instance**
4. Settings:
   - **Name**: `nba-tracker-backend`
   - **Image**: Ubuntu 22.04
   - **Shape**: VM.Standard.A1.Flex (ARM) or VM.Standard.E2.1.Micro (x86) - both free
   - **Networking**: Assign public IP
   - **SSH Keys**: Generate new key pair or upload your existing key
5. Click **Create**

### Step 3: Connect to VM

```bash
# Download your private key from Oracle Cloud
# Save it as ~/.ssh/oracle_key

# Connect to your VM (replace with your public IP)
ssh -i ~/.ssh/oracle_key ubuntu@YOUR_PUBLIC_IP
```

### Step 4: Install Docker on VM

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add your user to docker group
sudo usermod -aG docker ubuntu

# Log out and back in for group changes to take effect
exit
```

### Step 5: Clone and Deploy Backend

```bash
# Clone your repository
git clone https://github.com/Warsame-Egal/nba-live-tracker.git
cd nba-live-tracker

# Build and run backend
cd nba-tracker-api
docker build -t nba-backend .
docker run -d -p 8000:8000 --name nba-backend --restart unless-stopped nba-backend

# Check if it's running
docker ps
curl http://localhost:8000/
```

### Step 6: Configure Firewall

```bash
# Allow port 8000
sudo ufw allow 8000/tcp
sudo ufw enable
```

### Step 7: Test Backend

Visit: `http://YOUR_PUBLIC_IP:8000/docs`

You should see the FastAPI interactive docs.

---

## Part 2: Frontend Deployment (Vercel)

### Step 1: Prepare Frontend for Production

The frontend needs to know your backend URL. We'll set this up in Vercel.

### Step 2: Deploy to Vercel

1. Go to https://vercel.com
2. Sign up/login with GitHub
3. Click **Add New Project**
4. Import your `nba-live-tracker` repository
5. Configure:
   - **Framework Preset**: Vite
   - **Root Directory**: `nba-tracker`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

### Step 3: Set Environment Variables in Vercel

In Vercel project settings → Environment Variables, add:

```
VITE_API_BASE_URL=http://YOUR_ORACLE_IP:8000
VITE_WS_URL=YOUR_ORACLE_IP:8000
```

**Note**: 
- `VITE_WS_URL` should be just the host (no protocol) - the code adds `ws://` or `wss://` automatically
- For production with HTTPS, use: `VITE_WS_URL=yourdomain.com:8000` (or just `yourdomain.com` if using standard ports)
- See "Optional: Add Domain" section below for HTTPS setup

### Step 4: Deploy

Click **Deploy**. Vercel will build and deploy your frontend.

---

## Part 3: Optional - Add Custom Domain

### For Backend (Oracle Cloud)

1. Buy a domain (Namecheap, Google Domains, etc.)
2. Add A record pointing to your Oracle Cloud public IP
3. Set up reverse proxy with Nginx for HTTPS (optional but recommended)

### For Frontend (Vercel)

1. In Vercel project settings → Domains
2. Add your domain
3. Follow Vercel's DNS instructions
4. Update `VITE_API_BASE_URL` and `VITE_WS_URL` to use your domain

---

## Part 4: Production Dockerfiles

Production Dockerfiles are included:
- `nba-tracker-api/Dockerfile.prod` - Production backend (no reload)
- `nba-tracker/Dockerfile.prod` - Production frontend (build static files)

---

## Troubleshooting

### Backend not accessible
- Check firewall: `sudo ufw status`
- Check Docker: `docker ps`
- Check logs: `docker logs nba-backend`

### Frontend can't connect to backend
- Verify `VITE_API_BASE_URL` and `VITE_WS_URL` are set correctly in Vercel
- Check CORS settings in backend
- Verify backend is running and accessible
- Check browser console for connection errors

### NBA API blocked
- Oracle Cloud Free Tier should work (residential IP)
- If blocked, try a different VPS provider with residential IP

---

## Maintenance

### Update Backend

```bash
# SSH into your VM
ssh -i ~/.ssh/oracle_key ubuntu@YOUR_PUBLIC_IP

# Pull latest changes
cd nba-live-tracker
git pull

# Rebuild and restart
cd nba-tracker-api
docker stop nba-backend
docker rm nba-backend
docker build -t nba-backend .
docker run -d -p 8000:8000 --name nba-backend --restart unless-stopped nba-backend
```

### Update Frontend

Just push to GitHub - Vercel auto-deploys on push to main branch.

---

## Cost Summary

- **Oracle Cloud**: Free forever (within free tier limits)
- **Vercel**: Free (hobby plan)
- **Domain**: ~$10-15/year (optional)
- **Total**: $0-15/year

---

## Security Notes

- Keep your Oracle Cloud VM updated: `sudo apt update && sudo apt upgrade`
- Use strong SSH keys
- Consider setting up fail2ban for SSH protection
- Use environment variables for any secrets (not needed for this project)

