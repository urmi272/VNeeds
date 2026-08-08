// ===== Auth =====

function currentUser() {
  return auth.currentUser;
}

async function signup(email, password, name) {
  if (!email.toLowerCase().endsWith(ALLOWED_EMAIL_DOMAIN)) {
    throw new Error(`Please use your college email (${ALLOWED_EMAIL_DOMAIN})`);
  }
  const cred = await auth.createUserWithEmailAndPassword(email, password);
  await cred.user.updateProfile({ displayName: name });
  await db.collection("users").doc(cred.user.uid).set({
    email, name, block: "", upi: "",
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
  return cred.user;
}

async function login(email, password) {
  const cred = await auth.signInWithEmailAndPassword(email, password);
  return cred.user;
}

async function logout() {
  await auth.signOut();
}

// Sends a password-reset email (Firebase-hosted link, no OTP/backend needed)
async function resetPassword(email) {
  if (!email) throw new Error("Please enter your email first");
  await auth.sendPasswordResetEmail(email);
}

// Fetch (and cache in localStorage for instant UI) the user's profile doc
async function getProfile(uid) {
  const snap = await db.collection("users").doc(uid).get();
  const data = snap.exists ? snap.data() : {};
  localStorage.setItem("profileCache", JSON.stringify(data));
  return data;
}

async function saveProfileField(uid, field, value) {
  await db.collection("users").doc(uid).set({ [field]: value }, { merge: true });
  const cache = JSON.parse(localStorage.getItem("profileCache") || "{}");
  cache[field] = value;
  localStorage.setItem("profileCache", JSON.stringify(cache));
}

function requireAuth(onReady) {
  auth.onAuthStateChanged(async (user) => {
    if (!user) {
      window.location.href = "login.html";
      return;
    }
    const profile = await getProfile(user.uid);
    onReady(user, profile);
  });
}
