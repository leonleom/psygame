// modules/questionnaires/bis11.js

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
    items: [
        "我会仔细规划任务。", "我会不加思考地做事。", "我能快速做决定。", "我是个乐天派。", "我“不注意”细节。",
        "我的思绪“飞速运转”。", "我会提前计划旅行。", "我有很强的自制力。", "我能轻松集中注意力。", "我会定期储蓄。",
        "在观看演出或听讲座时，我会“坐立不安”。", "我是个谨慎的思考者。", "我会提前计划，保证自己工作稳定。", "我会不经思考就说话。", "我喜欢思考复杂的问题。",
        "我会更换工作。", "我会“冲动”行事。", "在解决思考性问题时，我很容易感到无聊。", "我会一时兴起行事。", "我是个稳健的思考者。",
        "我会更换住所。", "我会冲动购物。", "我一次只能思考一件事。", "我会更换爱好。", "我的支出或消费会超过收入。",
        "在思考时，我常常会有无关的想法。", "我对当下的兴趣超过未来。", "在剧院或课堂上，我坐立难安。", "我喜欢解谜题。", "我以未来为导向。"
    ],
    // 计分逻辑
    calculateScore: function(answers) {
        let totalScore = 0;
        answers.forEach((answer, index) => {
            if (answer === null) return; // 跳过未回答的题目
            const questionNumber = index + 1;
            let score = answer;
            // 检查是否需要反向计分
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