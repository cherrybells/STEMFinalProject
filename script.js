/* ═══════════════════════════════════════════
   FLAPPY HIRONO  –  launch-ready script.js
   ═══════════════════════════════════════════ */

/* ─── CONFIG ───────────────────────────────── */
const CONFIG = {
    moveSpeed:          3.2,
    gravity:            0.38,
    initialGravity:     0.06,
    gravityRampTime:    8,       // seconds until full gravity kicks in
    jumpForce:         -7.2,
    pipeGapVH:          32,      // gap between pipes in vh units (bigger = easier)
    pipeGapVH_mobile:   36,
    pipeSeparation:     115,     // frames between pipe spawns
    groundHeightVH:     4,       // must match CSS .ground height
};

/* ─── DOM ──────────────────────────────────── */
const bird        = document.querySelector('.hironobird');
const birdImg     = document.getElementById('bird');
const scoreVal    = document.querySelector('.score_val');
const scoreTitle  = document.querySelector('.score_title');
const message     = document.getElementById('message');
const bestScoreEl = document.getElementById('bestScore');

/* ─── STATE ────────────────────────────────── */
let gameState   = 'Start';
let birdDY      = 0;
let elapsed     = 0;      // seconds since game start
let lastTime    = null;
let moveRAF     = null;
let pipeRAF     = null;
let pipeSep     = 0;
let bestScore   = parseInt(localStorage.getItem('hironoFlappyBest') || '0');

/* ─── INIT ─────────────────────────────────── */
birdImg.style.display = 'none';
showMessage('start');

updateBestScoreDisplay();

/* ─── HELPERS ──────────────────────────────── */
function isMobile() { return window.innerWidth < 768; }

function updateBestScoreDisplay() {
    bestScoreEl.textContent = bestScore > 0 ? `Best: ${bestScore}` : '';
}

function showMessage(type) {
    message.classList.add('visible', 'messageStyle');
    if (type === 'start') {
        message.innerHTML = `
          <div class="message-title">FLAPPY HIRONO</div>
          <div class="message-sub">Tap / Click / Press Enter to Start</div>
          <p class="message-hint">
            <span class="key-hint">↑</span>
            <span class="key-hint">Space</span>
            to Jump
          </p>`;
    } else if (type === 'end') {
        const currentScore = parseInt(scoreVal.textContent);
        const isNewBest = currentScore > 0 && currentScore >= bestScore;
        message.innerHTML = `
          <div class="message-title" style="color:#ff6b6b;">GAME OVER</div>
          <div class="message-sub">Score: <strong style="color:gold">${currentScore}</strong></div>
          ${isNewBest ? '<div class="message-sub" style="color:#ffe57f;">🏆 New Best!</div>' : ''}
          <p class="message-hint">Tap / Click / Press Enter to Restart</p>`;
    }
}

function hideMessage() {
    message.classList.remove('visible');
}

function flashScore() {
    scoreVal.classList.remove('score-flash');
    void scoreVal.offsetWidth; // reflow trick to restart animation
    scoreVal.classList.add('score-flash');
}

function tiltBird() {
    bird.classList.remove('bird-up', 'bird-fall', 'bird-dive');
    if (birdDY < -2)       bird.classList.add('bird-up');
    else if (birdDY < 3)   bird.classList.add('bird-fall');
    else                   bird.classList.add('bird-dive');
}

function flapBird() {
    bird.classList.remove('bird-flap');
    void bird.offsetWidth;
    bird.classList.add('bird-flap');
}

/* ─── START ────────────────────────────────── */
function startGame() {
    if (gameState === 'Play') return;

    gameState  = 'Play';
    birdDY     = 0;
    elapsed    = 0;
    lastTime   = null;
    pipeSep    = 0;

    // Cancel any lingering animation loops
    if (moveRAF) cancelAnimationFrame(moveRAF);
    if (pipeRAF) cancelAnimationFrame(pipeRAF);

    document.querySelectorAll('.pipe_sprite').forEach(el => el.remove());

    bird.style.top = '40vh';
    bird.style.left = '25vw';
    birdImg.style.display = 'block';
    bird.classList.remove('bird-up', 'bird-fall', 'bird-dive', 'bird-flap');

    scoreVal.textContent  = '0';
    scoreTitle.textContent = 'Score: ';
    hideMessage();

    moveRAF = requestAnimationFrame(moveLoop);
    pipeRAF = requestAnimationFrame(pipeLoop);
}

/* ─── JUMP ─────────────────────────────────── */
function jump() {
    if (gameState !== 'Play') return;
    birdDY = CONFIG.jumpForce;
    flapBird();
}

