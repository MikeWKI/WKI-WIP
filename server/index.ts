import express, { Request, Response } from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || '';

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI is not defined in environment variables');
  process.exit(1);
}

mongoose
  .connect(MONGODB_URI)
  .then(() => console.log('✅ Connected to MongoDB Atlas'))
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });

// Order Schema
const orderSchema = new mongoose.Schema({
  customer: { type: String, required: true },
  unit: { type: String, required: true },
  ro: { type: String, required: true },
  bay: { type: String, default: '' },
  firstShift: { type: String, default: '' },
  secondShift: { type: String, default: '' },
  orderedParts: { type: String, default: '' },
  triageNotes: { type: String, default: '' },
  quoteStatus: { type: String, default: '' },
  repairCondition: { type: String, default: '' },
  contactInfo: { type: String, default: '' },
  accountStatus: { type: String, default: '' },
  customerStatus: { type: String, default: '' },
  call: { type: String, default: '' },
  dateAdded: { type: String, default: () => new Date().toISOString().split('T')[0] },
  firstShiftUpdatedAt: { type: Date, default: null },
  secondShiftUpdatedAt: { type: Date, default: null },
}, {
  timestamps: true
});

const Order = mongoose.model('Order', orderSchema);

// Archive Schema (for completed orders)
const archivedOrderSchema = new mongoose.Schema({
  customer: { type: String, required: true },
  unit: { type: String, required: true },
  ro: { type: String, required: true },
  bay: { type: String, default: '' },
  firstShift: { type: String, default: '' },
  secondShift: { type: String, default: '' },
  orderedParts: { type: String, default: '' },
  triageNotes: { type: String, default: '' },
  quoteStatus: { type: String, default: '' },
  repairCondition: { type: String, default: '' },
  contactInfo: { type: String, default: '' },
  accountStatus: { type: String, default: '' },
  customerStatus: { type: String, default: '' },
  call: { type: String, default: '' },
  dateAdded: { type: String, default: '' },
  archiveMonth: { type: String, required: true }, // e.g., "October 2025"
  dateCompleted: { type: String, default: () => new Date().toISOString().split('T')[0] },
}, {
  timestamps: true
});

const ArchivedOrder = mongoose.model('ArchivedOrder', archivedOrderSchema);

// Shift Notes Schema
const shiftNotesSchema = new mongoose.Schema({
  notes: { type: String, required: true },
  shift: { type: String, required: true }, // '1st' or '2nd'
  author: { type: String, default: 'Anonymous' },
  date: { type: String, required: true }, // ISO date string for the day
  createdAt: { type: Date, default: Date.now },
}, {
  timestamps: true
});

const ShiftNotes = mongoose.model('ShiftNotes', shiftNotesSchema);

// Archived Shift Notes Schema
const archivedShiftNotesSchema = new mongoose.Schema({
  notes: { type: String, required: true },
  shift: { type: String, required: true },
  author: { type: String, default: 'Anonymous' },
  date: { type: String, required: true },
  archiveDate: { type: String, required: true }, // Date when archived
  createdAt: { type: Date },
}, {
  timestamps: true
});

const ArchivedShiftNotes = mongoose.model('ArchivedShiftNotes', archivedShiftNotesSchema);

// History/Audit Trail Schema
const historySchema = new mongoose.Schema({
  actionType: { type: String, required: true }, // 'create', 'update', 'delete', 'archive'
  entityType: { type: String, required: true }, // 'order', 'shiftnote'
  entityId: { type: String, required: true }, // ID of the affected entity
  entityName: { type: String, default: '' }, // Customer name or RO number for quick reference
  userName: { type: String, required: true }, // Who made the change
  changes: { type: mongoose.Schema.Types.Mixed, default: {} }, // What changed
  timestamp: { type: Date, default: Date.now },
}, {
  timestamps: true
});

const History = mongoose.model('History', historySchema);

// API Routes

