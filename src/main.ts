// todo
const app = document.querySelector<HTMLDivElement>("#app")!;
const black = document.createElement("button");
black.innerHTML = "Click ME"; //button
app.append(black);
black.addEventListener("click", () => {
  alert("You rn: 🤓");
});
