function bootSpeak(message) {
    const now = Date.now();
    if (now - boot.lastSpeech < boot.speechCooldown) return;
    
    const speechEl = document.getElementById('bootSpeech');
    speechEl.textContent = `🤖 Boot: ${message}`;
    speechEl.style.display = 'block';
    boot.lastSpeech = now;
    
    setTimeout(() => {
        speechEl.style.display = 'none';
    }, 2500);
}

function updateLives() {
    const livesEl = document.getElementById('lives');
    let hearts = '';
    for (let i = 0; i < game.maxLives; i++) {
        if (i < game.lives) {
            hearts += '<span class="heart-full">❤</span>';
        } else {
            hearts += '<span class="heart-empty">❤</span>';
        }
    }
    livesEl.innerHTML = hearts;
}

function updateScore(points, reason) {
    game.score += points;
    document.getElementById('score').textContent = game.score;
    
    if (game.score > game.highScore) {
        game.highScore = game.score;
        localStorage.setItem('torreHighScore', game.highScore);
        document.getElementById('highScore').textContent = game.highScore;
    }
    
    if (game.combo > 1 && reason === 'height') {
        showCombo();
    }
}

function showCombo() {
    const comboEl = document.getElementById('combo');
    comboEl.textContent = `COMBO x${game.combo}!`;
    comboEl.style.display = 'block';
    if(game.combo > 2) audioSys.playTone(600 + (game.combo*50), 'square', 0.1);

    clearTimeout(game.comboTimer);
    game.comboTimer = setTimeout(() => {
        comboEl.style.display = 'none';
    }, 2000);
}

function showWarning(text) {
    const warningEl = document.getElementById('warning');
    warningEl.textContent = text;
    warningEl.style.display = 'block';
    audioSys.sfx.error();
    setTimeout(() => {
        warningEl.style.display = 'none';
    }, 2000);
}

function showBonus(text) {
    const bonusEl = document.getElementById('bonus');
    bonusEl.textContent = text;
    bonusEl.classList.remove('show-bonus');
    void bonusEl.offsetWidth;
    bonusEl.classList.add('show-bonus');
    audioSys.sfx.levelUp();
}

function loseLife() {
    if (player.hasShield) {
        audioSys.playTone(150, 'sine', 0.1);
        return;
    }
    
    game.lives--;
    updateLives();
    game.combo = 0;
    
    if (game.lives <= 0) {
        audioSys.sfx.damage();
        endGame();
        return;
    }

    audioSys.sfx.damage();
    player.invulnerable = true;
    player.invulnerableTimer = 120;
    
    boot.emotion = 'worried';
    const fallMessages = boot.personality.fall;
    bootSpeak(fallMessages[Math.floor(Math.random() * fallMessages.length)]);

    if (game.lastCheckpoint) {
        player.x = game.lastCheckpoint.x;
        player.y = game.lastCheckpoint.y -5;
        player.vx = 0;
        player.vy = 0;
        
        boot.x = player.x + 50;
        boot.y = player.y;

        // ✅ RESTAURA A CÂMERA PARA A POSIÇÃO EXATA DO CHECKPOINT
        if (game.lastCheckpoint.cameraY !== undefined) {
            game.camera.y = game.lastCheckpoint.cameraY;
        } else {
            game.camera.y = player.y - canvas.height/2;
        }
        
        // ⭐ NOVO: Log de debug do bioma
        if (game.lastCheckpoint.biome) {
            console.log(`🔄 Respawn no bioma: ${game.lastCheckpoint.biome}`);
        }

        platforms.push({
            x: player.x - 20,
            y: player.y + player.height,
            width: 100,
            height: 20,
            isCheckpoint: true,
            activated: true,
            placed: true
        });
        
        showBonus("RESPAWN! 🚩");
    } else {
        player.x = canvas.width / 2;
        player.y = canvas.height - 100;
        player.vy = 0;
        game.camera.y = 0;
    }
}

function endGame() {
    game.gameOver = true;
    audioSys.sfx.gameOver();
    audioSys.music.stop();

    document.getElementById('finalScore').textContent = game.score;
    document.getElementById('finalLevel').textContent = game.level;
    document.getElementById('finalHeight').textContent = game.maxHeight;
    document.getElementById('finalBootHeight').textContent = boot.maxHeight;
    
    if (game.score >= game.highScore) {
        document.getElementById('newRecord').style.display = 'block';
    }
    
    document.getElementById('gameOver').style.display = 'block';
}

