import { $, component$, useSignal, useVisibleTask$, useTask$ } from "@builder.io/qwik";
import { Link, useLocation, useNavigate, type DocumentHead } from "@builder.io/qwik-city";
import { getProfile } from "../../../lib/api/auth";
import {
  addCartItem,
  clearCart,
  getCart,
  removeCartItem,
  updateCartItem,
} from "../../../lib/api/cart";
import { getWishlist, removeFromWishlist } from "../../../lib/api/wishlist";
import { getStoreSettings } from "../../../lib/api/settings";
import {
  cancelOrder,
  createCheckoutSession,
  createOrder,
  previewCheckout,
  verifyPayment,
} from "../../../lib/api/order";
import {
  clearToken,
  notifyCartChanged,
  notifyWishlistChanged,
  setCurrentUser,
} from "../../../lib/storage";
import {
  computeCartPricing,
  isCompleteAddress,
  loadRazorpayScript,
  DEFAULT_ADDRESS_FORM,
  DEFAULT_STORE_SETTINGS,
  type AddressForm,
  type ServerCartItem,
  type StoreSettings,
} from "../../../lib/cart";
import { useToast } from "../../../hooks/useToast";
import { useAutoDismiss } from "../../../hooks/useAutoDismiss";
import { useAuthState } from "../../../hooks/useAuthState";
import { CartItemCard } from "../../../components/cart/CartItemCard";
import { GuestPrompt } from "../../../components/cart/GuestPrompt";
import { CartWishlistPreview } from "../../../components/cart/CartWishlistPreview";
import { CheckoutSidebar } from "../../../components/cart/CheckoutSidebar";
import { buildHead } from "../../../lib/seo";

function hasStatus(err: unknown, status: number): boolean {
  return (err as { status?: number })?.status === status;
}

/**
 * Cart + checkout page. Port of legacy `useCartLogic` + cart components:
 * server-backed cart, guest prompt, wishlist cross-sell, address form with
 * saved addresses, shipping/payment selection, debounced pricing preview and
 * COD / Razorpay checkout flows.
 */
