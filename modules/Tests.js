// modules/Tests.js (v3.7 - 完整最终修复版)
// - 使用 setTimeout 解决了顽固的滚动位置丢失问题。
// - 整合了对多种题型（按钮、单选、下拉、输入、图片选择）的支持。
// - 整合了对指导语页面的支持。
// - 修复了问卷兼容性和提交流程的所有已知bug。

export class Tests {
    constructor(containerId, dataLogger) {
        this.dataLogger = dataLogger;
        this.container = document.getElementById(containerId);
        
        // 获取滚动的父容器
        this.scrollContainer = document.getElementById('view-tests');

        this.selectionScreen = document.getElementById('test-selection-screen');
        this.interfaceScreen = document.getElementById('questionnaire-interface');
        this.endScreen = document.getElementById('questionnaire-end-screen');
        
        this.instructionScreen = document.createElement('div');
        this.instructionScreen.id = 'instruction-screen';
        this.instructionScreen.className = 'hidden';
        this.container.appendChild(this.instructionScreen);

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
        this.instructionScreen.classList.add('hidden');
    }

    selectTest(testId) {
        this.currentTest = this.questionnaires[testId];
        if (!this.currentTest) {
            console.error(`Test with id "${testId}" not found.`);
            return;
        }

        this.currentQuestionIndex = 0;
        this.answers = new Array(this.currentTest.items.length).fill(null).map((_, index) => {
            const item = this.currentTest.items[index];
            if (item.type === 'select' || item.type === 'number_input') return '';
            return null;
        });
        
        this.selectionScreen.classList.add('hidden');

        if (this.currentTest.instructions) {
            this.showInstructions();
        } else {
            this.startQuestionnaire();
        }
    }

    showInstructions() {
        this.instructionScreen.innerHTML = `
            <div class="intro-text-container">
                ${this.currentTest.instructions}
                <button id="start-test-btn" class="card-button">开始测验</button>
            </div>
        `;
        this.instructionScreen.classList.remove('hidden');

        document.getElementById('start-test-btn').addEventListener('click', () => {
            this.instructionScreen.classList.add('hidden');
            this.startQuestionnaire();
        });
    }

    startQuestionnaire() {
        this.titleEl.textContent = this.currentTest.title;
        this.progressTotalEl.textContent = this.currentTest.items.length;
        this.dataLogger.logEvent('test_start', { testId: this.currentTest.id });
        this.interfaceScreen.classList.remove('hidden');
        this.loadQuestion();
    }