function restartGame() {
    // 1. TENTA RECUPERAR O CHECKPOINT SALVO
    let savedCP = game.lastCheckpoint;

    // Reset padrão das variáveis
    game.level = 1; 
    game.score = 0; // Opcional: Pode manter o score ou zerar
    game.lives = 3;
    game.gameOver = false;
    document.getElementById('gameOver').style.display = 'none';
    audioSys.music.start();
    
    // Limpa o mundo
    initLevel(); 

    // 2. LÓGICA MÁGICA: SE TINHA CHECKPOINT, VOLTA PRA LÁ
    if (savedCP) {
        console.log("🔄 Restaurando checkpoint após Game Over...");
        
        // Restaura dados vitais
        game.lastCheckpoint = savedCP; 
        player.x = savedCP.x;
        player.y = savedCP.y - 10; // -10 para não cair no chão
        game.camera.y = savedCP.cameraY;
        
        // Recalcula a altura do mundo para continuar gerando torre a partir daqui
        game.generatedY = player.y - 1000; 
        game.nextCheckpointThreshold = player.y - 3000;

        // Cria a plataforma de segurança embaixo do player
        platforms.push({
            x: player.x - 20,
            y: player.y + 40,
            width: 100, height: 20,
            isCheckpoint: true, activated: true, placed: true
        });

        showBonus("CONTINUE! 🚩");
    } else {
        // Se não tinha checkpoint (morreu no começo), reseta tudo normal
        game.generatedY = canvas.height - 100;
        game.nextCheckpointThreshold = -3000;
        game.camera.y = 0;
        
        player.x = canvas.width / 2;
        player.y = canvas.height - 100;
        player.vx = 0; player.vy = 0;
        
        boot.x = canvas.width / 2 + 100;
        boot.y = canvas.height - 100;
    }

    updateLives();
}
function initLevel() {
    platforms = []; ladders = []; elevators = []; springs = [];
    walls = []; lavaZones = []; enemies = []; escalators = [];
    
    platforms.push({
        x: canvas.width / 2 - 150,
        y: canvas.height - 50,
        width: 300, height: 20, isBase: true
    });
    
    game.generatedY = canvas.height - 200;
    extendTower(); 
    extendTower();
}

function extendTower() {
    const range = 1000;
    let currentY = game.generatedY;
    const targetY = game.generatedY - range;
    
    game.generatedY = targetY;

    while (currentY > targetY) {
        const spacing = 80 + Math.random() * 100;
        currentY -= spacing;

		// --- 1. TENTA GERAR O BOSS (PRIORIDADE) ---
		// Mudamos de bossMatrix para BossSchool
		if (typeof BossSchool !== 'undefined' && BossSchool.handleGeneration(currentY)) {
			continue; 
		}

        // --- 2. SE NÃO TEM BOSS, TENTA GERAR CHECKPOINT ---
        // (Você tinha apagado a linha do 'if' abaixo acidentalmente)
        if (currentY < game.nextCheckpointThreshold) {
            platforms.push({
                x: canvas.width / 2 - 50,
                y: currentY,
                width: 100,
                height: 20,
                isCheckpoint: true,
                activated: false
            });
            game.nextCheckpointThreshold -= 3000;
            continue; // Pula a geração normal se criou checkpoint
        }

        // --- 3. GERAÇÃO NORMAL DE PLATAFORMAS ---
        const type = Math.random();
        const dangerLevel = Math.min(game.level / 10, 0.5);

        if (type < 0.3) {
            // Plataforma Normal
            const width = 100 + Math.random() * 150;
            const x = Math.random() * (canvas.width - width);
            platforms.push({ x, y: currentY, width, height: 20 });
            
            if (Math.random() < dangerLevel) {
                const lavaWidth = 60 + Math.random() * 80;
                const lavaX = x + width + 20;
                if (lavaX + lavaWidth < canvas.width) {
                    lavaZones.push({ x: lavaX, y: currentY - 10, width: lavaWidth, height: 30 });
                }
            }
        } else if (type < 0.5) {
            // Plataforma Móvel
            const width = 120;
            const x = Math.random() * (canvas.width - width);
            platforms.push({ x, y: currentY, width, height: 20, moving: true, startX: x, range: 200, speed: 1 + Math.random() * 2 });
        } else if (type < 0.65) {
            // Escada
            const x = 50 + Math.random() * (canvas.width - 150);
            ladders.push({ x, y: currentY, width: 50, height: spacing * 0.8 });
        } else if (type < 0.8) {
            // Plataforma Frágil
            const width = 80;
            const x = Math.random() * (canvas.width - width);
            platforms.push({ x, y: currentY, width, height: 20, fragile: true, touched: false });
        } else {
            // Zona de Lava Flutuante
            const width = 150 + Math.random() * 200;
            const x = Math.random() * (canvas.width - width);
            lavaZones.push({ x, y: currentY, width, height: 40 });
        }

        // Inimigos Normais
        if (Math.random() < 0.1 + (Math.abs(currentY)/10000)) { 
            const enemyX = Math.random() * (canvas.width - 40);
            enemies.push({
                x: enemyX, y: currentY - 60, width: 40, height: 40,
                vx: (Math.random() - 0.5) * 3, type: Math.random() < 0.5 ? 'patrol' : 'chase',
                startX: enemyX, range: 200
            });
        }
    }
}

