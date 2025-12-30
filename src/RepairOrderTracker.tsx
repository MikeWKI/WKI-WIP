import React, { useState, useEffect } from 'react';
import { Search, Plus, X, Archive, Home, Menu, FileText, Clock, ChevronDown, ChevronUp, Filter, Upload } from 'lucide-react';
import { archivedOrders } from './archivedData';
import Footer from './Footer';
import { apiService, ShiftNote, ArchivedShiftNote } from './api';
import { parseDecisivPDF } from './pdfParser';

// Type definitions
interface Order {
  _id?: string;
  id?: string | number;
  customer: string;
  unit: string;
  ro: string;
  bay: string;
  firstShift: string;
  secondShift: string;
  orderedParts: string;
  triageNotes: string;
  quoteStatus: string;
  repairCondition: string;
  contactInfo: string;
  accountStatus: string;
  customerStatus: string;
  call: string;
  dateAdded: string;
  createdAt?: string;
  updatedAt?: string;
  firstShiftUpdatedAt?: string;
  secondShiftUpdatedAt?: string;
}

const RepairOrderTracker = () => {
  const [activeView, setActiveView] = useState<string>('current');
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [globalSearch, setGlobalSearch] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [dynamicArchives, setDynamicArchives] = useState<{ [month: string]: Order[] }>({});
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [showShiftNotesModal, setShowShiftNotesModal] = useState<boolean>(false);
  const [shiftNotes, setShiftNotes] = useState<ShiftNote[]>([]);
  const [yesterdayShiftNotes, setYesterdayShiftNotes] = useState<ShiftNote[]>([]);
  const [archivedShiftNotes, setArchivedShiftNotes] = useState<{ [date: string]: ArchivedShiftNote[] }>({});
  const [shiftNotesView, setShiftNotesView] = useState<'today' | 'archive'>('today');
  const [newShiftNote, setNewShiftNote] = useState({ notes: '', shift: '1st', author: '' });
  const [defaultAuthor, setDefaultAuthor] = useState<string>('');
  const [showNamePrompt, setShowNamePrompt] = useState<boolean>(false);
  
  // Password protection
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [passwordError, setPasswordError] = useState<string>('');
  const CORRECT_PASSWORD = 'MERICA!';
  
  // Filter states
  const [sortBy, setSortBy] = useState<string>('none'); // 'none', 'firstShift', 'secondShift'
  const [timeFilter, setTimeFilter] = useState<number>(0); // 0 = all, or minutes
  const [showFilters, setShowFilters] = useState<boolean>(false); // Collapsible filters
  const [showArchives, setShowArchives] = useState<boolean>(false); // Collapsible archives dropdown

  // Helper function to format timestamps
  const formatTimestamp = (timestamp?: string): string => {
    if (!timestamp) return '';
    
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      // Less than 1 minute
      if (diffMins < 1) return 'Just now';
      // Less than 1 hour
      if (diffMins < 60) return `${diffMins} min${diffMins !== 1 ? 's' : ''} ago`;
      // Less than 24 hours
      if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
      // Less than 7 days
      if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
      
      // Otherwise show date
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      });
    } catch (e) {
      return '';
    }
  };

  // Detect system dark mode preference
  useEffect(() => {
    // Always check system preference first
    const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    // Check for saved dark mode preference, otherwise use system preference
    const savedDarkMode = localStorage.getItem('darkMode');
    if (savedDarkMode !== null) {
      setIsDarkMode(savedDarkMode === 'true');
    } else {
      setIsDarkMode(darkModeMediaQuery.matches);
    }

    // Listen for system theme changes
    const handleChange = (e: MediaQueryListEvent) => {
      // Only auto-update if user hasn't manually set a preference
      const userPreference = localStorage.getItem('darkMode');
      if (userPreference === null) {
        setIsDarkMode(e.matches);
      }
    };
    
    darkModeMediaQuery.addEventListener('change', handleChange);
    return () => darkModeMediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Save dark mode preference to localStorage
  useEffect(() => {
    localStorage.setItem('darkMode', isDarkMode.toString());
  }, [isDarkMode]);

  // Calculate statistics
  const getStatistics = () => {
    const now = new Date().getTime();
    const hours24Ms = 24 * 60 * 60 * 1000;
    
    const activeCount = orders.length;
    
    const firstShiftUpdates24h = orders.filter(order => {
      const time = order.firstShiftUpdatedAt ? new Date(order.firstShiftUpdatedAt).getTime() : 0;
      return time > 0 && (now - time) <= hours24Ms;
    }).length;
    
    const secondShiftUpdates24h = orders.filter(order => {
      const time = order.secondShiftUpdatedAt ? new Date(order.secondShiftUpdatedAt).getTime() : 0;
      return time > 0 && (now - time) <= hours24Ms;
    }).length;
    
    // Count completed orders from all archives
    let completedCount = 0;
    Object.values(dynamicArchives).forEach(archiveOrders => {
      completedCount += archiveOrders.length;
    });
    
    return {
      active: activeCount,
      firstShift24h: firstShiftUpdates24h,
      secondShift24h: secondShiftUpdates24h,
      completed: completedCount
    };
  };

  const stats = getStatistics();

  // Load orders from API
  useEffect(() => {
    // Check authentication status from sessionStorage
    const isAuth = sessionStorage.getItem('wki_authenticated') === 'true';
    setIsAuthenticated(isAuth);
    
    // Load default author from localStorage
    const savedAuthor = localStorage.getItem('wki_default_author');
    if (savedAuthor) {
      setDefaultAuthor(savedAuthor);
      setNewShiftNote(prev => ({ ...prev, author: savedAuthor }));
    }
    
    if (isAuth) {
      loadOrders();
      loadArchives();
      loadShiftNotes();
      loadYesterdayShiftNotes();
      loadArchivedShiftNotes();
      
      // Check if it's past 8pm and archive old notes automatically
      const now = new Date();
      if (now.getHours() >= 20) {
        apiService.archiveShiftNotes().catch(err => console.error('Auto-archive failed:', err));
      }
    }
  }, [isAuthenticated]);

  const loadOrders = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const fetchedOrders = await apiService.getAllOrders();
      setOrders(fetchedOrders);
    } catch (err) {
      console.error('Failed to load orders:', err);
      setError('Failed to load orders. Please check if the server is running.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadArchives = async () => {
    try {
      const archives = await apiService.getAllArchives();
      setDynamicArchives(archives);
    } catch (err) {
      console.error('Failed to load archives:', err);
    }
  };

  const loadShiftNotes = async () => {
    try {
      const notes = await apiService.getTodayShiftNotes();
      setShiftNotes(notes);
    } catch (err) {
      console.error('Failed to load shift notes:', err);
    }
  };

  const loadYesterdayShiftNotes = async () => {
    try {
      const notes = await apiService.getYesterdayShiftNotes();
      setYesterdayShiftNotes(notes);
    } catch (err) {
      console.error('Failed to load yesterday shift notes:', err);
    }
  };

  const loadArchivedShiftNotes = async () => {
    try {
      const archived = await apiService.getArchivedShiftNotes();
      setArchivedShiftNotes(archived);
    } catch (err) {
      console.error('Failed to load archived shift notes:', err);
    }
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === CORRECT_PASSWORD) {
      setIsAuthenticated(true);
      setPasswordError('');
      sessionStorage.setItem('wki_authenticated', 'true');
    } else {
      setPasswordError('Incorrect password. Please try again.');
      setPasswordInput('');
    }
  };

  const handleSaveDefaultAuthor = (name: string) => {
    if (name.trim()) {
      localStorage.setItem('wki_default_author', name.trim());
      setDefaultAuthor(name.trim());
      setNewShiftNote(prev => ({ ...prev, author: name.trim() }));
    }
    setShowNamePrompt(false);
  };

  const handleClearDefaultAuthor = () => {
    localStorage.removeItem('wki_default_author');
    setDefaultAuthor('');
    setNewShiftNote(prev => ({ ...prev, author: '' }));
  };

  const handleAddShiftNote = async () => {
    if (!newShiftNote.notes.trim()) {
      alert('Please enter shift notes');
      return;
    }

    try {
      const createdNote = await apiService.createShiftNote(newShiftNote);
      setShiftNotes([...shiftNotes, createdNote]);
      setNewShiftNote({ notes: '', shift: '1st', author: '' });
    } catch (err) {
      console.error('Failed to add shift note:', err);
      alert('Failed to add shift note. Please try again.');
    }
  };

  const handleDeleteShiftNote = async (id: string) => {
    if (!confirm('Are you sure you want to delete this shift note?')) {
      return;
    }

    try {
      await apiService.deleteShiftNote(id);
      setShiftNotes(shiftNotes.filter(note => note.id !== id));
    } catch (err) {
      console.error('Failed to delete shift note:', err);
      alert('Failed to delete shift note. Please try again.');
    }
  };

  // Generate email template for shift handoff
  const generateShiftHandoffEmail = (shift: '1st' | '2nd') => {
    const now = new Date();
    
    // Get today's date in local timezone
    const year = now.getFullYear();
    const month = now.getMonth();
    const day = now.getDate();
    
    // Define shift times using local timezone
    let shiftStart: Date, shiftEnd: Date;
    
    if (shift === '1st') {
      // First shift: 6:30 AM to 3:30 PM
      shiftStart = new Date(year, month, day, 6, 30, 0);
      shiftEnd = new Date(year, month, day, 15, 30, 0);
    } else {
      // Second shift: 3:30 PM to Midnight
      shiftStart = new Date(year, month, day, 15, 30, 0);
      shiftEnd = new Date(year, month, day, 23, 59, 59);
    }
    
    // Filter orders with changes relevant to this shift
    const shiftOrders = orders.filter(order => {
      // Check general updatedAt timestamp
      if (order.updatedAt) {
        const updateTime = new Date(order.updatedAt);
        if (updateTime >= shiftStart && updateTime <= shiftEnd) {
          return true;
        }
      }
      
      // Also check shift-specific update times
      if (shift === '1st' && order.firstShiftUpdatedAt) {
        const firstTime = new Date(order.firstShiftUpdatedAt);
        if (firstTime >= shiftStart && firstTime <= shiftEnd) {
          return true;
        }
      }
      
      if (shift === '2nd' && order.secondShiftUpdatedAt) {
        const secondTime = new Date(order.secondShiftUpdatedAt);
        if (secondTime >= shiftStart && secondTime <= shiftEnd) {
          return true;
        }
      }
      
      return false;
    }).sort((a, b) => {
      const aTime = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      const bTime = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      return bTime - aTime; // Most recent first
    });

    // Get shift notes for this shift
    const shiftSpecificNotes = shiftNotes.filter(note => note.shift === shift);
    
    // Generate email content
    const shiftName = shift === '1st' ? 'First Shift (6:30 AM - 3:30 PM)' : 'Second Shift (3:30 PM - Midnight)';
    const date = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    
    let emailBody = `SHIFT HANDOFF NOTES\n`;
    emailBody += `${shiftName}\n`;
    emailBody += `${date}\n`;
    emailBody += `${'='.repeat(80)}\n\n`;
    
    // Add shift notes
    if (shiftSpecificNotes.length > 0) {
      emailBody += `SHIFT NOTES:\n`;
      emailBody += `${'-'.repeat(80)}\n`;
      shiftSpecificNotes.forEach((note, idx) => {
        emailBody += `${idx + 1}. ${note.author ? `[${note.author}] ` : ''}${note.notes}\n\n`;
      });
      emailBody += `\n`;
    }
    
    // Add updated customer records
    if (shiftOrders.length > 0) {
      emailBody += `UPDATED CUSTOMER RECORDS (${shiftOrders.length} updates):\n`;
      emailBody += `${'-'.repeat(80)}\n\n`;
      
      shiftOrders.forEach((order, idx) => {
        const updateTime = order.updatedAt ? new Date(order.updatedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '';
        
        emailBody += `${idx + 1}. R.O. #${order.ro} - ${order.customer}\n`;
        emailBody += `   Unit: ${order.unit}  |  Bay: ${order.bay}  |  Updated: ${updateTime}\n`;
        emailBody += `   Repair Condition: ${order.repairCondition}\n`;
        emailBody += `   Quote Status: ${order.quoteStatus}\n`;
        
        if (order.firstShift && shift === '1st') {
          emailBody += `   First Shift Notes: ${order.firstShift.substring(0, 200)}${order.firstShift.length > 200 ? '...' : ''}\n`;
        }
        if (order.secondShift && shift === '2nd') {
          emailBody += `   Second Shift Notes: ${order.secondShift.substring(0, 200)}${order.secondShift.length > 200 ? '...' : ''}\n`;
        }
        
        if (order.orderedParts) {
          emailBody += `   Ordered Parts: ${order.orderedParts}\n`;
        }
        
        emailBody += `\n`;
      });
    } else {
      emailBody += `UPDATED CUSTOMER RECORDS:\n`;
      emailBody += `${'-'.repeat(80)}\n`;
      emailBody += `No customer records were updated during this shift.\n\n`;
    }
    
    emailBody += `${'='.repeat(80)}\n`;
    emailBody += `Total Active WIP: ${orders.length}\n`;
    emailBody += `Updates This Shift: ${shiftOrders.length}\n`;
    
    // Create mailto link
    const subject = `Shift Handoff - ${shiftName} - ${date}`;
    const mailtoLink = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(emailBody)}`;
    
    // Open email client
    window.location.href = mailtoLink;
  };

  const [formData, setFormData] = useState<Omit<Order, 'id' | 'dateAdded'>>({
    customer: '',
    unit: '',
    ro: '',
    bay: '',
    firstShift: '',
    secondShift: '',
    orderedParts: '',
    triageNotes: '',
    quoteStatus: '',
    repairCondition: '',
    contactInfo: '',
    accountStatus: '',
    customerStatus: '',
    call: ''
  });

  // Get combined archive months from both hardcoded data and MongoDB
  const getAllArchiveMonths = (): string[] => {
    const months = new Set<string>();
    
    // Add hardcoded archive months
    Object.keys(archivedOrders).forEach(month => months.add(month));
    
    // Add dynamic MongoDB archive months
    Object.keys(dynamicArchives).forEach(month => months.add(month));
    
    // Sort newest first
    return Array.from(months).sort((a, b) => {
      const dateA = new Date(a.split(' ')[1] + '-' + a.split(' ')[0]);
      const dateB = new Date(b.split(' ')[1] + '-' + b.split(' ')[0]);
      return dateB.getTime() - dateA.getTime();
    });
  };

  // Get the appropriate orders based on active view
  const getDisplayOrders = (): Order[] => {
    if (activeView === 'current') {
      // Sort current orders by most recently updated
      return [...orders].sort((a, b) => {
        const aTime = a.updatedAt ? new Date(a.updatedAt).getTime() : 
                      a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.updatedAt ? new Date(b.updatedAt).getTime() : 
                      b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bTime - aTime; // Most recent first
      });
    } else if (activeView === 'history') {
      // Show orders updated in the last 72 hours
      const now = new Date().getTime();
      const hours72Ms = 72 * 60 * 60 * 1000; // 72 hours in milliseconds
      
      return orders.filter((order: Order) => {
        const firstShiftTime = order.firstShiftUpdatedAt ? new Date(order.firstShiftUpdatedAt).getTime() : 0;
        const secondShiftTime = order.secondShiftUpdatedAt ? new Date(order.secondShiftUpdatedAt).getTime() : 0;
        const mostRecent = Math.max(firstShiftTime, secondShiftTime);
        
        return mostRecent > 0 && (now - mostRecent) <= hours72Ms;
      }).sort((a, b) => {
        // Sort by most recent activity
        const aTime = Math.max(
          a.firstShiftUpdatedAt ? new Date(a.firstShiftUpdatedAt).getTime() : 0,
          a.secondShiftUpdatedAt ? new Date(a.secondShiftUpdatedAt).getTime() : 0
        );
        const bTime = Math.max(
          b.firstShiftUpdatedAt ? new Date(b.firstShiftUpdatedAt).getTime() : 0,
          b.secondShiftUpdatedAt ? new Date(b.secondShiftUpdatedAt).getTime() : 0
        );
        return bTime - aTime; // Most recent first
      });
    } else {
      // Merge hardcoded archives and MongoDB archives for the same month
      const hardcodedData = archivedOrders[activeView] || [];
      const mongoData = dynamicArchives[activeView] || [];
      
      if (hardcodedData.length > 0 || mongoData.length > 0) {
        // Combine and deduplicate by RO number
        const combined = [...hardcodedData, ...mongoData];
        const uniqueByRO = combined.reduce((acc, order) => {
          const existing = acc.find(o => o.ro === order.ro);
          if (!existing) {
            acc.push(order);
          }
          return acc;
        }, [] as Order[]);
        return uniqueByRO;
      }
      return [];
    }
  };

  const displayOrders = getDisplayOrders();

  // Global search function that searches across all datasets
  const getAllOrders = (): Order[] => {
    const allOrders: Order[] = [...orders]; // Current orders
    
    // Add all archived orders from all months
    getAllArchiveMonths().forEach(month => {
      const hardcodedData = archivedOrders[month] || [];
      const mongoData = dynamicArchives[month] || [];
      allOrders.push(...hardcodedData, ...mongoData);
    });
    
    return allOrders;
  };

  // Helper function to determine which dataset an order belongs to
  const getOrderSource = (order: Order): string => {
    // Check if it's in current orders
    if (orders.some(o => o.id === order.id && o.ro === order.ro)) {
      return 'current';
    }
    
    // Check archived months (both hardcoded and MongoDB)
    for (const month of getAllArchiveMonths()) {
      const hardcodedData = archivedOrders[month] || [];
      const mongoData = dynamicArchives[month] || [];
      const allMonthOrders = [...hardcodedData, ...mongoData];
      
      if (allMonthOrders.some(o => o.id === order.id && o.ro === order.ro)) {
        return month;
      }
    }
    
    return 'unknown';
  };

  const filteredOrders = (() => {
    let orders = globalSearch && searchTerm
      ? getAllOrders().filter((order: Order) =>
          order.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
          order.ro.toLowerCase().includes(searchTerm.toLowerCase()) ||
          order.unit.toLowerCase().includes(searchTerm.toLowerCase()) ||
          order.bay.toLowerCase().includes(searchTerm.toLowerCase()) ||
          order.repairCondition.toLowerCase().includes(searchTerm.toLowerCase()) ||
          order.contactInfo.toLowerCase().includes(searchTerm.toLowerCase())
        )
      : displayOrders.filter((order: Order) =>
          order.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
          order.ro.toLowerCase().includes(searchTerm.toLowerCase()) ||
          order.unit.toLowerCase().includes(searchTerm.toLowerCase())
        );

    // Apply time filter (for current and history views)
    if ((activeView === 'current' || activeView === 'history') && timeFilter > 0) {
      const now = new Date().getTime();
      const filterMs = timeFilter * 60 * 1000; // Convert minutes to milliseconds
      
      orders = orders.filter((order: Order) => {
        const firstShiftTime = order.firstShiftUpdatedAt ? new Date(order.firstShiftUpdatedAt).getTime() : 0;
        const secondShiftTime = order.secondShiftUpdatedAt ? new Date(order.secondShiftUpdatedAt).getTime() : 0;
        const mostRecent = Math.max(firstShiftTime, secondShiftTime);
        
        return mostRecent > 0 && (now - mostRecent) <= filterMs;
      });
    }

    // Apply sorting (for current and history views)
    if ((activeView === 'current' || activeView === 'history') && sortBy !== 'none') {
      orders = [...orders].sort((a, b) => {
        let timeA = 0;
        let timeB = 0;

        if (sortBy === 'firstShift') {
          timeA = a.firstShiftUpdatedAt ? new Date(a.firstShiftUpdatedAt).getTime() : 0;
          timeB = b.firstShiftUpdatedAt ? new Date(b.firstShiftUpdatedAt).getTime() : 0;
        } else if (sortBy === 'secondShift') {
          timeA = a.secondShiftUpdatedAt ? new Date(a.secondShiftUpdatedAt).getTime() : 0;
          timeB = b.secondShiftUpdatedAt ? new Date(b.secondShiftUpdatedAt).getTime() : 0;
        }

        // Sort newest first
        return timeB - timeA;
      });
    }

    return orders;
  })();

  const handleAddOrder = async () => {
    // Validation: check required fields
    if (!formData.customer.trim()) {
      alert('Customer name is required');
      return;
    }
    if (!formData.unit.trim()) {
      alert('Unit number is required');
      return;
    }
    if (!formData.ro.trim()) {
      alert('R.O. number is required');
      return;
    }

    try {
      setIsLoading(true);
      const newOrder = await apiService.createOrder(formData);
      setOrders([...orders, newOrder]);
      setFormData({
        customer: '',
        unit: '',
        ro: '',
        bay: '',
        firstShift: '',
        secondShift: '',
        orderedParts: '',
        triageNotes: '',
        quoteStatus: '',
        repairCondition: '',
        contactInfo: '',
        accountStatus: '',
        customerStatus: '',
        call: ''
      });
      setShowAddForm(false);
    } catch (err) {
      console.error('Failed to add order:', err);
      alert('Failed to add order. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle PDF upload and parsing
  const handlePDFUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check if it's a PDF
    if (file.type !== 'application/pdf') {
      alert('Please upload a PDF file');
      return;
    }

    try {
      setIsLoading(true);
      const parsedData = await parseDecisivPDF(file);
      
      if (parsedData) {
        // Populate the form with parsed data
        setFormData({
          ...formData,
          ...parsedData
        });
        alert('PDF parsed successfully! Please review the auto-filled data before submitting.');
      } else {
        alert('Could not parse PDF. Please fill in the form manually.');
      }
    } catch (error) {
      console.error('Error processing PDF:', error);
      alert('Error processing PDF. Please fill in the form manually.');
    } finally {
      setIsLoading(false);
      // Clear the file input
      event.target.value = '';
    }
  };

  const handleUpdateOrder = async (orderId: string | number, field: keyof Order, value: string) => {
    // Optimistic update - update UI immediately
    setOrders(orders.map((order: Order) =>
      order.id === orderId ? { ...order, [field]: value } : order
    ));
    if (selectedOrder && selectedOrder.id === orderId) {
      setSelectedOrder({ ...selectedOrder, [field]: value });
    }

    // Then sync with backend
    try {
      const id = orderId.toString();
      await apiService.updateOrder(id, { [field]: value });
    } catch (err) {
      console.error('Failed to update order:', err);
      // Reload orders to restore correct state if update failed
      loadOrders();
    }
  };

  const handleDeleteOrder = async (orderId: string | number) => {
    // Prompt for PIN
    const pin = prompt('Enter PIN to delete this order:');
    
    if (pin !== '1971') {
      alert('Incorrect PIN. Delete operation cancelled.');
      return;
    }
    
    if (!confirm('Are you sure you want to delete this order? This action cannot be undone.')) {
      return;
    }
    
    try {
      setIsLoading(true);
      const id = orderId.toString();
      await apiService.deleteOrder(id);
      setOrders(orders.filter((order: Order) => order.id !== orderId));
      setSelectedOrder(null);
      alert('Order deleted successfully.');
    } catch (err) {
      console.error('Failed to delete order:', err);
      alert('Failed to delete order. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleArchiveOrder = async (orderId: string | number) => {
    if (!confirm('Mark this order as completed and move to archives?')) {
      return;
    }
    
    try {
      setIsLoading(true);
      const id = orderId.toString();
      
      // Archive the order (backend will automatically use current month)
      const result = await apiService.archiveOrder(id);
      
      // Remove from current orders
      setOrders(orders.filter((order: Order) => order.id !== orderId));
      
      // Reload archives to show the new archived order
      await loadArchives();
      
      // Close detail view if this order was selected
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder(null);
      }
      
      alert(`Order completed and archived to ${result.archiveMonth}!`);
    } catch (err) {
      console.error('Failed to archive order:', err);
      alert('Failed to archive order. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Password screen
  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-red-600 via-blue-600 to-blue-800">
        <div className="bg-white rounded-lg shadow-2xl p-8 max-w-md w-full mx-4">
          <div className="text-center mb-6">
            <img 
              src="https://www.kenworth.com/media/w4jnzm4t/kenworth_logo-header-new-012023.png" 
              alt="Kenworth Logo" 
              className="h-16 object-contain mx-auto mb-4"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
            <h1 className="text-3xl font-bold text-gray-800 mb-2">WKI Service Department</h1>
            <p className="text-gray-600">Work In Progress Tracker</p>
          </div>
          
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Access Code
              </label>
              <input
                id="password"
                type="password"
                value={passwordInput}
                onChange={(e) => {
                  setPasswordInput(e.target.value);
                  setPasswordError('');
                }}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
                placeholder="Enter password"
                autoFocus
              />
              {passwordError && (
                <p className="mt-2 text-sm text-red-600">{passwordError}</p>
              )}
            </div>
            
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200"
            >
              Access System
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="flex flex-1 overflow-hidden">
        {/* Mobile Menu Overlay */}
        {isMobileMenuOpen && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          ></div>
        )}

        {/* Sidebar */}
        <div className={`${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 fixed lg:relative z-50 w-64 border-r flex flex-col transition-transform duration-300 ease-in-out h-full ${
          isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}>
          <div className={`p-4 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            {/* Mobile Close Button */}
            <div className="flex items-center justify-between mb-2 lg:hidden">
              <div className="flex items-center gap-2">
                <img 
                  src="https://www.kenworth.com/media/w4jnzm4t/kenworth_logo-header-new-012023.png" 
                  alt="Kenworth Logo" 
                  className="h-8 object-contain"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className={`p-2 rounded-lg ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
              >
                <X size={20} />
              </button>
            </div>
            
            {/* Desktop Logo */}
            <div className="hidden lg:flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <img 
                  src="https://www.kenworth.com/media/w4jnzm4t/kenworth_logo-header-new-012023.png" 
                  alt="Kenworth Logo" 
                  className="h-8 object-contain"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
            </div>
            <div className="mb-2">
              <h1 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>WKI Service Dept.</h1>
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Work In Progress</p>
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setIsDarkMode(!isDarkMode)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isDarkMode
                    ? 'bg-gray-700 hover:bg-gray-600 text-white'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
                title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {isDarkMode ? 'Light Mode' : 'Dark Mode'}
              </button>
            </div>
          </div>

        <nav className="flex-1 overflow-y-auto p-4">
          <button
            onClick={() => {
              setActiveView('current');
              setIsMobileMenuOpen(false);
            }}
            className={`w-full flex items-center gap-2 px-4 py-2 rounded-lg mb-2 transition-colors ${
              activeView === 'current'
                ? isDarkMode 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-blue-50 text-blue-600'
                : isDarkMode
                  ? 'text-gray-300 hover:bg-gray-700'
                  : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Home size={18} />
            <span className="font-medium">Current WIP</span>
          </button>

          <button
            onClick={() => {
              setActiveView('history');
              setIsMobileMenuOpen(false);
            }}
            className={`w-full flex items-center gap-2 px-4 py-2 rounded-lg mb-2 transition-colors ${
              activeView === 'history'
                ? isDarkMode 
                  ? 'bg-purple-600 text-white' 
                  : 'bg-purple-50 text-purple-600'
                : isDarkMode
                  ? 'text-gray-300 hover:bg-gray-700'
                  : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
              <path d="M3 3v5h5"/>
              <path d="M12 7v5l4 2"/>
            </svg>
            <span className="font-medium">History (72hrs)</span>
          </button>

          <div className="mt-6 mb-2">
            <button
              onClick={() => setShowArchives(!showArchives)}
              className={`w-full flex items-center justify-between px-4 py-2 text-sm font-semibold transition-colors rounded-lg ${
                isDarkMode 
                  ? 'text-gray-300 hover:bg-gray-700' 
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <span className="flex items-center gap-2">
                <Archive size={16} />
                <span>Completed/Archived</span>
              </span>
              <svg
                className={`w-4 h-4 transition-transform ${
                  showArchives ? 'rotate-180' : ''
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>

          {/* Collapsible Archive Months */}
          {showArchives && getAllArchiveMonths().map((month) => {
            const hardcodedCount = archivedOrders[month]?.length || 0;
            const mongoCount = dynamicArchives[month]?.length || 0;
            const totalCount = hardcodedCount + mongoCount;
            
            return (
              <button
                key={month}
                onClick={() => {
                  setActiveView(month);
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full text-left px-4 py-2 rounded-lg mb-1 transition-smooth ml-4 ${
                  activeView === month
                    ? isDarkMode
                      ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg'
                      : 'bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-900 border border-blue-200'
                    : isDarkMode
                      ? 'text-gray-400 hover:bg-gray-700 hover:text-gray-200'
                      : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <span className="flex items-center justify-between">
                  <span>{month}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    activeView === month
                      ? isDarkMode
                        ? 'bg-blue-800 text-blue-100'
                        : 'bg-blue-200 text-blue-800'
                      : isDarkMode
                        ? 'bg-gray-700 text-gray-300'
                        : 'bg-gray-200 text-gray-700'
                  }`}>
                    {totalCount}
                  </span>
                </span>
              </button>
            );
          })}
        </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className={`border-b p-4 shadow-md ${isDarkMode ? 'bg-gradient-to-r from-gray-900 to-gray-800 border-gray-700' : 'bg-gradient-to-r from-white to-gray-50 border-gray-200'}`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 lg:gap-4 flex-1">
              {/* Mobile Menu Button */}
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className={`lg:hidden p-2 rounded-lg transition-smooth hover:scale-105 ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
              >
                <Menu size={24} />
              </button>
              
              <h2 className={`text-lg lg:text-2xl font-bold ${isDarkMode ? 'text-white' : 'bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent'} truncate`}>
                {activeView === 'current' ? '🔧 Current Work In Progress' : 
                 activeView === 'history' ? '📊 Recent Activity (Last 72 Hours)' : 
                 activeView}
              </h2>
              
              {/* Statistics Panel - Hidden on mobile, shown on desktop */}
              {activeView === 'current' && (
                <div className={`hidden xl:flex items-center gap-3 px-4 py-2 rounded-xl border shadow-lg transition-smooth hover:shadow-xl ${
                  isDarkMode ? 'bg-gradient-to-r from-gray-800 to-gray-700 border-gray-600' : 'bg-gradient-to-r from-blue-50 to-indigo-50 border-gray-200'
                }`}>
                  {/* Active Cases */}
                  <div 
                    className="relative group flex items-center gap-2 cursor-help"
                  >
                    <div className={`w-2.5 h-2.5 rounded-full animate-pulse-soft ${isDarkMode ? 'bg-green-400 shadow-lg shadow-green-400/50' : 'bg-green-500 shadow-lg shadow-green-500/50'}`}></div>
                    <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Active: <span className="font-bold text-lg">{stats.active}</span>
                    </span>
                    {/* Tooltip */}
                    <div className={`absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-3 py-2 rounded-lg shadow-lg text-xs whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 ${
                      isDarkMode ? 'bg-gray-900 border border-gray-700 text-gray-200' : 'bg-white border border-gray-300 text-gray-800'
                    }`}>
                      Total active work-in-progress orders
                      <div className={`absolute bottom-full left-1/2 transform -translate-x-1/2 w-2 h-2 rotate-45 ${
                        isDarkMode ? 'bg-gray-900 border-t border-l border-gray-700' : 'bg-white border-t border-l border-gray-300'
                      }`} style={{ marginBottom: '-5px' }}></div>
                    </div>
                  </div>
                  
                  <div className={`w-px h-6 ${isDarkMode ? 'bg-gray-600' : 'bg-gray-300'}`}></div>
                  
                  {/* 1st Shift Updates */}
                  <div 
                    className="relative group flex items-center gap-2 cursor-help"
                  >
                    <span className="text-sm text-blue-600 font-semibold">1st:</span>
                    <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      <span className="font-bold">{stats.firstShift24h}</span>
                      <span className={`text-xs ml-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>(24h)</span>
                    </span>
                    {/* Tooltip */}
                    <div className={`absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-3 py-2 rounded-lg shadow-lg text-xs whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 ${
                      isDarkMode ? 'bg-gray-900 border border-gray-700 text-gray-200' : 'bg-white border border-gray-300 text-gray-800'
                    }`}>
                      Orders with 1st shift notes updated in last 24 hours
                      <div className={`absolute bottom-full left-1/2 transform -translate-x-1/2 w-2 h-2 rotate-45 ${
                        isDarkMode ? 'bg-gray-900 border-t border-l border-gray-700' : 'bg-white border-t border-l border-gray-300'
                      }`} style={{ marginBottom: '-5px' }}></div>
                    </div>
                  </div>
                  
                  <div className={`w-px h-6 ${isDarkMode ? 'bg-gray-600' : 'bg-gray-300'}`}></div>
                  
                  {/* 2nd Shift Updates */}
                  <div 
                    className="relative group flex items-center gap-2 cursor-help"
                  >
                    <span className="text-sm text-orange-600 font-semibold">2nd:</span>
                    <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      <span className="font-bold">{stats.secondShift24h}</span>
                      <span className={`text-xs ml-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>(24h)</span>
                    </span>
                    {/* Tooltip */}
                    <div className={`absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-3 py-2 rounded-lg shadow-lg text-xs whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 ${
                      isDarkMode ? 'bg-gray-900 border border-gray-700 text-gray-200' : 'bg-white border border-gray-300 text-gray-800'
                    }`}>
                      Orders with 2nd shift notes updated in last 24 hours
                      <div className={`absolute bottom-full left-1/2 transform -translate-x-1/2 w-2 h-2 rotate-45 ${
                        isDarkMode ? 'bg-gray-900 border-t border-l border-gray-700' : 'bg-white border-t border-l border-gray-300'
                      }`} style={{ marginBottom: '-5px' }}></div>
                    </div>
                  </div>
                  
                  <div className={`w-px h-6 ${isDarkMode ? 'bg-gray-600' : 'bg-gray-300'}`}></div>
                  
                  {/* Completed Orders */}
                  <div 
                    className="relative group flex items-center gap-2 cursor-help"
                  >
                    <Archive size={14} className={isDarkMode ? 'text-gray-400' : 'text-gray-600'} />
                    <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Completed: <span className="font-bold">{stats.completed}</span>
                    </span>
                    {/* Tooltip */}
                    <div className={`absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-3 py-2 rounded-lg shadow-lg text-xs whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 ${
                      isDarkMode ? 'bg-gray-900 border border-gray-700 text-gray-200' : 'bg-white border border-gray-300 text-gray-800'
                    }`}>
                      Total archived/completed orders across all months
                      <div className={`absolute bottom-full left-1/2 transform -translate-x-1/2 w-2 h-2 rotate-45 ${
                        isDarkMode ? 'bg-gray-900 border-t border-l border-gray-700' : 'bg-white border-t border-l border-gray-300'
                      }`} style={{ marginBottom: '-5px' }}></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {activeView === 'current' && (
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowShiftNotesModal(true);
                    setShiftNotesView('today');
                  }}
                  className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white px-3 sm:px-4 py-2 rounded-lg hover:from-purple-700 hover:to-purple-800 transition-smooth shadow-lg hover:shadow-xl hover:shadow-purple-500/50 hover:scale-105 text-sm font-medium"
                >
                  <FileText size={18} />
                  <span className="hidden sm:inline">Shift Notes</span>
                </button>
                <button
                  onClick={() => setShowAddForm(true)}
                  className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-3 sm:px-4 py-2 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-smooth shadow-lg hover:shadow-xl hover:shadow-blue-500/50 hover:scale-105 text-sm font-medium"
                >
                  <Plus size={18} />
                  <span className="hidden sm:inline">New RO</span>
                  <span className="sm:hidden">New</span>
                </button>
              </div>
            )}
          </div>

          <div className="space-y-3">
            {/* Mobile Statistics Panel - Only on Current WIP */}
            {activeView === 'current' && (
              <div className={`xl:hidden grid grid-cols-2 gap-2 p-3 rounded-xl border shadow-md ${
                isDarkMode ? 'bg-gradient-to-br from-gray-800 to-gray-700 border-gray-600' : 'bg-gradient-to-br from-blue-50 to-indigo-50 border-gray-200'
              }`}>
                <div className={`flex items-center gap-2 px-2 py-1 rounded-lg shadow-sm ${isDarkMode ? 'bg-gray-900/50' : 'bg-white/80'}`}>
                  <div className={`w-2.5 h-2.5 rounded-full animate-pulse-soft ${isDarkMode ? 'bg-green-400 shadow-md shadow-green-400/50' : 'bg-green-500 shadow-md shadow-green-500/50'}`}></div>
                  <span className={`text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Active: <span className="font-bold">{stats.active}</span>
                  </span>
                </div>
                <div className={`flex items-center gap-2 px-2 py-1 rounded-lg shadow-sm ${isDarkMode ? 'bg-gray-900/50' : 'bg-white/80'}`}>
                  <Archive size={12} className={isDarkMode ? 'text-gray-400' : 'text-gray-600'} />
                  <span className={`text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Done: <span className="font-bold">{stats.completed}</span>
                  </span>
                </div>
                <div className={`flex items-center gap-2 px-2 py-1 rounded-lg shadow-sm ${isDarkMode ? 'bg-gray-900/50' : 'bg-white/80'}`}>
                  <span className="text-xs text-blue-600 font-semibold">1st:</span>
                  <span className={`text-xs ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    <span className="font-bold">{stats.firstShift24h}</span>
                    <span className={`text-xs ml-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>(24h)</span>
                  </span>
                </div>
                <div className={`flex items-center gap-2 px-2 py-1 rounded ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
                  <span className="text-xs text-orange-600 font-semibold">2nd:</span>
                  <span className={`text-xs ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    <span className="font-bold">{stats.secondShift24h}</span>
                    <span className={`text-xs ml-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>(24h)</span>
                  </span>
                </div>
              </div>
            )}
            
            <div className="relative">
              <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} size={18} />
              <input
                type="text"
                placeholder={globalSearch ? "Search across all data (current + all archives)..." : "Search by customer, RO#, or unit..."}
                value={searchTerm}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  isDarkMode 
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              />
            </div>

            {/* Filter Controls - Show for Current WIP and History */}
            {(activeView === 'current' || activeView === 'history') && (
              <div className={`rounded-lg border ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                {/* Filter Header - Always Visible */}
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`w-full flex items-center justify-between p-3 rounded-t-lg transition-colors ${
                    isDarkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Filter size={16} className={isDarkMode ? 'text-gray-400' : 'text-gray-600'} />
                    <span className={`text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Filter & Sort Options
                    </span>
                    {(sortBy !== 'none' || timeFilter > 0) && (
                      <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-blue-600 text-white">
                        Active
                      </span>
                    )}
                  </div>
                  {showFilters ? (
                    <ChevronUp size={18} className={isDarkMode ? 'text-gray-400' : 'text-gray-600'} />
                  ) : (
                    <ChevronDown size={18} className={isDarkMode ? 'text-gray-400' : 'text-gray-600'} />
                  )}
                </button>

                {/* Filter Content - Collapsible */}
                {showFilters && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 border-t ${isDarkMode ? 'border-gray-600' : 'border-gray-200'}">
                    <div>
                      <label className={`block text-xs font-semibold mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Sort By
                      </label>
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className={`w-full px-2 py-1.5 text-sm border rounded focus:ring-2 focus:ring-blue-500 ${
                          isDarkMode 
                            ? 'bg-gray-800 border-gray-600 text-white' 
                            : 'bg-white border-gray-300 text-gray-900'
                        }`}
                      >
                        <option value="none">No Sorting</option>
                        <option value="firstShift">Latest 1st Shift Updates</option>
                        <option value="secondShift">Latest 2nd Shift Updates</option>
                      </select>
                    </div>

                    <div>
                      <label className={`block text-xs font-semibold mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Updated Within
                      </label>
                      <select
                        value={timeFilter}
                        onChange={(e) => setTimeFilter(Number(e.target.value))}
                        className={`w-full px-2 py-1.5 text-sm border rounded focus:ring-2 focus:ring-blue-500 ${
                          isDarkMode 
                            ? 'bg-gray-800 border-gray-600 text-white' 
                            : 'bg-white border-gray-300 text-gray-900'
                        }`}
                      >
                        <option value="0">All Time</option>
                        <option value="15">Last 15 mins</option>
                        <option value="30">Last 30 mins</option>
                        <option value="60">Last hour</option>
                        <option value="120">Last 2 hours</option>
                        <option value="240">Last 4 hours</option>
                        <option value="480">Last 8 hours</option>
                        <option value="1440">Last 24 hours</option>
                      </select>
                    </div>

                    {(sortBy !== 'none' || timeFilter > 0) && (
                      <div className="col-span-1 sm:col-span-2">
                        <button
                          onClick={() => {
                            setSortBy('none');
                            setTimeFilter(0);
                          }}
                          className={`text-xs px-2 py-1 rounded transition-colors ${
                            isDarkMode
                              ? 'text-blue-400 hover:text-blue-300'
                              : 'text-blue-600 hover:text-blue-700'
                          }`}
                        >
                          Clear Filters
                        </button>
                        <span className={`ml-2 text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          Showing {filteredOrders.length} order{filteredOrders.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={globalSearch}
                  onChange={(e) => setGlobalSearch(e.target.checked)}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                />
                <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Search all data (including archives)
                </span>
              </label>
              {globalSearch && searchTerm && (
                <span className={`text-xs px-2 py-1 rounded ${isDarkMode ? 'bg-blue-900 text-blue-200' : 'bg-blue-100 text-blue-700'}`}>
                  {filteredOrders.length} results across all months
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Orders Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {error && (
            <div className={`mb-4 p-4 rounded-lg border ${
              isDarkMode 
                ? 'bg-red-900 border-red-700 text-red-200' 
                : 'bg-red-50 border-red-200 text-red-800'
            }`}>
              <div className="flex items-center justify-between">
                <span>⚠️ {error}</span>
                <button
                  onClick={loadOrders}
                  className={`px-3 py-1 rounded text-sm ${
                    isDarkMode
                      ? 'bg-red-800 hover:bg-red-700'
                      : 'bg-red-100 hover:bg-red-200'
                  }`}
                >
                  Retry
                </button>
              </div>
            </div>
          )}
          
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className={`inline-block animate-spin rounded-full h-12 w-12 border-b-2 ${
                  isDarkMode ? 'border-white' : 'border-gray-900'
                }`}></div>
                <p className={`mt-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Loading orders...
                </p>
              </div>
            </div>
          ) : (
          <div className="grid gap-4">
            {filteredOrders.map((order: Order) => {
              const orderSource = globalSearch ? getOrderSource(order) : null;
              return (
              <div
                key={`${order.ro}-${order.id}`}
                onClick={() => setSelectedOrder(order)}
                className={`border rounded-xl p-4 transition-smooth cursor-pointer animate-slide-in ${
                  isDarkMode 
                    ? 'bg-gradient-to-br from-gray-800 to-gray-850 border-gray-700 hover:from-gray-750 hover:to-gray-800 hover:border-blue-600 hover:shadow-2xl hover:shadow-blue-900/20 hover:-translate-y-1' 
                    : 'bg-white border-gray-200 hover:shadow-xl hover:shadow-blue-100 hover:border-blue-300 hover:-translate-y-1'
                }`}
              >
                {globalSearch && orderSource && (
                  <div className="mb-3">
                    <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium ${
                      orderSource === 'current'
                        ? isDarkMode
                          ? 'bg-green-900 text-green-200'
                          : 'bg-green-100 text-green-700'
                        : isDarkMode
                          ? 'bg-blue-900 text-blue-200'
                          : 'bg-blue-100 text-blue-700'
                    }`}>
                      <Archive size={12} />
                      {orderSource === 'current' ? 'Current WIP' : orderSource}
                    </span>
                  </div>
                )}
                {/* Date Information Bar */}
                <div className={`flex flex-wrap items-center gap-4 mb-3 pb-3 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                  {order.dateAdded && (
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-semibold ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Created:</span>
                      <span className={`text-sm font-medium ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                        {new Date(order.dateAdded).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                  )}
                  {order.updatedAt && (
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-semibold ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Last Edited:</span>
                      <span className={`text-sm font-medium ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
                        {formatTimestamp(order.updatedAt)}
                      </span>
                    </div>
                  )}
                  {!order.updatedAt && order.createdAt && (
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-semibold ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Last Edited:</span>
                      <span className={`text-sm font-medium ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
                        {formatTimestamp(order.createdAt)}
                      </span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-3">
                  <div>
                    <span className={`text-xs font-semibold uppercase ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Customer</span>
                    <p className={`font-semibold text-sm sm:text-base truncate ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{order.customer}</p>
                  </div>
                  <div>
                    <span className={`text-xs font-semibold uppercase ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Unit</span>
                    <p className={`font-semibold text-sm sm:text-base ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{order.unit}</p>
                  </div>
                  <div>
                    <span className={`text-xs font-semibold uppercase ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>R.O.#</span>
                    <p className={`font-semibold text-sm sm:text-base ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{order.ro}</p>
                  </div>
                  <div>
                    <span className={`text-xs font-semibold uppercase ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Bay</span>
                    <p className={`font-semibold text-sm sm:text-base ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{order.bay}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div 
                    className="relative group cursor-help"
                    title={order.firstShift || 'No notes yet'}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-blue-600 uppercase">1st Shift Notes</span>
                      {order.firstShiftUpdatedAt && (activeView === 'current' || activeView === 'history') && (
                        <span className={`text-xs italic ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                          {formatTimestamp(order.firstShiftUpdatedAt)}
                        </span>
                      )}
                    </div>
                    <p className={`text-sm line-clamp-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{order.firstShift || 'No notes yet'}</p>
                    {order.firstShift && (
                      <div className={`absolute left-0 top-full mt-2 p-3 rounded-lg shadow-xl z-50 w-96 max-w-screen-sm opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 ${
                        isDarkMode ? 'bg-gray-900 border border-gray-700 text-gray-200' : 'bg-white border border-gray-300 text-gray-800'
                      }`}>
                        <div className="text-xs font-semibold text-blue-600 mb-2">Full 1st Shift Notes:</div>
                        <div className="text-sm max-h-60 overflow-y-auto">{order.firstShift}</div>
                      </div>
                    )}
                  </div>
                  <div 
                    className="relative group cursor-help"
                    title={order.secondShift || 'No notes yet'}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-orange-600 uppercase">2nd Shift Notes</span>
                      {order.secondShiftUpdatedAt && (activeView === 'current' || activeView === 'history') && (
                        <span className={`text-xs italic ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                          {formatTimestamp(order.secondShiftUpdatedAt)}
                        </span>
                      )}
                    </div>
                    <p className={`text-sm line-clamp-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{order.secondShift || 'No notes yet'}</p>
                    {order.secondShift && (
                      <div className={`absolute right-0 top-full mt-2 p-3 rounded-lg shadow-xl z-50 w-96 max-w-screen-sm opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 ${
                        isDarkMode ? 'bg-gray-900 border border-gray-700 text-gray-200' : 'bg-white border border-gray-300 text-gray-800'
                      }`}>
                        <div className="text-xs font-semibold text-orange-600 mb-2">Full 2nd Shift Notes:</div>
                        <div className="text-sm max-h-60 overflow-y-auto">{order.secondShift}</div>
                      </div>
                    )}
                  </div>
                </div>

                <div className={`grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mt-3 pt-3 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-100'}`}>
                  <div>
                    <span className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>Repair Condition</span>
                    <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>{order.repairCondition}</p>
                  </div>
                  <div>
                    <span className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>Quote Status</span>
                    <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>{order.quoteStatus}</p>
                  </div>
                  <div>
                    <span className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>Account Status</span>
                    <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>{order.accountStatus}</p>
                  </div>
                </div>

                {/* Mark as Completed button - only show for current orders */}
                {activeView === 'current' && !globalSearch && order.id && (
                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 flex justify-end">
                    <button
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent opening detail view
                        handleArchiveOrder(order.id!);
                      }}
                      className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        isDarkMode
                          ? 'bg-green-700 hover:bg-green-600 text-white'
                          : 'bg-green-600 hover:bg-green-700 text-white'
                      }`}
                    >
                      <Archive size={16} />
                      <span className="hidden sm:inline">Mark as Completed</span>
                      <span className="sm:hidden">Completed</span>
                    </button>
                  </div>
                )}
              </div>
            );
            })}

            {filteredOrders.length === 0 && !isLoading && !error && (
              <div className="text-center py-12">
                <p className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>No repair orders found</p>
              </div>
            )}
          </div>
          )}
        </div>
        </div>
      </div>

      {/* Footer */}
      <Footer isDarkMode={isDarkMode} />

      {/* Add Order Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50 overflow-y-auto">
          <div className={`rounded-lg w-full max-w-4xl my-4 sm:my-8 max-h-[95vh] sm:max-h-[90vh] overflow-y-auto ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <div className={`sticky top-0 border-b p-3 sm:p-4 flex items-center justify-between ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} z-10`}>
              <h3 className={`text-lg sm:text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>New Repair Order</h3>
              <button onClick={() => setShowAddForm(false)} className={isDarkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-400 hover:text-gray-600'}>
                <X size={20} className="sm:hidden" />
                <X size={24} className="hidden sm:block" />
              </button>
            </div>

            <div className="p-3 sm:p-6 space-y-4">
              {/* PDF Upload Section */}
              <div className={`p-4 rounded-lg border-2 border-dashed ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-blue-50 border-blue-300'}`}>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h4 className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      Import from Decisiv PDF
                    </h4>
                    <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Upload a Decisiv case PDF to auto-fill the form
                    </p>
                  </div>
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept=".pdf,application/pdf"
                      onChange={handlePDFUpload}
                      className="hidden"
                      disabled={isLoading}
                    />
                    <div className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                      isLoading
                        ? isDarkMode
                          ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : isDarkMode
                          ? 'bg-blue-600 text-white hover:bg-blue-700'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}>
                      <Upload size={18} />
                      <span className="hidden sm:inline">Upload PDF</span>
                      <span className="sm:hidden">Upload</span>
                    </div>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Customer</label>
                  <input
                    type="text"
                    value={formData.customer}
                    onChange={(e) => setFormData({ ...formData, customer: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                      isDarkMode 
                        ? 'bg-gray-700 border-gray-600 text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Unit</label>
                  <input
                    type="text"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                      isDarkMode 
                        ? 'bg-gray-700 border-gray-600 text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>R.O. #</label>
                  <input
                    type="text"
                    value={formData.ro}
                    onChange={(e) => setFormData({ ...formData, ro: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                      isDarkMode 
                        ? 'bg-gray-700 border-gray-600 text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Bay #</label>
                  <input
                    type="text"
                    value={formData.bay}
                    onChange={(e) => setFormData({ ...formData, bay: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                      isDarkMode 
                        ? 'bg-gray-700 border-gray-600 text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-blue-700 mb-1">First Shift Notes</label>
                  <textarea
                    value={formData.firstShift}
                    onChange={(e) => setFormData({ ...formData, firstShift: e.target.value })}
                    rows={4}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                      isDarkMode 
                        ? 'bg-gray-700 border-gray-600 text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-orange-700 mb-1">Second Shift Notes</label>
                  <textarea
                    value={formData.secondShift}
                    onChange={(e) => setFormData({ ...formData, secondShift: e.target.value })}
                    rows={4}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                      isDarkMode 
                        ? 'bg-gray-700 border-gray-600 text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Ordered Parts/ETA and TCS Case #s</label>
                <textarea
                  value={formData.orderedParts}
                  onChange={(e) => setFormData({ ...formData, orderedParts: e.target.value })}
                  rows={2}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                    isDarkMode 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Triage Notes</label>
                <textarea
                  value={formData.triageNotes}
                  onChange={(e) => setFormData({ ...formData, triageNotes: e.target.value })}
                  rows={2}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                    isDarkMode 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Quote Status</label>
                  <input
                    type="text"
                    value={formData.quoteStatus}
                    onChange={(e) => setFormData({ ...formData, quoteStatus: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                      isDarkMode 
                        ? 'bg-gray-700 border-gray-600 text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Repair Condition</label>
                  <input
                    type="text"
                    value={formData.repairCondition}
                    onChange={(e) => setFormData({ ...formData, repairCondition: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                      isDarkMode 
                        ? 'bg-gray-700 border-gray-600 text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Contact Info</label>
                <input
                  type="text"
                  value={formData.contactInfo}
                  onChange={(e) => setFormData({ ...formData, contactInfo: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                    isDarkMode 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Account Status</label>
                  <select
                    value={formData.accountStatus}
                    onChange={(e) => setFormData({ ...formData, accountStatus: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                      isDarkMode 
                        ? 'bg-gray-700 border-gray-600 text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  >
                    <option value="">Select...</option>
                    <option value="COD">COD</option>
                    <option value="OPEN">OPEN</option>
                    <option value="CREDIT">CREDIT</option>
                  </select>
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Customer Status</label>
                  <input
                    type="text"
                    value={formData.customerStatus}
                    onChange={(e) => setFormData({ ...formData, customerStatus: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                      isDarkMode 
                        ? 'bg-gray-700 border-gray-600 text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Call</label>
                  <input
                    type="text"
                    value={formData.call}
                    onChange={(e) => setFormData({ ...formData, call: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                      isDarkMode 
                        ? 'bg-gray-700 border-gray-600 text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleAddOrder}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Add Repair Order
                </button>
                <button
                  onClick={() => setShowAddForm(false)}
                  className={`px-6 py-2 border rounded-lg transition-colors ${
                    isDarkMode 
                      ? 'border-gray-600 hover:bg-gray-700 text-gray-300' 
                      : 'border-gray-300 hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View/Edit Order Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50 overflow-y-auto">
          <div className={`rounded-lg w-full max-w-4xl my-4 sm:my-8 max-h-[95vh] sm:max-h-[90vh] overflow-y-auto ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <div className={`sticky top-0 border-b p-3 sm:p-4 flex items-start sm:items-center justify-between gap-2 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} z-10`}>
              <div className="flex-1 min-w-0">
                <h3 className={`text-base sm:text-xl font-bold truncate ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  R.O. #{selectedOrder.ro} - {selectedOrder.customer}
                </h3>
                {activeView !== 'current' && (
                  <p className={`text-xs sm:text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    Archived - View Only
                  </p>
                )}
              </div>
              <div className="flex gap-2 flex-shrink-0">
                {activeView === 'current' && (
                  <button
                    onClick={() => selectedOrder.id && handleDeleteOrder(selectedOrder.id)}
                    className="px-2 sm:px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    <span className="hidden sm:inline">Delete</span>
                    <X size={16} className="sm:hidden" />
                  </button>
                )}
                <button
                  onClick={() => setSelectedOrder(null)}
                  className={isDarkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-400 hover:text-gray-600'}
                >
                  <X size={20} className="sm:hidden" />
                  <X size={24} className="hidden sm:block" />
                </button>
              </div>
            </div>

            <div className="p-3 sm:p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Customer</label>
                  <input
                    type="text"
                    value={selectedOrder.customer}
                    onChange={(e) => activeView === 'current' && selectedOrder.id && handleUpdateOrder(selectedOrder.id, 'customer', e.target.value)}
                    readOnly={activeView !== 'current'}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                      isDarkMode 
                        ? 'bg-gray-700 border-gray-600 text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                    } ${activeView !== 'current' ? 'cursor-not-allowed opacity-60' : ''}`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Unit</label>
                  <input
                    type="text"
                    value={selectedOrder.unit}
                    onChange={(e) => activeView === 'current' && selectedOrder.id && handleUpdateOrder(selectedOrder.id, 'unit', e.target.value)}
                    readOnly={activeView !== 'current'}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                      isDarkMode 
                        ? 'bg-gray-700 border-gray-600 text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                    } ${activeView !== 'current' ? 'cursor-not-allowed opacity-60' : ''}`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>R.O. #</label>
                  <input
                    type="text"
                    value={selectedOrder.ro}
                    onChange={(e) => activeView === 'current' && selectedOrder.id && handleUpdateOrder(selectedOrder.id, 'ro', e.target.value)}
                    readOnly={activeView !== 'current'}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                      isDarkMode 
                        ? 'bg-gray-700 border-gray-600 text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                    } ${activeView !== 'current' ? 'cursor-not-allowed opacity-60' : ''}`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Bay #</label>
                  <input
                    type="text"
                    value={selectedOrder.bay}
                    onChange={(e) => activeView === 'current' && selectedOrder.id && handleUpdateOrder(selectedOrder.id, 'bay', e.target.value)}
                    readOnly={activeView !== 'current'}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                      isDarkMode 
                        ? 'bg-gray-700 border-gray-600 text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                    } ${activeView !== 'current' ? 'cursor-not-allowed opacity-60' : ''}`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-medium text-blue-700">First Shift Notes</label>
                    {selectedOrder.firstShiftUpdatedAt && activeView === 'current' && (
                      <span className={`text-xs italic ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                        Last updated: {formatTimestamp(selectedOrder.firstShiftUpdatedAt)}
                      </span>
                    )}
                  </div>
                  <textarea
                    value={selectedOrder.firstShift}
                    onChange={(e) => activeView === 'current' && selectedOrder.id && handleUpdateOrder(selectedOrder.id, 'firstShift', e.target.value)}
                    readOnly={activeView !== 'current'}
                    rows={6}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                      isDarkMode 
                        ? 'bg-gray-700 border-gray-600 text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                    } ${activeView !== 'current' ? 'cursor-not-allowed opacity-60' : ''}`}
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-medium text-orange-700">Second Shift Notes</label>
                    {selectedOrder.secondShiftUpdatedAt && activeView === 'current' && (
                      <span className={`text-xs italic ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                        Last updated: {formatTimestamp(selectedOrder.secondShiftUpdatedAt)}
                      </span>
                    )}
                  </div>
                  <textarea
                    value={selectedOrder.secondShift}
                    onChange={(e) => activeView === 'current' && selectedOrder.id && handleUpdateOrder(selectedOrder.id, 'secondShift', e.target.value)}
                    readOnly={activeView !== 'current'}
                    rows={6}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                      isDarkMode 
                        ? 'bg-gray-700 border-gray-600 text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                    } ${activeView !== 'current' ? 'cursor-not-allowed opacity-60' : ''}`}
                  />
                </div>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Ordered Parts/ETA and TCS Case #s</label>
                <textarea
                  value={selectedOrder.orderedParts}
                  onChange={(e) => activeView === 'current' && selectedOrder.id && handleUpdateOrder(selectedOrder.id, 'orderedParts', e.target.value)}
                  readOnly={activeView !== 'current'}
                  rows={2}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                    isDarkMode 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'bg-white border-gray-300 text-gray-900'
                  } ${activeView !== 'current' ? 'cursor-not-allowed opacity-60' : ''}`}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Triage Notes</label>
                <textarea
                  value={selectedOrder.triageNotes}
                  onChange={(e) => activeView === 'current' && selectedOrder.id && handleUpdateOrder(selectedOrder.id, 'triageNotes', e.target.value)}
                  readOnly={activeView !== 'current'}
                  rows={3}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                    isDarkMode 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'bg-white border-gray-300 text-gray-900'
                  } ${activeView !== 'current' ? 'cursor-not-allowed opacity-60' : ''}`}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Quote Status</label>
                  <input
                    type="text"
                    value={selectedOrder.quoteStatus}
                    onChange={(e) => activeView === 'current' && selectedOrder.id && handleUpdateOrder(selectedOrder.id, 'quoteStatus', e.target.value)}
                    readOnly={activeView !== 'current'}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                      isDarkMode 
                        ? 'bg-gray-700 border-gray-600 text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                    } ${activeView !== 'current' ? 'cursor-not-allowed opacity-60' : ''}`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Repair Condition</label>
                  <input
                    type="text"
                    value={selectedOrder.repairCondition}
                    onChange={(e) => activeView === 'current' && selectedOrder.id && handleUpdateOrder(selectedOrder.id, 'repairCondition', e.target.value)}
                    readOnly={activeView !== 'current'}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                      isDarkMode 
                        ? 'bg-gray-700 border-gray-600 text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                    } ${activeView !== 'current' ? 'cursor-not-allowed opacity-60' : ''}`}
                  />
                </div>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Contact Info</label>
                <input
                  type="text"
                  value={selectedOrder.contactInfo}
                  onChange={(e) => activeView === 'current' && selectedOrder.id && handleUpdateOrder(selectedOrder.id, 'contactInfo', e.target.value)}
                  readOnly={activeView !== 'current'}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                    isDarkMode 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'bg-white border-gray-300 text-gray-900'
                  } ${activeView !== 'current' ? 'cursor-not-allowed opacity-60' : ''}`}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Account Status</label>
                  <select
                    value={selectedOrder.accountStatus}
                    onChange={(e) => activeView === 'current' && selectedOrder.id && handleUpdateOrder(selectedOrder.id, 'accountStatus', e.target.value)}
                    disabled={activeView !== 'current'}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                      isDarkMode 
                        ? 'bg-gray-700 border-gray-600 text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                    } ${activeView !== 'current' ? 'cursor-not-allowed opacity-60' : ''}`}
                  >
                    <option value="">Select...</option>
                    <option value="COD">COD</option>
                    <option value="OPEN">OPEN</option>
                    <option value="CREDIT">CREDIT</option>
                  </select>
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Customer Status</label>
                  <input
                    type="text"
                    value={selectedOrder.customerStatus}
                    onChange={(e) => activeView === 'current' && selectedOrder.id && handleUpdateOrder(selectedOrder.id, 'customerStatus', e.target.value)}
                    readOnly={activeView !== 'current'}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                      isDarkMode 
                        ? 'bg-gray-700 border-gray-600 text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                    } ${activeView !== 'current' ? 'cursor-not-allowed opacity-60' : ''}`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Call</label>
                  <input
                    type="text"
                    value={selectedOrder.call}
                    onChange={(e) => activeView === 'current' && selectedOrder.id && handleUpdateOrder(selectedOrder.id, 'call', e.target.value)}
                    readOnly={activeView !== 'current'}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                      isDarkMode 
                        ? 'bg-gray-700 border-gray-600 text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                    } ${activeView !== 'current' ? 'cursor-not-allowed opacity-60' : ''}`}
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {activeView === 'current' ? 'Save & Close' : 'Close'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Shift Notes Modal */}
      {showShiftNotesModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50 overflow-y-auto">
          <div className={`rounded-lg w-full max-w-3xl my-4 sm:my-8 max-h-[95vh] sm:max-h-[90vh] overflow-y-auto ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <div className={`sticky top-0 border-b p-3 sm:p-4 flex items-center justify-between gap-2 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} z-10`}>
              <div className="flex items-center gap-3 flex-1">
                <h3 className={`text-lg sm:text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Shift Handoff Notes
                </h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShiftNotesView('today')}
                    className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                      shiftNotesView === 'today'
                        ? 'bg-purple-600 text-white'
                        : isDarkMode
                          ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Today
                  </button>
                  <button
                    onClick={() => setShiftNotesView('archive')}
                    className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                      shiftNotesView === 'archive'
                        ? 'bg-purple-600 text-white'
                        : isDarkMode
                          ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    <Clock size={14} className="inline mr-1" />
                    Archive
                  </button>
                </div>
              </div>
              <div className="flex gap-2 items-center">
                {shiftNotesView === 'today' && (
                  <>
                    <button
                      onClick={() => generateShiftHandoffEmail('1st')}
                      className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                      title="Generate email for 1st shift handoff"
                    >
                      <FileText size={14} />
                      1st Shift Email
                    </button>
                    <button
                      onClick={() => generateShiftHandoffEmail('2nd')}
                      className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium bg-orange-600 text-white hover:bg-orange-700 transition-colors"
                      title="Generate email for 2nd shift handoff"
                    >
                      <FileText size={14} />
                      2nd Shift Email
                    </button>
                  </>
                )}
                <button
                  onClick={() => setShowShiftNotesModal(false)}
                  className={isDarkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-400 hover:text-gray-600'}
                >
                  <X size={20} className="sm:hidden" />
                  <X size={24} className="hidden sm:block" />
                </button>
              </div>
            </div>

            <div className="p-3 sm:p-6 space-y-4">
              {shiftNotesView === 'today' ? (
                <>
                  {/* Add New Note Form */}
                  <div className={`p-4 rounded-lg border ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                    <h4 className={`text-sm font-semibold mb-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Add New Shift Note</h4>
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className={`block text-xs font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Shift</label>
                          <select
                            value={newShiftNote.shift}
                            onChange={(e) => setNewShiftNote({ ...newShiftNote, shift: e.target.value })}
                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 ${
                              isDarkMode 
                                ? 'bg-gray-800 border-gray-600 text-white' 
                                : 'bg-white border-gray-300 text-gray-900'
                            }`}
                          >
                            <option value="1st">1st Shift</option>
                            <option value="2nd">2nd Shift</option>
                          </select>
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className={`block text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                              Author {defaultAuthor && <span className="text-green-600">✓</span>}
                            </label>
                            {defaultAuthor ? (
                              <button
                                onClick={handleClearDefaultAuthor}
                                className={`text-xs ${isDarkMode ? 'text-red-400 hover:text-red-300' : 'text-red-600 hover:text-red-700'}`}
                              >
                                Clear Default
                              </button>
                            ) : (
                              <button
                                onClick={() => setShowNamePrompt(true)}
                                className={`text-xs ${isDarkMode ? 'text-purple-400 hover:text-purple-300' : 'text-purple-600 hover:text-purple-700'}`}
                              >
                                Set Default
                              </button>
                            )}
                          </div>
                          <input
                            type="text"
                            value={newShiftNote.author}
                            onChange={(e) => setNewShiftNote({ ...newShiftNote, author: e.target.value })}
                            placeholder={defaultAuthor || "Your name"}
                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 ${
                              isDarkMode 
                                ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-500' 
                                : 'bg-white border-gray-300 text-gray-900'
                            }`}
                          />
                        </div>
                      </div>
                      <div>
                        <label className={`block text-xs font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Notes</label>
                        <textarea
                          value={newShiftNote.notes}
                          onChange={(e) => setNewShiftNote({ ...newShiftNote, notes: e.target.value })}
                          placeholder="Enter shift handoff notes..."
                          rows={3}
                          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 ${
                            isDarkMode 
                              ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-500' 
                              : 'bg-white border-gray-300 text-gray-900'
                          }`}
                        />
                      </div>
                      <button
                        onClick={handleAddShiftNote}
                        className="w-full bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors font-medium"
                      >
                        Add Note
                      </button>
                    </div>
                  </div>

                  {/* Mobile Email Generation Buttons */}
                  <div className="sm:hidden grid grid-cols-2 gap-2">
                    <button
                      onClick={() => generateShiftHandoffEmail('1st')}
                      className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                    >
                      <FileText size={16} />
                      1st Shift Email
                    </button>
                    <button
                      onClick={() => generateShiftHandoffEmail('2nd')}
                      className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-orange-600 text-white hover:bg-orange-700 transition-colors"
                    >
                      <FileText size={16} />
                      2nd Shift Email
                    </button>
                  </div>

                  {/* Two-Column Layout: Today's Notes and Previous Day Notes */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Today's Notes Column */}
                    <div className="space-y-3">
                      <h4 className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        Today's Notes ({shiftNotes.length})
                      </h4>
                      {shiftNotes.length === 0 ? (
                        <div className={`text-center py-8 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          No shift notes for today yet
                        </div>
                      ) : (
                        shiftNotes.map((note) => (
                          <div
                            key={note.id}
                            className={`p-4 rounded-lg border ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'}`}
                          >
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                  note.shift === '1st'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-orange-600 text-white'
                                }`}>
                                  {note.shift} Shift
                                </span>
                                {note.author && (
                                  <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                    by {note.author}
                                  </span>
                                )}
                              </div>
                              <button
                                onClick={() => note.id && handleDeleteShiftNote(note.id)}
                                className={`p-1 rounded hover:bg-red-500 hover:text-white transition-colors ${
                                  isDarkMode ? 'text-gray-400' : 'text-gray-500'
                                }`}
                              >
                                <X size={16} />
                              </button>
                            </div>
                            <p className={`text-sm whitespace-pre-wrap ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                              {note.notes}
                            </p>
                            {note.createdAt && (
                              <div className={`mt-2 text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                                {new Date(note.createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>

                    {/* Previous Day Notes Column */}
                    <div className="space-y-3">
                      <h4 className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        Previous Day Notes ({yesterdayShiftNotes.length})
                      </h4>
                      {yesterdayShiftNotes.length === 0 ? (
                        <div className={`text-center py-8 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          No notes from previous day
                        </div>
                      ) : (
                        yesterdayShiftNotes.map((note) => (
                          <div
                            key={note.id}
                            className={`p-4 rounded-lg border ${isDarkMode ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-200'}`}
                          >
                            <div className="flex items-center gap-2 mb-2">
                              <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                note.shift === '1st'
                                  ? 'bg-blue-500 text-white'
                                  : 'bg-orange-500 text-white'
                              }`}>
                                {note.shift} Shift
                              </span>
                              {note.author && (
                                <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                  by {note.author}
                                </span>
                              )}
                            </div>
                            <p className={`text-sm whitespace-pre-wrap ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                              {note.notes}
                            </p>
                            {note.createdAt && (
                              <div className={`mt-2 text-xs ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`}>
                                {new Date(note.createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              ) : (
                /* Archived Notes View */
                <div className="space-y-4">
                  <h4 className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    Archived Shift Notes
                  </h4>
                  {Object.keys(archivedShiftNotes).length === 0 ? (
                    <div className={`text-center py-8 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      No archived shift notes yet
                    </div>
                  ) : (
                    Object.keys(archivedShiftNotes).sort((a, b) => b.localeCompare(a)).map((date) => (
                      <div key={date} className="space-y-2">
                        <h5 className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          {new Date(date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </h5>
                        <div className="space-y-2">
                          {archivedShiftNotes[date].map((note) => (
                            <div
                              key={note.id}
                              className={`p-3 rounded-lg border ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}
                            >
                              <div className="flex items-center gap-2 mb-2">
                                <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                                  note.shift === '1st'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-orange-600 text-white'
                                }`}>
                                  {note.shift} Shift
                                </span>
                                {note.author && (
                                  <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                    by {note.author}
                                  </span>
                                )}
                              </div>
                              <p className={`text-sm whitespace-pre-wrap ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                {note.notes}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Name Prompt Modal */}
      {showNamePrompt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className={`rounded-lg p-6 max-w-md w-full ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <h3 className={`text-lg font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Set Default Author Name
            </h3>
            <p className={`text-sm mb-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              Your name will be automatically filled in when adding shift notes. You can always change it or clear this later.
            </p>
            <form onSubmit={(e) => {
              e.preventDefault();
              const input = (e.target as HTMLFormElement).elements.namedItem('authorName') as HTMLInputElement;
              handleSaveDefaultAuthor(input.value);
            }}>
              <input
                type="text"
                name="authorName"
                defaultValue={newShiftNote.author}
                placeholder="Enter your name"
                autoFocus
                className={`w-full px-4 py-2 border rounded-lg mb-4 focus:ring-2 focus:ring-purple-500 ${
                  isDarkMode 
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors font-medium"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setShowNamePrompt(false)}
                  className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                    isDarkMode 
                      ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RepairOrderTracker;
