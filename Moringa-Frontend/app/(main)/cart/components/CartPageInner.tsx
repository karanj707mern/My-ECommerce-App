"use client";

import Link from "next/link";
import { useCartLogic } from "../hooks/useCartLogic";
import { CartItemCard } from "./CartItemCard";
import { GuestPrompt } from "./GuestPrompt";
import { CartWishlistPreview } from "./CartWishlistPreview";
import { CheckoutSidebar } from "./CheckoutSidebar";

export function CartPageInner() {
  const {
    cartItems,
    filteredWishlistItems,
    savedAddresses,
    selectedAddressId,
    error,
    storeSettings,
    selectedShippingType,
    selectedPaymentMethod,
    startingCheckout,
    addingToCartId,
    pricingPreview,
    addressForm,
    isLoggedIn,
    itemCount,
    previewSubtotal,
    discount,
    previewShipping,
    previewHandling,
    previewCodCharge,
    previewTax,
    total,
    canCheckout,
    handleAddToCart,
    handleRemoveWishlistItem,
    handleQuantityChange,
    handleRemoveItem,
    handleClearCart,
    handleCheckout,
    handleAddressChange,
    handleSavedAddressSelect,
    setSelectedShippingType,
    setSelectedPaymentMethod,
  } = useCartLogic();

  const handleSignIn = () => {
    window.location.href =
      "/auth?from=" +
      encodeURIComponent("/cart") +
      "&authMessage=" +
      encodeURIComponent("Sign in to preserve your cart and checkout faster.");
  };

  return (
    <div className="theme-transition">
      <main>
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="pill-dark min-h-10 px-4 text-sm font-semibold">
                Items {itemCount}
              </span>
              <Link href="/orders" className="btn-nav">
                Orders
              </Link>
            </div>
            <Link href="/shop" className="btn-secondary">
              Continue shopping
            </Link>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-10">
          {error ? (
            <div className="mb-8 rounded-2xl border border-[var(--danger-border)] bg-[var(--danger-bg)] px-4 py-3 text-sm text-[var(--danger-text)]">
              {error}
            </div>
          ) : null}

          <div className="grid gap-8 lg:grid-cols-5">
            <div className="lg:col-span-3 space-y-5">
              <div className="flex flex-col gap-2">
                <p className="text-sm uppercase tracking-[0.1em] text-emerald-700 dark:text-emerald-300">
                  Cart Summary
                </p>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                  <h2 className="font-serif text-3xl text-[var(--text-primary)] sm:text-4xl">
                    {itemCount > 0
                      ? `${itemCount} item${itemCount > 1 ? "s" : ""} ready for checkout`
                      : "Your cart is empty"}
                  </h2>
                  {cartItems.length > 0 ? (
                    <button
                      type="button"
                      onClick={handleClearCart}
                      className="text-sm text-[var(--text-muted)] transition hover:text-[var(--text-primary)]"
                    >
                      Clear cart
                    </button>
                  ) : null}
                </div>
              </div>

              <section>
                {!isLoggedIn && cartItems.length > 0 ? (
                  <GuestPrompt onSignIn={handleSignIn} />
                ) : null}

                {cartItems.length === 0 ? (
                  <div className="rounded-[2rem] border border-dashed border-[var(--border-strong)] bg-[var(--bg-secondary)] p-8 text-center shadow-sm sm:p-10 card">
                    <h3 className="font-serif text-3xl text-[var(--text-primary)]">
                      Nothing here yet
                    </h3>
                    <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
                      Explore moringa products and add a few favorites to start
                      your cart.
                    </p>
                    <Link href="/" className="btn-primary mt-6">
                      Go to store
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-5">
                    {cartItems.map((item) => (
                      <CartItemCard
                        key={item.id as string | number}
                        item={item}
                        onRemove={handleRemoveItem}
                        onQuantityChange={handleQuantityChange}
                        addingToCartId={addingToCartId}
                      />
                    ))}
                  </div>
                )}
              </section>

              <CartWishlistPreview
                items={filteredWishlistItems}
                onAddToCart={handleAddToCart}
                onRemoveFromWishlist={handleRemoveWishlistItem}
              />
            </div>

            {cartItems.length > 0 ? (
              <div className="lg:col-span-2">
                <CheckoutSidebar
                  savedAddresses={savedAddresses}
                  selectedAddressId={selectedAddressId}
                  addressForm={addressForm}
                  storeSettings={storeSettings}
                  selectedShippingType={selectedShippingType}
                  selectedPaymentMethod={selectedPaymentMethod}
                  startingCheckout={startingCheckout}
                  itemCount={itemCount}
                  canCheckout={canCheckout}
                  pricingPreview={pricingPreview}
                  previewSubtotal={previewSubtotal}
                  discount={discount}
                  previewShipping={previewShipping}
                  previewHandling={previewHandling}
                  previewCodCharge={previewCodCharge}
                  previewTax={previewTax}
                  total={total}
                  onSavedAddressChange={handleSavedAddressSelect}
                  onAddressChange={handleAddressChange}
                  onShippingTypeChange={setSelectedShippingType}
                  onPaymentMethodChange={setSelectedPaymentMethod}
                  onCheckout={handleCheckout}
                />
              </div>
            ) : null}
          </div>
        </div>
      </main>
    </div>
  );
}
