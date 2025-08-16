// modules/questionnaires/demographics.js (扩展版)

const demographicsItems = [
    {
        id: 'age',
        text: '1. 请输入您的年龄：',
        type: 'number_input',
        placeholder: '例如：21',
        validation: { required: true, min: 10, max: 99 }
    },
    {
        id: 'gender',
        text: '2. 请选择您的性别：',
        type: 'radio',
        options: [
            { text: '男', value: 'male' },
            { text: '女', value: 'female' },
            { text: '其他 / 不愿透露', value: 'other' },
        ]
    },
    {
        id: 'handedness',
        text: '3. 您的惯用手是？',
        type: 'radio',
        options: [
            { text: '右手', value: 'right' },
            { text: '左手', value: 'left' },
            { text: '双手通用', value: 'ambidextrous' },
        ]
    },
    {
        id: 'education',
        text: '4. 请选择您的最高学历（或在读学历）：',
        type: 'select',
        options: [
            { text: '请选择...', value: '' },
            { text: '高中及以下', value: 'highschool' },
            { text: '本科在读', value: 'bachelor_student' },
            { text: '硕士在读', value: 'master_student' },
            { text: '博士在读', value: 'phd_student' },
            { text: '已获得学士学位', value: 'bachelor_degree' },
            { text: '已获得硕士学位', value: 'master_degree' },
            { text: '已获得博士学位', value: 'phd_degree' },
        ]
    },
    {
        id: 'field_of_study',
        text: '5. 请选择您的专业领域：',
        type: 'select',
        options: [
            { text: '请选择...', value: '' },
            { text: '理工农医类', value: 'stem' },
            { text: '人文社科类（文、史、哲、法、教、艺等）', value: 'humanities' },
            { text: '经管类', value: 'business' },
            { text: '其他', value: 'other' },
            { text: '非学生 / 无专业', value: 'na' },
        ]
    },
    {
        id: 'gaming_frequency',
        text: '6. 您玩电子游戏（电脑、手机、主机等）的频率是？',
        type: 'radio',
        options: [
            { text: '几乎不玩', value: 'rarely' },
            { text: '偶尔玩（每月几次）', value: 'occasionally' },
            { text: '经常玩（每周几次）', value: 'frequently' },
            { text: '非常频繁（几乎每天）', value: 'very_frequently' },
        ]
    },
    {
        id: 'preferred_genre',
        text: '7. 您更偏好哪一类游戏？',
        type: 'radio',
        options: [
            { text: '策略/解谜/模拟经营类', value: 'strategy_puzzle' },
            { text: '动作/射击/角色扮演类', value: 'action_rpg' },
            { text: '休闲/社交/音乐类', value: 'casual_social' },
            { text: '各类游戏都玩/无特别偏好', value: 'versatile' },
            { text: '不玩游戏', value: 'non_gamer' },
        ]
    },
    {
        id: 'device_type',
        text: '8. 您当前主要使用的设备是？',
        type: 'radio',
        options: [
            { text: '台式电脑', value: 'desktop' },
            { text: '笔记本电脑', value: 'laptop' },
            { text: '平板电脑', value: 'tablet' },
            { text: '手机', value: 'mobile' },
        ]
    },
    {
        id: 'self_assessment_maze',
        text: '9. 在开始前，您认为自己解决复杂迷宫问题的能力如何？',
        type: 'radio',
        options: [
            { text: '很差', value: 1 },
            { text: '较差', value: 2 },
            { text: '一般', value: 3 },
            { text: '较好', value: 4 },
            { text: '很好', value: 5 },
        ]
    }
];

export const demographics = {
    id: 'demographics',
    title: '个人背景信息调查',
    items: demographicsItems,
    
    calculateScore: function(answers) {
        const results = {};
        this.items.forEach((item, index) => {
            let value = answers[index];
            if (item.type === 'number_input' || item.id === 'self_assessment_maze') {
                value = value ? parseInt(value, 10) : null;
            }
            results[item.id] = value;
        });
        return results;
    },
    
    validate: function(answers) {
        for (let i = 0; i < this.items.length; i++) {
            const item = this.items[i];
            const answer = answers[i];
            const isRequired = item.validation?.required ?? true; // 默认所有题目都是必填

            if (isRequired && (answer === null || answer === '')) {
                return `问题 ${i + 1} "${item.text}" 是必填项。`;
            }
            if (item.type === 'number_input' && answer !== '') {
                const num = parseInt(answer, 10);
                if (isNaN(num)) return `问题 ${i + 1} 需要输入一个有效的数字。`;
                if (item.validation.min && num < item.validation.min) return `您输入的年龄 (${num}) 小于最小允许值 (${item.validation.min})。`;
                if (item.validation.max && num > item.validation.max) return `您输入的年龄 (${num}) 大于最大允许值 (${item.validation.max})。`;
            }
        }
        return true;
    },
    
    interpretScore: function(results) {
        return `
            <p><strong>感谢您的参与！</strong></p>
            <p>您的背景信息已成功记录，这将为我们的研究提供非常宝贵的支持。</p>
            <p>所有数据都将被严格匿名化处理。</p>
        `;
    }
};