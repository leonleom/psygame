// modules/questionnaires/cfi.js

const cfiScoring = {
    alternatives: [1, 3, 5, 6, 8, 10, 12, 13, 14, 16, 18, 19, 20],
    control: [2, 4, 7, 9, 11, 15, 17],
    reverse: [2, 4, 7, 9, 11, 17],
};

const cfiItems = [
    { id: 1, text: '我擅长“审时度势”。' },
    { id: 2, text: '面对困难情况时，我很难做出决定。' },
    { id: 3, text: '在做决定之前，我会考虑多种选择。' },
    { id: 4, text: '当我遇到困难时，我感觉自己失去了控制。' },
    { id: 5, text: '我喜欢从多个不同角度看待困难。' },
    { id: 6, text: '在对行为归因之前，我会寻找并非唾手可得的额外信息。' },
    { id: 7, text: '遇到困难时，我会变得非常紧张，以至于想不出解决办法。' },
    { id: 8, text: '我尝试从他人的角度思考问题。' },
    { id: 9, text: '我觉得处理困难的方式太多了，这很麻烦。' },
    { id: 10, text: '我善于设身处地为他人着想。' },
    { id: 11, text: '当我遇到困难时，我就是不知道该怎么办。' },
    { id: 12, text: '从多个角度看待困难很重要。' },
    { id: 13, text: '在困境中，我会在决定如何行动前考虑多种选择。' },
    { id: 14, text: '我经常从不同的角度看待一个情况。' },
    { id: 15, text: '我能够克服生活中遇到的困难。' },
    { id: 16, text: '在对行为进行归因时，我会考虑所有可用的事实和信息。' },
    { id: 17, text: '我觉得我没有能力改变困境。' },
    { id: 18, text: '遇到困难时，我会停下来思考几种解决方法。' },
    { id: 19, text: '对于我面临的难题，我能想出不止一种解决方法。' },
    { id: 20, text: '在应对困境前，我会考虑多种选择。' },
];

export const cfi = {
    id: 'cfi',
    title: '认知灵活性问卷 (CFI)',
    options: [
        { text: '完全不同意', value: 1 },
        { text: '不同意', value: 2 },
        { text: '有点不同意', value: 3 },
        { text: '中立', value: 4 },
        { text: '有点同意', value: 5 },
        { text: '同意', value: 6 },
        { text: '完全同意', value: 7 },
    ],
    items: cfiItems,
    calculateScore: function(answers) {
        const scores = {
            alternatives: 0,
            control: 0,
            total: 0,
        };
        this.items.forEach((item, index) => {
            const answer = answers[index];
            if (answer === null) return;
            let score = cfiScoring.reverse.includes(item.id) ? 8 - answer : answer;
            scores.total += score;
            if (cfiScoring.alternatives.includes(item.id)) {
                scores.alternatives += score;
            } else if (cfiScoring.control.includes(item.id)) {
                scores.control += score;
            }
        });
        return scores;
    },
    interpretScore: function(scores) {
        const { alternatives, control, total } = scores;
        let interpretation = '';
        if (total >= 110) {
            interpretation = '这表明您拥有非常高的认知灵活性。您能自如地从多个角度看待问题，轻松地生成多种解决方案，并坚信自己有能力掌控生活中的挑战。';
        } else if (total >= 80) {
            interpretation = '您的认知灵活性处于较好水平。在大多数情况下，您都能灵活应对生活中的变化和困难，并对自己解决问题的能力抱有信心。';
        } else if (total >= 50) {
            interpretation = '您的认知灵活性处于平均水平。您具备一定的适应能力，但在面对某些特别复杂或意外的情况时，可能会感到一些压力或思维上的局限。';
        } else {
            interpretation = '您的认知灵活性水平有待提升。您可能倾向于用固有的模式思考问题，在遇到突发状况时，可能会感到不知所措或难以控制。';
        }
        return `
            <p><strong>总分:</strong> ${total} (范围: 20-140)</p>
            <p><strong>“替代方案”维度得分:</strong> ${alternatives} (范围: 13-91) - 衡量您生成多种解决方案的能力。</p>
            <p><strong>“控制感”维度得分:</strong> ${control} (范围: 7-49) - 衡量您认为困境在多大程度上是可控的。</p>
            <hr style="margin: 15px 0;">
            <p><strong>综合解释:</strong> 您的总分表明，您的认知灵活性处于特定水平。${interpretation}</p>
        `;
    },
};