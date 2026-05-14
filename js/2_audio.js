// --- SISTEMA DE ÁUDIO 8-BIT OTIMIZADO ---
const audioSys = {
    ctx: null,
    muted: false,
    musicTimer: null,
    
    init: function() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    },

    playTone: function(freq, type, duration, vol = 0.1, slide = 0) {
        if (this.muted || !this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = type; 
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        if (slide !== 0) {
            osc.frequency.exponentialRampToValueAtTime(freq + slide, this.ctx.currentTime + duration);
        }
        
        gain.gain.setValueAtTime(vol, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);
        
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    },

    // EFEITOS SONOROS (inalterados)
    sfx: {
        jump: () => audioSys.playTone(300, 'square', 0.15, 0.1, 300),
        jumpDouble: () => audioSys.playTone(400, 'square', 0.2, 0.1, 500),
        land: () => audioSys.playTone(100, 'triangle', 0.1, 0.1, -50),
        build: () => audioSys.playTone(800, 'sine', 0.1, 0.15),
        error: () => audioSys.playTone(150, 'sawtooth', 0.2, 0.1, -50),
        damage: () => {
            if (audioSys.muted || !audioSys.ctx) return;
            const bufferSize = audioSys.ctx.sampleRate * 0.2;
            const buffer = audioSys.ctx.createBuffer(1, bufferSize, audioSys.ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = Math.random() * 2 - 1;
            }
            const noise = audioSys.ctx.createBufferSource();
            noise.buffer = buffer;
            const gain = audioSys.ctx.createGain();
            gain.gain.value = 0.2;
            gain.gain.exponentialRampToValueAtTime(0.01, audioSys.ctx.currentTime + 0.2);
            noise.connect(gain);
            gain.connect(audioSys.ctx.destination);
            noise.start();
        },
        levelUp: () => {
            setTimeout(() => audioSys.playTone(440, 'sine', 0.2), 0);
            setTimeout(() => audioSys.playTone(554, 'sine', 0.2), 100);
            setTimeout(() => audioSys.playTone(659, 'sine', 0.4), 200);
        },
        gameOver: () => {
            setTimeout(() => audioSys.playTone(300, 'sawtooth', 0.4, 0.2, -100), 0);
            setTimeout(() => audioSys.playTone(200, 'sawtooth', 0.4, 0.2, -100), 300);
            setTimeout(() => audioSys.playTone(100, 'sawtooth', 0.8, 0.2, -50), 600);
        }
    },

    music: {
        playing: false,
        variation: 0,
        patterns: [
            // Pattern 1 - Original
            {notes: [220, 0, 330, 0, 220, 0, 165, 0, 220, 0, 330, 0, 440, 0, 330, 0], type: 'triangle'},
            // Pattern 2 - Levemente diferente
            {notes: [220, 0, 349, 0, 220, 0, 165, 0, 220, 0, 349, 0, 440, 0, 349, 0], type: 'triangle'},
            // Pattern 3 - Mais agudo
            {notes: [262, 0, 392, 0, 262, 0, 196, 0, 262, 0, 392, 0, 523, 0, 392, 0], type: 'sine'}
        ],
        
        start: function() {
            if (this.playing || audioSys.muted) return;
            this.playing = true;
            let idx = 0;
            
            audioSys.musicTimer = setInterval(() => {
                if (audioSys.muted) return;
                
                const pattern = this.patterns[this.variation];
                const freq = pattern.notes[idx];
                
                if (freq > 0) {
                    // Variação MUITO simples: apenas muda o volume levemente
                    const vol = 0.05 + (Math.random() * 0.02);
                    audioSys.playTone(freq, pattern.type, 0.3, vol);
                }
                
                idx = (idx + 1) % pattern.notes.length;
                
                // Muda de pattern a cada ciclo completo (16 notas)
                if (idx === 0) {
                    this.variation = (this.variation + 1) % this.patterns.length;
                }
            }, 250); // Intervalo FIXO para estabilidade
        },
        
        stop: function() {
            clearInterval(audioSys.musicTimer);
            this.playing = false;
            this.variation = 0;
        }
    }
};

// Controle de mute (inalterado)
document.getElementById('muteBtn').addEventListener('click', () => {
    audioSys.muted = !audioSys.muted;
    document.getElementById('muteBtn').textContent = audioSys.muted ? '🔇' : '🔊';
    if (audioSys.muted) audioSys.music.stop();
    else {
        audioSys.init();
        audioSys.music.start();
    }
});

// Inicialização (inalterada)
window.addEventListener('click', () => {
    audioSys.init();
    if (!audioSys.muted && !audioSys.music.playing) audioSys.music.start();
}, { once: true });