export default component$(() => {
  const loc = useLocation();
  const nav = useNavigate();
  const toast = useToast();
  const { currentUser, authChecked } = useAuthState();

  const cartItems = useSignal<ServerCartItem[]>([]);
  const wishlistItems = useSignal<Record<string, unknown>[]>([]);
  const savedAddresses = useSignal<Record<string, unknown>[]>([]);
  const selectedAddressId = useSignal("");
  const error = useSignal("");
  const storeSettings = useSignal<StoreSettings>({ ...DEFAULT_STORE_SETTINGS });
  const selectedShippingType = useSignal("standard");
  const selectedPaymentMethod = useSignal("online");
  const startingCheckout = useSignal(false);
  const addingToCartId = useSignal<string | number | null>(null);
  const promoCode = useSignal("");
  const pricingPreview = useSignal<Record<string, unknown> | null>(null);
  const addressForm = useSignal<AddressForm>({ ...DEFAULT_ADDRESS_FORM });

  useAutoDismiss(error, $(() => { error.value = ""; }), 5000);

  const isAdmin = currentUser.value?.role === "ADMIN";
  const isLoggedIn = !!currentUser.value;

  const filteredWishlistItems = cartItems.value
    ? wishlistItems.value.filter(
        (item) => !cartItems.value.some((cartItem) => cartItem.id === item.id),
      )
    : [];

  const pricing = computeCartPricing(
    cartItems.value,
    storeSettings.value,
    selectedShippingType.value,
    selectedPaymentMethod.value,
    pricingPreview.value,
  );

  const canCheckout =
    cartItems.value.length > 0 &&
    isCompleteAddress(addressForm.value) &&
    !startingCheckout.value;

  const resetCheckoutDetails = $(() => {
    selectedAddressId.value = "";
    selectedShippingType.value = "standard";
    selectedPaymentMethod.value = "online";
    promoCode.value = "";
    pricingPreview.value = null;
    addressForm.value = { ...DEFAULT_ADDRESS_FORM };
  });

  const redirectToAuth = $(async () => {
    clearToken();
    await nav(
      "/auth?from=" +
        encodeURIComponent("/cart") +
        "&authMessage=" +
        encodeURIComponent("Sign in to view your cart."),
    );
  });

  /* Load cart/wishlist/profile/settings once auth state settles. */
  useVisibleTask$(async ({ track }) => {
    if (!track(authChecked)) return;

    if (!currentUser.value) {
      try {
        const items = await getCart();
        cartItems.value = Array.isArray(items)
          ? (items as ServerCartItem[])
          : [];
        error.value = "";
      } catch (err) {
        if (hasStatus(err, 401)) {
          await redirectToAuth();
          return;
        }
        error.value =
          err instanceof Error && err.message
            ? err.message
            : "Could not load your cart.";
      }

      getWishlist()
        .then((items) => {
          wishlistItems.value = Array.isArray(items)
            ? (items as Record<string, unknown>[])
            : [];
        })
        .catch(() => {
          wishlistItems.value = [];
        });

      getStoreSettings()
        .then((settings) => {
          storeSettings.value = settings as StoreSettings;
        })
        .catch(() => {});
      return;
    }

    try {
      const data = (await getProfile()) as {
        user: Record<string, unknown>;
      };
      setCurrentUser(data.user);

      const nextSavedAddresses =
        (data.user.addresses as Record<string, unknown>[]) ?? [];
      const defaultAddress =
        (nextSavedAddresses.find((address) => address.isDefault) as Record<
          string,
          unknown
        > | null) ?? null;

      savedAddresses.value = nextSavedAddresses;
      selectedAddressId.value = defaultAddress
        ? String(defaultAddress.id)
        : "";

      const pick = (
        key: keyof AddressForm,
        source: string | undefined,
      ): string =>
        (source as string | undefined) ?? addressForm.value[key] ?? "";

      addressForm.value = {
        ...addressForm.value,
        ...(defaultAddress
          ? {
              recipientName: pick("recipientName", defaultAddress.recipientName as string),
              phoneNumber: pick("phoneNumber", defaultAddress.phoneNumber as string),
              addressLine1: pick("addressLine1", defaultAddress.addressLine1 as string),
              addressLine2: pick("addressLine2", defaultAddress.addressLine2 as string),
              city: pick("city", defaultAddress.city as string),
              state: pick("state", defaultAddress.state as string),
              postalCode: pick("postalCode", defaultAddress.postalCode as string),
              country: pick("country", defaultAddress.country as string),
            }
          : {
              recipientName: pick("recipientName", data.user.name as string),
              phoneNumber: pick("phoneNumber", data.user.phoneNumber as string),
              addressLine1: pick("addressLine1", data.user.addressLine1 as string),
              addressLine2: pick("addressLine2", data.user.addressLine2 as string),
              city: pick("city", data.user.city as string),
              state: pick("state", data.user.state as string),
              postalCode: pick("postalCode", data.user.postalCode as string),
              country: pick("country", data.user.country as string),
            }),
      };

      try {
        const items = await getCart();
        cartItems.value = Array.isArray(items)
          ? (items as ServerCartItem[])
          : [];
        error.value = "";
      } catch (err) {
        if (hasStatus(err, 401)) {
          await redirectToAuth();
          return;
        }
        error.value =
          err instanceof Error && err.message
            ? err.message
            : "Could not load your cart.";
      }

      getWishlist()
        .then((items) => {
          wishlistItems.value = Array.isArray(items)
            ? (items as Record<string, unknown>[])
            : [];
        })
        .catch(() => {
          wishlistItems.value = [];
        });
    } catch (err) {
      if (hasStatus(err, 401)) {
        await redirectToAuth();
        return;
      }
      error.value =
        err instanceof Error && err.message
          ? err.message
          : "Could not load your profile.";
    }
  });

  /* Show the post-login cart message once. */
  useVisibleTask$(() => {
    const cartMessage = new URL(loc.url.href).searchParams.get("cartMessage");
    if (!cartMessage) return;
    void toast.showToast({
      severity: "info",
      detail: cartMessage,
      life: 4000,
    });
  });

  /* Debounced checkout pricing preview. */
  useTask$(({ track, cleanup }) => {
    const itemsCount = track(() => cartItems.value.length);
    const form = track(() => ({ ...addressForm.value }));
    const shippingType = track(selectedShippingType);
    const paymentMethod = track(selectedPaymentMethod);
    const starting = track(startingCheckout);
    const code = track(promoCode);

    if (
      typeof window === "undefined" ||
      itemsCount === 0 ||
      !isCompleteAddress(form) ||
      starting
    ) {
      pricingPreview.value = null;
      return;
    }

    const timeoutId = window.setTimeout(async () => {
      try {
        const data = await previewCheckout({
          ...form,
          shippingType,
          paymentMethod,
          promoCode: code.trim() || undefined,
        });
        pricingPreview.value = data as Record<string, unknown>;
        error.value = "";
      } catch (err) {
        pricingPreview.value = null;
        error.value =
          err instanceof Error && err.message
            ? err.message
            : "Could not apply checkout pricing.";
      }
    }, 350);

    cleanup(() => window.clearTimeout(timeoutId));
  });

  const handleAddToCart = $(async (item: Record<string, unknown>) => {
    const productId = item.id as string | number;
    if (currentUser.value?.role === "ADMIN") {
      void toast.showToast({
        severity: "warning",
        summary: "Cannot add",
        detail: "Admin accounts cannot add products to cart or place orders.",
        life: 4000,
      });
      return;
    }

    if (Number(item.stock ?? 0) <= 0) {
      void toast.showToast({
        severity: "warning",
        summary: "Out of stock",
        detail: "This item is currently out of stock.",
        life: 4000,
      });
      return;
    }

    if (addingToCartId.value === productId) return;

    addingToCartId.value = productId;
    try {
      const updatedCart = await addCartItem(productId);
      cartItems.value = Array.isArray(updatedCart)
        ? (updatedCart as ServerCartItem[])
        : [];
      notifyCartChanged();
      error.value = "";
      await toast.showToast({
        severity: "success",
        summary: "Added to cart",
        detail: `${item.name as string} was added to your cart.`,
        life: 3000,
      });
    } catch (err) {
      error.value =
        err instanceof Error && err.message
          ? err.message
          : "Could not add item to cart.";
    } finally {
      addingToCartId.value = null;
    }
  });

  const handleRemoveWishlistItem = $(async (productId: string | number) => {
    try {
      await removeFromWishlist(productId);
      wishlistItems.value = wishlistItems.value.filter(
        (item) => item.id !== productId,
      );
      notifyWishlistChanged();
      await toast.showToast({
        severity: "error",
        summary: "Removed",
        detail: "Removed from your wishlist.",
        life: 3000,
      });
    } catch {
      // ignore
    }
  });

  const handleQuantityChange = $(
    async (itemId: string | number, nextQuantity: number) => {
      try {
        const updatedItemsRaw = await updateCartItem(itemId, nextQuantity);
        cartItems.value = Array.isArray(updatedItemsRaw)
          ? (updatedItemsRaw as ServerCartItem[])
          : [];
        notifyCartChanged();
        error.value = "";
      } catch (err) {
        if (hasStatus(err, 401)) {
          await redirectToAuth();
          return;
        }
        error.value =
          err instanceof Error && err.message
            ? err.message
            : "Could not update cart item.";
      }
    },
  );

  const handleRemoveItem = $(
    async (itemId: string | number, itemName: string) => {
      try {
        const updatedItemsRaw = await removeCartItem(itemId);
        const updatedItems = Array.isArray(updatedItemsRaw)
          ? (updatedItemsRaw as ServerCartItem[])
          : [];
        cartItems.value = updatedItems;
        notifyCartChanged();
        if (updatedItems.length === 0) {
          await resetCheckoutDetails();
        }
        error.value = "";
        await toast.showToast({
          severity: "info",
          summary: "Removed",
          detail: `${itemName} was removed from your cart.`,
          life: 3000,
        });
      } catch (err) {
        if (hasStatus(err, 401)) {
          await redirectToAuth();
          return;
        }
        error.value =
          err instanceof Error && err.message
            ? err.message
            : "Could not remove cart item.";
      }
    },
  );

  const handleClearCart = $(async () => {
    try {
      await clearCart();
      cartItems.value = [];
      notifyCartChanged();
      await resetCheckoutDetails();
      error.value = "";
      await toast.showToast({
        severity: "info",
        summary: "Cart cleared",
        detail: "Your cart has been cleared.",
        life: 3000,
      });
    } catch (err) {
      if (hasStatus(err, 401)) {
        await redirectToAuth();
        return;
      }
      error.value =
        err instanceof Error && err.message
          ? err.message
          : "Could not clear your cart.";
    }
  });

  const handleSavedAddressSelect = $(async (nextId: string) => {
    selectedAddressId.value = nextId;

    const selectedAddress = savedAddresses.value.find(
      (address) => String(address.id) === nextId,
    );
    if (!selectedAddress) return;

    addressForm.value = {
      ...addressForm.value,
      recipientName:
        (selectedAddress.recipientName as string) ??
        addressForm.value.recipientName,
      phoneNumber:
        (selectedAddress.phoneNumber as string) ??
        addressForm.value.phoneNumber,
      addressLine1:
        (selectedAddress.addressLine1 as string) ??
        addressForm.value.addressLine1,
      addressLine2:
        (selectedAddress.addressLine2 as string) ??
        addressForm.value.addressLine2,
      city: (selectedAddress.city as string) ?? addressForm.value.city,
      state: (selectedAddress.state as string) ?? addressForm.value.state,
      postalCode:
        (selectedAddress.postalCode as string) ?? addressForm.value.postalCode,
      country: (selectedAddress.country as string) ?? addressForm.value.country,
    };
  });

  const handleCheckout = $(async () => {
    if (currentUser.value?.role === "ADMIN") {
      error.value = "Admin accounts cannot place orders.";
      return;
    }

    if (!currentUser.value) {
      await redirectToAuth();
      return;
    }

    if (cartItems.value.length === 0) {
      error.value = "Add at least one item before checkout.";
      return;
    }

    if (!canCheckout) {
      error.value = "Complete the shipping address before continuing.";
      return;
    }

    const orderPayload = {
      ...addressForm.value,
      shippingType: selectedShippingType.value,
      paymentMethod: selectedPaymentMethod.value,
      promoCode: promoCode.value.trim() || undefined,
    };

    let session: Record<string, unknown> | null = null;
    let checkoutOpened = false;
    let paymentCompleted = false;

    try {
      startingCheckout.value = true;

      if (selectedPaymentMethod.value === "cod") {
        const order = (await createOrder(orderPayload)) as Record<
          string,
          unknown
        >;
        error.value = "";
        await toast.showToast({
          severity: "success",
          summary: "Order placed",
          detail: `${order.orderTitle} placed successfully. Order number ${order.orderNumber}.`,
          life: 4000,
        });
        setTimeout(() => {
          void nav(
            "/orders?orderMessage=" +
              encodeURIComponent(
                `${order.orderTitle} placed successfully. Order number ${order.orderNumber}.`,
              ),
          );
        }, 100);
        return;
      }

      session = (await createCheckoutSession(orderPayload)) as Record<
        string,
        unknown
      >;
      error.value = "";

      await loadRazorpayScript();

      if (!session?.key || !session?.razorpayOrderId) {
        throw new Error("Razorpay checkout details were incomplete.");
      }

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

      const rzp = new RazorpayConstructor({
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
            await verifyPayment({
              orderId: checkoutSession.orderId as string,
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });
            await nav(
              `/orders?payment=success&orderId=${checkoutSession.orderId as string}&orderNumber=${encodeURIComponent(checkoutSession.orderNumber as string)}`,
            );
            paymentCompleted = true;
          } catch (err) {
            error.value =
              (err instanceof Error && err.message) ||
              "Payment verification failed. Please contact support.";
          }
        },
        prefill: {
          name:
            addressForm.value.recipientName ||
            ((currentUser.value?.name as string) ?? ""),
          email: currentUser.value?.email as string,
          contact: addressForm.value.phoneNumber,
        },
        modal: {
          ondismiss: async () => {
            if (paymentCompleted) return;

            try {
              await cancelOrder(session!.orderId as string | number);
              void toast.showToast({
                severity: "warning",
                summary: "Payment cancelled",
                detail:
                  "Payment was cancelled. Your cart is still available.",
                life: 4000,
              });
            } catch (dismissError) {
              error.value =
                (dismissError instanceof Error && dismissError.message) ||
                "Payment was cancelled, but we could not clean up the pending order.";
            }
          },
        },
        theme: {
          color: "#0f5132",
        },
      });

      rzp.on("payment.failed", async (response: Record<string, unknown>) => {
        const failureDescription =
          (response?.error as Record<string, string> | undefined)?.description ||
          (response?.error as Record<string, string> | undefined)?.reason ||
          "Payment failed before it could be completed.";

        error.value = failureDescription;

        if (session?.orderId) {
          try {
            await cancelOrder(session.orderId as string | number);
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
          await cancelOrder(session.orderId as string | number);
        } catch {
          // Ignore cleanup failures
        }
      }
      if (hasStatus(err, 401)) {
        await redirectToAuth();
        return;
      }
      error.value =
        err instanceof Error && err.message
          ? err.message
          : "Could not place your order.";
    } finally {
      startingCheckout.value = false;
    }
  });

  const handleSignIn = $(async () => {
    await nav(
      "/auth?from=" +
        encodeURIComponent("/cart") +
        "&authMessage=" +
        encodeURIComponent(
          "Sign in to preserve your cart and checkout faster.",
        ),
    );
  });

  return (
    <div class="min-h-screen bg-[var(--bg-primary)] pb-24 text-[var(--text-primary)] theme-transition">
      <main>
        <div class="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-10">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div class="flex items-center gap-3">
              <span class="pill-dark min-h-10 px-4 text-sm font-semibold">
                Items {pricing.itemCount}
              </span>
              <Link href="/orders" class="btn-nav">
                Orders
              </Link>
            </div>
            <Link href="/shop" class="btn-secondary">
              Continue shopping
            </Link>
          </div>
        </div>

        <div class="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-10">
          {error.value ? (
            <div
              class="mb-8 rounded-2xl border border-[var(--danger-border)] bg-[var(--danger-bg)] px-4 py-3 text-sm text-[var(--danger-text)]"
              role="alert"
            >
              {error.value}
            </div>
          ) : null}

          <div class="grid gap-8 lg:grid-cols-5">
            <div class="space-y-5 lg:col-span-3">
              <div class="flex flex-col gap-2">
                <p class="text-sm uppercase tracking-[0.1em] text-emerald-700 dark:text-emerald-300">
                  Cart Summary
                </p>
                <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                  <h2 class="font-serif text-3xl text-[var(--text-primary)] sm:text-4xl">
                    {pricing.itemCount > 0
                      ? `${pricing.itemCount} item${pricing.itemCount > 1 ? "s" : ""} ready for checkout`
                      : "Your cart is empty"}
                  </h2>
                  {cartItems.value.length > 0 ? (
                    <button
                      type="button"
                      onClick$={handleClearCart}
                      class="text-sm text-[var(--text-muted)] transition hover:text-[var(--text-primary)]"
                    >
                      Clear cart
                    </button>
                  ) : null}
                </div>
              </div>

              <section>
                {!isLoggedIn && cartItems.value.length > 0 ? (
                  <GuestPrompt onSignIn$={handleSignIn} />
                ) : null}

                {cartItems.value.length === 0 ? (
                  <div class="card rounded-[2rem] border border-dashed border-[var(--border-strong)] bg-[var(--bg-secondary)] p-8 text-center shadow-sm sm:p-10">
                    <h3 class="font-serif text-3xl text-[var(--text-primary)]">
                      Nothing here yet
                    </h3>
                    <p class="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
                      Explore moringa products and add a few favorites to start
                      your cart.
                    </p>
                    <Link href="/" class="btn-primary mt-6 inline-flex">
                      Go to store
                    </Link>
                  </div>
                ) : (
                  <div class="space-y-5">
                    {cartItems.value.map((item) => (
                      <CartItemCard
                        key={String(item.id)}
                        item={item}
                        onRemove$={handleRemoveItem}
                        onQuantityChange$={handleQuantityChange}
                        addingToCartId={addingToCartId.value}
                      />
                    ))}
                  </div>
                )}
              </section>

              <CartWishlistPreview
                items={filteredWishlistItems}
                onAddToCart$={handleAddToCart}
                onRemoveFromWishlist$={handleRemoveWishlistItem}
              />
            </div>

            {cartItems.value.length > 0 ? (
              <div class="lg:col-span-2">
                <CheckoutSidebar
                  savedAddresses={savedAddresses.value}
                  selectedAddressId={selectedAddressId}
                  addressForm={addressForm}
                  storeSettings={storeSettings.value}
                  selectedShippingType={selectedShippingType}
                  selectedPaymentMethod={selectedPaymentMethod}
                  startingCheckout={startingCheckout.value}
                  itemCount={pricing.itemCount}
                  canCheckout={canCheckout}
                  pricingPreview={pricingPreview.value}
                  previewSubtotal={pricing.previewSubtotal}
                  discount={pricing.discount}
                  previewShipping={pricing.previewShipping}
                  previewHandling={pricing.previewHandling}
                  previewCodCharge={pricing.previewCodCharge}
                  previewTax={pricing.previewTax}
                  total={pricing.total}
                  onSavedAddressSelect$={handleSavedAddressSelect}
                  onShippingTypeChange$={(key) => {
                    selectedShippingType.value = key;
                  }}
                  onPaymentMethodChange$={(method) => {
                    selectedPaymentMethod.value = method;
                  }}
                  onCheckout$={handleCheckout}
                />
              </div>
            ) : null}
          </div>
        </div>
      </main>
    </div>
  );
});

export const head: DocumentHead = () =>
  buildHead({
    title: "Your Cart",
    description:
      "Review the moringa products in your cart, choose shipping and payment, and check out securely.",
    path: "/cart",
  });
