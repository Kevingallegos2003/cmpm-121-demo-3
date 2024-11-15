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
//----new one with cell use-------------
function SpawnCache(Cell: Cell) {
  const bounds = board.getCellBounds(Cell);
  const box = leaflet.rectangle(bounds);
  box.addTo(map);
  box.bindPopup(() => {
    let tokens = Math.floor(
      luck([Cell.i, Cell.j, "initialValue"].toString()) * 100,
    );
    const serialtokens: Array<Coin> = [];
    for (let i = tokens; i > 0; i--) {
      const newtoken: Coin = { cell: Cell, serial: i };
      serialtokens.push(newtoken);
    }
    const popUpDiv = document.createElement("div");
    popUpDiv.innerHTML =
      `<div>There is a cache here at ${Cell.i},${Cell.j}. It holds <span id="value">${tokens}</span> Tokens</div>
    <button id="withdraw">withdraw</button> <button id="deposit">deposit</button>`;
    popUpDiv
      .querySelector<HTMLButtonElement>("#withdraw")!
      .addEventListener("click", () => {
        if (tokens > 0) {
          tokens--;
          playerTokens.push(serialtokens.pop()!);
          //const serial = coinID(playerTokens[playerTokens.length-1]);
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

//------------------------------------------------------------

const board = new Board(TILE_DEGREES, NeighborSize);
const cells = board.getCellsNearPoint(Origin);
for (let i = 0; i < cells.length; i++) {
  if (luck([cells[i].i, cells[i].j].toString()) < SpawnChance) {
    SpawnCache(cells[i]);
  }
}
function coinID(coin: Coin) {
  return `${coin.cell.j}: ${coin.cell.i}#${coin.serial}`;
}
