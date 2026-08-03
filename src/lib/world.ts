export interface WorldSetting {
  id: string;
  name: string;
  emoji: string;
  description: string; // 会注入提示词
  hook: string;        // AI 失败时的兜底开场
}

export const WORLD_SETTINGS: WorldSetting[] = [
  {
    id: 'fantasy',
    name: '剑与魔法',
    emoji: '🗡️',
    description:
      '古老的艾泽洛大陆上，诸王国并存，龙族在北方山脉沉睡，精灵与矮人的盟约摇摇欲坠。魔法源于"星辉"，但星辉正在枯竭，一种名为"灰潮"的诡异迷雾正从东境蔓延，吞噬一切生机。',
    hook: '灰潮逼近的号角声将你唤醒，命运已将你们这群冒险者推到了时代的岔路口。',
  },
  {
    id: 'sci-fi',
    name: '星际科幻',
    emoji: '🚀',
    description:
      '公元 3187 年，人类联邦与机械文明"铸魂者"的战争已持续百年。你们是一支游走于星海边缘的佣兵小队，驾驶着老旧星舰"渡鸦号"，在势力夹缝中求生，寻找足以改变战局的远古遗迹。',
    hook: '星舰的警报声将你拉回现实——前方出现了一艘早已失联的殖民船残骸。',
  },
  {
    id: 'wuxia',
    name: '武侠江湖',
    emoji: '🥋',
    description:
      '大燕王朝末年，朝纲腐败，武林纷争四起。魔教"天殒宫"重现江湖，正道各派暗流涌动，江湖传言中藏着一卷能颠覆天下的《山河密录》。你们是卷入这场漩涡的江湖儿女。',
    hook: '雨夜的客栈里，一个浑身是血的信使倒下前，将半块令牌塞进了你的手中。',
  },
  {
    id: 'apocalypse',
    name: '末世废土',
    emoji: '☢️',
    description:
      '生化灾难"黄昏"过后，人类文明支离破碎。幸存者们在辐射废墟中挣扎求生，变异生物游荡于荒野，而某些废弃设施深处，仍藏着旧时代足以毁灭或拯救世界的遗产。',
    hook: '水源告急，而城外三十里处，一座从未被探索过的研究所正静静矗立在风暴中心。',
  },
  {
    id: 'mystery',
    name: '悬疑侦探',
    emoji: '🕵️',
    description:
      '雾都默尔城，一场连环失踪案让整座城市陷入恐慌。你们是受邀调查此案的顾问，线索相互矛盾，每个人都藏着秘密，而真相或许比你们想象的更加骇人。',
    hook: '第三名失踪者的遗物——一枚刻着古老符号的怀表，被匿名送到了你们面前。',
  },
  {
    id: 'urban',
    name: '都市异能',
    emoji: '🌆',
    description:
      '凌晨三点的城市里，一个叫"灵契局"的秘密组织在阴影中维持着现实与异象的边界。你们是刚觉醒异能的新人，被卷入了灵契局内部的派系之争，以及一场关于城市记忆的阴谋。',
    hook: '当你的影子开始不受控制地"站起来"时，你意识到平凡的生活已经彻底结束了。',
  },
  {
    id: 'custom',
    name: '自定义世界观',
    emoji: '✍️',
    description: '',
    hook: '故事开始了。',
  },
];

export function getWorld(id: string): WorldSetting | undefined {
  return WORLD_SETTINGS.find((w) => w.id === id);
}