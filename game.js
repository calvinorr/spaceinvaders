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

// Invader fleet configuration
const INVADER_ROWS = 5;
const INVADER_COLS = 11;
const INVADER_WIDTH = 40;
const INVADER_HEIGHT = 30;
const INVADER_PADDING = 10;
const INVADER_TOP_OFFSET = 60;
const INVADER_LEFT_OFFSET = 50;
const INVADER_DROP_DISTANCE = 20;
const INVADER_BASE_SPEED = 30;

// Invader fleet state
const invaders = [];
let invaderDirection = 1; // 1 = right, -1 = left
let totalInvaders = INVADER_ROWS * INVADER_COLS;
let aliveInvaders = totalInvaders;

// Initialize invader fleet
function initInvaders() {
    invaders.length = 0;
    for (let row = 0; row < INVADER_ROWS; row++) {
        for (let col = 0; col < INVADER_COLS; col++) {
            invaders.push({
                x: INVADER_LEFT_OFFSET + col * (INVADER_WIDTH + INVADER_PADDING),
                y: INVADER_TOP_OFFSET + row * (INVADER_HEIGHT + INVADER_PADDING),
                width: INVADER_WIDTH,
                height: INVADER_HEIGHT,
                alive: true,
                row: row
            });
        }
    }
    aliveInvaders = totalInvaders;
    invaderDirection = 1;
}

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

function drawInvader(invader) {
    if (!invader.alive) return;

    // Different colors for different rows
    const colors = ['#ff0000', '#ff6600', '#ffff00', '#00ff00', '#00ffff'];
    ctx.fillStyle = colors[invader.row % colors.length];

    const x = invader.x;
    const y = invader.y;
    const w = invader.width;
    const h = invader.height;

    // Classic space invader shape
    // Body
    ctx.fillRect(x + w * 0.2, y + h * 0.2, w * 0.6, h * 0.5);

    // Head
    ctx.fillRect(x + w * 0.3, y, w * 0.4, h * 0.3);

    // Arms
    ctx.fillRect(x, y + h * 0.3, w * 0.2, h * 0.3);
    ctx.fillRect(x + w * 0.8, y + h * 0.3, w * 0.2, h * 0.3);

    // Legs
    ctx.fillRect(x + w * 0.1, y + h * 0.7, w * 0.2, h * 0.3);
    ctx.fillRect(x + w * 0.7, y + h * 0.7, w * 0.2, h * 0.3);

    // Eyes
    ctx.fillStyle = '#000';
    ctx.fillRect(x + w * 0.35, y + h * 0.1, w * 0.1, h * 0.1);
    ctx.fillRect(x + w * 0.55, y + h * 0.1, w * 0.1, h * 0.1);
}

function drawInvaders() {
    for (const invader of invaders) {
        drawInvader(invader);
    }
}

function getFleetBounds() {
    let minX = CANVAS_WIDTH;
    let maxX = 0;

    for (const invader of invaders) {
        if (invader.alive) {
            if (invader.x < minX) minX = invader.x;
            if (invader.x + invader.width > maxX) maxX = invader.x + invader.width;
        }
    }

    return { minX, maxX };
}

function updateInvaders(dt) {
    // Calculate current speed based on remaining invaders
    const speedMultiplier = 1 + ((totalInvaders - aliveInvaders) / totalInvaders) * 2;
    const currentSpeed = INVADER_BASE_SPEED * speedMultiplier;
    const moveAmount = currentSpeed * (dt / 1000);

    // Check if we need to change direction
    const bounds = getFleetBounds();
    let shouldDrop = false;

    if (invaderDirection === 1 && bounds.maxX >= CANVAS_WIDTH - 10) {
        invaderDirection = -1;
        shouldDrop = true;
    } else if (invaderDirection === -1 && bounds.minX <= 10) {
        invaderDirection = 1;
        shouldDrop = true;
    }

    // Move all invaders
    for (const invader of invaders) {
        if (invader.alive) {
            if (shouldDrop) {
                invader.y += INVADER_DROP_DISTANCE;
            }
            invader.x += moveAmount * invaderDirection;
        }
    }
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
    updateInvaders(deltaTime);
}

function render() {
    clearCanvas();
    drawInvaders();
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

// Initialize game
initInvaders();

// Start the game loop
requestAnimationFrame(gameLoop);
