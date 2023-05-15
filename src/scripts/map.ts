import "mapbox-gl/dist/mapbox-gl.css";
import "awesomplete/awesomplete.css";

import * as mapboxgl from "mapbox-gl";
import * as d3 from "d3";
import Awesomplete from "awesomplete";
import bbox from "@turf/bbox";
// @ts-ignore
import getBuffer from "@turf/buffer";
import authentic_res_dot from "../data/authentic_res_dot.json";

const map = new mapboxgl.Map({
  accessToken:
    "pk.eyJ1IjoieGlhb3M2NTYiLCJhIjoiY2w4OWJmZHpxMDVlcTQ0cnhxZmp1YmJoOCJ9.Nh1Jz2n2i0S0nG_GJqfhNw",
  container: "map",
  style: "mapbox://styles/xiaos656/clhnjfqax018l01pega9icmox",
  center: [-73.9385, 40.7943],
  zoom: 11.5,
  interactive: true,
});

const MAP_SOURCE = "nta";
const NEIGHBORHOOD_PROPERTY = "NTAName";

const areas: Record<string, { center: [number, number]; zoom: number }> = {
  bronx: {
    center: [-73.911, 40.822],
    zoom: 12.94,
  },
  staten: {
    center: [-74.15, 40.58],
    zoom: 11.76,
  },
  Manhattan: {
    center: [-73.979, 40.756],
    zoom: 11.76,
  },
  brooklyn: {
    center: [-73.895, 40.67],
    zoom: 11.51,
  },
  queens: {
    center: [-73.845, 40.729],
    zoom: 12.3,
  },
};

const areaBtns = document.querySelectorAll(".area");

for (let i = 0; i < areaBtns.length; i++) {
  areaBtns[i].addEventListener("click", () => {
    let areasId = areaBtns[i].id;
    map.flyTo(areas[areasId]);
  });
}

// Add neighborhood polygon layer
map.on("load", function () {
  map.addSource(MAP_SOURCE, {
    type: "geojson",
    data: "../data/2020NTAs.geojson",
  });

  map.addLayer({
    id: `${MAP_SOURCE}-polygons`,
    type: "fill",
    source: "nta",
    layout: {},
    paint: {
      "fill-color": "rgba(0, 0, 0, 0)",
      "fill-outline-color": "rgba(0, 0, 0, 0)",
    },
  });

  map.addLayer({
    id: `${MAP_SOURCE}-borders`,
    type: "line",
    source: MAP_SOURCE,
    layout: {},
    paint: {
      "line-color": "rgba(0, 0, 0, 0)",
      "line-width": 0,
    },
  });
  // Add restaurant dot layer
  map.addSource("restaurants", {
    type: "geojson",
    data: "../data/authentic_res_dot.geojson",
  });

  map.addLayer({
    id: "restaurants-layer",
    type: "circle",
    source: "restaurants",
    paint: {
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 12, 2.5, 13.5, 6],
      "circle-stroke-width": 1,
      "circle-color": [
        "match",
        ["get", "parent_category"],
        "African",
        "#F77234",
        "Brazilian",
        "#7BE188",
        "Caribbean",
        "#009A29",
        "Chinese",
        "#FFB215",
        "Eastern European",
        "#FCC59F",
        "Filipino",
        "#FF9A2E",
        "French",
        "#F99057",
        "German",
        "#FDDDC3",
        "Greek",
        "#F76560",
        "Indian",
        "#c5b0d5",
        "Italian",
        "#EC3329",
        "Japanese",
        "#F7BA1E",
        "Korean",
        "#FF9A2E",
        "Latin American",
        "#23C343",
        "Malaysian",
        "#FF7D00",
        "Mediterranean",
        "#FBACA3",
        "Mexican",
        "#40B137",
        "Middle Eastern",
        "#CC5120",
        "Spanish",
        "#FDCDC5",
        "Taiwanese",
        "#F9CC45",
        "Thai",
        "#FFCF8B",
        "Vietnamese",
        "#D25F00",
        "#ccc", // default color
      ],
      "circle-stroke-color": "transparent",
    },
  });

  //add popup on hover circle
  const popup = new mapboxgl.Popup({
    closeButton: false,
    closeOnClick: false,
  });

  map.on("mouseenter", "restaurants-layer", (e) => {
    if (!e.features) return;
    map.getCanvas().style.cursor = "pointer";

    const feature = e.features[0];
    const geometry = feature.geometry;
    if (geometry.type !== "Point") return;
    const [lng, lat] = geometry.coordinates.slice();
    const name = feature.properties!.name;
    const type = feature.properties!.parent_category;
    const address = feature.properties!.address1;
    const city = feature.properties!.city;

    let tooltip = `${name}<br/>${address}, ${city}`;

    popup.setLngLat([lng, lat]).setHTML(tooltip).addTo(map);
  });

  map.on("mouseleave", "restaurants-layer", () => {
    map.getCanvas().style.cursor = "";
    popup.remove();
  });
});

//autocomplete search box
const searchInput = document.getElementById("neighborhood-search-input");
const awesomplete = new Awesomplete("#neighborhood-search-input", {
  list: [],
  minChars: 1,
  autoFirst: true,
});

