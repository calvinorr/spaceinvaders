const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const CANVAS_WIDTH = canvas.width;
const CANVAS_HEIGHT = canvas.height;

let lastTime = 0;
let deltaTime = 0;
let frameCount = 0;
let fpsTime = 0;
let currentFPS = 0;

// Difficulty settings
const DIFFICULTIES = {
    easy: {
        name: 'EASY',
        invaderSpeedMult: 0.7,
        bulletSpeedMult: 0.7,
        lives: 5,
        scoreMult: 0.5
    },
    normal: {
        name: 'NORMAL',
        invaderSpeedMult: 1.0,
        bulletSpeedMult: 1.0,
        lives: 3,
        scoreMult: 1.0
    },
    hard: {
        name: 'HARD',
        invaderSpeedMult: 1.4,
        bulletSpeedMult: 1.3,
        lives: 2,
        scoreMult: 2.0
    }
};

const DIFFICULTY_ORDER = ['easy', 'normal', 'hard'];
let currentDifficulty = 'normal';
let selectedDifficultyIndex = 1; // Start with 'normal' selected

// Game state
let gameState = 'start'; // 'start', 'playing', 'gameover', 'levelup'
let playerHit = false;
let playerHitTimer = 0;
const PLAYER_HIT_FLASH_DURATION = 200;

// Screen shake effects
let shakeIntensity = 0;
let shakeTimer = 0;
let screenFlash = 0; // Flash intensity (0-1)

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
const PARTICLE_COUNT = 20; // More particles for enhanced explosions

// Bunker configuration
const BUNKER_COUNT = 4;
const BUNKER_WIDTH = 60;
const BUNKER_HEIGHT = 45;
const BUNKER_Y = CANVAS_HEIGHT - 130; // Between player and invaders
const BUNKER_PIXEL_SIZE = 3; // Each "pixel" in the bunker grid
const BUNKER_COLS = Math.floor(BUNKER_WIDTH / BUNKER_PIXEL_SIZE);
const BUNKER_ROWS = Math.floor(BUNKER_HEIGHT / BUNKER_PIXEL_SIZE);

// Bunker array - each bunker has a 2D grid of pixels (true = solid, false = destroyed)
let bunkers = [];

// Mystery UFO configuration
const UFO_WIDTH = 50;
const UFO_HEIGHT = 20;
const UFO_SPEED = 150;
const UFO_Y = 55; // Just below HUD
const BASE_UFO_SPAWN_TIME = 25000; // Base spawn every 25 seconds
const UFO_POINTS = [50, 100, 150, 200, 300]; // Random bonus points

// UFO state
let ufo = null;
let ufoTimer = 0;
let ufoSpawnTime = BASE_UFO_SPAWN_TIME;

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

// Animation state for marching
let animationFrame = 0; // 0 or 1, toggles with each step
let stepTimer = 0; // Accumulates time until next step
const BASE_STEP_INTERVAL = 800; // Base ms between steps (slower = more classic feel)
const INVADER_STEP_SIZE = 10; // How many pixels to move per step

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
    animationFrame = 0;
    stepTimer = 0;
}

// Create bunker pixel shape (classic arcade bunker with arch)
function createBunkerPixels() {
    const pixels = [];
    for (let row = 0; row < BUNKER_ROWS; row++) {
        pixels[row] = [];
        for (let col = 0; col < BUNKER_COLS; col++) {
            // Classic bunker shape with arch at bottom
            const centerCol = BUNKER_COLS / 2;
            const archWidth = 4; // Width of arch in pixels
            const archHeight = 5; // Height of arch in pixels

            // Check if this pixel should be part of the bunker
            let isSolid = true;

            // Create rounded top corners
            const cornerSize = 3;
            if (row < cornerSize) {
                if (col < cornerSize - row || col >= BUNKER_COLS - (cornerSize - row)) {
                    isSolid = false;
                }
            }

            // Create arch at bottom center
            if (row >= BUNKER_ROWS - archHeight) {
                if (col >= centerCol - archWidth / 2 && col < centerCol + archWidth / 2) {
                    isSolid = false;
                }
            }

            pixels[row][col] = isSolid;
        }
    }
    return pixels;
}

// Initialize bunkers
function initBunkers() {
    bunkers = [];
    const totalBunkerSpace = BUNKER_COUNT * BUNKER_WIDTH;
    const spacing = (CANVAS_WIDTH - totalBunkerSpace) / (BUNKER_COUNT + 1);

    for (let i = 0; i < BUNKER_COUNT; i++) {
        bunkers.push({
            x: spacing + i * (BUNKER_WIDTH + spacing),
            y: BUNKER_Y,
            width: BUNKER_WIDTH,
            height: BUNKER_HEIGHT,
            pixels: createBunkerPixels()
        });
    }
}

