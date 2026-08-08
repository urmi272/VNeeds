// ===== Ratings =====

// orderId is required (and checked server-side by the Firestore rules) so a
// rating can only be left by someone who actually completed an order for this
// exact product — otherwise anyone signed in could rate anything.
async function submitRating(productId, buyerUid, stars, comment, orderId) {
  const productRef = db.collection("products").doc(productId);
  const ratingRef = productRef.collection("ratings").doc(buyerUid);

  await db.runTransaction(async (tx) => {
    const productSnap = await tx.get(productRef);
    const ratingSnap = await tx.get(ratingRef);
    if (!productSnap.exists) throw new Error("Product no longer exists");

    const data = productSnap.data();
    const prevStars = ratingSnap.exists ? ratingSnap.data().stars : null;

    let count = data.ratingCount || 0;
    let total = (data.avgRating || 0) * count;

    if (prevStars !== null) {
      total = total - prevStars + stars; // updating an existing rating
    } else {
      total += stars;
      count += 1;
    }

    tx.set(ratingRef, {
      stars, comment, buyerUid, orderId,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    tx.set(productRef, { avgRating: total / count, ratingCount: count }, { merge: true });
  });
}

async function fetchRatings(productId) {
  const snap = await db.collection("products").doc(productId)
    .collection("ratings").orderBy("createdAt", "desc").get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

function starString(avg) {
  const full = Math.round(avg);
  return "★".repeat(full) + "☆".repeat(5 - full);
}
