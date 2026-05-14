// --- UPDATE LOOP ---
function update() {
            if (game.gameOver) return;
            
            // --- FÍSICA E BIOMA (Agora limpo e modular!) ---
            const currentBiome = getCurrentBiome();
            const physics = getBiomePhysics(currentBiome.key);

            // --- APLICAÇÃO DO MOVIMENTO LATERAL ---
            if (physics.accel > 0) {
                // MODO INÉRCIA (Nuvens/Espaço)
                if (game.keys['ArrowLeft']) player.vx -= physics.accel;
                if (game.keys['ArrowRight']) player.vx += physics.accel;

                if (player.vx > player.speed) player.vx = player.speed;
                if (player.vx < -player.speed) player.vx = -player.speed;

                if (!game.keys['ArrowLeft'] && !game.keys['ArrowRight']) {
                    player.vx *= physics.friction;
                    if (Math.abs(player.vx) < 0.1) player.vx = 0;
                }
            } else {
                // MODO PADRÃO
                player.vx = 0;
                if (game.keys['ArrowLeft']) player.vx = -player.speed;
                if (game.keys['ArrowRight']) player.vx = player.speed;
            }

            // --- APLICAÇÃO DA GRAVIDADE ---
            if (player.invulnerable) {
                player.invulnerableTimer--;
                if (player.invulnerableTimer <= 0) {
                    player.invulnerable = false;
                }
            }
            
            // Aplica o modificador de gravidade do bioma
            let currentGravity = player.gravity * physics.gravityMod;

            if (player.isGliding && player.vy > 0) {
                currentGravity *= 0.1;
                player.vy = Math.min(player.vy, 2);
            }
            
            // (O resto do update continua igual a partir do "if (!player.onLadder)...")

			// Aplicação física final
            if (!player.onLadder) {
                player.vy += currentGravity; 
            } else {
                player.vy = 0;
                if (game.keys['ArrowUp']) player.vy = -player.speed;
                if (game.keys['ArrowDown']) player.vy = player.speed;
                player.jumpsLeft = player.maxJumps;
            }
            
            // --- APLICAÇÃO DO MOVIMENTO ---
            player.x += player.vx;
            player.y += player.vy;
            
            // Teleporte de tela (Pac-Man effect)
            if (player.x < 0) player.x = canvas.width;
            if (player.x > canvas.width) player.x = 0;
            
            // --- RESETS OBRIGATÓRIOS (Verifique se estão aqui!) ---
            player.onGround = false;   // <--- ESSA LINHA
            player.onLadder = false;   // <--- E PRINCIPALMENTE ESSA LINHA
            
		// --- COLISÃO COM PLATAFORMAS ---
		platforms.forEach(plat => {
			
			if (plat.fragile && !plat.touched) {
				if (player.x + player.width > plat.x && 
					player.x < plat.x + plat.width &&
					player.y + player.height > plat.y && 
					player.y < plat.y + plat.height) {
					plat.touched = true;
					setTimeout(() => {
						const index = platforms.indexOf(plat);
						if (index > -1) platforms.splice(index, 1);
					}, 500);
				}
			}
			
			// Lógica de aterrissagem
			if (player.vy >= 0 && 
				player.x + player.width > plat.x + 5 && 
				player.x < plat.x + plat.width - 5 &&
				player.y + player.height > plat.y &&
				player.y + player.height < plat.y + 15) {
				
				if(!player.onGround) audioSys.sfx.land();
				player.y = plat.y - player.height;
				player.vy = 0;
				player.onGround = true;
				player.jumpsLeft = player.maxJumps;

				// --- ATIVAÇÃO DO CHECKPOINT (CORRIGIDO) ---
				if (plat.isCheckpoint && !plat.activated) {
					// Desativa outros checkpoints visuais
					platforms.forEach(p => { if(p.isCheckpoint) p.activated = false; });
					
					plat.activated = true;
					
					// ✅ SALVA CHECKPOINT COM OS MESMOS DADOS QUE O BOSS USA
					const currentAltitude = -game.camera.y;
					
					game.lastCheckpoint = {
						x: plat.x,
						y: plat.y - 40,
						altitude: currentAltitude,     // ⭐ Altitude real
						cameraY: game.camera.y,        // ⭐ Posição da câmera
						biome: getCurrentBiome().key   // ⭐ Bioma atual
					};
					
					console.log(`💾 Checkpoint ativado: Alt=${currentAltitude.toFixed(0)}, Bioma=${getCurrentBiome().name}`);
					
					showBonus("CHECKPOINT! 🚩");
					audioSys.playTone(600, 'square', 0.1);
					setTimeout(() => audioSys.playTone(800, 'square', 0.2), 100);
				}
			}
		});
            
            // --- O RESTANTE QUE JÁ ESTAVA NO SEU CÓDIGO ---
            ladders.forEach(ladder => {
                if (player.x + player.width > ladder.x && 
                    player.x < ladder.x + ladder.width &&
                    player.y + player.height > ladder.y && 
                    player.y < ladder.y + ladder.height) {
                    player.onLadder = true;
                }
            });
            
            elevators.forEach(elev => {
                elev.y += elev.speed * elev.direction;
                if (elev.y <= elev.startY - 200) elev.direction = 1;
                if (elev.y >= elev.startY) elev.direction = -1;
                
                if (player.vy >= 0 &&
                    player.x + player.width > elev.x + 5 && 
                    player.x < elev.x + elev.width - 5 &&
                    player.y + player.height > elev.y && 
                    player.y + player.height < elev.y + 15) {
                    
                    if(!player.onGround) audioSys.sfx.land();
                    player.y = elev.y - player.height;
                    player.vy = elev.speed * elev.direction;
                    player.onGround = true;
                    player.jumpsLeft = player.maxJumps;
                }
            });
            
            springs.forEach(spring => {
                if (player.x + player.width > spring.x && 
                    player.x < spring.x + spring.width &&
                    player.y + player.height > spring.y && 
                    player.y + player.height < spring.y + spring.height + 10) {
                    player.vy = -spring.power;
                    audioSys.sfx.jumpDouble();
                    player.jumpsLeft = player.maxJumps;
                }
            });
            
            walls.forEach(wall => {
                if (player.x + player.width > wall.x && 
                    player.x < wall.x + wall.width &&
                    player.y + player.height > wall.y && 
                    player.y < wall.y + wall.height) {
                    if (player.vx > 0) player.x = wall.x - player.width;
                    if (player.vx < 0) player.x = wall.x + wall.width;
                }
            });
            
            lavaZones.forEach(lava => {
                if (player.x + player.width > lava.x && 
                    player.x < lava.x + lava.width &&
                    player.y + player.height > lava.y && 
                    player.y < lava.y + lava.height) {
                    loseLife();
                }
            });
            
// --- ATUALIZAÇÃO DOS INIMIGOS COMUNS ---
            if (typeof EnemyManager !== 'undefined') {
                EnemyManager.update();
            };
			
            // --- FÍSICA DA ESCADA ROLANTE ---
            escalators.forEach(esc => {
                const minX = Math.min(esc.x1, esc.x2) - 15;
                const maxX = Math.max(esc.x1, esc.x2) + 15;
                const minY = Math.min(esc.y1, esc.y2) - 15;
                const maxY = Math.max(esc.y1, esc.y2) + 15;

                if (player.x + player.width > minX && player.x < maxX &&
                    player.y + player.height > minY && player.y < maxY) {

                    const dx = esc.x2 - esc.x1;
                    const dy = esc.y2 - esc.y1;
                    const lenSq = dx*dx + dy*dy;
                    
                    const px = player.x + player.width/2;
                    const py = player.y + player.height;
                    
                    let t = ((px - esc.x1) * dx + (py - esc.y1) * dy) / lenSq;
                    t = Math.max(0, Math.min(1, t)); 
                    
                    const closestX = esc.x1 + t * dx;
                    const closestY = esc.y1 + t * dy;
                    
                    const distX = px - closestX;
                    const distY = py - closestY;
                    const distance = Math.sqrt(distX*distX + distY*distY);

                    if (distance < 30) {
                        const length = Math.sqrt(lenSq);
                        const dirX = dx / length;
                        const dirY = dy / length;
                        const force = 3.5; 
                        
                        player.x += dirX * force;
                        player.y += dirY * force;
                        
                        player.vy = dirY * force;
                        player.onGround = true;
                        player.jumpsLeft = player.maxJumps;
                        
                        if(Math.random() < 0.05) audioSys.sfx.land();
                    }
                }
            });
            
            // --- DESENHO DO PREVIEW ---
            if (game.placingElement && game.placingElement.type === 'escalator') {
               const p = game.placingElement;
               const endX = p.x + p.width;
               const endY = p.y + p.height;
               
               ctx.strokeStyle = '#ffd700';
               ctx.lineWidth = 4;
               ctx.setLineDash([5, 5]);
               ctx.beginPath();
               ctx.moveTo(p.x, p.y);
               ctx.lineTo(endX, endY);
               ctx.stroke();
               ctx.setLineDash([]);
               
               ctx.fillStyle = 'rgba(255, 215, 0, 0.5)';
               ctx.beginPath(); ctx.arc(p.x, p.y, 10, 0, Math.PI*2); ctx.fill();
               ctx.beginPath(); ctx.arc(endX, endY, 10, 0, Math.PI*2); ctx.fill();
            }
            
            // Update Boot AI
            updateBootAI();
			
			// --- ATUALIZAÇÃO DA BOSS SCHOOL ---
			if (typeof BossSchool !== 'undefined') {
				BossSchool.update();
			}
            
			 // --- COMBATE DO PLAYER ---
            if (typeof PlayerCombat !== 'undefined') {
                PlayerCombat.update();
            }
			
            const targetCameraY = player.y - canvas.height * 0.6;
            game.camera.y += (targetCameraY - game.camera.y) * 0.1;
            
            const currentHeight = Math.max(0, Math.floor((canvas.height - player.y) / 10));
            if (currentHeight > game.maxHeight) {
                const heightGained = currentHeight - game.maxHeight;
                game.maxHeight = currentHeight;
                
                if (Date.now() - game.lastScoreUpdate < 1000) {
                    game.combo = Math.min(game.combo + 1, 10);
                } else {
                    game.combo = 1;
                }
                game.lastScoreUpdate = Date.now();
                
                const points = heightGained * 10 * game.combo;
                updateScore(points, 'height');
            }
            
			// --- GERAÇÃO PROCEDURAL INFINITA ---
            // Se o jogador estiver chegando perto do fim do que já foi gerado...
            if (player.y < game.generatedY + 1500) {
                extendTower(); // ...constrói mais torre para cima!
                cleanupWorld(); // ...e limpa o lixo lá embaixo!
            }
            
            // --- SISTEMA DE FASES E ALTURA (SEM RESET) ---
            const altitude = Math.floor(-player.y / 10); // Altura absoluta
            
            // Atualiza recorde de altura
            if (altitude > game.maxHeight) {
                const diff = altitude - game.maxHeight;
                game.maxHeight = altitude;
                updateScore(diff * 10, 'height');
            }

            // LEVEL UP baseado na ALTURA REAL (a cada 2500m)
            const calculatedLevel = Math.floor(altitude / 2500) + 1;
            if (calculatedLevel > game.level) {
                game.level = calculatedLevel;
                
                // Bônus de fase
                updateScore(500, 'level');
                showBonus(`NÍVEL ${game.level}!`);
                audioSys.sfx.levelUp();
                
                // Vida extra a cada 3 níveis
                if (game.level % 3 === 0 && game.lives < game.maxLives) {
                    game.lives++;
                    updateLives();
                    showBonus('+1 VIDA!');
                }
            }

            // Morte por queda (Se cair muito abaixo da câmera)
            if (player.y > game.camera.y + canvas.height + 100) {
                loseLife();
            }

			// Atualiza UI
            document.getElementById('level').textContent = game.level;
            document.getElementById('height').textContent = game.maxHeight;
            
            // --- ATUALIZAÇÃO DO BIOMA UI ---
            updateBiomeUI();
        } // Fim da função update()

		function draw() {
            // === SISTEMA DE BIOMAS - BACKGROUNDS DINÂMICOS ===
            const biome = getCurrentBiome();
            const altitude = -game.camera.y;
            
            drawBiomeBackground(ctx, biome, altitude);
            
            // --- FUNDO DO BOSS ---
            if (typeof BossSchool !== 'undefined') {
                BossSchool.drawBackground(ctx);
            }

            ctx.save();
            ctx.translate(0, -game.camera.y);
            
            // (O resto do draw continua igual desenhando lava, plataformas, etc...)
            
            lavaZones.forEach(lava => {
                const time = Date.now() / 100;
                const gradient = ctx.createLinearGradient(lava.x, lava.y, lava.x, lava.y + lava.height);
                gradient.addColorStop(0, '#ff4500');
                gradient.addColorStop(0.5, '#ff6347');
                gradient.addColorStop(1, '#ff8c00');
                
                ctx.fillStyle = gradient;
                ctx.fillRect(lava.x, lava.y, lava.width, lava.height);
                
                ctx.fillStyle = 'rgba(255, 215, 0, 0.3)';
                for (let i = 0; i < 5; i++) {
                    const bubbleX = lava.x + (i * lava.width / 5) + Math.sin(time + i) * 10;
                    const bubbleY = lava.y + Math.cos(time + i) * 5;
                    ctx.beginPath();
                    ctx.arc(bubbleX, bubbleY, 5, 0, Math.PI * 2);
                    ctx.fill();
                }
            });
            
            platforms.forEach(plat => {
                if (plat.fragile && plat.touched) {
                    ctx.globalAlpha = 0.5;
                }
                
                ctx.fillStyle = plat.placed ? '#4ecca3' : plat.moving ? '#ffd700' : plat.fragile ? '#ff6b6b' : '#e94560';
                ctx.fillRect(plat.x, plat.y, plat.width, plat.height);
                
                if (plat.placed) {
                    ctx.strokeStyle = '#fff';
                    ctx.lineWidth = 2;
                    ctx.strokeRect(plat.x, plat.y, plat.width, plat.height);
                }
                
                ctx.globalAlpha = 1;
				
				// --- DESENHO DOS INIMIGOS DO BOSS ---
				if (typeof BossSchool !== 'undefined') {
					BossSchool.drawForeground(ctx);
				}
				 // --- PROJÉTEIS E EFEITOS DO PLAYER ---
                if (typeof PlayerCombat !== 'undefined') {
                    PlayerCombat.draw(ctx);
                }

				// --- DESENHO DA BANDEIRA (NOVO) ---
                if (plat.isCheckpoint) {
                    // Haste
                    ctx.fillStyle = '#aaa';
                    ctx.fillRect(plat.x + 20, plat.y - 40, 4, 40);
                    
                    // Bandeira
                    ctx.fillStyle = plat.activated ? '#00ff00' : '#ff0000'; // Verde se salvo, Vermelho se não
                    ctx.beginPath();
                    ctx.moveTo(plat.x + 24, plat.y - 40);
                    ctx.lineTo(plat.x + 60, plat.y - 30);
                    ctx.lineTo(plat.x + 24, plat.y - 20);
                    ctx.fill();
                    
                    if (plat.activated) {
                        ctx.fillStyle = '#fff';
                        ctx.font = '10px Arial';
                        ctx.fillText("SALVO", plat.x + 15, plat.y - 45);
                    }
                }
                // ----------------------------------
            });

            ladders.forEach(ladder => {
                ctx.fillStyle = ladder.placed ? '#4ecca3' : '#8b4513';
                ctx.fillRect(ladder.x, ladder.y, ladder.width, ladder.height);
                
                ctx.strokeStyle = '#654321';
                ctx.lineWidth = 3;
                for (let i = 0; i < ladder.height; i += 20) {
                    ctx.beginPath();
                    ctx.moveTo(ladder.x, ladder.y + i);
                    ctx.lineTo(ladder.x + ladder.width, ladder.y + i);
                    ctx.stroke();
                }
            });
            
            elevators.forEach(elev => {
                ctx.fillStyle = elev.placed ? '#4ecca3' : '#4a90e2';
                ctx.fillRect(elev.x, elev.y, elev.width, elev.height);
                
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 2;
                ctx.strokeRect(elev.x, elev.y, elev.width, elev.height);
                
                ctx.strokeStyle = '#666';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(elev.x + elev.width/2, elev.startY - 200);
                ctx.lineTo(elev.x + elev.width/2, elev.y);
                ctx.stroke();
            });
            
            springs.forEach(spring => {
                ctx.fillStyle = spring.placed ? '#4ecca3' : '#ff69b4';
                ctx.fillRect(spring.x, spring.y, spring.width, spring.height);
                
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 3;
                ctx.beginPath();
                for (let i = 0; i < 5; i++) {
                    ctx.lineTo(spring.x + (i % 2) * spring.width, spring.y + (i * spring.height/5));
                }
                ctx.stroke();
            });
            
            walls.forEach(wall => {
                ctx.fillStyle = wall.placed ? '#4ecca3' : '#555';
                ctx.fillRect(wall.x, wall.y, wall.width, wall.height);
                
                ctx.strokeStyle = '#333';
                ctx.lineWidth = 4;
                ctx.strokeRect(wall.x, wall.y, wall.width, wall.height);
            });
            
			if (typeof EnemyManager !== 'undefined') {
                EnemyManager.draw(ctx);
            };
            
            if (game.placingElement) {
                const isValid = checkPlacementCollision(game.placingElement);
                ctx.fillStyle = isValid ? 'rgba(78, 204, 163, 0.5)' : 'rgba(255, 23, 68, 0.5)';
                ctx.fillRect(
                    game.placingElement.x, 
                    game.placingElement.y, 
                    game.placingElement.width, 
                    game.placingElement.height
                );
                ctx.strokeStyle = isValid ? '#4ecca3' : '#ff1744';
                ctx.lineWidth = 3;
                ctx.setLineDash([5, 5]);
                ctx.strokeRect(
                    game.placingElement.x, 
                    game.placingElement.y, 
                    game.placingElement.width, 
                    game.placingElement.height
                );
                ctx.setLineDash([]);
            }
			
// --- DESENHO DA ESCADA ROLANTE ---
            escalators.forEach(esc => {
                const time = Date.now() / 50; 

                // Linha Base
                ctx.lineWidth = 12;
                ctx.strokeStyle = '#444';
                ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.moveTo(esc.x1, esc.y1);
                ctx.lineTo(esc.x2, esc.y2);
                ctx.stroke();

                // Trilho em movimento
                ctx.lineWidth = 6;
                ctx.strokeStyle = game.escalatorOnCooldown ? '#ff4444' : '#ffd700'; 
                ctx.setLineDash([10, 15]); 
                ctx.lineDashOffset = -time; 
                ctx.beginPath();
                ctx.moveTo(esc.x1, esc.y1);
                ctx.lineTo(esc.x2, esc.y2);
                ctx.stroke();
                ctx.setLineDash([]);

                // Motores nas pontas
                const drawMotor = (x, y) => {
                    ctx.fillStyle = '#333';
                    ctx.beginPath(); ctx.arc(x, y, 12, 0, Math.PI * 2); ctx.fill();
                    ctx.save();
                    ctx.translate(x, y);
                    ctx.rotate(time / 5);
                    ctx.fillStyle = '#777';
                    ctx.fillRect(-8, -2, 16, 4);
                    ctx.fillRect(-2, -8, 4, 16);
                    ctx.restore();
                };

                drawMotor(esc.x1, esc.y1);
                drawMotor(esc.x2, esc.y2);
            });
            
            // PREVIEW (Linha amarela enquanto arrasta)
            if (game.placingElement && game.placingElement.type === 'escalator') {
               const p = game.placingElement;
               // No preview, usamos x/y + width/height porque ainda não salvamos como x1/x2
               const endX = p.x + p.width;
               const endY = p.y + p.height;
               
               ctx.strokeStyle = '#ffd700';
               ctx.lineWidth = 4;
               ctx.setLineDash([5, 5]);
               ctx.beginPath();
               ctx.moveTo(p.x, p.y);
               ctx.lineTo(endX, endY);
               ctx.stroke();
               ctx.setLineDash([]);
               
               ctx.fillStyle = 'rgba(255, 215, 0, 0.5)';
               ctx.beginPath(); ctx.arc(p.x, p.y, 10, 0, Math.PI*2); ctx.fill();
               ctx.beginPath(); ctx.arc(endX, endY, 10, 0, Math.PI*2); ctx.fill();
            }
			        
            // Draw Boot (amigo IA) - AZUL CIANO
            const bootColor = boot.emotion === 'worried' ? '#ff8800' : 
                            boot.emotion === 'excited' ? '#00ffff' : '#00d9ff';
            
            // Rastro/trail do Boot
            ctx.fillStyle = bootColor + '33';
            for (let i = 0; i < 3; i++) {
                ctx.fillRect(
                    boot.x + i * 3, 
                    boot.y + i * 3, 
                    boot.width - i * 6, 
                    boot.height - i * 6
                );
            }
            
            ctx.fillStyle = bootColor;
            ctx.fillRect(boot.x, boot.y, boot.width, boot.height);
            
            // Olhos brilhantes do Boot
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(boot.x + 5, boot.y + 5, 8, 8);
            ctx.fillRect(boot.x + boot.width - 13, boot.y + 5, 8, 8);
            
            ctx.fillStyle = '#00ffff';
            ctx.fillRect(boot.x + 7, boot.y + 7, 4, 4);
            ctx.fillRect(boot.x + boot.width - 11, boot.y + 7, 4, 4);
            
            // Antena do Boot
            ctx.strokeStyle = bootColor;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(boot.x + boot.width/2, boot.y);
            ctx.lineTo(boot.x + boot.width/2, boot.y - 8);
            ctx.stroke();
            ctx.fillStyle = bootColor;
            ctx.beginPath();
            ctx.arc(boot.x + boot.width/2, boot.y - 10, 3, 0, Math.PI * 2);
            ctx.fill();
            
            // Draw Player
            if (!player.invulnerable || Math.floor(Date.now() / 100) % 2 === 0) {
                ctx.fillStyle = '#00ff88';
                ctx.fillRect(player.x, player.y, player.width, player.height);
                
                ctx.fillStyle = '#fff';
                ctx.fillRect(player.x + 5, player.y + 5, 8, 8);
                ctx.fillRect(player.x + player.width - 13, player.y + 5, 8, 8);
            }
			
			// ADICIONE ISSO AQUI (Efeitos visuais):

			// 1. Desenho do Escudo
			if (player.hasShield) {
				ctx.strokeStyle = '#00ffff';
				ctx.lineWidth = 3;
				ctx.beginPath();
				const centerX = player.x + player.width / 2;
				const centerY = player.y + player.height / 2;
				ctx.arc(centerX, centerY, 35, 0, Math.PI * 2);
				ctx.stroke();
				
				ctx.fillStyle = 'rgba(0, 255, 255, 0.2)';
				ctx.fill();
			}

			// 2. Desenho do Paraquedas
			if (player.isGliding) {
				ctx.fillStyle = '#ff9900'; // Cor laranja
				ctx.beginPath();
				ctx.arc(player.x + player.width/2, player.y - 10, 30, Math.PI, 0); // Semicírculo
				ctx.fill();
				// Cordas
				ctx.strokeStyle = '#fff';
				ctx.lineWidth = 1;
				ctx.beginPath();
				ctx.moveTo(player.x, player.y);
				ctx.lineTo(player.x + player.width/2 - 20, player.y - 10);
				ctx.moveTo(player.x + player.width, player.y);
				ctx.lineTo(player.x + player.width/2 + 20, player.y - 10);
				ctx.stroke();
}
            
            ctx.restore();
        }

        function gameLoop() {
            update();
            draw();
            requestAnimationFrame(gameLoop);
        }

        document.getElementById('highScore').textContent = game.highScore;
        updateLives();
        initLevel();
        
        // Boot fala no início
        setTimeout(() => {
            bootSpeak('Vamos subir juntos!');
        }, 1000);
        
        gameLoop();