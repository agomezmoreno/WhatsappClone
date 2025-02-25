// Import the functions you need from the SDKs you need
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js'
import { getAnalytics } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-analytics.js'
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
export const firebaseConfig = {
  apiKey: "AIzaSyBYVsDK0ZzvqjBQPf1-6ZRLT6GU_3Chmms",
  authDomain: "whatsappclone-ec258.firebaseapp.com",
  projectId: "whatsappclone-ec258",
  storageBucket: "whatsappclone-ec258.firebasestorage.app",
  messagingSenderId: "70044001500",
  appId: "1:70044001500:web:433d79cde6218145564019",
  measurementId: "G-LB3FL4JY3N"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);