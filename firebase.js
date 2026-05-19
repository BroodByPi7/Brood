// ── Firebase setup ───────────────────────────────────────────────────────────
// 1. Go to https://console.firebase.google.com and create a project
// 2. Enable Authentication → Sign-in method → Email/Password
// 3. Enable Firestore Database (start in test mode)
// 4. Register a web app and copy the config below
// 5. Create an admin user manually in Firebase Auth

const firebaseConfig = {
  apiKey: "AIzaSyBruZhff973pu0phUk2Clp_uI0iu8zyZxg",
  authDomain: "brood-fe683.firebaseapp.com",
  projectId: "brood-fe683",
  storageBucket: "brood-fe683.firebasestorage.app",
  messagingSenderId: "967801580505",
  appId: "1:967801580505:web:5fec7b2cec0db87ee687c8"
};

let app, auth, db, isReady = false;

try {
  if (typeof firebase !== "undefined") {
    app = firebase.initializeApp(firebaseConfig);
    auth = firebase.auth(app);
    db = firebase.firestore(app);
    isReady = true;
  }
} catch (e) {
  console.warn("Firebase init failed:", e);
}

// ── Auth helpers ─────────────────────────────────────────────────────────────

function onAuthChanged(cb) {
  if (!auth) return;
  auth.onAuthStateChanged(cb);
}

function signUp(email, password, displayName) {
  if (!auth) return Promise.reject("Firebase not ready");
  return auth.createUserWithEmailAndPassword(email, password)
    .then((cred) => cred.user.updateProfile({ displayName }));
}

function logIn(email, password) {
  if (!auth) return Promise.reject("Firebase not ready");
  return auth.signInWithEmailAndPassword(email, password);
}

function logOut() {
  if (!auth) return Promise.reject("Firebase not ready");
  return auth.signOut();
}

function currentUser() {
  return auth ? auth.currentUser : null;
}

// ── Firestore helpers ────────────────────────────────────────────────────────

function getOrdersCollection() {
  return db ? db.collection("orders") : null;
}

function getLimitsDoc() {
  return db ? db.collection("config").doc("limits") : null;
}

function getUsersCollection() {
  return db ? db.collection("users") : null;
}

function placeOrder(orderData) {
  if (!db) return Promise.reject("Firebase not ready");
  return db.collection("orders").add(orderData);
}

function listenOrders(callback) {
  if (!db) return;
  return db.collection("orders").orderBy("createdAt", "desc").onSnapshot((snap) => {
    const orders = [];
    snap.forEach((doc) => orders.push({ id: doc.id, ...doc.data() }));
    callback(orders);
  });
}

function listenLimits(callback) {
  if (!db) return;
  return getLimitsDoc().onSnapshot((doc) => {
    callback(doc.exists ? doc.data() : { maxPerDay: 50, items: {} });
  });
}

function saveLimits(limits) {
  if (!db) return Promise.reject("Firebase not ready");
  return getLimitsDoc().set(limits, { merge: true });
}

function updateOrderStatus(orderId, status) {
  if (!db) return Promise.reject("Firebase not ready");
  return db.collection("orders").doc(orderId).update({ status });
}

function deleteOrder(orderId) {
  if (!db) return Promise.reject("Firebase not ready");
  return db.collection("orders").doc(orderId).delete();
}

function getUserOrders(userId, callback) {
  if (!db) return;
  return db.collection("orders")
    .where("customerId", "==", userId)
    .orderBy("createdAt", "desc")
    .onSnapshot((snap) => {
      const orders = [];
      snap.forEach((doc) => orders.push({ id: doc.id, ...doc.data() }));
      callback(orders);
    });
}

function setUserProfile(uid, data) {
  if (!db) return Promise.reject("Firebase not ready");
  return db.collection("users").doc(uid).set(data, { merge: true });
}

function getUserProfile(uid) {
  if (!db) return Promise.resolve(null);
  return db.collection("users").doc(uid).get().then((doc) => doc.exists ? doc.data() : null);
}
