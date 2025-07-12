// modules/Results.js - 结果分析模块 (UI布局最终修正完整版) v10.0

export class Results {
    constructor() {
        // 现在我们只需要两个主容器
        this.placeholder = document.getElementById('results-placeholder');
        this.displayContainer = document.getElementById('results-display');
    }

    /**
     * [公开方法] 渲染结果页面，采用全新的UI结构和分析逻辑
     * @param {Array<object>} gameData - 从 DataLogger 获取的游戏事件日志数组。
     */
    render(gameData) {
        // 从 localStorage 获取已完成的问卷结果
        const bis11Data = JSON.parse(localStorage.getItem('bis11_results'));
        const csiData = JSON.parse(localStorage.getItem('csi_results'));
        const hasGameData = gameData && gameData.some(e => e.eventType === 'level_start');
        
        // 每次渲染前，彻底清空主展示容器
        this.displayContainer.innerHTML = ''; 
        this.placeholder.classList.add('hidden');
        
        let hasAnyData = false;

        // 1. 渲染游戏相关的报告
        if (hasGameData) {
            const gameReport = this.analyzeLatestGameSession(gameData);
            if (gameReport.summary && gameReport.levels.length > 0) {
                // 直接创建并追加游戏报告区块
                this.displayContainer.appendChild(this.createGameReportSection(gameReport));
                // 直接创建并追加深度分析占位符区块
                this.displayContainer.appendChild(this.createDeepAnalysisSection());
                hasAnyData = true;
            }
        }

        // 2. 渲染心理测评相关的报告
        if (bis11Data) {
            this.displayContainer.appendChild(
                this.createQuestionnaireResultSection('bis11-report-section', 'Barratt 冲动性量表 (BIS-11) 结果', bis11Data.interpretation)
            );
            hasAnyData = true;
        }
        if (csiData) {
            this.displayContainer.appendChild(
                this.createQuestionnaireResultSection('csi-report-section', '认知风格问卷 (CSI) 结果', csiData.interpretation)
            );
            hasAnyData = true;
        }

        // 3. 根据是否有数据，决定最终显示哪个主容器
        if (hasAnyData) {
            this.displayContainer.classList.remove('hidden');
        } else {
            this.placeholder.classList.remove('hidden');
            this.displayContainer.classList.add('hidden');
        }
    }

    /**
     * 创建完整的游戏报告区块（包含标题和内容）
     * @param {object} gameReport - analyzeLatestGameSession 返回的完整报告对象
     * @returns {HTMLElement} 一个包含所有游戏报告内容的 div 元素
     */
    createGameReportSection(gameReport) {
        const section = document.createElement('div');
        section.id = 'game-report-section';
        section.className = 'result-section'; // 应用我们统一的卡片样式
        section.innerHTML = this.createGameReportHTML(gameReport);
        return section;
    }

    /**
     * 创建完整的深度分析占位符区块
     * @returns {HTMLElement} 包含占位符内容的 div 元素
     */
    createDeepAnalysisSection() {
        const section = document.createElement('div');
        section.id = 'deep-analysis-section';
        section.className = 'result-section';
        section.innerHTML = `
            <h3>深度分析 — 认知画像</h3>
            <div class="placeholder-content">
                <p><strong>功能待开发...</strong></p>
                <p>此功能需要收集足量的数据，并通过深度学习模型进行训练后才能解锁。您的每一次游戏，都在为这个模型的诞生做出贡献！</p>
                <p>感谢您的耐心与支持！</p>
            </div>
        `;
        return section;
    }

