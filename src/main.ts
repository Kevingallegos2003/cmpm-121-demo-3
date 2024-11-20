//Code inspired by https://github.com/Jsanc189/cmpm-121-demo-3/blob/1722b71368f2aba6a71b87e1bd7e981119ecb25d/src/main.ts
//State saving code inspired by: https://github.com/NickCorfmat/cmpm-121-demo-3/blob/main/src/main.ts
//@deno-types="npm:@types/leaflet@^1.9.14"
import leaflet from "leaflet";

// Style sheets
import "leaflet/dist/leaflet.css";
import "./style.css";

// Fix missing marker images
import "./leafletWorkaround.ts";

// Deterministic random number generator
import luck from "./luck.ts";
import { Board } from "./board.ts";

// Location of our classroom (as identified on Google Maps)

const statusPanel = document.querySelector<HTMLDivElement>("#statusPanel")!;
const Origin = leaflet.latLng(36.98949379578401, -122.06277128548504); //starting pos refering to our class
const TILE_DEGREES = 1e-4;
const NeighborSize = 8;
const SpawnChance = 0.1;
const gamezoom = 18;
let currentLocation = leaflet.latLng(36.98949379578401, -122.06277128548504);
const playerMarker = leaflet.marker(currentLocation);
let playerTokens: Array<Coin> = [];
let Geocaches: Geocache[] = [];
let Mementos: string[] = [];
let playerhistory: leaflet.LatLng[] = [];
const KEY = "LOCAL";
const path: leaflet.Polyline = leaflet.polyline([], {
  color: "red",
  weight: 5,
  opacity: 0.3,
});
interface Cell {
  readonly i: number;
  readonly j: number;
}
interface Coin {
  readonly cell: Cell;
  readonly serial: number;
}
interface Memento<T> {
  toMemento(): T;
  fromMemento(memento: T): void;
}
class Geocache implements Memento<string> {
  i: number;
  j: number;
  tokens: number;

  constructor() {
    this.i = 0;
    this.j = 1;
    this.tokens = 2;
  }

  toMemento() {
    return `${this.i},${this.j},${this.tokens}`;
  }
  fromMemento(memento: string): void {
    const [i, j, tokens] = memento.split(",").map(Number);
    this.i = i;
    this.j = j;
    this.tokens = tokens;
  }
}
const map = leaflet.map(document.getElementById("map")!, {
  center: Origin,
  zoom: gamezoom,
  minZoom: gamezoom,
  maxZoom: gamezoom,
  zoomControl: false,
  scrollWheelZoom: false,
});
leaflet
  .tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 20,
    attribution:
      '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  })
  .addTo(map);
playerMarker.bindTooltip("Your location!");
playerMarker.addTo(map);
path.addTo(map);
//---------------------------------------------------MAIN FUNCTION CREATING A CACHE-------------------------------------------------------
function SpawnCache(Cell: Cell) {
  const bounds = board.getCellBounds(Cell);
  const box = leaflet.rectangle(bounds);
  box.addTo(map);
  const cached = Geocaches.find((cache) =>
    cache.i === Cell.i && cache.j === Cell.j
  );
  //console.log("cash found?: ", cached);
  if (!cached) {
    console.error("Cache not found for cell:", Cell);
    return;
  }
  let tokens = cached.tokens;
  box.bindPopup(() => {
    const serialtokens: Array<Coin> = [];
    for (let i = 0; i <= tokens; i++) {
      const newtoken: Coin = { cell: Cell, serial: i };
      serialtokens.push(newtoken);
    }
    box.addTo(map);
    const popUpDiv = document.createElement("div");
    popUpDiv.innerHTML =
      `<div>There is a cache here at ${Cell.i},${Cell.j}. It holds <span id="value">${tokens}</span> Tokens</div>
    <button id="withdraw">withdraw</button> <button id="deposit">deposit</button>`;
    popUpDiv
      .querySelector<HTMLButtonElement>("#withdraw")!
      .addEventListener("click", () => {
        if (tokens > 0) {
          tokens--;
          cached.tokens = tokens;
          playerTokens.push(serialtokens.pop()!);
          let serial = "";
          for (let i = 0; i < playerTokens.length; i++) {
            serial += coinID(playerTokens[i]);
            serial += " ";
          }
          saveGameState();
          popUpDiv.querySelector<HTMLSpanElement>("#value")!.innerHTML =
            `${tokens}`;
          statusPanel.innerHTML = `Coins Held: ${serial}`;
        } else alert("This Cache has no tokens");
      });
    popUpDiv
      .querySelector<HTMLButtonElement>("#deposit")!
      .addEventListener("click", () => {
        if (playerTokens.length > 0) {
          tokens++;
          cached.tokens = tokens;
          serialtokens.push(playerTokens.pop()!);
          let serial = "";
          for (let i = 0; i < playerTokens.length; i++) {
            serial += coinID(playerTokens[i]);
            serial += " ";
          }
          saveGameState();
          popUpDiv.querySelector<HTMLSpanElement>("#value")!.innerHTML =
            `${tokens}`;
          statusPanel.innerHTML = `Coins Held: ${serial}`;
        } else alert("You have no tokens to deposit");
      });
    return popUpDiv;
  });
}
//--------------------------------------------------------------------------------------------------------------------------------------

