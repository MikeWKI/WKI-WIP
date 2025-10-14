// API Service for WKI-WIP
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export interface Order {
  _id?: string;
  id?: number;
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

export interface ShiftNote {
  _id?: string;
  id?: string;
  notes: string;
  shift: string; // '1st' or '2nd'
  author: string;
  date: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ArchivedShiftNote extends ShiftNote {
  archiveDate: string;
}

class ApiService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_URL;
  }

  async getAllOrders(): Promise<Order[]> {
    try {
      const response = await fetch(`${this.baseUrl}/orders`);
      if (!response.ok) {
        throw new Error('Failed to fetch orders');
      }
      const data = await response.json();
      // Convert MongoDB _id to id for compatibility
      return data.map((order: any) => ({
        ...order,
        id: order._id
      }));
    } catch (error) {
      console.error('Error fetching orders:', error);
      throw error;
    }
  }

  async getOrder(id: string): Promise<Order> {
    try {
      const response = await fetch(`${this.baseUrl}/orders/${id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch order');
      }
      const data = await response.json();
      return { ...data, id: data._id };
    } catch (error) {
      console.error('Error fetching order:', error);
      throw error;
    }
  }

  async createOrder(order: Omit<Order, 'id' | '_id' | 'dateAdded'>): Promise<Order> {
    try {
      const response = await fetch(`${this.baseUrl}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(order),
      });
      if (!response.ok) {
        throw new Error('Failed to create order');
      }
      const data = await response.json();
      return { ...data, id: data._id };
    } catch (error) {
      console.error('Error creating order:', error);
      throw error;
    }
  }

  async updateOrder(id: string, order: Partial<Order>): Promise<Order> {
    try {
      const response = await fetch(`${this.baseUrl}/orders/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(order),
      });
      if (!response.ok) {
        throw new Error('Failed to update order');
      }
      const data = await response.json();
      return { ...data, id: data._id };
    } catch (error) {
      console.error('Error updating order:', error);
      throw error;
    }
  }

  async deleteOrder(id: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/orders/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to delete order');
      }
    } catch (error) {
      console.error('Error deleting order:', error);
      throw error;
    }
  }

  async checkHealth(): Promise<{ status: string; mongodb: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      if (!response.ok) {
        throw new Error('Health check failed');
      }
      return await response.json();
    } catch (error) {
      console.error('Error checking health:', error);
      throw error;
    }
  }

  // Archive an order (mark as completed)
  async archiveOrder(id: string, archiveMonth?: string): Promise<{ message: string; archivedOrder: Order; archiveMonth: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/orders/${id}/archive`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ archiveMonth }),
      });
      if (!response.ok) {
        throw new Error('Failed to archive order');
      }
      return await response.json();
    } catch (error) {
      console.error('Error archiving order:', error);
      throw error;
    }
  }

  // Get all archived orders grouped by month
  async getAllArchives(): Promise<{ [month: string]: Order[] }> {
    try {
      const response = await fetch(`${this.baseUrl}/archives`);
      if (!response.ok) {
        throw new Error('Failed to fetch archives');
      }
      const data = await response.json();
      // Convert _id to id for all archived orders
      const converted: { [month: string]: Order[] } = {};
      Object.keys(data).forEach(month => {
        converted[month] = data[month].map((order: any) => ({
          ...order,
          id: order._id
        }));
      });
      return converted;
    } catch (error) {
      console.error('Error fetching archives:', error);
      throw error;
    }
  }

  // Get archived orders for a specific month
  async getArchivesByMonth(month: string): Promise<Order[]> {
    try {
      const monthParam = month.replace(/ /g, '-'); // Convert "October 2025" to "October-2025"
      const response = await fetch(`${this.baseUrl}/archives/${monthParam}`);
      if (!response.ok) {
        throw new Error('Failed to fetch archived orders');
      }
      const data = await response.json();
      return data.map((order: any) => ({
        ...order,
        id: order._id
      }));
    } catch (error) {
      console.error('Error fetching archived orders:', error);
      throw error;
    }
  }

  // ===== Shift Notes Methods =====

  // Get today's shift notes
  async getTodayShiftNotes(): Promise<ShiftNote[]> {
    try {
      const response = await fetch(`${this.baseUrl}/shift-notes/today`);
      if (!response.ok) {
        throw new Error('Failed to fetch shift notes');
      }
      const data = await response.json();
      return data.map((note: any) => ({
        ...note,
        id: note._id
      }));
    } catch (error) {
      console.error('Error fetching shift notes:', error);
      throw error;
    }
  }

  // Create shift note
  async createShiftNote(note: { notes: string; shift: string; author?: string }): Promise<ShiftNote> {
    try {
      const response = await fetch(`${this.baseUrl}/shift-notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(note),
      });
      if (!response.ok) {
        throw new Error('Failed to create shift note');
      }
      const data = await response.json();
      return { ...data, id: data._id };
    } catch (error) {
      console.error('Error creating shift note:', error);
      throw error;
    }
  }

  // Update shift note
  async updateShiftNote(id: string, note: { notes: string; shift: string; author?: string }): Promise<ShiftNote> {
    try {
      const response = await fetch(`${this.baseUrl}/shift-notes/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(note),
      });
      if (!response.ok) {
        throw new Error('Failed to update shift note');
      }
      const data = await response.json();
      return { ...data, id: data._id };
    } catch (error) {
      console.error('Error updating shift note:', error);
      throw error;
    }
  }

  // Delete shift note
  async deleteShiftNote(id: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/shift-notes/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to delete shift note');
      }
    } catch (error) {
      console.error('Error deleting shift note:', error);
      throw error;
    }
  }

  // Get yesterday's shift notes
  async getYesterdayShiftNotes(): Promise<ShiftNote[]> {
    try {
      const response = await fetch(`${this.baseUrl}/shift-notes/yesterday`);
      if (!response.ok) {
        throw new Error('Failed to fetch yesterday shift notes');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching yesterday shift notes:', error);
      throw error;
    }
  }

  // Archive old shift notes
  async archiveShiftNotes(): Promise<{ message: string; archived: number }> {
    try {
      const response = await fetch(`${this.baseUrl}/shift-notes/archive`, {
        method: 'POST',
      });
      if (!response.ok) {
        throw new Error('Failed to archive shift notes');
      }
      return await response.json();
    } catch (error) {
      console.error('Error archiving shift notes:', error);
      throw error;
    }
  }

  // Get archived shift notes grouped by date
  async getArchivedShiftNotes(): Promise<{ [date: string]: ArchivedShiftNote[] }> {
    try {
      const response = await fetch(`${this.baseUrl}/shift-notes/archived`);
      if (!response.ok) {
        throw new Error('Failed to fetch archived shift notes');
      }
      const data = await response.json();
      // Convert _id to id for all notes
      const converted: { [date: string]: ArchivedShiftNote[] } = {};
      Object.keys(data).forEach(date => {
        converted[date] = data[date].map((note: any) => ({
          ...note,
          id: note._id
        }));
      });
      return converted;
    } catch (error) {
      console.error('Error fetching archived shift notes:', error);
      throw error;
    }
  }

  // Get archived shift notes for specific date
  async getArchivedShiftNotesByDate(date: string): Promise<ArchivedShiftNote[]> {
    try {
      const response = await fetch(`${this.baseUrl}/shift-notes/archived/${date}`);
      if (!response.ok) {
        throw new Error('Failed to fetch archived shift notes for date');
      }
      const data = await response.json();
      return data.map((note: any) => ({
        ...note,
        id: note._id
      }));
    } catch (error) {
      console.error('Error fetching archived shift notes for date:', error);
      throw error;
    }
  }
}

export const apiService = new ApiService();
