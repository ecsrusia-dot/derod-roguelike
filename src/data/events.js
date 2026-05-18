// =========== 사건 (텍스트 이벤트) ===========
// id: 고유 식별자
// title: 이벤트 제목
// text: 이벤트 본문 (\n으로 줄바꿈)
// chapter: 등장 챕터 (배열, [1,2] 처럼 여러 챕터 가능)
// choices: 선택지 배열
//   - text: 선택지 표시 텍스트
//   - cost: { gold: N } 처럼 비용 (있으면 비용 차감 후 진행)
//   - stat: 능력 검정 (예: '매력', '지능')
//   - dc: 검정 난이도 (성공 = 능력치 + 1d6 >= dc)
//   - success/fail: 검정 결과별 분기 (text/reward/penalty/combat)
//   - result: 검정 없이 즉시 결과 텍스트
//   - reward: { type, value, name, ... } 보상
//   - penalty: { hp: -30 } 등 페널티
//   - combat: 'enemyKey' 강제 전투 발생
//
// reward.type 종류:
//   - 'gold' / 'gem' / 'heal' / 'heal_full'
//   - 'random_relic' (랜덤 유물 1개)
//   - 'skill_random_lv' (보유 패시브 中 랜덤 +1Lv)
//   - 'skill_specific' (특정 패시브 +1Lv) — name 필요
//   - 'stat' (능력치 +X) — name, value 필요
export const EVENTS = [
  // === 튜토리얼 2 (황혼의 시장) 전용 사건 ===
  {
    id: 'tutorial_silver_grant',
    title: '길 잃은 행상',
    text: '저잣거리 어귀에서 한 행상이 손짓한다.\n"여행자여, 무거운 짐을 좀 들어줄 수 있겠나? 사례는 두둑이 하지."\n그가 건넨 가죽 주머니에는 은화가 가득 들어 있다.',
    chapter: ['tutorial_market'],
    tutorialGift: true,  // 강제 트리거 전용 — 랜덤 풀에서 제외
    choices: [
      {
        text: '은화 주머니를 받는다 (+250 은화)',
        result: '주머니의 은화 250냥이 손에 쥐어진다.\n곧 시장의 상점이 보일 것이다.',
        reward: { type: 'gold', value: 250 },
      },
    ],
  },
  {
    id: 'tutorial_relic_grant',
    title: '버려진 유물',
    text: '길섶에 누군가 떨어뜨린 듯한 작은 꾸러미가 놓여 있다.\n조심스레 열어보자, 옅은 빛을 내뿜는 유물 하나가 모습을 드러낸다.\n"……이건, 길 잃은 자의 행운인가."',
    chapter: ['tutorial_market'],
    tutorialGift: true,
    choices: [
      {
        text: '유물을 거둔다 (랜덤 유물 +1)',
        result: '유물이 짐 속으로 들어간다.\n앞쪽 대장간에서 무언가에 쓸 수 있을지도 모른다.',
        reward: { type: 'random_relic' },
      },
    ],
  },
  // === 튜토리얼 3 (갈림길의 시험) 전용 사건 ===
  {
    id: 'tutorial_farsight_grant',
    title: '오래된 망원경',
    text: '낡은 망원경이 풀숲에 묻혀 있다.\n렌즈를 닦아 멀리 들여다보자, 갈라지는 세 길의 끝이 또렷이 비친다.\n"……이걸 챙기면 앞길이 보이겠군."',
    chapter: ['tutorial_branching'],
    tutorialGift: true,
    choices: [
      {
        text: '망원경(천리안)을 거둔다',
        result: '천리안이 손에 들어왔다.\n이제 맵의 모든 노드가 미리 공개된다. 어느 갈래로 갈지 직접 정할 수 있다.',
        reward: { type: 'specific_relic', relicName: '천리안' },
      },
    ],
  },
  {
    id: 'merchant',
    title: '봉인된 신전 의문의 행상',
    text: '어둠 속에서 등이 굽은 노인이 손짓한다. 그의 마차에는 낡은 유물들이 가득하다.\n"용감한 자여, 내 물건을 보겠는가?"',
    chapter: [3],
    choices: [
      {
        text: '거래에 응한다 (은화 300)',
        cost: { gold: 300 },
        result: '알 수 없는 유물 손에 쥐어진다.',
        reward: { type: 'random_relic' }
      },
      {
        text: '의심스럽다, 떠난다',
        result: '노인의 시선을 등 뒤로 한다.',
        reward: null
      },
      {
        text: '정신을 홀린 뒤 짐을 뒤진다. (매력 검정)',
        stat: '매력', dc: 20,
        success: { text: '노인의 정신을 뒤흔든다. 짐을 챙겨 달아난다.', reward: { type: 'gold', value: 100 } },
        fail: { text: '노인이 뼈를 드러낸다. 망자였다!', combat: 'wraith', penalty: { hp: -50 } }
      },
    ],
  },
  {
    id: 'shrine',
    title: '버려진 신전',
    text: '얼어붙은 돌계단 위에 작은 신전. 여명의 표식이 새겨져 있다.\n무언가가 당신을 부르는 듯하다.',
    chapter: [1, 2, 3],
    choices: [
      {
        text: '기도를 올린다 (지능 검정)',
        stat: '지능', dc: 19,
        success: { text: '여명의 가호가 손에 깃든다.', reward: { type: 'skill_random_lv', axis: 'utility' } },
        fail: { text: '응답이 없다. 차가운 침묵만이.', penalty: null }
      },
      {
        text: '제단을 뒤진다',
        result: '잊혀진 보물을 찾아낸다.',
        reward: { type: 'gold', value: 60 }
      },
      {
        text: '돌아간다',
        result: '신성한 곳을 건드리지 않기로 한다.',
        reward: null
      },
    ],
  },
  {
    id: 'corpse',
    title: '얼어붙은 시체',
    text: '눈 속에 반쯤 묻힌 원정대원의 시체. 손에 쥔 일지가 보인다.\n그의 마지막 기록이 희미하게 남아있다.',
    chapter: [1],
    choices: [
      {
        text: '일지를 읽는다',
        result: '북부의 위험에 대한 단서를 얻는다.',
        reward: { type: 'stat', name: '지력', value : 2 }
      },
      {
        text: '장비를 챙긴다',
        result: '낡았지만 쓸만한 장비.',
        reward: { type: 'gold', value: 40 }
      },
      {
        text: '경의를 표한다 (매력)',
        stat: '매력', dc: 17,
        success: { text: '동료의 영혼이 가호를 내린다.', reward: { type: 'heal', value: 50 } },
        fail: { text: '시체는 그저 차가울 뿐.', penalty: null }
      },
    ],
  },
  // === 챕터 2 추가 사건 예시 ===
  {
    id: 'forestPath',
    title: '갈림길의 정령',
    text: '숲 속 갈림길에서 빛나는 정령이 나타난다.\n"가는 길을 알려주마. 그러나 대가가 필요하지."',
    chapter: [2, 3],
    choices: [
      {
        text: '체력으로 답한다 (HP -20)',
        result: '정령이 만족하며 사라진다. 옳은 길이 보인다.',
        reward: { type: 'gem', value: 5 },
        penalty: { hp: -20 }
      },
      {
        text: '은화로 답한다 (은화 -80)',
        cost: { gold: 80 },
        result: '정령이 길을 안내한다.',
        reward: { type: 'skill_random_lv' }
      },
      {
        text: '거절한다 (지능 검정)',
        stat: '지능', dc: 15,
        success: { text: '정령의 환영을 꿰뚫어본다.', reward: { type: 'gold', value: 100 } },
        fail: { text: '환영에 휩쓸려 길을 잃는다.', penalty: { hp: -30 } }
      },
    ],
  },
  
  // === 챕터 1 (북부) 추가 사건 ===
  {
    id: 'frozenCave',
    title: '얼어붙은 동굴 입구',
    text: '거대한 빙벽이 갈라진 틈. 안에서 차가운 바람이 불어온다.\n무언가가 안에 잠들어 있는 듯하다.',
    chapter: [1],
    choices: [
      {
        text: '안으로 들어간다 (근력 검정)',
        stat: '근력', dc: 13,
        success: { text: '얼음을 뚫고 들어가 잊혀진 보물을 찾는다.', reward: { type: 'random_relic' } },
        fail: { text: '얼음이 무너져 깔린다.', penalty: { hp: -25 } }
      },
      { text: '우회한다', result: '안전한 길을 택한다.', reward: null },
      {
        text: '입구에서 살핀다 (심안 검정)',
        stat: '지능', dc: 12,
        success: { text: '안에 있는 보물을 발견한다.', reward: { type: 'gold', value: 70 } },
        fail: { text: '아무것도 보이지 않는다.', penalty: null }
      },
    ],
  },
  {
    id: 'frozenCorpse',
    title: '얼어붙은 시신',
    text: '눈 속에 박힌 시신. 이전 원정대의 일원이었을까. 손에는 무언가가 쥐어져 있다.',
    chapter: [1, 2],
    choices: [
      { text: '시신을 뒤진다', result: '낡은 지갑을 챙긴다.', reward: { type: 'gold', value: 40 } },
      {
        text: '예의를 갖춰 묻어준다 (매력 검정)',
        stat: '매력', dc: 12,
        success: { text: '망자의 영혼이 가호를 내린다.', reward: { type: 'heal', value: 30 } },
        fail: { text: '얼어붙은 땅이 너무 단단하다.', penalty: null }
      },
      { text: '지나친다', result: '추위 속에 발걸음을 옮긴다.', reward: null },
    ],
  },
  {
    id: 'auroraNight',
    title: '극광의 밤',
    text: '하늘이 보랏빛 빛으로 흐른다. 황혼의 표식이 가득하다.',
    chapter: [1],
    choices: [
      {
        text: '빛에 몸을 맡긴다 (지능 검정)',
        stat: '지능', dc: 15,
        success: { text: '황혼의 진리가 어렴풋이 보인다.', reward: { type: 'skill_random_lv', axis: 'utility' } },
        fail: { text: '광기가 잠시 정신을 좀먹는다.', penalty: { hp: -20 } }
      },
      { text: '눈을 감고 지나친다', result: '아무것도 보지 않는다.', reward: null },
    ],
  },
  {
    id: 'oldBattlefield',
    title: '옛 전장',
    text: '눈 아래 묻힌 전장. 부서진 무기들이 흩어져 있다.',
    chapter: [1, 2],
    choices: [
      {
        text: '쓸 만한 무기를 찾는다 (근력 검정)',
        stat: '근력', dc: 13,
        success: { text: '단단한 검을 발견한다.', reward: { type: 'stat', name: '근력', value: 1 } },
        fail: { text: '쓸 만한 게 없다.', penalty: null }
      },
      { text: '시신들에게 인사한다', result: '망자의 가호가 잠시 깃든다.', reward: { type: 'heal', value: 25 } },
    ],
  },
  
  // === 챕터 2 (숲) 추가 사건 ===
  {
    id: 'runeStone',
    title: '고대 룬스톤',
    text: '대지에 박힌 거대한 룬스톤. 알 수 없는 문자가 빛난다.\n손을 대면 무언가가 깃들 것 같다.',
    chapter: [2, 3],
    choices: [
      {
        text: '룬을 만진다 (지능 검정)',
        stat: '지능', dc: 14,
        success: { text: '고대 마법의 힘이 깃든다.', reward: { type: 'skill_random_lv', axis: 'attack' } },
        fail: { text: '마법의 폭발이 몸을 강타한다.', penalty: { hp: -35 } }
      },
      {
        text: '읽으려 한다 (마력 검정)',
        stat: '지능', dc: 16,
        success: { text: '룬이 가르침을 준다.', reward: { type: 'gold', value: 100 } },
        fail: { text: '의미를 알 수 없다.', penalty: null }
      },
      { text: '지나친다', result: '룬이 등 뒤에서 빛난다.', reward: null },
    ],
  },
  {
    id: 'lostElf',
    title: '길 잃은 엘프',
    text: '나무에 기댄 어린 엘프. 무릎을 다쳤다.\n"인간이여... 도와주실 수 있나요?"',
    chapter: [2],
    choices: [
      { text: '치료를 도와준다 (은화 30)', cost: { gold: 30 }, result: '엘프가 감사하며 작은 부적을 건넨다.', reward: { type: 'random_relic' } },
      {
        text: '함정인지 의심한다 (지능 검정)',
        stat: '지능', dc: 13,
        success: { text: '실제로 함정이었다. 잠복했던 적을 처치한다.', reward: { type: 'gold', value: 60 } },
        fail: { text: '진짜였다. 도와주지 않았다.', penalty: null }
      },
      { text: '무시한다', result: '엘프의 울음소리가 등 뒤에서.', reward: null },
    ],
  },
  {
    id: 'huntersTrap',
    title: '사냥꾼의 함정',
    text: '바닥에 덫. 누군가 짐승을 잡으려 했다.\n주변에 사냥꾼은 보이지 않는다.',
    chapter: [2],
    choices: [
      {
        text: '덫을 회수한다 (민첩 검정)',
        stat: '민첩', dc: 13,
        success: { text: '함정을 무력화하고 부품을 챙긴다.', reward: { type: 'gold', value: 50 } },
        fail: { text: '발이 걸린다.', penalty: { hp: -30 } }
      },
      { text: '우회한다', result: '함정을 피해 간다.', reward: null },
    ],
  },
  {
    id: 'sacredTree',
    title: '신성한 나무',
    text: '거대한 신성목. 나무 줄기에 자그마한 빛이 어른거린다.',
    chapter: [2],
    choices: [
      {
        text: '명상한다 (매력 검정)',
        stat: '매력', dc: 14,
        success: { text: '나무의 정령이 가호를 내린다.', reward: { type: 'heal_full' } },
        fail: { text: '정령은 응답하지 않는다.', penalty: null }
      },
      { text: '나무 열매를 딴다', result: '신성한 열매를 먹는다.', reward: { type: 'heal', value: 40 } },
      {
        text: '나뭇가지를 꺾는다 (근력 검정)',
        stat: '근력', dc: 14,
        success: { text: '신성목의 가지를 얻는다.', reward: { type: 'random_relic' } },
        fail: { text: '나무가 분노한다!', combat: 'forestSpirit', penalty: null }
      },
    ],
  },
  {
    id: 'wolfPack',
    title: '늑대 무리',
    text: '어둠 속에서 빛나는 눈동자들. 늑대 무리가 길을 막고 있다.',
    chapter: [2],
    choices: [
      {
        text: '위협한다 (근력 검정)',
        stat: '근력', dc: 14,
        success: { text: '늑대들이 물러난다.', reward: null },
        fail: { text: '늑대들이 달려든다!', combat: 'shadowWolf', penalty: null }
      },
      {
        text: '먹이를 던진다 (은화 30)',
        cost: { gold: 30 },
        result: '늑대들이 먹이에 정신이 팔린 사이 지나간다.',
        reward: null
      },
      { text: '강제 돌파', result: '강행돌파. 길을 뚫는다.', reward: null, penalty: { hp: -25 } },
    ],
  },
  
  // === 챕터 3 (봉인된 신전) 사건 ===
  {
    id: 'sealedDoor',
    title: '봉인된 문',
    text: '거대한 석문. 여명의 표식이 새겨져 있다.\n안에서 무언가가 깨어나려 한다.',
    chapter: [3],
    choices: [
      {
        text: '강제로 연다 (근력 검정)',
        stat: '근력', dc: 16,
        success: { text: '문을 열고 봉인된 보물을 얻는다.', reward: { type: 'random_relic' } },
        fail: { text: '문이 흔들리지 않는다. 손목이 시리다.', penalty: { hp: -30 } }
      },
      {
        text: '봉인을 해독한다 (지능 검정)',
        stat: '지능', dc: 15,
        success: { text: '봉인을 무사히 풀고 안에 들어간다.', reward: { type: 'skill_random_lv' } },
        fail: { text: '잘못된 주문에 마력이 폭발한다.', penalty: { hp: -25 } }
      },
      { text: '경고를 듣고 떠난다', result: '봉인은 그대로 둔다.', reward: null },
    ],
  },
  {
    id: 'timeRift',
    title: '시간의 균열',
    text: '공간이 일그러진다. 과거인지 미래인지 알 수 없는 풍경이 흘러간다.',
    chapter: [3],
    choices: [
      {
        text: '균열을 통과한다 (지능 검정)',
        stat: '지능', dc: 15,
        success: { text: '균열 너머의 보물을 챙긴다.', reward: { type: 'gold', value: 150 } },
        fail: { text: '시간에 휩쓸려 부상을 입는다.', penalty: { hp: -35 } }
      },
      { text: '관찰만 한다', result: '시간의 비밀을 어렴풋이 깨닫는다.', reward: { type: 'stat', name: '지능', value: 1 } },
      { text: '서둘러 지나친다', result: '균열을 피해 간다.', reward: null },
    ],
  },
  {
    id: 'oldOracle',
    title: '낡은 신탁',
    text: '신전 깊숙한 곳, 잠든 신탁녀. 그녀의 입에서 알 수 없는 말이 흘러나온다.',
    chapter: [3],
    choices: [
      { text: '말을 듣는다', result: '신탁녀의 예언이 깃든다.', reward: { type: 'skill_random_lv', axis: 'utility' } },
      {
        text: '깨워서 묻는다 (매력 검정)',
        stat: '매력', dc: 15,
        success: { text: '신탁녀가 보물의 위치를 알려준다.', reward: { type: 'gold', value: 130 } },
        fail: { text: '신탁녀가 분노한다!', penalty: { hp: -40 } }
      },
      { text: '잠든 모습 그대로 둔다', result: '예의를 갖춰 떠난다.', reward: null },
    ],
  },
  {
    id: 'shatteredAltar',
    title: '깨진 제단',
    text: '여명의 제단이 박살나 있다. 누군가의 흔적이 남아있다.',
    chapter: [3],
    choices: [
      {
        text: '제단을 복원한다 (지능 검정)',
        stat: '지능', dc: 14,
        success: { text: '여명의 가호가 깃든다.', reward: { type: 'heal_full' } },
        fail: { text: '제단이 더 부서진다.', penalty: null }
      },
      { text: '잔해를 뒤진다', result: '낡은 보물을 챙긴다.', reward: { type: 'gold', value: 80 } },
      {
        text: '깨끗이 정리한다 (매력 검정)',
        stat: '매력', dc: 13,
        success: { text: '여명이 작은 가호를 내린다.', reward: { type: 'skill_random_lv', axis: 'utility' } },
        fail: { text: '응답이 없다.', penalty: null }
      },
    ],
  },
  {
    id: 'corruptedPriest',
    title: '타락한 사제',
    text: '신전의 사제. 광기에 빠진 눈으로 당신을 노려본다.\n"여명은 죽었다... 황혼이 진실이다..."',
    chapter: [3],
    choices: [
      {
        text: '대화를 시도한다 (매력 검정)',
        stat: '매력', dc: 16,
        success: { text: '사제의 마음을 진정시킨다. 그의 보물을 받는다.', reward: { type: 'random_relic' } },
        fail: { text: '사제가 폭주한다!', combat: 'ancientPriest', penalty: null }
      },
      { text: '즉시 공격', result: '사제와의 전투가 시작된다.', combat: 'sealMage', reward: null },
      { text: '도망간다', result: '광기를 등 뒤로 한다.', reward: null },
    ],
  },
  
  // === 챕터 4 (마계의 균열) 사건 ===
  {
    id: 'demonDeal',
    title: '악마와의 거래',
    text: '균열 속에서 악마가 손을 내민다.\n"네 영혼의 일부를 다오. 대가는 풍족할 것이다."',
    chapter: [4],
    choices: [
      { 
        text: '거래에 응한다 (HP -40)', 
        cost: { hp: 40 },
        result: '악마가 약속을 지킨다.', 
        reward: { type: 'random_relic' } 
      },
      { 
        text: '큰 거래를 시도한다 (HP -60)', 
        cost: { hp: 60 },
        result: '악마가 강력한 힘을 건넨다.', 
        reward: { type: 'skill_random_lv', axis: 'attack' } 
      },
      {
        text: '거절한다 (지능 검정)',
        stat: '지능', dc: 15,
        success: { text: '악마의 함정을 꿰뚫어본다.', reward: { type: 'gold', value: 150 } },
        fail: { text: '악마가 분노한다.', penalty: { hp: -30 } }
      },
    ],
  },
  {
    id: 'soulPond',
    title: '영혼의 연못',
    text: '검은 액체로 가득 찬 연못. 안에서 영혼들이 떠올랐다 가라앉는다.',
    chapter: [4],
    choices: [
      {
        text: '액체를 마신다 (근력 검정)',
        stat: '근력', dc: 16,
        success: { text: '영혼의 힘을 흡수한다.', reward: { type: 'maxhp', value: 30 } },
        fail: { text: '영혼들이 정신을 잠식한다.', penalty: { hp: -45 } }
      },
      {
        text: '영혼들에게 기도한다 (매력 검정)',
        stat: '매력', dc: 15,
        success: { text: '영혼들이 가호를 내린다.', reward: { type: 'heal_full' } },
        fail: { text: '응답이 없다.', penalty: null }
      },
      { text: '지나친다', result: '검은 연못은 그대로 둔다.', reward: null },
    ],
  },
  {
    id: 'demonWeapon',
    title: '마계의 무기고',
    text: '버려진 마계의 무기들. 어두운 힘이 깃들어 있다.',
    chapter: [4],
    choices: [
      {
        text: '강력한 무기를 든다 (근력 검정)',
        stat: '근력', dc: 15,
        success: { text: '마계의 검을 휘두른다.', reward: { type: 'random_relic' } },
        fail: { text: '무기가 영혼을 물어뜯는다.', penalty: { hp: -40 } }
      },
      {
        text: '안전한 것을 고른다 (심안 검정)',
        stat: '지능', dc: 14,
        success: { text: '저주받지 않은 무기를 찾는다.', reward: { type: 'stat', name: '근력', value: 2 } },
        fail: { text: '모두 저주받았다.', penalty: null }
      },
      { text: '아무것도 만지지 않는다', result: '경계심을 유지한다.', reward: null },
    ],
  },
  {
    id: 'lostSoul',
    title: '방황하는 영혼',
    text: '한 영혼이 길을 막는다. 죽은 자의 슬픔이 가득하다.\n"제발... 나를 풀어주오..."',
    chapter: [4],
    choices: [
      {
        text: '진혼한다 (매력 검정)',
        stat: '매력', dc: 15,
        success: { text: '영혼이 평안을 찾는다. 작은 보물을 남긴다.', reward: { type: 'skill_random_lv', axis: 'utility' } },
        fail: { text: '영혼이 분노로 변한다.', penalty: { hp: -35 } }
      },
      { text: '소금을 뿌린다 (보석 -3)', cost: { gem: 3 }, result: '영혼이 흩어진다.', reward: { type: 'gold', value: 70 } },
      { text: '무시한다', result: '슬픈 울음을 등 뒤로.', reward: null },
    ],
  },
  {
    id: 'demonGate',
    title: '마계의 문',
    text: '마계로 통하는 작은 문. 심한 악취가 풍긴다.\n안에 무엇이 있을지 알 수 없다.',
    chapter: [4],
    choices: [
      {
        text: '안으로 진입한다 (근력 검정)',
        stat: '근력', dc: 16,
        success: { text: '마계의 보물을 약탈한다.', reward: { type: 'gold', value: 200 } },
        fail: { text: '악마들에게 둘러싸인다!', combat: 'wrathDemon', penalty: null }
      },
      {
        text: '문을 봉인한다 (지능 검정)',
        stat: '지능', dc: 15,
        success: { text: '마계의 침입을 막아낸다. 여명의 가호가 깃든다.', reward: { type: 'skill_random_lv', axis: 'utility' } },
        fail: { text: '봉인이 실패한다.', penalty: null }
      },
      { text: '돌아간다', result: '문을 등 뒤로 한다.', reward: null },
    ],
  },
  {
    id: 'cursedGold',
    title: '저주받은 황금',
    text: '거대한 금화 더미. 너무 풍요롭다. 분명 저주가 깃들어 있다.',
    chapter: [3, 4],
    choices: [
      {
        text: '모두 챙긴다 (저주 위험)',
        result: '엄청난 부를 얻지만 저주가 깃든다.',
        reward: { type: 'gold', value: 250 },
        penalty: { hp: -50 }
      },
      {
        text: '조금만 챙긴다 (지능 검정)',
        stat: '지능', dc: 14,
        success: { text: '저주받지 않은 부분만 골라낸다.', reward: { type: 'gold', value: 120 } },
        fail: { text: '저주가 깃든다.', penalty: { hp: -30 } }
      },
      { text: '만지지 않는다', result: '욕망을 누른다.', reward: null },
    ],
  },
  
  // === 모든 챕터 공용 추가 사건 ===
  {
    id: 'mysteriousFountain',
    title: '신비한 샘',
    text: '맑은 물이 흐르는 작은 샘. 여명의 표식이 살짝 보인다.',
    chapter: [1, 2, 3, 4],
    choices: [
      { text: '물을 마신다', result: '몸이 한결 가벼워진다.', reward: { type: 'heal', value: 35 } },
      {
        text: '동전을 던진다 (은화 -20)',
        cost: { gold: 20 },
        result: '샘에서 빛이 솟아오른다.',
        reward: { type: 'skill_random_lv' }
      },
      { text: '샘에 손을 씻는다', result: '정화된다.', reward: { type: 'heal', value: 15 } },
    ],
  },
  {
    id: 'lonelyTraveler',
    title: '외로운 여행자',
    text: '같은 길을 걷는 여행자. 잠시 함께 쉬어가자고 청한다.',
    chapter: [1, 2, 3, 4],
    choices: [
      { text: '함께 식사한다 (은화 -30)', cost: { gold: 30 }, result: '여행자가 정보를 알려준다.', reward: { type: 'gem', value: 3 } },
      {
        text: '대화를 나눈다 (매력 검정)',
        stat: '매력', dc: 13,
        success: { text: '여행자가 작은 도움을 준다.', reward: { type: 'gold', value: 50 } },
        fail: { text: '대화가 어색해 헤어진다.', penalty: null }
      },
      { text: '인사만 하고 떠난다', result: '각자의 길을 간다.', reward: null },
    ],
  },
  {
    id: 'hiddenChest',
    title: '숨겨진 보물상자',
    text: '풀숲 사이 보물상자. 자물쇠가 굳게 잠겨 있다.',
    chapter: [1, 2, 3, 4],
    choices: [
      {
        text: '자물쇠를 뜯는다 (근력 검정)',
        stat: '근력', dc: 14,
        success: { text: '자물쇠가 부러진다.', reward: { type: 'gold', value: 100 } },
        fail: { text: '함정이 발동한다.', penalty: { hp: -25 } }
      },
      {
        text: '열쇠를 따낸다 (민첩 검정)',
        stat: '민첩', dc: 13,
        success: { text: '자물쇠를 정밀하게 풀어낸다.', reward: { type: 'random_relic' } },
        fail: { text: '독침이 발동한다.', penalty: { hp: -30 } }
      },
      { text: '의심스럽다, 떠난다', result: '함정일지도.', reward: null },
    ],
  },
  // === 추가 사건은 여기에 자유롭게 추가 ===

  // ============================================================
  // === 챕터 1 (북부 극지대) 추가 사건 — 얼음·망령·고대 원정대 ===
  // ============================================================
  {
    id: 'frozenSoldier',
    title: '얼음에 갇힌 병사',
    text: '거대한 얼음 기둥 속에 갑옷을 입은 병사가 봉인되어 있다.\n눈동자가 천천히 깜빡인다 — 아직 살아 있는 것 같다.',
    chapter: [1],
    choices: [
      { text: '검으로 얼음을 부순다 (근력 검정)', stat: '근력', dc: 14,
        success: { text: '병사가 깨어나 사례한다.', reward: { type: 'gold', value: 80 } },
        fail: { text: '얼음과 함께 검이 미끄러진다.', penalty: { hp: -20 } } },
      { text: '주문으로 녹인다 (지능 검정)', stat: '지능', dc: 13,
        success: { text: '병사가 옛 유물을 건넨다.', reward: { type: 'random_relic' } },
        fail: { text: '주문이 어긋난다.', penalty: { gem: -2 } } },
      { text: '내버려둔다', result: '얼음은 그대로다.', reward: null },
    ],
  },
  {
    id: 'auroraShrine',
    title: '오로라의 제단',
    text: '눈 덮인 평원에 광채를 흘리는 작은 제단이 서 있다.\n공물을 바치라는 글귀가 새겨져 있다.',
    chapter: [1],
    choices: [
      { text: '은화를 바친다 (-40)', cost: { gold: 40 }, result: '오로라가 몸을 휘감는다.', reward: { type: 'heal', value: 50 } },
      { text: '보석을 바친다 (-2)', cost: { gem: 2 }, result: '제단이 푸르게 빛난다.', reward: { type: 'skill_random_lv' } },
      { text: '제단을 지나친다', result: '오로라는 사라진다.', reward: null },
    ],
  },
  {
    id: 'frostHunter',
    title: '서리의 사냥꾼',
    text: '두꺼운 모피를 두른 사냥꾼이 따뜻한 불 앞에서 손짓한다.\n"이방인, 거래 한 번 어떤가."',
    chapter: [1],
    choices: [
      { text: '모피를 산다 (은화 -60)', cost: { gold: 60 }, result: '추위가 한결 덜하다.', reward: { type: 'maxhp', value: 25 } },
      { text: '사냥 동행 (민첩 검정)', stat: '민첩', dc: 13,
        success: { text: '큰 짐승을 잡았다.', reward: { type: 'gold', value: 110 } },
        fail: { text: '짐승을 놓치고 다친다.', penalty: { hp: -25 } } },
      { text: '거절한다', result: '사냥꾼이 어깨를 으쓱한다.', reward: null },
    ],
  },
  {
    id: 'lostExpedition',
    title: '잃어버린 원정대',
    text: '눈 속에 반쯤 묻힌 원정대 야영지. 깃발이 매섭게 펄럭인다.\n흔적을 보니 도망친 듯하다.',
    chapter: [1],
    choices: [
      { text: '천막을 뒤진다', result: '식량과 잡동사니를 챙긴다.', reward: { type: 'gold', value: 60 } },
      { text: '깃발의 룬을 해석한다 (지능 검정)', stat: '지능', dc: 14,
        success: { text: '원정대의 비밀 유물을 발견한다.', reward: { type: 'random_relic' } },
        fail: { text: '룬이 폭주한다.', penalty: { hp: -20 } } },
      { text: '죽은 자에게 묵념한다', result: '마음이 가벼워진다.', reward: { type: 'heal', value: 20 } },
    ],
  },
  {
    id: 'icyChasm',
    title: '얼음의 균열',
    text: '발 밑이 갈라진다. 깊은 균열 사이로 푸른 빛이 새어 나온다.',
    chapter: [1],
    choices: [
      { text: '밧줄을 타고 내려간다 (민첩 검정)', stat: '민첩', dc: 14,
        success: { text: '얼음 속 보물을 회수한다.', reward: { type: 'gem', value: 4 } },
        fail: { text: '벽에 부딪힌다.', penalty: { hp: -25 } } },
      { text: '균열 너머로 뛴다 (근력 검정)', stat: '근력', dc: 13,
        success: { text: '지름길로 시간을 번다.', reward: { type: 'gold', value: 70 } },
        fail: { text: '얼음 가시에 베인다.', penalty: { hp: -20 } } },
      { text: '돌아간다', result: '안전한 길을 찾는다.', reward: null },
    ],
  },
  {
    id: 'whisperingIce',
    title: '속삭이는 얼음',
    text: '머리를 짓누르는 듯한 속삭임이 얼음 벽에서 새어 나온다.\n뭔가가 너의 이름을 부른다.',
    chapter: [1],
    choices: [
      { text: '귀를 기울인다 (지능 검정)', stat: '지능', dc: 14,
        success: { text: '속삭임이 비밀을 알려준다.', reward: { type: 'skill_random_lv' } },
        fail: { text: '정신이 흔들린다.', penalty: { hp: -15, gem: -1 } } },
      { text: '못 들은 척한다', result: '속삭임이 사라진다.', reward: null },
      { text: '얼음을 부순다', result: '소음과 함께 잔해를 발견한다.', reward: { type: 'gold', value: 40 } },
    ],
  },
  {
    id: 'crystalDeer',
    title: '수정 사슴',
    text: '얼음으로 된 듯한 사슴이 너를 응시한다.\n뿔에서 푸른 보석이 자란다.',
    chapter: [1],
    choices: [
      { text: '사냥한다 (민첩 검정)', stat: '민첩', dc: 14,
        success: { text: '뿔의 결정을 거둔다.', reward: { type: 'gem', value: 5 } },
        fail: { text: '사슴이 너를 들이받는다.', penalty: { hp: -30 } } },
      { text: '먹이를 준다 (은화 -25)', cost: { gold: 25 }, result: '사슴이 보석 한 조각을 떨군다.', reward: { type: 'gem', value: 2 } },
      { text: '지나친다', result: '사슴은 안개 속으로 사라진다.', reward: null },
    ],
  },
  {
    id: 'frostMerchant',
    title: '극지의 행상',
    text: '두꺼운 외투를 두른 행상이 보따리를 풀어 보인다.\n낯선 모양의 부적이 줄지어 있다.',
    chapter: [1],
    choices: [
      { text: '부적을 산다 (은화 -120)', cost: { gold: 120 }, result: '부적이 가슴에 새겨진다.', reward: { type: 'random_relic' } },
      { text: '간이 회복약을 산다 (은화 -50)', cost: { gold: 50 }, result: '체력을 회복한다.', reward: { type: 'heal', value: 40 } },
      { text: '구경만 한다', result: '행상이 다음을 기약한다.', reward: null },
    ],
  },

  // ============================================================
  // === 챕터 2 (죽은 자의 숲) 추가 사건 — 망령 엘프·정령 ===
  // ============================================================
  {
    id: 'ancientTree',
    title: '오래된 나무',
    text: '뿌리부터 빛을 흘리는 거대한 나무. 가지에 무언가 매달려 있다.',
    chapter: [2],
    choices: [
      { text: '나무에 손을 댄다', result: '따스한 기운이 흘러든다.', reward: { type: 'heal', value: 45 } },
      { text: '가지를 흔든다 (근력 검정)', stat: '근력', dc: 13,
        success: { text: '낡은 부적이 떨어진다.', reward: { type: 'random_relic' } },
        fail: { text: '가지가 부러져 떨어진다.', penalty: { hp: -20 } } },
      { text: '명상한다 (지능 검정)', stat: '지능', dc: 14,
        success: { text: '나무가 비밀을 속삭인다.', reward: { type: 'skill_random_lv' } },
        fail: { text: '집중을 잃는다.', penalty: null } },
    ],
  },
  {
    id: 'twilightChild',
    title: '황혼의 아이',
    text: '안개 속에서 어린아이가 손을 흔든다.\n눈동자가 텅 비어 있다 — 산 자가 아니다.',
    chapter: [2],
    choices: [
      { text: '함께 놀아준다 (매력 검정)', stat: '매력', dc: 14,
        success: { text: '아이가 작은 보석을 손에 쥐어준다.', reward: { type: 'gem', value: 4 } },
        fail: { text: '아이가 슬프게 사라진다.', penalty: { hp: -15 } } },
      { text: '도망친다', result: '뒤에서 울음소리가 들린다.', reward: null },
      { text: '안식의 노래를 부른다', result: '아이가 빛으로 흩어진다.', reward: { type: 'heal', value: 30 } },
    ],
  },
  {
    id: 'fallenElfShrine',
    title: '타락한 엘프의 사당',
    text: '뒤틀린 룬이 새겨진 작은 사당. 검은 기운이 새어 나온다.',
    chapter: [2],
    choices: [
      { text: '사당을 부순다 (근력 검정)', stat: '근력', dc: 14,
        success: { text: '저주가 풀리고 보물이 드러난다.', reward: { type: 'gold', value: 100 } },
        fail: { text: '저주가 반사된다.', penalty: { hp: -25 } } },
      { text: '봉납한다 (은화 -50)', cost: { gold: 50 }, result: '사당의 기운이 잠잠해진다.', reward: { type: 'skill_random_lv' } },
      { text: '지나친다', result: '사당은 그대로다.', reward: null },
    ],
  },
  {
    id: 'spiritWind',
    title: '정령의 바람',
    text: '나뭇잎이 의지를 가진 듯 너를 둘러싼다.\n바람이 길을 가리킨다.',
    chapter: [2],
    choices: [
      { text: '바람을 따라간다 (민첩 검정)', stat: '민첩', dc: 13,
        success: { text: '숨겨진 샛길이 나타난다.', reward: { type: 'gold', value: 70 } },
        fail: { text: '길을 잃고 헤맨다.', penalty: { hp: -15 } } },
      { text: '바람과 이야기한다 (지능 검정)', stat: '지능', dc: 14,
        success: { text: '정령의 축복을 받는다.', reward: { type: 'maxhp', value: 20 } },
        fail: { text: '바람이 흩어진다.', penalty: null } },
      { text: '발걸음을 옮긴다', result: '바람은 사라진다.', reward: null },
    ],
  },
  {
    id: 'fungalGrove',
    title: '독버섯의 숲',
    text: '거대한 버섯이 빽빽이 자란 음습한 구역.\n포자가 떠다닌다.',
    chapter: [2],
    choices: [
      { text: '독버섯을 채집한다 (민첩 검정)', stat: '민첩', dc: 13,
        success: { text: '값나가는 표본을 챙긴다.', reward: { type: 'gold', value: 80 } },
        fail: { text: '포자에 중독된다.', penalty: { hp: -30 } } },
      { text: '버섯을 먹어본다', result: '환영을 본다 — 단서를 얻는다.', reward: { type: 'gem', value: 2 } },
      { text: '돌아간다', result: '포자가 머리카락에 묻는다.', reward: null },
    ],
  },
  {
    id: 'mossyAltar',
    title: '이끼의 제단',
    text: '잎과 이끼로 뒤덮인 낮은 제단.\n흙 사이로 보석이 자라난다.',
    chapter: [2],
    choices: [
      { text: '이끼를 걷어낸다', result: '돌 밑에 작은 보석이 있다.', reward: { type: 'gem', value: 3 } },
      { text: '나뭇가지를 바친다 (은화 -30)', cost: { gold: 30 }, result: '대지가 화답한다.', reward: { type: 'heal', value: 50 } },
      { text: '지나간다', result: '이끼는 그대로 자란다.', reward: null },
    ],
  },
  {
    id: 'twilightHunter',
    title: '황혼의 사냥꾼',
    text: '엘프의 외투를 두른 자가 활시위를 당긴다.\n표적은 너인지, 너의 등 뒤인지 알 수 없다.',
    chapter: [2],
    choices: [
      { text: '대화를 시도한다 (매력 검정)', stat: '매력', dc: 14,
        success: { text: '사냥꾼이 길을 안내한다.', reward: { type: 'gold', value: 90 } },
        fail: { text: '화살이 옆을 스친다.', penalty: { hp: -20 } } },
      { text: '먼저 공격한다 (민첩 검정)', stat: '민첩', dc: 15,
        success: { text: '사냥꾼을 제압하고 짐을 챙긴다.', reward: { type: 'random_relic' } },
        fail: { text: '반격에 당한다.', penalty: { hp: -35 } } },
      { text: '몰래 우회한다', result: '발자국 소리를 죽인다.', reward: null },
    ],
  },
  {
    id: 'forestPond',
    title: '숲의 연못',
    text: '맑은 물이 거울처럼 비치는 연못.\n수면 아래 무언가가 움직인다.',
    chapter: [2],
    choices: [
      { text: '물에 들어간다', result: '몸이 가벼워진다.', reward: { type: 'heal', value: 35 } },
      { text: '수면 아래로 잠수한다 (근력 검정)', stat: '근력', dc: 14,
        success: { text: '잠겨 있던 보물을 끌어올린다.', reward: { type: 'gold', value: 100 } },
        fail: { text: '무언가에 발목이 잡힌다.', penalty: { hp: -25 } } },
      { text: '동전을 던진다 (-20)', cost: { gold: 20 }, result: '소원이 이루어진다.', reward: { type: 'skill_random_lv' } },
    ],
  },

  // ============================================================
  // === 챕터 3 (봉인된 신전) 추가 사건 — 봉인·시간·고대 사제 ===
  // ============================================================
  {
    id: 'sealedDoor',
    title: '봉인된 문',
    text: '룬으로 뒤덮인 거대한 문. 안에서 무언가가 깨어나려 한다.',
    chapter: [3],
    choices: [
      { text: '봉인을 강제로 푼다 (근력 검정)', stat: '근력', dc: 15,
        success: { text: '안에는 보물이 가득하다.', reward: { type: 'random_relic' } },
        fail: { text: '봉인이 반발한다.', penalty: { hp: -40 } } },
      { text: '룬을 해독한다 (지능 검정)', stat: '지능', dc: 14,
        success: { text: '문이 부드럽게 열린다.', reward: { type: 'gold', value: 120 } },
        fail: { text: '룬이 폭주한다.', penalty: { hp: -25 } } },
      { text: '문을 지나친다', result: '문은 잠긴 채 남는다.', reward: null },
    ],
  },
  {
    id: 'timeFracture',
    title: '시간의 균열',
    text: '공기가 일그러진다. 시간의 흐름이 어긋난다.',
    chapter: [3],
    choices: [
      { text: '균열에 손을 댄다 (지능 검정)', stat: '지능', dc: 15,
        success: { text: '잃었던 기력이 돌아온다.', reward: { type: 'heal', value: 80 } },
        fail: { text: '늙어버린 듯한 피로감.', penalty: { hp: -30 } } },
      { text: '돌을 던져 본다', result: '돌이 다시 손에 돌아온다.', reward: { type: 'gem', value: 2 } },
      { text: '거리를 둔다', result: '균열이 흔들리며 사라진다.', reward: null },
    ],
  },
  {
    id: 'ancientPriest',
    title: '잊혀진 사제',
    text: '먼지 쌓인 제의를 입은 사제가 무릎 꿇고 있다.\n수백 년 전에 죽은 듯하다.',
    chapter: [3],
    choices: [
      { text: '기도해 준다', result: '사제의 영혼이 감사를 표한다.', reward: { type: 'skill_random_lv' } },
      { text: '제의를 뒤진다', result: '낡은 부적을 얻는다.', reward: { type: 'random_relic' } },
      { text: '경의를 표하고 떠난다', result: '마음이 평온해진다.', reward: { type: 'heal', value: 25 } },
    ],
  },
  {
    id: 'librarianGhost',
    title: '도서관의 망령',
    text: '책장 사이로 투명한 노인이 책을 정리하고 있다.\n읽혀지지 않는 글자가 떠다닌다.',
    chapter: [3],
    choices: [
      { text: '책에 대해 묻는다 (지능 검정)', stat: '지능', dc: 14,
        success: { text: '망령이 비밀을 가르쳐 준다.', reward: { type: 'skill_random_lv' } },
        fail: { text: '책장이 무너진다.', penalty: { hp: -20 } } },
      { text: '책을 한 권 가져간다', result: '망령이 한숨을 쉰다.', reward: { type: 'gold', value: 60 } },
      { text: '조용히 떠난다', result: '망령이 다시 책장을 본다.', reward: null },
    ],
  },
  {
    id: 'puzzleAltar',
    title: '풀리지 않는 제단',
    text: '맞물려 돌아가는 톱니바퀴들. 한 부분이 어긋나 있다.',
    chapter: [3],
    choices: [
      { text: '톱니를 맞춘다 (민첩 검정)', stat: '민첩', dc: 14,
        success: { text: '제단이 보상을 토해낸다.', reward: { type: 'gem', value: 5 } },
        fail: { text: '톱니에 손이 끼인다.', penalty: { hp: -20 } } },
      { text: '강제로 부순다 (근력 검정)', stat: '근력', dc: 15,
        success: { text: '잔해 속에 유물이 있다.', reward: { type: 'random_relic' } },
        fail: { text: '톱니 파편에 베인다.', penalty: { hp: -30 } } },
      { text: '돌아간다', result: '톱니는 멈춰 있다.', reward: null },
    ],
  },
  {
    id: 'mirrorOfRegret',
    title: '회한의 거울',
    text: '거울 속의 너는 너를 닮지 않았다.\n다른 길을 걸어온 너 자신이다.',
    chapter: [3],
    choices: [
      { text: '거울에 손을 뻗는다', result: '잠시 다른 너의 기억이 흘러든다.', reward: { type: 'skill_random_lv' } },
      { text: '거울을 깬다 (근력 검정)', stat: '근력', dc: 14,
        success: { text: '파편 속에서 보석을 발견한다.', reward: { type: 'gem', value: 4 } },
        fail: { text: '파편이 너에게 박힌다.', penalty: { hp: -25 } } },
      { text: '눈을 돌린다', result: '거울이 흐릿해진다.', reward: null },
    ],
  },
  {
    id: 'forgottenSarcophagus',
    title: '잊혀진 석관',
    text: '먼지 쌓인 석관이 한가운데에 놓여 있다.\n뚜껑에 보석이 박혀 있다.',
    chapter: [3],
    choices: [
      { text: '뚜껑을 연다 (근력 검정)', stat: '근력', dc: 15,
        success: { text: '안에는 부장품이 가득하다.', reward: { type: 'gold', value: 150 } },
        fail: { text: '먼지 폭발이 일어난다.', penalty: { hp: -30 } } },
      { text: '보석만 뽑는다 (민첩 검정)', stat: '민첩', dc: 13,
        success: { text: '깔끔하게 보석을 챙긴다.', reward: { type: 'gem', value: 4 } },
        fail: { text: '석관이 무너진다.', penalty: { hp: -20 } } },
      { text: '경의를 표하고 떠난다', result: '석관은 다시 잠든다.', reward: null },
    ],
  },
  {
    id: 'echoChamber',
    title: '메아리의 방',
    text: '발걸음이 끝없이 메아리친다.\n수없이 겹친 목소리가 너를 부른다.',
    chapter: [3],
    choices: [
      { text: '소리에 응답한다 (매력 검정)', stat: '매력', dc: 14,
        success: { text: '메아리들이 너를 축복한다.', reward: { type: 'maxhp', value: 25 } },
        fail: { text: '메아리에 짓눌린다.', penalty: { hp: -25 } } },
      { text: '귀를 막는다', result: '소리가 멀어진다.', reward: null },
      { text: '큰 소리로 외친다', result: '메아리가 보석을 떨군다.', reward: { type: 'gem', value: 3 } },
    ],
  },

  // ============================================================
  // === 챕터 4 (마계의 균열) 추가 사건 — 마족·계약·균열 ===
  // ============================================================
  {
    id: 'demonContract',
    title: '마족의 계약서',
    text: '핏빛으로 적힌 계약서가 허공에 떠 있다.\n서명만 하면 즉시 효력이 발생한다고 한다.',
    chapter: [4],
    choices: [
      { text: '서명한다 (HP -40)', penalty: { hp: -40 }, result: '몸에서 어둠이 솟구친다.', reward: { type: 'random_relic' } },
      { text: '계약 조항을 따진다 (지능 검정)', stat: '지능', dc: 15,
        success: { text: '안전 조항을 발견한다.', reward: { type: 'gold', value: 150 } },
        fail: { text: '책장 사이의 함정이 발동한다.', penalty: { hp: -30 } } },
      { text: '계약서를 찢는다', result: '계약서가 비명을 지르며 사라진다.', reward: { type: 'heal', value: 20 } },
    ],
  },
  {
    id: 'voidRift',
    title: '공허의 균열',
    text: '발 밑이 사라진 듯한 검은 균열이 입을 벌린다.\n안에서 형용할 수 없는 무언가가 너를 응시한다.',
    chapter: [4],
    choices: [
      { text: '균열을 응시한다 (지능 검정)', stat: '지능', dc: 16,
        success: { text: '공허가 비밀을 속삭인다.', reward: { type: 'skill_random_lv' } },
        fail: { text: '정신이 잠식된다.', penalty: { hp: -35 } } },
      { text: '돌을 던진다', result: '돌이 사라진다 — 그게 전부다.', reward: null },
      { text: '거리를 둔다', result: '균열은 천천히 닫힌다.', reward: { type: 'gem', value: 2 } },
    ],
  },
  {
    id: 'fallenAngel',
    title: '추락한 천사',
    text: '검은 깃털이 흩어진 골짜기.\n부서진 날개의 천사가 흙바닥에 누워 있다.',
    chapter: [4],
    choices: [
      { text: '치료해 준다 (은화 -100)', cost: { gold: 100 }, result: '천사가 빛을 너에게 옮긴다.', reward: { type: 'maxhp', value: 35 } },
      { text: '깃털을 뽑는다', result: '깃털에 검은 빛이 깃들어 있다.', reward: { type: 'random_relic' } },
      { text: '안식을 빈다', result: '천사가 마지막 미소를 짓고 사라진다.', reward: { type: 'skill_random_lv' } },
    ],
  },
  {
    id: 'soulMerchant',
    title: '영혼의 상인',
    text: '검은 망토를 두른 상인이 차가운 미소를 짓는다.\n"네 영혼의 한 조각, 좋은 값에 사지."',
    chapter: [4],
    choices: [
      { text: '영혼을 판다 (HP -50)', penalty: { hp: -50 }, result: '몸이 가벼워진다 — 무언가 비어 있다.', reward: { type: 'gem', value: 8 } },
      { text: '거꾸로 산다 (은화 -150)', cost: { gold: 150 }, result: '상인이 작은 결정을 건넨다.', reward: { type: 'random_relic' } },
      { text: '거래를 거절한다', result: '상인이 사라진다.', reward: null },
    ],
  },
  {
    id: 'corruptedRune',
    title: '오염된 룬',
    text: '벽에 새겨진 룬이 검게 물들어 있다.\n만지면 무언가 흘러들 것 같다.',
    chapter: [4],
    choices: [
      { text: '룬을 정화한다 (지능 검정)', stat: '지능', dc: 15,
        success: { text: '깨끗해진 룬이 보상을 토해낸다.', reward: { type: 'gold', value: 130 } },
        fail: { text: '오염이 손끝으로 번진다.', penalty: { hp: -30 } } },
      { text: '룬을 받아들인다', result: '어둠이 너의 일부가 된다.', reward: { type: 'skill_random_lv' } },
      { text: '벽을 부순다 (근력 검정)', stat: '근력', dc: 14,
        success: { text: '룬이 깨어지며 보석을 토한다.', reward: { type: 'gem', value: 4 } },
        fail: { text: '벽이 무너지며 깔린다.', penalty: { hp: -25 } } },
    ],
  },
  {
    id: 'demonForge',
    title: '마계의 화로',
    text: '검은 불꽃이 끝없이 타오르는 화로.\n근처에 망치와 모루가 놓여 있다.',
    chapter: [4],
    choices: [
      { text: '무기를 단련한다 (근력 검정)', stat: '근력', dc: 15,
        success: { text: '무기에 검은 기운이 깃든다.', reward: { type: 'random_relic' } },
        fail: { text: '불꽃에 화상을 입는다.', penalty: { hp: -30 } } },
      { text: '제물로 은화를 바친다 (-200)', cost: { gold: 200 }, result: '화로가 응답한다.', reward: { type: 'gem', value: 8 } },
      { text: '발걸음을 돌린다', result: '화로는 계속 타오른다.', reward: null },
    ],
  },

  // ============================================================
  // === 직업 전용 사건 (classOnly 필터) ===
  // 같은 챕터를 다른 직업으로 돌 때 직업 정체성에 맞는 사건이 등장.
  // 챕터 제약 없음 — 어느 챕터에서도 해당 직업이면 등장 가능.
  // ============================================================
  // --- 방랑검사 (wanderer) ---
  {
    id: 'wanderer_oldMentor',
    title: '옛 스승의 흔적',
    text: '낯익은 검흔이 나무에 새겨져 있다.\n오래 전 너에게 검을 가르쳤던 스승의 자취. 가까운 곳에 누군가 있다.',
    classOnly: ['wanderer'],
    choices: [
      { text: '검흔을 따라간다 (민첩 검정)', stat: '민첩', dc: 14,
        success: { text: '스승이 남긴 검편을 손에 쥔다.', reward: { type: 'random_relic' } },
        fail: { text: '발자국이 흩어진다.', penalty: null } },
      { text: '스승의 가르침을 떠올린다', result: '잊고 있던 형(型)이 떠오른다.', reward: { type: 'skill_random_lv' } },
      { text: '경의만 표하고 떠난다', result: '검흔은 그 자리에 남는다.', reward: null },
    ],
  },
  {
    id: 'wanderer_blindTrial',
    title: '어둠 속의 시험',
    text: '깊은 안개. 눈은 무의미하다.\n검은 너의 또 다른 눈 — 그 사실을 시험할 시간이다.',
    classOnly: ['wanderer'],
    choices: [
      { text: '심안에 의지해 나아간다 (지능 검정)', stat: '지능', dc: 15,
        success: { text: '어둠을 가르고 보석을 발견한다.', reward: { type: 'gem', value: 6 } },
        fail: { text: '안개에 베인다.', penalty: { hp: -25 } } },
      { text: '소리에 집중한다 (민첩 검정)', stat: '민첩', dc: 13,
        success: { text: '발자국 소리를 따라 안전한 길을 찾는다.', reward: { type: 'gold', value: 100 } },
        fail: { text: '발을 헛디딘다.', penalty: { hp: -20 } } },
      { text: '안개를 피해 돌아간다', result: '시간만 지나간다.', reward: null },
    ],
  },
  // --- 술법사 (sage) ---
  {
    id: 'sage_lostGrimoire',
    title: '잊혀진 마법서',
    text: '낡은 책장에 정념계 마법서가 놓여 있다.\n잉크가 살아 움직이며 페이지를 넘긴다.',
    classOnly: ['sage'],
    choices: [
      { text: '책을 해독한다 (지능 검정)', stat: '지능', dc: 15,
        success: { text: '잊혀진 주문을 익힌다.', reward: { type: 'skill_random_lv' } },
        fail: { text: '마법서가 반발한다.', penalty: { hp: -30 } } },
      { text: '책을 가져간다', result: '책이 짐에 짓눌리며 보석을 토한다.', reward: { type: 'gem', value: 4 } },
      { text: '책을 덮는다', result: '책장은 다시 잠잠해진다.', reward: null },
    ],
  },
  {
    id: 'sage_passionOverflow',
    title: '정념의 폭주',
    text: '너의 손끝에서 마력이 들끓는다.\n다스리지 못하면 너를 태울지도 모른다.',
    classOnly: ['sage'],
    choices: [
      { text: '폭주를 다스린다 (지능 검정)', stat: '지능', dc: 14,
        success: { text: '마력을 끌어내려 흡수한다.', reward: { type: 'maxhp', value: 30 } },
        fail: { text: '마력이 너를 태운다.', penalty: { hp: -40 } } },
      { text: '폭주를 쏟아낸다 (근력 검정)', stat: '근력', dc: 13,
        success: { text: '폭발의 잔여가 보석으로 굳는다.', reward: { type: 'gem', value: 5 } },
        fail: { text: '대지가 너를 짓누른다.', penalty: { hp: -25 } } },
      { text: '결계를 친다', result: '마력이 잦아든다.', reward: null },
    ],
  },
  // --- 혼혈 마족 (demonblood) ---
  {
    id: 'demonblood_kin',
    title: '마족의 동족',
    text: '비슷한 핏줄이 너를 알아본다.\n"형제여, 너의 잠재력이 보이는군."',
    classOnly: ['demonblood'],
    choices: [
      { text: '핏줄의 거래에 응한다 (HP -30)', penalty: { hp: -30 }, result: '핏줄이 끓어오른다.', reward: { type: 'random_relic' } },
      { text: '대화로 정보를 얻는다 (매력 검정)', stat: '매력', dc: 14,
        success: { text: '동족이 자신의 결정을 건넨다.', reward: { type: 'gem', value: 5 } },
        fail: { text: '동족이 비웃으며 사라진다.', penalty: null } },
      { text: '동족을 거부한다', result: '동족의 그림자가 멀어진다.', reward: null },
    ],
  },
  {
    id: 'demonblood_bloodThirst',
    title: '핏줄의 갈증',
    text: '내면의 마족이 깨어난다.\n주변의 모든 생명이 너의 표적이 된다 — 견딜 것인가, 풀어줄 것인가.',
    classOnly: ['demonblood'],
    choices: [
      { text: '갈증을 견딘다 (지능 검정)', stat: '지능', dc: 15,
        success: { text: '광기를 다스리고 한 단계 성장한다.', reward: { type: 'skill_random_lv' } },
        fail: { text: '내면의 마족이 너를 갉아먹는다.', penalty: { hp: -35 } } },
      { text: '갈증에 굴복한다', result: '주변의 그림자가 너의 일부가 된다.', reward: { type: 'gold', value: 120 } },
      { text: '주문으로 봉인한다', result: '갈증이 가라앉는다.', reward: { type: 'heal', value: 30 } },
    ],
  },
  // --- 숲의 정령사 (elf) ---
  {
    id: 'elf_forestCall',
    title: '숲의 부름',
    text: '나뭇잎이 너의 이름을 부른다.\n숲은 여전히 너를 기억하고 있다.',
    classOnly: ['elf'],
    choices: [
      { text: '나무와 교감한다 (지능 검정)', stat: '지능', dc: 14,
        success: { text: '숲이 잊혀진 비밀을 건넨다.', reward: { type: 'random_relic' } },
        fail: { text: '교감이 어긋난다.', penalty: null } },
      { text: '바람의 안내를 받는다', result: '숨겨진 보물의 위치가 보인다.', reward: { type: 'gold', value: 100 } },
      { text: '경의만 표하고 떠난다', result: '숲이 한숨을 쉰다.', reward: { type: 'heal', value: 25 } },
    ],
  },
  {
    id: 'elf_twilightKin',
    title: '황혼의 동족',
    text: '먼 곳에 동족의 노래가 들린다.\n홀로 남은 황혼의 자녀가 너를 부른다.',
    classOnly: ['elf'],
    choices: [
      { text: '함께 노래한다 (매력 검정)', stat: '매력', dc: 13,
        success: { text: '노래가 영혼을 채운다.', reward: { type: 'maxhp', value: 25 } },
        fail: { text: '노래가 어긋나 흩어진다.', penalty: null } },
      { text: '동족의 선물을 받는다', result: '오래된 결정을 손에 쥔다.', reward: { type: 'gem', value: 5 } },
      { text: '대화 없이 떠난다', result: '동족이 다음을 기약한다.', reward: null },
    ],
  },
  // --- 여명의 사제 (priest) ---
  {
    id: 'priest_dawnOracle',
    title: '여명의 신탁',
    text: '돌제단 위에 한 줄기 빛이 내린다.\n신탁이 너에게 길을 보여주려 한다.',
    classOnly: ['priest'],
    choices: [
      { text: '신탁을 받든다 (매력 검정)', stat: '매력', dc: 14,
        success: { text: '여명의 축복이 너를 감싼다.', reward: { type: 'skill_random_lv' } },
        fail: { text: '신탁이 흔들리며 사라진다.', penalty: null } },
      { text: '신탁에 응답한다', result: '빛이 보석으로 응축된다.', reward: { type: 'gem', value: 4 } },
      { text: '머리를 숙이고 떠난다', result: '제단이 잠잠해진다.', reward: { type: 'heal', value: 35 } },
    ],
  },
  {
    id: 'priest_doubtTrial',
    title: '의심의 시험',
    text: '신앙이 흔들린다 — "너는 정말 빛의 편인가?"\n네 안의 의심이 너를 시험한다.',
    classOnly: ['priest'],
    choices: [
      { text: '의심을 끌어안는다 (지능 검정)', stat: '지능', dc: 15,
        success: { text: '시험을 통과해 한 걸음 더 깊은 신앙으로 나아간다.', reward: { type: 'skill_random_lv' } },
        fail: { text: '의심이 너를 갉아먹는다.', penalty: { hp: -30 } } },
      { text: '맹세를 다시 한다', result: '신앙이 굳건해진다.', reward: { type: 'maxhp', value: 20 } },
      { text: '시험을 외면한다', result: '의심은 그림자로 남는다.', reward: null },
    ],
  },
];

