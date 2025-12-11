const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const CANVAS_WIDTH = canvas.width;
const CANVAS_HEIGHT = canvas.height;

let lastTime = 0;
let deltaTime = 0;
let frameCount = 0;
let fpsTime = 0;
let currentFPS = 0;

// Game state
let gameState = 'playing'; // 'playing', 'gameover', 'victory'
let playerHit = false;
let playerHitTimer = 0;
const PLAYER_HIT_FLASH_DURATION = 200;

// Input state
const keys = {
    left: false,
    right: false,
    shoot: false
};

// Player ship
const player = {
    x: CANVAS_WIDTH / 2 - 25,
    y: CANVAS_HEIGHT - 60,
    width: 50,
    height: 30,
    speed: 300
};

// Bullet configuration
const PLAYER_BULLET_SPEED = 400;
const INVADER_BULLET_SPEED = 200;
const BULLET_WIDTH = 4;
const BULLET_HEIGHT = 12;
const INVADER_FIRE_INTERVAL = 1500; // ms between invader shots

// Bullet arrays
const playerBullets = [];
const invaderBullets = [];
let invaderFireTimer = 0;

// Explosion particles
const explosions = [];
const EXPLOSION_DURATION = 300;

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
                row: row,
                col: col
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
    if (e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault(); // Prevent page scroll
        keys.shoot = true;
    }
});

