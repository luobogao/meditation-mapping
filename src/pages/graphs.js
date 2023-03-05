import React, { useState, useEffect } from "react";
import { cleanedData } from "./validate";
import { Link } from "react-router-dom";
const d3 = require("d3");

function updateCharts()
{

}
function buildPage() {
    d3.select("#cosine").append("svg").attr("id", "cosinesvg")
        .attr("width", "400px")
        .attr("height", "400px")
}


export default function Graphs() {
    useEffect(() => {
        buildPage()

    }, [])
    useEffect(() => {
        if (cleanedData != null) {
            
        }
    })

    return (
        <div id="main-container">
            <div id="nav">
                <Link to="/map">Map</Link>
            </div>
            <div id="bodydiv">
                <div id="cosine"></div>
                <div id="ratios"></div>
            </div>
        </div>

    );
};