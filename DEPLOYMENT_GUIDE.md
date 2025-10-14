# WKI-WIP Deployment Guide

## 🚀 Quick Deployment Steps

### 1. Push to GitHub

```bash
# Initialize git (already done)
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit: WKI-WIP Repair Order Tracker"

# Create GitHub repository at https://github.com/new
# Then add remote and push:
git remote add origin https://github.com/YOUR_USERNAME/wki-wip.git
git branch -M main
git push -u origin main
```

### 2. Deploy Backend to Render

1. **Go to** https://render.com and sign in
2. **Click** "New +" → "Web Service"
3. **Connect** your GitHub repository
4. **Configure Backend Service:**
   - **Name:** `wki-wip-api`
   - **Environment:** `Node`
   - **Region:** `Oregon (US West)`
   - **Branch:** `main`
   - **Build Command:** `npm install && npm run build:server`
   - **Start Command:** `node dist-server/index.js`
   - **Plan:** `Free`

5. **Add Environment Variables:**
   - `NODE_ENV` = `production`
   - `MONGODB_URI` = `mongodb+srv://WKI-WIP:D3cisiv2025!@wki-cluster-1.hvfw5be.mongodb.net/wki-wip?retryWrites=true&w=majority&appName=WKI-Cluster-1`
   - `PORT` = `10000`

6. **Click** "Create Web Service"
7. **Wait** for deployment (5-10 minutes)
8. **Copy** the URL (will be like `https://wki-wip-api.onrender.com`)

### 3. Deploy Frontend to Render

1. **Click** "New +" → "Static Site"
2. **Connect** same GitHub repository
3. **Configure Frontend Service:**
   - **Name:** `wki-wip`
   - **Branch:** `main`
   - **Build Command:** `npm install && npm run build`
   - **Publish Directory:** `dist`
   - **Plan:** `Free`

4. **Add Environment Variable:**
   - `VITE_API_URL` = `https://wki-wip-api.onrender.com/api` (use the URL from step 2.8)

5. **Click** "Create Static Site"
6. **Wait** for deployment (3-5 minutes)

### 4. Verify Deployment

1. Open your frontend URL (like `https://wki-wip.onrender.com`)
2. Wait for splash screen
3. Try adding a test repair order
4. Verify data persists after refresh

## 🔧 Troubleshooting

### Backend Won't Start
- **Check:** Environment variables are set correctly in Render dashboard
- **Check:** MongoDB connection string is correct
- **Check:** Build logs for errors

### Frontend Can't Connect to Backend
- **Check:** `VITE_API_URL` environment variable points to correct backend URL
- **Check:** Backend is running (green "Active" status)
- **Check:** Backend health endpoint: `https://your-backend.onrender.com/api/health`
- **Rebuild frontend** after changing VITE_API_URL

### Data Not Persisting
- **Check:** MongoDB Atlas network access allows `0.0.0.0/0` (all IPs)
- **Check:** Database user credentials are correct
- **Check:** Browser console for errors

### Free Tier Limitations
- Backend spins down after 15 minutes of inactivity
- First request after spin-down takes 30-60 seconds
- 750 hours/month free tier limit

## 📝 MongoDB Atlas Setup (Already Done)

Your MongoDB is configured:
- **Cluster:** WKI-Cluster-1
- **Database:** wki-wip
- **User:** WKI-WIP
- **Password:** D3cisiv2025!
- **Network Access:** 0.0.0.0/0 (all IPs allowed)

## 🔐 Security Notes

1. **Change default password** in MongoDB Atlas after deployment
2. **Update .env** file with new password
3. **Never commit** .env file to GitHub (already in .gitignore)
4. **Rotate credentials** periodically

## 📦 Local Development

```bash
# Install dependencies
npm install

# Start development servers
npm run dev:all

# Access locally
# Frontend: http://localhost:5173
# Backend: http://localhost:3001
```

## 🔄 Updating Deployment

```bash
# Make changes to code
git add .
git commit -m "Your update message"
git push

# Render will automatically rebuild and redeploy
```

## 🎯 Post-Deployment Checklist

- [ ] Backend deployed and running
- [ ] Frontend deployed and accessible
- [ ] Can add new repair orders
- [ ] Data persists after refresh
- [ ] MongoDB connection working
- [ ] No console errors in browser
- [ ] Backend health check returns OK
- [ ] Update GitHub repository description
- [ ] Add production URL to README

## 🌐 Production URLs

After deployment, update these:
- **Frontend:** `https://wki-wip.onrender.com` (your actual URL)
- **Backend:** `https://wki-wip-api.onrender.com` (your actual URL)
- **MongoDB:** Already configured

---

**Need Help?** Check Render logs:
- Backend: Dashboard → wki-wip-api → Logs
- Frontend: Dashboard → wki-wip → Logs