function cleanupWorld() {
    const safeZone = game.camera.y + canvas.height + 500;
    
    platforms = platforms.filter(p => p.y < safeZone || p.isBase);
    ladders = ladders.filter(l => l.y < safeZone);
    elevators = elevators.filter(e => e.y < safeZone);
    springs = springs.filter(s => s.y < safeZone);
    walls = walls.filter(w => w.y < safeZone);
    lavaZones = lavaZones.filter(l => l.y < safeZone);
    enemies = enemies.filter(e => e.y < safeZone);
    escalators = escalators.filter(e => Math.min(e.y1, e.y2) < safeZone);
    placedElements = placedElements.filter(e => e.y < safeZone);
}

function checkPlacementCollision(element) {
    let testBox = { ...element };
    if (element.type === 'escalator') {
        testBox.x = element.width < 0 ? element.x + element.width : element.x;
        testBox.y = element.height < 0 ? element.y + element.height : element.y;
        testBox.width = Math.abs(element.width);
        testBox.height = Math.abs(element.height);
    }

    const checkOverlap = (a, b) => {
        const margin = 5; 
        return a.x < b.x + b.width + margin &&
               a.x + a.width > b.x - margin &&
               a.y < b.y + b.height + margin &&
               a.y + a.height > b.y - margin;
    };
    
    const collisionBoxes = [
        ...platforms, ...ladders, ...springs, ...walls, ...lavaZones,
        ...escalators.map(e => ({
            x: Math.min(e.x1, e.x2),
            y: Math.min(e.y1, e.y2),
            width: Math.abs(e.x2 - e.x1),
            height: Math.abs(e.y2 - e.y1)
        })),
        ...enemies.map(e => ({x: e.x, y: e.y, width: e.width, height: e.height}))
    ];

    elevators.forEach(e => {
        collisionBoxes.push({
            x: e.x, y: e.startY - 200, width: e.width, height: 200 + e.height
        });
    });
    
    for (let existing of collisionBoxes) {
        if (checkOverlap(testBox, existing)) {
            return false; 
        }
    }
    return true;
}

function updateBootAI() {
    boot.history.push({ x: player.x, y: player.y });

    if (boot.history.length > boot.historyDelay + 200) {
        boot.history.shift();
    }

    const distY = player.y - boot.y;
    if (boot.y > player.y + 600 || Math.abs(boot.x - player.x) > 800) {
        boot.state = 'teleporting';
    }

    if (boot.state === 'teleporting') {
        boot.x = player.x;
        boot.y = player.y - 100;
        boot.vy = 0;
        boot.history = []; 
        boot.state = 'following';
        
        if (Math.random() < 0.5) {
            boot.emotion = 'excited';
            const msg = boot.personality.teleport;
            bootSpeak(msg[Math.floor(Math.random() * msg.length)]);
        }
        return;
    }

    let target = null;
    if (boot.history.length > boot.historyDelay) {
        target = boot.history[boot.history.length - boot.historyDelay];
    } else {
        target = player; 
    }

    const dx = target.x - boot.x;
    const dy = target.y - boot.y;

    if (Math.abs(dx) > 5) boot.x += dx * 0.15; 
    if (dy < -20) boot.y += dy * 0.1; 
    else boot.y += dy * 0.15;
    
    if (boot.x < 0) boot.x = canvas.width;
    if (boot.x > canvas.width) boot.x = 0;

    const bootHeight = Math.max(0, Math.floor((canvas.height - boot.y) / 10));
    if (bootHeight > boot.maxHeight) {
        boot.maxHeight = bootHeight;
        document.getElementById('bootHeight').textContent = bootHeight;
    }
    
    if (Math.random() < 0.005) {
        const emotions = ['happy', 'excited', 'worried'];
        boot.emotion = emotions[Math.floor(Math.random() * emotions.length)];
    }
}