        const canvas = document.getElementById('gameCanvas');
        const ctx = canvas.getContext('2d');
        
        function resizeCanvas() {
            canvas.width = window.innerWidth - 120;
            canvas.height = window.innerHeight;
        }
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

		// Game State
		const game = {
			level: 1,
			generatedY: 0,
			nextCheckpointThreshold: -3000,
			lastCheckpoint: null,
			maxHeight: 0,
			lastHeight: 0,
			score: 0,
			highScore: localStorage.getItem('torreHighScore') || 0,
			lives: 3,
			maxLives: 5,
			camera: { y: 0 },
			keys: {},
			selectedTool: null,
			placingElement: null,
			mousePos: { x: 0, y: 0 },
			combo: 0,
			comboTimer: 0,
			elementsUsedThisLevel: 0,
			gameOver: false,
			lastScoreUpdate: 0,
			enemiesAvoided: 0,
			ladderConsecutiveUses: 0,
			ladderOnCooldown: false,
			springConsecutiveUses: 0,
			springOnCooldown: false,
			escalatorConsecutiveUses: 0,
			escalatorOnCooldown: false
		};

		// Player
		const player = {
			x: canvas.width / 2,
			y: canvas.height - 100,
			width: 30,
			height: 40,
			vx: 0,
			vy: 0,
			speed: 5,
			jumpPower: 12,
			jumpsLeft: 2,
			maxJumps: 2,
			gravity: 0.5,
			onGround: false,
			onLadder: false,
			invulnerable: false,
			invulnerableTimer: 0,
			isGliding: false,
			hasShield: false
		};

		// Boot - O amigo IA
		const boot = {
			x: canvas.width / 2 + 100,
			y: canvas.height - 100,
			width: 30,
			height: 40,
			vx: 0,
			vy: 0,
			speed: 6, 
			gravity: 0.5,
			history: [], 
			historyDelay: 40, 
			state: 'following',
			personality: {
				encouragement: ['Vamos lá!', 'Você consegue!', 'Boa!', 'Isso aí!', 'Continue!'],
				overtake: ['Ops, passei você! 😄', 'Te alcancei!', 'Estou indo!', 'Consegui!'],
				fall: ['Cuidado aí!', 'Tá tudo bem?', 'Levanta!', 'Não desiste!', 'Eu te espero!'],
				levelUp: ['Nova fase! 🎉', 'Incrível!', 'Que subida!', 'Uau!'],
				motivational: ['Quase lá!', 'Mais um pouco!', 'Vamos juntos!', 'Eu acredito em você!'],
				teleport: ['Espere por mim!', 'Ufa, quase caí!', 'Vim voando!', 'Cheat ativado! 🚀']
			},
			lastSpeech: 0,
			speechCooldown: 3000,
			emotion: 'happy',
			maxHeight: 0
		};

		// Game elements (Arrays)
		let platforms = [];
		let ladders = [];
		let elevators = [];
		let springs = [];
		let escalators = [];
		let walls = [];
		let lavaZones = [];
		let enemies = [];
		let placedElements = [];
		let dragStart = null;
		