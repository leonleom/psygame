// modules/DataLogger.js - 数据采集模块 (最终完整版 - 职责分离) v9.0

export class DataLogger {
    constructor() {
        this.participantId = this.getOrCreateId('ca-participantId');
        this.sessionId = this.getSessionId();
        this.protocolVersion = '1.0';
        
        // 确保这里是你的 Vercel 地址
        this.backendUrl = 'https://psygame.vercel.app/api/log';

        // 在页面关闭时作为最后保障的发送机制
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

        let logBuffer = this.loadLogsForSession();
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
        
        this.saveLogsForSession(logBuffer);
        console.log(`[Event Persisted] Session: ${this.sessionId}, ID: #${eventSequenceId} - ${event.eventType}`);
    }

    /**
     * 构建最终的汇总报告
     * @returns {object} 一个包含所有游戏和问卷数据的对象
     */
    buildFinalReport() {
        const allEvents = this.loadLogsForSession();
        
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
        
        return {
            participantId: this.participantId,
            sessionId: this.sessionId,
            reportTimestamp: Date.now(),
            data: {
                gameplay: gameProcessData,
                questionnaires: questionnaireResults
            }
        };
    }

    /**
     * 发送最终的汇总报告
     */
    sendFinalReport() {
        if (!this.sessionId || this.sessionId === 'undefined') {
            console.error("Aborting sendFinalReport due to invalid sessionId.");
            return;
        }

        const report = this.buildFinalReport();

        const meaningfulGameplayEvents = report.data.gameplay.filter(
            e => e.eventType !== 'experiment_session_start' && e.eventType !== 'experiment_session_end'
        );

        if (meaningfulGameplayEvents.length === 0 && Object.keys(report.data.questionnaires).length === 0) {
            console.log("No meaningful data to send. Aborting final report.");
            this.clearAllDataForSession();
            return;
        }

        const dataString = JSON.stringify(report);
        const dataBlob = new Blob([dataString], { type: 'application/json' });
        
        console.log("--- Sending Final Report ---", report);
        
        if (navigator.sendBeacon && dataBlob.size < 65536) {
            try {
                if (navigator.sendBeacon(this.backendUrl, dataBlob)) {
                    console.log("Final report successfully queued via sendBeacon.");
                    this.clearAllDataForSession();
                } else {
                    console.error("sendBeacon returned false. Attempting fetch fallback.");
                    this.sendWithFetch(dataString);
                }
            } catch(e) {
                 console.error("Error calling sendBeacon:", e);
                 this.sendWithFetch(dataString);
            }
        } else {
            this.sendWithFetch(dataString);
        }
    }
    
    /**
     * 使用 fetch API 发送数据的备用方法
     * @param {string} dataString - 已转换为字符串的 JSON 数据
     */
    sendWithFetch(dataString) {
        fetch(this.backendUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: dataString,
            keepalive: true,
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

    /**
     * 【【【核心方法】】】
     * 清除当前会话中所有的游戏日志 (非 test_ 开头的事件)，由 main.js 在导航到游戏时调用。
     */
    clearGameLogs() {
        console.log(`Clearing game logs for session: ${this.sessionId}`);
        
        let logBuffer = this.loadLogsForSession();
        let newLogBuffer = logBuffer.filter(e => e.eventType.startsWith('test_'));
        this.saveLogsForSession(newLogBuffer);
    }

    /**
     * 清理当前会话的所有本地存储数据 (主要在发送成功后调用)
     */
    clearAllDataForSession() {
        console.log(`Clearing all stored data for session: ${this.sessionId}`);
        localStorage.removeItem('ca-gameLogs-' + this.sessionId);
        localStorage.removeItem('bis11_results');
        localStorage.removeItem('csi_results');
    }

    // --- 辅助函数 ---
    getOrCreateId(key) {
        let id = localStorage.getItem(key);
        if (!id) {
            id = this.generateUniqueId();
            localStorage.setItem(key, id);
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

    loadLogsForSession() {
        if (!this.sessionId) return [];
        try {
            const storedLogs = localStorage.getItem('ca-gameLogs-' + this.sessionId);
            return storedLogs ? JSON.parse(storedLogs) : [];
        } catch (e) { 
            console.error("Failed to load logs from localStorage.", e);
            return []; 
        }
    }

    saveLogsForSession(logs) {
        if (!this.sessionId) return;
        localStorage.setItem('ca-gameLogs-' + this.sessionId, JSON.stringify(logs));
    }

    generateUniqueId() {
        const timestamp = Date.now().toString(36);
        const randomPart = Math.random().toString(36).substring(2, 15);
        return `${timestamp}-${randomPart}`;
    }
    
    getRawBufferDataForFrontend() {
        return this.loadLogsForSession();
    }
}
