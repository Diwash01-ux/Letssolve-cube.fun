// Letssolve-cube.fun
// 3D Rubik's Cube Game

const COLORS = {
    red: 0xff3434,
    orange: 0xff982f,
    white: 0xffffff,
    yellow: 0xffdf35,
    blue: 0x2589ff,
    green: 0x42d66b,
    black: 0x15151b
};

let homeWorld;
let gameWorld;
let homeCube;
let gameCube;

let isPlaying = false;
let drag = null;

let cubies = [];
let busy = false;
let moveCount = 0;
let timerStarted = false;
let startTime = 0;
let timerInterval = null;
let scrambleHistory = [];

const CUBIE_SIZE = 0.95;
const GAP = 0.05;
const STEP = CUBIE_SIZE + GAP;

const FACE_INFO = {
    R: { axis: "x", layer: 1, direction: -1 },
    L: { axis: "x", layer: -1, direction: 1 },
    U: { axis: "y", layer: 1, direction: -1 },
    D: { axis: "y", layer: -1, direction: 1 },
    F: { axis: "z", layer: 1, direction: -1 },
    B: { axis: "z", layer: -1, direction: 1 }
};

// ---------- CREATE THREE.JS SCENE ----------

function createScene(elementId) {
    const element = document.getElementById(elementId);

    if (!element) {
        console.error("Missing element:", elementId);
        return null;
    }

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0d0d14);

    const camera = new THREE.PerspectiveCamera(
        40,
        element.clientWidth / Math.max(element.clientHeight, 1),
        0.1,
        100
    );

    camera.position.set(4.5, 4.2, 6.5);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: false
    });

    renderer.setPixelRatio(
        Math.min(window.devicePixelRatio || 1, 2)
    );

    renderer.setSize(
        element.clientWidth || 300,
        element.clientHeight || 300
    );

    renderer.outputEncoding = THREE.sRGBEncoding;

    element.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 1.5));

    const light = new THREE.DirectionalLight(0xffffff, 2);
    light.position.set(5, 8, 6);
    scene.add(light);

    return {
        element,
        scene,
        camera,
        renderer
    };
}

// ---------- CREATE CUBE ----------

function createCube(world) {
    const cube = new THREE.Group();
    const blackMaterial = new THREE.MeshStandardMaterial({
        color: COLORS.black,
        roughness: 0.45
    });

    const stickerMaterials = {
        right: new THREE.MeshStandardMaterial({
            color: COLORS.red,
            roughness: 0.35
        }),
        left: new THREE.MeshStandardMaterial({
            color: COLORS.orange,
            roughness: 0.35
        }),
        top: new THREE.MeshStandardMaterial({
            color: COLORS.white,
            roughness: 0.35
        }),
        bottom: new THREE.MeshStandardMaterial({
            color: COLORS.yellow,
            roughness: 0.35
        }),
        front: new THREE.MeshStandardMaterial({
            color: COLORS.green,
            roughness: 0.35
        }),
        back: new THREE.MeshStandardMaterial({
            color: COLORS.blue,
            roughness: 0.35
        })
    };

    const stickerGeometry = new THREE.BoxGeometry(
        CUBIE_SIZE,
        CUBIE_SIZE,
        CUBIE_SIZE
    );

    for (let x = -1; x <= 1; x++) {
        for (let y = -1; y <= 1; y++) {
            for (let z = -1; z <= 1; z++) {
                const materials = [
                    x === 1 ? stickerMaterials.right : blackMaterial,
                    x === -1 ? stickerMaterials.left : blackMaterial,
                    y === 1 ? stickerMaterials.top : blackMaterial,
                    y === -1 ? stickerMaterials.bottom : blackMaterial,
                    z === 1 ? stickerMaterials.front : blackMaterial,
                    z === -1 ? stickerMaterials.back : blackMaterial
                ];

                const cubie = new THREE.Mesh(
                    stickerGeometry,
                    materials
                );

                cubie.position.set(
                    x * STEP,
                    y * STEP,
                    z * STEP
                );

                cubie.userData.home = {
                    x,
                    y,
                    z
                };

                cube.add(cubie);
                cubies.push(cubie);
            }
        }
    }

    world.scene.add(cube);
    return cube;
}

// ---------- INITIALIZE WORLDS ----------

function initialize() {
    homeWorld = createScene("home-cube");
    gameWorld = createScene("game-cube");

    if (!homeWorld || !gameWorld) {
        console.error(
            "Could not find home-cube or game-cube in index.html."
        );
        return;
    }

    homeCube = createCube(homeWorld);
    gameCube = createCube(gameWorld);

    // Keep the game cube hidden until the player starts.
    gameCube.visible = false;

    animate();
}

// ---------- RENDER LOOP ----------

function animate() {
    requestAnimationFrame(animate);

    if (homeWorld) {
        homeWorld.renderer.render(
            homeWorld.scene,
            homeWorld.camera
        );
    }

    if (gameWorld) {
        gameWorld.renderer.render(
            gameWorld.scene,
            gameWorld.camera
        );
    }
}

// ---------- RESIZE ----------

function resizeWorld(world) {
    if (!world) return;

    const width = world.element.clientWidth;
    const height = world.element.clientHeight;

    if (!width || !height) return;

    world.camera.aspect = width / height;
    world.camera.updateProjectionMatrix();

    world.renderer.setSize(width, height);
}

window.addEventListener("resize", () => {
    resizeWorld(homeWorld);
    resizeWorld(gameWorld);
});

// ---------- DRAG ROTATION ----------

