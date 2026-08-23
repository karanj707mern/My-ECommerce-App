import { apiRequest } from "./http";

export type GiftCardAdmin = {
  id: number;
  code: string;
  initialAmount: number;
  remainingAmount: number;
  currency: string;
  isActive: boolean;
  redeemedBy: number | null;
  redeemedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
  lastUsedAt: string | null;
};

export type GiftCardBalance = {
  id: number;
  code: string;
  initialAmount: number;
  remainingAmount: number;
  currency: string;
  isActive: boolean;
  redeemedAt: string | null;
  expiresAt: string | null;
  lastUsedAt: string | null;
};

export async function getAdminGiftCards() {
  return apiRequest<GiftCardAdmin[]>("/gift-card");
}

export async function createGiftCard(payload: Record<string, unknown>) {
  return apiRequest<GiftCardAdmin>("/gift-card", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateGiftCard(
  giftCardId: string | number,
  payload: Record<string, unknown>,
) {
  return apiRequest<GiftCardAdmin>(`/gift-card/${giftCardId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function removeGiftCard(giftCardId: string | number) {
  return apiRequest<void>(`/gift-card/${giftCardId}`, {
    method: "DELETE",
  });
}

export async function redeemGiftCard(code: string) {
  return apiRequest<GiftCardBalance>("/gift-card/redeem", {
    method: "POST",
    body: JSON.stringify({ code }),
  });
}

export async function getGiftCardBalance(code: string) {
  return apiRequest<GiftCardBalance>(
    `/gift-card/balance?code=${encodeURIComponent(code)}`,
  );
}
