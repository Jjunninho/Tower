// Listeners e Funções de Controle

function placeElement(element) {
    const placed = { ...element };
    placedElements.push(placed);
    
    // Zera contadores dos outros itens
    if (element.type !== 'ladder') game.ladderConsecutiveUses = 0;
    if (element.type !== 'spring') game.springConsecutiveUses = 0;
    if (element.type !== 'escalator') game.escalatorConsecutiveUses = 0;

    // Verifica o item atual
    if (element.type === 'ladder') {
        game.ladderConsecutiveUses++;
        if (game.ladderConsecutiveUses >= 3) triggerLadderCooldown();
    } 
    else if (element.type === 'spring') {
        game.springConsecutiveUses++;
        if (game.springConsecutiveUses >= 3) triggerSpringCooldown();
    }
    else if (element.type === 'escalator') {
        game.escalatorConsecutiveUses++;
        if (game.escalatorConsecutiveUses >= 3) triggerEscalatorCooldown();
    }

    switch(element.type) {
        case 'platform': platforms.push({x: placed.x, y: placed.y, width: placed.width, height: placed.height, placed: true}); break;
        case 'ladder': ladders.push({x: placed.x, y: placed.y, width: placed.width, height: placed.height, placed: true}); break;
        case 'elevator': elevators.push({x: placed.x, y: placed.y, width: placed.width, height: placed.height, startY: placed.y, speed: 2, direction: -1, placed: true}); break;
        case 'spring': springs.push({x: placed.x, y: placed.y, width: placed.width, height: placed.height, power: 18, placed: true}); break;
        case 'wall': walls.push({x: placed.x, y: placed.y, width: placed.width, height: placed.height, placed: true}); break;
        case 'escalator':
        escalators.push({
            x1: placed.x,
            y1: placed.y,
            x2: placed.x + placed.width,
            y2: placed.y + placed.height,
            placed: true
        });
        break;
    }
}

document.querySelectorAll('.menuButton').forEach(btn => {
    btn.addEventListener('click', () => {
        if (game.gameOver) return;
        audioSys.init();
        if(!audioSys.music.playing && !audioSys.muted) audioSys.music.start();
        
        // --- NOVA LÓGICA PARA HABILIDADES ---
        const type = btn.dataset.type;

        // Se for Paraquedas
        if (type === 'parachute') {
            if (btn.classList.contains('cooldown')) return; // Respeita cooldown
            activateParachute(btn);
            return; // Não seleciona como ferramenta
        }

        // Se for Escudo
        if (type === 'shield') {
            if (btn.classList.contains('cooldown')) return; // Respeita cooldown
            activateShield(btn);
            return; // Não seleciona como ferramenta
        }
        // ------------------------------------

        // (Lógica antiga de ferramentas continua aqui)
        document.querySelectorAll('.menuButton').forEach(b => b.classList.remove('selected'));
        
        if (game.selectedTool === type) {
            game.selectedTool = null;
            canvas.classList.remove('placing');
        } else {
            game.selectedTool = type;
            btn.classList.add('selected');
            canvas.classList.add('placing');
        }
    });
});

canvas.addEventListener('mousedown', (e) => {
    if (!game.selectedTool || game.gameOver) return;
    audioSys.init();
    if(!audioSys.music.playing && !audioSys.muted) audioSys.music.start();
    
    const rect = canvas.getBoundingClientRect();
    dragStart = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top + game.camera.y
    };
    
    game.placingElement = {
        type: game.selectedTool,
        x: dragStart.x,
        y: dragStart.y,
        width: 0,
        height: 0
    };
});

canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    game.mousePos = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top + game.camera.y
    };
    
    if (dragStart && game.placingElement) {
        if (game.placingElement.type === 'escalator') {
            game.placingElement.x = dragStart.x;
            game.placingElement.y = dragStart.y;
            game.placingElement.width = game.mousePos.x - dragStart.x;
            game.placingElement.height = game.mousePos.y - dragStart.y;
        } else {
            const dx = game.mousePos.x - dragStart.x;
            const dy = game.mousePos.y - dragStart.y;
            game.placingElement.width = Math.abs(dx);
            game.placingElement.height = Math.abs(dy);
            game.placingElement.x = dx < 0 ? game.mousePos.x : dragStart.x;
            game.placingElement.y = dy < 0 ? game.mousePos.y : dragStart.y;
        }
        
        const minSize = game.placingElement.type === 'escalator' ? 50 : 20;
        const sizeCheck = game.placingElement.type === 'escalator' 
            ? Math.sqrt(Math.pow(game.placingElement.width, 2) + Math.pow(game.placingElement.height, 2))
            : Math.max(game.placingElement.width, game.placingElement.height);

        const isTooSmall = sizeCheck < minSize;
        const hasCollision = !checkPlacementCollision(game.placingElement);

        if (isTooSmall || hasCollision) {
            canvas.classList.add('invalid');
        } else {
            canvas.classList.remove('invalid');
        }
    }
});

canvas.addEventListener('mouseup', () => {
    if (game.placingElement && dragStart) {
        const minSize = game.placingElement.type === 'escalator' ? 50 : 20;
        const currentSize = game.placingElement.type === 'escalator' 
            ? Math.sqrt(Math.pow(game.placingElement.width, 2) + Math.pow(game.placingElement.height, 2))
            : Math.max(game.placingElement.width, game.placingElement.height);

        if (currentSize < minSize) {
             showWarning(game.placingElement.type === 'escalator' ? '⚠️ Muito curta!' : '⚠️ Muito pequeno!');
        } 
        else if (checkPlacementCollision(game.placingElement)) {
            placeElement(game.placingElement);
            audioSys.sfx.build(); 
            game.elementsUsedThisLevel++;
        } else {
            showWarning('⚠️ Não pode sobrepor elementos!');
        }
    }
    canvas.classList.remove('invalid');
    dragStart = null;
    game.placingElement = null;
});