function enableDragging(world, cube) {
    const canvas = world.renderer.domElement;

    canvas.addEventListener("pointerdown", event => {
        if (busy) return;

        drag = {
            x: event.clientX,
            y: event.clientY,
            pointerId: event.pointerId,
            cube
        };

        canvas.setPointerCapture(event.pointerId);
    });

    canvas.addEventListener("pointermove", event => {
        if (!drag || drag.pointerId !== event.pointerId) {
            return;
        }

        const dx = event.clientX - drag.x;
        const dy = event.clientY - drag.y;

        cube.rotation.y += dx * 0.01;
        cube.rotation.x += dy * 0.01;

        drag.x = event.clientX;
        drag.y = event.clientY;
    });

    canvas.addEventListener("pointerup", () => {
        drag = null;
    });

    canvas.addEventListener("pointercancel", () => {
        drag = null;
    });
}

// ---------- GAME NAVIGATION ----------

function startGame() {
    isPlaying = true;

    const homeSection = document.getElementById("home");
    const gameSection = document.getElementById("game");

    if (homeSection) homeSection.style.display = "none";
    if (gameSection) gameSection.style.display = "block";

    if (homeCube) homeCube.visible = false;
    if (gameCube) gameCube.visible = true;

    resizeWorld(gameWorld);
}

function backHome() {
    isPlaying = false;

    const homeSection = document.getElementById("home");
    const gameSection = document.getElementById("game");

    if (homeSection) homeSection.style.display = "";
    if (gameSection) gameSection.style.display = "none";

    if (homeCube) homeCube.visible = true;
    if (gameCube) gameCube.visible = false;

    resizeWorld(homeWorld);
}

// ---------- TIMER ----------

function startTimer() {
    if (timerStarted) return;

    timerStarted = true;
    startTime = Date.now();

    timerInterval = setInterval(updateTimer, 100);
}

function updateTimer() {
    const elapsed = Date.now() - startTime;
    const minutes = Math.floor(elapsed / 60000);
    const seconds = Math.floor((elapsed % 60000) / 1000);
    const hundredths = Math.floor((elapsed % 1000) / 10);

    const display =
        String(minutes).padStart(2, "0") + ":" +
        String(seconds).padStart(2, "0") + "." +
        String(hundredths).padStart(2, "0");

    const timerElement = document.getElementById("timer");

    if (timerElement) {
        timerElement.textContent = display;
    }
}

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }

    timerStarted = false;
}

function resetTimer() {
    stopTimer();

    const timerElement = document.getElementById("timer");

    if (timerElement) {
        timerElement.textContent = "00:00.00";
    }
}

// ---------- MOVE COUNTER ----------

function updateMoveCount() {
    const counter = document.getElementById("move-count");

    if (counter) {
        counter.textContent = String(moveCount);
    }
}

// ---------- FACE TURNS ----------

function turnFace(face, reverse = false) {
    if (busy || !gameCube) return;

    const info = FACE_INFO[face];

    if (!info) {
        console.warn("Unknown face:", face);
        return;
    }

    startTimer();
    busy = true;

    const angle =
        info.direction *
        (reverse ? -1 : 1) *
        Math.PI / 2;

    const selected = cubies.filter(cubie => {
        return Math.round(cubie.position[info.axis] / STEP) ===
            info.layer;
    });

    const pivot = new THREE.Group();
    gameCube.add(pivot);

    // Preserve each selected cubie's world transform.
    selected.forEach(cubie => {
        pivot.attach(cubie);
    });

    const duration = 180;
    const start = performance.now();

    function animateTurn(now) {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);

        pivot.rotation[info.axis] = angle * eased;

        if (progress < 1) {
            requestAnimationFrame(animateTurn);
            return;
        }

        // Snap to an exact quarter turn.
        pivot.rotation[info.axis] = angle;

        gameCube.updateMatrixWorld(true);

        selected.forEach(cubie => {
            gameCube.attach(cubie);

            cubie.position.set(
                Math.round(cubie.position.x / STEP) * STEP,
                Math.round(cubie.position.y / STEP) * STEP,
                Math.round(cubie.position.z / STEP) * STEP
            );

            cubie.rotation.set(
                Math.round(cubie.rotation.x / (Math.PI / 2)) *
                    (Math.PI / 2),
                Math.round(cubie.rotation.y / (Math.PI / 2)) *
                    (Math.PI / 2),
                Math.round(cubie.rotation.z / (Math.PI / 2)) *
                    (Math.PI / 2)
            );
        });

        gameCube.remove(pivot);

        moveCount++;
        updateMoveCount();

        busy = false;

        if (isCubeSolved()) {
            stopTimer();
            showMessage("🎉 Cube solved!");
        }
    }

    requestAnimationFrame(animateTurn);
}

// ---------- SCRAMBLE ----------

function scrambleCube() {
    if (busy) return;

    scrambleHistory = [];

    const faces = ["R", "L", "U", "D", "F", "B"];
    let count = 0;

    function nextMove() {
        if (count >= 20) {
            showMessage("Scrambled! Solve the cube.");
            return;
        }

        let face;

        do {
            face = faces[Math.floor(Math.random() * faces.length)];
        } while (
            scrambleHistory.length &&
            scrambleHistory[scrambleHistory.length - 1] === face
        );

        scrambleHistory.push(face);
        count++;

        turnFace(face, Math.random() < 0.5);

        setTimeout(nextMove, 240);
    }

    nextMove();
}

// ---------- SOLVED CHECK ----------