const board = new Board(TILE_DEGREES, NeighborSize);
let cells = board.getCellsNearPoint(Origin); //Origin
//========Other Funcs=========================
function CacheCells() {
  cells = board.getCellsNearPoint(currentLocation); //Origin
  cells.forEach((cell) => {
    const Exists = Mementos.some((momento) => {
      const [i, j] = momento.split(",").map(Number);
      return i === cell.i && j === cell.j;
    });
    if (!Exists && luck([cell.i, cell.j].toString()) < SpawnChance) {
      const newCache = new Geocache();
      newCache.i = cell.i;
      newCache.j = cell.j;
      newCache.tokens = Math.floor(luck([cell.i, cell.j].toString()) * 100);
      Geocaches.push(newCache);
      SpawnCache(cell);
      //console.log("Pushed to Cache, len: ", Geocaches.length);
    } else {
      const mem = Mementos.find((momento) => {
        const [i, j] = momento.split(",").map(Number);
        return i === cell.i && j === cell.j;
      });
      if (mem) {
        const [i, j, tokens] = mem.split(",").map(Number);
        const existingCache = new Geocache();
        existingCache.i = i;
        existingCache.j = j;
        existingCache.tokens = tokens;
        Geocaches.push(existingCache);
        SpawnCache(cell);
        //console.log("Pushed to Cache, len: ", Geocaches.length);
      }
    }
  });
}
function restartMap(origin: leaflet.LatLng) {
  currentLocation = origin;
  Movement(0, 0);
  path.setLatLngs([]);
  playerTokens = [];
  playerhistory = [];
  Geocaches = [];
  Mementos = [];
  CacheCells();
  statusPanel.innerHTML = ``;
}
function removeCaches() {
  Geocaches.forEach((cache) => {
    Mementos.push(cache.toMemento());
  });
  map.eachLayer((layer) => {
    if (layer instanceof leaflet.Rectangle) {
      map.removeLayer(layer);
    }
  });
  Geocaches.length = 0;
}
function coinID(coin: Coin) {
  return `${coin.cell.j}: ${coin.cell.i}#${coin.serial}`;
}
function Movement(i: number, j: number) {
  const newLocation: leaflet.LatLng = leaflet.latLng(0, 0);
  newLocation.lat = currentLocation.lat + i;
  newLocation.lng = currentLocation.lng + j;
  playerMarker.setLatLng(newLocation);
  playerhistory.push(newLocation);
  path.setLatLngs(playerhistory);
  currentLocation = newLocation;
  saveGameState();
}
function saveGameState() {
  const gameState = {
    currentLocation,
    playerTokens,
    playerhistory,
    Mementos,
    Geocaches,
  };
  //console.log("Saving states: Player LOC = "+ currentLocation + " Player's tokens: "+ playerTokens + " Players movement history: "+ playerhistory+" Mementos: "+Mementos+" GeoCaches: "+Geocaches);
  localStorage.setItem(KEY, JSON.stringify(gameState));
}
function loadGameState(): void {
  const gameState = localStorage.getItem(KEY);
  if (gameState) {
    const state = JSON.parse(gameState);
    if (!state) {
      return;
    }
    currentLocation = state.currentLocation;
    playerhistory = state.playerhistory;
    Mementos = state.Mementos;
    playerTokens = state.playerTokens;
    //console.log("Loading states: Player LOC = "+ currentLocation + " Player's tokens: "+ playerTokens + " Players movement history: "+ playerhistory+" Mementos: "+Mementos+" GeoCaches: "+Geocaches);
    if (!currentLocation) { //Should never happen
      console.log("undefiend");
      currentLocation = Origin;
    }
    playerMarker.setLatLng(currentLocation);
    CacheCells();
    path.setLatLngs(playerhistory);
    let s = "";
    for (let i = 0; i < playerTokens.length; i++) {
      s += coinID(playerTokens[i]);
      s += " ";
    }
    statusPanel.innerHTML = `Coins Held: ${s}`;
    map.setView(currentLocation);
  } else {
    Movement(0, 0);
    playerhistory.push(currentLocation);
    removeCaches();
    CacheCells();
  }
}

//===============main==========================

loadGameState();
document.getElementById("north")?.addEventListener("click", () => {
  Movement(TILE_DEGREES, 0);
  removeCaches();
  CacheCells();
  saveGameState();
});
document.getElementById("south")?.addEventListener("click", () => {
  Movement(-TILE_DEGREES, 0);
  removeCaches();
  CacheCells();
  saveGameState();
});
document.getElementById("east")?.addEventListener("click", () => {
  Movement(0, TILE_DEGREES);
  removeCaches();
  CacheCells();
  saveGameState();
});
document.getElementById("west")?.addEventListener("click", () => {
  Movement(0, -TILE_DEGREES);
  removeCaches();
  CacheCells();
  saveGameState();
});
document.getElementById("reset")?.addEventListener("click", () => {
  const input = prompt("Are you sure you wanna reset? Yes|No");
  if (
    input?.toLocaleLowerCase() === "yes" ||
    input?.toLocaleLowerCase() === "y" || input?.toLocaleLowerCase() === "ok"
  ) {
    console.log("reset game");
    alert("reseted cahces");
    removeCaches();
    localStorage.clear();
    restartMap(Origin);
    restartMap(Origin);
    map.setView(Origin);
  }
});
document.getElementById("sensor")?.addEventListener("click", () => {
  navigator.geolocation.watchPosition((position) => {
    const { latitude, longitude } = position.coords;
    const newLocation = leaflet.latLng(latitude, longitude);
    removeCaches();
    restartMap(newLocation);
    map.setView(newLocation);
    saveGameState();
  });
});
