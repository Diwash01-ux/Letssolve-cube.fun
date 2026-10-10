"use strict";

const COLORS = {
  red: 0xf04444,
  orange: 0xff982f,
  white: 0xffffff,
  yellow: 0xffdf35,
  blue: 0x2589ff,
  green: 0x42d66b,
  black: 0x15151b
};

const STEP = 1;
const SIZE = 0.94;

let homeWorld = null;
let gameWorld = null;
let homeCube = null;
let gameCube = null;

let homeCubies = [];
let gameCubies = [];

let busy = false;
let moveCount = 0;
let startTime = 0;
let timerInterval = null;
let timerRunning = false;
let dragState = null;

const FACES = {
  R: { axis: "x", layer: 1, sign: -1 },
  L: { axis: "x", layer: -1, sign: 1 },
  U: { axis: "y", layer: 1, sign: -1 },
  D: { axis: "y", layer: -1, sign: 1 },
  F: { axis: "z", layer: 1, sign: -1 },
  B: { axis: "z", layer: -1, sign: 1 }
};

function createWorld(id) {
  const element = document.getElementById(id);
  if (!element) return null;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x14161d);

  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
  camera.position.set(4.5, 4.2, 6.5);
  camera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  element.appendChild(renderer.domElement);

  scene.add(new THREE.AmbientLight(0xffffff, 1.7));

  const light = new THREE.DirectionalLight(0xffffff, 2.2);
  light.position.set(5, 8, 7);
  scene.add(light);

  const world = { element, scene, camera, renderer };
  resizeWorld(world);
  return world;
}

function resizeWorld(world) {
  if (!world) return;

  const width = Math.max(world.element.clientWidth, 1);
  const height = Math.max(world.element.clientHeight, 1);

  world.camera.aspect = width / height;
  world.camera.updateProjectionMatrix();
  world.renderer.setSize(width, height);
}

function makeCube(world) {
  const cube = new THREE.Group();
  const cubies = [];

  const material = color => new THREE.MeshStandardMaterial({
    color,
    roughness: 0.38,
    metalness: 0.02
  });

  const black = material(COLORS.black);

  const faceMaterials = [
    material(COLORS.red),    // +X
    material(COLORS.orange), // -X
    material(COLORS.white),  // +Y
    material(COLORS.yellow), // -Y
    material(COLORS.green),  // +Z
    material(COLORS.blue)    // -Z
  ];

  const geometry = new THREE.BoxGeometry(SIZE, SIZE, SIZE);

  for (let x = -1; x <= 1; x++) {
    for (let y = -1; y <= 1; y++) {
      for (let z = -1; z <= 1; z++) {
        const mats = [
          x === 1 ? faceMaterials[0] : black,
          x === -1 ? faceMaterials[1] : black,
          y === 1 ? faceMaterials[2] : black,
          y === -1 ? faceMaterials[3] : black,
          z === 1 ? faceMaterials[4] : black,
          z === -1 ? faceMaterials[5] : black
        ];

        const cubie = new THREE.Mesh(geometry, mats);
        cubie.position.set(x * STEP, y * STEP, z * STEP);
        cubie.userData.home = { x, y, z };
        cube.add(cubie);
        cubies.push(cubie);
      }
    }
  }

  world.scene.add(cube);
  return { cube, cubies };
}

function animate() {
  requestAnimationFrame(animate);

  if (homeWorld) {
    homeWorld.renderer.render(homeWorld.scene, homeWorld.camera);
  }

  if (gameWorld) {
    gameWorld.renderer.render(gameWorld.scene, gameWorld.camera);
  }
}

function connectDrag(world, cube) {
  const canvas = world.renderer.domElement;

  canvas.addEventListener("pointerdown", event => {
    if (busy) return;

    dragState = {
      x: event.clientX,
      y: event.clientY,
      id: event.pointerId,
      cube
    };

    canvas.setPointerCapture(event.pointerId);
  });

  canvas.addEventListener("pointermove", event => {
    if (!dragState || dragState.id !== event.pointerId) return;

    const dx = event.clientX - dragState.x;
    const dy = event.clientY - dragState.y;

    dragState.cube.rotation.y += dx * 0.01;
    dragState.cube.rotation.x += dy * 0.01;

    dragState.x = event.clientX;
    dragState.y = event.clientY;
  });

  const stop = () => { dragState = null; };

  canvas.addEventListener("pointerup", stop);
  canvas.addEventListener("pointercancel", stop);
}

function showMessage(text) {
  const el = document.getElementById("message");
  if (!el) return;

  el.textContent = text;
  setTimeout(() => {
    if (el.textContent === text) el.textContent = "";
  }, 2500);
}

function startGame() {
  document.getElementById("home").hidden = true;
  document.getElementById("game").hidden = false;

  resizeWorld(gameWorld);
  if (gameCube) gameCube.visible = true;
}

function backHome() {
  document.getElementById("game").hidden = true;
  document.getElementById("home").hidden = false;

  resizeWorld(homeWorld);
}

function startTimer() {
  if (timerRunning) return;

  timerRunning = true;
  startTime = Date.now();

  timerInterval = setInterval(() => {
    const ms = Date.now() - startTime;
    const mins = Math.floor(ms / 60000);
    const secs = Math.floor((ms % 60000) / 1000);
    const centis = Math.floor((ms % 1000) / 10);

    document.getElementById("timer").textContent =
      String(mins).padStart(2, "0") + ":" +
      String(secs).padStart(2, "0") + "." +
      String(centis).padStart(2, "0");
  }, 50);
}

function stopTimer() {
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = null;
  timerRunning = false;
}

function updateMoves() {
  document.getElementById("move-count").textContent = String(moveCount);
}