function isCubeSolved() {
    const faces = [
        { axis: "x", value: 1 },
        { axis: "x", value: -1 },
        { axis: "y", value: 1 },
        { axis: "y", value: -1 },
        { axis: "z", value: 1 },
        { axis: "z", value: -1 }
    ];

    for (const face of faces) {
        const faceCubies = cubies.filter(cubie => {
            return Math.round(cubie.position[face.axis] / STEP) ===
                face.value;
        });

        if (faceCubies.length !== 9) return false;

        const first = faceCubies[0];
        const firstColor = getFaceColor(first, face);

        if (!firstColor) return false;

        for (const cubie of faceCubies) {
            if (getFaceColor(cubie, face) !== firstColor) {
                return false;
            }
        }
    }

    return true;
}

function getFaceColor(cubie, face) {
    const normal = new THREE.Vector3(
        face.axis === "x" ? face.value : 0,
        face.axis === "y" ? face.value : 0,
        face.axis === "z" ? face.value : 0
    );

    normal.applyQuaternion(cubie.quaternion);

    const directions = [
        { x: 1, y: 0, z: 0, material: 0 },
        { x: -1, y: 0, z: 0, material: 1 },
        { x: 0, y: 1, z: 0, material: 2 },
        { x: 0, y: -1, z: 0, material: 3 },
        { x: 0, y: 0, z: 1, material: 4 },
        { x: 0, y: 0, z: -1, material: 5 }
    ];

    let best = null;
    let bestDot = -Infinity;

    for (const direction of directions) {
        const dot =
            normal.x * direction.x +
            normal.y * direction.y +
            normal.z * direction.z;

        if (dot > bestDot) {
            bestDot = dot;
            best = direction;
        }
    }

    if (!best || bestDot < 0.9) return null;

    return cubie.material[best.material].color.getHex();
}

// ---------- RESET ----------

function resetCube() {
    if (busy || !gameCube) return;

    stopTimer();
    moveCount = 0;
    updateMoveCount();
    resetTimer();

    // Restore every cubie to its original position and orientation.
    cubies.forEach(cubie => {
        cubie.position.set(
            cubie.userData.home.x * STEP,
            cubie.userData.home.y * STEP,
            cubie.userData.home.z * STEP
        );

        cubie.rotation.set(0, 0, 0);
        cubie.quaternion.identity();
    });

    gameCube.rotation.set(0, 0, 0);

    showMessage("Cube reset!");
}

function resetView() {
    if (!gameCube || busy) return;

    gameCube.rotation.set(0, 0, 0);
    gameWorld.camera.position.set(4.5, 4.2, 6.5);
    gameWorld.camera.lookAt(0, 0, 0);
}

// ---------- MESSAGE ----------

function showMessage(message) {
    const element = document.getElementById("message");

    if (element) {
        element.textContent = message;

        setTimeout(() => {
            if (element.textContent === message) {
                element.textContent = "";
            }
        }, 2500);
    } else {
        console.log(message);
    }
}

// ---------- BUTTON CONNECTIONS ----------

function connectButtons() {
    const buttonActions = {
        "start-button": startGame,
        "scramble-button": scrambleCube,
        "reset-button": resetCube,
        "reset-view-button": resetView,
        "home-button": backHome
    };

    Object.entries(buttonActions).forEach(([id, action]) => {
        const button = document.getElementById(id);

        if (button) {
            button.addEventListener("click", action);
        }
    });

    document.querySelectorAll("[data-move]").forEach(button => {
        button.addEventListener("click", () => {
            const value = button.dataset.move;
            const reverse = value.endsWith("'");

            turnFace(value[0], reverse);
        });
    });
}

// ---------- START ----------

window.addEventListener("DOMContentLoaded", () => {
    initialize();

    if (homeWorld && homeCube) {
        enableDragging(homeWorld, homeCube);
    }

    if (gameWorld && gameCube) {
        enableDragging(gameWorld, gameCube);
    }

    connectButtons();
});// Letssolve-cube.fun
// 3D Rubik's Cube Game

const COLORS = {
    red: 0xff3434,
    orange: 0xff982f,
    white: 0xffffff,
    yellow: 0xffdf35,
    blue: 0x2589ff,
    green: 0x42d66b,
    black: 0x15151b
};

let homeWorld;
let gameWorld;
let homeCube;
let gameCube;

let isPlaying = false;
let drag = null;

let cubies = [];
let busy = false;
let moveCount = 0;
let timerStarted = false;
let startTime = 0;
let timerInterval = null;
let scrambleHistory = [];

const CUBIE_SIZE = 0.95;
const GAP = 0.05;
const STEP = CUBIE_SIZE + GAP;

const FACE_INFO = {
    R: { axis: "x", layer: 1, direction: -1 },
    L: { axis: "x", layer: -1, direction: 1 },
    U: { axis: "y", layer: 1, direction: -1 },
    D: { axis: "y", layer: -1, direction: 1 },
    F: { axis: "z", layer: 1, direction: -1 },
    B: { axis: "z", layer: -1, direction: 1 }
};

// ---------- CREATE THREE.JS SCENE ----------

function createScene(elementId) {
    const element = document.getElementById(elementId);

    if (!element) {
        console.error("Missing element:", elementId);
        return null;
    }

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0d0d14);

    const camera = new THREE.PerspectiveCamera(
        40,
        element.clientWidth / Math.max(element.clientHeight, 1),
        0.1,
        100
    );

    camera.position.set(4.5, 4.2, 6.5);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: false
    });

    renderer.setPixelRatio(
        Math.min(window.devicePixelRatio || 1, 2)
    );

    renderer.setSize(
        element.clientWidth || 300,
        element.clientHeight || 300
    );

    renderer.outputEncoding = THREE.sRGBEncoding;

    element.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 1.5));

    const light = new THREE.DirectionalLight(0xffffff, 2);
    light.position.set(5, 8, 6);
    scene.add(light);

    return {
        element,
        scene,
        camera,
        renderer
    };
}

