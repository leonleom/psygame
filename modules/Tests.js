// modules/Tests.js - 心理测评模块 (问卷引擎版) v3.1 (体验优化版)

export class Tests {
    constructor(containerId, dataLogger) {
        this.dataLogger = dataLogger;
        this.container = document.getElementById(containerId);
        
        this.selectionScreen = document.getElementById('test-selection-screen');
        this.interfaceScreen = document.getElementById('questionnaire-interface');
        this.endScreen = document.getElementById('questionnaire-end-screen');
        this.titleEl = document.getElementById('questionnaire-title');
        this.progressCurrentEl = document.getElementById('q-current-number');
        this.progressTotalEl = document.getElementById('q-total-number');
        this.statementEl = document.getElementById('question-statement');
        this.optionsEl = document.getElementById('questionnaire-options');
        this.prevBtn = document.getElementById('q-prev-btn');
        this.nextBtn = document.getElementById('q-next-btn');
        this.viewResultsBtn = document.getElementById('q-view-results-btn');

        this.currentTest = null;
        this.currentQuestionIndex = 0;
        this.answers = [];

        this.prevBtn.addEventListener('click', () => this.navigateQuestion(-1));
        this.nextBtn.addEventListener('click', () => this.navigateQuestion(1));
    }

    init(questionnaires) {
        this.questionnaires = questionnaires;
        this.container.querySelectorAll('.test-card').forEach(card => {
            card.addEventListener('click', (e) => this.selectTest(e.currentTarget.dataset.testId));
        });
    }
    
    reset() {
        this.selectionScreen.classList.remove('hidden');
        this.interfaceScreen.classList.add('hidden');
        this.endScreen.classList.add('hidden');
    }

    selectTest(testId) {
        // ... (这部分代码和之前一样) ...
        this.currentTest = this.questionnaires[testId];
        if (!this.currentTest) {
            console.error(`Test with id "${testId}" not found.`);
            return;
        }
        this.currentQuestionIndex = 0;
        this.answers = new Array(this.currentTest.items.length).fill(null);
        
        this.titleEl.textContent = this.currentTest.title;
        this.progressTotalEl.textContent = this.currentTest.items.length;
        
        this.dataLogger.logEvent('test_start', { testId: this.currentTest.id });
        
        this.selectionScreen.classList.add('hidden');
        this.interfaceScreen.classList.remove('hidden');
        this.loadQuestion();
    }

    loadQuestion() {
        this.progressCurrentEl.textContent = this.currentQuestionIndex + 1;
        const item = this.currentTest.items[this.currentQuestionIndex];
        this.statementEl.textContent = typeof item === 'string' ? item : item.text;

        this.optionsEl.innerHTML = '';
        this.currentTest.options.forEach(opt => {
            const btn = document.createElement('button');
            btn.className = 'q-option-btn';
            btn.textContent = opt.text;
            btn.dataset.value = opt.value;
            if (this.answers[this.currentQuestionIndex] === opt.value) {
                btn.classList.add('selected');
            }
            btn.addEventListener('click', () => this.selectOption(opt.value));
            this.optionsEl.appendChild(btn);
        });

        this.updateNavButtons();
    }
    
    selectOption(value) {
        this.answers[this.currentQuestionIndex] = value;
        
        // 【【【核心修改】】】
        // 检查是否是最后一题
        const isLastQuestion = this.currentQuestionIndex === this.currentTest.items.length - 1;

        if (isLastQuestion) {
            // 如果是最后一题，只重新加载题目以更新选项高亮，不自动跳转
            this.loadQuestion();
        } else {
            // 如果不是最后一题，自动跳转到下一题
            this.navigateQuestion(1);
        }
    }
    
    navigateQuestion(direction) {
        // "下一题/完成" 按钮的点击逻辑
        if (direction === 1) {
            // 如果是最后一题，点击"完成"按钮会触发 finishTest
            if (this.currentQuestionIndex >= this.currentTest.items.length - 1) {
                this.finishTest();
                return;
            }
        }
        
        // "上一题"按钮的点击逻辑，或非最后一题的"下一题"点击逻辑
        this.currentQuestionIndex += direction;
        this.loadQuestion();
    }
    
    updateNavButtons() {
        this.prevBtn.disabled = this.currentQuestionIndex === 0;
        this.nextBtn.textContent = (this.currentQuestionIndex === this.currentTest.items.length - 1) ? '完成' : '下一题';
        
        // 【【【核心修改】】】
        // 如果是最后一题，只有在选择了答案后才能点击“完成”按钮
        if (this.currentQuestionIndex === this.currentTest.items.length - 1) {
            this.nextBtn.disabled = this.answers[this.currentQuestionIndex] === null;
        } else {
            this.nextBtn.disabled = false; // 其他题目，“下一题”按钮总是可用的
        }
    }

    finishTest() {
        // 再次检查最后一题是否已回答（虽然按钮状态已处理，但作为双重保险）
        if (this.answers[this.currentTest.items.length - 1] === null) {
            alert('请完成当前题目后提交！');
            return;
        }

        // ... (计分、记录、保存结果的代码和之前一样) ...
        const results = this.currentTest.calculateScore(this.answers);
        this.dataLogger.logEvent('test_end', {
            testId: this.currentTest.id,
            answers: this.answers,
            results: results
        });
        
        localStorage.setItem(this.currentTest.id + '_results', JSON.stringify({
            results,
            interpretation: this.currentTest.interpretScore(results)
        }));
        
        this.interfaceScreen.classList.add('hidden');
        this.endScreen.classList.remove('hidden');

        this.viewResultsBtn.onclick = () => {
            if(window.navigateTo) window.navigateTo('view-results');
        };
    }
}