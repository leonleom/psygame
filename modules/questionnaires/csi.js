// modules/questionnaires/csi.js

const csiScoring = {
    intuitive: ['A', 'C', 'E', 'G', 'I', 'K', 'M', 'O', 'Q', 'S', 'U', 'W', 'Y', 'AA', 'CC', 'EE', 'GG', 'II', 'KK', 'MM'],
    systematic: ['B', 'D', 'F', 'H', 'J', 'L', 'N', 'P', 'R', 'T', 'V', 'X', 'Z', 'BB', 'DD', 'FF', 'HH', 'JJ', 'LL', 'NN']
};

const csiItemsFull = [
    { id: 'A', text: '在尝试解决问题之前，我会先“感受”问题或尝试“看到”问题。' },
    { id: 'B', text: '我会分析问题或情境，以确定事实是否合理。' },
    { id: 'C', text: '在解决问题时，我会创建图示或视觉图像。' },
    { id: 'D', text: '我在解决问题时，会使用一个分类系统（“分类格”）来存储信息。' },
    { id: 'E', text: '我发现自己解决问题时会自言自语。' },
    { id: 'F', text: '我通过首先“聚焦”或关注关键问题来解决问题。' },
    { id: 'G', text: '我通过首先“泛化”或扩大问题范围来解决问题。' },
    { id: 'H', text: '我会以逐步、有序的方式解决问题。' },
    { id: 'I', text: '我会先整体审视问题，再关注其部分。' },
    { id: 'J', text: '处理问题最有效的方式是逻辑和理性。' },
    { id: 'K', text: '处理问题最有效的方式是跟随“直觉”或本能。' },
    { id: 'L', text: '我会通过有序组合或构建问题的部分来生成整体解决方案。' },
    { id: 'M', text: '我会先整体审视问题及其部分之间的关系，再继续解决。' },
    { id: 'N', text: '所有问题在特定情境下都有预定的“最佳或正确”答案。' },
    { id: 'O', text: '所有问题本质上是开放式的，允许多种可能的答案或解决方案。' },
    { id: 'P', text: '我会像计算机一样，通过分门别类存储大量数据以便快速回忆。' },
    { id: 'Q', text: '在需要储存大量数据时，我会通过像拼图一样，扩展已有信息，并将新信息“契合”进去。' },
    { id: 'R', text: '在解决问题之前，我倾向于制定计划或寻找方法。' },
    { id: 'S', text: '我通常依赖“预感”、直觉和其他非语言线索来帮助解决问题。' },
    { id: 'T', text: '我通常依赖事实和数据来解决问题。' },
    { id: 'U', text: '我会快速创建并放弃备选方案。' },
    { id: 'V', text: '我通常会有序搜索额外信息，并仔细选择数据来源。' },
    { id: 'W', text: '我会同时考虑多个备选方案和选项。' },
    { id: 'X', text: '我倾向于在问题解决的早期阶段，定义具体的约束条件。' },
    { id: 'Y', text: '在分析问题时，我似乎会从一个步骤跳到另一个步骤，然后又跳回来。' },
    { id: 'Z', text: '在分析问题时，我似乎会按顺序从一个步骤进展到另一个步骤。' },
    { id: 'AA', text: '我通常会使用许多数据来源，“浏览”这些信息以寻找线索。' },
    { id: 'BB', text: '当我处理涉及复杂情境的问题时，我会将其分解为一系列更小、更易管理的部分。' },
    { id: 'CC', text: '我似乎会多次回到同一数据来源，每次都能获得不同的见解。' },
    { id: 'DD', text: '我会按逻辑顺序和方法系统地收集数据。' },
    { id: 'EE', text: '我通常能感知问题的规模和范围，形成“整体图景”。' },
    { id: 'FF', text: '当我解决问题时，我的方法是详细且有组织的；因此，找到解决方案通常需要较长时间。' },
    { id: 'GG', text: '我能够快速有效地解决问题；我不会在问题解决过程中花费太多时间。' },
    { id: 'HH', text: '我有出色的记忆力和数学天赋。' },
    { id: 'II', text: '我对不确定性和模糊性感到舒适。' },
    { id: 'JJ', text: '我会形容自己——他人也会如此形容——为可预测且可靠的人。' },
    { id: 'KK', text: '我有很多想法，天性好奇。' },
    { id: 'LL', text: '我的天性让我避免“制造波澜”或引发改变。' },
    { id: 'MM', text: '我会形容自己——他人也会如此形容——为冒险者。' },
    { id: 'NN', text: '我对现状感到舒适；“新方式”并不总是更好的方式。' },
];


export const csi = {
    id: 'csi',
    title: '认知风格问卷 (CSI)',
    options: [
        { text: '非常不同意', value: 1 }, { text: '不同意', value: 2 }, { text: '不确定', value: 3 },
        { text: '同意', value: 4 }, { text: '非常同意', value: 5 }
    ],
    items: csiItemsFull.filter(item => csiScoring.intuitive.includes(item.id) || csiScoring.systematic.includes(item.id)),
    calculateScore: function(answers) {
        const finalScore = { intuitive: 0, systematic: 0 };
        this.items.forEach((item, index) => {
            const answer = answers[index];
            if (answer === null) return;

            if(csiScoring.intuitive.includes(item.id)) {
                finalScore.intuitive += answer;
            } else if (csiScoring.systematic.includes(item.id)) {
                finalScore.systematic += answer;
            }
        });
        return finalScore;
    },
    interpretScore: function(results) {
        const { intuitive, systematic } = results;
        let style = '混合型';
        if (intuitive > systematic + 10) style = '直觉型主导';
        else if (systematic > intuitive + 10) style = '系统型主导';
        
        return `
            <p><strong>直觉型得分:</strong> ${intuitive}</p>
            <p><strong>系统型得分:</strong> ${systematic}</p>
            <p><strong>综合来看，您的认知风格属于“${style}”。</strong>这意味着在处理问题时，您会综合运用两种策略，或根据情境偏向某一种。</p>
        `;
    }
};