// ============================================
// chronicle/story.js — 황혼 연대기 이야기 장면 + 의뢰(퀘스트) 데이터 (1.206.0)
// ============================================
// 장면(SCENES): 대사 목록 { sp: 화자, t: 대사 }.
//   sp = 'narr'(서술) / 'hero'(주인공) / 'elder'(촌장) / 직업 id / 적 key
//   when(save, ctx): 이 장면이 나올 조건. ctx.at = 'town' | 'field' | 'bossPre', ctx.fieldId
//   동료 합류 장면은 직업별로 써 두고, 실제로 합류한 직업의 장면만 나온다.
// 의뢰(QUESTS): 선언형 goal → quest.js가 진행도 계산. 메인 의뢰는 자동 수락.
// 원작 IP 차용 없음 — 세계관은 D&T 본편(여명·황혼·마왕)을 잇는 오리지널.
// ============================================

export const NPCS = {
  elder: { name: '촌장 하르덴', icon: '🕯', color: '#d4a574' },
  narr: { name: '', icon: '', color: '#9b8975' },
};

const bossDone = (s, f) => !!s.progress.bossCleared[f];

export const SCENES = [
  {
    id: 'prologue', title: '서장 — 끝나지 않는 황혼', bg: './enemies/classic/chapter_2/twilightChild_intro.jpg',
    when: () => true,
    lines: [
      { sp: 'narr', t: '해가 진 지 백 일. 대륙의 하늘은 붉은 황혼에 멈춘 채, 다시는 밝아오지 않았다.' },
      { sp: 'narr', t: '마지막 등불이 꺼지지 않은 곳 — 여명의 마을.' },
      { sp: 'elder', t: '여행자인가. 이런 때에 북쪽 길로 들어온 걸 보면, 겁이 없거나 갈 곳이 없거나겠지.' },
      { sp: 'hero', t: '둘 다일지도 모르죠. 하늘이 왜 이렇게 됐는지 알고 싶어서 왔습니다.' },
      { sp: 'elder', t: '나도 그걸 알고 싶네. 북부 극지대에서 서리가 내려온 뒤로 모든 게 멈췄어.' },
      { sp: 'elder', t: '게시판에 마을 사람들의 의뢰가 붙어 있다. 몸을 풀 겸 하나씩 처리해 주게. 보수는 넉넉히 치르지.' },
    ],
  },
  {
    id: 'f1_enter', title: '북부 극지대', bg: './enemies/classic/chapter_1/iceWolf_combat.jpg',
    when: (s, c) => c.at === 'field' && c.fieldId === 1,
    lines: [
      { sp: 'narr', t: '눈보라 너머에서 늑대 울음이 길게 이어진다. 얼어붙은 숨이 칼날처럼 폐를 긁는다.' },
      { sp: 'hero', t: '이 추위… 자연스러운 게 아니야. 누군가 일부러 끌어내리고 있어.' },
    ],
  },
  {
    id: 'f1_boss', title: '한기의 마녀', bg: './enemies/classic/chapter_1/iceMage_intro.jpg',
    when: (s, c) => c.at === 'bossPre' && c.fieldId === 1,
    lines: [
      { sp: 'iceMage', t: '따뜻한 피 냄새… 오랜만이네. 여명을 찾으러 왔니?' },
      { sp: 'iceMage', t: '헛걸음이야. 이 땅은 영원히 얼어붙을 거야. 그분이 그렇게 정하셨으니까.' },
      { sp: 'hero', t: '그분이 누구든, 먼저 너부터 녹여 주지.' },
    ],
  },
  {
    id: 'f1_clear', title: '녹아내린 얼음', bg: './enemies/classic/chapter_1/iceMage_intro.jpg',
    when: (s) => bossDone(s, 1),
    lines: [
      { sp: 'iceMage', t: '…황혼의 자녀들이… 깨어난다… 숲에서…' },
      { sp: 'narr', t: '마녀가 사라지자 극지대의 얼음벽 하나가 무너졌다. 그 안에 누군가 갇혀 있었다.' },
    ],
  },
  {
    id: 'f2_enter', title: '죽은 자의 숲', bg: './enemies/classic/chapter_2/shadowWolf_combat.jpg',
    when: (s, c) => c.at === 'field' && c.fieldId === 2,
    lines: [
      { sp: 'narr', t: '잎 하나 흔들리지 않는 숲. 나무마다 오래된 이름이 새겨져 있다 — 이 숲에서 돌아오지 못한 자들의 이름이.' },
      { sp: 'hero', t: '마녀가 말한 황혼의 자녀… 여기 어딘가에 있겠지.' },
    ],
  },
  {
    id: 'f2_boss', title: '타락한 황혼의 자녀', bg: './enemies/classic/chapter_2/twilightChild_intro.jpg',
    when: (s, c) => c.at === 'bossPre' && c.fieldId === 2,
    lines: [
      { sp: 'twilightChild', t: '어머니가 쓰러졌다고? 그 얼음 덩어리는 처음부터 문지기였을 뿐이야.' },
      { sp: 'twilightChild', t: '우리는 해를 삼킨 자의 아이들. 너희가 여명이라 부르는 건 이제 오지 않아.' },
    ],
  },
  {
    id: 'f2_clear', title: '서리의 문장', bg: './enemies/classic/chapter_2/twilightChild_intro.jpg',
    when: (s) => bossDone(s, 2),
    lines: [
      { sp: 'narr', t: '자녀가 남긴 것은 얼어붙은 문장이 새겨진 열쇠 하나. 차갑게 빛나는 그 문양은 북쪽 고분을 가리키고 있었다.' },
      { sp: 'hero', t: '이 문장… 마을에서 본 적이 있어. 촌장님께 물어봐야겠다.' },
    ],
  },
  {
    id: 'dungeon_open', title: '서리 왕의 무덤', bg: './enemies/championship/frost/champ_frost_boss4_intro.jpg',
    when: (s, c) => bossDone(s, 2) && c.at === 'town',
    lines: [
      { sp: 'elder', t: '그 문장은 옛 서리 왕의 것이다. 황혼이 오기 전, 북부를 다스리던 왕이지.' },
      { sp: 'elder', t: '왕은 자기 무덤에 무구를 묻었다고 한다. 지금은… 그분이라는 자가 그 무덤도 깨웠겠지.' },
      { sp: 'elder', t: '들어가면 쉬어 갈 틈이 없을 게다. 대신 살아 돌아온다면, 왕의 무구가 네 것이 될 수도 있지.' },
    ],
  },
  {
    id: 'dungeon2_open', title: '광기의 숲 심장부', bg: './enemies/championship/forest/chapter4/champ_forest_boss4_intro.jpg',
    when: (s, c) => !!s.progress.bossCleared[3] && c.at === 'town',
    lines: [
      { sp: 'elder', t: '봉인이 깨지자 죽은 자의 숲 깊은 곳에서 음악 소리가 들려온다는구먼.' },
      { sp: 'elder', t: '광기에 물든 자들이 그 음악에 맞춰 춤추고 있다지. 숲의 심장부, 거기에 또 하나의 무구가 잠들어 있을 게다.' },
    ],
  },
  {
    id: 'f3_enter', title: '봉인된 신전', bg: './enemies/classic/chapter_3/timeKeeper_combat.jpg',
    when: (s, c) => c.at === 'field' && c.fieldId === 3,
    lines: [
      { sp: 'narr', t: '무너진 기둥 사이로 시간이 거꾸로 흐른다. 방금 밟은 돌이, 한 걸음 뒤에 다시 놓여 있다.' },
      { sp: 'hero', t: '봉인… 무엇을 가두려고 이런 곳을 만든 거지?' },
    ],
  },
  {
    id: 'f3_boss', title: '망각의 봉인자', bg: './enemies/classic/chapter_3/oblivionSealer_intro.jpg',
    when: (s, c) => c.at === 'bossPre' && c.fieldId === 3,
    lines: [
      { sp: 'oblivionSealer', t: '나는 천 년 동안 이 문을 지켰다. 해를 삼킨 자가 다시는 나오지 못하도록.' },
      { sp: 'oblivionSealer', t: '그런데 봉인은 이미 금이 갔다. 너희가 문지기들을 쓰러뜨릴 때마다 조금씩.' },
      { sp: 'hero', t: '…우리가 봉인을 풀고 있었다고?' },
      { sp: 'oblivionSealer', t: '알았다면 돌아가라. 모른 채 왔다면 — 여기서 잊혀라.' },
    ],
  },
  {
    id: 'f3_clear', title: '열린 균열', bg: './enemies/classic/chapter_3/oblivionSealer_intro.jpg',
    when: (s) => bossDone(s, 3),
    lines: [
      { sp: 'narr', t: '봉인자가 무너지자 신전 바닥이 갈라졌다. 붉은 빛이 새어 나오는 균열 너머로, 끝없는 밤이 보였다.' },
      { sp: 'hero', t: '되돌릴 수는 없어. 그렇다면 끝까지 가서 닫는 수밖에.' },
    ],
  },
  {
    id: 'f4_enter', title: '마계의 균열', bg: './enemies/classic/chapter_4/demonScout_combat.jpg',
    when: (s, c) => c.at === 'field' && c.fieldId === 4,
    lines: [
      { sp: 'narr', t: '하늘과 땅이 뒤집힌 곳. 균열 저편에서 수많은 눈이 이쪽을 지켜보고 있다.' },
    ],
  },
  {
    id: 'f4_boss', title: '마왕의 그림자', bg: './enemies/classic/chapter_4/nakzelionShadow_intro.jpg',
    when: (s, c) => c.at === 'bossPre' && c.fieldId === 4,
    lines: [
      { sp: 'nakzelionShadow', t: '문지기, 자녀, 봉인자. 모두 너희 손으로 치워 주었구나. 고맙다, 작은 빛들아.' },
      { sp: 'nakzelionShadow', t: '나는 해를 삼킨 자의 그림자. 본체가 깨어나기 전, 마지막 등불을 끄러 왔다.' },
      { sp: 'hero', t: '그 등불은 우리 뒤에 있어. 지나가고 싶으면 우리부터 넘어가.' },
    ],
  },
  {
    id: 'ending', title: '종장 — 첫 여명', bg: './enemies/classic/chapter_4/nakzelionShadow_intro.jpg',
    when: (s) => bossDone(s, 4),
    lines: [
      { sp: 'narr', t: '그림자가 흩어진 순간, 균열이 닫히며 백 일 만의 빛이 지평선에 걸렸다. 아주 희미한, 그러나 분명한 여명이었다.' },
      { sp: 'elder', t: '해가… 해가 뜬다. 살아서 이걸 다시 보게 될 줄이야.' },
      { sp: 'hero', t: '아직 끝난 게 아니에요. 그건 그림자였을 뿐이니까.' },
      { sp: 'narr', t: '해를 삼킨 자의 본체는 아직 어딘가에 잠들어 있다. 이야기는 계속된다. — 1부 끝' },
    ],
  },
  {
    id: 'dungeon_clear', title: '서리 왕의 무구', bg: './enemies/championship/frost/champ_frost_boss4_intro.jpg',
    when: (s) => (s.progress.dungeonClears || 0) >= 1,
    lines: [
      { sp: 'champ_frost_boss4', t: '…왕의 무구를… 탐하는 자여… 그 냉기를… 견딜 수 있겠느냐…' },
      { sp: 'narr', t: '절대영도의 군주가 무너지고, 무덤 깊은 곳의 관이 열렸다. 차가운 빛이 손끝을 타고 올라온다.' },
    ],
  },
];

