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
}

export const apiService = new ApiService();
