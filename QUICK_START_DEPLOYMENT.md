# Quick Start Deployment

This is a simplified guide to get your app deployed quickly.

## Backend (Oracle Cloud - 10 minutes)

1. **Sign up**: https://www.oracle.com/cloud/free/
2. **Create VM**: Compute → Instances → Create Instance
   - Ubuntu 22.04
   - VM.Standard.A1.Flex (ARM) or VM.Standard.E2.1.Micro (x86)
   - Assign public IP
   - Generate SSH key
3. **Connect**: `ssh -i ~/.ssh/oracle_key ubuntu@YOUR_IP`
4. **Install Docker**:
   ```bash
   curl -fsSL https://get.docker.com -o get-docker.sh
   sudo sh get-docker.sh
   sudo usermod -aG docker ubuntu
   exit  # Log out and back in
   ```
5. **Deploy**:
   ```bash
   git clone https://github.com/Warsame-Egal/nba-live-tracker.git
   cd nba-live-tracker/nba-tracker-api
   docker build -f Dockerfile.prod -t nba-backend .
   docker run -d -p 8000:8000 --name nba-backend --restart unless-stopped nba-backend
   sudo ufw allow 8000/tcp
   ```
6. **Test**: Visit `http://YOUR_IP:8000/docs`

## Frontend (Vercel - 5 minutes)

1. **Sign up**: https://vercel.com (use GitHub)
2. **Import project**: Add New Project → Import `nba-live-tracker`
3. **Configure**:
   - Framework: Vite
   - Root Directory: `nba-tracker`
   - Build Command: `npm run build`
   - Output Directory: `dist`
4. **Environment Variables** (Settings → Environment Variables):
   ```
   VITE_API_BASE_URL=http://YOUR_ORACLE_IP:8000
   VITE_WS_URL=YOUR_ORACLE_IP:8000
   ```
5. **Deploy**: Click Deploy

## Done!

Your app is live! Frontend URL will be something like: `https://nba-live-tracker.vercel.app`

## Update Backend URL

After Vercel deploys, update the environment variables with your actual Oracle Cloud IP.

## Troubleshooting

- **Backend not accessible**: Check firewall `sudo ufw status`
- **Frontend can't connect**: Verify environment variables in Vercel
- **NBA API blocked**: Oracle Cloud should work (residential IP)

