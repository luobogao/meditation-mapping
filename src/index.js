
import React from 'react';
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import './index.css';
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from 'firebase/firestore/lite';
import { getAnalytics } from "firebase/analytics";
import About from "./pages/about"
import Home from "./pages/home"
import Layout from "./pages/layout"
import Live from "./pages/live"

const firebaseConfig = {

  apiKey: "AIzaSyABdGdf_fn2dLH_qUumFqx5I6Xdqv30elk",
  authDomain: "mapping-meditation.firebaseapp.com",
  projectId: "mapping-meditation",
  storageBucket: "mapping-meditation.appspot.com",
  messagingSenderId: "584243021105",
  appId: "1:584243021105:web:bb972d7fe085041b45dc10",
  measurementId: "G-TDBK5SCNZK"
};

export var state= {}


// Initialize Firebase

const app = initializeApp(firebaseConfig);

const analytics = getAnalytics(app);

export const db = getFirestore(app)


const rootElement = document.getElementById("root")
const root = createRoot(rootElement)
root.render(<BrowserRouter>
  <Routes>
    <Route path="/" element={<Layout />}>
      <Route index element={<Home />} />
      <Route path="about" element={<About />} />
      <Route path="live" element={<Live />} />
      
      
    </Route>
  </Routes>
</BrowserRouter>)
  