    /**
     * 分析最新一轮游戏的日志
     * @param {Array<object>} allData - 包含所有历史记录的事件日志数组
     * @returns {object} - 包含总体总结和每关详细分析的对象
     */
    analyzeLatestGameSession(allData) {
        if (!allData || allData.length === 0) return { summary: null, levels: [] };

        let lastGameStartIndex = -1;
        for (let i = allData.length - 1; i >= 0; i--) {
            if (allData[i].eventType === 'level_start' && allData[i].eventPayload.levelIndex === 0) {
                lastGameStartIndex = i;
                break;
            }
        }
        if (lastGameStartIndex === -1) return { summary: null, levels: [] };
        
        const latestGameData = allData.slice(lastGameStartIndex);
        
        const levelReports = [];
        const levelEndEvents = latestGameData.filter(e => e.eventType === 'level_end');
        
        for (const event of levelEndEvents) {
            const levelStartEvent = latestGameData.find(e => e.eventType === 'level_start' && e.eventPayload.levelId === event.eventPayload.levelId);
            if (!levelStartEvent) continue;

            const startIndex = latestGameData.indexOf(levelStartEvent);
            const endIndex = latestGameData.indexOf(event);
            const levelSlice = latestGameData.slice(startIndex, endIndex + 1);

            const report = this.analyzeSingleLevel(levelSlice, levelStartEvent, event);
            levelReports.push(report);
        }

        const summary = this.createOverallSummary(levelReports);
        
        return { summary, levels: levelReports };
    }

    /**
     * 对单个关卡的日志切片进行详细分析
     * @param {Array<object>} levelSlice - 单个关卡的事件日志数组
     * @param {object} levelStartEvent - 该关卡的 level_start 事件
     * @param {object} levelEndEvent - 该关卡的 level_end 事件
     * @returns {object} 包含该关卡所有指标的分析结果对象
     */
    analyzeSingleLevel(levelSlice, levelStartEvent, levelEndEvent) {
        const startPayload = levelStartEvent.eventPayload;
        const endPayload = levelEndEvent.eventPayload;
        const finalState = endPayload.finalGameState;
        
        const firstMoveEvent = levelSlice.find(e => e.eventType === 'player_action_result');
        const firstMoveLatency = firstMoveEvent ? (firstMoveEvent.clientTimestamp - levelStartEvent.clientTimestamp) / 1000 : 0;
        
        const pathCoords = levelSlice
            .filter(e => e.eventType === 'player_action_result' && e.eventPayload.result === 'move_success')
            .map(e => `${e.eventPayload.to.x},${e.eventPayload.to.y}`);
        
        const uniqueCoords = new Set(pathCoords);
        const repeatedSteps = pathCoords.length - uniqueCoords.size;
        const repeatRate = finalState.player.steps > 0 ? ((repeatedSteps / finalState.player.steps) * 100) : 0;
        
        const optimalSteps = startPayload.maze.optimalPathLength > 0 ? startPayload.maze.optimalPathLength -1 : 0;
        const pathEfficiency = optimalSteps > 0 && finalState.player.steps > 0 
            ? (optimalSteps / finalState.player.steps) * 100 
            : 0;
        
        const collisions = levelSlice.filter(e => e.eventType === 'player_action_result' && e.eventPayload.result.startsWith('fail_')).length;

        const specialMetrics = {};
        if (startPayload.levelId === '关卡 3' || startPayload.levelId === '关卡 5') {
            specialMetrics['遭遇守卫'] = levelSlice.filter(e => e.eventType === 'player_state_change' && e.eventPayload.cause === 'patrol_collision').length;
        }
        
        return {
            levelId: startPayload.levelId,
            status: endPayload.status === 'win' ? '通过' : '失败',
            time: (endPayload.totalDurationMs / 1000).toFixed(2),
            steps: finalState.player.steps,
            collisions: collisions,
            pathEfficiency: pathEfficiency.toFixed(1) + '%',
            firstMoveLatency: firstMoveLatency.toFixed(2),
            repeatExplorationRate: repeatRate.toFixed(1) + '%',
            special: specialMetrics
        };
    }

