// ===== Orders (buy flow, chat, lifecycle) =====

const ordersCol = db.collection("orders");

async function createOrder(product, buyer, paymentMethod) {
  const doc = {
    productId: product.id,
    productName: product.name,
    productImg: product.img,
    price: product.price,
    buyerUid: buyer.uid,
    buyerName: buyer.displayName || buyer.email,
    sellerUid: product.sellerUid,
    sellerName: product.sellerName,
    paymentMethod,
    status: "pending", // pending -> confirmed -> completed  |  cancelled
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  };
  const ref = await ordersCol.add(doc);
  await pushNotification(product.sellerUid,
    `📦 New order for "${product.name}" from ${doc.buyerName}`, `orders.html`);
  return ref.id;
}

async function updateOrderStatus(orderId, status) {
  const snap = await ordersCol.doc(orderId).get();
  const order = snap.data();
  await ordersCol.doc(orderId).set({ status }, { merge: true });

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