const dropdownInput = document.getElementById("cuisine-search-input")!;
const dropdownList = document.getElementById("dropdown-list")!;
const resetButton = document.getElementById("reset-button")!;
const table = document.querySelector(".restaurant")!;

console.log(authentic_res_dot.features[0].properties.authentic_original_count);
let data = authentic_res_dot.features.sort((a1, a2) => {
  return +a1.properties.authentic_original_count <
    +a2.properties.authentic_original_count
    ? 1
    : +a1.properties.authentic_original_count >
      +a2.properties.authentic_original_count
    ? -1
    : 0;
});
let filteredData = data;
let previouFilterFeartures = "default";

d3.select(searchInput).on("input", handleInput);
d3.select(searchInput).on("keydown", handleSearch);

d3.select(dropdownInput).on("focus", () => {
  d3.select(dropdownList).style("display", "block");
});

d3.select(dropdownInput).on("blur", () => {
  setTimeout(() => {
    // delay hiding to allow for item click
    d3.select(dropdownList).style("display", "none");
  }, 200);
});

Array.from(dropdownList.children).forEach((item) => {
  item.addEventListener("click", () => {
    // @ts-ignore
    dropdownInput.value = item.innerText;
    // @ts-ignore
    filterCuisine(item.innerText);
    previouFilterFeartures === "cuisine"
      ? (filteredData = data.filter(
          // @ts-ignore
          (d) => d.properties.parent_category === item.innerText
        ))
      : (filteredData = filteredData.filter(
          // @ts-ignore
          (d) => d.properties.parent_category === item.innerText
        ));

    restaurantNodeCreator(filteredData, filteredData.length);
    previouFilterFeartures = "cuisine";
  });
});

d3.select(resetButton).on("click", () => {
  // @ts-ignore
  dropdownInput.value = "";
  map.setFilter("restaurants-layer", null);

  // Clear the search box content
  // @ts-ignore
  searchInput.value = "";

  // Remove previous highlight layer if it exists
  if (map.getLayer("highlight-layer")) {
    map.removeLayer("highlight-layer");
    map.removeSource("highlight-source");
  }

  // Zoom out to the original view
  map.flyTo({
    center: [-73.9385, 40.7943],
    zoom: 11.5,
    essential: true,
  });
  restaurantNodeCreator(data, 10);
});
restaurantNodeCreator(data, 20);
// <div class="res_neighbor">${filteredData[i].properties['NTAName']}</div>
function restaurantNodeCreator(
  data: { properties: Record<string, any> }[],
  length: number
) {
  table.innerHTML = "";
  for (let i = 0; i < length; i++) {
    let innerHTML = `<div class="restaurant">
      <div class="res_info">
        <div class="basic_info">
          <div class="res_name">${data[i].properties["name"]}</div>

        </div>
        <div class="res_rating">${data[i].properties["avg_rating"]}</div>
      </div>
      <div class="res_info">
        <div class="res_ratio">Authentic Reviews: ${data[i].properties["authentic_original_count"]}</div>
        <div class="res_category">${data[i].properties["parent_category"]}</div>
      </div>
      <div class="line"></div>
    </div>`;
    table.innerHTML += innerHTML;
  }
}

function filterCuisine(cuisine: string) {
  map.setFilter("restaurants-layer", ["==", "parent_category", cuisine]);
}

function handleInput() {
  const input = d3.select(searchInput).property("value").toLowerCase();
  const features = map.querySourceFeatures(MAP_SOURCE);
  const suggestions = features
    .map((feature) => feature.properties![NEIGHBORHOOD_PROPERTY])
    .filter((neighborhood) => neighborhood.toLowerCase().includes(input));

  awesomplete.list = Array.from(new Set(suggestions));
}

function handleSearch(e: { key: string; target: { value: string } }) {
  if (e.key === "Enter") {
    searchNeighborhood(e.target.value);

    previouFilterFeartures === "nta"
      ? (filteredData = data.filter(
          (d) => d.properties["NTAName"] === e.target.value
        ))
      : (filteredData = filteredData.filter(
          (d) => d.properties["NTAName"] === e.target.value
        ));

    previouFilterFeartures = "nta";
    restaurantNodeCreator(filteredData, filteredData.length);
  }
}

function searchNeighborhood(neighborhoodName: string) {
  const features = map.querySourceFeatures(MAP_SOURCE);

  const feature = features.find(
    (feature) =>
      feature.properties![NEIGHBORHOOD_PROPERTY].toLowerCase() ===
      neighborhoodName.toLowerCase()
  );

  if (feature) {
    // @ts-ignore
    map.fitBounds(bbox(getBuffer(feature, 1, { units: "kilometers" })));

    // Remove previous highlight layer if it exists
    if (map.getLayer("highlight-layer")) {
      map.removeLayer("highlight-layer");
      map.removeSource("highlight-source");
    }

    // add new source and layer for selected neighborhood
    map.addSource("highlight-source", {
      type: "geojson",
      data: feature.geometry,
    });

    map.addLayer({
      id: "highlight-layer",
      type: "line",
      source: "highlight-source",
      layout: {},
      paint: {
        "line-color": "#484848",
        "line-width": 1.5,
        "line-opacity": 0.6,
        "line-dasharray": [2, 2],
      },
    });
  }
}