// ---------- CREATE CUBE ----------

function createCube(world) {
    const cube = new THREE.Group();
    const blackMaterial = new THREE.MeshStandardMaterial({
        color: COLORS.black,
        roughness: 0.45
    });

    const stickerMaterials = {
        right: new THREE.MeshStandardMaterial({
            color: COLORS.red,
            roughness: 0.35
        }),
        left: new THREE.MeshStandardMaterial({
            color: COLORS.orange,
            roughness: 0.35
        }),
        top: new THREE.MeshStandardMaterial({
            color: COLORS.white,
            roughness: 0.35
        }),
        bottom: new THREE.MeshStandardMaterial({
            color: COLORS.yellow,
            roughness: 0.35
        }),
        front: new THREE.MeshStandardMaterial({
            color: COLORS.green,
            roughness: 0.35
        }),
        back: new THREE.MeshStandardMaterial({
            color: COLORS.blue,
            roughness: 0.35
        })
    };

    const stickerGeometry = new THREE.BoxGeometry(
        CUBIE_SIZE,
        CUBIE_SIZE,
        CUBIE_SIZE
    );

    for (let x = -1; x <= 1; x++) {
        for (let y = -1; y <= 1; y++) {
            for (let z = -1; z <= 1; z++) {
                const materials = [
                    x === 1 ? stickerMaterials.right : blackMaterial,
                    x === -1 ? stickerMaterials.left : blackMaterial,
                    y === 1 ? stickerMaterials.top : blackMaterial,
                    y === -1 ? stickerMaterials.bottom : blackMaterial,
                    z === 1 ? stickerMaterials.front : blackMaterial,
                    z === -1 ? stickerMaterials.back : blackMaterial
                ];

                const cubie = new THREE.Mesh(
                    stickerGeometry,
                    materials
                );

                cubie.position.set(
                    x * STEP,
                    y * STEP,
                    z * STEP
                );

                cubie.userData.home = {
                    x,
                    y,
                    z
                };

                cube.add(cubie);
                cubies.push(cubie);
            }
        }
    }

    world.scene.add(cube);
    return cube;
}

// ---------- INITIALIZE WORLDS ----------

function initialize() {
    homeWorld = createScene("home-cube");
    gameWorld = createScene("game-cube");

    if (!homeWorld || !gameWorld) {
        console.error(
            "Could not find home-cube or game-cube in index.html."
        );
        return;
    }

    homeCube = createCube(homeWorld);
    gameCube = createCube(gameWorld);

    // Keep the game cube hidden until the player starts.
    gameCube.visible = false;

    animate();
}

// ---------- RENDER LOOP ----------

function animate() {
    requestAnimationFrame(animate);

    if (homeWorld) {
        homeWorld.renderer.render(
            homeWorld.scene,
            homeWorld.camera
        );
    }

    if (gameWorld) {
        gameWorld.renderer.render(
            gameWorld.scene,
            gameWorld.camera
        );
    }
}

// ---------- RESIZE ----------

function resizeWorld(world) {
    if (!world) return;

    const width = world.element.clientWidth;
    const height = world.element.clientHeight;

    if (!width || !height) return;

    world.camera.aspect = width / height;
    world.camera.updateProjectionMatrix();

    world.renderer.setSize(width, height);
}

window.addEventListener("resize", () => {
    resizeWorld(homeWorld);
    resizeWorld(gameWorld);
});

// ---------- DRAG ROTATION ----------

function enableDragging(world, cube) {
    const canvas = world.renderer.domElement;

    canvas.addEventListener("pointerdown", event => {
        if (busy) return;

        drag = {
            x: event.clientX,
            y: event.clientY,
            pointerId: event.pointerId,
            cube
        };

        canvas.setPointerCapture(event.pointerId);
    });

    canvas.addEventListener("pointermove", event => {
        if (!drag || drag.pointerId !== event.pointerId) {
            return;
        }

        const dx = event.clientX - drag.x;
        const dy = event.clientY - drag.y;

        cube.rotation.y += dx * 0.01;
        cube.rotation.x += dy * 0.01;

        drag.x = event.clientX;
        drag.y = event.clientY;
    });

    canvas.addEventListener("pointerup", () => {
        drag = null;
    });

    canvas.addEventListener("pointercancel", () => {
        drag = null;
    });
}

// ---------- GAME NAVIGATION ----------

function startGame() {
    isPlaying = true;

    const homeSection = document.getElementById("home");
    const gameSection = document.getElementById("game");

    if (homeSection) homeSection.style.display = "none";
    if (gameSection) gameSection.style.display = "block";

    if (homeCube) homeCube.visible = false;
    if (gameCube) gameCube.visible = true;

    resizeWorld(gameWorld);
}

function backHome() {
    isPlaying = false;

    const homeSection = document.getElementById("home");
    const gameSection = document.getElementById("game");

    if (homeSection) homeSection.style.display = "";
    if (gameSection) gameSection.style.display = "none";

    if (homeCube) homeCube.visible = true;
    if (gameCube) gameCube.visible = false;

    resizeWorld(homeWorld);
}

// ---------- TIMER ----------

function startTimer() {
    if (timerStarted) return;

    timerStarted = true;
    startTime = Date.now();

    timerInterval = setInterval(updateTimer, 100);
}