window.addEventListener('keydown', (e) => {
    if (game.gameOver) return;
    game.keys[e.key] = true;
    audioSys.init();
    if(!audioSys.music.playing && !audioSys.muted) audioSys.music.start();
    
    if (e.key === ' ' && player.jumpsLeft > 0) {
        player.vy = -player.jumpPower;
        if(player.jumpsLeft === 2) audioSys.sfx.jump();
        else audioSys.sfx.jumpDouble();

        player.jumpsLeft--;
        player.onGround = false;
        
        if (Math.random() < 0.15) {
            boot.emotion = 'happy';
            const encouragementMessages = boot.personality.encouragement;
            bootSpeak(encouragementMessages[Math.floor(Math.random() * encouragementMessages.length)]);
        }
    }
});

window.addEventListener('keyup', (e) => {
    game.keys[e.key] = false;
});

function triggerLadderCooldown() {
    if (game.ladderOnCooldown) return;
    game.ladderOnCooldown = true;
    if (game.selectedTool === 'ladder') {
        game.selectedTool = null;
        canvas.classList.remove('placing');
        document.querySelectorAll('.menuButton').forEach(b => b.classList.remove('selected'));
    }
    const ladderBtn = document.querySelector('.menuButton[data-type="ladder"]');
    ladderBtn.classList.add('cooldown'); 
    audioSys.sfx.error();
    showWarning("⚠️ ESCADAS AQUECERAM!");
    let timeLeft = 30; 
    const timerInterval = setInterval(() => {
        timeLeft--;
        ladderBtn.innerHTML = `🚫<br>${timeLeft}s`; 
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            game.ladderOnCooldown = false;
            game.ladderConsecutiveUses = 0;
            ladderBtn.classList.remove('cooldown');
            ladderBtn.innerHTML = `🪜<br>ESCADA`; 
            showBonus("ESCADAS PRONTAS!"); 
        }
    }, 1000);
} // <--- Faltava fechar aqui

function triggerSpringCooldown() {
    if (game.springOnCooldown) return;
    game.springOnCooldown = true;
    if (game.selectedTool === 'spring') {
        game.selectedTool = null;
        canvas.classList.remove('placing');
        document.querySelectorAll('.menuButton').forEach(b => b.classList.remove('selected'));
    }
    const springBtn = document.querySelector('.menuButton[data-type="spring"]');
    springBtn.classList.add('cooldown');
    audioSys.sfx.error();
    showWarning("⚠️ MOLAS AQUECERAM!");
    let timeLeft = 30; 
    const timerInterval = setInterval(() => {
        timeLeft--;
        springBtn.innerHTML = `🚫<br>${timeLeft}s`;
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            game.springOnCooldown = false;
            game.springConsecutiveUses = 0;
            springBtn.classList.remove('cooldown');
            springBtn.innerHTML = `🌀<br>MOLA`;
            showBonus("MOLAS PRONTAS!");
        }
    }, 1000);
} // <--- Faltava fechar aqui

function triggerEscalatorCooldown() {
    if (game.escalatorOnCooldown) return;
    game.escalatorOnCooldown = true;
    if (game.selectedTool === 'escalator') {
        game.selectedTool = null;
        canvas.classList.remove('placing');
        document.querySelectorAll('.menuButton').forEach(b => b.classList.remove('selected'));
    }
    const btn = document.querySelector('.menuButton[data-type="escalator"]');
    btn.classList.add('cooldown');
    audioSys.sfx.error();
    showWarning("⚠️ MOTORES AQUECERAM!");
    let timeLeft = 30;
    const timerInterval = setInterval(() => {
        timeLeft--;
        btn.innerHTML = `🚫<br>${timeLeft}s`;
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            game.escalatorOnCooldown = false;
            game.escalatorConsecutiveUses = 0;
            btn.classList.remove('cooldown');
            btn.innerHTML = `🎢<br>ROLANTE`;
            showBonus("MOTORES FRIOS!");
        }
    }, 1000);
} // <--- Faltava fechar aqui e não ter chave extra depois

function activateParachute(btn) {
    player.isGliding = true;
    showBonus("PARAQUEDAS! 🪂");
    audioSys.playTone(600, 'sawtooth', 0.5, 0.1, -200); // Som de "fuuuuum"

    // Duração do efeito (3 segundos)
    setTimeout(() => {
        player.isGliding = false;
    }, 3000);

    // Cooldown (15 segundos)
    startCooldown(btn, 15, "🪂<br>PARAQUEDAS");
}

function activateShield(btn) {
    player.hasShield = true;
    showBonus("ESCUDO ATIVO! 🛡️");
    audioSys.playTone(800, 'sine', 0.5, 0.1, 200);

    // Duração do efeito (5 segundos)
    setTimeout(() => {
        player.hasShield = false;
        showWarning("ESCUDO ACABOU!");
    }, 5000);

    // Cooldown (15 segundos)
    startCooldown(btn, 15, "🛡️<br>ESCUDO");
}

// Função auxiliar para gerenciar o botão cinza (Cooldown)
function startCooldown(btn, seconds, originalText) {
    btn.classList.add('cooldown');
    let timeLeft = seconds;
    btn.innerHTML = `⏳<br>${timeLeft}`;
    
    const interval = setInterval(() => {
        timeLeft--;
        btn.innerHTML = `⏳<br>${timeLeft}`;
        if (timeLeft <= 0) {
            clearInterval(interval);
            btn.classList.remove('cooldown');
            btn.innerHTML = originalText;
            audioSys.playTone(1000, 'sine', 0.1); // "Ping" de pronto
        }
    }, 1000);
}