// 동료 합류 장면 — 합류한 직업의 장면만 재생 (주인공 직업 것은 쓰이지 않음)
export const RECRUIT_SCENES = {
  wanderer: {
    title: '눈먼 검사', bg: './classes/wandererstart.jpg',
    lines: [
      { sp: 'wanderer', t: '…따뜻하군. 온기를 느끼는 건 얼마 만인지.' },
      { sp: 'wanderer', t: '앞은 잘 보이지 않지만, 검은 아직 길을 안다. 너희가 가는 길이라면 나도 함께 가지.' },
    ],
  },
  sage: {
    title: '마법진 속의 술법사', bg: './classes/sagestart.jpg',
    lines: [
      { sp: 'sage', t: '드디어 누가 왔네~ 이 결계 안에서 버틴 지 몇 날인지 셀 수도 없어.' },
      { sp: 'sage', t: '구해 줬으니 보답은 해야지. 불꽃 쪽은 나한테 맡겨. 보고 싶어도 참지 말고 불러?' },
    ],
  },
  demonblood: {
    title: '피를 거부한 자', bg: './classes/demonbloodstart.jpg',
    lines: [
      { sp: 'hero', t: '마족…? 무기를 내려놔.' },
      { sp: 'demonblood', t: '진정해. 마족의 피라고 다 같은 편은 아니야. 나도 저 그림자에게 빚진 게 많거든.' },
      { sp: 'demonblood', t: '밤이 되기 전에 돌아가자는 말, 이번엔 지켜 보고 싶어. 같이 가자.' },
    ],
  },
  elf: {
    title: '바람이 부른 자', bg: './classes/elfstart.jpg',
    lines: [
      { sp: 'elf', t: '바람이 너희 이름을 실어 왔어. 숲이 죽어 가는 걸 더는 볼 수 없었거든.' },
      { sp: 'elf', t: '내 활은 바람보다 빨라. 앞은 너희가, 뒤는 내가 지킬게요.' },
    ],
  },
  priest: {
    title: '꺼지지 않은 기도', bg: './classes/priest.jpg',
    lines: [
      { sp: 'priest', t: '여명의 가호가 아직 이 땅에 남아 있었군요. 당신들 안에서 그 빛을 봤어요.' },
      { sp: 'priest', t: '상처는 제가 맡겠습니다. 반드시 모두 함께 돌아가요.' },
    ],
  },
};