function updateTimer() {
    const elapsed = Date.now() - startTime;
    const minutes = Math.floor(elapsed / 60000);
    const seconds = Math.floor((elapsed % 60000) / 1000);
    const hundredths = Math.floor((elapsed % 1000) / 10);

    const display =
        String(minutes).padStart(2, "0") + ":" +
        String(seconds).padStart(2, "0") + "." +
        String(hundredths).padStart(2, "0");

    const timerElement = document.getElementById("timer");

    if (timerElement) {
        timerElement.textContent = display;
    }
}

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }

    timerStarted = false;
}

function resetTimer() {
    stopTimer();

    const timerElement = document.getElementById("timer");

    if (timerElement) {
        timerElement.textContent = "00:00.00";
    }
}

// ---------- MOVE COUNTER ----------

function updateMoveCount() {
    const counter = document.getElementById("move-count");

    if (counter) {
        counter.textContent = String(moveCount);
    }
}

// ---------- FACE TURNS ----------

function turnFace(face, reverse = false) {
    if (busy || !gameCube) return;

    const info = FACE_INFO[face];

    if (!info) {
        console.warn("Unknown face:", face);
        return;
    }

    startTimer();
    busy = true;

    const angle =
        info.direction *
        (reverse ? -1 : 1) *
        Math.PI / 2;

    const selected = cubies.filter(cubie => {
        return Math.round(cubie.position[info.axis] / STEP) ===
            info.layer;
    });

    const pivot = new THREE.Group();
    gameCube.add(pivot);

    // Preserve each selected cubie's world transform.
    selected.forEach(cubie => {
        pivot.attach(cubie);
    });

    const duration = 180;
    const start = performance.now();

    function animateTurn(now) {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);

        pivot.rotation[info.axis] = angle * eased;

        if (progress < 1) {
            requestAnimationFrame(animateTurn);
            return;
        }

        // Snap to an exact quarter turn.
        pivot.rotation[info.axis] = angle;

        gameCube.updateMatrixWorld(true);

        selected.forEach(cubie => {
            gameCube.attach(cubie);

            cubie.position.set(
                Math.round(cubie.position.x / STEP) * STEP,
                Math.round(cubie.position.y / STEP) * STEP,
                Math.round(cubie.position.z / STEP) * STEP
            );

            cubie.rotation.set(
                Math.round(cubie.rotation.x / (Math.PI / 2)) *
                    (Math.PI / 2),
                Math.round(cubie.rotation.y / (Math.PI / 2)) *
                    (Math.PI / 2),
                Math.round(cubie.rotation.z / (Math.PI / 2)) *
                    (Math.PI / 2)
            );
        });

        gameCube.remove(pivot);

        moveCount++;
        updateMoveCount();

        busy = false;

        if (isCubeSolved()) {
            stopTimer();
            showMessage("🎉 Cube solved!");
        }
    }

    requestAnimationFrame(animateTurn);
}

// ---------- SCRAMBLE ----------

function scrambleCube() {
    if (busy) return;

    scrambleHistory = [];

    const faces = ["R", "L", "U", "D", "F", "B"];
    let count = 0;

    function nextMove() {
        if (count >= 20) {
            showMessage("Scrambled! Solve the cube.");
            return;
        }

        let face;

        do {
            face = faces[Math.floor(Math.random() * faces.length)];
        } while (
            scrambleHistory.length &&
            scrambleHistory[scrambleHistory.length - 1] === face
        );

        scrambleHistory.push(face);
        count++;

        turnFace(face, Math.random() < 0.5);

        setTimeout(nextMove, 240);
    }

    nextMove();
}

// ---------- SOLVED CHECK ----------

function isCubeSolved() {
    const faces = [
        { axis: "x", value: 1 },
        { axis: "x", value: -1 },
        { axis: "y", value: 1 },
        { axis: "y", value: -1 },
        { axis: "z", value: 1 },
        { axis: "z", value: -1 }
    ];

    for (const face of faces) {
        const faceCubies = cubies.filter(cubie => {
            return Math.round(cubie.position[face.axis] / STEP) ===
                face.value;
        });

        if (faceCubies.length !== 9) return false;

        const first = faceCubies[0];
        const firstColor = getFaceColor(first, face);

        if (!firstColor) return false;

        for (const cubie of faceCubies) {
            if (getFaceColor(cubie, face) !== firstColor) {
                return false;
            }
        }
    }

    return true;
}

function getFaceColor(cubie, face) {
    const normal = new THREE.Vector3(
        face.axis === "x" ? face.value : 0,
        face.axis === "y" ? face.value : 0,
        face.axis === "z" ? face.value : 0
    );

    normal.applyQuaternion(cubie.quaternion);

    const directions = [
        { x: 1, y: 0, z: 0, material: 0 },
        { x: -1, y: 0, z: 0, material: 1 },
        { x: 0, y: 1, z: 0, material: 2 },
        { x: 0, y: -1, z: 0, material: 3 },
        { x: 0, y: 0, z: 1, material: 4 },
        { x: 0, y: 0, z: -1, material: 5 }
    ];

    let best = null;
    let bestDot = -Infinity;

    for (const direction of directions) {
        const dot =
            normal.x * direction.x +
            normal.y * direction.y +
            normal.z * direction.z;

        if (dot > bestDot) {
            bestDot = dot;
            best = direction;
        }
    }

    if (!best || bestDot < 0.9) return null;

    return cubie.material[best.material].color.getHex();
}

// ---------- RESET ----------

