/**
 * Game.js - 动态迷宫游戏模块 v31.2 (最终状态修复版)
 * 1. 修复了游戏结束后（特别是最后一关失败后），再次开始游戏时关卡不重置的逻辑漏洞。
 * 2. 在 endGame 函数中强制重置关卡计数器，确保每次新游戏都从头开始。
 */
export class Game {
    // ... constructor 和其他所有函数保持不变 ...
    constructor(canvasId, dataLogger) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) { throw new Error(`Canvas with id "${canvasId}" not found!`); }
        this.ctx = this.canvas.getContext('2d');
        this.dataLogger = dataLogger;
        this.startGameBtn = document.getElementById('startGameBtn'); 
        this.tileSize = 25;
        this.player = null; this.goal = null; this.maze = null;
        this.level = 0;
        this.steps = 0;
        this.onGameCompleteCallback = null; this.keydownHandler = null;
        this.doorDiscovered = false;
        this.currentLevelConfig = {};
        this.isPlayerStunned = false;
        this.patrols = [];
        this.lastEnemyMoveTime = 0;
        this.gameLoopId = null;
        this.levelTimer = null;
        this.levelTimerId = null;
        this.playerHistory = [];
        this.playerMoveIntent = null;
        this.levelStartTime = 0;
        this.isLevelEnding = false;
        this.statusEl = document.getElementById('game-status');
        this.levelEl = document.getElementById('game-level');
        this.levels = [
            { levelId: '关卡 1', generator: { type: 'dfs', width: 19, height: 19 } },
            {
                levelId: '关卡 2',
                generator: { type: 'dfs', width: 19, height: 19, placeables: [{ item: 4, type: 'key' }, { item: 5, type: 'door' }] },
                dynamicEvents: [{ type: 'door_open', triggerOnItem: 4, condition: () => this.doorDiscovered, eventDetails: [{ action: 'change_item_type', itemType: 5, newValue: 0 }, { action: 'change_item_type', itemType: 4, newValue: 0 }] }]
            },
            {
                levelId: '关卡 3',
                generator: { type: 'dfs', width: 21, height: 21, placeables: [{ type: 'patrol_path', count: 2 }] },
                patrolSpeed: 500,
                dynamicEvents: [{ type: 'mid_game_twist', triggerOnProgress: 0.5, eventDetails: [ { action: 'move_goal', newPos: {x: 1, y: 19} }, { action: 'change_patrol_path', patrolId: 0, newPath: [{x: 9, y: 15}, {x: 10, y: 15}, {x: 11, y: 15}, {x: 12, y: 15}, {x: 13, y: 15}] }, { action: 'change_patrol_path', patrolId: 1, newPath: [{x: 5, y: 13}, {x: 5, y: 14}, {x: 5, y: 15}, {x: 5, y: 16}, {x: 5, y: 17}] }] }]
            },
            {
                levelId: '关卡 4',
                generator: { type: 'dfs', width: 25, height: 25 },
                settings: { fogOfWar: true, visionRadius: 2, pathMemoryLength: 15 }
            },
            {
                levelId: '关卡 5',
                generator: {
                    type: 'dfs', width: 21, height: 21, goalPos: { x: 1, y: 19 },
                    placeables: [
                        { item: 4, type: 'key' }, { item: 5, type: 'door' },
                        { type: 'patrol_path', count: 1 }
                    ]
                },
                settings: { fogOfWar: true, visionRadius: 3, countdown: 60 },
                patrolSpeed: 450,
                dynamicEvents: [{ type: 'door_open', triggerOnItem: 4, condition: () => this.doorDiscovered, eventDetails: [{ action: 'change_item_type', itemType: 5, newValue: 0 }, { action: 'change_item_type', itemType: 4, newValue: 0 }] }]
            }
        ];
        this.resetUI();
    }
    _findPath(grid, startPos, goal, blockedTypes) {
        if (!grid || !startPos || !goal) return null;
        const queue = [ [startPos.x, startPos.y, []] ];
        const visited = new Set([`${startPos.x},${startPos.y}`]);
        const { width, height } = { width: grid[0].length, height: grid.length };
        while (queue.length > 0) {
            const [x, y, path] = queue.shift();
            const newPath = [...path, {x, y}];
            const goalReached = (typeof goal === 'object') ? (x === goal.x && y === goal.y) : (grid[y][x] === goal);
            if (goalReached) return newPath;
            const directions = [[0, 1], [0, -1], [1, 0], [-1, 0]];
            for (const [dx, dy] of directions) {
                const [nx, ny] = [x + dx, y + dy];
                const key = `${nx},${ny}`;
                if (nx >= 0 && nx < width && ny >= 0 && ny < height && !visited.has(key) && !blockedTypes.includes(grid[ny][nx])) {
                    visited.add(key); queue.push([nx, ny, newPath]);
                }
            }
        }
        return null;
    }
    _getDecisionPoints(maze) {
        const points = [];
        const directions = [[0, 1], [0, -1], [1, 0], [-1, 0]];
        for (let y = 1; y < maze.length - 1; y++) {
            for (let x = 1; x < maze[y].length - 1; x++) {
                if (maze[y][x] !== 1) { // 如果不是墙
                    let openPaths = 0;
                    for (const [dx, dy] of directions) {
                        if (maze[y + dy][x + dx] !== 1) {
                            openPaths++;
                        }
                    }
                    if (openPaths > 2) {
                        points.push({ x, y });
                    }
                }
            }
        }
        return points;
    }
    _generateMaze(config) {
        let maze; let attempts = 0;
        let generatedPatrols = [];

        while (attempts < 200) {
            attempts++;
            maze = Array.from({ length: config.height }, () => Array(config.width).fill(1));
            const carve = (x, y) => {
                maze[y][x] = 0;
                const directions = [[1, 0], [-1, 0], [0, 1], [0, -1]];
                directions.sort(() => Math.random() - 0.5);
                for (const [dx, dy] of directions) {
                    const [nx, ny] = [x + dx * 2, y + dy * 2];
                    if (ny >= 0 && ny < config.height && nx >= 0 && nx < config.width && maze[ny][nx] === 1) {
                        maze[y + dy][x + dx] = 0; carve(nx, ny);
                    }
                }
            };
            carve(1, 1);
            const startPos = { x: 1, y: 1 };
            const goalPos = config.goalPos || { x: config.width - 2, y: config.height - 2 };
            maze[startPos.y][startPos.x] = 2; maze[goalPos.y][goalPos.x] = 3;
            if (!config.placeables || config.placeables.length === 0) return { maze, patrols: [] };
            
            let itemsToPlace = [...config.placeables];
            if (itemsToPlace.some(p => p.type === 'door')) {
                const criticalPath = this._findPath(maze, startPos, goalPos, [1]);
                if (!criticalPath || criticalPath.length < 10) continue;
                const doorPos = criticalPath[Math.floor(criticalPath.length * 0.7)];
                maze[doorPos.y][doorPos.x] = 5;
                itemsToPlace = itemsToPlace.filter(p => p.type !== 'door');
                
                const reachableCellsForKey = [];
                const queue = [[startPos.x, startPos.y]];
                const visited = new Set([`${startPos.x},${startPos.y}`]);
                while(queue.length > 0) {
                    const [x, y] = queue.shift();
                    if (maze[y][x] === 0) reachableCellsForKey.push({x, y});
                    const directions = [[0, 1], [0, -1], [1, 0], [-1, 0]];
                    for (const [dx, dy] of directions) {
                        const [nx, ny] = [x + dx, y + dy];
                        const key = `${nx},${ny}`;
                        if (nx >= 0 && nx < config.width && ny >= 0 && ny < config.height && !visited.has(key) && ![1, 5].includes(maze[ny][nx])) {
                            visited.add(key); queue.push([nx, ny]);
                        }
                    }
                }
                if (reachableCellsForKey.length === 0) continue;
                const minDistance = config.width * 1.0;
                reachableCellsForKey.sort(() => Math.random() - 0.5);
                let keyPos = null;
                for (const pos of reachableCellsForKey) {
                    const dist = Math.abs(pos.x - doorPos.x) + Math.abs(pos.y - doorPos.y);
                    if (dist > minDistance) { keyPos = pos; break; }
                }
                if (!keyPos) keyPos = reachableCellsForKey[0];
                if (keyPos) maze[keyPos.y][keyPos.x] = 4;
                itemsToPlace = itemsToPlace.filter(p => p.type !== 'key');
            }

            const patrolConfig = itemsToPlace.find(p => p.type === 'patrol_path');
            if (patrolConfig) {
                const allPathCells = [];
                for (let y=0; y<config.height; y++) for (let x=0; x<config.width; x++) if (maze[y][x] === 0) allPathCells.push({x, y});
                
                generatedPatrols = [];
                for(let i=0; i < patrolConfig.count; i++) {
                    let patrolPath; let pathAttempts = 0;
                    do {
                        const pathStart = allPathCells[Math.floor(Math.random() * allPathCells.length)];
                        const pathEnd = allPathCells[Math.floor(Math.random() * allPathCells.length)];
                        patrolPath = this._findPath(maze, pathStart, pathEnd, [1,5]);
                        pathAttempts++;
                    } while((!patrolPath || patrolPath.length < 5) && pathAttempts < 50);

                    if (patrolPath) {
                        generatedPatrols.push({ id: i, path: patrolPath });
                    }
                }
            }
            return { maze, patrols: generatedPatrols };
        }
        console.error("无法在200次尝试内生成有效的迷宫！"); return null;
    }
    resetUI() {
        this.statusEl.textContent = '准备就绪'; this.levelEl.textContent = 'N/A';
        const generatorConfig = this.levels[0].generator;
        const initialSize = (generatorConfig ? generatorConfig.width : 10) * 25;
        this.canvas.width = initialSize; this.canvas.height = initialSize;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = "black"; this.ctx.font = "24px Arial"; this.ctx.textAlign = "center";
        this.ctx.fillText("点击下方 '开始游戏' 按钮", this.canvas.width / 2, this.canvas.height / 2);
        if (this.startGameBtn) this.startGameBtn.style.display = 'block';
    }
    start(onGameComplete) {
        if (this.startGameBtn) this.startGameBtn.style.display = 'none';
        this.onGameCompleteCallback = onGameComplete;
        this.level = 0;
        this.loadLevel();
    }
    loadLevel() {
        this.stopGameLoop();
        this.stopListening();
        this.isLevelEnding = false;
        if (this.level >= this.levels.length) {
            this.endGame();
            return;
        }
        const levelTemplate = this.levels[this.level];
        this.currentLevelConfig = { ...levelTemplate };
        this.currentLevelConfig.dynamicEvents = levelTemplate.dynamicEvents ? levelTemplate.dynamicEvents.map(e => ({...e})) : [];
        this.currentLevelConfig.patrols = levelTemplate.patrols ? JSON.parse(JSON.stringify(levelTemplate.patrols)) : [];
        this.currentLevelConfig.settings = levelTemplate.settings ? JSON.parse(JSON.stringify(levelTemplate.settings)) : {};

        if (this.currentLevelConfig.generator) {
            const generated = this._generateMaze(this.currentLevelConfig.generator);
            if (!generated) { alert("关卡生成失败，请刷新页面重试。"); return; }
            this.maze = generated.maze;
            this.currentLevelConfig.patrols = generated.patrols;
        } else {
            this.maze = JSON.parse(JSON.stringify(this.currentLevelConfig.grid));
        }

        this.tileSize = this.maze.length > 20 ? 20 : 25;
        this.canvas.width = this.maze[0].length * this.tileSize;
        this.canvas.height = this.maze.length * this.tileSize;

        this.resetLevelState();
        const optimalPathBlockedTypes = [1];
        const optimalPath = this._findPath(this.maze, this.player, this.goal, optimalPathBlockedTypes);
        const decisionPoints = this._getDecisionPoints(this.maze);

        const progressEvent = this.currentLevelConfig.dynamicEvents.find(e => e.triggerOnProgress);
        if (progressEvent && optimalPath) {
            progressEvent.triggerOnStep = Math.floor(optimalPath.length * progressEvent.triggerOnProgress);
        }

        this.dataLogger.logEvent('level_start', {
            levelIndex: this.level,
            levelId: this.currentLevelConfig.levelId,
            maze: {
                dimensions: { width: this.maze[0].length, height: this.maze.length },
                grid: this.maze,
                startPosition: { ...this.player },
                goalPosition: { ...this.goal },
                optimalPathLength: optimalPath ? optimalPath.length : 0,
                decisionPoints: decisionPoints
            },
            settings: this.currentLevelConfig.settings,
            initialPatrols: this.currentLevelConfig.patrols.map(p => ({ id: p.id, path: p.path }))
        });
        this.levelStartTime = Date.now();
        this.listenForInput();
        this.startGameLoop();
    }
    resetLevelState(isRestart = false) {
        this.steps = 0;
        this.playerHistory = [];
        this.isPlayerStunned = false;
        if (!isRestart) {
            this.doorDiscovered = false;
        }
        for (let y = 0; y < this.maze.length; y++) {
            for (let x = 0; x < this.maze[y].length; x++) {
                if (this.maze[y][x] === 2) {
                    this.player = { x, y };
                    this.playerHistory.push({x, y});
                }
                if (this.maze[y][x] === 3) {
                    this.goal = { x, y };
                }
            }
        }
        this.initializePatrols();
        this.updateStatusText();
    }
    initializePatrols() {
        this.patrols = [];
        if (this.currentLevelConfig.patrols) {
            this.currentLevelConfig.patrols.forEach((pConfig) => {
                this.patrols.push({ id: pConfig.id, x: pConfig.path[0].x, y: pConfig.path[0].y, path: pConfig.path, currentIndex: 0, direction: 1 });
            });
        }
    }
    updateStatusText() {
        if (!this.currentLevelConfig) return;
        let statusText = `进行中`;
        if (this.currentLevelConfig.settings && typeof this.currentLevelConfig.settings.countdown !== 'undefined') {
            statusText = `<span style="font-weight: bold; color: #dc3545;">剩余时间: <span id="timer-display">${this.levelTimer}</span>s</span>`;
        }
        if(this.statusEl) this.statusEl.innerHTML = statusText;
        if(this.levelEl) this.levelEl.textContent = `关卡 ${this.level + 1}/${this.levels.length}`;
    }
    listenForInput() {
        this.keydownHandler = (e) => {
            if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return;
            e.preventDefault();
            this.playerMoveIntent = e.key;
        };
        window.addEventListener('keydown', this.keydownHandler);
    }
    stopListening() { if (this.keydownHandler) { window.removeEventListener('keydown', this.keydownHandler); this.keydownHandler = null; } }
    handlePlayerMove() {
        if (!this.player || !this.playerMoveIntent || this.isPlayerStunned) return;
        const key = this.playerMoveIntent;
        const fromPos = { ...this.player };
        this.dataLogger.logEvent('player_intent_input', {
            key: key,
            gameStateAtIntent: { player: { position: { ...this.player }, steps: this.steps, isStunned: this.isPlayerStunned } }
        });
        let dx = 0, dy = 0;
        if (key === 'ArrowUp') dy = -1; if (key === 'ArrowDown') dy = 1;
        if (key === 'ArrowLeft') dx = -1; if (key === 'ArrowRight') dx = 1;
        const nextX = this.player.x + dx, nextY = this.player.y + dy;
        let result, toPos;
        if (this.isPlayerStunned) {
            result = 'fail_stunned';
            toPos = fromPos;
        } else if (this.maze[nextY] && typeof this.maze[nextY][nextX] !== 'undefined') {
            const nextTile = this.maze[nextY][nextX];
            if (nextTile === 1) {
                result = 'fail_wall';
                toPos = fromPos;
            } else if (nextTile === 5) {
                if (!this.doorDiscovered) { this.doorDiscovered = true; }
                result = 'fail_door';
                toPos = fromPos;
            } else {
                result = 'move_success';
                this.player.x = nextX; this.player.y = nextY; this.steps++;
                toPos = { ...this.player };
                if (this.currentLevelConfig.settings && this.currentLevelConfig.settings.pathMemoryLength) {
                    this.playerHistory.push(toPos);
                    if (this.playerHistory.length > this.currentLevelConfig.settings.pathMemoryLength) this.playerHistory.shift();
                }
            }
        } else {
            result = 'fail_wall';
            toPos = fromPos;
        }
        this.dataLogger.logEvent('player_action_result', { inputKey: key, result: result, from: fromPos, to: toPos });
        this.playerMoveIntent = null;
    }
    checkDynamicEvents() {
        if (!this.player || !this.currentLevelConfig.dynamicEvents || this.currentLevelConfig.dynamicEvents.length === 0) return;
        const currentItem = this.maze[this.player.y][this.player.x];
        for (let i = this.currentLevelConfig.dynamicEvents.length - 1; i >= 0; i--) {
            const evt = this.currentLevelConfig.dynamicEvents[i];
            let triggered = false;
            if (evt.triggerOnProgress) {
                if (this.steps >= evt.triggerOnStep) triggered = true;
            } else if (evt.triggerOnItem) {
                if(currentItem === evt.triggerOnItem) {
                    const conditionMet = !evt.condition || evt.condition();
                    if (conditionMet) {
                        this.dataLogger.logEvent('item_interaction', { itemType: 'key', position: { ...this.player } });
                        triggered = true;
                    }
                }
            }
            if (triggered) this.triggerEvent(evt, i);
        }
    }
    triggerEvent(evt, index) {
        this.dataLogger.logEvent('world_dynamic_event_trigger', {
            triggerType: evt.type,
            details: evt.eventDetails,
            gameStateAtTrigger: { player: { position: { ...this.player }, steps: this.steps } }
        });
        if (evt.eventDetails) evt.eventDetails.forEach(detail => this.executeEventAction(detail));
        this.currentLevelConfig.dynamicEvents.splice(index, 1);
    }
    executeEventAction(detail) {
        switch(detail.action) {
            case 'change_item_type':
                if(detail.itemType === 5 && detail.newValue === 0) {
                    this.dataLogger.logEvent('item_interaction', { itemType: 'door_unlocked', position: { x: -1, y: -1 } });
                }
                for(let y=0; y<this.maze.length; y++) for(let x=0; x<this.maze[y].length; x++) if(this.maze[y][x] === detail.itemType) this.maze[y][x] = detail.newValue;
                break;
            case 'move_goal':
                if (this.goal) this.maze[this.goal.y][this.goal.x] = 0;
                this.goal = detail.newPos;
                this.maze[this.goal.y][this.goal.x] = 3;
                break;
            case 'change_patrol_path':
                const patrol = this.patrols.find(p => p.id === detail.patrolId);
                if (patrol) { patrol.path = detail.newPath; patrol.currentIndex = 0; patrol.direction = 1; }
                break;
        }
    }
    startGameLoop() {
        this.stopGameLoop();
        if(this.currentLevelConfig.settings && typeof this.currentLevelConfig.settings.countdown !== 'undefined') {
            this.levelTimer = this.currentLevelConfig.settings.countdown;
            this.levelTimerId = setInterval(() => {
                if (this.levelTimer > 0) this.levelTimer--;
                this.updateStatusText();
            }, 1000);
        }
        const gameLoop = () => { this.update(); this.draw(); this.gameLoopId = requestAnimationFrame(gameLoop); };
        this.gameLoopId = requestAnimationFrame(gameLoop);
    }
    stopGameLoop() { if (this.gameLoopId) cancelAnimationFrame(this.gameLoopId); if (this.levelTimerId) clearInterval(this.levelTimerId); this.gameLoopId = null; this.levelTimerId = null; }
    _logLevelEnd(status) {
        if (this.isLevelEnding) return;
        this.isLevelEnding = true;
        const duration = Date.now() - this.levelStartTime;
        this.dataLogger.logEvent('level_end', {
            levelIndex: this.level,
            levelId: this.currentLevelConfig.levelId,
            status: status,
            totalDurationMs: duration,
            finalGameState: {
                player: { position: { ...this.player }, steps: this.steps, isStunned: this.isPlayerStunned },
                patrols: this.patrols.map(p => ({ id: p.id, position: { x: p.x, y: p.y } }))
            }
        });
        this.level++;
        setTimeout(() => { this.loadLevel(); }, 50);
    }
    update() {
        if (!this.player || this.isLevelEnding) return;
        this.handlePlayerMove();
        if (this.levelTimer !== null && this.levelTimer <= 0) {
            this._logLevelEnd('fail_timeout');
            return;
        }
        if (this.patrols.length > 0 && (!this.lastEnemyMoveTime || Date.now() - this.lastEnemyMoveTime > this.currentLevelConfig.patrolSpeed)) {
            this.lastEnemyMoveTime = Date.now();
            this.patrols.forEach(p => {
                p.currentIndex += p.direction;
                if (p.currentIndex >= p.path.length - 1 || p.currentIndex <= 0) { p.direction *= -1; }
                const newPos = p.path[p.currentIndex];
                p.x = newPos.x; p.y = newPos.y;
            });
        }
        if (this.patrols.some(p => p.x === this.player.x && p.y === this.player.y)) {
            if (!this.isPlayerStunned) {
                this.isPlayerStunned = true;
                this.dataLogger.logEvent('player_state_change', {
                    change: 'stun_start',
                    cause: 'patrol_collision',
                    playerPosition: { ...this.player }
                });
                setTimeout(() => {
                    this.isPlayerStunned = false;
                    this.dataLogger.logEvent('player_state_change', {
                        change: 'stun_end',
                        cause: 'timeout_recovery',
                        playerPosition: { ...this.player }
                    });
                }, 1500);
            }
        }
        this.checkDynamicEvents();
        if (this.player.x === this.goal.x && this.player.y === this.goal.y) {
            this._logLevelEnd('win');
        }
    }
    draw() {
        if (!this.maze) return;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        const settings = this.currentLevelConfig.settings || {};
        const fogOfWar = settings.fogOfWar || false;
        const visionRadius = settings.visionRadius || Infinity;

        for (let y = 0; y < this.maze.length; y++) {
            for (let x = 0; x < this.maze[y].length; x++) {
                const dist = this.player ? Math.sqrt(Math.pow(this.player.x - x, 2) + Math.pow(this.player.y - y, 2)) : Infinity;
                const isInVision = dist <= visionRadius;
                const isInHistory = this.playerHistory.some(p => p.x === x && p.y === y);

                if (fogOfWar && !isInVision && !isInHistory) {
                    this.ctx.fillStyle = '#1a1a1a';
                } else {
                    let color = '#f8f9fa';
                    switch(this.maze[y][x]) {
                        case 1: color = '#343a40'; break; case 2: color = '#28a745'; break;
                        case 3: color = '#ffc107'; break; case 4: color = '#17a2b8'; break;
                        case 5: color = '#dc3545'; break;
                    }
                    this.ctx.fillStyle = color;
                    if (fogOfWar && isInHistory && !isInVision) this.ctx.globalAlpha = 0.4;
                }
                this.ctx.fillRect(x * this.tileSize, y * this.tileSize, this.tileSize, this.tileSize);
                this.ctx.globalAlpha = 1.0;
            }
        }
        this.patrols.forEach(p => {
            this.ctx.fillStyle = 'purple';
            this.ctx.fillRect(p.x * this.tileSize, p.y * this.tileSize, this.tileSize, this.tileSize);
        });
        if (this.player) {
            this.ctx.fillStyle = this.isPlayerStunned ? 'gray' : '#007bff';
            this.ctx.beginPath();
            this.ctx.arc( this.player.x * this.tileSize + this.tileSize / 2, this.player.y * this.tileSize + this.tileSize / 2, this.tileSize / 3, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }

    endGame() {
        this.stopGameLoop(); 
        this.stopListening();
        this.statusEl.textContent = '已完成';

        // --- 核心修复 ---
        // 无论游戏是如何结束的（通关或失败），都将关卡计数器重置为0，
        // 以确保下一次调用 start() 时，游戏能从第一关开始。
        this.level = 0;

        if (this.startGameBtn) this.startGameBtn.style.display = 'block';

        if (this.onGameCompleteCallback) this.onGameCompleteCallback();
    }
    
    stopAndReset() {
        this.stopGameLoop();
        this.stopListening();
        this.resetUI();
        this.level = 0; 
        this.maze = null;
        this.player = null;
        this.currentLevelConfig = {};
        if (this.startGameBtn) this.startGameBtn.style.display = 'block';
        console.log("Game state has been fully stopped and reset.");
    }
}