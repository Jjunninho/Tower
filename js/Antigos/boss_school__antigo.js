// js/boss_school.js
// O GERENCIADOR DE BOSSES COM "RECREIO"

const BossSchool = {
    students: [],     
    currentBoss: null, 
    
    lastBossDefeatedHeight: -9999, 
    // Aumentado de 800 para 1500 metros (ou o valor que desejar)
    minGapBetweenBosses: 1500,

    register: function(bossModule) {
        this.students.push(bossModule);
        console.log(`🎓 Boss matriculado: ${bossModule.name}`);
    },

    checkEnrollment: function() {
        if (this.currentBoss && this.currentBoss.active) return;

        const currentHeight = game.maxHeight * 10;

        // Se o jogador ainda não subiu os 1500m de folga, o código para aqui
        if (currentHeight < this.lastBossDefeatedHeight + this.minGapBetweenBosses) {
            return; 
        }

        for (let boss of this.students) {
            if (!boss.completed && 
                currentHeight >= boss.startHeight && 
                currentHeight <= boss.endHeight) {
                
                this.currentBoss = boss;
                
                if (!boss.active) {
                    // Checkpoint logic (mantida igual)
                    const currentAltitude = -game.camera.y;
                    const currentBiome = getCurrentBiome(); 
                    const safeY = player.y + 100;
                    
                    platforms.push({
                        x: canvas.width / 2 - 50, y: safeY,
                        width: 100, height: 20,
                        isCheckpoint: true, activated: true, placed: true
                    });
                    
                    game.lastCheckpoint = {
                        x: canvas.width / 2 - 50,
                        y: safeY - 40,
                        altitude: currentAltitude,
                        cameraY: game.camera.y,
                        biome: currentBiome.key
                    };
                    
                    boss.active = true;
                    if(boss.init) boss.init();
                    
                    showBonus("⚠️ ALERTA DE BOSS! ⚠️");
                }
                return;
            }
        }
    },

    update: function() {
        this.checkEnrollment(); 

        if (this.currentBoss && this.currentBoss.active) {
            this.currentBoss.update();

            if (this.currentBoss.completed) {
                console.log(`🏆 ${this.currentBoss.name} derrotado!`);
                
                // 🟢 MARCA A ALTURA DA VITÓRIA
                this.lastBossDefeatedHeight = game.maxHeight * 10;
                
                this.currentBoss = null;
            }
        }
    },

    // Funções de desenho e geração mantidas iguais
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
    handleGeneration: function(currentY) {
        if (this.currentBoss && this.currentBoss.active && this.currentBoss.handleGeneration) {
            return this.currentBoss.handleGeneration(currentY);
        }
        return false;
    }
};