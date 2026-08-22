// ===== Pre-purchase chat =====
// Lets a buyer message a seller about a listing *before* placing an order.
// Stored separately from `orders` (which is the post-purchase thread) so a
// buyer can ask a question without creating a real order.

const conversationsCol = db.collection("conversations");

function conversationId(productId, buyerUid) {
  return `${productId}_${buyerUid}`;
}

// Creates the conversation on first contact, or just returns the existing
// one so the same buyer/product pair always lands in the same thread.
async function getOrCreateConversation(product, buyer) {
  const id = conversationId(product.id, buyer.uid);
  const ref = conversationsCol.doc(id);
  const snap = await ref.get();
  if (!snap.exists) {
    const doc = {
      productId: product.id,
      productName: product.name,
      productImg: product.img,
      price: product.price,
      buyerUid: buyer.uid,
      buyerName: buyer.displayName || buyer.email,
      sellerUid: product.sellerUid,
      sellerName: product.sellerName,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    await ref.set(doc);
    return { id, ...doc };
  }
  return { id, ...snap.data() };
}

function convMessagesCol(conversationId) {
  return conversationsCol.doc(conversationId).collection("messages");
}

async function sendConvMessage(conversationId, sender, text, otherUid, productName) {
  await convMessagesCol(conversationId).add({
    senderUid: sender.uid,
    senderName: sender.displayName || sender.email,
    text,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
  await pushNotification(otherUid,
    `New message about "${productName}": "${text.slice(0, 40)}"`, "orders.html");
}

function watchConvMessages(conversationId, onChange) {
  return convMessagesCol(conversationId).orderBy("createdAt", "asc")
    .onSnapshot(snap => onChange(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
}

// All conversations a user is part of, either side.
async function fetchConversationsFor(uid) {
  const [asBuyer, asSeller] = await Promise.all([
    conversationsCol.where("buyerUid", "==", uid).get(),
    conversationsCol.where("sellerUid", "==", uid).get()
  ]);
  const buying = asBuyer.docs.map(d => ({ id: d.id, role: "buyer", ...d.data() }));
  const selling = asSeller.docs.map(d => ({ id: d.id, role: "seller", ...d.data() }));
  return [...buying, ...selling];
}
