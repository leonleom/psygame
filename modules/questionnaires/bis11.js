// modules/questionnaires/bis11.js (v1.1 - 结构修正版)

export const bis11 = {
    id: 'bis11',
    title: 'Barratt 冲动性量表 (BIS-11)',
    options: [
        { text: '很少或从不', value: 1 },
        { text: '偶尔', value: 2 },
        { text: '经常', value: 3 },
        { text: '几乎总是', value: 4 },
    ],
    // 反向计分的题目列表 (题号从1开始)
    reverse: [1, 7, 8, 9, 10, 12, 13, 15, 20, 29, 30],
    
    // --- 【【【 核心修复 】】】 ---
    // 将字符串数组改为对象数组，与其他问卷保持一致
    items: [
        { id: 1, text: "我会仔细规划任务。" },
        { id: 2, text: "我会不加思考地做事。" },
        { id: 3, text: "我能快速做决定。" },
        { id: 4, text: "我是个乐天派。" },
        { id: 5, text: "我“不注意”细节。" },
        { id: 6, text: "我的思绪“飞速运转”。" },
        { id: 7, text: "我会提前计划旅行。" },
        { id: 8, text: "我有很强的自制力。" },
        { id: 9, text: "我能轻松集中注意力。" },
        { id: 10, text: "我会定期储蓄。" },
        { id: 11, text: "在观看演出或听讲座时，我会“坐立不安”。" },
        { id: 12, text: "我是个谨慎的思考者。" },
        { id: 13, text: "我会提前计划，保证自己工作稳定。" },
        { id: 14, text: "我会不经思考就说话。" },
        { id: 15, text: "我喜欢思考复杂的问题。" },
        { id: 16, text: "我会更换工作。" },
        { id: 17, text: "我会“冲动”行事。" },
        { id: 18, text: "在解决'需要思考的问题'时，我很容易感到无聊。" },
        { id: 19, text: "我会一时兴起行事。" },
        { id: 20, text: "我是个稳健的思考者。" },
        { id: 21, text: "我会更换住所。" },
        { id: 22, text: "我会冲动购物。" },
        { id: 23, text: "我一次只能思考一件事。" },
        { id: 24, text: "我会更换爱好。" },
        { id: 25, text: "我的支出或消费会超过收入。" },
        { id: 26, text: "在思考时，我常常会有无关的想法。" },
        { id: 27, text: "我对当下的兴趣超过未来。" },
        { id: 28, text: "在剧院或课堂上，我坐立难安。" },
        { id: 29, text: "我喜欢解谜题。" },
        { id: 30, text: "我以未来为导向。" }
    ],
    // --- 【【【 修复结束 】】】 ---

    // 计分逻辑
    calculateScore: function(answers) {
        let totalScore = 0;
        answers.forEach((answer, index) => {
            if (answer === null) return;
            const questionNumber = index + 1; // 题号从1开始
            let score = answer;
            if (this.reverse.includes(questionNumber)) {
                score = (5 - answer); // 4->1, 3->2, 2->3, 1->4
            }
            totalScore += score;
        });
        return { total: totalScore };
    },
    // 结果解释
    interpretScore: function(results) {
        const score = results.total;
        let interpretation = '';
        if (score <= 51) interpretation = '您的冲动性水平较低，通常在行动前会三思，表现出较好的计划性和自制力。';
        else if (score <= 71) interpretation = '您的冲动性水平处于中等范围，在大多数情况下能保持理智，但偶尔也会凭冲动行事。';
        else interpretation = '您的冲动性水平较高，可能倾向于快速决策和行动，有时会忽略细节或长远计划。';
        return `
            <p><strong>您的总分:</strong> ${score}</p>
            <p><strong>结果解释:</strong> ${interpretation}</p>
        `;
    }
};