import type { RoomRow, RoundAction, StorySegment } from './types';
import { getWorld } from './world';

const NL = String.fromCharCode(10);
const NL2 = NL + NL;

export const OPENING_SYSTEM_PROMPT = `你是一位顶级文字冒险游戏的开场旁白者。一场由多位玩家共同参与的群体叙事即将开始。
请为以下世界观撰写一段引人入胜的开场。

【要求】
1. 交代时代背景与氛围，让玩家立刻身临其境；
2. 点明玩家们当前所处的位置与处境；
3. 抛出第一个悬念或任务，为后续玩家的自由行动留下空间；
4. 篇幅控制在 200~350 字之间；
5. 只输出一个 JSON 对象，不要输出任何其他内容：
{ "opening": "开场叙述文本" }`;

export const STORY_EDITOR_SYSTEM_PROMPT = `你是一位顶级的文字冒险游戏主持人（Game Master）与故事编辑。你正在主持一场由多位真人玩家共同推动的"群体叙事"游戏。

【世界观】
{world_name}：{world_description}
{world_extra}

【你的核心职责】
1. 掌控世界的"大趋势"：历史进程、势力博弈、天灾人祸、时代洪流等宏观事件由你独立决定，玩家无法直接改写，只能参与其中。
2. 尊重每位玩家的行动：对每位玩家本回合的行动给出合理且富有戏剧性的结果——可以是成功、部分成功、失败、意外转折、代价或新的机遇，避免千篇一律。
3. 维持一致性：已经确立的设定、人物、地点、规则必须延续，不可随意推翻；人物要有动机，世界要有逻辑。
4. 营造沉浸感：文笔要有画面感与张力，让玩家感受到"自己的行动真的改变了世界"。
5. 控制节奏：每回合都要推进剧情并埋下新的钩子；不要一次写死所有悬念；故事可以走向任何结局，但不要在中间回合草草收场。

【输出格式】
你必须只输出一个 JSON 对象，不要包含任何其他文字、注释或 Markdown：
{
 "world_events": "本回合世界大趋势与宏观事件（150~250字）",
 "player_outcomes": {
   "玩家1昵称": "该玩家的行动结果与当前处境（80~150字）",
   "玩家2昵称": "……"
 },
 "narrative": "将世界事件与所有玩家的行动结果融合成的一段连贯叙事（300~500字）"
}

【硬性规则】
- player_outcomes 的键必须与玩家昵称完全一致，且必须覆盖每一位提交了行动的玩家。
- 若某位玩家未提交行动，可让其在故事中保持待机或遭遇偶发事件，但不要让其凭空消失。
- 不要替玩家做决定、不要替玩家说话（他们的内心独白除外），只呈现他们行动带来的结果。`;

export function buildResolveUserMessage(room: RoomRow, history: StorySegment[], actions: RoundAction[]): string {
  const world = getWorld(room.world_setting);
  const worldName = world?.name ?? room.world_setting;
  const worldDesc = world?.description ?? '';
  const worldExtra = room.custom_world?.trim() ? `房主补充设定：${NL}${room.custom_world.trim()}` : '';

  const historyText =
    history.length === 0
      ? '（故事刚刚开始，尚无历史。请直接以本回合玩家行动为起点展开。）'
      : history.map((s) => `第 ${s.round} 回合：${NL}${s.narrative || s.world_events}`).join(NL2);

  const actionsText =
    actions.length === 0
      ? '（本回合没有任何玩家提交行动，请让世界继续运转，并给玩家们制造新的机遇或危机。）'
      : actions.map((a) => `- ${a.player_name}：${a.content}`).join(NL);

  return `【世界观】${worldName}：${worldDesc}${NL}${worldExtra}${NL}${NL}【故事历史】${NL}${historyText}${NL}${NL}【第 ${room.current_round} 回合 · 玩家行动】${NL}${actionsText}${NL}${NL}请扮演故事编辑，依据上述历史与行动推进故事，并严格按照系统提示输出 JSON。`;
}

export function buildOpeningUserMessage(room: RoomRow, playerNames: string[]): string {
  const world = getWorld(room.world_setting);
  const worldName = world?.name ?? room.world_setting;
  const worldDesc = world?.description ?? '';
  const worldExtra = room.custom_world?.trim() ? `${NL}房主补充设定：${room.custom_world.trim()}` : '';
  return `【世界观】${worldName}：${worldDesc}${worldExtra}${NL}【参与玩家】${playerNames.join('、')}${NL}请为这个世界撰写开场，只输出 JSON 对象 { "opening": "..." }。`;
}

export function fallbackOpening(room: RoomRow): string {
  const world = getWorld(room.world_setting);
  const worldName = world?.name ?? room.world_setting;
  const hook = world?.hook ?? '一段传奇，正等待你们书写。';
  return `【${worldName}】${NL}${hook}${NL}你们彼此对视，知道自己正站在一段伟大（或疯狂）故事的开端。`;
}

function tryParseJson(raw: string): Record<string, unknown> | null {
  const text = raw.trim();
  try {
    const v = JSON.parse(text);
    if (v && typeof v === 'object') return v as Record<string, unknown>;
  } catch {}
  const m = text.match(/\{[\s\S]*\}/);
  if (m) {
    try {
      const v = JSON.parse(m[0]);
      if (v && typeof v === 'object') return v as Record<string, unknown>;
    } catch {}
  }
  return null;
}

function asString(v: unknown): string {
  if (typeof v === 'string') return v;
  if (typeof v === 'number') return String(v);
  return '';
}

function composeNarrative(worldEvents: string, outcomes: Record<string, string>): string {
  const parts: string[] = [];
  if (worldEvents) parts.push(worldEvents);
  const names = Object.keys(outcomes);
  if (names.length) parts.push(names.map((n) => `${n}：${outcomes[n]}`).join(NL));
  return parts.join(NL2);
}

export function parseStoryOutput(raw: string, actions: RoundAction[]): {
  world_events: string;
  player_outcomes: Record<string, string>;
narrative: string;
} {
  const obj = tryParseJson(raw);
  const worldEvents = asString(obj?.world_events ?? obj?.world_event ?? obj?.worldEvents ?? '');
  const narrativeRaw = asString(obj?.narrative ?? obj?.story ?? obj?.text ?? '');
  const outcomesRaw = obj?.player_outcomes ?? obj?.playerOutcomes ?? obj?.outcomes ?? {};
  const playerOutcomes: Record<string, string> = {};
  for (const a of actions) {
    const v = outcomesRaw && typeof outcomesRaw === 'object'
      ? (outcomesRaw as Record<string, unknown>)[a.player_name] ??
        (outcomesRaw as Record<string, unknown>)[a.player_id] ?? ''
      : '';
    playerOutcomes[a.player_name] = asString(v);
  }
  const narrative = narrativeRaw || composeNarrative(worldEvents, playerOutcomes);
  return { world_events: worldEvents, player_outcomes: playerOutcomes, narrative };
}

export function parseOpeningOutput(raw: string): string {
  const obj = tryParseJson(raw);
  const opening = asString(obj?.opening ?? obj?.text ?? '');
  return opening || raw.trim().slice(0, 600);
}
