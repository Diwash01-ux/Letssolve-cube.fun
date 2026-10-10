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


// Create a 3D scene
function createScene(elementId) {

    const element = document.getElementById(elementId);

    const scene = new THREE.Scene();

    scene.background = new THREE.Color(0xd8d8de);

    const camera = new THREE.PerspectiveCamera(
        40,
        element.clientWidth / element.clientHeight,
        0.1,
        100
    );

    camera.position.set(5, 4, 7);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({
        antialias: true
    });

    renderer.setPixelRatio(
        Math.min(window.devicePixelRatio, 2)
    );

    renderer.setSize(
        element.clientWidth,
        element.clientHeight
    );

    renderer.outputEncoding = THREE.sRGBEncoding;

    element.appendChild(renderer.domElement);

    scene.add(
        new THREE.AmbientLight(0xffffff, 1.5)
    );

    const light = new THREE.DirectionalLight(
        0xffffff,
        2
    );

    light.position.set(5, 8, 6);
    scene.add(light);

    return {
        element,
        scene,
        camera,
        renderer
    };
}


// Create the Rubik's Cube
function createCube(world) {

    const cube = new THREE.Group();

    const size = 0.95;
    const gap = 0.04;
    const step = size + gap;

    const blackMaterial = new THREE.MeshStandardMaterial({
        color: COLORS.black,
        roughness: 0.4
    });

    const faceColors = [
        COLORS.red,
        COLORS.orange,
        COLORS.white,
        COLORS.yellow,
        COLORS.blue,
        COLORS.green
    ];

    // Create 27 smaller cubes
    for (let x = -1; x <= 1; x++) {

        for (let y = -1; y <= 1; y++) {

            for (let z = -1; z <= 1; z++) {

                const smallCube = new THREE.Group();

                const core = new THREE.Mesh(
                    new THREE.BoxGeometry(
                        size,
                        size,
                        size
                    ),
                    blackMaterial
                );

                smallCube.add(core);

                // Add colored stickers to exposed faces
                const faces = [
                    {
                        visible: x === 1,
                        position: [size / 2 + 0.01, 0, 0],
                        rotation: [0, Math.PI / 2, 0],
                        color: COLORS.red
                    },
                    {
                        visible: x === -1,
                        position: [-size / 2 - 0.01, 0, 0],
                        rotation: [0, -Math.PI / 2, 0],
                        color: COLORS.orange
                    },
                    {
                        visible: y === 1,
                        position: [0, size / 2 + 0.01, 0],
                        rotation: [-Math.PI / 2, 0, 0],
                        color: COLORS.white
                    },
                    {
                        visible: y === -1,
                        position: [0, -size / 2 - 0.01, 0],
                        rotation: [Math.PI / 2, 0, 0],
                        color: COLORS.yellow
                    },
                    {
                        visible: z === 1,
                        position: [0, 0, size / 2 + 0.01],
                        rotation: [0, 0, 0],
                        color: COLORS.blue
                    },
                    {
                        visible: z === -1,
                        position: [0, 0, -size / 2 - 0.01],
                        rotation: [0, Math.PI, 0],
                        color: COLORS.green
                    }
                ];

                faces.forEach(face => {

                    if (!face.visible) return;

                    const sticker = new THREE.Mesh(
                        new THREE.BoxGeometry(
                            size * 0.82,
                            size * 0.82,
                            0.025
                        ),
                        new THREE.MeshStandardMaterial({
                            color: face.color,
                            roughness: 0.4
                        })
                    );

                    sticker.position.set(
                        ...face.position
                    );

                    sticker.rotation.set(
                        ...face.rotation
                    );

                    smallCube.add(sticker);

                });

                smallCube.position.set(
                    x * step,
                    y * step,
                    z * step
                );

                cube.add(smallCube);

            }
        }
    }

    cube.rotation.set(-0.3, -0.6, 0);

    world.scene.add(cube);

    return cube;
}


// Allow the user to drag and rotate the cube
function enableDragging(world, cube) {

    const canvas = world.renderer.domElement;

    canvas.style.touchAction = 'none';

    canvas.addEventListener('pointerdown', event => {

        drag = {
            x: event.clientX,
            y: event.clientY,
            cube: cube
        };

        canvas.setPointerCapture(event.pointerId);

    });

    canvas.addEventListener('pointermove', event => {

        if (!drag || drag.cube !== cube) return;

        const dx = event.clientX - drag.x;
        const dy = event.clientY - drag.y;

        cube.rotation.y += dx * 0.01;
        cube.rotation.x += dy * 0.01;

        drag.x = event.clientX;
        drag.y = event.clientY;

    });

    function stopDragging() {
        drag = null;
    }

    canvas.addEventListener('pointerup', stopDragging);
    canvas.addEventListener('pointercancel', stopDragging);

}


// Resize the scene when the screen changes
function resizeWorld(world) {

    const width = world.element.clientWidth;
    const height = world.element.clientHeight;

    world.camera.aspect = width / height;

    world.camera.updateProjectionMatrix();

    world.renderer.setSize(width, height);
}


// Start the game screen
function startGame() {

    document.getElementById('game').classList.remove('hidden');

    isPlaying = true;

    if (!gameWorld) {

        gameWorld = createScene('gameScene');

        gameCube = createCube(gameWorld);

        enableDragging(gameWorld, gameCube);

    }

    resizeWorld(gameWorld);
}


// Return to the home screen
function backHome() {

    document.getElementById('game').classList.add('hidden');

    isPlaying = false;

}


// Change the cube's viewing angle
function scrambleCube() {

    if (!gameCube) return;

    gameCube.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI
    );

}


// Reset the viewing angle
function resetCube() {

    if (!gameCube) return;

    gameCube.rotation.set(-0.3, -0.6, 0);

    gameCube.scale.set(1, 1, 1);

}


// Animation loop
function animate() {

    requestAnimationFrame(animate);

    if (homeCube && !isPlaying) {

        homeCube.rotation.y += 0.004;

        homeCube.rotation.x +=
            (0.12 - homeCube.rotation.x) * 0.01;

    }

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


// Initialize the website
window.addEventListener('DOMContentLoaded', () => {

    homeWorld = createScene('scene');

    homeCube = createCube(homeWorld);

    enableDragging(homeWorld, homeCube);

    document
        .getElementById('startButton')
        .addEventListener('click', startGame);

    document
        .getElementById('cubeCard')
        .addEventListener('dblclick', startGame);

    document
        .getElementById('backButton')
        .addEventListener('click', backHome);

    document
        .getElementById('scrambleButton')
        .addEventListener('click', scrambleCube);

    document
        .getElementById('resetButton')
        .addEventListener('click', resetCube);

    window.addEventListener('resize', () => {

        if (homeWorld) resizeWorld(homeWorld);

        if (gameWorld) resizeWorld(gameWorld);

    });

    animate();

});