function resetCube() {
    if (busy || !gameCube) return;

    stopTimer();
    moveCount = 0;
    updateMoveCount();
    resetTimer();

    // Restore every cubie to its original position and orientation.
    cubies.forEach(cubie => {
        cubie.position.set(
            cubie.userData.home.x * STEP,
            cubie.userData.home.y * STEP,
            cubie.userData.home.z * STEP
        );

        cubie.rotation.set(0, 0, 0);
        cubie.quaternion.identity();
    });

    gameCube.rotation.set(0, 0, 0);

    showMessage("Cube reset!");
}

function resetView() {
    if (!gameCube || busy) return;

    gameCube.rotation.set(0, 0, 0);
    gameWorld.camera.position.set(4.5, 4.2, 6.5);
    gameWorld.camera.lookAt(0, 0, 0);
}

// ---------- MESSAGE ----------

function showMessage(message) {
    const element = document.getElementById("message");

    if (element) {
        element.textContent = message;

        setTimeout(() => {
            if (element.textContent === message) {
                element.textContent = "";
            }
        }, 2500);
    } else {
        console.log(message);
    }
}

// ---------- BUTTON CONNECTIONS ----------

function connectButtons() {
    const buttonActions = {
        "start-button": startGame,
        "scramble-button": scrambleCube,
        "reset-button": resetCube,
        "reset-view-button": resetView,
        "home-button": backHome
    };

    Object.entries(buttonActions).forEach(([id, action]) => {
        const button = document.getElementById(id);
// Letssolve-cube.fun
// 3D Rubik's Cube Game

const COLORS = {
    red: 0xff3434,
    orange: 0xff982f,
    white: 0xffffff,
    yellow: 0xffdf35,
    blue: 0x2589ff,
    green: 0x42d66b,
    black: 0x15151b
};

let homeWorld;
let gameWorld;
let homeCube;
let gameCube;

let isPlaying = false;
let drag = null;

let cubies = [];
let busy = false;
let moveCount = 0;
let timerStarted = false;
let startTime = 0;
let timerInterval = null;
let scrambleHistory = [];

const CUBIE_SIZE = 0.95;
const GAP = 0.05;
const STEP = CUBIE_SIZE + GAP;

const FACE_INFO = {
    R: { axis: "x", layer: 1, direction: -1 },
    L: { axis: "x", layer: -1, direction: 1 },
    U: { axis: "y", layer: 1, direction: -1 },
    D: { axis: "y", layer: -1, direction: 1 },
    F: { axis: "z", layer: 1, direction: -1 },
    B: { axis: "z", layer: -1, direction: 1 }
};

// ---------- CREATE THREE.JS SCENE ----------

function createScene(elementId) {
    const element = document.getElementById(elementId);

    if (!element) {
        console.error("Missing element:", elementId);
        return null;
    }

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0d0d14);

    const camera = new THREE.PerspectiveCamera(
        40,
        element.clientWidth / Math.max(element.clientHeight, 1),
        0.1,
        100
    );

    camera.position.set(4.5, 4.2, 6.5);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: false
    });

    renderer.setPixelRatio(
        Math.min(window.devicePixelRatio || 1, 2)
    );

    renderer.setSize(
        element.clientWidth || 300,
        element.clientHeight || 300
    );

    renderer.outputEncoding = THREE.sRGBEncoding;

    element.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 1.5));

    const light = new THREE.DirectionalLight(0xffffff, 2);
    light.position.set(5, 8, 6);
    scene.add(light);

    return {
        element,
        scene,
        camera,
        renderer
    };
}

// ---------- CREATE CUBE ----------

function createCube(world) {
    const cube = new THREE.Group();
    const blackMaterial = new THREE.MeshStandardMaterial({
        color: COLORS.black,
        roughness: 0.45
    });

    const stickerMaterials = {
        right: new THREE.MeshStandardMaterial({
            color: COLORS.red,
            roughness: 0.35
        }),
        left: new THREE.MeshStandardMaterial({
            color: COLORS.orange,
            roughness: 0.35
        }),
        top: new THREE.MeshStandardMaterial({
            color: COLORS.white,
            roughness: 0.35
        }),
        bottom: new THREE.MeshStandardMaterial({
            color: COLORS.yellow,
            roughness: 0.35
        }),
        front: new THREE.MeshStandardMaterial({
            color: COLORS.green,
            roughness: 0.35
        }),
        back: new THREE.MeshStandardMaterial({
            color: COLORS.blue,
            roughness: 0.35
        })
    };

    const stickerGeometry = new THREE.BoxGeometry(
        CUBIE_SIZE,
        CUBIE_SIZE,
        CUBIE_SIZE
    );

    for (let x = -1; x <= 1; x++) {
        for (let y = -1; y <= 1; y++) {
            for (let z = -1; z <= 1; z++) {
                const materials = [
                    x === 1 ? stickerMaterials.right : blackMaterial,
                    x === -1 ? stickerMaterials.left : blackMaterial,
                    y === 1 ? stickerMaterials.top : blackMaterial,
                    y === -1 ? stickerMaterials.bottom : blackMaterial,
                    z === 1 ? stickerMaterials.front : blackMaterial,
                    z === -1 ? stickerMaterials.back : blackMaterial
                ];

                const cubie = new THREE.Mesh(
                    stickerGeometry,
                    materials
                );

                cubie.position.set(
                    x * STEP,
                    y * STEP,
                    z * STEP
                );

                cubie.userData.home = {
                    x,
                    y,
                    z
                };

                cube.add(cubie);
                cubies.push(cubie);
            }
        }
    }

    world.scene.add(cube);
    return cube;
}

// ---------- INITIALIZE WORLDS ----------

