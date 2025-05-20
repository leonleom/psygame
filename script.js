document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('mazeCanvas');
    const ctx = canvas.getContext('2d');
    const resetButton = document.getElementById('resetButton');
    const stepsCountEl = document.getElementById('stepsCount');
    const timerEl = document.getElementById('timer');
    const messageEl = document.getElementById('message');
    const dataLogOutputEl = document.getElementById('dataLogOutput');

    const TILE_SIZE = 30; // 每个格子的大小
    const WALL_COLOR = '#333';
    const PATH_COLOR = '#eee'; // 确保路径颜色与canvas背景不同
    const PLAYER_COLOR = 'blue';
    const START_COLOR = 'lightgreen';
    const GOAL_COLOR = 'gold';

    // 0: 路径, 1: 墙, 2: 起点, 3: 终点
    let maze = [
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        [1, 2, 0, 1, 0, 0, 0, 0, 0, 1],
        [1, 1, 0, 1, 0, 1, 1, 1, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 1, 0, 1],
        [1, 0, 1, 1, 1, 1, 0, 1, 1, 1],
        [1, 0, 0, 0, 0, 1, 0, 0, 0, 1],
        [1, 1, 1, 1, 0, 1, 1, 1, 0, 1],
        [1, 0, 0, 0, 0, 1, 0, 0, 3, 1],
        [1, 0, 1, 1, 1, 1, 1, 1, 1, 1],
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
    ];

    let player = { x: 0, y: 0 };
    let goal = { x: 0, y: 0 };
    let steps = 0;
    let gameWon = false;
    let startTime;
    let timerInterval;

    // --- 数据收集 ---
    let gameSessionData = [];
    let gameId = `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    function logData(eventType, eventData = {}) {
        const timestamp = Date.now();
        const logEntry = {
            gameId,
            timestamp,
            timeSinceStart: startTime ? (timestamp - startTime) / 1000 : 0,
            eventType,
            playerPos: { x: player.x, y: player.y },
            steps,
            ...eventData // 合并额外数据
        };
        gameSessionData.push(logEntry);
        // console.log('Data Logged:', logEntry); // 在控制台打印
        updateDataLogOutput(); // 更新页面上的数据展示
    }

    function updateDataLogOutput() {
        dataLogOutputEl.innerHTML = gameSessionData.map(entry =>
            `<div><strong>${new Date(entry.timestamp).toLocaleTimeString()} (${entry.timeSinceStart.toFixed(2)}s) [${entry.eventType}]</strong>: Player@(${entry.playerPos.x},${entry.playerPos.y}), Steps:${entry.steps}${entry.details ? `, ${entry.details}` : ''}</div>`
        ).join('');
        dataLogOutputEl.scrollTop = dataLogOutputEl.scrollHeight; // 自动滚动到底部
    }
    // --- 数据收集结束 ---

    function initGame() {
        canvas.width = maze[0].length * TILE_SIZE;
        canvas.height = maze.length * TILE_SIZE;

        // 找到起点和终点
        for (let y = 0; y < maze.length; y++) {
            for (let x = 0; x < maze[y].length; x++) {
                if (maze[y][x] === 2) {
                    player.x = x;
                    player.y = y;
                } else if (maze[y][x] === 3) {
                    goal.x = x;
                    goal.y = y;
                }
            }
        }

        steps = 0;
        gameWon = false;
        messageEl.textContent = '';
        stepsCountEl.textContent = steps;
        timerEl.textContent = '0.00';
        if (timerInterval) clearInterval(timerInterval);
        startTime = Date.now();
        timerInterval = setInterval(updateTimer, 10); // 每10ms更新一次，显示更平滑

        gameSessionData = []; // 重置当前游戏会话的数据
        gameId = `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`; // 新游戏ID
        logData('game_start', { maze_dimensions: `${maze[0].length}x${maze.length}` });

        drawMaze();
        drawPlayer();
    }

    function drawMaze() {
        for (let y = 0; y < maze.length; y++) {
            for (let x = 0; x < maze[y].length; x++) {
                ctx.fillStyle = PATH_COLOR; // 默认是路径
                if (maze[y][x] === 1) {
                    ctx.fillStyle = WALL_COLOR;
                } else if (maze[y][x] === 2) {
                    ctx.fillStyle = START_COLOR;
                } else if (maze[y][x] === 3) {
                    ctx.fillStyle = GOAL_COLOR;
                }
                ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
                // 可选：绘制网格线
                // ctx.strokeStyle = '#ddd';
                // ctx.strokeRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
            }
        }
    }

    function drawPlayer() {
        ctx.fillStyle = PLAYER_COLOR;
        ctx.beginPath();
        ctx.arc(
            player.x * TILE_SIZE + TILE_SIZE / 2,
            player.y * TILE_SIZE + TILE_SIZE / 2,
            TILE_SIZE / 3, // 玩家半径
            0,
            Math.PI * 2
        );
        ctx.fill();
    }

    function movePlayer(dx, dy) {
        if (gameWon) return;

        const nextX = player.x + dx;
        const nextY = player.y + dy;
        let moveSuccessful = false;
        let collisionType = null;

        // 边界检查
        if (nextX < 0 || nextX >= maze[0].length || nextY < 0 || nextY >= maze.length) {
            collisionType = 'boundary';
        }
        // 墙壁检查
        else if (maze[nextY][nextX] === 1) {
            collisionType = 'wall';
        }
        // 可以移动
        else {
            player.x = nextX;
            player.y = nextY;
            steps++;
            stepsCountEl.textContent = steps;
            moveSuccessful = true;
        }

        const direction = dx === 1 ? 'right' : dx === -1 ? 'left' : dy === 1 ? 'down' : dy === -1 ? 'up' : 'unknown';
        logData(
            moveSuccessful ? 'player_move' : 'player_collision',
            {
                direction: direction,
                attempted_target: { x: nextX, y: nextY },
                ...(collisionType && { collision_type: collisionType }),
                details: moveSuccessful ? `Moved ${direction}` : `Collision ${direction} (${collisionType || 'unknown'})`
            }
        );


        // 清除画布并重绘
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawMaze();
        drawPlayer();

        // 检查是否到达终点
        if (player.x === goal.x && player.y === goal.y) {
            gameWon = true;
            clearInterval(timerInterval);
            messageEl.textContent = '恭喜！你找到了出口！';
            logData('game_win', { total_time: (Date.now() - startTime) / 1000, total_steps: steps, details: 'Reached goal' });
            // 在这里可以将 gameSessionData 发送到服务器或存储到 localStorage
            console.log("--- Game Session Data ---");
            console.log(JSON.stringify(gameSessionData, null, 2)); // 格式化输出
            alert(`游戏结束！\n总步数: ${steps}\n总用时: ${((Date.now() - startTime) / 1000).toFixed(2)}s\n详细数据已打印到控制台并在页面下方展示。`);
        }
    }

    function updateTimer() {
        if (!gameWon) {
            const elapsedTime = (Date.now() - startTime) / 1000;
            timerEl.textContent = elapsedTime.toFixed(2);
        }
    }

    function handleKeyDown(e) {
        if (gameWon) return;
        let dx = 0, dy = 0;
        switch (e.key) {
            case 'ArrowUp':    case 'w': dy = -1; break;
            case 'ArrowDown':  case 's': dy = 1;  break;
            case 'ArrowLeft':  case 'a': dx = -1; break;
            case 'ArrowRight': case 'd': dx = 1;  break;
            default: return; // 不是方向键则不处理
        }
        e.preventDefault(); // 阻止方向键滚动页面
        if (dx !== 0 || dy !== 0) {
            movePlayer(dx, dy);
        }
    }

    resetButton.addEventListener('click', initGame);
    window.addEventListener('keydown', handleKeyDown);

    // 初始加载游戏
    initGame();
});