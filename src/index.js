
import React from 'react';
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import './index.css';


import { getAnalytics } from "firebase/analytics";
import About from "./pages/about"
import Home from "./pages/home"
import Layout from "./pages/layout"
import Map from "./pages/map"
import Record from "./pages/record"



const rootElement = document.getElementById("root")
const root = createRoot(rootElement)
root.render(<BrowserRouter>
  <Routes>
    <Route path="/" element={<Layout />}>
      <Route index element={<Home />} />
      <Route path="about" element={<About />} />
      <Route path="map" element={<Map />} />
      <Route path="record" element={<Record />} />
    </Route>
  </Routes>
</BrowserRouter>)
  


