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
  herald: { name: '여명의 전령 세라엘', icon: '✦', color: '#f3e3a8' },
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
      { sp: 'narr', t: '마녀가 사라지자 극지대의 얼음벽 하나가 무너졌다. 녹아내린 물 위로, 마녀가 부리던 혼들이 갈 곳을 잃고 떠돌았다.' },
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
  // ── 2부 던전 개방 (1.214.0)
  {
    id: 'dungeon3_open', title: '빙왕의 심연', bg: './enemies/championship/frost/champ_frost_boss2_intro.jpg',
    when: (s, c) => !!s.progress.bossCleared[6] && c.at === 'town',
    lines: [
      { sp: 'elder', t: '되살아난 동토 아래에 동굴이 열렸다는군. 서리 왕보다 오래된 얼음, 동굴의 빙왕이 거기 있다네.' },
      { sp: 'hero', t: '빛이 깨운 건 용 하나가 아니었군요.' },
    ],
  },
  {
    id: 'dungeon4_open', title: '봉인 성역의 금고', bg: './enemies/championship/sanctum/champ_sanctum_boss3_intro.jpg',
    when: (s, c) => !!s.progress.bossCleared[7] && c.at === 'town',
    lines: [
      { sp: 'herald', t: '…성역의 금고에는 손대지 마라. 그곳에 잠든 것은 너희 같은 자들이 감당할 수 없는 기록이다.' },
      { sp: 'hero', t: '그렇게까지 숨기고 싶은 거라면, 꼭 봐야겠네.' },
    ],
  },
  {
    id: 'dungeon5_open', title: '마왕의 심장', bg: './enemies/championship/rift/champ_rift_boss3_intro.jpg',
    when: (s, c) => !!s.progress.bossCleared[8] && c.at === 'town',
    lines: [
      { sp: 'narr', t: '마왕은 재가 되었지만, 균열 깊은 곳의 심장은 아직 뛰고 있었다. 그리고 그 심장을 노리는 또 다른 마왕이 있었다.' },
    ],
  },
  {
    id: 'dungeon6_open', title: '여명의 정원', bg: './enemies/championship/dawn/champ_dawn_boss3_intro.jpg',
    when: (s, c) => !!s.progress.bossCleared[9] && c.at === 'town',
    lines: [
      { sp: 'elder', t: '첨탑 아래 정원은 신이 쓰러진 뒤에도 빛나고 있다는군. 정원의 마녀가 아직 명령을 기다리고 있대.' },
      { sp: 'hero', t: '그럼 이제 그만 쉬게 해 줘야겠네요.' },
    ],
  },
  // ── 3부 던전 개방 (1.279.1)
  {
    id: 'dungeon7_open', title: '잊힌 왕의 서고', bg: './enemies/championship/memory/p3_m_keeper_intro.jpg',
    when: (s, c) => !!s.progress.bossCleared[10] && c.at === 'town',
    lines: [
      { sp: 'elder', t: '므네메가 쓰러진 자리 아래로 계단이 드러났다네. 서고라더군 — 폐허가 폐허가 되기 전의 기록이 전부 거기 있대.' },
      { sp: 'herald', t: '조심해라. 그곳의 관리자는 칼보다 먼저 네 기억을 노린다. 가장 믿는 기술부터 잊게 될 것이다.' },
      { sp: 'hero', t: '그럼 잊어도 되는 것부터 꺼내 들죠.' },
    ],
  },
  {
    id: 'dungeon8_open', title: '틈새의 밑바닥', bg: './enemies/championship/void/p3_v_heart_intro.jpg',
    when: (s, c) => !!s.progress.bossCleared[11] && c.at === 'town',
    lines: [
      { sp: 'herald', t: '문지기가 지키던 것은 문이 아니었다. 그 아래, 회랑이 꺼져 내리는 밑바닥이다.' },
      { sp: 'elder', t: '내려갔다 온 사냥꾼이 그러더군. 오래 있을수록 손끝부터 흐려진다고.' },
      { sp: 'hero', t: '그럼 오래 있지 않으면 되겠네요.' },
    ],
  },
  {
    id: 'dungeon9_open', title: '최초의 황혼', bg: './enemies/championship/origin/p3_o_first_intro.jpg',
    when: (s, c) => !!s.progress.bossCleared[12] && c.at === 'town',
    lines: [
      { sp: 'narr', t: '아이온이 쓰러진 뒤에도 하늘은 붉었다.' },
      { sp: 'herald', t: '근원보다 먼저 저문 것이 있다. 모든 황혼이 그것을 흉내 냈을 뿐이다.' },
      { sp: 'herald', t: '절반쯤 쓰러뜨렸다고 마음을 놓지 마라. 그때부터가 진짜 모습이다.' },
      { sp: 'hero', t: '…끝을 보러 갑니다.' },
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
  // ───────── 2부 「여명의 배신」 (1.211.0) ─────────
  {
    id: 'p2_prologue', title: '2부 서장 — 너무 밝은 아침', bg: './enemies/championship/dawn/champ_dawn_boss1_intro.jpg',
    when: (s, c) => bossDone(s, 4) && !!s.story.seen.ending && c.at === 'town',
    lines: [
      { sp: 'narr', t: '여명이 돌아온 지 이레. 해는 지지 않았다. 밤이 오지 않는 하늘 아래, 사람들은 잠드는 법을 잊어 갔다.' },
      { sp: 'narr', t: '여드레째 아침, 마을 광장에 빛으로 된 날개가 내려앉았다.' },
      { sp: 'herald', t: '황혼의 땅에 사는 자들이여. 여명의 신께서 너희의 수고를 치하하신다.' },
      { sp: 'herald', t: '그림자를 걷어 낸 대가로, 이 땅을 「정화」하겠노라. 흠 있는 것, 어두운 것, 늙고 병든 것은 모두 빛 속에 녹아 사라지리라.' },
      { sp: 'elder', t: '…정화라니. 그건 우리 모두를 말하는 게 아닌가.' },
      { sp: 'hero', t: '우리가 되찾은 건 여명이 아니었던 건가.' },
      { sp: 'elder', t: '북쪽이 다시 얼어붙고 있다는 소식이 왔네. 이번엔 빛 때문에. 자네가 쓰러뜨린 서리가… 되살아났어.' },
    ],
  },
  {
    id: 'tower_open', title: '황혼의 첨탑', bg: './enemies/championship/dawn/champ_dawn_boss4_intro.jpg',
    when: (s, c) => bossDone(s, 4) && !!s.story.seen.p2_prologue && c.at === 'town',
    lines: [
      { sp: 'elder', t: '마을 동쪽 언덕에 탑 하나가 솟았다네. 꼭대기가 구름 위로 사라져서, 몇 층인지 아무도 몰라.' },
      { sp: 'elder', t: '오를수록 강한 것들이 기다린다지. 열 층마다 문지기가 있고, 그 문지기를 넘으면 거기서 다시 시작할 수 있다고 하더군.' },
      { sp: 'hero', t: '끝이 없는 탑이라… 어디까지 오를 수 있는지 보죠.' },
    ],
  },
  {
    id: 'f5_enter', title: '되살아난 동토', bg: './enemies/championship/frost/champ_frost_boss3_intro.jpg',
    when: (s, c) => c.at === 'field' && c.fieldId === 5,
    lines: [
      { sp: 'narr', t: '하얀 태양 아래서 얼음이 자란다. 녹아야 할 눈이 빛을 받을수록 더 단단해진다.' },
      { sp: 'hero', t: '이 냉기는 마녀의 것과 달라. 따뜻한 빛이 얼음을 만들고 있어.' },
    ],
  },
  {
    id: 'f5_boss', title: '협곡의 한기룡 스칼드라', bg: './enemies/championship/frost/champ_frost_boss3_intro.jpg',
    when: (s, c) => c.at === 'bossPre' && c.fieldId === 5,
    lines: [
      { sp: 'champ_frost_boss3', t: '나는 천 년을 잠들어 있었다. 빛이 나를 깨워 이렇게 속삭이더군 — 「흠 있는 것들을 얼려라」.' },
      { sp: 'champ_frost_boss3', t: '너는 따뜻하구나, 작은 것아. 그러니 가장 먼저 얼어야겠지.' },
    ],
  },
  {
    id: 'f5_clear', title: '얼음 속의 편지', bg: './enemies/championship/frost/champ_frost_boss3_intro.jpg',
    when: (s) => bossDone(s, 5),
    lines: [
      { sp: 'narr', t: '용이 쓰러진 자리, 녹지 않는 얼음 속에 낡은 편지 한 장이 갇혀 있었다.' },
      { sp: 'narr', t: '「여명은 세상을 고치지 않는다. 다시 쓴다. — 첫 번째 봉인자」' },
      { sp: 'hero', t: '첫 번째 봉인자… 신전의 그 봉인자들은, 여명을 막고 있었던 건가.' },
    ],
  },
  {
    id: 'f6_enter', title: '광란의 숲', bg: './enemies/championship/forest/chapter3/champ_forest_witch_intro.jpg',
    when: (s, c) => c.at === 'field' && c.fieldId === 6,
    lines: [
      { sp: 'narr', t: '빛을 너무 많이 받은 숲은 미쳐 버렸다. 꽃은 피자마자 시들고, 나무는 서로의 뿌리를 졸라 죽인다.' },
      { sp: 'hero', t: '어둠이 사라지자 쉴 곳도 사라졌어. 이 숲은 잠들지 못해서 미친 거야.' },
    ],
  },
  {
    id: 'f6_boss', title: '광기의 마녀 벨라도나', bg: './enemies/championship/forest/chapter3/champ_forest_witch_intro.jpg',
    when: (s, c) => c.at === 'bossPre' && c.fieldId === 6,
    lines: [
      { sp: 'champ_forest_witch', t: '밤이 오지 않아. 밤이 오지 않아. 노래를 멈출 수가 없어.' },
      { sp: 'champ_forest_witch', t: '네가 그림자를 죽였지? 그 그림자가 우리를 재워 주던 유일한 이불이었는데!' },
    ],
  },
  {
    id: 'f6_clear', title: '첫 번째 밤', bg: './enemies/championship/forest/chapter3/champ_forest_witch_intro.jpg',
    when: (s) => bossDone(s, 6),
    lines: [
      { sp: 'narr', t: '마녀가 쓰러지며 손바닥만 한 어둠을 풀어 놓았다. 그 그늘 아래서, 숲은 백 일 만에 처음으로 잠들었다.' },
      { sp: 'elder', t: '성역에서 온 순례자가 말하더군. 신전 깊은 곳에 「여명이 봉인한 자들」이 있다고.' },
      { sp: 'hero', t: '여명이 봉인했다…? 신전은 마왕을 가둔 곳이 아니었어요?' },
    ],
  },
  {
    id: 'f7_enter', title: '봉인 성역', bg: './enemies/championship/sanctum/champ_sanctum_boss4_intro.jpg',
    when: (s, c) => c.at === 'field' && c.fieldId === 7,
    lines: [
      { sp: 'narr', t: '금빛 돌로 지은 성역. 벽마다 사람의 얼굴이 새겨져 있고, 그 얼굴들은 모두 눈을 감고 있다.' },
      { sp: 'hero', t: '이건 조각이 아니야… 봉인된 사람들이야.' },
    ],
  },
  {
    id: 'f7_boss', title: '절대봉인의 군주 아르케온', bg: './enemies/championship/sanctum/champ_sanctum_boss4_intro.jpg',
    when: (s, c) => c.at === 'bossPre' && c.fieldId === 7,
    lines: [
      { sp: 'champ_sanctum_boss4', t: '여기 잠든 자들은 모두 여명에 맞선 영웅이었다. 나는 그들을 지키는 것이 아니라 가두는 자다.' },
      { sp: 'champ_sanctum_boss4', t: '신께서 명하셨다. 황혼을 사랑한 자는 영원히 눈뜨지 못하게 하라고.' },
      { sp: 'hero', t: '그럼 나도 여기 새겨질 차례겠네. — 해 보시지.' },
    ],
  },
  {
    id: 'f7_clear', title: '눈을 뜬 영웅들', bg: './enemies/championship/sanctum/champ_sanctum_boss4_intro.jpg',
    when: (s) => bossDone(s, 7),
    lines: [
      { sp: 'narr', t: '군주가 무너지자 벽의 얼굴들이 하나씩 눈을 떴다. 그들은 말없이 한 방향을 가리켰다 — 붉은 균열을.' },
      { sp: 'narr', t: '「해를 삼킨 자는 해를 훔친 것이 아니다. 해가 세상을 태우지 못하게 가려 준 것이다.」' },
      { sp: 'hero', t: '…그럼 내가 쓰러뜨린 그림자는, 우리를 지키던 쪽이었던 거야?' },
    ],
  },
  {
    id: 'f8_enter', title: '핏빛 균열', bg: './enemies/championship/rift/champ_rift_boss4_intro.jpg',
    when: (s, c) => c.at === 'field' && c.fieldId === 8,
    lines: [
      { sp: 'narr', t: '닫혔던 균열이 빛에 찢겨 다시 열렸다. 마계는 불타고 있었다 — 하늘에서 쏟아지는 흰 불길에.' },
      { sp: 'hero', t: '마족들이… 여명의 빛에 쫓기고 있어.' },
    ],
  },
  {
    id: 'f8_boss', title: '마왕의 화신', bg: './enemies/championship/rift/champ_rift_boss4_intro.jpg',
    when: (s, c) => c.at === 'bossPre' && c.fieldId === 8,
    lines: [
      { sp: 'champ_rift_boss4', t: '내 그림자를 벤 것이 너로구나. 원망은 않는다. 너는 몰랐으니까.' },
      { sp: 'champ_rift_boss4', t: '나는 천 년 동안 해를 가려 왔다. 이제 힘이 다했다. 마지막으로 묻겠다 — 네 검이 그 빛을 벨 수 있는지.' },
      { sp: 'hero', t: '증명해 보이죠. 당신을 넘어서.' },
    ],
  },
  {
    id: 'f8_clear', title: '건네받은 밤', bg: './enemies/championship/rift/champ_rift_boss4_intro.jpg',
    when: (s) => bossDone(s, 8),
    lines: [
      { sp: 'champ_rift_boss4', t: '…좋다. 그 검이라면 닿겠지. 내 밤을 가져가라. 첨탑 꼭대기에서, 해를 다시 가려라.' },
      { sp: 'narr', t: '마왕의 몸이 검은 재가 되어 흩어졌다. 손에 남은 한 줌의 어둠이 차갑고, 이상하게 다정했다.' },
      { sp: 'elder', t: '여명의 첨탑… 하늘과 땅을 잇는 그 탑에 신이 있다네. 돌아오게. 꼭 돌아와서, 밤 인사를 해 주게.' },
    ],
  },
  {
    id: 'f9_enter', title: '여명의 첨탑', bg: './enemies/championship/dawn/champ_dawn_boss4_intro.jpg',
    when: (s, c) => c.at === 'field' && c.fieldId === 9,
    lines: [
      { sp: 'narr', t: '끝없는 계단. 한 층 오를 때마다 그림자가 짧아지고, 마침내 발밑의 그림자마저 사라진다.' },
      { sp: 'herald', t: '돌아가라, 황혼의 아이야. 신께서는 너를 미워하지 않으신다. 다만 고쳐 쓰실 뿐이다.' },
      { sp: 'hero', t: '고쳐 쓴 세상에 나는 없겠지. 그러니 사양할게.' },
    ],
  },
  {
    id: 'f9_boss', title: '여명의 신 솔라리온', bg: './enemies/championship/dawn/champ_dawn_boss4_intro.jpg',
    when: (s, c) => c.at === 'bossPre' && c.fieldId === 9,
    lines: [
      { sp: 'champ_dawn_boss4', t: '황혼은 오류다. 저무는 것, 늙는 것, 끝나는 것 — 나는 그것을 지우려 했을 뿐이다.' },
      { sp: 'champ_dawn_boss4', t: '너도 보았지. 밤이 없는 세상을. 그것이 완전함이다.' },
      { sp: 'hero', t: '봤어. 아무도 잠들지 못하는 세상이었지. 끝나지 않는 건 완전한 게 아니야. 그냥 멈춘 거야.' },
    ],
  },
  {
    id: 'ending2', title: '종장 — 황혼과 여명 사이', bg: './enemies/championship/dawn/champ_dawn_boss4_intro.jpg',
    when: (s) => bossDone(s, 9),
    lines: [
      { sp: 'narr', t: '신의 빛이 부서지는 순간, 손에 쥔 마왕의 밤이 하늘로 번져 나갔다. 해는 사라지지 않았다. 다만, 처음으로 기울었다.' },
      { sp: 'narr', t: '그날 저녁, 대륙의 모든 하늘이 붉게 물들었다. 사람들은 그것을 더 이상 두려워하지 않았다.' },
      { sp: 'elder', t: '해가 진다. …이렇게 아름다운 걸, 우린 왜 잊고 살았을까.' },
      { sp: 'hero', t: '내일 또 뜰 테니까요. 지는 걸 알아야 뜨는 것도 반가운 거죠.' },
      { sp: 'narr', t: '여명과 황혼이 번갈아 오는 세상. 그것이 이 연대기가 되찾은 전부였다. — 2부 끝' },
    ],
  },
  // ── 3부 「황혼 너머」 (1.222.0) — 전승한 캐릭터만
  {
    id: 'p3_prologue', title: '3부 서장 — 두 번째 아침', bg: './enemies/championship/memory/p3_m_boss_intro.jpg',
    when: (s, c) => c.at === 'town' && bossDone(s, 9) && (s.units[s.hero]?.rebirth?.count || 0) >= 1,
    lines: [
      { sp: 'narr', t: '눈을 떴을 때, 손은 처음 검을 쥐던 그날처럼 가벼웠다. 그러나 손바닥에는 백 번의 싸움이 남긴 굳은살이 그대로였다.' },
      { sp: 'elder', t: '자네… 젊어졌군. 아니, 처음부터 다시 걷기로 한 건가.' },
      { sp: 'hero', t: '해가 기울기 시작한 뒤로, 하늘 저편에 틈이 보여요. 황혼 너머에 뭔가 있어요.' },
      { sp: 'herald', t: '…나도 보았다. 신이 무너진 날, 여명의 뒤편이 갈라졌다. 그 너머는 아무도 기억하지 못하는 곳이다.' },
      { sp: 'narr', t: '잊힌 자들의 폐허, 형체 없는 회랑, 그리고 모든 황혼이 태어난 근원. 연대기는 아직 끝나지 않았다.' },
    ],
  },
  {
    id: 'f10_enter', title: '기억의 폐허', bg: './enemies/championship/memory/p3_m_boss_intro.jpg',
    when: (s, c) => c.at === 'field' && c.fieldId === 10,
    lines: [
      { sp: 'narr', t: '부서진 성벽마다 낯익은 얼굴이 새겨져 있다. 쓰러뜨린 적들, 지키지 못한 사람들 — 모두 잊혀 가는 중이었다.' },
      { sp: 'hero', t: '여기 있는 건… 내가 지나온 길이야.' },
    ],
  },
  {
    id: 'f10_boss', title: '기억의 군주', bg: './enemies/championship/memory/p3_m_boss_intro.jpg',
    when: (s, c) => c.at === 'bossPre' && c.fieldId === 10,
    lines: [
      { sp: 'p3_m_boss', t: '다시 태어난 자여. 너는 이미 모든 것을 잊었어야 했다. 왜 기억을 붙들고 돌아왔느냐.' },
      { sp: 'hero', t: '잊으면 같은 실수를 하니까. 이번엔 끝까지 기억할 거야.' },
    ],
  },
  {
    id: 'f10_clear', title: '되찾은 이름', bg: './enemies/championship/memory/p3_m_boss_intro.jpg',
    when: (s) => bossDone(s, 10),
    lines: [
      { sp: 'narr', t: '므네메가 흩어지자 폐허의 얼굴들이 하나씩 눈을 감았다. 편안한 얼굴이었다.' },
      { sp: 'herald', t: '회랑이 열렸다. 저 너머는 형체조차 없다. 조심해라.' },
    ],
  },
  {
    id: 'f11_enter', title: '공허의 회랑', bg: './enemies/championship/void/p3_v_boss_intro.jpg',
    when: (s, c) => c.at === 'field' && c.fieldId === 11,
    lines: [
      { sp: 'narr', t: '발밑이 없다. 그런데도 걸을 수 있다. 회랑은 걷는 자가 믿는 만큼만 존재했다.' },
      { sp: 'hero', t: '믿어야 길이 생긴다면… 지금까지랑 다를 것도 없네.' },
    ],
  },
  {
    id: 'f11_boss', title: '공허의 문지기', bg: './enemies/championship/void/p3_v_boss_intro.jpg',
    when: (s, c) => c.at === 'bossPre' && c.fieldId === 11,
    lines: [
      { sp: 'p3_v_boss', t: '이 문 너머는 처음이자 끝이다. 황혼이 태어난 곳. 들어간 자는 아무도 같은 모습으로 나오지 못했다.' },
      { sp: 'hero', t: '그럼 다른 모습으로라도 나올게.' },
    ],
  },
  {
    id: 'f11_clear', title: '열린 문', bg: './enemies/championship/void/p3_v_boss_intro.jpg',
    when: (s) => bossDone(s, 11),
    lines: [
      { sp: 'narr', t: '문지기의 검이 부러지는 소리와 함께, 회랑 끝에서 노을빛이 쏟아져 들어왔다.' },
      { sp: 'elder', t: '(멀리서 들리는 목소리) …돌아오게. 노을이 질 때까지는 꼭 돌아오게.' },
    ],
  },
  {
    id: 'f12_enter', title: '황혼의 근원', bg: './enemies/championship/origin/p3_o_boss_intro.jpg',
    when: (s, c) => c.at === 'field' && c.fieldId === 12,
    lines: [
      { sp: 'narr', t: '세상의 모든 해가 여기서 저물고, 여기서 다시 떠올랐다. 하늘과 땅의 구분이 없는 금빛 바다.' },
      { sp: 'herald', t: '이곳이 신조차 손대지 못한 곳이다. 너는… 무엇을 하러 왔지?' },
      { sp: 'hero', t: '확인하러. 황혼이 정말 끝나지 않는 건지.' },
    ],
  },
  {
    id: 'f12_boss', title: '황혼의 근원 아이온', bg: './enemies/championship/origin/p3_o_boss_intro.jpg',
    when: (s, c) => c.at === 'bossPre' && c.fieldId === 12,
    lines: [
      { sp: 'p3_o_boss', t: '나는 끝이자 시작. 너희가 황혼이라 부르는 것. 나를 쓰러뜨리면 다시는 해가 지지 않을 것이다.' },
      { sp: 'hero', t: '거짓말. 너는 그냥 지는 게 무서운 거야. …나도 그랬어. 그래서 몇 번이고 다시 태어났지.' },
    ],
  },
  {
    id: 'ending3', title: '종장 — 황혼 너머', bg: './enemies/championship/origin/p3_o_boss_intro.jpg',
    when: (s) => bossDone(s, 12),
    lines: [
      { sp: 'narr', t: '근원이 부서진 자리에서, 해는 여전히 기울었다. 아이온의 말은 거짓이었다. 끝은 사라지지 않았다. 다만 두렵지 않게 되었을 뿐.' },
      { sp: 'herald', t: '여명의 전령으로서 마지막 말을 하마. …수고했다, 황혼의 아이야.' },
      { sp: 'elder', t: '돌아왔구먼. 저녁 먹고 가게. 오늘 노을이 유난히 곱다네.' },
      { sp: 'narr', t: '몇 번을 다시 태어나도, 저녁은 온다. 그것이 이 연대기가 마지막으로 배운 것이었다. — 3부 끝' },
    ],
  },
  {
    id: 'dungeon_clear', title: '서리 왕의 무구', bg: './enemies/championship/frost/champ_frost_boss4_intro.jpg',
    when: (s) => (s.progress.dungeonClears || 0) >= 1,
    lines: [
      { sp: 'champ_frost_boss4', t: '…왕의 무구를… 탐하는 자여… 그 냉기를… 견딜 수 있겠느냐…' },
      { sp: 'narr', t: '절대영도의 여제가 무너지고, 무덤 깊은 곳의 관이 열렸다. 차가운 빛이 손끝을 타고 올라온다.' },
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

  // ── 2부 메인 (1.211.0)
  { id: 'm5', kind: 'main', req: { main: 'm4' }, title: '되살아난 서리', desc: '빛에 깨어난 협곡의 한기룡을 쓰러뜨려라.', goal: { type: 'boss', field: 5 }, reward: { gold: 2500, essence: 30, shard: 4, keys: 2 } },
  { id: 'm6', kind: 'main', req: { main: 'm5' }, title: '잠들지 못하는 숲', desc: '광란의 숲에서 노래를 멈추지 못하는 마녀를 쉬게 하라.', goal: { type: 'boss', field: 6 }, reward: { gold: 3500, essence: 40, shard: 5, item: { grade: 'epic' } } },
  { id: 'm7', kind: 'main', req: { main: 'm6' }, title: '눈 감은 영웅들', desc: '봉인 성역의 군주를 쓰러뜨리고 갇힌 자들을 깨워라.', goal: { type: 'boss', field: 7 }, reward: { gold: 5000, essence: 50, shard: 6, keys: 3 } },
  { id: 'm8', kind: 'main', req: { main: 'm7' }, title: '해를 가린 자', desc: '핏빛 균열 깊은 곳의 마왕을 만나 그 검을 증명하라.', goal: { type: 'boss', field: 8 }, reward: { gold: 7000, essence: 60, shard: 8, item: { grade: 'epic' } } },
  { id: 'm9', kind: 'main', req: { main: 'm8' }, title: '황혼과 여명 사이', desc: '여명의 첨탑 꼭대기에서 신을 쓰러뜨리고 밤을 되돌려라.', goal: { type: 'boss', field: 9 }, reward: { gold: 12000, essence: 100, shard: 15, item: { grade: 'epic' } } },
  // ── 3부 의뢰 (1.222.0 — 전승 1회 이상)
  { id: 'm10', kind: 'main', req: { main: 'm9', rebirth: 1 }, title: '잊힌 자들의 왕', desc: '기억의 폐허 끝에서 기억의 군주 므네메를 쓰러뜨려라.', goal: { type: 'boss', field: 10 }, reward: { gold: 20000, essence: 150, shard: 20, item: { grade: 'epic' } } },
  { id: 'm11', kind: 'main', req: { main: 'm10', rebirth: 1 }, title: '문 너머', desc: '공허의 회랑을 지키는 문지기 네하르를 넘어서라.', goal: { type: 'boss', field: 11 }, reward: { gold: 30000, essence: 200, shard: 25, item: { grade: 'epic' } } },
  { id: 'm12', kind: 'main', req: { main: 'm11', rebirth: 1 }, title: '황혼 너머', desc: '모든 황혼의 근원, 아이온과 마주하라.', goal: { type: 'boss', field: 12 }, reward: { gold: 50000, essence: 300, shard: 40, item: { grade: 'epic' } } },
  { id: 's10a', kind: 'side', req: { field: 10, rebirth: 1 }, title: '메아리를 잠재우다', desc: '여명의 전령: "폐허의 늑대들은 울음을 멈추지 않는다. 그건 누군가의 기억이다."', goal: { type: 'killKey', key: 'p3_m_wolf', n: 30 }, reward: { gold: 8000, exp: 400000, essence: 60 } },
  { id: 's11a', kind: 'side', req: { field: 11, rebirth: 1 }, title: '형체 없는 것들', desc: '여명의 전령: "회랑의 그림자는 베어도 돌아온다. 끝까지 베어라."', goal: { type: 'killKey', key: 'p3_v_shade', n: 30 }, reward: { gold: 10000, exp: 600000, shard: 10, keys: 2 } },
  { id: 's12a', kind: 'side', req: { field: 12, rebirth: 1 }, title: '근원의 파편', desc: '대장장이: "그 파편 하나면 전설을 벼를 수 있어. 아니, 전설보다 뜨거운 걸."', goal: { type: 'killKey', key: 'p3_o_shard', n: 30 }, reward: { gold: 15000, exp: 800000, shard: 20, essence: 100 } },
  // ── 3부 의뢰 확장 (1.279.1) — 지역당 처치 2 · 강적 1 · 던전 1 + 던전 전설 3
  { id: 's10b', kind: 'side', req: { field: 10, rebirth: 1 }, title: '녹슨 맹세', desc: '여명의 전령: "흐려진 기사들은 누구를 지키는지도 잊었다. 그 맹세를 풀어 줘라."', goal: { type: 'killKey', key: 'p3_m_knight', n: 30 }, reward: { gold: 9000, exp: 450000, essence: 60 } },
  { id: 's10c', kind: 'side', req: { field: 10, rebirth: 1 }, title: '기억을 먹는 것', desc: '촌장: "자네, 어제 일을 기억하나? …포식자가 마을 가까이 왔다는 뜻이야."', goal: { type: 'killKey', key: 'p3_m_eater', n: 30 }, reward: { gold: 9000, exp: 450000, keys: 2 } },
  { id: 's10d', kind: 'side', req: { field: 10, rebirth: 1 }, title: '폐허의 거상들', desc: '여명의 전령: "거상과 마녀가 폐허의 길목을 막고 있다. 강한 것부터 쓰러뜨려라."', goal: { type: 'elites', n: 12 }, reward: { gold: 12000, shard: 12, essence: 80 } },
  { id: 'd11', kind: 'side', req: { field: 11, rebirth: 1 }, title: '지워진 기록', desc: '촌장: "폐허 아래 서고에 우리 마을의 첫 기록이 있다더군. 관리자가 그걸 지우기 전에 가 보게."', goal: { type: 'dungeonTier', id: 'memoryArchive', tier: 0 }, reward: { gold: 15000, shard: 15, essence: 100, keys: 2 } },
  { id: 's11b', kind: 'side', req: { field: 11, rebirth: 1 }, title: '틈새의 주문', desc: '여명의 전령: "틈새 술사들이 회랑을 넓히고 있다. 주문이 끝나기 전에 끊어라."', goal: { type: 'killKey', key: 'p3_v_caster', n: 30 }, reward: { gold: 11000, exp: 650000, essence: 70 } },
  { id: 's11c', kind: 'side', req: { field: 11, rebirth: 1 }, title: '보이지 않는 사냥', desc: '촌장: "발소리만 들리고 모습은 없다네. 무형의 사냥개라고들 하지."', goal: { type: 'killKey', key: 'p3_v_hound', n: 30 }, reward: { gold: 11000, exp: 650000, keys: 2 } },
  { id: 's11d', kind: 'side', req: { field: 11, rebirth: 1 }, title: '회랑의 집행자들', desc: '여명의 전령: "집행자와 포식자는 문지기의 손발이다. 먼저 잘라 내라."', goal: { type: 'elites', n: 14 }, reward: { gold: 15000, shard: 15, essence: 100 } },
  { id: 'd12', kind: 'side', req: { field: 12, rebirth: 1 }, title: '밑바닥에서 뛰는 것', desc: '여명의 전령: "회랑 아래에서 무언가 뛰고 있다. 공허에도 심장이 있다면, 멈춰야 한다."', goal: { type: 'dungeonTier', id: 'voidDepths', tier: 0 }, reward: { gold: 20000, shard: 20, essence: 120, keys: 2 } },
  { id: 's12b', kind: 'side', req: { field: 12, rebirth: 1 }, title: '종말을 모는 자들', desc: '촌장: "기수들이 지나간 자리엔 저녁도 오지 않는다네. 낮도 밤도 아닌 채로."', goal: { type: 'killKey', key: 'p3_o_rider', n: 30 }, reward: { gold: 16000, exp: 850000, essence: 100 } },
  { id: 's12c', kind: 'side', req: { field: 12, rebirth: 1 }, title: '황혼의 사도', desc: '여명의 전령: "사도들은 아직도 근원을 섬긴다. 섬길 것이 사라졌다는 걸 알려 줘라."', goal: { type: 'killKey', key: 'p3_o_apostle', n: 30 }, reward: { gold: 16000, exp: 850000, keys: 3 } },
  { id: 's12d', kind: 'side', req: { field: 12, rebirth: 1 }, title: '근원의 눈', desc: '여명의 전령: "화신과 감시자가 너를 지켜보고 있다. 눈부터 감겨라."', goal: { type: 'elites', n: 16 }, reward: { gold: 20000, shard: 20, item: { grade: 'epic' } } },
  { id: 'd13', kind: 'side', req: { field: 13, rebirth: 1 }, title: '첫 번째 저녁', desc: '여명의 전령: "아이온은 근원이 아니었다. 그보다 먼저 저문 것이 있다 — 최초의 황혼이다."', goal: { type: 'dungeonTier', id: 'firstDusk', tier: 0 }, reward: { gold: 30000, shard: 30, essence: 200, item: { grade: 'epic' } } },
  { id: 'd14', kind: 'side', req: { field: 11, rebirth: 1 }, title: '봉인되지 않는 기억', desc: '촌장: "관리자가 가장 깊이 숨긴 기록이 있다더군." — 잊힌 왕의 서고 전설 클리어', goal: { type: 'dungeonTier', id: 'memoryArchive', tier: 2 }, reward: { gold: 40000, shard: 40, essence: 250, keys: 3 } },
  { id: 'd15', kind: 'side', req: { field: 12, rebirth: 1 }, title: '지워지지 않는 몸', desc: '여명의 전령: "밑바닥 끝까지 내려가고도 돌아온 자는 없다." — 틈새의 밑바닥 전설 클리어', goal: { type: 'dungeonTier', id: 'voidDepths', tier: 2 }, reward: { gold: 55000, shard: 50, essence: 300, keys: 3 } },
  { id: 'd16', kind: 'side', req: { field: 13, rebirth: 1 }, title: '황혼을 끝낸 자', desc: '여명의 전령: "진짜 모습을 드러낸 첫 황혼을 쓰러뜨려라. 그 뒤엔 아무도 가 보지 못했다." — 최초의 황혼 전설 클리어', goal: { type: 'dungeonTier', id: 'firstDusk', tier: 2 }, reward: { gold: 80000, shard: 80, essence: 500, item: { grade: 'epic' } } },
  // ── 2부 의뢰
  { id: 's5a', kind: 'side', req: { field: 5 }, title: '빛의 서리', desc: '양치기 노인: "다시 늑대가 내려왔어. 이번엔 눈이 하얗게 빛나."', goal: { type: 'killKey', key: 'champ_frost_wolf', n: 15 }, reward: { gold: 1500, exp: 20000, essence: 15 } },
  { id: 's5b', kind: 'side', req: { field: 5 }, title: '얼어붙은 망자', desc: '사냥꾼: "얼음 속에서 걸어 나오는 시체들… 내 형도 그 안에 있었어."', goal: { type: 'killKey', key: 'champ_frost_revenant', n: 15 }, reward: { gold: 1600, item: { grade: 'rare' }, keys: 1 } },
  { id: 's5c', kind: 'side', req: { field: 5 }, title: '서리의 사도들', desc: '파수대장: "빙룡과 대마법사가 정찰대를 몰살시켰다."', goal: { type: 'elites', n: 6 }, reward: { gold: 2000, shard: 3, essence: 15 } },
  { id: 's6a', kind: 'side', req: { field: 6 }, title: '잠들지 못한 짐승', desc: '나무꾼: "표범들이 밤낮없이 울부짖어. 차라리 편히 보내 줘."', goal: { type: 'killKey', key: 'champ_forest_leopard', n: 18 }, reward: { gold: 2000, exp: 30000, essence: 20 } },
  { id: 's6b', kind: 'side', req: { field: 6 }, title: '가시 덩굴 살수', desc: '약초꾼: "덩굴이 사람을 사냥해요. 약초밭이 무덤이 됐어요."', goal: { type: 'killKey', key: 'champ_forest_thornling', n: 15 }, reward: { gold: 2200, item: { grade: 'rare' }, keys: 1 } },
  { id: 's6c', kind: 'side', req: { field: 6 }, title: '광기의 우두머리', desc: '숲의 파수꾼: "광기에 물든 것 중에서도 가장 큰 놈들을 쓰러뜨려 주게."', goal: { type: 'elites', n: 7 }, reward: { gold: 2600, shard: 4, essence: 20 } },
  { id: 's7a', kind: 'side', req: { field: 7 }, title: '봉인사의 열쇠', desc: '순례자: "봉인사들이 지닌 금 열쇠로 벽의 얼굴들을 풀 수 있을지도 몰라요."', goal: { type: 'killKey', key: 'champ_sanctum_acolyte', n: 20 }, reward: { gold: 2800, exp: 40000, essence: 25 } },
  { id: 's7b', kind: 'side', req: { field: 7 }, title: '회랑의 감시자', desc: '학자: "감시자의 눈을 가져오게. 봉인 문자의 비밀이 거기 있을 걸세."', goal: { type: 'killKey', key: 'champ_sanctum_warden', n: 18 }, reward: { gold: 3000, item: { grade: 'rare' }, keys: 2 } },
  { id: 's7c', kind: 'side', req: { field: 7 }, title: '봉인의 폭군들', desc: '깨어난 영웅: "우리를 가둔 자들의 장수들이 아직 성역을 돌고 있다."', goal: { type: 'elites', n: 8 }, reward: { gold: 3500, shard: 5, essence: 25 } },
  { id: 's8a', kind: 'side', req: { field: 8 }, title: '도망치는 마족', desc: '깨어난 영웅: "빛에 쫓기는 마족들이 미쳐 날뛴다. 괴롭게 두지 마라."', goal: { type: 'killKey', key: 'champ_rift_devourer', n: 20 }, reward: { gold: 3800, exp: 60000, essence: 30 } },
  { id: 's8b', kind: 'side', req: { field: 8 }, title: '균열의 암살자', desc: '파수대장: "암살자들이 우리 진영 안까지 들어왔다."', goal: { type: 'killKey', key: 'champ_rift_assassin', n: 20 }, reward: { gold: 4000, item: { grade: 'rare' }, keys: 2 } },
  { id: 's8c', kind: 'side', req: { field: 8 }, title: '절대 사도', desc: '촌장: "마왕을 만나려면 그 앞을 지키는 사도들부터 넘어야 하네."', goal: { type: 'elites', n: 9 }, reward: { gold: 4500, shard: 6, essence: 30 } },
  { id: 's9a', kind: 'side', req: { field: 9 }, title: '빛의 성전사', desc: '깨어난 영웅: "첨탑의 성전사들은 한때 우리 동료였다. 끝을 내 주게."', goal: { type: 'killKey', key: 'champ_dawn_paladin', n: 25 }, reward: { gold: 5000, exp: 80000, essence: 40 } },
  { id: 's9b', kind: 'side', req: { field: 9 }, title: '여명의 신탁', desc: '학자: "신탁자들이 무엇을 예언하는지 알아야 하네."', goal: { type: 'killKey', key: 'champ_dawn_oracle', n: 22 }, reward: { gold: 5500, item: { grade: 'epic' }, keys: 2 } },
  { id: 's9c', kind: 'side', req: { field: 9 }, title: '첨탑의 수호자들', desc: '촌장: "신에게 닿기 전에, 그 날개들을 하나씩 꺾게."', goal: { type: 'elites', n: 10 }, reward: { gold: 6000, shard: 8, essence: 40 } },
  { id: 'g4', kind: 'side', req: { field: 6 }, title: '이름이 전설이 되다', desc: '촌장: "이제 자네 이름을 모르는 사람이 없네." — 주인공 Lv.75 달성', goal: { type: 'level', n: 75 }, reward: { gold: 5000, essence: 40, keys: 2 } },
  // ── 무한 탑 (1.215.0)
  { id: 't1', kind: 'side', req: { field: 5 }, title: '첨탑의 문지기', desc: '촌장: "첨탑 10층의 문지기를 넘어 보게."', goal: { type: 'tower', n: 10 }, reward: { gold: 2000, essence: 20, keys: 1 } },
  { id: 't2', kind: 'side', req: { field: 7 }, title: '구름 위로', desc: '촌장: "30층이면 구름 위라던데, 거기서 마을이 보이는가?"', goal: { type: 'tower', n: 30 }, reward: { gold: 6000, shard: 8, essence: 40 } },
  { id: 't3', kind: 'side', req: { main: 'm9' }, title: '끝없는 계단', desc: '깨어난 영웅: "50층. 우리 중 누구도 거기까지 가지 못했다."', goal: { type: 'tower', n: 50 }, reward: { gold: 15000, shard: 20, item: { grade: 'epic' } } },
  // ── 2부 던전 (1.214.0)
  { id: 'd6', kind: 'side', req: { field: 7 }, title: '심연의 왕좌', desc: '사냥꾼: "동굴의 빙왕을 쓰러뜨리면 동토가 다시 녹을지도 몰라."', goal: { type: 'dungeonTier', id: 'frostAbyss', tier: 0 }, reward: { gold: 4000, shard: 6, essence: 30, keys: 2 } },
  { id: 'd7', kind: 'side', req: { field: 8 }, title: '금고의 기록', desc: '학자: "성역의 금고에 무엇이 적혀 있는지 알아야 하네."', goal: { type: 'dungeonTier', id: 'sanctumVault', tier: 0 }, reward: { gold: 5500, shard: 8, essence: 40, keys: 2 } },
  { id: 'd8', kind: 'side', req: { field: 9 }, title: '두 번째 마왕', desc: '깨어난 영웅: "심장을 노리는 자를 막아야 한다. 그것이 마왕의 유언이었다."', goal: { type: 'dungeonTier', id: 'riftHeart', tier: 0 }, reward: { gold: 7000, shard: 10, item: { grade: 'epic' } } },
  { id: 'd9', kind: 'side', req: { main: 'm9' }, title: '정원을 닫다', desc: '촌장: "정원의 마녀를 쉬게 해 주게. 그게 진짜 마지막 일일 걸세."', goal: { type: 'dungeonTier', id: 'dawnGarden', tier: 0 }, reward: { gold: 10000, shard: 15, item: { grade: 'epic' }, keys: 3 } },
  { id: 'd10', kind: 'side', req: { main: 'm9' }, title: '여명보다 밝게', desc: '대장장이: "정원을 전설 난이도로 넘으면, 그건 대장장이도 못 만드는 전설이지."', goal: { type: 'dungeonTier', id: 'dawnGarden', tier: 2 }, reward: { gold: 20000, shard: 25, item: { grade: 'epic' } } },
  // ── 1.208.0 던전 확장
  { id: 'd3', kind: 'side', req: { main: 'm3' }, title: '광기의 심장', desc: '숲의 파수꾼: "숲 가장 깊은 곳에서 음악이 들린다네. 멈춰 주게."', goal: { type: 'dungeonTier', id: 'forestHeart', tier: 0 }, reward: { gold: 1500, shard: 4, essence: 20, keys: 2 } },
  { id: 'd4', kind: 'side', req: { main: 'm2' }, title: '영웅의 증명', desc: '대장장이: "무덤을 영웅 난이도로 끝까지 내려가면, 진짜 대장장이 일을 보여 주지."', goal: { type: 'dungeonTier', id: 'frostTomb', tier: 1 }, reward: { gold: 1200, shard: 5 } },
  { id: 'd5', kind: 'side', req: { main: 'm3' }, title: '전설이 되다', desc: '촌장: "전설 난이도를 넘은 자는 아직 없다네."', goal: { type: 'dungeonTier', id: 'frostTomb', tier: 2 }, reward: { gold: 3000, shard: 8, item: { grade: 'epic' } } },

];