// ===== 의뢰 =====
// kind: main(자동 수락·순서대로) / side(게시판) / companion(동료 개인 의뢰)
// req: { field: n(사냥터 개방), main: questId(메인 완료), companion: classId(합류) }
// goal: boss(field) / killKey(key, n) / kills(n) / elites(n) / dungeon(n) / level(n) / enhance(n) / grade(grade)
//   killKey·kills·elites·dungeon 은 「수락한 뒤」 수치만 센다
// reward: gold / exp / essence / shard / item{grade} / growth{points, sp} (companion: 그 동료에게)
export const QUESTS = [
  // ── 메인
  { id: 'm1', kind: 'main', title: '북부의 이변', desc: '북부 극지대에서 서리를 내리는 자를 찾아 쓰러뜨려라.', goal: { type: 'boss', field: 1 }, reward: { gold: 150, essence: 6 } },
  { id: 'm2', kind: 'main', req: { main: 'm1' }, title: '황혼의 자녀', desc: '마녀가 남긴 말을 따라 죽은 자의 숲으로 가라.', goal: { type: 'boss', field: 2 }, reward: { gold: 350, essence: 12, item: { grade: 'rare' }, keys: 3 } },
  { id: 'm3', kind: 'main', req: { main: 'm2' }, title: '봉인의 진실', desc: '봉인된 신전의 문지기를 만나 하늘이 멈춘 이유를 알아내라.', goal: { type: 'boss', field: 3 }, reward: { gold: 700, essence: 20, shard: 2 } },
  { id: 'm4', kind: 'main', req: { main: 'm3' }, title: '마지막 등불', desc: '균열 너머의 그림자를 쓰러뜨려 여명을 되찾아라.', goal: { type: 'boss', field: 4 }, reward: { gold: 1500, shard: 6, item: { grade: 'epic' } } },

  // ── 사냥터 1
  { id: 's1a', kind: 'side', req: { field: 1 }, title: '늑대 사냥', desc: '양치기 노인: "늑대가 마을 울타리까지 내려와. 몇 마리만 잡아 주게."', goal: { type: 'killKey', key: 'iceWolf', n: 6 }, reward: { gold: 60, exp: 60, essence: 3 } },
  { id: 's1b', kind: 'side', req: { field: 1 }, title: '약탈자 소탕', desc: '상인 조합: "동토의 약탈자들이 짐마차를 노린다. 쫓아내 주시오."', goal: { type: 'killKey', key: 'tundraRaider', n: 6 }, reward: { gold: 80, exp: 80, item: { grade: 'uncommon' } } },
  { id: 's1c', kind: 'side', req: { field: 1 }, title: '눈 속의 거인', desc: '사냥꾼: "평소보다 큰 놈들이 보였어. 강적을 처치해 줘."', goal: { type: 'elites', n: 2 }, reward: { gold: 120, essence: 6, keys: 1 } },
  // ── 사냥터 2
  { id: 's2a', kind: 'side', req: { field: 2 }, title: '그림자 늑대 무리', desc: '나무꾼: "숲 입구에 그림자 같은 늑대가 들끓어."', goal: { type: 'killKey', key: 'shadowWolf', n: 10 }, reward: { gold: 180, exp: 300, essence: 6 } },
  { id: 's2b', kind: 'side', req: { field: 2 }, title: '거미줄 걷기', desc: '약초꾼: "약초밭이 거미줄로 덮였어요. 부패한 거미를 없애 주세요."', goal: { type: 'killKey', key: 'corruptSpider', n: 10 }, reward: { gold: 200, exp: 300, item: { grade: 'rare' } } },
  { id: 's2c', kind: 'side', req: { field: 2 }, title: '타락한 동족', desc: '숲의 파수꾼: "한때 우리였던 자들을 편히 보내 주게."', goal: { type: 'killKey', key: 'fallenElf', n: 8 }, reward: { gold: 220, essence: 10 } },
  // ── 사냥터 3
  { id: 's3a', kind: 'side', req: { field: 3 }, title: '멈춘 시계', desc: '시계공: "신전의 수호자가 시간을 비틀고 있소. 그 태엽을 멈춰 주시오."', goal: { type: 'killKey', key: 'timeKeeper', n: 12 }, reward: { gold: 400, exp: 1200, essence: 10 } },
  { id: 's3b', kind: 'side', req: { field: 3 }, title: '골렘 해체', desc: '대장장이: "깨진 골렘의 심장석이 필요해. 넉넉히 부숴 와."', goal: { type: 'killKey', key: 'brokenGolem', n: 10 }, reward: { gold: 450, essence: 18 } },
  { id: 's3c', kind: 'side', req: { field: 3 }, title: '봉인 마법사의 서', desc: '학자: "봉인 마법사들이 지닌 책을 모으고 있소."', goal: { type: 'killKey', key: 'sealMage', n: 10 }, reward: { gold: 450, exp: 1200, item: { grade: 'rare' } } },
  // ── 사냥터 4
  { id: 's4a', kind: 'side', req: { field: 4 }, title: '정찰병 차단', desc: '파수대장: "마계 정찰병이 우리 위치를 넘기고 있다. 막아라."', goal: { type: 'killKey', key: 'demonScout', n: 15 }, reward: { gold: 800, exp: 3000, essence: 15 } },
  { id: 's4b', kind: 'side', req: { field: 4 }, title: '분노의 근원', desc: '사제단: "분노한 악마가 균열을 넓히고 있습니다."', goal: { type: 'killKey', key: 'wrathDemon', n: 12 }, reward: { gold: 900, shard: 2 } },
  { id: 's4c', kind: 'side', req: { field: 4 }, title: '사도의 증표', desc: '촌장: "마왕의 사도를 쓰러뜨렸다는 증표를 가져오게."', goal: { type: 'elites', n: 4 }, reward: { gold: 1000, item: { grade: 'rare' }, shard: 1, keys: 2 } },
  // ── 성장 · 던전
  { id: 'g1', kind: 'side', title: '대장장이의 시험', desc: '대장장이: "강화가 뭔지 보여 주지. 장비 하나를 +3까지 올려 와."', goal: { type: 'enhance', n: 3 }, reward: { gold: 100, essence: 8 } },
  { id: 'g2', kind: 'side', req: { main: 'm1' }, title: '등급을 넘어', desc: '대장장이: "이제 승급이다. 희귀 등급 장비를 하나 만들어 봐."', goal: { type: 'grade', grade: 'rare' }, reward: { gold: 300, essence: 15 } },
  { id: 'g3', kind: 'side', req: { field: 2 }, title: '이름을 알리다', desc: '촌장: "자네 이름이 마을 밖까지 퍼지려면 아직 멀었네." — 주인공 Lv.15 달성', goal: { type: 'level', n: 15 }, reward: { gold: 400, essence: 10 } },
  { id: 'd1', kind: 'side', req: { main: 'm2' }, title: '왕의 무덤', desc: '촌장: "서리 왕의 무덤 끝까지 내려가 보게."', goal: { type: 'dungeon', n: 1 }, reward: { gold: 600, shard: 3, keys: 2 } },
  { id: 'd2', kind: 'side', req: { main: 'm2' }, title: '전설의 무구', desc: '대장장이: "에픽 장비를 하나 손에 넣어 와. 내 눈으로 봐야겠어."', goal: { type: 'grade', grade: 'epic' }, reward: { gold: 1000, essence: 30 } },

  // ── 1.208.0 던전 확장
  { id: 'd3', kind: 'side', req: { main: 'm3' }, title: '광기의 심장', desc: '숲의 파수꾼: "숲 가장 깊은 곳에서 음악이 들린다네. 멈춰 주게."', goal: { type: 'dungeonTier', id: 'forestHeart', tier: 0 }, reward: { gold: 1500, shard: 4, essence: 20, keys: 2 } },
  { id: 'd4', kind: 'side', req: { main: 'm2' }, title: '영웅의 증명', desc: '대장장이: "무덤을 영웅 난이도로 끝까지 내려가면, 진짜 대장장이 일을 보여 주지."', goal: { type: 'dungeonTier', id: 'frostTomb', tier: 1 }, reward: { gold: 1200, shard: 5 } },
  { id: 'd5', kind: 'side', req: { main: 'm3' }, title: '전설이 되다', desc: '촌장: "전설 난이도를 넘은 자는 아직 없다네."', goal: { type: 'dungeonTier', id: 'frostTomb', tier: 2 }, reward: { gold: 3000, shard: 8, item: { grade: 'epic' } } },

  // ── 동료 개인 의뢰 (합류 후) — 보상: 그 동료 능력치 +4 · 스킬 포인트 +1
  { id: 'c_wanderer', kind: 'companion', req: { companion: 'wanderer' }, title: '검이 기억하는 길', desc: '방랑검사: "보이지 않아도 베어 온 수는 기억해. 함께 마흔을 베자."', goal: { type: 'kills', n: 40 }, reward: { gold: 200, growth: { points: 4, sp: 1 } } },
  { id: 'c_sage', kind: 'companion', req: { companion: 'sage' }, title: '꺼지지 않는 불씨', desc: '술법사: "서리 왕의 무덤 냉기, 내 불꽃으로 녹여 보고 싶어~"', goal: { type: 'dungeon', n: 1 }, reward: { gold: 300, growth: { points: 4, sp: 1 } } },
  { id: 'c_demonblood', kind: 'companion', req: { companion: 'demonblood' }, title: '피의 증명', desc: '혼혈 마족: "강한 놈 셋. 내 피가 누구 편인지 보여 줄게."', goal: { type: 'elites', n: 3 }, reward: { gold: 250, growth: { points: 4, sp: 1 } } },
  { id: 'c_elf', kind: 'companion', req: { companion: 'elf' }, title: '숲을 위한 화살', desc: '숲의 정령사: "숲을 더럽힌 것들을 쉰 마리. 바람에게 약속했어요."', goal: { type: 'kills', n: 50 }, reward: { gold: 250, growth: { points: 4, sp: 1 } } },
  { id: 'c_priest', kind: 'companion', req: { companion: 'priest' }, title: '여명의 순례', desc: '여명의 사제: "강적 다섯을 정화하면, 가호가 더 깊어질 거예요."', goal: { type: 'elites', n: 5 }, reward: { gold: 250, growth: { points: 4, sp: 1 } } },
];
