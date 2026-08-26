// Shared types for Moringa E-Commerce Monorepo
// These types are used by both frontend and backend

// ============== USER TYPES ==============
export type UserRole = 'USER' | 'ADMIN';
export type AuthProvider = 'LOCAL' | 'GOOGLE';

export interface User {
  id: number;
  name: string;
  email: string;
  phoneNumber?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  country?: string | null;
  avatar?: string | null;
  isEmailVerified: boolean;
  role: UserRole;
  authProvider: AuthProvider;
  createdAt: string;
  updatedAt: string;
}

export type SafeUser = Omit<User, 'password'>;

export interface LoginDto {
  email: string;
  password: string;
  captchaId?: string;
  captchaInput?: string;
}

export interface RegisterDto {
  name: string;
  email: string;
  password: string;
  captchaId?: string;
  captchaInput?: string;
}

export interface AuthResponse {
  message: string;
  user: SafeUser;
  accessToken: string;
  refreshToken: string;
}

// ============== PRODUCT TYPES ==============
export interface Product {
  id: number;
  name: string;
  price: number;
  description: string;
  image: string;
  createdAt: string;
  stock: number;
  slug: string;
  sku: string;
  compareAtPrice?: number | null;
  brand?: string | null;
  tags: string[];
  seoTitle?: string | null;
  seoDescription?: string | null;
  weightGrams?: number | null;
  isActive: boolean;
  isNewArrival: boolean;
  updatedAt: string;
}

export interface CreateProductDto {
  name: string;
  price: number;
  description: string;
  image: string;
  stock: number;
  slug: string;
  sku: string;
  compareAtPrice?: number | null;
  brand?: string | null;
  tags?: string[];
  seoTitle?: string | null;
  seoDescription?: string | null;
  weightGrams?: number | null;
  isActive?: boolean;
  isNewArrival?: boolean;
}

export type UpdateProductDto = Partial<CreateProductDto>;

// ============== CART TYPES ==============
export interface CartItem {
  id: number;
  userId?: number | null;
  productId: number;
  quantity: number;
  guestCartToken?: string | null;
  createdAt: string;
  updatedAt: string;
  product?: Product;
}

export interface CreateCartDto {
  productId: number;
  quantity?: number;
}

export interface UpdateCartDto {
  quantity: number;
}

export interface MergeGuestCartDto {
  token: string;
}

// ============== ORDER TYPES ==============
export type OrderStatus = 'PENDING' | 'PAID' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'OUT_FOR_DELIVERY';

export interface OrderItem {
  id: number;
  orderId: number;
  productId: number;
  quantity: number;
  price: number;
  product?: Product;
}

export interface Order {
  id: number;
  userId: number;
  total: number;
  createdAt: string;
  status: OrderStatus;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  country?: string | null;
  courierName?: string | null;
  deliveredAt?: string | null;
  estimatedDeliveryAt?: string | null;
  outForDeliveryAt?: string | null;
  paidAt?: string | null;
  phoneNumber?: string | null;
  postalCode?: string | null;
  razorpayOrderId?: string | null;
  razorpayPaymentId?: string | null;
  recipientName?: string | null;
  shippedAt?: string | null;
  shippingAmount: number;
  state?: string | null;
  subtotal: number;
  taxAmount: number;
  trackingNumber?: string | null;
  codAmount: number;
  handlingAmount: number;
  shippingType?: string | null;
  paymentMethod?: string;
  expiresAt?: string | null;
  inventoryReserved: boolean;
  couponCode?: string | null;
  refundMethod?: string | null;
  refundReference?: string | null;
  refundNotes?: string | null;
  adminNotes?: string | null;
  refundId?: string | null;
  refundedAt?: string | null;
  items?: OrderItem[];
  user?: User;
}

export interface CreateOrderDto {
  addressId?: number;
  shippingType?: string;
  paymentMethod?: string;
  couponCode?: string;
}

// ============== WISHLIST TYPES ==============
export interface WishlistItem {
  id: number;
  userId?: number | null;
  productId: number;
  guestWishlistToken?: string | null;
  createdAt: string;
  product?: Product;
}

// ============== REVIEW TYPES ==============
export type ReviewStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface Review {
  id: number;
  userId: number;
  productId: number;
  orderId?: number | null;
  rating: number;
  title?: string | null;
  content: string;
  createdAt: string;
  updatedAt: string;
  adminNote?: string | null;
  status: ReviewStatus;
  user?: User;
  product?: Product;
}

export interface CreateReviewDto {
  productId: number;
  orderId?: number;
  rating: number;
  title?: string;
  content: string;
}

// ============== COUPON TYPES ==============
export type CouponDiscountType = 'PERCENTAGE' | 'FIXED';

export interface Coupon {
  id: number;
  code: string;
  discountType: CouponDiscountType;
  discountValue: number;
  minOrderValue?: number | null;
  maxDiscount?: number | null;
  usageLimit?: number | null;
  usedCount: number;
  isActive: boolean;
  validFrom: string;
  validUntil: string;
  createdAt: string;
  updatedAt: string;
  perUserLimit?: number | null;
}

// ============== BLOG TYPES ==============
export interface BlogPost {
  id: number;
  title: string;
  slug: string;
  excerpt?: string | null;
  content: string;
  coverImage?: string | null;
  published: boolean;
  publishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

// ============== ADDRESS TYPES ==============
export interface UserAddress {
  id: number;
  userId: number;
  label: string;
  recipientName: string;
  phoneNumber: string;
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserAddressDto {
  label: string;
  recipientName: string;
  phoneNumber: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault?: boolean;
}

export type UpdateUserAddressDto = Partial<CreateUserAddressDto>;

// ============== SETTINGS TYPES ==============
export interface StoreSettings {
  id: number;
  shippingCharge: number;
  taxRate: number;
  freeShippingThreshold?: number | null;
  updatedAt: string;
  codCharge: number;
  expressShippingCharge: number;
  handlingCharge: number;
  sameDayShippingCharge: number;
  shippingOptions?: Record<string, unknown> | null;
  shippingZones?: Record<string, unknown> | null;
  codEnabled: boolean;
  maxCodOrderValue?: number | null;
  allowInternationalCod: boolean;
  autoCancelPendingMinutes: number;
}

// ============== API RESPONSE TYPES ==============
export interface ApiResponse<T = unknown> {
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  skip: number;
  take: number;
}

// ============== API ERROR TYPE ==============
export interface ApiError {
  message: string;
  statusCode: number;
  error?: string;
}
