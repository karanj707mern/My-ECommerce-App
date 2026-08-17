"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getProfile } from "@/lib/api/auth";
import {
  clearCart,
  getCart,
  removeCartItem,
  updateCartItem,
  addCartItem,
} from "@/lib/api/cart";
import { getWishlist, removeFromWishlist } from "@/lib/api/wishlist";
import { getStoreSettings } from "@/lib/api/settings";
import {
  clearToken,
  setCurrentUser,
  useAuthChecked,
  useCurrentUser,
  notifyCartChanged,
  notifyWishlistChanged,
} from "@/lib/storage";
import { useToast } from "@/hooks/useToast";
import useAutoDismiss from "@/hooks/useAutoDismiss";
import { usePreviewMode } from "@/hooks/usePreviewMode";

const DEFAULT_ADDRESS_FORM = {
  recipientName: "",
  phoneNumber: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  postalCode: "",
  country: "India",
};

export interface CartItem {
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

export interface StoreSettings {
  shippingCharge: number;
  expressShippingCharge: number;
  sameDayShippingCharge: number;
  codCharge: number;
  handlingCharge: number;
  taxRate: number;
  freeShippingThreshold: number | null;
  shippingOptions: Array<{
    key: string;
    label: string;
    amount: number;
    etaDays: number;
  }>;
}

export function useCartLogic() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentUser = useCurrentUser() as Record<string, unknown> | null;
  const authChecked = useAuthChecked();
  const currentUserId = currentUser?.id;
  const { previewMode } = usePreviewMode();
  const toast = useToast();

  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [wishlistItems, setWishlistItems] = useState<Record<string, unknown>[]>(
    [],
  );
  const filteredWishlistItems = useMemo(
    () =>
      wishlistItems.filter(
        (item) => !cartItems.some((cartItem) => cartItem.id === item.id),
      ),
    [wishlistItems, cartItems],
  );
  const [savedAddresses, setSavedAddresses] = useState<
    Record<string, unknown>[]
  >([]);
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [error, setError] = useState("");
  const [storeSettings, setStoreSettings] = useState<StoreSettings>({
    shippingCharge: 99,
    expressShippingCharge: 149,
    sameDayShippingCharge: 249,
    codCharge: 25,
    handlingCharge: 20,
    taxRate: 0,
    freeShippingThreshold: null,
    shippingOptions: [],
  });
  const [selectedShippingType, setSelectedShippingType] = useState("standard");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("online");
  const [startingCheckout, setStartingCheckout] = useState(false);
  const [addingToCartId, setAddingToCartId] = useState<string | number | null>(
    null,
  );
  const [promoCode, setPromoCode] = useState("");
  const [pricingPreview, setPricingPreview] = useState<Record<
    string,
    unknown
  > | null>(null);
  const [addressForm, setAddressForm] =
    useState<AddressForm>(DEFAULT_ADDRESS_FORM);

  useAutoDismiss(error, () => setError(""), 5000);

  const isAdmin =
    (currentUser as Record<string, unknown> | null)?.role === "ADMIN";
  const isLoggedIn = Boolean(currentUserId);

  const resetCheckoutDetails = useCallback(() => {
    setSelectedAddressId("");
    setSelectedShippingType("standard");
    setSelectedPaymentMethod("online");
    setPromoCode("");
    setPricingPreview(null);
    setAddressForm(DEFAULT_ADDRESS_FORM);
  }, []);

  const redirectToAuth = useCallback(() => {
    clearToken();
    router.push(
      "/auth?from=" +
        encodeURIComponent("/cart") +
        "&authMessage=" +
        encodeURIComponent("Sign in to view your cart."),
    );
  }, [router]);

