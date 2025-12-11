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
let gameState = 'playing'; // 'playing', 'gameover', 'levelup'
let playerHit = false;
let playerHitTimer = 0;
const PLAYER_HIT_FLASH_DURATION = 200;

// Level system
let level = 1;
let levelUpTimer = 0;
const LEVEL_UP_DURATION = 2000; // Show "LEVEL X" for 2 seconds

// Score and lives
let score = 0;
let highScore = 0;
let lives = 3;
const STARTING_LIVES = 3;

// Points per invader row (top rows worth more)
const INVADER_POINTS = [30, 30, 20, 20, 10]; // Row 0-1: 30pts, Row 2-3: 20pts, Row 4: 10pts

// Input state
const keys = {
    left: false,
    right: false,
    shoot: false,
    restart: false
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
const BASE_FIRE_INTERVAL = 1500; // Base ms between invader shots
let currentFireInterval = BASE_FIRE_INTERVAL;

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
const INVADER_TOP_OFFSET = 80; // Increased to make room for HUD
const INVADER_LEFT_OFFSET = 50;
const INVADER_DROP_DISTANCE = 20;
const BASE_INVADER_SPEED = 30;
let currentInvaderSpeed = BASE_INVADER_SPEED;

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

// Start next level
function startNextLevel() {
    level++;

    // Increase difficulty
    currentInvaderSpeed = BASE_INVADER_SPEED * (1 + (level - 1) * 0.2); // 20% faster each level
    currentFireInterval = Math.max(500, BASE_FIRE_INTERVAL - (level - 1) * 150); // Faster shooting, min 500ms

    // Reset invaders and bullets
    initInvaders();
    playerBullets.length = 0;
    invaderBullets.length = 0;
    invaderFireTimer = 0;

    // Center player
    player.x = CANVAS_WIDTH / 2 - player.width / 2;

    gameState = 'playing';
}

// Reset entire game
function resetGame() {
    level = 1;
    score = 0;
    lives = STARTING_LIVES;
    currentInvaderSpeed = BASE_INVADER_SPEED;
    currentFireInterval = BASE_FIRE_INTERVAL;

    initInvaders();
    playerBullets.length = 0;
    invaderBullets.length = 0;
    explosions.length = 0;
    invaderFireTimer = 0;

    player.x = CANVAS_WIDTH / 2 - player.width / 2;
    playerHit = false;

    gameState = 'playing';
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
    if (e.key === 'Enter') {
        keys.restart = true;
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
    if (e.key === 'Enter') {
        keys.restart = false;
    }
});

function clearCanvas() {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
}

function drawHUD() {
    ctx.fillStyle = '#ffffff';
    ctx.font = '18px Courier New';

    // Score (left)
    ctx.textAlign = 'left';
    ctx.fillText(`SCORE: ${score}`, 10, 25);

    // Level (center-left)
    ctx.fillText(`LEVEL: ${level}`, 200, 25);

    // High Score (center)
    ctx.textAlign = 'center';
    ctx.fillText(`HIGH: ${highScore}`, CANVAS_WIDTH / 2 + 50, 25);

    // Lives (right) - draw ship icons
    ctx.textAlign = 'right';
    ctx.fillText('LIVES:', CANVAS_WIDTH - 100, 25);

    // Draw small ship icons for lives
    ctx.fillStyle = '#33ff33';
    for (let i = 0; i < lives; i++) {
        const lifeX = CANVAS_WIDTH - 80 + i * 25;
        const lifeY = 15;
        // Mini ship
        ctx.fillRect(lifeX, lifeY + 5, 20, 8);
        ctx.beginPath();
        ctx.moveTo(lifeX + 10, lifeY);
        ctx.lineTo(lifeX + 5, lifeY + 5);
        ctx.lineTo(lifeX + 15, lifeY + 5);
        ctx.closePath();
        ctx.fill();
    }

    // Draw separator line
    ctx.strokeStyle = '#33ff33';
    ctx.beginPath();
    ctx.moveTo(0, 45);
    ctx.lineTo(CANVAS_WIDTH, 45);
    ctx.stroke();

    ctx.textAlign = 'left';
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
        speed: INVADER_BULLET_SPEED + (level - 1) * 20 // Bullets get faster too
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

                // Add score based on invader row (with level bonus)
                const points = (INVADER_POINTS[invader.row] || 10) * level;
                score += points;

                // Update high score
                if (score > highScore) {
                    highScore = score;
                }

                // Create explosion at invader center
                createExplosion(
                    invader.x + invader.width / 2,
                    invader.y + invader.height / 2
                );

                // Check for level complete
                if (aliveInvaders === 0) {
                    gameState = 'levelup';
                    levelUpTimer = 0;
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

            // Lose a life
            lives--;

            createExplosion(
                player.x + player.width / 2,
                player.y + player.height / 2
            );

            // Check for game over
            if (lives <= 0) {
                gameState = 'gameover';
            }
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

    // Calculate current speed based on remaining invaders AND level
    const speedMultiplier = 1 + ((totalInvaders - aliveInvaders) / totalInvaders) * 2;
    const currentSpeed = currentInvaderSpeed * speedMultiplier;
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
    if (invaderFireTimer >= currentFireInterval) {
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

function updateLevelUp(dt) {
    levelUpTimer += dt;
    if (levelUpTimer >= LEVEL_UP_DURATION) {
        startNextLevel();
    }
}

function update(deltaTime) {
    // Handle restart
    if (gameState === 'gameover' && keys.restart) {
        resetGame();
        keys.restart = false;
        return;
    }

    if (gameState === 'levelup') {
        updateLevelUp(deltaTime);
        updateExplosions(deltaTime);
        return;
    }

    updatePlayer(deltaTime);
    updateInvaders(deltaTime);
    updateBullets(deltaTime);
    updateCollisions();
    updateExplosions(deltaTime);
}

function render() {
    clearCanvas();
    drawHUD();
    drawInvaders();
    drawPlayer();
    drawBullets();
    drawExplosions();

    // Draw game state messages
    if (gameState === 'gameover') {
        ctx.fillStyle = '#ff0000';
        ctx.font = '48px Courier New';
        ctx.textAlign = 'center';
        ctx.fillText('GAME OVER', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
        ctx.font = '20px Courier New';
        if (lives <= 0) {
            ctx.fillText('Out of lives!', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 40);
        } else {
            ctx.fillText('Invaders reached Earth!', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 40);
        }
        ctx.fillStyle = '#ffffff';
        ctx.fillText(`Final Score: ${score}  |  Level: ${level}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 80);
        ctx.fillStyle = '#ffff00';
        ctx.fillText('Press ENTER to play again', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 120);
        ctx.textAlign = 'left';
    } else if (gameState === 'levelup') {
        ctx.fillStyle = '#33ff33';
        ctx.font = '48px Courier New';
        ctx.textAlign = 'center';
        ctx.fillText(`LEVEL ${level} COMPLETE!`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
        ctx.font = '24px Courier New';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(`Get ready for Level ${level + 1}...`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 50);
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
