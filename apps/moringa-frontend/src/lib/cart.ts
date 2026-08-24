/**
 * Shared cart/checkout domain types, defaults, pricing math and the Razorpay
 * script loader. Extracted from legacy `useCartLogic` so both the cart page
 * and components can import them without React-specific state.
 */

export interface ServerCartItem {
  id: string | number;
  product: Record<string, unknown>;
  quantity: number;
}

export interface AddressForm {
  recipientName: string;
  phoneNumber: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface ShippingOption {
  key: string;
  label: string;
  amount: number;
  etaDays: number;
}

export interface StoreSettings {
  shippingCharge: number;
  expressShippingCharge: number;
  sameDayShippingCharge: number;
  codCharge: number;
  handlingCharge: number;
  taxRate: number;
  freeShippingThreshold: number | null;
  shippingOptions: ShippingOption[];
}

export const DEFAULT_ADDRESS_FORM: AddressForm = {
  recipientName: "",
  phoneNumber: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  postalCode: "",
  country: "India",
};

export const DEFAULT_STORE_SETTINGS: StoreSettings = {
  shippingCharge: 99,
  expressShippingCharge: 149,
  sameDayShippingCharge: 249,
  codCharge: 25,
  handlingCharge: 20,
  taxRate: 0,
  freeShippingThreshold: null,
  shippingOptions: [],
};

export const FALLBACK_SHIPPING_OPTION: ShippingOption = {
  key: "standard",
  label: "Standard Delivery",
  amount: 0,
  etaDays: 4,
};

export function resolveShippingOption(
  settings: StoreSettings,
  selectedKey: string,
): ShippingOption {
  return (
    settings.shippingOptions.find((option) => option.key === selectedKey) ??
    settings.shippingOptions[0] ?? {
      ...FALLBACK_SHIPPING_OPTION,
      amount: Number(settings.shippingCharge) || 0,
    }
  );
}

export interface CartPricing {
  itemCount: number;
  subtotal: number;
  qualifiesForFreeShipping: boolean;
  selectedShippingOption: ShippingOption;
  shipping: number;
  handling: number;
  codCharge: number;
  tax: number;
  previewSubtotal: number;
  discount: number;
  previewShipping: number;
  previewHandling: number;
  previewCodCharge: number;
  previewTax: number;
  total: number;
}

/** Pure pricing derivation mirroring the legacy useMemo chain. */
export function computeCartPricing(
  cartItems: ServerCartItem[],
  storeSettings: StoreSettings,
  selectedShippingType: string,
  selectedPaymentMethod: string,
  pricingPreview: Record<string, unknown> | null,
): CartPricing {
  const itemCount = cartItems.reduce(
    (total, item) => total + item.quantity,
    0,
  );

  const subtotal = cartItems.reduce(
    (total, item) => total + Number(item.product?.price ?? 0) * item.quantity,
    0,
  );

  const qualifiesForFreeShipping =
    storeSettings.freeShippingThreshold !== null &&
    subtotal >= Number(storeSettings.freeShippingThreshold);

  const selectedShippingOption = resolveShippingOption(
    storeSettings,
    selectedShippingType,
  );

  const shipping =
    cartItems.length === 0 || qualifiesForFreeShipping
      ? 0
      : Number(selectedShippingOption.amount) || 0;

  const handling =
    cartItems.length === 0 ? 0 : Number(storeSettings.handlingCharge) || 0;

  const codCharge =
    cartItems.length === 0 || selectedPaymentMethod !== "cod"
      ? 0
      : Number(storeSettings.codCharge) || 0;

  const tax = subtotal * ((Number(storeSettings.taxRate) || 0) / 100);

  const previewSubtotal = Number(pricingPreview?.subtotal ?? subtotal);
  const discount = Number(pricingPreview?.discountAmount ?? 0);
  const previewShipping = Number(pricingPreview?.shippingAmount ?? shipping);
  const previewHandling = Number(pricingPreview?.handlingAmount ?? handling);
  const previewCodCharge = Number(pricingPreview?.codAmount ?? codCharge);
  const previewTax = Number(pricingPreview?.taxAmount ?? tax);
  const total = Number(
    pricingPreview?.total ??
      subtotal + shipping + handling + codCharge + tax,
  );

  return {
    itemCount,
    subtotal,
    qualifiesForFreeShipping,
    selectedShippingOption,
    shipping,
    handling,
    codCharge,
    tax,
    previewSubtotal,
    discount,
    previewShipping,
    previewHandling,
    previewCodCharge,
    previewTax,
    total,
  };
}

export function isCompleteAddress(form: AddressForm): boolean {
  return [
    form.recipientName.trim(),
    form.phoneNumber.trim(),
    form.addressLine1.trim(),
    form.city.trim(),
    form.state.trim(),
    form.postalCode.trim(),
    form.country.trim(),
  ].every((value) => value.length > 0);
}

let razorpayScriptPromise: Promise<void> | null = null;

export function loadRazorpayScript(): Promise<void> {
  if (
    typeof window !== "undefined" &&
    (window as unknown as { Razorpay: unknown }).Razorpay
  ) {
    return Promise.resolve();
  }

  if (razorpayScriptPromise) {
    return razorpayScriptPromise;
  }

  razorpayScriptPromise = new Promise<void>((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("Could not load Razorpay checkout."));
      return;
    }

    const existingScript = document.querySelector(
      'script[src="https://checkout.razorpay.com/v1/checkout.js"]',
    );

    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(), { once: true });
      existingScript.addEventListener(
        "error",
        () => reject(new Error("Could not load Razorpay checkout.")),
        { once: true },
      );
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () =>
      reject(new Error("Could not load Razorpay checkout."));
    document.body.appendChild(script);
  }).catch((error) => {
    razorpayScriptPromise = null;
    throw error;
  });

  return razorpayScriptPromise;
}