    loadQuestion() {
        // 1. 记录特定容器的 scrollTop
        const scrollTop = this.scrollContainer.scrollTop;

        this.progressCurrentEl.textContent = this.currentQuestionIndex + 1;
        const item = this.currentTest.items[this.currentQuestionIndex];
        
        this.optionsEl.innerHTML = '';
        const itemType = item.type || (this.currentTest.options ? 'button' : 'none');
        
        if (itemType === 'image_button_selection') {
            this.statementEl.innerHTML = `<img src="${item.image}" alt="题目 ${item.id}" class="rpm-main-image">`;
            const optionsContainer = document.createElement('div');
            optionsContainer.className = 'rpm-numeric-options';
            for (let i = 1; i <= item.optionCount; i++) {
                const btn = document.createElement('button');
                btn.className = 'q-option-btn';
                btn.textContent = i;
                if (this.answers[this.currentQuestionIndex] === i) {
                    btn.classList.add('selected');
                }
                btn.addEventListener('click', () => this.selectOption(i));
                optionsContainer.appendChild(btn);
            }
            this.optionsEl.appendChild(optionsContainer);
        } else {
            this.statementEl.innerHTML = item.text;
            const options = item.options || this.currentTest.options;
            const currentAnswer = this.answers[this.currentQuestionIndex];
            const createSelectHandler = (value, autoNext = true) => () => this.selectOption(value, autoNext);

            if (itemType === 'button') {
                options.forEach(opt => {
                    const btn = document.createElement('button');
                    btn.className = 'q-option-btn';
                    btn.textContent = opt.text;
                    if (currentAnswer === opt.value) btn.classList.add('selected');
                    btn.addEventListener('click', createSelectHandler(opt.value));
                    this.optionsEl.appendChild(btn);
                });
            } else if (itemType === 'radio') {
                options.forEach(opt => {
                    const label = document.createElement('label');
                    label.className = 'q-radio-label';
                    const input = document.createElement('input');
                    input.type = 'radio';
                    input.name = `question_${this.currentQuestionIndex}`;
                    input.value = opt.value;
                    if (currentAnswer === opt.value) input.checked = true;
                    input.addEventListener('change', createSelectHandler(opt.value));
                    label.appendChild(input);
                    label.appendChild(document.createTextNode(` ${opt.text}`));
                    this.optionsEl.appendChild(label);
                });
            } else if (itemType === 'select') {
                const select = document.createElement('select');
                select.className = 'q-select';
                options.forEach(opt => {
                    const option = document.createElement('option');
                    option.value = opt.value;
                    option.textContent = opt.text;
                    if (currentAnswer === opt.value || (currentAnswer === '' && (opt.value === null || opt.value === ''))) option.selected = true;
                    if (opt.value === null || opt.value === '') option.disabled = true;
                    select.appendChild(option);
                });
                select.addEventListener('change', (e) => this.selectOption(e.target.value, false));
                this.optionsEl.appendChild(select);
            } else if (itemType === 'number_input') {
                const input = document.createElement('input');
                input.type = 'number';
                input.className = 'q-number-input';
                input.placeholder = item.placeholder || '';
                input.value = currentAnswer || '';
                input.addEventListener('input', (e) => this.selectOption(e.target.value, false));
                this.optionsEl.appendChild(input);
            }
        }
        
        this.updateNavButtons();

        // 2. 使用 setTimeout 将滚动操作推迟到下一个事件循环，确保DOM渲染完毕
        setTimeout(() => {
            this.scrollContainer.scrollTop = scrollTop;
        }, 1);
    }
    
    selectOption(value, autoNext = true) {
        this.answers[this.currentQuestionIndex] = value;
        const isLastQuestion = this.currentQuestionIndex === this.currentTest.items.length - 1;

        if (this.currentTest.id === 'rpm') {
            if (isLastQuestion) {
                // RPM最后一题选完后，因为没有“下一题”按钮，需要手动调用finish
                this.finishTest();
            } else {
                this.navigateQuestion(1);
            }
            return;
        }

        if (autoNext && !isLastQuestion) {
            this.navigateQuestion(1);
        } else {
            this.loadQuestion();
        }
    }
    
    navigateQuestion(direction) {
        const currentAnswer = this.answers[this.currentQuestionIndex];
        if (direction === 1 && (currentAnswer === null || currentAnswer === '')) return;

        if (direction === 1 && this.currentQuestionIndex >= this.currentTest.items.length - 1) {
            this.finishTest();
            return;
        }
        
        this.currentQuestionIndex += direction;
        this.loadQuestion();
    }
    
    updateNavButtons() {
        const isRPM = this.currentTest.id === 'rpm';
        this.prevBtn.style.display = isRPM ? 'none' : 'inline-block';
        this.nextBtn.style.display = isRPM ? 'none' : 'inline-block';

        if (!isRPM) {
            this.prevBtn.disabled = this.currentQuestionIndex === 0;
            const isLastQuestion = this.currentQuestionIndex === this.currentTest.items.length - 1;
            this.nextBtn.textContent = isLastQuestion ? '完成' : '下一题';
            const currentAnswer = this.answers[this.currentQuestionIndex];
            this.nextBtn.disabled = (currentAnswer === null || currentAnswer === '');
        }
    }

    finishTest() {
        if (this.currentTest.id !== 'rpm' && typeof this.currentTest.validate === 'function') {
             const validationResult = this.currentTest.validate(this.answers);
             if (validationResult !== true) {
                 alert(validationResult);
                 return;
             }
        }

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
            if (window.navigateTo) window.navigateTo('view-results');
        };
    }
}