// Spawn UFO from either side
function spawnUFO() {
    // Random direction (left to right or right to left)
    const direction = Math.random() < 0.5 ? 1 : -1;

    ufo = {
        x: direction === 1 ? -UFO_WIDTH : CANVAS_WIDTH,
        y: UFO_Y,
        width: UFO_WIDTH,
        height: UFO_HEIGHT,
        direction: direction,
        points: UFO_POINTS[Math.floor(Math.random() * UFO_POINTS.length)]
    };
}

// Start next level
function startNextLevel() {
    level++;

    // Increase difficulty with level progression and difficulty multiplier
    const diff = DIFFICULTIES[currentDifficulty];
    currentInvaderSpeed = BASE_INVADER_SPEED * diff.invaderSpeedMult * (1 + (level - 1) * 0.2); // 20% faster each level
    currentFireInterval = Math.max(500, BASE_FIRE_INTERVAL - (level - 1) * 150); // Faster shooting, min 500ms

    // Reset invaders, bullets, bunkers, and UFO
    initInvaders();
    initBunkers();
    playerBullets.length = 0;
    invaderBullets.length = 0;
    invaderFireTimer = 0;
    ufo = null;
    ufoTimer = 0;

    // Center player
    player.x = CANVAS_WIDTH / 2 - player.width / 2;

    gameState = 'playing';
}

