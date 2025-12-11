const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const CANVAS_WIDTH = canvas.width;
const CANVAS_HEIGHT = canvas.height;

let lastTime = 0;
let deltaTime = 0;
let frameCount = 0;
let fpsTime = 0;
let currentFPS = 0;

function clearCanvas() {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
}

function drawFPS() {
    ctx.fillStyle = '#33ff33';
    ctx.font = '14px Courier New';
    ctx.fillText(`FPS: ${currentFPS}`, 10, 20);
}

function update(deltaTime) {
    // Game logic will go here
}

function render() {
    clearCanvas();
    drawFPS();
    // Game rendering will go here
}

function gameLoop(timestamp) {
    deltaTime = timestamp - lastTime;
    lastTime = timestamp;

    // FPS calculation
    frameCount++;
    fpsTime += deltaTime;
    if (fpsTime >= 1000) {
        currentFPS = frameCount;
        frameCount = 0;
        fpsTime = 0;
    }

    update(deltaTime);
    render();

    requestAnimationFrame(gameLoop);
}

// Start the game loop
requestAnimationFrame(gameLoop);
