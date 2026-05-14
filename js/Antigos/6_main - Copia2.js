// --- UPDATE LOOP ---
		function update() {
            if (game.gameOver) return;
            
            // 1. Descobre onde estamos para ajustar a física (NOVO CÓDIGO)
            const currentBiome = getCurrentBiome();
            let friction = 0;   
            let accel = 0;      
            let gravityMod = 1; 

            // --- CONFIGURAÇÃO FÍSICA POR BIOMA ---
            if (currentBiome.key === 'CLOUDS') {
                // NUVENS: Chão escorregadio
                accel = 0.3;     
                friction = 0.96; 
            } 
            else if (currentBiome.key === 'SPACE' || currentBiome.key === 'COSMIC') {
                // ESPAÇO: Baixa gravidade
                gravityMod = 0.4; 
                accel = 0.5;
                friction = 0.98;
            } 

            // --- APLICAÇÃO DO MOVIMENTO LATERAL ---
            if (accel > 0) {
                // MODO INÉRCIA (Nuvens/Espaço)
                if (game.keys['ArrowLeft']) player.vx -= accel;
                if (game.keys['ArrowRight']) player.vx += accel;

                if (player.vx > player.speed) player.vx = player.speed;
                if (player.vx < -player.speed) player.vx = -player.speed;

                if (!game.keys['ArrowLeft'] && !game.keys['ArrowRight']) {
                    player.vx *= friction;
                    if (Math.abs(player.vx) < 0.1) player.vx = 0;
                }
            } else {
                // MODO PADRÃO
                player.vx = 0;
                if (game.keys['ArrowLeft']) player.vx = -player.speed;
                if (game.keys['ArrowRight']) player.vx = player.speed;
            }

	// --- APLICAÇÃO DA GRAVIDADE (CORRIGIDO) ---
				if (player.invulnerable) {
					player.invulnerableTimer--;
					if (player.invulnerableTimer <= 0) {
						player.invulnerable = false;
					}
				}
				
				// Modificador de gravidade do Paraquedas
				let currentGravity = player.gravity * gravityMod;

				if (player.isGliding && player.vy > 0) {
					currentGravity *= 0.1; // Cai 90% mais devagar
					player.vy = Math.min(player.vy, 2); // Limita a velocidade de queda
				}

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
            
            enemies.forEach((enemy, index) => {
                if (enemy.type === 'patrol') {
                    enemy.x += enemy.vx;
                    if (enemy.x <= enemy.startX - enemy.range || enemy.x >= enemy.startX + enemy.range) {
                        enemy.vx *= -1;
                    }
                } else if (enemy.type === 'chase') {
                    const dist = Math.abs(player.x - enemy.x);
                    if (dist < 300 && Math.abs(player.y - enemy.y) < 150) {
                        const direction = player.x > enemy.x ? 1 : -1;
                        enemy.x += direction * 2;
                    }
                }
                
                if (player.x + player.width > enemy.x && 
                    player.x < enemy.x + enemy.width &&
                    player.y + player.height > enemy.y && 
                    player.y < enemy.y + enemy.height) {
                    loseLife();
                }
                
                if (enemy.y > game.camera.y + canvas.height + 200) {
                    enemies.splice(index, 1);
                    game.enemiesAvoided++;
                }
            });
			
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
            
            // --- ATUALIZAÇÃO DO BIOMA (Correção para modo infinito) ---
            // Agora usamos a posição Y real do jogador/camera
            const currentRealAltitude = -game.camera.y; 
            
            // Função auxiliar local rápida para bioma
            let biomeName = "Espaço Profundo";
            let biomeKey = "COSMIC";
            
            // Verifica manual simples ou reutiliza sua função adaptada
            for (let key in BIOMES) {
				const b = BIOMES[key];
				if (currentRealAltitude >= b.min && currentRealAltitude < b.max) {
					biomeName = b.name;
                    biomeKey = key;
                    break;
				}
			}

            const biomeElement = document.getElementById('biome');
            if (biomeElement) {
                let suffix = "";
                if (biomeKey === 'SPACE' || biomeKey === 'COSMIC') suffix = " <small>(Gravidade Baixa 🌑)</small>";
                else if (biomeKey === 'CLOUDS') suffix = " <small>(Piso Escorregadio ❄️)</small>";
                
                biomeElement.innerHTML = biomeName + suffix;
                biomeElement.style.color = getBiomeColor(biomeKey);
            }
			
		}	

        function draw() {
// === SISTEMA DE BIOMAS - BACKGROUNDS DINÂMICOS ===
            const biome = getCurrentBiome();
            const altitude = -game.camera.y;

            switch(biome.key) {
                case 'UNDERGROUND':
                    const gradient1 = ctx.createLinearGradient(0, 0, 0, canvas.height);
                    gradient1.addColorStop(0, '#2b1810');
                    gradient1.addColorStop(1, '#1a0f08');
                    ctx.fillStyle = gradient1;
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    for(let i = 0; i < 5; i++) {
                        ctx.fillStyle = `rgba(101, 67, 33, ${0.1 - i*0.02})`;
                        ctx.fillRect(0, i * 150 + (altitude % 150), canvas.width, 80);
                    }
                    break;
                    
                case 'GROUND':
                    const gradient2 = ctx.createLinearGradient(0, 0, 0, canvas.height);
                    gradient2.addColorStop(0, '#87CEEB');
                    gradient2.addColorStop(1, '#4A90E2');
                    ctx.fillStyle = gradient2;
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    ctx.fillStyle = '#FFD700';
                    ctx.beginPath();
                    ctx.arc(canvas.width - 100, 80, 40, 0, Math.PI * 2);
                    ctx.fill();
                    break;
                    
                case 'FOREST':
                    const gradient3 = ctx.createLinearGradient(0, 0, 0, canvas.height);
                    gradient3.addColorStop(0, '#2d5016');
                    gradient3.addColorStop(1, '#1a3009');
                    ctx.fillStyle = gradient3;
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    for(let i = 0; i < 20; i++) {
                        const x = (i * 123 + altitude) % canvas.width;
                        const y = (i * 456 + altitude * 0.5) % canvas.height;
                        ctx.fillStyle = `rgba(144, 238, 144, ${0.3 + Math.sin(Date.now()/1000 + i)*0.2})`;
                        ctx.fillRect(x, y, 3, 3);
                    }
                    break;
                    
                case 'CLOUDS':
                    const gradient4 = ctx.createLinearGradient(0, 0, 0, canvas.height);
                    gradient4.addColorStop(0, '#B0E0E6');
                    gradient4.addColorStop(1, '#87CEEB');
                    ctx.fillStyle = gradient4;
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    for(let i = 0; i < 8; i++) {
                        const x = (i * 200 + altitude * 0.3) % (canvas.width + 200) - 100;
                        const y = (i * 80) % canvas.height;
                        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
                        ctx.beginPath();
                        ctx.arc(x, y, 50, 0, Math.PI * 2);
                        ctx.arc(x + 40, y, 60, 0, Math.PI * 2);
                        ctx.arc(x + 80, y, 50, 0, Math.PI * 2);
                        ctx.fill();
                    }
                    break;
                    
                case 'TWILIGHT':
                    const gradient5 = ctx.createLinearGradient(0, 0, 0, canvas.height);
                    gradient5.addColorStop(0, '#4B0082');
                    gradient5.addColorStop(0.5, '#8B008B');
                    gradient5.addColorStop(1, '#FF1493');
                    ctx.fillStyle = gradient5;
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    for(let i = 0; i < 30; i++) {
                        const x = (i * 87 + altitude * 0.1) % canvas.width;
                        const y = (i * 134) % canvas.height;
                        const twinkle = Math.sin(Date.now()/500 + i) * 0.5 + 0.5;
                        ctx.fillStyle = `rgba(255, 255, 255, ${twinkle * 0.8})`;
                        ctx.fillRect(x, y, 2, 2);
                    }
                    break;
                    
                case 'SPACE':
                    ctx.fillStyle = '#0a0a1a';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    for(let i = 0; i < 100; i++) {
                        const x = (i * 73 + altitude * 0.05) % canvas.width;
                        const y = (i * 97) % canvas.height;
                        const size = Math.random() * 2;
                        const brightness = Math.random();
                        ctx.fillStyle = `rgba(255, 255, 255, ${brightness})`;
                        ctx.fillRect(x, y, size, size);
                    }
                    const nebX = (altitude * 0.02) % canvas.width;
                    const nebGrad = ctx.createRadialGradient(nebX, 200, 0, nebX, 200, 300);
                    nebGrad.addColorStop(0, 'rgba(138, 43, 226, 0.3)');
                    nebGrad.addColorStop(1, 'rgba(138, 43, 226, 0)');
                    ctx.fillStyle = nebGrad;
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    break;
                    
                case 'COSMIC':
                    ctx.fillStyle = '#000005';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    for(let i = 0; i < 5; i++) {
                        const x = canvas.width/2 + Math.sin(Date.now()/1000 + i) * 200;
                        const y = canvas.height/2 + Math.cos(Date.now()/1000 + i) * 200;
                        const waveGrad = ctx.createRadialGradient(x, y, 0, x, y, 100);
                        waveGrad.addColorStop(0, 'rgba(0, 255, 255, 0.1)');
                        waveGrad.addColorStop(1, 'rgba(0, 255, 255, 0)');
                        ctx.fillStyle = waveGrad;
                        ctx.fillRect(0, 0, canvas.width, canvas.height);
                    }
                    for(let i = 0; i < 10; i++) {
                        const x = (i * 191) % canvas.width;
                        const y = (i * 227) % canvas.height;
                        const pulse = Math.sin(Date.now()/300 + i) * 0.5 + 0.5;
                        ctx.fillStyle = `rgba(255, 255, 255, ${pulse})`;
                        ctx.shadowBlur = 10;
                        ctx.shadowColor = 'white';
                        ctx.fillRect(x, y, 3, 3);
                        ctx.shadowBlur = 0;
                    }
                    break;
                    
                default:
                    ctx.fillStyle = '#0f0f1e';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
            }
			
				// --- FUNDO DO BOSS ---
				if (typeof BossSchool !== 'undefined') {
					BossSchool.drawBackground(ctx);
				}

            ctx.save();
            ctx.translate(0, -game.camera.y);
            
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
            
            enemies.forEach(enemy => {
                const gradient = ctx.createRadialGradient(
                    enemy.x + enemy.width/2, enemy.y + enemy.height/2, 5,
                    enemy.x + enemy.width/2, enemy.y + enemy.height/2, enemy.width/2
                );
                gradient.addColorStop(0, '#ff0066');
                gradient.addColorStop(1, '#cc0044');
                
                ctx.fillStyle = gradient;
                ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
                
                ctx.fillStyle = '#fff';
                ctx.fillRect(enemy.x + 8, enemy.y + 10, 8, 8);
                ctx.fillRect(enemy.x + enemy.width - 16, enemy.y + 10, 8, 8);
                
                ctx.fillStyle = '#000';
                ctx.fillRect(enemy.x + 10, enemy.y + 12, 4, 4);
                ctx.fillRect(enemy.x + enemy.width - 14, enemy.y + 12, 4, 4);
            });
            
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