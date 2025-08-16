// modules/questionnaires/rpm.js

// 瑞文测验标准答案
const ravenAnswers = {
    A: [4, 5, 1, 2, 6, 3, 6, 2, 1, 3, 4, 5],
    B: [2, 6, 1, 2, 1, 3, 5, 6, 4, 3, 4, 5],
    C: [8, 2, 3, 8, 7, 4, 5, 1, 7, 6, 1, 2],
    D: [3, 4, 3, 7, 8, 6, 5, 4, 1, 2, 5, 6],
    E: [7, 6, 8, 2, 1, 5, 1, 6, 3, 2, 4, 5]
};

// 生成所有60道题目的 item 列表
const ravenItems = [];
const sections = ['A', 'B', 'C', 'D', 'E'];
sections.forEach(section => {
    const optionCount = (section === 'A' || section === 'B') ? 6 : 8; // A,B部分有6个选项，C,D,E有8个
    for (let i = 1; i <= 12; i++) {
        ravenItems.push({
            id: `${section}${i}`,
            type: 'image_button_selection', // 新的、更简单的题目类型
            image: `assets/rpm/${section}${i}.png`, // 图片路径
            optionCount: optionCount
        });
    }
});

export const rpm = {
    id: 'rpm',
    title: '瑞文标准推理测验',
    
    // 线上版本的指导语
    instructions: `
        <h3>欢迎参加瑞文标准推理测验</h3>
        <p>这是一个有趣的图形推理练习，请仔细观察每一张图片。</p>
        <p>在每一题中，上方的大图案缺少了一部分。请从下方的多个小图片中，<strong>选择一个最合适的来补全大图案</strong>。</p>
        <p>题目将由易到难呈现。请按顺序完成所有题目，一旦进入下一题，将无法返回修改。</p>
        <p>本测验没有时间限制，但请独立、认真地完成。准备好后，请点击“开始测验”。</p>
    `,

    items: ravenItems,
    
    calculateScore: function(answers) {
        let correctCount = 0;
        this.items.forEach((item, index) => {
            const answer = answers[index];
            if (answer === null || answer === undefined) return;
            
            const section = item.id.charAt(0);
            const questionNum = parseInt(item.id.substring(1), 10);
            const correctAnswer = ravenAnswers[section][questionNum - 1];
            
            if (parseInt(answer, 10) === correctAnswer) {
                correctCount++;
            }
        });
        return { total_correct: correctCount, total_answered: this.items.length };
    },
    
    interpretScore: function(results) {
        const { total_correct, total_answered } = results;
        // 实际的常模转换会更复杂，需要根据年龄查表，这里我们只显示原始分
        const percentile = this.getPercentile(total_correct); // 简化的百分位评估
        
        let level = '待评估';
        if (percentile >= 95) level = '优秀 (高水平)';
        else if (percentile >= 75) level = '良好';
        else if (percentile >= 25) level = '中等';
        else if (percentile >= 5) level = '中下';
        else level = '需要提高 (智力缺陷)';

        return `
            <p><strong>您的原始分:</strong> ${total_correct} / ${total_answered}</p>
            <p><strong>百分等级 (估算):</strong> 约为 ${percentile}%</p>
            <p><strong>初步评估:</strong> 您的非言语逻辑推理能力处于 <strong>${level}</strong> 水平。</p>
            <p><small>请注意：此结果为基于通用常模的粗略估计，专业的智力评估需要参照严格的年龄常模进行转换。</small></p>
        `;
    },

    // 这是一个非常简化的百分位换算函数，模拟常模表
    // 真实应用中，这里应该是一个复杂的查表逻辑
    getPercentile: function(score) {
        // 简化常模：假设60题中，答对36题为50百分位，标准差为10
        const mean = 36;
        const stdDev = 10;
        const z = (score - mean) / stdDev;
        // 简化Z分数到百分位的转换
        if (z >= 1.645) return 95;
        if (z >= 0.675) return 75;
        if (z >= -0.675) return 50;
        if (z >= -1.645) return 25;
        return 5;
    }
};