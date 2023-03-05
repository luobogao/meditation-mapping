
import React from 'react';
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import './index.css';
import { bands, channels } from "./utils/muse"
import { getRelativeVector } from './utils/analysis';
import {buildModel} from "./utils/runmodel"
import { zoom, updateChartWaypoints, updateChartUser } from "./utils/charts"
import { getAnalytics } from "firebase/analytics";
import About from "./pages/about"
import Home from "./pages/home"
import Layout from "./pages/layout"
import Map from "./pages/map"
import Record from "./pages/record"
import Validate from "./pages/validate"
import Graphs from "./pages/graphs"
import { arraysEqual, unique } from "./utils/functions";
import { buildUserSelectors } from "./utils/ui";
import { anonymous, auth, login, updateUsername, listenEEG, getAllWaypoints, downloadCSV, buildAuthContainer, firstLoad } from "./utils/database"


export var waypoints
export var users;
export var userDataLoaded = false

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

export function downloadWaypoints() {


  var showWelcome = false
  if (firstLoad == true && anonymous) {
    showWelcome = true
  }

  // Reset waypoints
  waypoints = []
  users = []
  getAllWaypoints().then((snapshot) => {

    snapshot.forEach((doc) => {
      var waypoint = doc.data()
      waypoint.id = doc.id

      if (waypoint.id != undefined && waypoint.vector != undefined && waypoint.label != undefined && waypoint.user != undefined) {

        // Migration method - adds a "_avg60" to the end of each vector
        var newVector = {}
        bands.forEach(band => {
          channels.forEach(channel => {
            var key = band + "_" + channel
            newVector[key + "_avg60"] = waypoint.vector[key]
          })
        })
        waypoint.relative_vector_avg60 = getRelativeVector(newVector, 60)

        waypoints.push(waypoint)
        users.push(waypoint.user)
      }


    })
    console.log(waypoints)

    if (waypoints.length == 0 || users.length == 0) {
      alert("Could not download data from server...")
      return
    }
    users = unique(users).sort()
    state.selected_users = users

    // Build model of meditation states using the "vectors.js" file
    // This first time, include ALL the waypoints

    function buildModel_waypoint() {
      let vectors = waypoints.filter(e => e.exclude != true)
        .filter(e => state.selected_users.includes(e.user))
        .map(e => e.relative_vector_avg60)
      buildModel(vectors)
    }

    if (userDataLoaded) {

      buildModel_waypoint()
    }
    else {
      buildModel_waypoint()
    }




    waypoints.forEach(e => {
      if (state.selected_users.includes(e.user)) {
        e.match = true
      }

    })

    //buildSimilarityChart()
    updateChartWaypoints()
    buildUserSelectors()

    // Show the welcom screen only after data is loaded
    if (showWelcome) {
      //buildWelcome()

    }


  })

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



