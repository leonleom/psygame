// modules/questionnaires/mai.js

// 定义 MAI 的计分规则：哪些题目属于哪个子维度
const maiScoring = {
    // 认知知识 (Knowledge of Cognition) - 测量对自身知识的理解
    declarative: [5, 10, 12, 16, 17, 20, 32, 46],
    procedural: [3, 14, 27, 33],
    conditional: [15, 18, 29, 35],
    
    // 认知调节 (Regulation of Cognition) - 测量对思考过程的控制
    planning: [4, 6, 8, 22, 23, 42, 45],
    info_management: [9, 13, 30, 31, 37, 39, 41, 43, 47, 48],
    comprehension_monitoring: [1, 2, 11, 21, 28, 34, 49],
    debugging_strategies: [25, 40, 44, 51, 52],
    evaluation: [7, 19, 24, 36, 38, 50],
};

// 问卷所有题目 (52个)
const maiItems = [
    { id: 1, text: '我会定期问自己是否实现了目标。' },
    { id: 2, text: '在回答问题前，我会考虑多种解决方案。' },
    { id: 3, text: '我尝试使用过去行之有效的策略。' },
    { id: 4, text: '我会在学习时调整自己的速度，以保证有足够的时间。' },
    { id: 5, text: '我了解自己的智力强项和弱项。' },
    { id: 6, text: '在开始一项任务前，我会思考我真正需要学习什么。' },
    { id: 7, text: '我在完成测试后知道自己做得怎么样。' },
    { id: 8, text: '在开始一项任务前，我设定了具体目标。' },
    { id: 9, text: '遇到重要信息时，我会放慢速度。' },
    { id: 10, text: '我知道哪种信息最重要。' },
    { id: 11, text: '我在解决问题时会问自己是否考虑了所有选项。' },
    { id: 12, text: '我善于组织信息。' },
    { id: 13, text: '我会自觉地把注意力集中在重要信息上。' },
    { id: 14, text: '我对我使用的每种策略都有明确的目的。' },
    { id: 15, text: '当我了解某个主题时，我学得最好。' },
    { id: 16, text: '我知道老师希望我学到什么。' },
    { id: 17, text: '我善于记忆信息。' },
    { id: 18, text: '我会根据情况使用不同的学习策略。' },
    { id: 19, text: '完成任务后，我会问自己是否有更简单的方法。' },
    { id: 20, text: '我能控制自己学得怎么样。' },
    { id: 21, text: '我定期复习，以帮助我理解重要的关系。' },
    { id: 22, text: '在开始学习材料之前，我会问自己关于材料的问题。' },
    { id: 23, text: '我思考解决问题的几种方法，并选择最好的一个。' },
    { id: 24, text: '我会在学习完成后总结我学到的东西。' },
    { id: 25, text: '当我遇到不理解的东西时，我会向他人寻求帮助。' },
    { id: 26, text: '我能在需要学习时激励自己。' },
    { id: 27, text: '我清楚自己在学习时使用的策略。' },
    { id: 28, text: '我在学习时会分析策略的有效性。' },
    { id: 29, text: '我利用我的智力优势来弥补我的弱点。' },
    { id: 30, text: '我专注于新信息的意义和重要性。' },
    { id: 31, text: '我创建自己的例子，使信息更有意义。' },
    { id: 32, text: '我能很好地判断自己理解了多少。' },
    { id: 33, text: '我发现自己会自动使用有益的学习策略。' },
    { id: 34, text: '我发现自己会定期暂停来检查理解。' },
    { id: 35, text: '我知道何时使用每种策略最有效。' },
    { id: 36, text: '我会在完成后问自己是否很好地实现了目标。' },
    { id: 37, text: '我在学习时会画图或示意图来帮助理解。' },
    { id: 38, text: '解决问题后，我会问自己是否考虑了所有选项。' },
    { id: 39, text: '我尝试用自己的话来解释新信息。' },
    { id: 40, text: '当我理解失败时，我会改变策略。' },
    { id: 41, text: '我利用文本的组织结构来帮助我学习。' },
    { id: 42, text: '在开始一项任务前，我会仔细阅读说明。' },
    { id: 43, text: '我问自己正在阅读的内容是否与我已知的相关。' },
    { id: 44, text: '当我感到困惑时，我会重新评估我的假设。' },
    { id: 45, text: '我安排时间，以最好地实现我的目标。' },
    { id: 46, text: '当我对主题感兴趣时，我学得更多。' },
    { id: 47, text: '我尝试将学习内容分解为更小的步骤。' },
    { id: 48, text: '我更关注整体意义而不是细节。' },
    { id: 49, text: '在学习新事物时，我会问自己做得怎么样。' },
    { id: 50, text: '完成任务后，我问自己是否尽可能多地学到了东西。' },
    { id: 51, text: '我停下来并回头看那些不清楚的新信息。' },
    { id: 52, text: '当我感到困惑时，我停下来并重新阅读。' },
];