/* ─── INPUT ────────────────────────────────── */
document.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (gameState !== 'Play') startGame();
        else jump();
    }
});

document.addEventListener('click', () => {
    if (gameState !== 'Play') startGame();
    else jump();
});

document.addEventListener('touchstart', e => {
    e.preventDefault();
    if (gameState !== 'Play') startGame();
    else jump();
}, { passive: false });

/* ─── MOVE LOOP ─────────────────────────────── */
function moveLoop(timestamp) {
    if (gameState !== 'Play') return;

    // Delta time for frame-rate independent physics
    if (!lastTime) lastTime = timestamp;
    const dt = Math.min((timestamp - lastTime) / 16.67, 3); // cap spike frames
    lastTime  = timestamp;
    elapsed  += dt * (16.67 / 1000); // seconds

    // Gravity ramp
    const rampProgress  = Math.min(elapsed / CONFIG.gravityRampTime, 1);
    const effectiveGrav = CONFIG.initialGravity +
                          (CONFIG.gravity - CONFIG.initialGravity) * rampProgress;

    birdDY += effectiveGrav * dt;
    tiltBird();

    const birdProps  = bird.getBoundingClientRect();
    const newTop     = birdProps.top + birdDY * dt;
    const groundLine = window.innerHeight * (1 - CONFIG.groundHeightVH / 100);

    bird.style.top = newTop + 'px';

    // Boundary check (ceiling + ground)
    if (newTop <= 0 || (birdProps.bottom + birdDY * dt) >= groundLine) {
        endGame();
        return;
    }

    // Pipe collision + scoring
    const pipes = document.querySelectorAll('.pipe_sprite');
    const bRect = bird.getBoundingClientRect();

    // Shrink hitbox slightly for forgiving collision
    const hb = {
        left:   bRect.left   + bRect.width  * 0.15,
        right:  bRect.right  - bRect.width  * 0.15,
        top:    bRect.top    + bRect.height * 0.12,
        bottom: bRect.bottom - bRect.height * 0.12,
    };

    for (const pipe of pipes) {
        const p = pipe.getBoundingClientRect();

        if (p.right <= 0) { pipe.remove(); continue; }

        // Score: pipe passed
        if (p.right < hb.left && pipe.dataset.scored !== '1') {
            pipe.dataset.scored = '1';
            const newScore = parseInt(scoreVal.textContent) + 1;
            scoreVal.textContent = newScore;
            flashScore();

            // Save best
            if (newScore > bestScore) {
                bestScore = newScore;
                localStorage.setItem('hironoFlappyBest', bestScore);
                updateBestScoreDisplay();
            }
        }

        // Collision
        if (
            hb.left   < p.right  &&
            hb.right  > p.left   &&
            hb.top    < p.bottom &&
            hb.bottom > p.top
        ) {
            endGame();
            return;
        }

        // Move pipe
        pipe.style.left = (p.left - CONFIG.moveSpeed * dt) + 'px';
    }

    moveRAF = requestAnimationFrame(moveLoop);
}

/* ─── PIPE LOOP ─────────────────────────────── */
function pipeLoop() {
    if (gameState !== 'Play') return;

    if (pipeSep >= CONFIG.pipeSeparation) {
        pipeSep = 0;

        const pipeGap  = isMobile() ? CONFIG.pipeGapVH_mobile : CONFIG.pipeGapVH;
        // pipe_pos: where the GAP starts (in vh). Keep it away from edges.
        const pipePos  = Math.floor(Math.random() * 40) + 12;

        const pipeTop = document.createElement('div');
        pipeTop.className    = 'pipe_sprite pipe-top';
        pipeTop.style.top    = (pipePos - 70) + 'vh';
        pipeTop.style.left   = '100vw';
        document.body.appendChild(pipeTop);

        const pipeBottom = document.createElement('div');
        pipeBottom.className      = 'pipe_sprite pipe-bottom';
        pipeBottom.style.top      = (pipePos + pipeGap) + 'vh';
        pipeBottom.style.left     = '100vw';
        pipeBottom.dataset.scored = '0';
        document.body.appendChild(pipeBottom);
    }

    pipeSep++;
    pipeRAF = requestAnimationFrame(pipeLoop);
}

/* ─── END GAME ──────────────────────────────── */
function endGame() {
    gameState = 'End';
    birdImg.style.display = 'none';
    bird.classList.remove('bird-up', 'bird-fall', 'bird-dive', 'bird-flap');

    if (moveRAF) cancelAnimationFrame(moveRAF);
    if (pipeRAF) cancelAnimationFrame(pipeRAF);

    scoreTitle.textContent = '';
    showMessage('end');
    updateBestScoreDisplay();
}
