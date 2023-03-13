
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
import Clusters from "./pages/clusters"
import 'bootstrap/dist/css/bootstrap.min.css';



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
  "avg10": [],

  "similarityType": "cosine",
  "modelRatios": [["TP10", "TP9"], ["AF8", "AF7"], ["TP10", "AF8"], ["TP9", "AF7"]],
  "modelBands": ["Delta", "Theta", "Alpha", "Beta", "Gamma"]
  

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
      <Route path="clusters" element={<Clusters />} />
    </Route>
  </Routes>
</BrowserRouter>)



