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
        // Se já tem um boss ativo, não chama outro
        if (this.currentBoss && this.currentBoss.active) return;

        const currentHeight = game.maxHeight * 10; // Altura atual em metros

        for (let boss of this.students) {
            // Se o boss não foi completado E a altura está dentro da zona dele
            if (!boss.completed && 
                currentHeight >= boss.startHeight && 
                currentHeight <= boss.endHeight) {
                
                this.currentBoss = boss;
                
                // Se o boss ainda não sabe que está ativo, avisa ele
                if (!boss.active) {
                    boss.active = true;
                    if(boss.init) boss.init();
                    console.log(`⚠️ ALERTA: ${boss.name} entrou em cena!`);
                }
                return; // Só um boss por vez
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