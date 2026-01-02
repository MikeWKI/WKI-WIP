# WKI RO Tracker - Repair Order Management System

A modern, responsive web application for tracking repair orders at WKI Service Department.

![WKI Service Management](https://www.kenworth.com/media/w4jnzm4t/kenworth_logo-header-new-012023.png)

## Features

- 🎬 **Professional Splash Screen** - Branded entry experience with Kenworth logo
- 📋 **Current WIP Tracking** - Manage active repair orders
- 📦 **Archive System** - View completed orders by month (October 2025 - January 2025)
- 🔍 **Global Search** - Search across all current and archived data
- 🌓 **Dark/Light Mode** - Automatic theme detection with manual toggle
- 💾 **Auto-Save** - All changes automatically saved to browser localStorage
- 📱 **Responsive Design** - Works on desktop and mobile devices
- 🔒 **Professional Footer** - Branded footer with proprietary notices
- 🎨 **Kenworth Branding** - Official Kenworth logo integration

## Tech Stack

- **React 18** - Modern UI framework
- **TypeScript** - Type-safe development
- **Vite** - Fast build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **Lucide React** - Beautiful icon library
- **localStorage** - Client-side data persistence

## Installation

### Prerequisites
- Node.js 18+ and npm

### Setup

1. Clone the repository:
```bash
git clone <your-repo-url>
cd wki-wip
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser to `http://localhost:5173`

## Build for Production

```bash
npm run build
```

The production-ready files will be in the `dist/` directory.

## Preview Production Build

```bash
npm run preview
```

## Deployment

### Deploying to Render

This app uses a full-stack architecture with MongoDB Atlas.

**Quick Start:**
1. Push code to GitHub
2. Create two Render services (backend + frontend)
3. Set environment variables
4. Deploy!

**Detailed Guide**: See [RENDER_DEPLOYMENT.md](RENDER_DEPLOYMENT.md) for complete step-by-step instructions.

**Architecture:**
- **Backend**: Node.js/Express API with MongoDB Atlas
- **Frontend**: Static React site
- **Database**: MongoDB Atlas (cloud)

Your deployed URLs will be:
- Frontend: `https://wki-wip.onrender.com`
- Backend API: `https://wki-wip-api.onrender.com/api`

## Usage

### First Launch
- The app displays a professional splash screen with the Kenworth logo
- Splash screen appears once per browser session
- Automatically transitions to the main application after 2.8 seconds

### Adding a Repair Order
1. Click the "New RO" button in the Current WIP view
2. Fill in the required fields (Customer, Unit, R.O.#)
3. Add optional information (shift notes, parts, status, etc.)
4. Click "Add Repair Order"

### Editing a Repair Order
1. Click on any order card to open the detail view
2. Modify any fields (only available for Current WIP orders)
3. Click "Save & Close" - changes are automatically saved

### Searching
- Use the search bar to find orders by customer name, RO#, or unit number
- Check "Search all data" to search across current and archived orders
- Global search results show which dataset each order belongs to

### Viewing Archives
- Click any month in the sidebar to view completed/archived orders
- Archived orders are read-only but fully searchable

### Dark Mode
- Toggle between light and dark modes using the sun/moon icon
- Your preference is automatically saved

## Branding & Assets

### Splash Screen
- Background: Custom splash image (`/public/Splash.png`)
- Logo: Kenworth official logo (loaded from kenworth.com)
- Duration: 2 seconds display + 0.8 second fade
- Session-based: Shows once per browser session

### Footer
- Kenworth logo integration
- Built for PACCAR Dealer Performance Excellence
- Service Management System badges
- Proprietary application notice
- Copyright information

### Browser Tab
- Title: **WKI-WIP**
- Favicon: Custom WKI icon (place `favicon.ico` in `/public` folder)

## Data Structure

Each repair order contains:
- Customer name
- Unit number
- R.O. (Repair Order) number
- Bay assignment
- First Shift notes
- Second Shift notes
- Ordered parts/ETA information
- Triage notes
- Quote status
- Repair condition
- Contact information
- Account status
- Customer status
- Call information
- Date added

## Data Persistence

- All current work-in-progress data is stored in browser localStorage
- Data persists across browser sessions
- Archived data is read-only and embedded in the application

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## License

Proprietary - WKI Service Department

## Contact

For questions or support, contact the WKI Service Department.
