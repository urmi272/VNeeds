// ===== Wishlist (stored per-user in Firestore so it follows them across devices) =====

function wishlistRef(uid) {
  return db.collection("wishlists").doc(uid);
}

async function getWishlist(uid) {
  const snap = await wishlistRef(uid).get();
  return snap.exists ? (snap.data().productIds || []) : [];
}

async function toggleWishlistItem(uid, productId) {
  const ref = wishlistRef(uid);
  const snap = await ref.get();
  const ids = snap.exists ? (snap.data().productIds || []) : [];
  const has = ids.includes(productId);
  const next = has ? ids.filter(id => id !== productId) : [...ids, productId];
  await ref.set({ productIds: next }, { merge: true });
  return !has; // true if now wishlisted
}
