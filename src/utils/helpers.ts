export const generateSKU = (categoryName: string, productName: string): string => {
  const category = categoryName.substring(0, 3).toUpperCase();
  const product = productName.substring(0, 3).toUpperCase();
  const timestamp = Date.now().toString().slice(-6);
  return `${category}${product}${timestamp}`;
};

export const generateOrderNumber = (): string => {
  const prefix = 'ORD';
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 5).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
};

export const calculateTax = (amount: number, taxRate: number = 0.18): number => {
  return amount * taxRate;
};

export const calculateShipping = (amount: number, freeShippingThreshold: number = 500): number => {
  return amount >= freeShippingThreshold ? 0 : 40;
};

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR'
  }).format(amount);
};