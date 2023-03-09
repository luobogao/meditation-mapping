
import React from 'react';
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import './index.css';

import About from "./pages/about"
import Home from "./pages/home"
import Layout from "./pages/layout"
import Map from "./pages/map"
import Record from "./pages/record"
import Validate from "./pages/validate"
import Graphs from "./pages/graphs"
import 'bootstrap/dist/css/bootstrap.min.css';


const originalLog = console.log;

// Override the console.log() function
console.log = function(...args) {
  // Check each argument separately
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    // If the argument is an object or array, convert it to a string
    const argString = typeof arg === 'object' ? JSON.stringify(arg) : arg;

    // Check if the string representation of the argument contains the string to avoid
    if (argString.includes(' => ')) {
      // Don't log this message
      return;
    }
  }

  // If we made it here, none of the arguments contained the string to avoid, so log the message
  originalLog.apply(console, args);
};

export var state =
{
  "filename": "<filename>",
  "device": "Muse",
  "selected_users": [],
  "resolution": 10,
  "clusters": 1,
  "zoom": 1, // increasing this value will change the y-min of distance graphs
  "showAllWaypoints": false, // Shows all waypoints (as red) even when not matching
  "chartType": "pca", // PCA, Cosine, or Euclidean
  "limitMatches": true,
  "model":
  {
    "mapped": null, // Mapped x-y coordinates of each standard vector

  },
  "avg10": []

}






const rootElement = document.getElementById("root")
const root = createRoot(rootElement)
root.render(<BrowserRouter>
  <Routes>
    <Route path="/" element={<Layout />}>
      <Route index element={<Home />} />
      <Route path="about" element={<About />} />
      <Route path="map" element={<Map />} />
      <Route path="record" element={<Record />} />
      <Route path="validate" element={<Validate />} />
      <Route path="graphs" element={<Graphs />} />
    </Route>
  </Routes>
</BrowserRouter>)



