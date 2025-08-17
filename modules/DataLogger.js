// modules/DataLogger.js (v10.3 - 最终修复版)

export class DataLogger {
    constructor() {
        this.participantId = this.getOrCreateId('ca-participantId');
        this.sessionId = this.getSessionId();
        this.protocolVersion = '1.0';
        
        // 你的后端 API 地址
        this.backendUrl = 'https://jnbcdnmqapamyftmmegz.supabase.co/functions/v1/log';
        
        // 你的 Supabase 公共 anon key
        this.apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpuYmNkbm1xYXBhbXlmdG1tZWd6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUzNjcwMjgsImV4cCI6MjA3MDk0MzAyOH0.8spmGTONjD9-Iqhzq8RoDccaml2OLTaE4kAbNAekhQA';

        this.lastSentEventIndex = this.loadLastSentEventIndex();
        this.batchSendInterval = setInterval(() => this.sendIncrementalData(), 15000);

        window.addEventListener('pagehide', () => {
            this.sendIncrementalData(true);
        }, { capture: true });
    }

    logEvent(eventType, eventPayload) {
        if (!eventType) return;
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
        console.log(`[Event Persisted] ID: #${eventSequenceId} - ${event.eventType}`);
    }

    sendIncrementalData(isFinal = false) {
        const allLogs = this.loadLogsForSession();
        const unsentLogs = allLogs.slice(this.lastSentEventIndex);

        if (unsentLogs.length === 0) {
            if (isFinal) this.clearAllDataForSession();
            return;
        }

        console.log(`Preparing to send ${unsentLogs.length} new events...`);

        // --- 【【【 核心修复 】】】 ---
        // 确保所有键名都使用标准的驼峰命名法 (camelCase)，与后端解析逻辑匹配
        const payload = {
            sessionId: this.sessionId,
            participantId: this.participantId,
            isFinalChunk: isFinal,
            events: unsentLogs
        };
        // --- 【【【 修复结束 】】】
        
        const dataString = JSON.stringify(payload);
        
        const headers = {
            'Content-Type': 'application/json',
            'apikey': this.apiKey,
            'Authorization': `Bearer ${this.apiKey}`
        };

        const onSuccess = () => {
            this.lastSentEventIndex = allLogs.length;
            this.saveLastSentIndex(this.lastSentEventIndex);
            console.log(`%cSuccessfully sent events up to index ${this.lastSentEventIndex - 1}.`, 'color: green;');
            if (isFinal) this.clearAllDataForSession();
        };
        
        fetch(this.backendUrl, {
            method: 'POST',
            headers: headers,
            body: dataString,
            keepalive: isFinal,
        })
        .then(res => {
            if(res.ok) {
                onSuccess();
            } else {
                console.error(`Server responded with an error: ${res.status} ${res.statusText}. Data will be resent later.`);
            }
        })
        .catch(err => console.error("Fetch error. Data will be resent later.", err));
    }
    
    loadLastSentEventIndex() { 
        return parseInt(sessionStorage.getItem('ca-lastSentIndex') || '0', 10);
    }
    saveLastSentIndex(index) {
        sessionStorage.setItem('ca-lastSentIndex', String(index));
    }

    clearAllDataForSession() {
        console.log(`Clearing all data for session: ${this.sessionId}`);
        localStorage.removeItem('ca-gameLogs-' + this.sessionId);
        sessionStorage.removeItem('ca-lastSentIndex');
        localStorage.removeItem('bis11_results');
        localStorage.removeItem('csi_results');
        localStorage.removeItem('cfi_results');
        localStorage.removeItem('mai_results');
        localStorage.removeItem('demographics_results');
        localStorage.removeItem('rpm_results');
    }
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