  const handleAddToCart = async (product: Record<string, unknown>) => {
    const productId = product.id as string | number;
    if (
      !previewMode &&
      (currentUser as Record<string, unknown> | null)?.role === "ADMIN"
    ) {
      toast.showToast({
        severity: "warning",
        summary: "Cannot add",
        detail: "Admin accounts cannot add products to cart or place orders.",
        life: 4000,
      });
      return;
    }

    if ((product.stock as number) <= 0) {
      toast.showToast({
        severity: "warning",
        summary: "Out of stock",
        detail: "This item is currently out of stock.",
        life: 4000,
      });
      return;
    }

    if (addingToCartId === productId) {
      return;
    }

    setAddingToCartId(productId);
    try {
      const updatedCart = await addCartItem(productId);
      setCartItems(
        Array.isArray(updatedCart) ? (updatedCart as CartItem[]) : [],
      );
      notifyCartChanged();
      setError("");
      toast.showToast({
        severity: "success",
        summary: "Added to cart",
        detail: `${product.name as string} was added to your cart.`,
        life: 3000,
      });
    } catch (err) {
      setError((err as Error).message || "Could not add item to cart.");
    } finally {
      setAddingToCartId(null);
    }
  };

   const handleRemoveWishlistItem = async (productId: string | number) => {
     try {
       await removeFromWishlist(productId);
       setWishlistItems((prev) => prev.filter((item) => item.id !== productId));
       notifyWishlistChanged();
       toast.showToast({
        severity: "error",
        summary: "Removed",
        detail: "Removed from your wishlist.",
        life: 3000,
      });
    } catch {
      // ignore
    }
  };

  const handleLogout = useCallback(() => {
    clearToken();
    router.push("/auth?from=" + encodeURIComponent("/cart"));
  }, [router]);

  useEffect(() => {
    if (!authChecked) {
      return;
    }

    if (!currentUserId) {
      const loadGuestCart = async () => {
        getCart()
          .then((items) => {
            setCartItems(Array.isArray(items) ? (items as CartItem[]) : []);
            setError("");
          })
          .catch((err) => {
            if ((err as Error & { status: number }).status === 401) {
              redirectToAuth();
              return;
            }
            setError((err as Error).message || "Could not load your cart.");
          });

        getWishlist()
          .then((items) => {
            setWishlistItems(
              Array.isArray(items) ? (items as Record<string, unknown>[]) : [],
            );
          })
          .catch(() => {
            setWishlistItems([]);
          });
      };

      loadGuestCart();
      getStoreSettings()
        .then((settings) => {
          setStoreSettings(settings as StoreSettings);
        })
        .catch(() => {});
      return;
    }

    getProfile()
      .then((data) => {
        const profileData = data as { user: Record<string, unknown> };
        setCurrentUser(profileData.user);

        const nextSavedAddresses =
          (profileData.user.addresses as Record<string, unknown>[]) ?? [];
        const defaultAddress =
          (nextSavedAddresses.find((address) => address.isDefault) as Record<
            string,
            unknown
          > | null) ?? null;

        setSavedAddresses(nextSavedAddresses);
        setSelectedAddressId(defaultAddress ? String(defaultAddress.id) : "");
        setAddressForm((currentForm) =>
          defaultAddress
            ? {
                ...currentForm,
                recipientName:
                  (defaultAddress.recipientName as string) ??
                  currentForm.recipientName,
                phoneNumber:
                  (defaultAddress.phoneNumber as string) ??
                  currentForm.phoneNumber,
                addressLine1:
                  (defaultAddress.addressLine1 as string) ??
                  currentForm.addressLine1,
                addressLine2:
                  (defaultAddress.addressLine2 as string) ??
                  currentForm.addressLine2,
                city: (defaultAddress.city as string) ?? currentForm.city,
                state: (defaultAddress.state as string) ?? currentForm.state,
                postalCode:
                  (defaultAddress.postalCode as string) ??
                  currentForm.postalCode,
                country:
                  (defaultAddress.country as string) ?? currentForm.country,
              }
            : {
                ...currentForm,
                recipientName:
                  (profileData.user.name as string) ??
                  currentForm.recipientName,
                phoneNumber:
                  (profileData.user.phoneNumber as string) ??
                  currentForm.phoneNumber,
                addressLine1:
                  (profileData.user.addressLine1 as string) ??
                  currentForm.addressLine1,
                addressLine2:
                  (profileData.user.addressLine2 as string) ??
                  currentForm.addressLine2,
                city: (profileData.user.city as string) ?? currentForm.city,
                state: (profileData.user.state as string) ?? currentForm.state,
                postalCode:
                  (profileData.user.postalCode as string) ??
                  currentForm.postalCode,
                country:
                  (profileData.user.country as string) ?? currentForm.country,
              },
        );

        getCart()
          .then((items) => {
            setCartItems(Array.isArray(items) ? (items as CartItem[]) : []);
            setError("");
          })
          .catch((err) => {
            if ((err as Error & { status: number }).status === 401) {
              redirectToAuth();
              return;
            }
            setError((err as Error).message || "Could not load your cart.");
          });

        getWishlist()
          .then((items) => {
            setWishlistItems(
              Array.isArray(items) ? (items as Record<string, unknown>[]) : [],
            );
          })
          .catch(() => {
            setWishlistItems([]);
          });
      })
      .catch((err) => {
        if ((err as Error & { status: number }).status === 401) {
          redirectToAuth();
          return;
        }
        setError((err as Error).message || "Could not load your profile.");
      });
  }, [authChecked, currentUserId, router, redirectToAuth]);

