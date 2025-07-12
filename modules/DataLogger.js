// modules/DataLogger.js - 数据采集模块 (最终汇总打包版) v6.0

export class DataLogger {
    constructor() {
        this.participantId = this.getOrCreateId('ca-participantId');
        this.sessionId = this.getSessionId();
        this.protocolVersion = '1.0';
        
        // 后端地址保持不变
        this.backendUrl = 'https://psygame.vercel.app/api/log';

        // 【核心修改】移除所有自动发送逻辑
        // clearInterval(this.batchSendInterval);
        
        // 仅保留在页面关闭时作为最后保障的发送机制
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') {
                this.sendFinalReport();
            }
        });
    }

    /**
     * 记录一个事件。现在只负责写入 localStorage。
     */
    logEvent(eventType, eventPayload) {
        // 从 localStorage 加载当前日志
        let logBuffer = this.loadLogsForSession(this.sessionId);
        const eventSequenceId = logBuffer.length;

        const event = {
            participantId: this.participantId,
            sessionId: this.sessionId,
            protocolVersion: this.protocolVersion,
            eventSequenceId: eventSequenceId,
            clientTimestamp: Date.now(),
            eventType: eventType,
            eventPayload: eventPayload || {},
        };

        logBuffer.push(event);
        
        // 将更新后的日志存回 localStorage
        this.saveLogsForSession(this.sessionId, logBuffer);
        console.log(`[Event Persisted] Session: ${this.sessionId}, ID: #${event.eventSequenceId} - ${event.eventType}`);
    }

    /**
     * 【核心新功能】构建最终的汇总报告
     * @returns {object} 一个包含所有游戏和问卷数据的巨大对象
     */
    buildFinalReport() {
        const allEvents = this.loadLogsForSession(this.sessionId);
        
        // 提取所有游戏过程数据
        const gameProcessData = allEvents.filter(e => !e.eventType.startsWith('test_'));

        // 提取所有问卷结果
        const questionnaireResults = {};
        const testEndEvents = allEvents.filter(e => e.eventType === 'test_end');
        testEndEvents.forEach(e => {
            const testId = e.eventPayload.testId;
            if (testId) {
                // 将每个问卷的答案和计算结果都打包进去
                questionnaireResults[testId] = {
                    answers: e.eventPayload.answers,
                    results: e.eventPayload.results
                };
            }
        });
        
        const finalReport = {
            participantId: this.participantId,
            sessionId: this.sessionId,
            reportTimestamp: Date.now(),
            data: {
                gameplay: gameProcessData,
                questionnaires: questionnaireResults
            }
        };

        return finalReport;
    }

    /**
     * 【核心新功能】发送最终的汇总报告
     */
    sendFinalReport() {
        const report = this.buildFinalReport();

        // 如果没有任何有效数据，则不发送
        if (report.data.gameplay.length === 0 && Object.keys(report.data.questionnaires).length === 0) {
            console.log("No data to send. Aborting final report.");
            return;
        }

        const dataToSend = JSON.stringify(report, null, 2); // 格式化发送，方便后端查看
        
        console.log("--- Sending Final Report ---", report);
        
        // 优先使用 sendBeacon
        if (navigator.sendBeacon) {
            const success = navigator.sendBeacon(this.backendUrl, dataToSend);
            if (success) {
                console.log("Final report successfully queued for sending via sendBeacon.");
                this.clearAllDataForSession(); // 发送成功后清空数据
            } else {
                console.error("sendBeacon queueing failed.");
            }
        } else {
            fetch(this.backendUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: dataToSend,
                keepalive: true,
            })
            .then(response => {
                if (response.ok) {
                    console.log("Final report successfully sent via fetch.");
                    this.clearAllDataForSession(); // 发送成功后清空数据
                } else {
                    console.error(`Server responded with status ${response.status}.`);
                }
            })
            .catch(error => {
                console.error('Network error while sending final report:', error);
            });
        }
    }

    /**
     * 清理当前会话的所有本地存储数据
     */
    clearAllDataForSession() {
        console.log(`Clearing all stored data for session: ${this.sessionId}`);
        localStorage.removeItem('ca-gameLogs-' + this.sessionId);
        localStorage.removeItem('bis11_results');
        localStorage.removeItem('csi_results');
        // sessionStorage 会在标签页关闭时自动清除
    }

    // --- 辅助函数 ---
    getOrCreateId(key) { /* ... 保持不变 ... */ }
    getSessionId() {
        let sid = sessionStorage.getItem('ca-sessionId');
        if (!sid) {
            sid = this.generateUniqueId();
            sessionStorage.setItem('ca-sessionId', sid);
        }
        return sid;
    }
    loadLogsForSession(sessionId) {
        try {
            const storedLogs = localStorage.getItem('ca-gameLogs-' + sessionId);
            return storedLogs ? JSON.parse(storedLogs) : [];
        } catch (e) { return []; }
    }
    saveLogsForSession(sessionId, logs) {
        try {
            localStorage.setItem('ca-gameLogs-' + sessionId, JSON.stringify(logs));
        } catch(e) { console.error("Failed to save logs to localStorage.", e); }
    }
    generateUniqueId() { /* ... 保持不变 ... */ }
    
    // 【修改】这个方法现在只用于前端结果页展示，不再用于发送
    getRawBufferDataForFrontend() {
        return this.loadLogsForSession(this.sessionId);
    }
}