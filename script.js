let products = JSON.parse(localStorage.getItem("products")) || [
  {id:1, name:"Maggie Pack", category:"food", price:40, desc:"Tasty instant noodles", img:"https://via.placeholder.com/150", seller:"system"},
  {id:2, name:"T-Shirt", category:"clothes", price:250, desc:"Casual cotton T-shirt", img:"https://via.placeholder.com/150", seller:"system"},
  {id:3, name:"Lipstick", category:"cosmetics", price:120, desc:"Matte red lipstick", img:"https://via.placeholder.com/150", seller:"system"}
];

let wishlist = JSON.parse(localStorage.getItem("wishlist")) || [];

// Navigation
function openBuy() {
  showPage("dashboard");
  loadProducts(products);
}
function openSell() { showPage("auth"); }

function showPage(id) {
  document.querySelectorAll(".page").forEach(p=>p.classList.remove("active"));
  document.getElementById(id).classList.add("active");
  if(id==="wishlistPage") loadWishlist();
}

// Login/Register
function login() {
  let email = document.getElementById("email").value;
  if(email.endsWith("@vitbhopal.ac.in")) {
    localStorage.setItem("user", email);
    showPage("dashboard");
    loadProducts(products);
  } else {
    document.getElementById("error").innerText = "Use only college email (@vitbhopal.ac.in)";
  }
}
function logout() {
  localStorage.removeItem("user");
  showPage("landing");
}

// Product display
function loadProducts(list) {
  let container = document.getElementById("productList");
  container.innerHTML = "";
  list.forEach(p=>{
    let div = document.createElement("div");
    div.className = "product";
    div.innerHTML = `
      <img src="${p.img}">
      <h4>${p.name}</h4>
      <p>₹${p.price}</p>
      <span class="wishlist ${wishlist.includes(p.id) ? 'active':''}" onclick="toggleWishlist(${p.id}, this); event.stopPropagation();">♥</span>
    `;
    div.onclick = ()=>openModal(p);
    container.appendChild(div);
  });
}

// Wishlist
function toggleWishlist(id, el) {
  if(wishlist.includes(id)) {
    wishlist = wishlist.filter(x=>x!==id);
    el.classList.remove("active");
  } else {
    wishlist.push(id);
    el.classList.add("active");
  }
  localStorage.setItem("wishlist", JSON.stringify(wishlist));
}
function loadWishlist() {
  let container = document.getElementById("wishlistList");
  container.innerHTML = "";
  let items = products.filter(p=>wishlist.includes(p.id));
  if(items.length===0) {
    container.innerHTML = "<p>No items in wishlist</p>";
    return;
  }
  items.forEach(p=>{
    let div = document.createElement("div");
    div.className = "product";
    div.innerHTML = `
      <img src="${p.img}">
      <h4>${p.name}</h4>
      <p>₹${p.price}</p>
      <span class="wishlist active" onclick="toggleWishlist(${p.id}, this); event.stopPropagation();">♥</span>
    `;
    div.onclick = ()=>openModal(p);
    container.appendChild(div);
  });
}

// Filters
function filterProducts() {
  let q = document.getElementById("search").value.toLowerCase();
  let filtered = products.filter(p=>p.name.toLowerCase().includes(q));
  loadProducts(filtered);
}
function filterCategory(cat) {
  if(cat==="all") loadProducts(products);
  else loadProducts(products.filter(p=>p.category===cat));

  // Auto-close sidebar on mobile
  if (window.innerWidth <= 768) {
    closeSidebar();
  }
}
function filterByPrice() {
  let max = document.getElementById("priceRange").value;
  document.getElementById("priceValue").innerText = max;
  loadProducts(products.filter(p=>p.price<=max));
}

// Add Product
function previewImage(event) {
  let preview = document.getElementById("imagePreview");
  preview.src = URL.createObjectURL(event.target.files[0]);
  preview.style.display = "block";
}
function addProduct() {
  let name = document.getElementById("productName").value;
  let price = document.getElementById("productPrice").value;
  let category = document.getElementById("productCategory").value;
  let desc = document.getElementById("productDescription").value;
  let imgFile = document.getElementById("productImage").files[0];
  let seller = localStorage.getItem("user") || "Anonymous";

  if(!name || !price || !category || !desc || !imgFile) {
    alert("Please fill all fields and select an image");
    return;
  }

  let reader = new FileReader();
  reader.onload = function(e) {
    let newProduct = {
      id: Date.now(),
      name,
      price: parseInt(price),
      category,
      desc,
      img: e.target.result,
      seller
    };
    products.push(newProduct);
    localStorage.setItem("products", JSON.stringify(products));
    loadProducts(products);
    clearForm();
    showPage("dashboard");
  };
  reader.readAsDataURL(imgFile);
}
function clearForm() {
  document.getElementById("productName").value = "";
  document.getElementById("productPrice").value = "";
  document.getElementById("productCategory").value = "food";
  document.getElementById("productDescription").value = "";
  document.getElementById("productImage").value = "";
  document.getElementById("imagePreview").style.display = "none";
}

// Modal
function openModal(p) {
  document.getElementById("modalImg").src = p.img;
  document.getElementById("modalName").innerText = p.name;
  document.getElementById("modalPrice").innerText = "₹" + p.price;
  document.getElementById("modalDesc").innerText = p.desc;
  document.getElementById("modalSeller").innerText = "Seller: " + p.seller;
  document.getElementById("productModal").style.display = "flex";
}
function closeModal() {
  document.getElementById("productModal").style.display = "none";
}

function toggleSidebar() {
  let sidebar = document.querySelector("aside");
  let overlay = document.getElementById("sidebarOverlay");
  if(sidebar.classList.contains("active")) {
    sidebar.classList.remove("active");
    overlay.style.display = "none";
  } else {
    sidebar.classList.add("active");
    overlay.style.display = "block";
  }
}

function closeSidebar() {
  document.querySelector("aside").classList.remove("active");
  document.getElementById("sidebarOverlay").style.display = "none";
}
