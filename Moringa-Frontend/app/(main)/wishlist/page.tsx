import WishlistClient from "./WishlistClient";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default function WishlistPage() {
  return <WishlistClient />;
}
