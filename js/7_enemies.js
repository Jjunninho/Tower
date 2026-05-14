// js/7_enemies.js
// GERENCIADOR DE INIMIGOS COMUNS

const EnemyManager = (() => {
    
    // Lista de tipos possíveis
    const TYPES = ['patrol', 'chase', 'jumper', 'spinner'];

    return {
        // ── 1. SPAWN (Geração) ──────────────────────────────
        trySpawn: function(currentY, rngFunction) {
            // Chance de nascer baseada na profundidade/altura
            if (rngFunction() < 0.1 + (Math.abs(currentY) / 10000)) {
                const enemyX = rngFunction() * (canvas.width - 40);
                const type = TYPES[Math.floor(rngFunction() * TYPES.length)];
                
                enemies.push({
                    x: enemyX, 
                    y: currentY - 60, 
                    width: 40, 
                    height: 40,
                    vx: (rngFunction() - 0.5) * 3,
                    vy: 0,
                    type: type,
                    startX: enemyX, 
                    startY: currentY - 60, // Útil para o jumper
                    range: 200,
                    angle: 0 // Usado pelo spinner
                });
            }
        },

        // ── 2. UPDATE (Lógica e Movimento) ──────────────────
        update: function() {
            if (game.gameOver) return;

            for (let i = enemies.length - 1; i >= 0; i--) {
                let enemy = enemies[i];

                // Comportamento específico por tipo
                if (enemy.type === 'patrol') {
                    enemy.x += enemy.vx;
                    if (enemy.x <= enemy.startX - enemy.range || enemy.x >= enemy.startX + enemy.range) {
                        enemy.vx *= -1;
                    }
                } 
                else if (enemy.type === 'chase') {
                    const dist = Math.abs(player.x - enemy.x);
                    if (dist < 300 && Math.abs(player.y - enemy.y) < 150) {
                        const direction = player.x > enemy.x ? 1 : -1;
                        enemy.x += direction * 2;
                    }
                }
                else if (enemy.type === 'jumper') {
                    // Inimigo que fica pulando no mesmo lugar
                    enemy.vy += 0.4; // Gravidade própria dele
                    enemy.y += enemy.vy;
                    if (enemy.y >= enemy.startY) {
                        enemy.y = enemy.startY;
                        enemy.vy = -8 - Math.random() * 4; // Pulo!
                    }
                }
                else if (enemy.type === 'spinner') {
                    // Flutua e gira, rebatendo nas paredes
                    enemy.angle += 0.1;
                    enemy.x += enemy.vx * 1.5;
                    if (enemy.x <= 0 || enemy.x >= canvas.width - enemy.width) enemy.vx *= -1;
                }

                // Colisão com o Player (Dano)
                const inv = player.invulnerable || player.hasShield;
                if (!inv && 
                    player.x + player.width > enemy.x && 
                    player.x < enemy.x + enemy.width &&
                    player.y + player.height > enemy.y && 
                    player.y < enemy.y + enemy.height) {
                    loseLife();
                }
                
                // Remove se ficar muito para trás da câmera
                if (enemy.y > game.camera.y + canvas.height + 200) {
                    enemies.splice(i, 1);
                    game.enemiesAvoided++;
                }
            }
        },

        // ── 3. DRAW (Visual) ────────────────────────────────
        draw: function(ctx) {
            enemies.forEach(enemy => {
                ctx.save();
                
                if (enemy.type === 'spinner') {
                    // Rotação especial para o spinner
                    ctx.translate(enemy.x + enemy.width/2, enemy.y + enemy.height/2);
                    ctx.rotate(enemy.angle);
                    ctx.translate(-(enemy.x + enemy.width/2), -(enemy.y + enemy.height/2));
                }

                // Base do corpo
                let c1, c2;
                if (enemy.type === 'patrol')  { c1 = '#ff0066'; c2 = '#cc0044'; } // Rosa/Vermelho
                else if (enemy.type === 'chase')   { c1 = '#ffaa00'; c2 = '#cc4400'; } // Laranja Agressivo
                else if (enemy.type === 'jumper')  { c1 = '#00ffcc'; c2 = '#0088aa'; } // Ciano
                else if (enemy.type === 'spinner') { c1 = '#cc00ff'; c2 = '#6600cc'; } // Roxo

                const gradient = ctx.createRadialGradient(
                    enemy.x + enemy.width/2, enemy.y + enemy.height/2, 5,
                    enemy.x + enemy.width/2, enemy.y + enemy.height/2, enemy.width/2
                );
                gradient.addColorStop(0, c1);
                gradient.addColorStop(1, c2);
                
                ctx.fillStyle = gradient;
                
                if (enemy.type === 'spinner') {
                    // Spinner é redondo
                    ctx.beginPath();
                    ctx.arc(enemy.x + enemy.width/2, enemy.y + enemy.height/2, enemy.width/2, 0, Math.PI*2);
                    ctx.fill();
                } else {
                    // Os outros são quadrados
                    ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
                }
                
                // Olhinhos brancos
                ctx.fillStyle = '#fff';
                ctx.fillRect(enemy.x + 8, enemy.y + 10, 8, 8);
                ctx.fillRect(enemy.x + enemy.width - 16, enemy.y + 10, 8, 8);
                
                // Pupilas pretas (olhando para a direção do movimento)
                ctx.fillStyle = '#000';
                let lookOffset = (enemy.vx > 0 || enemy.type === 'chase' && player.x > enemy.x) ? 2 : -2;
                if(enemy.type === 'jumper') lookOffset = 0; // Jumper olha pra frente

                ctx.fillRect(enemy.x + 10 + lookOffset, enemy.y + 12, 4, 4);
                ctx.fillRect(enemy.x + enemy.width - 14 + lookOffset, enemy.y + 12, 4, 4);

                ctx.restore();
            });
        }
    };
})();