// Get all orders
app.get('/api/orders', async (req: Request, res: Response) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Get single order
app.get('/api/orders/:id', async (req: Request, res: Response) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    res.json(order);
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

// Create new order
app.post('/api/orders', async (req: Request, res: Response) => {
  try {
    const order = new Order(req.body);
    const savedOrder = await order.save();
    res.status(201).json(savedOrder);
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// Update order
app.put('/api/orders/:id', async (req: Request, res: Response) => {
  try {
    const updateData = { ...req.body };
    
    // Track individual field update timestamps
    if (updateData.firstShift !== undefined) {
      updateData.firstShiftUpdatedAt = new Date();
    }
    if (updateData.secondShift !== undefined) {
      updateData.secondShiftUpdatedAt = new Date();
    }
    
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    res.json(order);
  } catch (error) {
    console.error('Error updating order:', error);
    res.status(500).json({ error: 'Failed to update order' });
  }
});

// Delete order
app.delete('/api/orders/:id', async (req: Request, res: Response) => {
  try {
    const order = await Order.findByIdAndDelete(req.params.id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    res.json({ message: 'Order deleted successfully', order });
  } catch (error) {
    console.error('Error deleting order:', error);
    res.status(500).json({ error: 'Failed to delete order' });
  }
});

// Archive an order (mark as completed)
app.post('/api/orders/:id/archive', async (req: Request, res: Response) => {
  try {
    // Find the current order
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Determine archive month (current month by default, or from request)
    const now = new Date();
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                        'July', 'August', 'September', 'October', 'November', 'December'];
    const archiveMonth = req.body.archiveMonth || `${monthNames[now.getMonth()]} ${now.getFullYear()}`;

    // Create archived order
    const archivedOrder = new ArchivedOrder({
      customer: order.customer,
      unit: order.unit,
      ro: order.ro,
      bay: order.bay,
      firstShift: order.firstShift,
      secondShift: order.secondShift,
      orderedParts: order.orderedParts,
      triageNotes: order.triageNotes,
      quoteStatus: order.quoteStatus,
      repairCondition: order.repairCondition,
      contactInfo: order.contactInfo,
      accountStatus: order.accountStatus,
      customerStatus: order.customerStatus,
      call: order.call,
      dateAdded: order.dateAdded,
      archiveMonth: archiveMonth,
      dateCompleted: new Date().toISOString().split('T')[0]
    });

    await archivedOrder.save();

    // Delete from current orders
    await Order.findByIdAndDelete(req.params.id);

    res.json({ 
      message: 'Order archived successfully', 
      archivedOrder,
      archiveMonth 
    });
  } catch (error) {
    console.error('Error archiving order:', error);
    res.status(500).json({ error: 'Failed to archive order' });
  }
});

// Get all archived orders grouped by month
app.get('/api/archives', async (req: Request, res: Response) => {
  try {
    const archivedOrders = await ArchivedOrder.find().sort({ createdAt: -1 });
    
    // Group by month
    const groupedByMonth: { [key: string]: any[] } = {};
    archivedOrders.forEach(order => {
      const month = order.archiveMonth;
      if (!groupedByMonth[month]) {
        groupedByMonth[month] = [];
      }
      groupedByMonth[month].push(order);
    });

    res.json(groupedByMonth);
  } catch (error) {
    console.error('Error fetching archives:', error);
    res.status(500).json({ error: 'Failed to fetch archives' });
  }
});

// Get archived orders for specific month
app.get('/api/archives/:month', async (req: Request, res: Response) => {
  try {
    const monthParam = req.params.month.replace(/-/g, ' '); // Convert "October-2025" to "October 2025"
    const archivedOrders = await ArchivedOrder.find({ archiveMonth: monthParam }).sort({ dateCompleted: -1 });
    res.json(archivedOrders);
  } catch (error) {
    console.error('Error fetching archived orders:', error);
    res.status(500).json({ error: 'Failed to fetch archived orders' });
  }
});

// Health check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'OK', 
    message: 'WKI-WIP API is running',
    mongodb: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'
  });
});

// ===== Shift Notes Routes =====

// Get today's shift notes (notes created today, not archived)
app.get('/api/shift-notes/today', async (req: Request, res: Response) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const notes = await ShiftNotes.find({ date: today }).sort({ createdAt: 1 });
    res.json(notes);
  } catch (error) {
    console.error('Error fetching shift notes:', error);
    res.status(500).json({ error: 'Failed to fetch shift notes' });
  }
});

// Get yesterday's shift notes (for handoff visibility)
app.get('/api/shift-notes/yesterday', async (req: Request, res: Response) => {
  try {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    const notes = await ShiftNotes.find({ date: yesterdayStr }).sort({ createdAt: 1 });
    res.json(notes);
  } catch (error) {
    console.error('Error fetching yesterday shift notes:', error);
    res.status(500).json({ error: 'Failed to fetch yesterday shift notes' });
  }
});

// Create new shift note
app.post('/api/shift-notes', async (req: Request, res: Response) => {
  try {
    const { notes, shift, author } = req.body;
    const today = new Date().toISOString().split('T')[0];
    
    const newNote = new ShiftNotes({
      notes,
      shift,
      author: author || 'Anonymous',
      date: today
    });
    
    await newNote.save();
    res.status(201).json(newNote);
  } catch (error) {
    console.error('Error creating shift note:', error);
    res.status(500).json({ error: 'Failed to create shift note' });
  }
});

// Update shift note
app.put('/api/shift-notes/:id', async (req: Request, res: Response) => {
  try {
    const { notes, shift, author } = req.body;
    const updatedNote = await ShiftNotes.findByIdAndUpdate(
      req.params.id,
      { notes, shift, author },
      { new: true }
    );
    
    if (!updatedNote) {
      return res.status(404).json({ error: 'Shift note not found' });
    }
    
    res.json(updatedNote);
  } catch (error) {
    console.error('Error updating shift note:', error);
    res.status(500).json({ error: 'Failed to update shift note' });
  }
});