  useEffect(() => {
    const cartMessage = searchParams.get("cartMessage");
    if (!cartMessage) return;
    toast.showToast({
      severity: "info",
      detail: cartMessage,
      life: 4000,
    });
  }, [searchParams, toast]);

  const itemCount = useMemo(
    () => cartItems.reduce((total, item) => total + item.quantity, 0),
    [cartItems],
  );
  const subtotal = useMemo(
    () =>
      cartItems.reduce(
        (total, item) => total + Number(item.product.price) * item.quantity,
        0,
      ),
    [cartItems],
  );
  const qualifiesForFreeShipping =
    storeSettings.freeShippingThreshold !== null &&
    subtotal >= storeSettings.freeShippingThreshold;
  const selectedShippingOption = storeSettings.shippingOptions.find(
    (option) => option.key === selectedShippingType,
  ) ||
    storeSettings.shippingOptions[0] || {
      key: "standard",
      label: "Standard Delivery",
      amount: Number(storeSettings.shippingCharge) || 0,
      etaDays: 4,
    };
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
    pricingPreview?.total ?? subtotal + shipping + handling + codCharge + tax,
  );
  const canCheckout =
    cartItems.length > 0 &&
    (() => {
      if (!addressForm.recipientName.trim()) return false;
      if (!addressForm.phoneNumber.trim()) return false;
      if (!addressForm.addressLine1.trim()) return false;
      if (!addressForm.city.trim()) return false;
      if (!addressForm.state.trim()) return false;
      if (!addressForm.postalCode.trim()) return false;
      if (!addressForm.country.trim()) return false;
      return true;
    })() &&
    !startingCheckout;

  useEffect(() => {
    if (cartItems.length === 0 || !canCheckout) {
      setPricingPreview(null);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      import("@/lib/api/order")
        .then(({ previewCheckout }) =>
          previewCheckout({
            ...addressForm,
            shippingType: selectedShippingType,
            paymentMethod: selectedPaymentMethod,
            promoCode: promoCode.trim() || undefined,
          }),
        )
        .then((data) => {
          setPricingPreview(data as Record<string, unknown>);
          setError("");
        })
        .catch((err) => {
          setPricingPreview(null);
          setError(
            (err as Error).message || "Could not apply checkout pricing.",
          );
        });
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [
    addressForm,
    cartItems.length,
    promoCode,
    selectedPaymentMethod,
    selectedShippingType,
    canCheckout,
  ]);

  const handleQuantityChange = async (
    itemId: string | number,
    nextQuantity: number,
  ) => {
    try {
      const updatedItemsRaw = await updateCartItem(itemId, nextQuantity);
      const updatedItems = Array.isArray(updatedItemsRaw)
        ? (updatedItemsRaw as CartItem[])
        : [];
      setCartItems(updatedItems);
      notifyCartChanged();
      setError("");
    } catch (err) {
      if ((err as Error & { status: number }).status === 401) {
        redirectToAuth();
        return;
      }
      setError((err as Error).message || "Could not update cart item.");
    }
  };

  const handleRemoveItem = async (
    itemId: string | number,
    itemName: string,
  ) => {
    try {
      const updatedItemsRaw = await removeCartItem(itemId);
      const updatedItems = Array.isArray(updatedItemsRaw)
        ? (updatedItemsRaw as CartItem[])
        : [];
      setCartItems(updatedItems);
      notifyCartChanged();
      if (updatedItems.length === 0) {
        resetCheckoutDetails();
      }
      setError("");
      toast.showToast({
        severity: "info",
        summary: "Removed",
        detail: `${itemName} was removed from your cart.`,
        life: 3000,
      });
    } catch (err) {
      if ((err as Error & { status: number }).status === 401) {
        redirectToAuth();
        return;
      }
      setError((err as Error).message || "Could not remove cart item.");
    }
  };

  const handleClearCart = async () => {
    try {
      await clearCart();
      setCartItems([]);
      notifyCartChanged();
      resetCheckoutDetails();
      setError("");
      toast.showToast({
        severity: "info",
        summary: "Cart cleared",
        detail: "Your cart has been cleared.",
        life: 3000,
      });
    } catch (err) {
      if ((err as Error & { status: number }).status === 401) {
        redirectToAuth();
        return;
      }
      setError((err as Error).message || "Could not clear your cart.");
    }
  };

  const handleCheckout = async () => {
    if (!previewMode && currentUser?.role === "ADMIN") {
      setError("Admin accounts cannot place orders.");
      return;
    }

    if (!currentUser) {
      redirectToAuth();
      return;
    }

    if (cartItems.length === 0) {
      setError("Add at least one item before checkout.");
      return;
    }

    if (!canCheckout) {
      setError("Complete the shipping address before continuing.");
      return;
    }

    const orderPayload = {
      ...addressForm,
      shippingType: selectedShippingType,
      paymentMethod: selectedPaymentMethod,
      promoCode: promoCode.trim() || undefined,
    };
    let session: Record<string, unknown> | null = null;
    let checkoutOpened = false;
    let paymentCompleted = false;

    try {
      setStartingCheckout(true);
      if (selectedPaymentMethod === "cod") {
        const { createOrder } = await import("@/lib/api/order");
        const order = (await createOrder(orderPayload)) as Record<
          string,
          unknown
        >;
        setError("");
        toast.showToast({
          severity: "success",
          summary: "Order placed",
          detail: `${order.orderTitle} placed successfully. Order number ${order.orderNumber}.`,
          life: 4000,
        });
        setTimeout(() => {
          router.push(
            "/orders?orderMessage=" +
              encodeURIComponent(
                `${order.orderTitle} placed successfully. Order number ${order.orderNumber}.`,
              ),
          );
        }, 100);
        return;
      }

      const { createCheckoutSession } = await import("@/lib/api/order");
      session = (await createCheckoutSession(orderPayload)) as Record<
        string,
        unknown
      >;
      setError("");

      await loadRazorpayScript();

      if (!session?.key || !session?.razorpayOrderId) {
        throw new Error("Razorpay checkout details were incomplete.");
      }

      const options = {
        key: session.key as string,
        amount: session.amount as number,
        currency: session.currency as string,
        order_id: session.razorpayOrderId as string,
        name: "Moringa Store",
        description: "Secure order payment",
        notes: {
          orderNumber: session.orderNumber,
        },
        handler: async function (response: Record<string, string>) {
          try {
            const checkoutSession = session as Record<string, unknown>;
            const { verifyPayment } = await import("@/lib/api/order");
            await verifyPayment({
              orderId: checkoutSession.orderId as string,
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });
            router.push(
              `/orders?payment=success&orderId=${checkoutSession.orderId as string}&orderNumber=${encodeURIComponent(checkoutSession.orderNumber as string)}`,
            );
            paymentCompleted = true;
          } catch (err) {
            setError(
              (err as Error).message ||
                "Payment verification failed. Please contact support.",
            );
          }
        },
        prefill: {
          name:
            addressForm.recipientName || (currentUser?.name as string) || "",
          email: currentUser?.email as string,
          contact: addressForm.phoneNumber,
        },
        modal: {
          ondismiss: async () => {
            if (paymentCompleted) {
              return;
            }

            try {
              const { cancelOrder } = await import("@/lib/api/order");
              await cancelOrder(session!.orderId as string | number);
              toast.showToast({
                severity: "warning",
                summary: "Payment cancelled",
                detail: "Payment was cancelled. Your cart is still available.",
                life: 4000,
              });
            } catch (dismissError) {
              setError(
                (dismissError as Error).message ||
                  "Payment was cancelled, but we could not clean up the pending order.",
              );
            }
          },
        },
        theme: {
          color: "#0f5132",
        },
      };

      const RazorpayConstructor = (
        window as unknown as {
          Razorpay: new (options: unknown) => {
            on: (
              event: string,
              handler: (response: Record<string, unknown>) => void,
            ) => void;
            open: () => void;
          };
        }
      ).Razorpay;
      const rzp = new RazorpayConstructor(options);
      rzp.on("payment.failed", async (response: Record<string, unknown>) => {
        const failureDescription =
          (response?.error as Record<string, string>)?.description ||
          (response?.error as Record<string, string>)?.reason ||
          "Payment failed before it could be completed.";

        setError(failureDescription);

        if ((session as Record<string, unknown> | null)?.orderId) {
          try {
            const { cancelOrder } = await import("@/lib/api/order");
            await cancelOrder(
              (session as Record<string, unknown>).orderId as string | number,
            );
          } catch {
            // Ignore cleanup failures
          }
        }
      });
      checkoutOpened = true;
      rzp.open();
    } catch (err) {
      if (session?.orderId && !checkoutOpened) {
        try {
          const { cancelOrder } = await import("@/lib/api/order");
          await cancelOrder(session.orderId as string | number);
        } catch {
          // Ignore cleanup failures
        }
      }
      if ((err as Error & { status: number }).status === 401) {
        redirectToAuth();
        return;
      }
      setError((err as Error).message || "Could not place your order.");
    } finally {
      setStartingCheckout(false);
    }
  };

  const handleAddressChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setAddressForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));
  };

  const handleSavedAddressSelect = (
    event: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    const nextId = event.target.value;
    setSelectedAddressId(nextId);

    const selectedAddress = savedAddresses.find(
      (address) => String(address.id) === nextId,
    );

    if (!selectedAddress) {
      return;
    }

    setAddressForm((currentForm) => ({
      ...currentForm,
      recipientName:
        (selectedAddress.recipientName as string) ?? currentForm.recipientName,
      phoneNumber:
        (selectedAddress.phoneNumber as string) ?? currentForm.phoneNumber,
      addressLine1:
        (selectedAddress.addressLine1 as string) ?? currentForm.addressLine1,
      addressLine2:
        (selectedAddress.addressLine2 as string) ?? currentForm.addressLine2,
      city: (selectedAddress.city as string) ?? currentForm.city,
      state: (selectedAddress.state as string) ?? currentForm.state,
      postalCode:
        (selectedAddress.postalCode as string) ?? currentForm.postalCode,
      country: (selectedAddress.country as string) ?? currentForm.country,
    }));
  };

  return {
    // State
    cartItems,
    wishlistItems,
    filteredWishlistItems,
    savedAddresses,
    selectedAddressId,
    error,
    storeSettings,
    selectedShippingType,
    selectedPaymentMethod,
    startingCheckout,
    addingToCartId,
    promoCode,
    pricingPreview,
    addressForm,
    isAdmin,
    isLoggedIn,
    currentUserId,
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
    canCheckout,

    // Actions
    setError,
    setPromoCode,
    setSelectedShippingType,
    setSelectedPaymentMethod,
    resetCheckoutDetails,
    handleAddToCart,
    handleRemoveWishlistItem,
    handleLogout,
    handleQuantityChange,
    handleRemoveItem,
    handleClearCart,
    handleCheckout,
    handleAddressChange,
    handleSavedAddressSelect,
    setSelectedAddressId,
  };
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
