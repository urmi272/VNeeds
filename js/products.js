// ===== Products (Firestore-backed) =====

const productsCol = db.collection("products");

function resizeImage(file, maxWidth, maxHeight, quality = 0.6) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > height) {
          if (width > maxWidth) { height *= maxWidth / width; width = maxWidth; }
        } else {
          if (height > maxHeight) { width *= maxHeight / height; height = maxHeight; }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width; canvas.height = height;
        canvas.getContext("2d").drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function addProduct({ name, price, category, desc, imgFile, block, upi }, user) {
  const img = await resizeImage(imgFile, 500, 500, 0.5);
  const doc = {
    name, price, category, desc, img, block, upi,
    sellerUid: user.uid,
    sellerName: user.displayName || user.email,
    status: "in",
    avgRating: 0,
    ratingCount: 0,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  };
  const ref = await productsCol.add(doc);
  return ref.id;
}

async function updateProduct(id, fields) {
  await productsCol.doc(id).set(fields, { merge: true });
}

async function deleteProduct(id) {
  await productsCol.doc(id).delete();
}

async function getProduct(id) {
  const snap = await productsCol.doc(id).get();
  return snap.exists ? { id: snap.id, ...snap.data() } : null;
}

// One-time fetch of all products, newest first
async function fetchAllProducts() {
  const snap = await productsCol.orderBy("createdAt", "desc").get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

async function fetchMyProducts(uid) {
  const snap = await productsCol.where("sellerUid", "==", uid).get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// Live subscription — call unsubscribe() when leaving the page
function watchProducts(onChange) {
  return productsCol.orderBy("createdAt", "desc").onSnapshot(snap => {
    onChange(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
}
