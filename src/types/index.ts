export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

export interface AuthPayload {
  userId: string;
  email: string;
  role: 'SUPER_ADMIN' | 'SELLER' | 'BUYER';
}

export interface CreateCategoryRequest {
  name: string;
  description?: string;
}

export interface CreateProductRequest {
  name: string;
  description?: string;
  price: number;
  originalPrice?: number;
  discount?: number;
  quantity: number;
  unit: string;
  sku?: string;
  categoryId: string;
  tags?: string[];
  nutritionInfo?: any;
  isFeatured?: boolean;
}

export interface UpdateProductRequest extends Partial<CreateProductRequest> {
  isActive?: boolean;
}

export interface CartItemRequest {
  productId: string;
  quantity: number;
}

export interface CreateOrderRequest {
  items: {
    productId: string;
    quantity: number;
  }[];
  shippingAddress: {
    street: string;
    city: string;
    state: string;
    country: string;
    zipCode: string;
    phone: string;
  };
  billingAddress?: {
    street: string;
    city: string;
    state: string;
    country: string;
    zipCode: string;
  };
  notes?: string;
}

export interface AddReviewRequest {
  productId: string;
  rating: number;
  comment?: string;
}

export interface OrderEvents {
  ORDER_CREATED: {
    orderId: string;
    userId: string;
    total: number;
    items: {
      sellerId: string;
      productId: string;
      quantity: number;
      totalPrice: number;
      commission: number;
    }[];
  };
  ORDER_CONFIRMED: {
    orderId: string;
    userId: string;
    paymentId: string;
  };
  ORDER_CANCELLED: {
    orderId: string;
    userId: string;
    reason: string;
  };
  INVENTORY_UPDATED: {
    productId: string;
    sellerId: string;
    oldQuantity: number;
    newQuantity: number;
  };
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface AnalyticsRequest {
  sellerId?: string;
  startDate: string;
  endDate: string;
  groupBy?: 'day' | 'week' | 'month';
}

export interface ProductFilters {
  categoryId?: string;
  sellerId?: string;
  minPrice?: number;
  maxPrice?: number;
  featured?: boolean;
  tags?: string[];
  isActive?: boolean;
}