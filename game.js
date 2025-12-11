const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const CANVAS_WIDTH = canvas.width;
const CANVAS_HEIGHT = canvas.height;

let lastTime = 0;
let deltaTime = 0;
let frameCount = 0;
let fpsTime = 0;
let currentFPS = 0;

// Input state
const keys = {
    left: false,
    right: false
};

// Player ship
const player = {
    x: CANVAS_WIDTH / 2 - 25,
    y: CANVAS_HEIGHT - 60,
    width: 50,
    height: 30,
    speed: 300
};

// Keyboard event listeners
document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        keys.left = true;
    }
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        keys.right = true;
    }
});

document.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        keys.left = false;
    }
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        keys.right = false;
    }
});

function clearCanvas() {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
}

function drawFPS() {
    ctx.fillStyle = '#33ff33';
    ctx.font = '14px Courier New';
    ctx.fillText(`FPS: ${currentFPS}`, 10, 20);
}

function drawPlayer() {
    ctx.fillStyle = '#33ff33';

    // Draw ship body (rectangle)
    ctx.fillRect(player.x, player.y + 10, player.width, player.height - 10);

    // Draw ship cannon (triangle on top)
    ctx.beginPath();
    ctx.moveTo(player.x + player.width / 2, player.y);
    ctx.lineTo(player.x + player.width / 2 - 10, player.y + 10);
    ctx.lineTo(player.x + player.width / 2 + 10, player.y + 10);
    ctx.closePath();
    ctx.fill();
}

function updatePlayer(dt) {
    const moveAmount = player.speed * (dt / 1000);

    if (keys.left) {
        player.x -= moveAmount;
    }
    if (keys.right) {
        player.x += moveAmount;
    }

    // Boundary checking
    if (player.x < 0) {
        player.x = 0;
    }
    if (player.x > CANVAS_WIDTH - player.width) {
        player.x = CANVAS_WIDTH - player.width;
    }
}

function update(deltaTime) {
    updatePlayer(deltaTime);
}

function render() {
    clearCanvas();
    drawPlayer();
    drawFPS();
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
