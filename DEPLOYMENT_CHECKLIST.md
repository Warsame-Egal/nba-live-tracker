# Deployment Checklist

Use this checklist to ensure everything is set up correctly.

## Pre-Deployment

- [ ] Code is pushed to GitHub
- [ ] All tests pass locally
- [ ] Environment variables documented

## Backend (Oracle Cloud)

- [ ] Oracle Cloud account created
- [ ] VM instance created with public IP
- [ ] SSH key generated/downloaded
- [ ] Docker installed on VM
- [ ] Repository cloned on VM
- [ ] Backend container built and running
- [ ] Port 8000 open in firewall
- [ ] Backend accessible at `http://YOUR_IP:8000/docs`
- [ ] Backend API returns data (test a few endpoints)

## Frontend (Vercel)

- [ ] Vercel account created
- [ ] Project imported from GitHub
- [ ] Build settings configured:
  - [ ] Framework: Vite
  - [ ] Root Directory: `nba-tracker`
  - [ ] Build Command: `npm run build`
  - [ ] Output Directory: `dist`
- [ ] Environment variables set:
  - [ ] `VITE_API_BASE_URL=http://YOUR_ORACLE_IP:8000`
  - [ ] `VITE_WS_URL=YOUR_ORACLE_IP:8000`
- [ ] Deployment successful
- [ ] Frontend accessible at Vercel URL

## Testing

- [ ] Frontend loads correctly
- [ ] API calls work (check browser console)
- [ ] WebSocket connects (check Network tab)
- [ ] Live scores update (if games are live)
- [ ] All pages load (Scoreboard, Standings, Player Profile, etc.)
- [ ] Search functionality works
- [ ] Dark/light mode toggle works

## Post-Deployment

- [ ] Add Vercel URL to resume/GitHub
- [ ] Test on mobile device
- [ ] Monitor backend logs for errors
- [ ] Set up monitoring (optional)

## Optional Enhancements

- [ ] Custom domain configured
- [ ] HTTPS/WSS set up (requires domain)
- [ ] CORS updated to allow only your Vercel domain
- [ ] Backend auto-restart on reboot (systemd service)
- [ ] Automated backups (if using database later)

