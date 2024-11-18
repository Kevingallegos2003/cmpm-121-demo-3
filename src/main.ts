//Code inspired by https://github.com/Jsanc189/cmpm-121-demo-3/blob/1722b71368f2aba6a71b87e1bd7e981119ecb25d/src/main.ts
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
const playerMarker = leaflet.marker(Origin);
const playerTokens: Array<Coin> = [];
const Geocaches: Geocache[] = [];
const Mementos: string[] = [];
interface Cell {
  readonly i: number;
  readonly j: number;
}
interface Coin {
  readonly cell: Cell;
  readonly serial: number;
}
interface Cache {
  readonly coins: Coin[];
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
//---------------------------------------------------MAIN FUNCTION CREATING A CACHE-------------------------------------------------------
function SpawnCache(Cell: Cell) {
  const bounds = board.getCellBounds(Cell);
  const box = leaflet.rectangle(bounds);
  box.addTo(map);
  const cached = Geocaches.find((cache) =>
    cache.i === Cell.i && cache.j === Cell.j
  );
  console.log("cash found?: ", cached);
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
let cells = board.getCellsNearPoint(Origin);
/*
for (let i = 0; i < cells.length; i++) {
  if (luck([cells[i].i, cells[i].j].toString()) < SpawnChance) {
    SpawnCache(cells[i]);
  }
}
*/
//========Other Funcs=========================
function CacheCells() {
  cells = board.getCellsNearPoint(Origin);
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
      console.log("Pushed to Cache, len: ", Geocaches.length);
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
        console.log("Pushed to Cache, len: ", Geocaches.length);
      }
    }
  });
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
  Origin.lat += i;
  Origin.lng += j;
  playerMarker.setLatLng(Origin);
}
//===============main==========================
CacheCells();
document.getElementById("north")?.addEventListener("click", () => {
  Movement(TILE_DEGREES, 0);
  removeCaches();
  CacheCells();
});
document.getElementById("south")?.addEventListener("click", () => {
  Movement(-TILE_DEGREES, 0);
  removeCaches();
  CacheCells();
});
document.getElementById("east")?.addEventListener("click", () => {
  Movement(0, TILE_DEGREES);
  removeCaches();
  CacheCells();
});
document.getElementById("west")?.addEventListener("click", () => {
  Movement(0, -TILE_DEGREES);
  removeCaches();
  CacheCells();
});