function initialize() {
    homeWorld = createScene("home-cube");
    gameWorld = createScene("game-cube");

    if (!homeWorld || !gameWorld) {
        console.error(
            "Could not find home-cube or game-cube in index.html."
        );
        return;
    }

    homeCube = createCube(homeWorld);
    gameCube = createCube(gameWorld);

    // Keep the game cube hidden until the player starts.
    gameCube.visible = false;

    animate();
}

// ---------- RENDER LOOP ----------

function animate() {
    requestAnimationFrame(animate);

    if (homeWorld) {
        homeWorld.renderer.render(
            homeWorld.scene,
            homeWorld.camera
        );
    }

    if (gameWorld) {
        gameWorld.renderer.render(
            gameWorld.scene,
            gameWorld.camera
        );
    }
}

// ---------- RESIZE ----------

function resizeWorld(world) {
    if (!world) return;

    const width = world.element.clientWidth;
    const height = world.element.clientHeight;

    if (!width || !height) return;

    world.camera.aspect = width / height;
    world.camera.updateProjectionMatrix();

    world.renderer.setSize(width, height);
}

window.addEventListener("resize", () => {
    resizeWorld(homeWorld);
    resizeWorld(gameWorld);
});

// ---------- DRAG ROTATION ----------

function enableDragging(world, cube) {
    const canvas = world.renderer.domElement;

    canvas.addEventListener("pointerdown", event => {
        if (busy) return;

        drag = {
            x: event.clientX,
            y: event.clientY,
            pointerId: event.pointerId,
            cube
        };

        canvas.setPointerCapture(event.pointerId);
    });

    canvas.addEventListener("pointermove", event => {
        if (!drag || drag.pointerId !== event.pointerId) {
            return;
        }

        const dx = event.clientX - drag.x;
        const dy = event.clientY - drag.y;

        cube.rotation.y += dx * 0.01;
        cube.rotation.x += dy * 0.01;

        drag.x = event.clientX;
        drag.y = event.clientY;
    });

    canvas.addEventListener("pointerup", () => {
        drag = null;
    });

    canvas.addEventListener("pointercancel", () => {
        drag = null;
    });
}

// ---------- GAME NAVIGATION ----------

function startGame() {
    isPlaying = true;

    const homeSection = document.getElementById("home");
    const gameSection = document.getElementById("game");

    if (homeSection) homeSection.style.display = "none";
    if (gameSection) gameSection.style.display = "block";

    if (homeCube) homeCube.visible = false;
    if (gameCube) gameCube.visible = true;

    resizeWorld(gameWorld);
}

function backHome() {
    isPlaying = false;

    const homeSection = document.getElementById("home");
    const gameSection = document.getElementById("game");

    if (homeSection) homeSection.style.display = "";
    if (gameSection) gameSection.style.display = "none";

    if (homeCube) homeCube.visible = true;
    if (gameCube) gameCube.visible = false;

    resizeWorld(homeWorld);
}

// ---------- TIMER ----------

function startTimer() {
    if (timerStarted) return;

    timerStarted = true;
    startTime = Date.now();

    timerInterval = setInterval(updateTimer, 100);
}

function updateTimer() {
    const elapsed = Date.now() - startTime;
    const minutes = Math.floor(elapsed / 60000);
    const seconds = Math.floor((elapsed % 60000) / 1000);
    const hundredths = Math.floor((elapsed % 1000) / 10);

    const display =
        String(minutes).padStart(2, "0") + ":" +
        String(seconds).padStart(2, "0") + "." +
        String(hundredths).padStart(2, "0");

    const timerElement = document.getElementById("timer");

    if (timerElement) {
        timerElement.textContent = display;
    }
}

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }

    timerStarted = false;
}

function resetTimer() {
    stopTimer();

    const timerElement = document.getElementById("timer");

    if (timerElement) {
        timerElement.textContent = "00:00.00";
    }
}

// ---------- MOVE COUNTER ----------

function updateMoveCount() {
    const counter = document.getElementById("move-count");

    if (counter) {
        counter.textContent = String(moveCount);
    }
}

// ---------- FACE TURNS ----------

function turnFace(face, reverse = false) {
    if (busy || !gameCube) return;

    const info = FACE_INFO[face];

    if (!info) {
        console.warn("Unknown face:", face);
        return;
    }

    startTimer();
    busy = true;

    const angle =
        info.direction *
        (reverse ? -1 : 1) *
        Math.PI / 2;

    const selected = cubies.filter(cubie => {
        return Math.round(cubie.position[info.axis] / STEP) ===
            info.layer;
    });

    const pivot = new THREE.Group();
    gameCube.add(pivot);

    // Preserve each selected cubie's world transform.
    selected.forEach(cubie => {
        pivot.attach(cubie);
    });

    const duration = 180;
    const start = performance.now();

    function animateTurn(now) {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);

        pivot.rotation[info.axis] = angle * eased;

        if (progress < 1) {
            requestAnimationFrame(animateTurn);
            return;
        }

        // Snap to an exact quarter turn.
        pivot.rotation[info.axis] = angle;

        gameCube.updateMatrixWorld(true);

        selected.forEach(cubie => {
            gameCube.attach(cubie);

            cubie.position.set(
                Math.round(cubie.position.x / STEP) * STEP,
                Math.round(cubie.position.y / STEP) * STEP,
                Math.round(cubie.position.z / STEP) * STEP
            );

            cubie.rotation.set(
                Math.round(cubie.rotation.x / (Math.PI / 2)) *
                    (Math.PI / 2),
                Math.round(cubie.rotation.y / (Math.PI / 2)) *
                    (Math.PI / 2),
                Math.round(cubie.rotation.z / (Math.PI / 2)) *
                    (Math.PI / 2)
            );
        });

        gameCube.remove(pivot);

        moveCount++;
        updateMoveCount();

        busy = false;

        if (isCubeSolved()) {
            stopTimer();
            showMessage("🎉 Cube solved!");
        }
    }

    requestAnimationFrame(animateTurn);
}