// Reset entire game
function resetGame() {
    level = 1;
    score = 0;

    // Apply difficulty settings
    const diff = DIFFICULTIES[currentDifficulty];
    lives = diff.lives;
    currentInvaderSpeed = BASE_INVADER_SPEED * diff.invaderSpeedMult;
    currentFireInterval = BASE_FIRE_INTERVAL;

    initInvaders();
    initBunkers();
    playerBullets.length = 0;
    invaderBullets.length = 0;
    explosions.length = 0;
    invaderFireTimer = 0;
    ufo = null;
    ufoTimer = 0;

    player.x = CANVAS_WIDTH / 2 - player.width / 2;
    playerHit = false;
    shakeIntensity = 0;
    shakeTimer = 0;
    screenFlash = 0;

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
    // Difficulty selection with LEFT/RIGHT on start screen
    if (e.key === 'ArrowLeft' && gameState === 'start') {
        selectedDifficultyIndex = (selectedDifficultyIndex - 1 + DIFFICULTY_ORDER.length) % DIFFICULTY_ORDER.length;
    }
    if (e.key === 'ArrowRight' && gameState === 'start') {
        selectedDifficultyIndex = (selectedDifficultyIndex + 1) % DIFFICULTY_ORDER.length;
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

    // Difficulty (center-left)
    const diff = DIFFICULTIES[currentDifficulty];
    ctx.fillStyle = currentDifficulty === 'easy' ? '#00ff00' : currentDifficulty === 'hard' ? '#ff0000' : '#ffff00';
    ctx.fillText(`DIFFICULTY: ${diff.name}`, 370, 25);

    // High Score (center-right)
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText(`HIGH: ${highScore}`, CANVAS_WIDTH / 2 + 100, 25);

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

function drawInvader(invader, frame) {
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

    // Arms - alternate position based on animation frame
    if (frame === 0) {
        // Frame 0: Arms down
        ctx.fillRect(x, y + h * 0.3, w * 0.2, h * 0.3);
        ctx.fillRect(x + w * 0.8, y + h * 0.3, w * 0.2, h * 0.3);
    } else {
        // Frame 1: Arms up
        ctx.fillRect(x, y + h * 0.2, w * 0.2, h * 0.3);
        ctx.fillRect(x + w * 0.8, y + h * 0.2, w * 0.2, h * 0.3);
    }

    // Legs - alternate position based on animation frame
    if (frame === 0) {
        // Frame 0: Legs apart
        ctx.fillRect(x + w * 0.1, y + h * 0.7, w * 0.2, h * 0.3);
        ctx.fillRect(x + w * 0.7, y + h * 0.7, w * 0.2, h * 0.3);
    } else {
        // Frame 1: Legs together
        ctx.fillRect(x + w * 0.2, y + h * 0.7, w * 0.2, h * 0.3);
        ctx.fillRect(x + w * 0.6, y + h * 0.7, w * 0.2, h * 0.3);
    }

    // Eyes
    ctx.fillStyle = '#000';
    ctx.fillRect(x + w * 0.35, y + h * 0.1, w * 0.1, h * 0.1);
    ctx.fillRect(x + w * 0.55, y + h * 0.1, w * 0.1, h * 0.1);
}

function drawInvaders() {
    for (const invader of invaders) {
        drawInvader(invader, animationFrame);
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

function drawBunkers() {
    ctx.fillStyle = '#33ff33'; // Classic green bunker color
    for (const bunker of bunkers) {
        for (let row = 0; row < BUNKER_ROWS; row++) {
            for (let col = 0; col < BUNKER_COLS; col++) {
                if (bunker.pixels[row][col]) {
                    ctx.fillRect(
                        bunker.x + col * BUNKER_PIXEL_SIZE,
                        bunker.y + row * BUNKER_PIXEL_SIZE,
                        BUNKER_PIXEL_SIZE,
                        BUNKER_PIXEL_SIZE
                    );
                }
            }
        }
    }
}

function drawUFO() {
    if (!ufo) return;

    const x = ufo.x;
    const y = ufo.y;
    const w = ufo.width;
    const h = ufo.height;

    // UFO body (magenta/pink)
    ctx.fillStyle = '#ff00ff';

    // Main dome (top ellipse)
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + h * 0.4, w * 0.25, h * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();

    // Main saucer body
    ctx.fillStyle = '#ff66ff';
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + h * 0.6, w * 0.5, h * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Bottom rim highlight
    ctx.fillStyle = '#ff00ff';
    ctx.fillRect(x + w * 0.15, y + h * 0.65, w * 0.7, h * 0.15);

    // Lights on bottom
    ctx.fillStyle = '#ffff00';
    ctx.fillRect(x + w * 0.2, y + h * 0.7, 4, 4);
    ctx.fillRect(x + w * 0.4, y + h * 0.7, 4, 4);
    ctx.fillRect(x + w * 0.6, y + h * 0.7, 4, 4);

    // Cockpit window
    ctx.fillStyle = '#00ffff';
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + h * 0.35, w * 0.1, h * 0.15, 0, 0, Math.PI * 2);
    ctx.fill();
}

function drawExplosions() {
    for (const explosion of explosions) {
        const progress = explosion.timer / EXPLOSION_DURATION;
        const alpha = 1 - progress;
        const size = 20 + progress * 30;

        ctx.save();
        ctx.globalAlpha = alpha;

        // Draw enhanced particle burst
        for (const particle of explosion.particles) {
            const px = explosion.x + particle.x;
            const py = explosion.y + particle.y;

            // Gradient colors for particles
            const colors = ['#ffffff', '#ffff00', '#ff6600', '#ff0000'];
            const colorIndex = Math.floor(progress * colors.length);
            ctx.fillStyle = colors[Math.min(colorIndex, colors.length - 1)];

            ctx.beginPath();
            ctx.arc(px, py, particle.size * (1 - progress * 0.5), 0, Math.PI * 2);
            ctx.fill();
        }

        // Draw central explosion burst
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

        // Show bonus points for UFO hits
        if (explosion.bonus) {
            ctx.fillStyle = '#ff00ff';
            ctx.font = '16px Courier New';
            ctx.textAlign = 'center';
            ctx.fillText(`+${explosion.bonus}`, explosion.x, explosion.y - size);
            ctx.textAlign = 'left';
        }

        ctx.restore();
    }
}

function createExplosion(x, y) {
    explosions.push({
        x: x,
        y: y,
        timer: 0,
        particles: [] // Enhanced particle system
    });

    // Create particle burst
    const explosion = explosions[explosions.length - 1];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
        const angle = (Math.PI * 2 * i) / PARTICLE_COUNT;
        const speed = 50 + Math.random() * 100;
        const size = 2 + Math.random() * 4; // Varied sizes
        explosion.particles.push({
            x: 0,
            y: 0,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size: size
        });
    }
}

function triggerShake(intensity, duration) {
    shakeIntensity = intensity;
    shakeTimer = duration;
}

function updateShake(dt) {
    if (shakeTimer > 0) {
        shakeTimer -= dt;
        if (shakeTimer <= 0) {
            shakeIntensity = 0;
            shakeTimer = 0;
        }
    }

    // Fade screen flash
    if (screenFlash > 0) {
        screenFlash -= dt / 100; // Fade over ~100ms
        if (screenFlash < 0) screenFlash = 0;
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

// Check and damage bunker at bullet position
// Returns true if bullet hit a bunker pixel
function damageBunker(bullet, damageRadius) {
    for (const bunker of bunkers) {
        // First check if bullet overlaps bunker bounds
        if (!checkCollision(bullet, bunker)) continue;

        // Find which pixels the bullet overlaps
        const bulletCenterX = bullet.x + bullet.width / 2;
        const bulletCenterY = bullet.y + bullet.height / 2;

        // Convert bullet center to bunker pixel coordinates
        const pixelCol = Math.floor((bulletCenterX - bunker.x) / BUNKER_PIXEL_SIZE);
        const pixelRow = Math.floor((bulletCenterY - bunker.y) / BUNKER_PIXEL_SIZE);

        // Check if the center pixel exists and is solid
        if (pixelRow >= 0 && pixelRow < BUNKER_ROWS &&
            pixelCol >= 0 && pixelCol < BUNKER_COLS &&
            bunker.pixels[pixelRow][pixelCol]) {

            // Damage pixels in radius around impact point
            for (let dr = -damageRadius; dr <= damageRadius; dr++) {
                for (let dc = -damageRadius; dc <= damageRadius; dc++) {
                    const r = pixelRow + dr;
                    const c = pixelCol + dc;
                    if (r >= 0 && r < BUNKER_ROWS && c >= 0 && c < BUNKER_COLS) {
                        // Random chance to destroy each pixel for irregular damage
                        if (Math.random() < 0.7) {
                            bunker.pixels[r][c] = false;
                        }
                    }
                }
            }
            return true;
        }
    }
    return false;
}

function playerShoot() {
    // Classic: only one bullet at a time
    if (playerBullets.length > 0) return;

    const diff = DIFFICULTIES[currentDifficulty];
    playerBullets.push({
        x: player.x + player.width / 2 - BULLET_WIDTH / 2,
        y: player.y - BULLET_HEIGHT,
        width: BULLET_WIDTH,
        height: BULLET_HEIGHT,
        speed: PLAYER_BULLET_SPEED * diff.bulletSpeedMult
    });
}

function invaderShoot() {
    const bottomInvaders = getBottomInvaders();
    if (bottomInvaders.length === 0) return;

    // Pick a random bottom invader to shoot
    const shooter = bottomInvaders[Math.floor(Math.random() * bottomInvaders.length)];

    const diff = DIFFICULTIES[currentDifficulty];
    invaderBullets.push({
        x: shooter.x + shooter.width / 2 - BULLET_WIDTH / 2,
        y: shooter.y + shooter.height,
        width: BULLET_WIDTH,
        height: BULLET_HEIGHT,
        speed: (INVADER_BULLET_SPEED + (level - 1) * 20) * diff.bulletSpeedMult // Bullets get faster too
    });
}

function updateExplosions(dt) {
    const dtSeconds = dt / 1000;
    for (let i = explosions.length - 1; i >= 0; i--) {
        explosions[i].timer += dt;

        // Update particle positions
        for (const particle of explosions[i].particles) {
            particle.x += particle.vx * dtSeconds;
            particle.y += particle.vy * dtSeconds;
            // Apply gravity for more realistic effect
            particle.vy += 100 * dtSeconds;
        }

        if (explosions[i].timer >= EXPLOSION_DURATION) {
            explosions.splice(i, 1);
        }
    }
}

function updateCollisions() {
    // Player bullets vs UFO
    if (ufo) {
        for (let i = playerBullets.length - 1; i >= 0; i--) {
            const bullet = playerBullets[i];
            if (checkCollision(bullet, ufo)) {
                // Hit the UFO!
                const diff = DIFFICULTIES[currentDifficulty];
                const points = Math.floor(ufo.points * level * diff.scoreMult);
                score += points;

                // Update high score
                if (score > highScore) {
                    highScore = score;
                }

                // Create explosion at UFO center
                createExplosion(
                    ufo.x + ufo.width / 2,
                    ufo.y + ufo.height / 2
                );

                // Show bonus points
                explosions[explosions.length - 1].bonus = points;

                // Screen flash on UFO hit
                screenFlash = 0.3;

                playerBullets.splice(i, 1);
                ufo = null;
                break;
            }
        }
    }

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
                const diff = DIFFICULTIES[currentDifficulty];
                const points = Math.floor((INVADER_POINTS[invader.row] || 10) * level * diff.scoreMult);
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

            // Screen shake and flash on player hit
            triggerShake(12, 300); // Intensity 12, duration 300ms
            screenFlash = 0.5;

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

    // Invaders touching bunkers destroy bunker pixels
    for (const invader of invaders) {
        if (!invader.alive) continue;
        for (const bunker of bunkers) {
            if (checkCollision(invader, bunker)) {
                // Destroy bunker pixels that overlap with invader
                for (let row = 0; row < BUNKER_ROWS; row++) {
                    for (let col = 0; col < BUNKER_COLS; col++) {
                        if (!bunker.pixels[row][col]) continue;
                        const pixelX = bunker.x + col * BUNKER_PIXEL_SIZE;
                        const pixelY = bunker.y + row * BUNKER_PIXEL_SIZE;
                        const pixel = {
                            x: pixelX,
                            y: pixelY,
                            width: BUNKER_PIXEL_SIZE,
                            height: BUNKER_PIXEL_SIZE
                        };
                        if (checkCollision(invader, pixel)) {
                            bunker.pixels[row][col] = false;
                        }
                    }
                }
            }
        }
    }
}

function updateBullets(dt) {
    const dtSeconds = dt / 1000;

    // Update player bullets (move up)
    for (let i = playerBullets.length - 1; i >= 0; i--) {
        playerBullets[i].y -= playerBullets[i].speed * dtSeconds;

        // Check bunker collision (player bullets damage from below)
        if (damageBunker(playerBullets[i], 1)) {
            playerBullets.splice(i, 1);
            continue;
        }

        // Remove if off screen
        if (playerBullets[i].y + playerBullets[i].height < 0) {
            playerBullets.splice(i, 1);
        }
    }

    // Update invader bullets (move down)
    for (let i = invaderBullets.length - 1; i >= 0; i--) {
        invaderBullets[i].y += invaderBullets[i].speed * dtSeconds;

        // Check bunker collision (invader bullets damage from above)
        if (damageBunker(invaderBullets[i], 1)) {
            invaderBullets.splice(i, 1);
            continue;
        }

        // Remove if off screen
        if (invaderBullets[i].y > CANVAS_HEIGHT) {
            invaderBullets.splice(i, 1);
        }
    }
}

function updateInvaders(dt) {
    if (gameState !== 'playing') return;

    // Calculate current step interval based on remaining invaders AND level
    // Fewer invaders = faster marching (shorter interval between steps)
    const speedMultiplier = 1 + ((totalInvaders - aliveInvaders) / totalInvaders) * 2;
    const currentStepInterval = BASE_STEP_INTERVAL / (speedMultiplier * (1 + (level - 1) * 0.2));

    // Accumulate time for step-based movement
    stepTimer += dt;

    // Check if it's time to take a step
    if (stepTimer >= currentStepInterval) {
        stepTimer = 0; // Reset timer for next step

        // Toggle animation frame
        animationFrame = animationFrame === 0 ? 1 : 0;

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

        // Move all invaders by one discrete step
        for (const invader of invaders) {
            if (invader.alive) {
                if (shouldDrop) {
                    invader.y += INVADER_DROP_DISTANCE;
                }
                invader.x += INVADER_STEP_SIZE * invaderDirection;
            }
        }

        // Screen shake when invaders drop
        if (shouldDrop) {
            triggerShake(6, 200); // Intensity 6, duration 200ms
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

function updateUFO(dt) {
    if (gameState !== 'playing') return;

    // If no UFO active, count down to spawn
    if (!ufo) {
        ufoTimer += dt;
        // Spawn time decreases with level (more frequent UFOs at higher levels)
        const currentSpawnTime = Math.max(10000, BASE_UFO_SPAWN_TIME - (level - 1) * 3000);
        if (ufoTimer >= currentSpawnTime) {
            ufoTimer = 0;
            spawnUFO();
        }
        return;
    }

    // Move UFO
    const dtSeconds = dt / 1000;
    ufo.x += UFO_SPEED * ufo.direction * dtSeconds;

    // Remove if off screen
    if ((ufo.direction === 1 && ufo.x > CANVAS_WIDTH) ||
        (ufo.direction === -1 && ufo.x + ufo.width < 0)) {
        ufo = null;
    }
}


// ============================================
// EPIC START SCREEN - Retro Arcade Aesthetic
// ============================================

// Starfield for background
const stars = [];
const STAR_COUNT = 150;
for (let i = 0; i < STAR_COUNT; i++) {
    stars.push({
        x: Math.random() * 800,
        y: Math.random() * 600,
        speed: 0.5 + Math.random() * 2,
        size: Math.random() * 2 + 0.5,
        brightness: Math.random()
    });
}

// Background invaders for animation (positioned at bottom, behind UI)
const bgInvaders = [];
for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 10; col++) {
        bgInvaders.push({
            x: 50 + col * 70,
            y: 520 + row * 40,
            row: row,
            baseX: 50 + col * 70
        });
    }
}
let bgInvaderOffset = 0;
let bgInvaderDir = 1;
let bgAnimFrame = 0;
let bgAnimTimer = 0;

// Title animation
let titleGlow = 0;
let titleGlowDir = 1;

// Start screen timing
let startScreenTime = 0;

function updateStartScreen(dt) {
    startScreenTime += dt;

    // Update stars
    for (const star of stars) {
        star.y += star.speed;
        if (star.y > 600) {
            star.y = 0;
            star.x = Math.random() * 800;
        }
        star.brightness = 0.3 + Math.sin(startScreenTime / 200 + star.x) * 0.3;
    }

    // Update background invaders - slow march
    bgAnimTimer += dt;
    if (bgAnimTimer > 600) {
        bgAnimTimer = 0;
        bgAnimFrame = bgAnimFrame === 0 ? 1 : 0;
        bgInvaderOffset += 8 * bgInvaderDir;
        if (Math.abs(bgInvaderOffset) > 60) {
            bgInvaderDir *= -1;
        }
    }

    // Title glow pulse
    titleGlow += 0.03 * titleGlowDir;
    if (titleGlow > 1) { titleGlow = 1; titleGlowDir = -1; }
    if (titleGlow < 0.3) { titleGlow = 0.3; titleGlowDir = 1; }
}

function drawStartScreen() {
    // Update animations
    updateStartScreen(deltaTime);

    // === BACKGROUND ===
    // Deep space gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    bgGrad.addColorStop(0, '#0a0a15');
    bgGrad.addColorStop(0.5, '#0d0d20');
    bgGrad.addColorStop(1, '#050510');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw twinkling stars
    for (const star of stars) {
        const alpha = 0.3 + star.brightness * 0.7;
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
    }

    // === BACKGROUND INVADERS (ghostly, in the distance) ===
    ctx.globalAlpha = 0.15;
    for (const inv of bgInvaders) {
        const colors = ['#ff0000', '#ff6600', '#00ff00'];
        ctx.fillStyle = colors[inv.row % 3];
        const x = inv.baseX + bgInvaderOffset;
        const y = inv.y;
        const w = 35;
        const h = 25;

        // Simple invader shape
        ctx.fillRect(x + w * 0.2, y + h * 0.2, w * 0.6, h * 0.5);
        ctx.fillRect(x + w * 0.3, y, w * 0.4, h * 0.3);
        if (bgAnimFrame === 0) {
            ctx.fillRect(x, y + h * 0.3, w * 0.2, h * 0.3);
            ctx.fillRect(x + w * 0.8, y + h * 0.3, w * 0.2, h * 0.3);
        } else {
            ctx.fillRect(x, y + h * 0.15, w * 0.2, h * 0.3);
            ctx.fillRect(x + w * 0.8, y + h * 0.15, w * 0.2, h * 0.3);
        }
    }
    ctx.globalAlpha = 1;

    // === TITLE with NEON GLOW ===
    const titleY = 70;
    const glowIntensity = titleGlow;

    // Outer glow layers
    ctx.save();
    ctx.shadowColor = '#00ff00';
    ctx.shadowBlur = 40 * glowIntensity;
    ctx.font = 'bold 48px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = `rgba(0, 255, 0, ${0.3 * glowIntensity})`;
    ctx.fillText('SPACE INVADERS', CANVAS_WIDTH / 2, titleY);
    ctx.restore();

    // Inner glow
    ctx.save();
    ctx.shadowColor = '#00ff88';
    ctx.shadowBlur = 15;
    ctx.font = 'bold 48px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#00ff44';
    ctx.fillText('SPACE INVADERS', CANVAS_WIDTH / 2, titleY);
    ctx.restore();

    // Main title text
    ctx.font = 'bold 48px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('SPACE INVADERS', CANVAS_WIDTH / 2, titleY);

    // === SCORE TABLE PANEL ===
    const panelX = 150;
    const panelWidth = 500;
    const panelY = 110;
    const panelHeight = 190;
    const panelPadding = 20;

    // Panel background with border
    ctx.fillStyle = 'rgba(0, 20, 0, 0.7)';
    ctx.fillRect(panelX, panelY, panelWidth, panelHeight);
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 2;
    ctx.strokeRect(panelX, panelY, panelWidth, panelHeight);

    // Corner decorations
    const cornerSize = 10;
    ctx.fillStyle = '#00ff00';
    // Top-left
    ctx.fillRect(panelX, panelY, cornerSize, 2);
    ctx.fillRect(panelX, panelY, 2, cornerSize);
    // Top-right
    ctx.fillRect(panelX + panelWidth - cornerSize, panelY, cornerSize, 2);
    ctx.fillRect(panelX + panelWidth - 2, panelY, 2, cornerSize);
    // Bottom-left
    ctx.fillRect(panelX, panelY + panelHeight - 2, cornerSize, 2);
    ctx.fillRect(panelX, panelY + panelHeight - cornerSize, 2, cornerSize);
    // Bottom-right
    ctx.fillRect(panelX + panelWidth - cornerSize, panelY + panelHeight - 2, cornerSize, 2);
    ctx.fillRect(panelX + panelWidth - 2, panelY + panelHeight - cornerSize, 2, cornerSize);

    // Score table header
    ctx.font = 'bold 14px "Courier New", monospace';
    ctx.fillStyle = '#ffff00';
    ctx.fillText('* SCORE ADVANCE TABLE *', CANVAS_WIDTH / 2, panelY + panelPadding + 5);

    // Content area starts after header
    const contentY = panelY + panelPadding + 25;
    const rowHeight = 38;
    const spriteX = panelX + 80;
    const textX = panelX + 150;

    // Mystery ship row
    ctx.fillStyle = '#ff00ff';
    ctx.save();
    ctx.shadowColor = '#ff00ff';
    ctx.shadowBlur = 10;
    // Draw mini UFO
    const ufoY = contentY + 5;
    ctx.beginPath();
    ctx.ellipse(spriteX + 15, ufoY + 8, 16, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(spriteX + 15, ufoY + 4, 7, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#ffffff';
    ctx.font = '15px "Courier New", monospace';
    ctx.textAlign = 'left';
    ctx.fillText('=  ? MYSTERY', textX, contentY + 15);

    // Invader types with animated frames
    const invTypes = [
        { row: 0, points: 30, color: '#ff3333', y: contentY + rowHeight },
        { row: 2, points: 20, color: '#ffff33', y: contentY + rowHeight * 2 },
        { row: 4, points: 10, color: '#33ffff', y: contentY + rowHeight * 3 }
    ];

    const menuAnimFrame = bgAnimFrame; // Sync with background

    for (const inv of invTypes) {
        const x = spriteX;
        const y = inv.y;
        const w = 28;
        const h = 22;

        ctx.fillStyle = inv.color;
        ctx.save();
        ctx.shadowColor = inv.color;
        ctx.shadowBlur = 8;

        // Invader body
        ctx.fillRect(x + w * 0.2, y + h * 0.2, w * 0.6, h * 0.5);
        ctx.fillRect(x + w * 0.3, y, w * 0.4, h * 0.3);
        // Arms (animated)
        if (menuAnimFrame === 0) {
            ctx.fillRect(x, y + h * 0.3, w * 0.2, h * 0.25);
            ctx.fillRect(x + w * 0.8, y + h * 0.3, w * 0.2, h * 0.25);
            ctx.fillRect(x + w * 0.1, y + h * 0.7, w * 0.2, h * 0.3);
            ctx.fillRect(x + w * 0.7, y + h * 0.7, w * 0.2, h * 0.3);
        } else {
            ctx.fillRect(x, y + h * 0.15, w * 0.2, h * 0.25);
            ctx.fillRect(x + w * 0.8, y + h * 0.15, w * 0.2, h * 0.25);
            ctx.fillRect(x + w * 0.2, y + h * 0.7, w * 0.2, h * 0.3);
            ctx.fillRect(x + w * 0.6, y + h * 0.7, w * 0.2, h * 0.3);
        }
        ctx.restore();

        // Eyes
        ctx.fillStyle = '#000';
        ctx.fillRect(x + w * 0.35, y + h * 0.08, w * 0.08, h * 0.1);
        ctx.fillRect(x + w * 0.55, y + h * 0.08, w * 0.08, h * 0.1);

        ctx.fillStyle = '#ffffff';
        ctx.font = '15px "Courier New", monospace';
        ctx.fillText(`=  ${inv.points} PTS`, textX, y + 16);
    }

    // === DIFFICULTY SELECTOR ===
    const diffY = 325;

    ctx.font = '12px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#666666';
    ctx.fillText('SELECT DIFFICULTY', CANVAS_WIDTH / 2, diffY);

    // Difficulty options in a row with better spacing
    const diffOptions = [
        { key: 'easy', label: 'EASY', color: '#00ff00', x: 250 },
        { key: 'normal', label: 'NORMAL', color: '#ffff00', x: 400 },
        { key: 'hard', label: 'HARD', color: '#ff0000', x: 550 }
    ];

    ctx.font = 'bold 20px "Courier New", monospace';
    for (let i = 0; i < diffOptions.length; i++) {
        const opt = diffOptions[i];
        const isSelected = DIFFICULTY_ORDER[selectedDifficultyIndex] === opt.key;

        if (isSelected) {
            // Glowing selected option
            ctx.save();
            ctx.shadowColor = opt.color;
            ctx.shadowBlur = 15;
            ctx.fillStyle = opt.color;
            ctx.fillText(opt.label, opt.x, diffY + 30);
            ctx.restore();

            // Selection indicators
            const pulse = Math.sin(startScreenTime / 150) * 0.3 + 0.7;
            ctx.fillStyle = `rgba(255, 255, 255, ${pulse})`;
            const labelWidth = ctx.measureText(opt.label).width;
            ctx.font = '16px "Courier New", monospace';
            ctx.fillText('>', opt.x - labelWidth / 2 - 20, diffY + 30);
            ctx.fillText('<', opt.x + labelWidth / 2 + 12, diffY + 30);
            ctx.font = 'bold 20px "Courier New", monospace';
        } else {
            ctx.fillStyle = '#333333';
            ctx.fillText(opt.label, opt.x, diffY + 30);
        }
    }

    // Arrow key hint
    ctx.font = '11px "Courier New", monospace';
    ctx.fillStyle = '#444444';
    ctx.fillText('LEFT / RIGHT TO SELECT', CANVAS_WIDTH / 2, diffY + 55);

    // === HIGH SCORE ===
    ctx.font = 'bold 18px "Courier New", monospace';
    ctx.save();
    ctx.shadowColor = '#ffff00';
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#ffff00';
    ctx.fillText(`HIGH SCORE: ${highScore}`, CANVAS_WIDTH / 2, 420);
    ctx.restore();

    // === PRESS START (blinking) ===
    const blink = Math.sin(startScreenTime / 300) > 0;
    if (blink) {
        ctx.font = 'bold 22px "Courier New", monospace';
        ctx.save();
        ctx.shadowColor = '#00ffff';
        ctx.shadowBlur = 20;
        ctx.fillStyle = '#00ffff';
        ctx.fillText('PRESS ENTER TO START', CANVAS_WIDTH / 2, 470);
        ctx.restore();
        ctx.fillStyle = '#ffffff';
        ctx.fillText('PRESS ENTER TO START', CANVAS_WIDTH / 2, 470);
    }

    // === CONTROLS INFO ===
    ctx.font = '11px "Courier New", monospace';
    ctx.fillStyle = '#333333';
    ctx.fillText('MOVE: ARROWS / WASD        FIRE: SPACE', CANVAS_WIDTH / 2, 510);

    // === CRT SCANLINES OVERLAY ===
    ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    for (let y = 0; y < CANVAS_HEIGHT; y += 4) {
        ctx.fillRect(0, y, CANVAS_WIDTH, 2);
    }

    // === VIGNETTE EFFECT ===
    const vignetteGrad = ctx.createRadialGradient(
        CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, CANVAS_HEIGHT * 0.3,
        CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, CANVAS_HEIGHT * 0.8
    );
    vignetteGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vignetteGrad.addColorStop(1, 'rgba(0, 0, 0, 0.5)');
    ctx.fillStyle = vignetteGrad;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // === SCREEN BORDER (arcade cabinet feel) ===
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 3;
    ctx.strokeRect(10, 10, CANVAS_WIDTH - 20, CANVAS_HEIGHT - 20);

    // Inner border glow
    ctx.strokeStyle = 'rgba(0, 255, 0, 0.3)';
    ctx.lineWidth = 1;
    ctx.strokeRect(15, 15, CANVAS_WIDTH - 30, CANVAS_HEIGHT - 30);

    ctx.textAlign = 'left';
}

function startGame() {
    currentDifficulty = DIFFICULTY_ORDER[selectedDifficultyIndex];
    resetGame();
}

function update(deltaTime) {
    // Handle start screen
    if (gameState === 'start' && keys.restart) {
        startGame();
        keys.restart = false;
        return;
    }

    // Handle restart
    if (gameState === 'gameover' && keys.restart) {
        gameState = 'start';
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
    updateUFO(deltaTime);
    updateBullets(deltaTime);
    updateCollisions();
    updateExplosions(deltaTime);
    updateShake(deltaTime);
}

function render() {
    // Draw start screen
    if (gameState === 'start') {
        drawStartScreen();
        return;
    }

    clearCanvas();

    // Apply screen shake
    ctx.save();
    if (shakeIntensity > 0) {
        const offsetX = (Math.random() - 0.5) * shakeIntensity;
        const offsetY = (Math.random() - 0.5) * shakeIntensity;
        ctx.translate(offsetX, offsetY);
    }

    drawHUD();
    drawUFO();
    drawInvaders();
    drawBunkers();
    drawPlayer();
    drawBullets();
    drawExplosions();

    ctx.restore();

    // Apply screen flash (after restore to avoid shake on flash)
    if (screenFlash > 0) {
        ctx.save();
        ctx.fillStyle = `rgba(255, 255, 255, ${screenFlash})`;
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        ctx.restore();
    }

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
initBunkers();

// Start the game loop
requestAnimationFrame(gameLoop);
