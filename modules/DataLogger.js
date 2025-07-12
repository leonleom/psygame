// modules/DataLogger.js - 数据采集模块 (最终健壮版) v8.0

export class DataLogger {
    constructor() {
        this.participantId = this.getOrCreateId('ca-participantId');
        this.sessionId = this.getSessionId(); // 确保 sessionId 在构造时就被正确设置
        this.protocolVersion = '1.0';
        
        this.backendUrl = 'https://psygame.vercel.app/api/log';

        // 在页面关闭时作为最后保障的发送机制
        window.addEventListener('pagehide', () => {
            this.sendFinalReport();
        }, { capture: true });
    }

    logEvent(eventType, eventPayload) {
        if (!eventType) return;

        // 【核心修正】直接从 localStorage 加载并更新，确保数据一致性
        const logBuffer = this.loadLogsForSession();
        const eventSequenceId = logBuffer.length;

        const event = {
            participantId: this.participantId,
            sessionId: this.sessionId, // 直接使用 this.sessionId
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
        
        // 【核心修正】确保报告中的 sessionId 也是 this.sessionId
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

    sendFinalReport() {
        // 在发送前检查 sessionId 是否有效
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

        // 【核心修正】为 sendBeacon 准备一个 Blob 对象，这是最可靠的方式
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
                    this.sendWithFetch(dataString); // sendBeacon 失败时尝试 fetch
                }
            } catch(e) {
                 console.error("Error calling sendBeacon:", e);
                 this.sendWithFetch(dataString); // 异常时尝试 fetch
            }
        } else {
            this.sendWithFetch(dataString);
        }
    }
    
    // 【新】将 fetch 逻辑提取为一个独立的函数
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
                console.error(`Server responded with status ${response.status}.`);
            }
        })
        .catch(error => {
            console.error('Network error while sending final report via fetch:', error);
        });
    }

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
        // 【核心修正】所有加载都基于 this.sessionId
        if (!this.sessionId) return [];
        try {
            const storedLogs = localStorage.getItem('ca-gameLogs-' + this.sessionId);
            return storedLogs ? JSON.parse(storedLogs) : [];
        } catch (e) { return []; }
    }

    saveLogsForSession(logs) {
        // 【核心修正】所有保存都基于 this.sessionId
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
