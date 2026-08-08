// ===== Orders (buy flow, chat, lifecycle) =====

const ordersCol = db.collection("orders");

// Runs the order-create + "mark item out of stock" as one atomic Firestore
// transaction, so two buyers clicking Buy on the same listing at the same
// moment can't both succeed — the second one fails with a clear error instead
// of silently creating a duplicate order for an item that's already gone.
// (Firestore security rules only allow this status flip to go from "in" ->
// "out", and only that single field — see firestore.rules.txt.)
async function createOrder(product, buyer, paymentMethod) {
  const productRef = productsCol.doc(product.id);
  const orderRef = ordersCol.doc();
  const buyerName = buyer.displayName || buyer.email;

  await db.runTransaction(async (tx) => {
    const productSnap = await tx.get(productRef);
    if (!productSnap.exists) throw new Error("This listing no longer exists.");
    const current = productSnap.data();
    if (current.status === "out") {
      throw new Error("Sorry — this item was just marked out of stock.");
    }

    tx.set(orderRef, {
      productId: product.id,
      productName: current.name,
      productImg: current.img,
      price: current.price,
      buyerUid: buyer.uid,
      buyerName,
      sellerUid: current.sellerUid,
      sellerName: current.sellerName,
      paymentMethod,
      status: "pending", // pending -> confirmed -> completed  |  cancelled
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    tx.update(productRef, { status: "out" });
  });

  await pushNotification(product.sellerUid,
    `📦 New order for "${product.name}" from ${buyerName}`, `orders.html`);
  return orderRef.id;
}

async function updateOrderStatus(orderId, status) {
  const snap = await ordersCol.doc(orderId).get();
  const order = snap.data();
  const fields = { status };
  if (status === "completed") fields.completedAt = firebase.firestore.FieldValue.serverTimestamp();
  await ordersCol.doc(orderId).set(fields, { merge: true });

  // Cancelling puts the item back in stock automatically instead of leaving
  // it stuck as "out" forever with no order to show for it.
  if (status === "cancelled" && order.productId) {
    try { await productsCol.doc(order.productId).set({ status: "in" }, { merge: true }); }
    catch (e) { console.error("Couldn't restore stock for cancelled order:", e); }
  }

  const messages = {
    confirmed: `✅ Your order for "${order.productName}" was confirmed by the seller`,
    completed: `🎉 Order for "${order.productName}" marked complete — leave a rating!`,
    cancelled: `❌ Order for "${order.productName}" was cancelled`
  };
  if (messages[status]) {
    await pushNotification(order.buyerUid, messages[status], "orders.html");
  }
}

async function fetchOrdersFor(uid) {
  const [asBuyer, asSeller] = await Promise.all([
    ordersCol.where("buyerUid", "==", uid).get(),
    ordersCol.where("sellerUid", "==", uid).get()
  ]);
  const buying = asBuyer.docs.map(d => ({ id: d.id, role: "buyer", ...d.data() }));
  const selling = asSeller.docs.map(d => ({ id: d.id, role: "seller", ...d.data() }));
  return { buying, selling };
}

// --- Chat (per-order message thread) ---
function messagesCol(orderId) {
  return ordersCol.doc(orderId).collection("messages");
}

async function sendMessage(orderId, sender, text, otherUid) {
  await messagesCol(orderId).add({
    senderUid: sender.uid,
    senderName: sender.displayName || sender.email,
    text,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
  await pushNotification(otherUid, `💬 New message: "${text.slice(0, 40)}"`, "orders.html");
}

function watchMessages(orderId, onChange) {
  return messagesCol(orderId).orderBy("createdAt", "asc")
    .onSnapshot(snap => onChange(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
}
