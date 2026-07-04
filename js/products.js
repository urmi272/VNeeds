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

// Adds a handful of realistic sample listings so the Buy page isn't empty
// while testing. Safe to run more than once — just adds more demo items.
async function seedDemoProducts(user, block) {
  const samples = [
    { name: "Maggi Noodles (2-min)", price: 40, category: "food", desc: "Fresh pack, 2 available. Perfect for late-night cravings.", emoji: "🍜" },
    { name: "Cold Coffee (Chilled)", price: 60, category: "food", desc: "Homemade cold coffee, ready to grab from my room.", emoji: "☕" },
    { name: "Oversized Hoodie (M)", price: 450, category: "clothes", desc: "Barely worn, size M, navy blue.", emoji: "🧥" },
    { name: "Denim Jacket (L)", price: 600, category: "clothes", desc: "Great condition, selling since it doesn't fit anymore.", emoji: "🧥" },
    { name: "Nivea Face Wash", price: 120, category: "cosmetics", desc: "Sealed pack, extra one I don't need.", emoji: "🧴" },
    { name: "Perfume - Axe Dark Temptation", price: 250, category: "cosmetics", desc: "90% full bottle, authentic.", emoji: "🧴" },
    { name: "Instant Noodles Combo Pack", price: 150, category: "food", desc: "Pack of 6, mixed flavors.", emoji: "🍜" },
    { name: "Formal Shirt (Blue, L)", price: 350, category: "clothes", desc: "Worn twice, great for interviews.", emoji: "👔" }
  ];

  const svgFor = (emoji) => "data:image/svg+xml;utf8," + encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300'>
       <rect width='100%' height='100%' fill='#EDEBFF'/>
       <text x='50%' y='55%' font-size='90' text-anchor='middle' dominant-baseline='middle'>${emoji}</text>
     </svg>`
  );

  const batch = db.batch();
  samples.forEach(s => {
    const ref = productsCol.doc();
    batch.set(ref, {
      name: s.name, price: s.price, category: s.category, desc: s.desc,
      img: svgFor(s.emoji),
      block, upi: "demo@upi",
      sellerUid: user.uid,
      sellerName: (user.displayName || user.email) + " (demo)",
      status: "in", avgRating: 0, ratingCount: 0,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  });
  await batch.commit();
}

// Live subscription — call unsubscribe() when leaving the page
function watchProducts(onChange) {
  return productsCol.orderBy("createdAt", "desc").onSnapshot(snap => {
    onChange(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
}