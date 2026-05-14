// js/boss_school.js
// O GERENCIADOR DE BOSSES (O "DIRETOR")

const BossSchool = {
    students: [],     // Lista de todos os bosses cadastrados
    currentBoss: null, // O boss que está ativo no momento

    // Função para cadastrar um novo boss (Matrícula)
    register: function(bossModule) {
        this.students.push(bossModule);
        console.log(`🎓 Boss matriculado na escola: ${bossModule.name || 'Sem Nome'}`);
    },

    // Verifica se algum boss deve aparecer baseado na altura atual
    checkEnrollment: function() {
        if (this.currentBoss && this.currentBoss.active) return;

        const currentHeight = game.maxHeight * 10;

        for (let boss of this.students) {
            if (!boss.completed && 
                currentHeight >= boss.startHeight && 
                currentHeight <= boss.endHeight) {
                
                this.currentBoss = boss;
                
                if (!boss.active) {
                    // ⭐ SALVA O BIOMA ATUAL ANTES DE ATIVAR O BOSS
                    const currentAltitude = -game.camera.y;
                    const currentBiome = getCurrentBiome(); // Usa a função do 6_main.js
                    
                    // ⭐ CRIA CHECKPOINT AUTOMÁTICO **ANTES** DO BOSS APARECER
                    // Posição segura: um pouco abaixo do player atual
                    const safeY = player.y + 100; // 100px abaixo (não muito longe)
                    
                    platforms.push({
                        x: canvas.width / 2 - 50,
                        y: safeY,
                        width: 100,
                        height: 20,
                        isCheckpoint: true,
                        activated: true,
                        placed: true
                    });
                    
                    // ⭐ SALVA CHECKPOINT COM TODAS AS INFORMAÇÕES DO BIOMA
                    game.lastCheckpoint = {
                        x: canvas.width / 2 - 50,
                        y: safeY - 40,
                        altitude: currentAltitude,     // Altitude real
                        cameraY: game.camera.y,        // Posição da câmera
                        biome: currentBiome.key        // ⭐ NOVO: Salva o bioma
                    };
                    
                    console.log(`💾 Checkpoint criado: Altitude=${currentAltitude.toFixed(0)}, Bioma=${currentBiome.name}`);
                    
                    // Agora sim, ativa o boss
                    boss.active = true;
                    if(boss.init) boss.init();
                    
                    showBonus("⚠️ BOSS! Checkpoint Automático Salvo! ⚠️");
                    console.log(`⚠️ ALERTA: ${boss.name} entrou em cena!`);
                }
                return;
            }
        }
    },

    // --- MÉTODOS QUE O MAIN.JS VAI CHAMAR ---

    update: function() {
        this.checkEnrollment(); // Verifica se precisa ativar alguém

        if (this.currentBoss && this.currentBoss.active) {
            this.currentBoss.update();

            // Se o boss foi derrotado, libera a vaga
            if (this.currentBoss.completed) {
                console.log(`🏆 ${this.currentBoss.name} foi derrotado!`);
                this.currentBoss = null;
            }
        }
    },

    drawBackground: function(ctx) {
        if (this.currentBoss && this.currentBoss.active && this.currentBoss.drawBackground) {
            this.currentBoss.drawBackground(ctx);
        }
    },

    drawForeground: function(ctx) {
        if (this.currentBoss && this.currentBoss.active && this.currentBoss.drawForeground) {
            this.currentBoss.drawForeground(ctx);
        }
    },

    // Retorna true se o boss gerou plataforma, impedindo geração normal
    handleGeneration: function(currentY) {
        if (this.currentBoss && this.currentBoss.active && this.currentBoss.handleGeneration) {
            return this.currentBoss.handleGeneration(currentY);
        }
        return false;
    }
};