export const mai = {
    id: 'mai',
    title: '元认知意识问卷 (MAI)',
    options: [
        { text: '是 (True)', value: true },
        { text: '否 (False)', value: false },
    ],
    items: maiItems,
    
    calculateScore: function(answers) {
        const scores = {
            knowledge_total: 0,
            regulation_total: 0,
            total_mai: 0,
        };

        // 初始化子维度分数
        for (const dim in maiScoring) {
            scores[dim] = 0;
        }

        this.items.forEach((item, index) => {
            // 注意：questions index from 0, item ID from 1
            const itemId = item.id;
            const answer = answers[index];

            if (answer === true) {
                // 如果答案是 True (1 分)
                
                // 找到对应的维度并加分
                if (maiScoring.declarative.includes(itemId)) {
                    scores.declarative += 1;
                    scores.knowledge_total += 1;
                } else if (maiScoring.procedural.includes(itemId)) {
                    scores.procedural += 1;
                    scores.knowledge_total += 1;
                } else if (maiScoring.conditional.includes(itemId)) {
                    scores.conditional += 1;
                    scores.knowledge_total += 1;
                } else if (maiScoring.planning.includes(itemId)) {
                    scores.planning += 1;
                    scores.regulation_total += 1;
                } else if (maiScoring.info_management.includes(itemId)) {
                    scores.info_management += 1;
                    scores.regulation_total += 1;
                } else if (maiScoring.comprehension_monitoring.includes(itemId)) {
                    scores.comprehension_monitoring += 1;
                    scores.regulation_total += 1;
                } else if (maiScoring.debugging_strategies.includes(itemId)) {
                    scores.debugging_strategies += 1;
                    scores.regulation_total += 1;
                } else if (maiScoring.evaluation.includes(itemId)) {
                    scores.evaluation += 1;
                    scores.regulation_total += 1;
                }
            }
            // 如果 answer === false (0 分)，则无需处理
        });

        scores.total_mai = scores.knowledge_total + scores.regulation_total;
        return scores;
    },
    
    interpretScore: function(scores) {
        // MAI 总分范围是 0-52。
        const { total_mai, knowledge_total, regulation_total } = scores;

        let totalInterpretation = '';
        if (total_mai >= 40) {
            totalInterpretation = '您的元认知意识非常高，您是一个有意识、有策略的学习者和问题解决者。';
        } else if (total_mai >= 26) {
            totalInterpretation = '您的元认知意识处于中等水平，您对自己的思维过程有基本的了解，但可以进一步提高。';
        } else {
            totalInterpretation = '您的元认知意识水平较低，您在解决问题时可能更依赖直觉而非有意识的策略。';
        }

        return `
            <p><strong>MAI总分:</strong> ${total_mai} (满分 52)</p>
            <p><strong>认知知识分:</strong> ${knowledge_total} (满分 16)</p>
            <p><strong>认知调节分:</strong> ${regulation_total} (满分 36)</p>
            <hr style="margin: 15px 0;">
            <p><strong>综合解释:</strong> ${totalInterpretation}</p>
        `;
    }
};