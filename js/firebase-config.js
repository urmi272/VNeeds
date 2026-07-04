const firebaseConfig = {
  apiKey: "AIzaSyDpyPA4SbryYuH6mICkJ7f9ut0A24N_W8I",
  authDomain: "myprojects-c76e0.firebaseapp.com",
  projectId: "myprojects-c76e0",
  storageBucket: "myprojects-c76e0.firebasestorage.app",
  messagingSenderId: "643319827075",
  appId: "1:643319827075:web:760a1c331d11c37f8469b6"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Only allow this email domain to sign up. Change/remove as needed.
const ALLOWED_EMAIL_DOMAIN = "@vitbhopal.ac.in";