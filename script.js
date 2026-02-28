let move_speed = 3;
let gravity = 0.35;
let initialGravity = 0.05; // slow start
let gravityIncreaseRate = 0.01; // slower ramp for first posts
let maxGravity = 0.35;

let bird = document.querySelector('.hironobird');
let img = document.getElementById('bird');
let score_val = document.querySelector('.score_val');
let message = document.querySelector('.message');
let score_title = document.querySelector('.score_title');

let game_state = 'Start';
let bird_dy = 0;
let gravityTimer = 0;

img.style.display = 'none';
message.classList.add('messageStyle');

function startGame() {
    if (game_state === 'Play') return;

    game_state = 'Play';
    bird_dy = 0;
    gravityTimer = 0;

    document.querySelectorAll('.pipe_sprite').forEach(el => el.remove());
    bird.style.top = '40vh';
    img.style.display = 'block';
    score_val.innerHTML = '0';
    score_title.innerHTML = 'Score : ';
    message.innerHTML = '';
    message.classList.remove('messageStyle');

    play();
}

function jump() {
    if (game_state === 'Play') {
        bird_dy = -4.5; 
    }
}

/* Controls */
document.addEventListener('keydown', e => {
    if (e.key === 'Enter') startGame();
    if (e.key === 'ArrowUp') jump();
});

document.addEventListener('click', () => {
    if (game_state !== 'Play') startGame();
    else jump();
});

document.addEventListener('touchstart', e => {
    e.preventDefault();
    if (game_state !== 'Play') startGame();
    else jump();
}, { passive: false });

function play() {
    let pipe_gap = window.innerWidth < 768 ? 35 : 30;
    let pipe_separation = 0;

    function move() {
        if (game_state !== 'Play') return;

        let pipe_sprite = document.querySelectorAll('.pipe_sprite');
        let bird_props = bird.getBoundingClientRect();

        /* Gravity gradually increases depending on score */
        gravityTimer += 1/60; // assuming ~60fps
        // Increase gravity slowly until max, but faster after 10 points
        let effectiveGravity = initialGravity + gravityIncreaseRate * gravityTimer;
        if (parseInt(score_val.innerHTML) > 10) effectiveGravity = gravity; // normal gravity after 10 points
        if (effectiveGravity > maxGravity) effectiveGravity = maxGravity;
        bird_dy += effectiveGravity;

        bird.style.top = bird_props.top + bird_dy + 'px';

        if (bird_props.top <= 0 || bird_props.bottom >= window.innerHeight) {
            endGame();
            return;
        }

        pipe_sprite.forEach(element => {
            let pipe_props = element.getBoundingClientRect();

            if (pipe_props.right <= 0) element.remove();

            else if (
                bird_props.left < pipe_props.left + pipe_props.width &&
                bird_props.left + bird_props.width > pipe_props.left &&
                bird_props.top < pipe_props.top + pipe_props.height &&
                bird_props.bottom > pipe_props.top
            ) {
                endGame();
                return;
            }

            else if (pipe_props.right < bird_props.left && element.increase_score === '1') {
                score_val.innerHTML = parseInt(score_val.innerHTML) + 1;
                element.increase_score = '0';
            }

            element.style.left = pipe_props.left - move_speed + 'px';
        });

        requestAnimationFrame(move);
    }

    function create_pipe() {
        if (game_state !== 'Play') return;

        if (pipe_separation > 100) {
            pipe_separation = 0;
            let pipe_pos = Math.floor(Math.random() * 40) + 10;

            let pipe_top = document.createElement('div');
            pipe_top.className = 'pipe_sprite';
            pipe_top.style.top = pipe_pos - 70 + 'vh';
            document.body.appendChild(pipe_top);

            let pipe_bottom = document.createElement('div');
            pipe_bottom.className = 'pipe_sprite';
            pipe_bottom.style.top = pipe_pos + pipe_gap + 'vh';
            pipe_bottom.increase_score = '1';
            document.body.appendChild(pipe_bottom);
        }

        pipe_separation++;
        requestAnimationFrame(create_pipe);
    }

    requestAnimationFrame(move);
    requestAnimationFrame(create_pipe);
}

function endGame() {
    game_state = 'End';
    img.style.display = 'none';
    message.innerHTML = '<span style="color:red;">Game Over</span><br>Tap / Click / Press Enter to Restart';
    message.classList.add('messageStyle');
}