document.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        keys.left = false;
    }
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        keys.right = false;
    }
    if (e.key === ' ' || e.key === 'Spacebar') {
        keys.shoot = false;
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
    // Flash white when hit
    if (playerHit) {
        ctx.fillStyle = '#ffffff';
    } else {
        ctx.fillStyle = '#33ff33';
    }

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

function drawBullets() {
    // Player bullets (green)
    ctx.fillStyle = '#33ff33';
    for (const bullet of playerBullets) {
        ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
    }

    // Invader bullets (red)
    ctx.fillStyle = '#ff3333';
    for (const bullet of invaderBullets) {
        ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
    }
}

function drawExplosions() {
    for (const explosion of explosions) {
        const progress = explosion.timer / EXPLOSION_DURATION;
        const alpha = 1 - progress;
        const size = 20 + progress * 30;

        ctx.save();
        ctx.globalAlpha = alpha;

        // Draw explosion burst
        ctx.fillStyle = '#ffff00';
        ctx.beginPath();
        ctx.arc(explosion.x, explosion.y, size * 0.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ff6600';
        ctx.beginPath();
        ctx.arc(explosion.x, explosion.y, size * 0.3, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(explosion.x, explosion.y, size * 0.15, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }
}

function createExplosion(x, y) {
    explosions.push({
        x: x,
        y: y,
        timer: 0
    });
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

function getBottomInvaders() {
    // Get the bottom-most alive invader in each column
    const bottomInvaders = [];

    for (let col = 0; col < INVADER_COLS; col++) {
        let bottomInvader = null;
        for (const invader of invaders) {
            if (invader.alive && invader.col === col) {
                if (!bottomInvader || invader.row > bottomInvader.row) {
                    bottomInvader = invader;
                }
            }
        }
        if (bottomInvader) {
            bottomInvaders.push(bottomInvader);
        }
    }

    return bottomInvaders;
}

// AABB collision detection
function checkCollision(a, b) {
    return a.x < b.x + b.width &&
           a.x + a.width > b.x &&
           a.y < b.y + b.height &&
           a.y + a.height > b.y;
}

function playerShoot() {
    // Classic: only one bullet at a time
    if (playerBullets.length > 0) return;

    playerBullets.push({
        x: player.x + player.width / 2 - BULLET_WIDTH / 2,
        y: player.y - BULLET_HEIGHT,
        width: BULLET_WIDTH,
        height: BULLET_HEIGHT,
        speed: PLAYER_BULLET_SPEED
    });
}

function invaderShoot() {
    const bottomInvaders = getBottomInvaders();
    if (bottomInvaders.length === 0) return;

    // Pick a random bottom invader to shoot
    const shooter = bottomInvaders[Math.floor(Math.random() * bottomInvaders.length)];

    invaderBullets.push({
        x: shooter.x + shooter.width / 2 - BULLET_WIDTH / 2,
        y: shooter.y + shooter.height,
        width: BULLET_WIDTH,
        height: BULLET_HEIGHT,
        speed: INVADER_BULLET_SPEED
    });
}

function updateExplosions(dt) {
    for (let i = explosions.length - 1; i >= 0; i--) {
        explosions[i].timer += dt;
        if (explosions[i].timer >= EXPLOSION_DURATION) {
            explosions.splice(i, 1);
        }
    }
}

function updateCollisions() {
    // Player bullets vs invaders
    for (let i = playerBullets.length - 1; i >= 0; i--) {
        const bullet = playerBullets[i];

        for (const invader of invaders) {
            if (invader.alive && checkCollision(bullet, invader)) {
                // Hit!
                invader.alive = false;
                aliveInvaders--;
                playerBullets.splice(i, 1);

                // Create explosion at invader center
                createExplosion(
                    invader.x + invader.width / 2,
                    invader.y + invader.height / 2
                );

                // Check for victory
                if (aliveInvaders === 0) {
                    gameState = 'victory';
                }

                break; // Bullet can only hit one invader
            }
        }
    }

    // Invader bullets vs player
    for (let i = invaderBullets.length - 1; i >= 0; i--) {
        const bullet = invaderBullets[i];

        if (checkCollision(bullet, player)) {
            // Player hit!
            invaderBullets.splice(i, 1);
            playerHit = true;
            playerHitTimer = 0;

            // For now, just flash - lives system will come in story #7
            createExplosion(
                player.x + player.width / 2,
                player.y + player.height / 2
            );
        }
    }

    // Check if invaders reached player level
    for (const invader of invaders) {
        if (invader.alive && invader.y + invader.height >= player.y) {
            gameState = 'gameover';
            break;
        }
    }
}

function updateBullets(dt) {
    const dtSeconds = dt / 1000;

    // Update player bullets (move up)
    for (let i = playerBullets.length - 1; i >= 0; i--) {
        playerBullets[i].y -= playerBullets[i].speed * dtSeconds;

        // Remove if off screen
        if (playerBullets[i].y + playerBullets[i].height < 0) {
            playerBullets.splice(i, 1);
        }
    }

    // Update invader bullets (move down)
    for (let i = invaderBullets.length - 1; i >= 0; i--) {
        invaderBullets[i].y += invaderBullets[i].speed * dtSeconds;

        // Remove if off screen
        if (invaderBullets[i].y > CANVAS_HEIGHT) {
            invaderBullets.splice(i, 1);
        }
    }
}

function updateInvaders(dt) {
    if (gameState !== 'playing') return;

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

    // Invader shooting
    invaderFireTimer += dt;
    if (invaderFireTimer >= INVADER_FIRE_INTERVAL) {
        invaderFireTimer = 0;
        invaderShoot();
    }
}

function updatePlayer(dt) {
    if (gameState !== 'playing') return;

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

    // Shooting
    if (keys.shoot) {
        playerShoot();
        keys.shoot = false; // Require re-press for next shot
    }

    // Player hit flash timer
    if (playerHit) {
        playerHitTimer += dt;
        if (playerHitTimer >= PLAYER_HIT_FLASH_DURATION) {
            playerHit = false;
        }
    }
}

function update(deltaTime) {
    updatePlayer(deltaTime);
    updateInvaders(deltaTime);
    updateBullets(deltaTime);
    updateCollisions();
    updateExplosions(deltaTime);
}

function render() {
    clearCanvas();
    drawInvaders();
    drawPlayer();
    drawBullets();
    drawExplosions();
    drawFPS();

    // Draw game state messages
    if (gameState === 'gameover') {
        ctx.fillStyle = '#ff0000';
        ctx.font = '48px Courier New';
        ctx.textAlign = 'center';
        ctx.fillText('GAME OVER', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
        ctx.font = '20px Courier New';
        ctx.fillText('Invaders reached Earth!', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 40);
        ctx.textAlign = 'left';
    } else if (gameState === 'victory') {
        ctx.fillStyle = '#33ff33';
        ctx.font = '48px Courier New';
        ctx.textAlign = 'center';
        ctx.fillText('VICTORY!', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
        ctx.font = '20px Courier New';
        ctx.fillText('All invaders destroyed!', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 40);
        ctx.textAlign = 'left';
    }
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
