export interface Product {
  id: number;
  name: string;
  price: number;
  description: string;
  image: string;
  stock: number;
  slug: string;
  sku: string;
}

export interface CartItem {
  id: number;
  productId: number;
  quantity: number;
  product?: Product;
}

export interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  avatar?: string | null;
}
