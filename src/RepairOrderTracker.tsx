import React, { useState, useEffect } from 'react';
import { Search, Plus, X, Archive, Home } from 'lucide-react';
import { archivedOrders } from './archivedData';
import Footer from './Footer';
import { apiService } from './api';

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

  // Load orders from API
  useEffect(() => {
    loadOrders();
    loadArchives();
  }, []);

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

  const archiveMonths = [
    'October 2025',
    'September 2025',
    'August 2025',
    'July 2025',
    'June 2025',
    'May 2025',
    'April 2025',
    'March 2025',
    'February 2025',
    'January 2025'
  ];

  // Get the appropriate orders based on active view
  const getDisplayOrders = (): Order[] => {
    if (activeView === 'current') {
      return orders;
    } else {
      // Check static archived orders first
      if (archivedOrders[activeView]) {
        return archivedOrders[activeView];
      }
      // Check dynamic archives from MongoDB
      if (dynamicArchives[activeView]) {
        return dynamicArchives[activeView];
      }
      return [];
    }
  };

  const displayOrders = getDisplayOrders();

  // Global search function that searches across all datasets
  const getAllOrders = (): Order[] => {
    const allOrders: Order[] = [...orders]; // Current orders
    
    // Add all static archived orders from all months
    archiveMonths.forEach(month => {
      if (archivedOrders[month]) {
        allOrders.push(...archivedOrders[month]);
      }
    });
    
    // Add all dynamic archived orders from MongoDB
    Object.keys(dynamicArchives).forEach(month => {
      if (dynamicArchives[month]) {
        allOrders.push(...dynamicArchives[month]);
      }
    });
    
    return allOrders;
  };

  // Helper function to determine which dataset an order belongs to
  const getOrderSource = (order: Order): string => {
    // Check if it's in current orders
    if (orders.some(o => o.id === order.id && o.ro === order.ro)) {
      return 'current';
    }
    
    // Check static archived months
    for (const month of archiveMonths) {
      if (archivedOrders[month]?.some(o => o.id === order.id && o.ro === order.ro)) {
        return month;
      }
    }
    
    // Check dynamic archives
    for (const month of Object.keys(dynamicArchives)) {
      if (dynamicArchives[month]?.some(o => o.id === order.id && o.ro === order.ro)) {
        return month;
      }
    }
    
    return 'unknown';
  };

  const filteredOrders = globalSearch && searchTerm
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

  const handleUpdateOrder = async (orderId: string | number, field: keyof Order, value: string) => {
    try {
      const id = orderId.toString();
      await apiService.updateOrder(id, { [field]: value });
      setOrders(orders.map((order: Order) =>
        order.id === orderId ? { ...order, [field]: value } : order
      ));
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder({ ...selectedOrder, [field]: value });
      }
    } catch (err) {
      console.error('Failed to update order:', err);
      alert('Failed to update order. Please try again.');
    }
  };

  const handleDeleteOrder = async (orderId: string | number) => {
    if (!confirm('Are you sure you want to delete this order?')) {
      return;
    }
    
    try {
      setIsLoading(true);
      const id = orderId.toString();
      await apiService.deleteOrder(id);
      setOrders(orders.filter((order: Order) => order.id !== orderId));
      setSelectedOrder(null);
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

  return (
    <div className={`flex flex-col h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className={`w-64 border-r flex flex-col ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <div className={`p-4 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <div className="flex items-center justify-between mb-2">
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
            onClick={() => setActiveView('current')}
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

          <div className="mt-6 mb-2">
            <div className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              <Archive size={16} />
              <span>Completed/Archived</span>
            </div>
          </div>

          {/* Static archive months from archivedData.ts */}
          {archiveMonths.map((month) => (
            <button
              key={month}
              onClick={() => setActiveView(month)}
              className={`w-full text-left px-4 py-2 rounded-lg mb-1 transition-colors ${
                activeView === month
                  ? isDarkMode
                    ? 'bg-gray-700 text-white'
                    : 'bg-gray-100 text-gray-900'
                  : isDarkMode
                    ? 'text-gray-400 hover:bg-gray-700'
                    : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {month}
            </button>
          ))}

          {/* Dynamic archive months from MongoDB */}
          {Object.keys(dynamicArchives).sort((a, b) => {
            // Sort newest first
            const dateA = new Date(a.split(' ')[1] + '-' + a.split(' ')[0]);
            const dateB = new Date(b.split(' ')[1] + '-' + b.split(' ')[0]);
            return dateB.getTime() - dateA.getTime();
          }).map((month) => (
            <button
              key={`dynamic-${month}`}
              onClick={() => setActiveView(month)}
              className={`w-full text-left px-4 py-2 rounded-lg mb-1 transition-colors ${
                activeView === month
                  ? isDarkMode
                    ? 'bg-gray-700 text-white'
                    : 'bg-gray-100 text-gray-900'
                  : isDarkMode
                    ? 'text-gray-400 hover:bg-gray-700'
                    : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <span className="flex items-center gap-2">
                {month}
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  isDarkMode ? 'bg-green-900 text-green-200' : 'bg-green-100 text-green-700'
                }`}>
                  {dynamicArchives[month].length}
                </span>
              </span>
            </button>
          ))}
        </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className={`border-b p-4 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <div className="flex items-center justify-between mb-4">
            <h2 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
              {activeView === 'current' ? 'Current Work In Progress' : activeView}
            </h2>
            {activeView === 'current' && (
              <button
                onClick={() => setShowAddForm(true)}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus size={18} />
                New RO
              </button>
            )}
          </div>

          <div className="space-y-3">
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
                className={`border rounded-lg p-4 transition-all cursor-pointer ${
                  isDarkMode 
                    ? 'bg-gray-800 border-gray-700 hover:bg-gray-750 hover:border-gray-600 hover:shadow-lg' 
                    : 'bg-white border-gray-200 hover:shadow-md hover:border-gray-300'
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
                <div className="grid grid-cols-4 gap-4 mb-3">
                  <div>
                    <span className={`text-xs font-semibold uppercase ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Customer</span>
                    <p className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{order.customer}</p>
                  </div>
                  <div>
                    <span className={`text-xs font-semibold uppercase ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Unit</span>
                    <p className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{order.unit}</p>
                  </div>
                  <div>
                    <span className={`text-xs font-semibold uppercase ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>R.O.#</span>
                    <p className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{order.ro}</p>
                  </div>
                  <div>
                    <span className={`text-xs font-semibold uppercase ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Bay</span>
                    <p className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{order.bay}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div 
                    className="relative group cursor-help"
                    title={order.firstShift || 'No notes yet'}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-blue-600 uppercase">1st Shift Notes</span>
                      {order.updatedAt && activeView === 'current' && (
                        <span className={`text-xs italic ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                          {formatTimestamp(order.updatedAt)}
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
                      {order.updatedAt && activeView === 'current' && (
                        <span className={`text-xs italic ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                          {formatTimestamp(order.updatedAt)}
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

                <div className={`grid grid-cols-3 gap-4 mt-3 pt-3 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-100'}`}>
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
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                        isDarkMode
                          ? 'bg-green-700 hover:bg-green-600 text-white'
                          : 'bg-green-600 hover:bg-green-700 text-white'
                      }`}
                    >
                      <Archive size={16} />
                      Mark as Completed
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className={`rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <div className={`sticky top-0 border-b p-4 flex items-center justify-between ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <h3 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>New Repair Order</h3>
              <button onClick={() => setShowAddForm(false)} className={isDarkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-400 hover:text-gray-600'}>
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className={`rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <div className={`sticky top-0 border-b p-4 flex items-center justify-between ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <div>
                <h3 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  R.O. #{selectedOrder.ro} - {selectedOrder.customer}
                </h3>
                {activeView !== 'current' && (
                  <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    Archived - View Only
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                {activeView === 'current' && (
                  <button
                    onClick={() => selectedOrder.id && handleDeleteOrder(selectedOrder.id)}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Delete
                  </button>
                )}
                <button
                  onClick={() => setSelectedOrder(null)}
                  className={isDarkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-400 hover:text-gray-600'}
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
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
                    {selectedOrder.updatedAt && activeView === 'current' && (
                      <span className={`text-xs italic ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                        Last updated: {formatTimestamp(selectedOrder.updatedAt)}
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
                    {selectedOrder.updatedAt && activeView === 'current' && (
                      <span className={`text-xs italic ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                        Last updated: {formatTimestamp(selectedOrder.updatedAt)}
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
    </div>
  );
};

export default RepairOrderTracker;