// Delete shift note
app.delete('/api/shift-notes/:id', async (req: Request, res: Response) => {
  try {
    const deletedNote = await ShiftNotes.findByIdAndDelete(req.params.id);
    
    if (!deletedNote) {
      return res.status(404).json({ error: 'Shift note not found' });
    }
    
    res.json({ message: 'Shift note deleted successfully' });
  } catch (error) {
    console.error('Error deleting shift note:', error);
    res.status(500).json({ error: 'Failed to delete shift note' });
  }
});

// Archive old shift notes (called automatically or manually)
// Only archives notes older than yesterday, and only after 8pm
app.post('/api/shift-notes/archive', async (req: Request, res: Response) => {
  try {
    const now = new Date();
    const currentHour = now.getHours();
    
    // Only archive after 8pm (20:00)
    if (currentHour < 20) {
      return res.json({ message: 'Archiving only occurs after 8pm', archived: 0 });
    }
    
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    // Find all notes older than yesterday (keep today and yesterday visible)
    const oldNotes = await ShiftNotes.find({ date: { $lt: yesterdayStr } });
    
    if (oldNotes.length === 0) {
      return res.json({ message: 'No notes to archive', archived: 0 });
    }
    
    // Move them to archived collection
    const archivedNotes = oldNotes.map(note => ({
      notes: note.notes,
      shift: note.shift,
      author: note.author,
      date: note.date,
      archiveDate: today,
      createdAt: note.createdAt
    }));
    
    await ArchivedShiftNotes.insertMany(archivedNotes);
    await ShiftNotes.deleteMany({ date: { $lt: yesterdayStr } });
    
    res.json({ message: 'Notes archived successfully', archived: oldNotes.length });
  } catch (error) {
    console.error('Error archiving shift notes:', error);
    res.status(500).json({ error: 'Failed to archive shift notes' });
  }
});

// Get archived shift notes (grouped by date)
app.get('/api/shift-notes/archived', async (req: Request, res: Response) => {
  try {
    const archivedNotes = await ArchivedShiftNotes.find().sort({ date: -1, createdAt: 1 });
    
    // Group by date
    const groupedByDate: { [key: string]: any[] } = {};
    archivedNotes.forEach(note => {
      if (!groupedByDate[note.date]) {
        groupedByDate[note.date] = [];
      }
      groupedByDate[note.date].push(note);
    });
    
    res.json(groupedByDate);
  } catch (error) {
    console.error('Error fetching archived shift notes:', error);
    res.status(500).json({ error: 'Failed to fetch archived shift notes' });
  }
});

// Get archived shift notes for specific date
app.get('/api/shift-notes/archived/:date', async (req: Request, res: Response) => {
  try {
    const notes = await ArchivedShiftNotes.find({ date: req.params.date }).sort({ createdAt: 1 });
    res.json(notes);
  } catch (error) {
    console.error('Error fetching archived shift notes for date:', error);
    res.status(500).json({ error: 'Failed to fetch archived shift notes' });
  }
});

// ============================================
// HISTORY/AUDIT TRAIL ENDPOINTS
// ============================================

// Get all history (with optional filters)
app.get('/api/history', async (req: Request, res: Response) => {
  try {
    const { userName, entityType, actionType, limit = '100' } = req.query;
    
    const filter: any = {};
    if (userName) filter.userName = userName;
    if (entityType) filter.entityType = entityType;
    if (actionType) filter.actionType = actionType;
    
    const history = await History.find(filter)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit as string));
    
    res.json(history);
  } catch (error) {
    console.error('Error fetching history:', error);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

// Get history for specific entity
app.get('/api/history/entity/:entityId', async (req: Request, res: Response) => {
  try {
    const history = await History.find({ entityId: req.params.entityId })
      .sort({ timestamp: -1 });
    res.json(history);
  } catch (error) {
    console.error('Error fetching entity history:', error);
    res.status(500).json({ error: 'Failed to fetch entity history' });
  }
});

// Create history entry
app.post('/api/history', async (req: Request, res: Response) => {
  try {
    const historyEntry = new History(req.body);
    const savedHistory = await historyEntry.save();
    res.status(201).json(savedHistory);
  } catch (error) {
    console.error('Error creating history entry:', error);
    res.status(500).json({ error: 'Failed to create history entry' });
  }
});

// Clear all history (admin function)
app.delete('/api/history/clear', async (req: Request, res: Response) => {
  try {
    const result = await History.deleteMany({});
    res.json({ message: 'History cleared successfully', deletedCount: result.deletedCount });
  } catch (error) {
    console.error('Error clearing history:', error);
    res.status(500).json({ error: 'Failed to clear history' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 API available at http://localhost:${PORT}/api`);
});

export default app;
