# Quick Deployment Checklist

## ✅ Pre-Deployment

- [x] Backend server created with Express + MongoDB
- [x] Frontend updated to use API instead of localStorage
- [x] Environment variables configured
- [x] `.env` added to `.gitignore`
- [x] MongoDB Atlas connection tested
- [x] Local testing successful (frontend + backend)

## 📦 Files Ready for Deployment

### Backend:
- `server/index.ts` - Express API server
- `tsconfig.server.json` - TypeScript config for server
- `.env` - MongoDB connection (DON'T COMMIT THIS!)
- `.env.example` - Template for setup

### Frontend:
- `src/api.ts` - API service layer
- `src/RepairOrderTracker.tsx` - Updated to use API
- `.env.local` - Frontend API URL

### Deployment Config:
- `render.yaml` - Full-stack deployment configuration
- `RENDER_DEPLOYMENT.md` - Complete deployment guide

## 🚀 Deploy Steps

### 1. Push to GitHub
```bash
git init
git add .
git commit -m "Full-stack MongoDB deployment ready"
git remote add origin YOUR_GITHUB_URL
git push -u origin main
```

### 2. Deploy Backend to Render
- Create new Web Service
- Set environment variables:
  - `MONGODB_URI` = Your MongoDB connection string
  - `NODE_ENV` = production
  - `PORT` = 10000
- Build command: `npm install && npm run build:server`
- Start command: `node dist-server/server/index.js`

### 3. Deploy Frontend to Render
- Create new Static Site
- Set environment variable:
  - `VITE_API_URL` = Your backend URL + `/api`
- Build command: `npm install && npm run build`
- Publish directory: `dist`

### 4. Test!
- Visit your frontend URL
- Add a repair order
- Verify it saves to MongoDB
- Test from another device

## 🔐 Security Notes

**NEVER commit these files:**
- `.env` (already in .gitignore ✅)
- Any file with passwords or API keys

**MongoDB Connection String:**
```
mongodb+srv://WKI-WIP:D3cisiv2025!@wki-cluster-1.hvfw5be.mongodb.net/wki-wip?retryWrites=true&w=majority&appName=WKI-Cluster-1
```
(Set this in Render dashboard, not in code!)

## 📊 What to Expect

### Free Tier (Render):
- Backend sleeps after 15 min of inactivity
- First request after sleep: ~30-60 sec to wake up
- Subsequent requests: Fast!
- Auto-deploys on every git push

### MongoDB Atlas (Free Tier):
- 512 MB storage
- Shared cluster
- Perfect for this use case!

## ✅ Post-Deployment Checklist

- [ ] Backend shows "Live" in Render
- [ ] Frontend shows "Live" in Render
- [ ] Health check works: `/api/health`
- [ ] Can add repair orders
- [ ] Can edit repair orders
- [ ] Can delete repair orders
- [ ] Data persists across page refreshes
- [ ] Multiple devices see same data
- [ ] Loading states work properly
- [ ] Error handling works

## 🎯 URLs After Deployment

- **Frontend**: `https://wki-wip.onrender.com`
- **Backend API**: `https://wki-wip-api.onrender.com/api`
- **Health Check**: `https://wki-wip-api.onrender.com/api/health`

## 🆘 Troubleshooting

### Backend won't start:
- Check MongoDB connection string in Render env vars
- Verify MongoDB Atlas network access allows Render IPs

### Frontend can't connect:
- Verify `VITE_API_URL` points to backend
- Check CORS is enabled (it is!)
- Backend might be waking up (wait 60 sec)

### Data not saving:
- Check backend logs in Render
- Verify MongoDB connection is active
- Test health endpoint

## 📝 MongoDB Atlas Setup

If you need to reconfigure:

1. Go to MongoDB Atlas
2. Network Access → Add IP: `0.0.0.0/0` (allow all)
3. Database Access → Ensure user has read/write
4. Copy connection string
5. Replace `<password>` with actual password
6. Add to Render environment variables

## 🎉 Ready to Deploy!

Everything is configured and ready. Follow the steps in `RENDER_DEPLOYMENT.md` for detailed instructions!
