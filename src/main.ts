//@deno-types="npm:@types/leaflet@^1.9.14"
import leaflet from "leaflet";

// Style sheets
import "leaflet/dist/leaflet.css";
import "./style.css";

// Fix missing marker images
import "./leafletWorkaround.ts";

// Deterministic random number generator
import luck from "./luck.ts";

// Location of our classroom (as identified on Google Maps)
const statusPanel = document.querySelector<HTMLDivElement>("#statusPanel")!;
const Origin = leaflet.latLng(36.98949379578401, -122.06277128548504); //starting pos refering to our class
const TILE_DEGREES = 1e-4;
const NeighborSize = 8;
const SpawnChance = 0.1;
const gamezoom = 19;
const playerMarker = leaflet.marker(Origin);
let playerPoints = 0;
let caches = 0;
const cachv = [0];
const map = leaflet.map(document.getElementById("map")!, {
  center: Origin,
  zoom: gamezoom,
  minZoom: 10,
  maxZoom: 500,
  zoomControl: true,
  scrollWheelZoom: true,
});
leaflet
  .tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 400,
    attribution:
      '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  })
  .addTo(map);
playerMarker.bindTooltip("Your location!");
playerMarker.addTo(map);

//------------------------------------------------------------
function spawnCache(i: number, j: number, c: number) {
  // Convert cell numbers into lat/lng bounds
  const bounds = leaflet.latLngBounds([
    [Origin.lat + i * TILE_DEGREES, Origin.lng + j * TILE_DEGREES],
    [Origin.lat + (i + 1) * TILE_DEGREES, Origin.lng + (j + 1) * TILE_DEGREES],
  ]);
  const rect = leaflet.rectangle(bounds);
  rect.addTo(map);

  // Handle interactions with the cache
  rect.bindPopup(() => {
    const cacheID = c;

    // The popup offers a description and button
    const popupDiv = document.createElement("div");
    popupDiv.innerHTML = `
                <div>There is a cache here at "${i},${j}". It has value <span id="value">${
      cachv[cacheID]
    }</span>.</div>
                <button id="withdraw">withdraw</button> <button id="deposit">deposit</button>`;

    // Clicking the button decrements the cache's value and increments the player's points
    popupDiv
      .querySelector<HTMLButtonElement>("#withdraw")!
      .addEventListener("click", () => {
        if (cachv[cacheID] > 0) {
          cachv[cacheID]--;
          popupDiv.querySelector<HTMLSpanElement>("#value")!.innerHTML =
            cachv[cacheID].toString();
          playerPoints++;
          statusPanel.innerHTML = `${playerPoints} points accumulated`;
        } else {
          alert("Banks empty cuh!");
        }
      });
    popupDiv
      .querySelector<HTMLButtonElement>("#deposit")!
      .addEventListener("click", () => {
        if (playerPoints > 0) {
          cachv[cacheID]++;
          popupDiv.querySelector<HTMLSpanElement>("#value")!.innerHTML =
            cachv[cacheID].toString();
          playerPoints--;
          statusPanel.innerHTML = `${playerPoints} points accumulated`;
        } else {
          alert("No racks cuh!");
        }
      });

    return popupDiv;
  });
}
for (let i = -NeighborSize; i < NeighborSize; i++) {
  for (let j = -NeighborSize; j < NeighborSize; j++) {
    // If location i,j is lucky enough, spawn a cache!
    if (luck([i, j].toString()) < SpawnChance) {
      const pointValue = Math.floor(
        luck([i, j, "initialValue"].toString()) * 100,
      );
      caches++;
      cachv.push(pointValue);
      spawnCache(i, j, caches);
    }
  }
}
