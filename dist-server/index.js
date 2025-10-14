import express from 'express';
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
// API Routes
// Get all orders
app.get('/api/orders', async (req, res) => {
    try {
        const orders = await Order.find().sort({ createdAt: -1 });
        res.json(orders);
    }
    catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).json({ error: 'Failed to fetch orders' });
    }
});
// Get single order
app.get('/api/orders/:id', async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }
        res.json(order);
    }
    catch (error) {
        console.error('Error fetching order:', error);
        res.status(500).json({ error: 'Failed to fetch order' });
    }
});
// Create new order
app.post('/api/orders', async (req, res) => {
    try {
        const order = new Order(req.body);
        const savedOrder = await order.save();
        res.status(201).json(savedOrder);
    }
    catch (error) {
        console.error('Error creating order:', error);
        res.status(500).json({ error: 'Failed to create order' });
    }
});
// Update order
app.put('/api/orders/:id', async (req, res) => {
    try {
        const order = await Order.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }
        res.json(order);
    }
    catch (error) {
        console.error('Error updating order:', error);
        res.status(500).json({ error: 'Failed to update order' });
    }
});
// Delete order
app.delete('/api/orders/:id', async (req, res) => {
    try {
        const order = await Order.findByIdAndDelete(req.params.id);
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }
        res.json({ message: 'Order deleted successfully', order });
    }
    catch (error) {
        console.error('Error deleting order:', error);
        res.status(500).json({ error: 'Failed to delete order' });
    }
});
// Archive an order (mark as completed)
app.post('/api/orders/:id/archive', async (req, res) => {
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
    }
    catch (error) {
        console.error('Error archiving order:', error);
        res.status(500).json({ error: 'Failed to archive order' });
    }
});
// Get all archived orders grouped by month
app.get('/api/archives', async (req, res) => {
    try {
        const archivedOrders = await ArchivedOrder.find().sort({ createdAt: -1 });
        // Group by month
        const groupedByMonth = {};
        archivedOrders.forEach(order => {
            const month = order.archiveMonth;
            if (!groupedByMonth[month]) {
                groupedByMonth[month] = [];
            }
            groupedByMonth[month].push(order);
        });
        res.json(groupedByMonth);
    }
    catch (error) {
        console.error('Error fetching archives:', error);
        res.status(500).json({ error: 'Failed to fetch archives' });
    }
});
// Get archived orders for specific month
app.get('/api/archives/:month', async (req, res) => {
    try {
        const monthParam = req.params.month.replace(/-/g, ' '); // Convert "October-2025" to "October 2025"
        const archivedOrders = await ArchivedOrder.find({ archiveMonth: monthParam }).sort({ dateCompleted: -1 });
        res.json(archivedOrders);
    }
    catch (error) {
        console.error('Error fetching archived orders:', error);
        res.status(500).json({ error: 'Failed to fetch archived orders' });
    }
});
// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        message: 'WKI-WIP API is running',
        mongodb: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'
    });
});
// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📊 API available at http://localhost:${PORT}/api`);
});
export default app;