function turnFace(face, reverse = false) {
  if (busy) return;

  const info = FACES[face];
  if (!info) return;

  busy = true;
  startTimer();

  const selected = gameCubies.filter(cubie =>
    Math.round(cubie.position[info.axis] / STEP) === info.layer
  );

  const pivot = new THREE.Group();
  gameCube.add(pivot);

  selected.forEach(cubie => pivot.attach(cubie));

  const angle = info.sign * (reverse ? -1 : 1) * Math.PI / 2;
  const start = performance.now();
  const duration = 180;

  function animateTurn(now) {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);

    pivot.rotation[info.axis] = angle * eased;

    if (progress < 1) {
      requestAnimationFrame(animateTurn);
      return;
    }

    pivot.rotation[info.axis] = angle;
    pivot.updateMatrixWorld(true);

    selected.forEach(cubie => {
      gameCube.attach(cubie);

      cubie.position.set(
        Math.round(cubie.position.x),
        Math.round(cubie.position.y),
        Math.round(cubie.position.z)
      );

      const euler = new THREE.Euler().setFromQuaternion(cubie.quaternion);
      euler.x = Math.round(euler.x / (Math.PI / 2)) * Math.PI / 2;
      euler.y = Math.round(euler.y / (Math.PI / 2)) * Math.PI / 2;
      euler.z = Math.round(euler.z / (Math.PI / 2)) * Math.PI / 2;
      cubie.rotation.copy(euler);
    });

    gameCube.remove(pivot);
    moveCount++;
    updateMoves();
    busy = false;

    if (isSolved()) {
      stopTimer();
      showMessage("Cube solved! Great job!");
    }
  }

  requestAnimationFrame(animateTurn);
}

function scrambleCube() {
  if (busy) return;

  const faces = Object.keys(FACES);
  let done = 0;
  let previous = "";

  function next() {
    if (done >= 20) {
      showMessage("Scramble complete. Your turn!");
      return;
    }

    let face;
    do {
      face = faces[Math.floor(Math.random() * faces.length)];
    } while (face === previous);

    previous = face;
    done++;

    turnFace(face, Math.random() < 0.5);
    setTimeout(next, 230);
  }

  next();
}

function isSolved() {
  const sides = [
    { axis: "x", value: 1 },
    { axis: "x", value: -1 },
    { axis: "y", value: 1 },
    { axis: "y", value: -1 },
    { axis: "z", value: 1 },
    { axis: "z", value: -1 }
  ];

  for (const side of sides) {
    const cubies = gameCubies.filter(c =>
      Math.round(c.position[side.axis]) === side.value
    );

    if (cubies.length !== 9) return false;

    const colorOf = c => {
      const normal = new THREE.Vector3(
        side.axis === "x" ? side.value : 0,
        side.axis === "y" ? side.value : 0,
        side.axis === "z" ? side.value : 0
      ).applyQuaternion(c.quaternion);

      const directions = [
        [1, 0, 0, 0], [-1, 0, 0, 1],
        [0, 1, 0, 2], [0, -1, 0, 3],
        [0, 0, 1, 4], [0, 0, -1, 5]
      ];

      let best = directions[0];
      let dotBest = -Infinity;

      for (const d of directions) {
        const dot = normal.x * d[0] +
          normal.y * d[1] + normal.z * d[2];

        if (dot > dotBest) {
          dotBest = dot;
          best = d;
        }
      }

      return c.material[best[3]].color.getHex();
    };

    const firstColor = colorOf(cubies[0]);
    if (cubies.some(c => colorOf(c) !== firstColor)) return false;
  }

  return true;
}

function resetCube() {
  if (busy) return;

  stopTimer();
  moveCount = 0;
  updateMoves();

  document.getElementById("timer").textContent = "00:00.00";

  gameCubies.forEach(cubie => {
    const h = cubie.userData.home;
    cubie.position.set(h.x, h.y, h.z);
    cubie.rotation.set(0, 0, 0);
    cubie.quaternion.identity();
  });

  gameCube.rotation.set(0, 0, 0);
  showMessage("Cube reset.");
}

function resetView() {
  if (busy) return;

  gameCube.rotation.set(0, 0, 0);
  gameWorld.camera.position.set(4.5, 4.2, 6.5);
  gameWorld.camera.lookAt(0, 0, 0);
}

function init() {
  if (!window.THREE) {
    alert("The 3D library did not load. Please check your internet connection.");
    return;
  }

  homeWorld = createWorld("home-cube");
  gameWorld = createWorld("game-cube");

  if (!homeWorld || !gameWorld) {
    console.error("Could not find cube containers.");
    return;
  }

  const home = makeCube(homeWorld);
  homeCube = home.cube;
  homeCubies = home.cubies;

  const game = makeCube(gameWorld);
  gameCube = game.cube;
  gameCubies = game.cubies;

  connectDrag(homeWorld, homeCube);
  connectDrag(gameWorld, gameCube);

  document.getElementById("start-button").addEventListener("click", startGame);
  document.getElementById("nav-play").addEventListener("click", startGame);
  document.getElementById("home-button").addEventListener("click", backHome);
  document.getElementById("scramble-button").addEventListener("click", scrambleCube);
  document.getElementById("reset-button").addEventListener("click", resetCube);
  document.getElementById("reset-view-button").addEventListener("click", resetView);

  document.querySelectorAll("[data-move]").forEach(button => {
    button.addEventListener("click", () => {
      const move = button.dataset.move;
      turnFace(move[0], move.endsWith("'"));
    });
  });

  window.addEventListener("resize", () => {
    resizeWorld(homeWorld);
    resizeWorld(gameWorld);
  });

  animate();
}

window.addEventListener("DOMContentLoaded", init);
