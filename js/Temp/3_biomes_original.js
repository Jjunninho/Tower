// ===== js/3_biomes.js =====
// GERENCIADOR CENTRAL DE BIOMAS (Dados, Física, Arte e UI)

const BIOMES = {
    UNDERGROUND: { min: -Infinity, max: 0, name: "Subterrâneo" },
    GROUND: { min: 0, max: 2000, name: "Superfície" },
    FOREST: { min: 2000, max: 4000, name: "Floresta Flutuante" },
    CLOUDS: { min: 4000, max: 7000, name: "Reino das Nuvens" },
    TWILIGHT: { min: 7000, max: 10000, name: "Crepúsculo" },
    SPACE: { min: 10000, max: 15000, name: "Espaço Sideral" },
    COSMIC: { min: 15000, max: Infinity, name: "Vazio Cósmico" }
};

function getCurrentBiome() {
    // Usamos a posição real da câmera para saber onde estamos
    const altitude = typeof game !== 'undefined' ? -game.camera.y : 0; 
    
    for (let key in BIOMES) {
        const biome = BIOMES[key];
        if (altitude >= biome.min && altitude < biome.max) {
            return { key, ...biome };
        }
    }
    return { key: 'COSMIC', ...BIOMES.COSMIC };
}

function getBiomeColor(key) {
    const colors = {
        UNDERGROUND: '#8B4513',
        GROUND: '#4A90E2',
        FOREST: '#2d5016',
        CLOUDS: '#87CEEB',
        TWILIGHT: '#8B008B',
        SPACE: '#4B0082',
        COSMIC: '#00FFFF'
    };
    return colors[key] || '#FFF';
}

// ── 1. LÓGICA DE FÍSICA (Tirada do update do 6_main) ──
function getBiomePhysics(biomeKey) {
    let friction = 0;   
    let accel = 0;      
    let gravityMod = 1; 

    if (biomeKey === 'CLOUDS') {
        // NUVENS: Chão escorregadio
        accel = 0.3;     
        friction = 0.96; 
    } 
    else if (biomeKey === 'SPACE' || biomeKey === 'COSMIC') {
        // ESPAÇO: Baixa gravidade
        gravityMod = 0.4; 
        accel = 0.5;
        friction = 0.98;
    } 
    
    return { friction, accel, gravityMod };
}

// ── 2. ATUALIZAÇÃO DO HTML (Tirada do final do 6_main) ──
function updateBiomeUI() {
    const biome = getCurrentBiome();
    const biomeElement = document.getElementById('biome');
    
    if (biomeElement) {
        let suffix = "";
        if (biome.key === 'SPACE' || biome.key === 'COSMIC') suffix = " <small>(Gravidade Baixa 🌑)</small>";
        else if (biome.key === 'CLOUDS') suffix = " <small>(Piso Escorregadio ❄️)</small>";
        
        biomeElement.innerHTML = biome.name + suffix;
        biomeElement.style.color = getBiomeColor(biome.key);
    }
}

// ── 3. RENDERIZAÇÃO DE ARTE (Tirada do draw do 6_main) ──
function drawBiomeBackground(ctx, biome, altitude) {
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
}