import Player from './Player.mjs';
import Collectible from './Collectible.mjs';
import controls from './controls.mjs';
import { generateStartPos, canvasCalcs } from './canvas-data.mjs';
import { post } from '../server';

const socket = io();
const canvas = document.getElementById('game-window');
const context = canvas.getContext('2d');

const loadImg = () => {
  const img = new Image();
  img.src = src;
  return img;
};

const bronzeCoinArt = loadImg("https://cdn.freecodecamp.org/demo-projects/images/bronze-coin.png");
const silverCoinArt = loadImg("https://cdn.freecodecamp.org/demo-projects/images/silver-coin.png");
const goldCoinArt = loadImg("https://cdn.freecodecamp.org/demo-projects/images/gold-coin.png");
const mainPlayerArt = loadImg("https://cdn.freecodecamp.org/demo-projects/images/main-player.png");
const otherPlayerArt = loadImg("https://cdn.freecodecamp.org/demo-projects/images/other-player.png");

let tick;
let currentPlayers = [];
let item;
let endGame;

socket.on("init", ({ id, players, coin }) => {
  console.log(`Connected ${id}`);

  cancelAnimationFrame(tick);

  const mainPlayer = new Player({
    x: generateStartPos(
      canvasCalcs.playFieldMinX,
      canvasCalcs.playFieldMaxX,
      5
    ),
    y: generateStartPos(
      canvasCalcs.playFieldMinY,
      canvasCalcs.playFieldMaxY,
      5
    ),
    id,
    main: true
  });

  controls(mainPlayer, socket);

  socket.emit("new-player", mainPlayer);

  socket.on("new-player", (obj) => {
    const playerIds = currentPlayers.map((player) => player.id);
    if (!playerIds.includes(obj.id)) {
      currentPlayers.push(new Player(obj));
    }
  });

  socket.on("move-player", ({ id, dir, posObj }) => {
    const movingPlayer = currentPlayers.find((obj) => obj.id === id);
    movingPlayer.moveDir(dir);

    movingPlayer.x = posObj.x;
    movingPlayer.y = posObj.y;
  });

  socket.on("stop-player", ({ id, dir, posObj }) => {
    const stoppingPlayer = currentPlayers.find((obj) => obj.id === id);
    stoppingPlayer.stopDir(dir);

    stoppingPlayer.x = posObj.x;
    stoppingPlayer.y = posObj.y;
  });

  socket.on("new-coin", (newCoin) => {
    item = new Collectible(newCoin);
  });

  socket.on("remove-player", (id) => {
    console.log(`${id} disconnected`);
    currentPlayers = currentPlayers.filter((player) => player.id !== id);
  });

  socket.on("end-game", (result) => (endGame = result));

  socket.on("update-player", (playerObj) => {
    const scoringPlayer = currentPlayers.find((obj) => obj.id === playerObj.id);
    scoringPlayer.score = playerObj.score;
  });

  currentPlayers = players.map((val) => new Player(val)).concat(mainPlayer);
  item = new Collectible(coin);

  draw();
});

const draw = () => {
  context.clearRect(0, 0, canvas.width, canvas.height);

  //Background
  context.fillStyle = "#220";
  context.fillRect(0, 0, canvas.width, canvas.height);

  //Border for playfield
  context.strokeStyle = "white";
  context.strokeRect(
    canvasCalcs.playFieldMinX,
    canvasCalcs.playFieldMinY,
    canvasCalcs.playFieldWidth,
    canvasCalcs.playFieldHeight
  );

  // Controls text
  context.fillStyle = "white";
  context.font = `13px 'Press Start 2P'`;
  context.textAlign = "center";
  context.fillText("Controls: WASD", 100, 32.5);

  // Game title
  context.font = `16px 'Press Start 2P'`;
  context.fillText("Coin Race", canvasCalcs.canvasWidth / 2, 32.5);

  // Calculate score and draw players each frame
  currPlayers.forEach((player) => {
    player.draw(context, item, { mainPlayerArt, otherPlayerArt }, currPlayers);
  });

  // Draw current coin
  item.draw(context, { bronzeCoinArt, silverCoinArt, goldCoinArt });

  // Remove destroyed coin
  if (item.destroyed) {
    socket.emit("destroy-item", {
      playerId: item.destroyed,
      coinValue: item.value,
      coinId: item.id,
    });
  }

  if (endGame) {
    context.fillStyle = "white";
    context.font = `13px 'Press Start 2P'`;
    context.fillText(
      `You ${endGame}! Restart and try again.`,
      canvasCalcs.canvasWidth / 2,
      80
    );
  }

  if (!endGame) tick = requestAnimationFrame(draw);
};