    /**
     * 根据所有关卡的分析结果，生成总体总结和玩家风格
     * @param {Array<object>} levelReports - 所有关卡的分析结果数组
     * @returns {object|null} 包含总体指标和玩家风格的对象
     */
    createOverallSummary(levelReports) {
        if (levelReports.length === 0) return null;

        let totalTime = 0, totalCollisions = 0, totalEfficiency = 0, totalLatency = 0, guardEncounters = 0;
        let validLevelsForEfficiency = 0;
        levelReports.forEach(r => {
            totalTime += parseFloat(r.time);
            totalCollisions += r.collisions;
            const efficiency = parseFloat(r.pathEfficiency);
            if(efficiency > 0) {
                totalEfficiency += efficiency;
                validLevelsForEfficiency++;
            }
            totalLatency += parseFloat(r.firstMoveLatency);
            if(r.special['遭遇守卫']) guardEncounters += r.special['遭遇守卫'];
        });
        
        const avgEfficiency = validLevelsForEfficiency > 0 ? totalEfficiency / validLevelsForEfficiency : 0;
        const avgLatency = totalLatency / levelReports.length;
        const avgCollisionsPerLevel = totalCollisions / levelReports.length;

        let style = '混合型';
        if (avgEfficiency > 75 && avgCollisionsPerLevel < 20) {
            style = '规划大师';
        } else if (avgLatency < 0.7 && (totalTime / levelReports.length) < 25) {
            style = '闪电先锋';
        } else if (guardEncounters > 2 || avgCollisionsPerLevel > 60) {
            style = '冲动梦想家';
        } else if (avgEfficiency < 50 && levelReports.some(r => parseFloat(r.repeatExplorationRate) > 10)) {
            style = '谨慎探险家';
        }

        return {
            playerStyle: style,
            avgEfficiency: avgEfficiency.toFixed(1) + '%',
            totalTime: totalTime.toFixed(2) + ' 秒',
            totalCollisions: totalCollisions
        };
    }

    /**
     * 根据分析结果创建完整的游戏报告HTML（总结+表格）
     * @param {object} gameReport - 包含总结和每关详情的对象
     * @returns {string} 完整的游戏报告HTML字符串
     */
    createGameReportHTML(gameReport) {
        const { summary, levels } = gameReport;

        const summaryHtml = `
            <h3>动态迷宫游戏 - 即时报告</h3>
            <div class="player-style-summary">
                <p>玩家风格初探:</p>
                <div class="player-style-tag">${summary.playerStyle}</div>
                <p class="interpretation-text">根据您的整体表现，系统初步判断您在本次游戏中展现了“${summary.playerStyle}”的特点。这主要体现在平均路径效率（${summary.avgEfficiency}）、总碰撞次数（${summary.totalCollisions}次）等综合指标上。详细数据请见下表。</p>
            </div>
        `;
        
        const specialHeaders = new Set();
        levels.forEach(row => Object.keys(row.special).forEach(key => specialHeaders.add(key)));
        const specialHeadersArray = Array.from(specialHeaders);
        
        let tableHtml = `
            <div id="game-summary-table">
            <table>
                <thead>
                    <tr>
                        <th>关卡</th>
                        <th>通关状态</th>
                        <th>用时(秒)</th>
                        <th>步数</th>
                        <th>碰撞次数</th>
                        <th>路径效率</th>
                        <th>首次移动延迟(秒)</th>
                        <th>重复探索率</th>
        `;
        specialHeadersArray.forEach(h => tableHtml += `<th>${h}</th>`);
        tableHtml += `</tr></thead><tbody>`;

        levels.forEach(row => {
            const statusClass = row.status === '通过' ? 'status-win' : 'status-fail';
            tableHtml += `
                <tr>
                    <td>${row.levelId}</td>
                    <td class="${statusClass}">${row.status}</td>
                    <td>${row.time}</td>
                    <td>${row.steps}</td>
                    <td>${row.collisions}</td>
                    <td>${row.pathEfficiency}</td>
                    <td>${row.firstMoveLatency}</td>
                    <td>${row.repeatExplorationRate}</td>
            `;
            specialHeadersArray.forEach(header => {
                tableHtml += `<td>${row.special[header] !== undefined ? row.special[header] : 'N/A'}</td>`;
            });
            tableHtml += `</tr>`;
        });

        tableHtml += `</tbody></table></div>`;

        return summaryHtml + tableHtml;
    }

    /**
     * 创建单个问卷结果的 HTML 区块
     * @param {string} id - 该区块的HTML id
     * @param {string} title - 区块的标题
     * @param {string} interpretationHtml - 包含解释的 HTML 字符串
     * @returns {HTMLElement} 包含解释文本的 div 元素
     */
    createQuestionnaireResultSection(id, title, interpretationHtml) {
        const section = document.createElement('div');
        section.id = id;
        section.className = 'result-section';
        section.innerHTML = `
            <h3>${title}</h3>
            <div class="questionnaire-summary">
                ${interpretationHtml}
            </div>
        `;
        return section;
    }
}