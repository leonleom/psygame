// modules/DataLogger.js - 数据采集模块 (最终汇总打包+健壮发送版) v7.0

export class DataLogger {
    constructor() {
        this.participantId = this.getOrCreateId('ca-participantId');
        this.sessionId = this.getSessionId();
        this.protocolVersion = '1.0';
        
        // 确保这里是你的 Vercel 地址
        this.backendUrl = 'https://psygame.vercel.app/api/log';

        // 仅保留在页面关闭时作为最后保障的发送机制
        // 使用 'pagehide' 事件，它在某些移动端浏览器上比 'visibilitychange' 更可靠
        window.addEventListener('pagehide', () => {
            this.sendFinalReport();
        }, { capture: true });
    }

    /**
     * 记录一个事件，只负责写入 localStorage。
     * @param {string} eventType - 事件类型
     * @param {object} eventPayload - 事件负载
     */
    logEvent(eventType, eventPayload) {
        if (!eventType) {
            console.error("DataLogger Error: eventType cannot be null or empty.");
            return;
        }

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
        
        this.saveLogsForSession(this.sessionId, logBuffer);
        console.log(`[Event Persisted] Session: ${this.sessionId}, ID: #${event.eventSequenceId} - ${event.eventType}`);
    }

    /**
     * 构建最终的汇总报告
     * @returns {object} 一个包含所有游戏和问卷数据的对象
     */
    buildFinalReport() {
        const allEvents = this.loadLogsForSession(this.sessionId);
        
        const gameProcessData = allEvents.filter(e => !e.eventType.startsWith('test_'));

        const questionnaireResults = {};
        const testEndEvents = allEvents.filter(e => e.eventType === 'test_end');
        testEndEvents.forEach(e => {
            const testId = e.eventPayload.testId;
            if (testId) {
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
     * 发送最终的汇总报告
     */
    sendFinalReport() {
        const report = this.buildFinalReport();

        // 严格检查是否有有意义的数据
        const meaningfulGameplayEvents = report.data.gameplay.filter(
            e => e.eventType !== 'experiment_session_start' && e.eventType !== 'experiment_session_end'
        );

        if (meaningfulGameplayEvents.length === 0 && Object.keys(report.data.questionnaires).length === 0) {
            console.log("No meaningful data to send. Aborting final report.");
            this.clearAllDataForSession(); // 清理无用的会话数据
            return;
        }

        const dataToSend = JSON.stringify(report, null, 2);
        
        console.log("--- Sending Final Report ---", report);
        
        // navigator.sendBeacon 是一个非阻塞请求，非常适合在页面卸载时使用
        if (navigator.sendBeacon && dataToSend.length < 65536) { // sendBeacon 对数据大小有限制
            try {
                const success = navigator.sendBeacon(this.backendUrl, dataToSend);
                if (success) {
                    console.log("Final report successfully queued for sending via sendBeacon.");
                    this.clearAllDataForSession();
                } else {
                    console.error("sendBeacon queueing failed. The data might be too large or other issues.");
                }
            } catch(e) {
                 console.error("Error calling sendBeacon:", e);
            }
        } else {
            // 作为备用方案，或当数据过大时使用 fetch
            fetch(this.backendUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: dataToSend,
                keepalive: true, // 关键！尝试让请求在页面卸载后继续进行
            })
            .then(response => {
                if (response.ok) {
                    console.log("Final report successfully sent via fetch.");
                    this.clearAllDataForSession();
                } else {
                    console.error(`Server responded with status ${response.status}. Data might not have been saved.`);
                }
            })
            .catch(error => {
                console.error('Network error while sending final report via fetch:', error);
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
        // sessionStorage 会在标签页关闭时自动清除，无需手动处理
    }

    // --- 辅助函数 ---
    getOrCreateId(key) {
        let id = localStorage.getItem(key);
        if (!id) {
            id = this.generateUniqueId();
            try {
                localStorage.setItem(key, id);
            } catch (e) {
                console.error("Could not write to localStorage.", e);
            }
        }
        return id;
    }

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
        } catch (e) { 
            console.error("Failed to load logs from localStorage.", e);
            return []; 
        }
    }

    saveLogsForSession(sessionId, logs) {
        try {
            localStorage.setItem('ca-gameLogs-' + sessionId, JSON.stringify(logs));
        } catch(e) { 
            console.error("Failed to save logs to localStorage.", e);
        }
    }

    generateUniqueId() {
        const timestamp = Date.now().toString(36);
        const randomPart = Math.random().toString(36).substring(2, 15);
        return `${timestamp}-${randomPart}`;
    }
    
    getRawBufferDataForFrontend() {
        return this.loadLogsForSession(this.sessionId);
    }
}