// ---------- SCRAMBLE ----------

function scrambleCube() {
    if (busy) return;

    scrambleHistory = [];

    const faces = ["R", "L", "U", "D", "F", "B"];
    let count = 0;

    function nextMove() {
        if (count >= 20) {
            showMessage("Scrambled! Solve the cube.");
            return;
        }

        let face;

        do {
            face = faces[Math.floor(Math.random() * faces.length)];
        } while (
            scrambleHistory.length &&
            scrambleHistory[scrambleHistory.length - 1] === face
        );

        scrambleHistory.push(face);
        count++;

        turnFace(face, Math.random() < 0.5);

        setTimeout(nextMove, 240);
    }

    nextMove();
}

// ---------- SOLVED CHECK ----------

function isCubeSolved() {
    const faces = [
        { axis: "x", value: 1 },
        { axis: "x", value: -1 },
        { axis: "y", value: 1 },
        { axis: "y", value: -1 },
        { axis: "z", value: 1 },
        { axis: "z", value: -1 }
    ];

    for (const face of faces) {
        const faceCubies = cubies.filter(cubie => {
            return Math.round(cubie.position[face.axis] / STEP) ===
                face.value;
        });

        if (faceCubies.length !== 9) return false;

        const first = faceCubies[0];
        const firstColor = getFaceColor(first, face);

        if (!firstColor) return false;

        for (const cubie of faceCubies) {
            if (getFaceColor(cubie, face) !== firstColor) {
                return false;
            }
        }
    }

    return true;
}

function getFaceColor(cubie, face) {
    const normal = new THREE.Vector3(
        face.axis === "x" ? face.value : 0,
        face.axis === "y" ? face.value : 0,
        face.axis === "z" ? face.value : 0
    );

    normal.applyQuaternion(cubie.quaternion);

    const directions = [
        { x: 1, y: 0, z: 0, material: 0 },
        { x: -1, y: 0, z: 0, material: 1 },
        { x: 0, y: 1, z: 0, material: 2 },
        { x: 0, y: -1, z: 0, material: 3 },
        { x: 0, y: 0, z: 1, material: 4 },
        { x: 0, y: 0, z: -1, material: 5 }
    ];

    let best = null;
    let bestDot = -Infinity;

    for (const direction of directions) {
        const dot =
            normal.x * direction.x +
            normal.y * direction.y +
            normal.z * direction.z;

        if (dot > bestDot) {
            bestDot = dot;
            best = direction;
        }
    }

    if (!best || bestDot < 0.9) return null;

    return cubie.material[best.material].color.getHex();
}

// ---------- RESET ----------

function resetCube() {
    if (busy || !gameCube) return;

    stopTimer();
    moveCount = 0;
    updateMoveCount();
    resetTimer();

    // Restore every cubie to its original position and orientation.
    cubies.forEach(cubie => {
        cubie.position.set(
            cubie.userData.home.x * STEP,
            cubie.userData.home.y * STEP,
            cubie.userData.home.z * STEP
        );

        cubie.rotation.set(0, 0, 0);
        cubie.quaternion.identity();
    });

    gameCube.rotation.set(0, 0, 0);

    showMessage("Cube reset!");
}

function resetView() {
    if (!gameCube || busy) return;

    gameCube.rotation.set(0, 0, 0);
    gameWorld.camera.position.set(4.5, 4.2, 6.5);
    gameWorld.camera.lookAt(0, 0, 0);
}

// ---------- MESSAGE ----------

function showMessage(message) {
    const element = document.getElementById("message");

    if (element) {
        element.textContent = message;

        setTimeout(() => {
            if (element.textContent === message) {
                element.textContent = "";
            }
        }, 2500);
    } else {
        console.log(message);
    }
}

// ---------- BUTTON CONNECTIONS ----------

function connectButtons() {
    const buttonActions = {
        "start-button": startGame,
        "scramble-button": scrambleCube,
        "reset-button": resetCube,
        "reset-view-button": resetView,
        "home-button": backHome
    };

    Object.entries(buttonActions).forEach(([id, action]) => {
        const button = document.getElementById(id);

        if (button) {
            button.addEventListener("click", action);
        }
    });

    document.querySelectorAll("[data-move]").forEach(button => {
        button.addEventListener("click", () => {
            const value = button.dataset.move;
            const reverse = value.endsWith("'");

            turnFace(value[0], reverse);
        });
    });
}

// ---------- START ----------

window.addEventListener("DOMContentLoaded", () => {
    initialize();

    if (homeWorld && homeCube) {
        enableDragging(homeWorld, homeCube);
    }

    if (gameWorld && gameCube) {
        enableDragging(gameWorld, gameCube);
    }

    connectButtons();
});
        if (button) {
            button.addEventListener("click", action);
        }
    });

    document.querySelectorAll("[data-move]").forEach(button => {
        button.addEventListener("click", () => {
            const value = button.dataset.move;
            const reverse = value.endsWith("'");

            turnFace(value[0], reverse);
        });
    });
}

// ---------- START ----------

window.addEventListener("DOMContentLoaded", () => {
    initialize();

    if (homeWorld && homeCube) {
        enableDragging(homeWorld, homeCube);
    }

    if (gameWorld && gameCube) {
        enableDragging(gameWorld, gameCube);
    }

    connectButtons();
});
