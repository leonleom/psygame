/**
 * Results.js - 结果分析与展示模块
 * 最终稳定版 v16.0:
 * 1. 移除了对 localStorage 的依赖，render 方法现在直接接收数据进行分析。
 * 2. 增加了更健壮的检查，确保在有有效的游戏数据时才渲染图表。
 */
class Results {
    constructor() {
        this.placeholder = document.getElementById('results-placeholder');
        this.display = document.getElementById('results-display');
        this.chart = null; // 用于存储 Chart.js 实例，方便销毁和重建
    }

    /**
     * 渲染结果页面。
     * @param {Array<object>} data - 从 DataLogger 获取的完整事件日志数组。
     */
    render(data) {
        // 检查数据是否有效 (至少要有一个关卡结束的事件)
        const hasGameData = data && data.some(e => e.eventType === 'level_end');

        if (!hasGameData) {
            this.placeholder.classList.remove('hidden');
            this.display.classList.add('hidden');
        } else {
            this.placeholder.classList.add('hidden');
            this.display.classList.remove('hidden');
            
            // 进行分析并绘制图表
            const analysisResult = this.analyze(data);
            this.drawRadarChart(analysisResult);
        }
    }

    /**
     * (示例) 分析数据并生成指标。
     * 这是一个非常简单的分析逻辑，真实项目中会复杂得多。
     * @param {Array<object>} data - 事件日志数组。
     * @returns {object} - 包含分析结果的对象。
     */
    analyze(data) {
        const moveEvents = data.filter(e => e.eventType === 'player_move').length;
        const collisionEvents = data.filter(e => e.eventType === 'player_collision').length;
        
        // 计算一个简单的“路径效率”指标，碰撞次数越多效率越低
        const efficiency = moveEvents > 0 ? moveEvents / (moveEvents + collisionEvents * 5) : 0;

        // 返回一个可用于绘图的数据结构
        return {
            radarData: [
                efficiency * 100, // 路径效率
                65, // 决策速度 (占位)
                80, // 适应能力 (占位)
                70, // 探索性 (占位)
                85, // 工作记忆 (占位)
                75  // 冲动控制 (占位)
            ]
        };
    }

    /**
     * 使用 Chart.js 绘制雷达图。
     * @param {object} result - analyze 方法返回的结果对象。
     */
    drawRadarChart(result) {
        const ctx = document.getElementById('radarChart').getContext('2d');
        
        // 如果图表已存在，先销毁旧的实例，防止重叠绘制
        if (this.chart) {
            this.chart.destroy();
        }

        this.chart = new Chart(ctx, {
            type: 'radar',
            data: {
                labels: ['路径效率', '决策速度', '适应能力', '探索性', '工作记忆', '冲动控制'],
                datasets: [{
                    label: '您的能力画像',
                    data: result.radarData,
                    backgroundColor: 'rgba(54, 162, 235, 0.2)',
                    borderColor: 'rgb(54, 162, 235)',
                    pointBackgroundColor: 'rgb(54, 162, 235)',
                    pointBorderColor: '#fff',
                    pointHoverBackgroundColor: '#fff',
                    pointHoverBorderColor: 'rgb(54, 162, 235)'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                scales: {
                    r: {
                        angleLines: {
                            display: false
                        },
                        suggestedMin: 0,
                        suggestedMax: 100,
                        ticks: {
                            backdropColor: 'transparent' // 使刻度背景透明
                        }
                    }
                },
                plugins: {
                    legend: {
                        position: 'top',
                    }
                }
            }
        });
    }
}