// ===== Notifications =====

function notifCol(uid) {
  return db.collection("users").doc(uid).collection("notifications");
}

async function pushNotification(uid, text, link = "") {
  await notifCol(uid).add({
    text, link, read: false,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
}

async function markNotificationRead(uid, notifId) {
  await notifCol(uid).doc(notifId).set({ read: true }, { merge: true });
}

async function markAllRead(uid) {
  const snap = await notifCol(uid).where("read", "==", false).get();
  const batch = db.batch();
  snap.docs.forEach(d => batch.set(d.ref, { read: true }, { merge: true }));
  await batch.commit();
}

// Live subscription for the bell icon — returns unsubscribe()
function watchNotifications(uid, onChange) {
  return notifCol(uid).orderBy("createdAt", "desc").limit(30)
    .onSnapshot(snap => onChange(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
}
