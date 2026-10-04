/* 基準數據：詳見「層級基準數據_v1.md」。多數為估計值（職業的垂直彈跳有來源）。 */
const LEVELS = [
  { id: 'fun', name: '興趣愛好者', en: 'CASUAL', desc: '偶爾打球，朋友約球、公園野球' },
  { id: 'rec', name: '業餘球手', en: 'AMATEUR', desc: '固定打球，社區、公司或系隊比賽' },
  { id: 'hs',  name: '高中高等聯賽', en: 'HIGH SCHOOL', desc: '高中籃球聯賽（如 HBL）等級' },
  { id: 'col', name: '大學高等聯賽', en: 'COLLEGE', desc: '大專院校高階聯賽（如 UBA 公開一級）等級' },
  { id: 'pro', name: '職業聯賽', en: 'PRO', desc: '職業球隊或職業聯賽等級' }
];

/* 每個項目依層級順序：[平均, 標準差] */
const ATH_BASE = {
  m: {
    vjStand: [[40, 8], [48, 8], [58, 8], [65, 8], [77.4, 7.7]],
    vjRun:   [[50, 8], [60, 8], [70, 8], [80, 8], [92.4, 7.9]],
    sprint:  [[5.0, 0.4], [4.7, 0.3], [4.4, 0.25], [4.2, 0.25], [4.0, 0.3]],
    height:  [[173, 6], [174, 6], [180, 6], [181, 6], [188, 8]]
  },
  f: {
    vjStand: [[28, 6], [33, 6], [40, 6], [45, 6], [52, 6]],
    vjRun:   [[36, 6], [42, 6], [49, 6], [55, 6], [62, 6]],
    sprint:  [[5.6, 0.4], [5.3, 0.35], [5.0, 0.3], [4.8, 0.3], [4.6, 0.3]],
    height:  [[160, 5], [161, 5], [166, 5], [168, 5], [175, 6]]
  }
};

/* 投籃（男女共用，空檔情境，%） */
const SHOOT_BASE = {
  three: [[25, 8], [30, 7], [33, 6], [35, 5], [38, 4]],
  mid:   [[32, 9], [37, 8], [40, 7], [42, 6], [46, 5]],
  ft:    [[60, 12], [65, 10], [68, 9], [71, 8], [78, 6]]
};

/* 身高依位置調整（cm） */
const POS_OFF = { '': 0, PG: -8, SG: -4, SF: 0, PF: 4, C: 8 };
const POS_NAME = { '': '位置未定', PG: '控球後衛', SG: '得分後衛', SF: '小前鋒', PF: '大前鋒', C: '中鋒' };

const GRADES = ['E-', 'E', 'E+', 'D-', 'D', 'D+', 'C-', 'C', 'C+', 'B-', 'B', 'B+', 'A-', 'A', 'A+'];

const HABITS = [
  '接球投籃', '運球急停跳投', '後仰跳投', '翻身後仰', '後撤步三分', '金雞獨立', '歐洲步', '突破上籃',
  '灌籃／空中終結', '底角三分', '罰球線跳投', '拋投／小勾射', '天勾', '打板中投', '罰球', 'One Motion 快速出手'
];

const DRIBBLE_SKILLS = ['基本運球', '變向過人', '胯下運球', '背後運球', '後轉身', '急停急起', '非慣用手運球'];

/* 雷達圖軸線：從頂端順時針 */
const AX = [
  { k: 'S', zh: '投籃', en: 'SHOOTING' },
  { k: 'P', zh: '組織', en: 'PLAYMAKING' },
  { k: 'D', zh: '防守', en: 'DEFENSE' },
  { k: 'R', zh: '籃板', en: 'REBOUNDING' },
  { k: 'A', zh: '運動能力', en: 'ATHLETICISM' },
  { k: 'I', zh: '球商', en: 'BB IQ' }
];

/* 風格模板：向量順序 [S, P, D, R, A, I]，是我依球風主觀設定的「形狀」，不是官方數據。 */
const TEMPLATES = [
  { n: 'Stephen Curry', g: 'm', pos: ['PG'], v: [98, 85, 55, 38, 70, 92], hab: ['接球投籃', '運球急停跳投', '後撤步三分', 'One Motion 快速出手'], tag: '射手型控衛' },
  { n: 'Kobe Bryant', g: 'm', pos: ['SG', 'SF'], v: [92, 70, 85, 50, 85, 90], hab: ['後仰跳投', '翻身後仰', '運球急停跳投'], tag: '單挑型側翼' },
  { n: 'Cade Cunningham', g: 'm', pos: ['PG', 'SG'], v: [75, 88, 72, 60, 72, 85], hab: ['運球急停跳投', '突破上籃'], tag: '持球大核＋攻守均衡型控衛' },
  { n: 'Luka Doncic', g: 'm', pos: ['PG', 'SF'], v: [88, 95, 55, 70, 60, 97], hab: ['後仰跳投', '運球急停跳投', '後撤步三分'], tag: '持球大核' },
  { n: 'Kawhi Leonard', g: 'm', pos: ['SF'], v: [88, 65, 95, 62, 80, 90], hab: ['罰球線跳投', '後仰跳投'], tag: '攻守兼備側翼' },
  { n: 'Klay Thompson', g: 'm', pos: ['SG'], v: [95, 50, 72, 40, 62, 82], hab: ['接球投籃', '底角三分'], tag: '無球射手' },
  { n: 'Ray Allen', g: 'm', pos: ['SG'], v: [97, 55, 65, 45, 65, 85], hab: ['接球投籃', '底角三分'], tag: '無球射手' },
  { n: 'Chris Paul', g: 'm', pos: ['PG'], v: [82, 97, 80, 40, 55, 99], hab: ['罰球線跳投', '運球急停跳投'], tag: '組織型控衛' },
  { n: 'Ja Morant', dk: true, g: 'm', pos: ['PG'], v: [70, 90, 55, 40, 98, 70], hab: ['突破上籃', '灌籃／空中終結'], tag: '空中突破型控衛' },
  { n: 'Derrick Rose', g: 'm', pos: ['PG'], v: [70, 85, 60, 40, 98, 68], hab: ['突破上籃', '拋投／小勾射'], tag: '爆發突破型控衛' },
  { n: 'Allen Iverson', g: 'm', pos: ['PG', 'SG'], v: [82, 82, 70, 35, 90, 70], hab: ['運球急停跳投', '突破上籃'], tag: '持球得分後衛' },
  { n: 'Giannis Antetokounmpo', dk: true, g: 'm', pos: ['PF', 'SF'], v: [62, 75, 90, 88, 98, 78], hab: ['突破上籃', '灌籃／空中終結', '歐洲步'], tag: '空中攻框型前鋒' },
  { n: 'Rudy Gobert', g: 'm', pos: ['C'], v: [35, 25, 95, 98, 78, 80], hab: ['灌籃／空中終結'], tag: '護框籃板型中鋒' },
  { n: 'Draymond Green', g: 'm', pos: ['PF'], v: [55, 80, 95, 75, 62, 98], hab: ['接球投籃'], tag: '防守組織型前鋒' },
  { n: 'Jrue Holiday', g: 'm', pos: ['PG', 'SG'], v: [72, 75, 94, 55, 75, 90], hab: ['運球急停跳投'], tag: '鎖防型後衛' },
  { n: 'Jimmy Butler', g: 'm', pos: ['SF', 'SG'], v: [75, 78, 90, 62, 75, 92], hab: ['突破上籃', '罰球線跳投'], tag: '硬派攻守側翼' },
  { n: 'Kevin Durant', g: 'm', pos: ['SF', 'PF'], v: [98, 65, 75, 60, 75, 88], hab: ['後仰跳投', '運球急停跳投'], tag: '單挑型長人' },
  { n: 'LeBron James', g: 'm', pos: ['SF', 'PF'], v: [86, 94, 78, 76, 94, 99], hab: ['突破上籃', '灌籃／空中終結', '運球急停跳投', '後仰跳投'], tag: '全能小前鋒' },
  { n: 'Nikola Jokic', g: 'm', pos: ['C'], v: [82, 97, 65, 90, 45, 99], hab: ['拋投／小勾射'], tag: '組織型中鋒' },
  { n: 'Anthony Davis', g: 'm', pos: ['PF', 'C'], v: [72, 45, 95, 92, 88, 80], hab: ['灌籃／空中終結', '罰球線跳投'], tag: '護框全能內線' },

  { n: 'Caitlin Clark', g: 'f', pos: ['PG'], v: [92, 95, 55, 60, 60, 88], hab: ['運球急停跳投', '接球投籃'], tag: '長距離射手型控衛' },
  { n: 'Sabrina Ionescu', g: 'f', pos: ['PG', 'SG'], v: [90, 85, 55, 60, 62, 85], hab: ['運球急停跳投', '接球投籃'], tag: '射手型組織後衛' },
  { n: 'Diana Taurasi', g: 'f', pos: ['SG'], v: [95, 82, 60, 50, 62, 95], hab: ['後仰跳投', '運球急停跳投'], tag: '得分型後衛' },
  { n: 'Sue Bird', g: 'f', pos: ['PG'], v: [80, 95, 70, 35, 55, 98], hab: ['運球急停跳投'], tag: '組織型控衛' },
  { n: "A'ja Wilson", g: 'f', pos: ['C', 'PF'], v: [80, 55, 92, 92, 85, 88], hab: ['灌籃／空中終結', '拋投／小勾射'], tag: '攻守兼備內線' },
  { n: 'Breanna Stewart', g: 'f', pos: ['PF', 'SF'], v: [88, 65, 85, 82, 80, 90], hab: ['罰球線跳投', '接球投籃'], tag: '全能前鋒' },
  { n: 'Candace Parker', g: 'f', pos: ['PF', 'C'], v: [75, 85, 85, 88, 78, 93], hab: ['拋投／小勾射'], tag: '組織型全能內線' },
  { n: 'Napheesa Collier', g: 'f', pos: ['PF', 'SF'], v: [82, 62, 90, 78, 78, 88], hab: ['罰球線跳投', '突破上籃'], tag: '攻守兼備前鋒' },
  { n: 'Elena Delle Donne', g: 'f', pos: ['SF', 'PF'], v: [95, 60, 68, 70, 60, 88], hab: ['接球投籃', '罰球線跳投'], tag: '投射型高個子前鋒' },
  { n: 'Brittney Griner', dk: true, g: 'f', pos: ['C'], v: [55, 35, 92, 85, 70, 78], hab: ['灌籃／空中終結', '拋投／小勾射'], tag: '護框型中鋒' },
  { n: 'Alyssa Thomas', g: 'f', pos: ['PF'], v: [55, 92, 82, 80, 70, 95], hab: ['突破上籃'], tag: '組織型大前鋒' },
  { n: 'Kelsey Plum', g: 'f', pos: ['SG', 'PG'], v: [88, 72, 55, 35, 70, 82], hab: ['運球急停跳投', '接球投籃'], tag: '得分型後衛' },
  { n: 'Chelsea Gray', g: 'f', pos: ['PG'], v: [78, 94, 65, 40, 60, 96], hab: ['運球急停跳投'], tag: '組織型控衛' },

  /* 更多男子：補足各位置，尤其是長人 */
  { n: 'Brook Lopez', g: 'm', pos: ['C'], v: [76, 38, 88, 68, 45, 82], hab: ['接球投籃', '底角三分'], tag: '投射型護框中鋒' },
  { n: 'Naz Reid', g: 'm', pos: ['C', 'PF'], v: [82, 38, 50, 52, 52, 62], hab: ['接球投籃', '拋投／小勾射'], tag: '投射型中鋒' },
  { n: 'Karl-Anthony Towns', g: 'm', pos: ['C', 'PF'], v: [88, 55, 60, 75, 60, 78], hab: ['接球投籃', '後仰跳投'], tag: '全能射手中鋒' },
  { n: 'Kristaps Porzingis', g: 'm', pos: ['C', 'PF'], v: [82, 40, 78, 65, 55, 75], hab: ['接球投籃', '後仰跳投'], tag: '投射型護框中鋒' },
  { n: 'Myles Turner', g: 'm', pos: ['C'], v: [74, 35, 82, 65, 60, 72], hab: ['接球投籃', '底角三分'], tag: '外線護框中鋒' },
  { n: 'Chet Holmgren', g: 'm', pos: ['C', 'PF'], v: [72, 45, 88, 70, 72, 78], hab: ['接球投籃', '灌籃／空中終結'], tag: '外線護框長人' },
  { n: 'Joel Embiid', g: 'm', pos: ['C'], v: [85, 55, 75, 85, 60, 82], hab: ['罰球線跳投', '後仰跳投', '金雞獨立'], tag: '得分型中鋒' },
  { n: 'Bam Adebayo', g: 'm', pos: ['C', 'PF'], v: [62, 70, 90, 80, 82, 85], hab: ['灌籃／空中終結', '罰球線跳投'], tag: '防守型全能中鋒' },
  { n: 'Domantas Sabonis', g: 'm', pos: ['C', 'PF'], v: [68, 85, 55, 92, 45, 92], hab: ['拋投／小勾射'], tag: '組織型籃板中鋒' },
  { n: 'Victor Wembanyama', g: 'm', pos: ['C', 'PF'], v: [78, 55, 95, 85, 85, 80], hab: ['接球投籃', '灌籃／空中終結'], tag: '全能護框怪' },
  { n: 'Al Horford', g: 'm', pos: ['C', 'PF'], v: [76, 55, 75, 70, 40, 95], hab: ['接球投籃', '底角三分'], tag: '老謀深算的投射中鋒' },
  { n: 'Lauri Markkanen', g: 'm', pos: ['PF', 'SF'], v: [88, 40, 55, 68, 70, 72], hab: ['接球投籃', '運球急停跳投'], tag: '投射型前鋒' },
  { n: 'Kevin Love', g: 'm', pos: ['PF', 'C'], v: [82, 55, 45, 85, 40, 80], hab: ['接球投籃', '底角三分'], tag: '投射型籃板前鋒' },
  { n: 'Pascal Siakam', g: 'm', pos: ['PF', 'SF'], v: [72, 60, 75, 70, 78, 75], hab: ['突破上籃', '翻身後仰'], tag: '機動型前鋒' },
  { n: 'Jaren Jackson Jr.', g: 'm', pos: ['PF', 'C'], v: [75, 40, 88, 60, 72, 70], hab: ['接球投籃', '灌籃／空中終結'], tag: '外線護框前鋒' },
  { n: 'Evan Mobley', g: 'm', pos: ['PF', 'C'], v: [60, 55, 88, 75, 80, 78], hab: ['灌籃／空中終結'], tag: '防守型全能前鋒' },
  { n: 'Jayson Tatum', g: 'm', pos: ['SF', 'PF'], v: [88, 70, 75, 68, 80, 82], hab: ['後仰跳投', '運球急停跳投'], tag: '全能得分前鋒' },
  { n: 'Paul George', g: 'm', pos: ['SF', 'SG'], v: [88, 68, 82, 55, 70, 80], hab: ['運球急停跳投', '接球投籃'], tag: '3&D 得分側翼' },
  { n: 'Devin Booker', g: 'm', pos: ['SG'], v: [90, 72, 55, 40, 65, 80], hab: ['後仰跳投', '運球急停跳投'], tag: '得分型後衛' },

  /* 招牌技能型球星：後撤步三分、金雞獨立、歐洲步 */
  { n: 'James Harden', g: 'm', pos: ['SG', 'PG'], v: [90, 90, 60, 50, 65, 88], hab: ['後撤步三分', '歐洲步', '運球急停跳投'], sig: ['後撤步三分'], tag: '後撤步三分大師' },
  { n: 'Damian Lillard', g: 'm', pos: ['PG'], v: [93, 80, 50, 35, 70, 85], hab: ['後撤步三分', '運球急停跳投'], sig: ['後撤步三分'], tag: '超遠距離後撤步射手' },
  { n: 'Kyrie Irving', g: 'm', pos: ['PG', 'SG'], v: [90, 82, 55, 35, 70, 88], hab: ['運球急停跳投', '後撤步三分', '歐洲步'], tag: '花式運球得分後衛' },
  { n: 'Manu Ginobili', g: 'm', pos: ['SG'], v: [80, 80, 70, 45, 75, 95], hab: ['歐洲步', '後撤步三分'], sig: ['歐洲步'], tag: '歐洲步鼻祖' },
  { n: 'Dirk Nowitzki', g: 'm', pos: ['PF', 'C'], v: [95, 50, 55, 70, 40, 90], hab: ['金雞獨立', '罰球線跳投', '接球投籃'], sig: ['金雞獨立'], tag: '金雞獨立投射長人' },

  /* 招牌技能：天勾、打板中投、罰球 */
  { n: 'Kareem Abdul-Jabbar', g: 'm', pos: ['C'], v: [82, 50, 80, 85, 70, 92], hab: ['天勾', '拋投／小勾射'], sig: ['天勾'], tag: '天勾之王' },
  { n: 'Tim Duncan', g: 'm', pos: ['PF', 'C'], v: [70, 55, 90, 88, 60, 96], hab: ['打板中投', '罰球線跳投'], sig: ['打板中投'], tag: '打板中投教科書' },
  { n: 'Shai Gilgeous-Alexander', g: 'm', pos: ['PG', 'SG'], v: [88, 78, 78, 45, 80, 90], hab: ['罰球', '運球急停跳投', '突破上籃', '歐洲步'], sig: ['罰球'], tag: '罰球製造機' },

  /* 扣將：使用者同時有「灌籃」習慣與高彈跳時，會加進風格對照 */
  { n: 'Vince Carter', dk: true, g: 'm', pos: ['SG', 'SF'], v: [82, 60, 65, 45, 99, 80], hab: ['灌籃／空中終結', '突破上籃'], tag: '半人半神的空中飛人' },
  { n: 'Michael Jordan', dk: true, g: 'm', pos: ['SG', 'SF'], v: [92, 70, 92, 55, 99, 98], hab: ['灌籃／空中終結', '後仰跳投'], tag: '空中傳奇' },
  { n: 'Dominique Wilkins', dk: true, g: 'm', pos: ['SF'], v: [82, 50, 55, 60, 95, 70], hab: ['灌籃／空中終結', '突破上籃'], tag: '人類電影精華' },
  { n: 'Zach LaVine', dk: true, g: 'm', pos: ['SG'], v: [85, 55, 50, 40, 96, 70], hab: ['灌籃／空中終結', '運球急停跳投'], tag: '空中得分後衛' },
  { n: 'Nate Robinson', dk: true, g: 'm', pos: ['PG'], v: [75, 65, 50, 25, 92, 60], hab: ['灌籃／空中終結', '運球急停跳投'], tag: '小個子扣將' },
  { n: 'Derrick Jones Jr.', dk: true, g: 'm', pos: ['SF', 'PF'], v: [50, 40, 70, 50, 96, 60], hab: ['灌籃／空中終結'], tag: '空接扣將' },
  { n: 'Aaron Gordon', dk: true, g: 'm', pos: ['PF', 'SF'], v: [62, 55, 80, 70, 92, 75], hab: ['灌籃／空中終結', '突破上籃'], tag: '全能扣將前鋒' },
  { n: 'Blake Griffin', dk: true, g: 'm', pos: ['PF'], v: [60, 65, 60, 80, 95, 70], hab: ['灌籃／空中終結', '突破上籃'], tag: '暴力扣將前鋒' },
  { n: 'Zion Williamson', dk: true, g: 'm', pos: ['PF'], v: [60, 50, 55, 70, 97, 65], hab: ['灌籃／空中終結', '突破上籃'], tag: '爆發型扣將前鋒' },
  { n: 'Shawn Kemp', dk: true, g: 'm', pos: ['PF', 'C'], v: [55, 45, 70, 85, 96, 65], hab: ['灌籃／空中終結'], tag: '雷霆扣將' },
  { n: 'DeAndre Jordan', dk: true, g: 'm', pos: ['C'], v: [20, 25, 80, 92, 88, 60], hab: ['灌籃／空中終結'], tag: '空接扣將中鋒' },
  { n: 'Dwight Howard', dk: true, g: 'm', pos: ['C'], v: [25, 25, 90, 95, 88, 65], hab: ['灌籃／空中終結'], tag: '禁區霸主扣將' },
  { n: 'Clint Capela', dk: true, g: 'm', pos: ['C'], v: [25, 25, 80, 90, 86, 60], hab: ['灌籃／空中終結'], tag: '空接護框中鋒' },
  { n: 'Lisa Leslie', dk: true, g: 'f', pos: ['C'], v: [75, 45, 85, 85, 75, 85], hab: ['灌籃／空中終結', '拋投／小勾射'], tag: '開創灌籃先河的中鋒' },

  /* ---- 第二批球星：補足各位置與各種體型 ---- */
  /* size：'big' ＝ 以該位置來說特別高大，'small' ＝ 特別嬌小；對照時會和使用者的身高相對值比較 */
  /* 控衛 */
  { n: 'Ben Simmons', g: 'm', pos: ['PG', 'PF'], size: 'big', v: [28, 90, 85, 68, 85, 85], hab: ['突破上籃', '灌籃／空中終結'], tag: '不投三分的高大控衛' },
  { n: 'Magic Johnson', g: 'm', pos: ['PG', 'SF'], size: 'big', v: [75, 99, 72, 72, 72, 99], hab: ['突破上籃', '拋投／小勾射'], tag: '高大全能控衛' },
  { n: 'LaMelo Ball', g: 'm', pos: ['PG', 'SG'], size: 'big', v: [78, 93, 60, 62, 72, 85], hab: ['運球急停跳投', '後撤步三分'], tag: '大個子花式控衛' },
  { n: 'Jason Kidd', g: 'm', pos: ['PG'], v: [60, 96, 82, 68, 70, 96], hab: ['突破上籃'], tag: '大三元控衛' },
  { n: 'Rajon Rondo', g: 'm', pos: ['PG'], v: [45, 95, 76, 40, 65, 96], hab: ['突破上籃'], tag: '傳球至上的組織者' },
  { n: 'Steve Nash', g: 'm', pos: ['PG'], v: [92, 94, 38, 25, 50, 95], hab: ['罰球', '接球投籃', '運球急停跳投'], tag: '雙料 MVP 射手控衛' },
  { n: 'John Stockton', g: 'm', pos: ['PG'], v: [78, 97, 82, 30, 55, 96], hab: ['接球投籃', '罰球線跳投'], tag: '助攻抄截王' },
  { n: 'Russell Westbrook', dk: true, g: 'm', pos: ['PG'], v: [52, 86, 72, 72, 97, 70], hab: ['突破上籃', '灌籃／空中終結'], tag: '大三元爆發控衛' },
  { n: 'John Wall', g: 'm', pos: ['PG'], v: [55, 90, 72, 45, 96, 70], hab: ['突破上籃'], tag: '極速突破控衛' },
  { n: 'Muggsy Bogues', g: 'm', pos: ['PG'], size: 'small', v: [45, 90, 82, 25, 70, 85], hab: ['突破上籃'], tag: '全聯盟最矮的抄截大師' },
  { n: 'Isaiah Thomas', g: 'm', pos: ['PG'], size: 'small', v: [86, 78, 35, 20, 70, 80], hab: ['突破上籃', '運球急停跳投', '罰球'], tag: '小個子得分機器' },
  { n: 'Trae Young', g: 'm', pos: ['PG'], size: 'small', v: [88, 96, 35, 20, 60, 82], hab: ['後撤步三分', '拋投／小勾射'], tag: '長距離組織射手' },
  { n: 'Tyrese Haliburton', g: 'm', pos: ['PG'], v: [82, 95, 60, 35, 65, 93], hab: ['接球投籃', '運球急停跳投'], tag: '助攻型射手控衛' },
  { n: 'Jalen Brunson', g: 'm', pos: ['PG'], v: [85, 82, 45, 25, 60, 92], hab: ['運球急停跳投', '後仰跳投'], tag: '中距離得分控衛' },
  /* 後衛與前鋒 */
  { n: 'Tony Allen', g: 'm', pos: ['SG', 'SF'], v: [32, 40, 99, 40, 82, 85], hab: [], tag: '鎖喉之王' },
  { n: 'Dwyane Wade', g: 'm', pos: ['SG'], v: [80, 86, 88, 55, 92, 92], hab: ['突破上籃', '歐洲步', '灌籃／空中終結'], tag: '全能得分後衛' },
  { n: 'Donovan Mitchell', g: 'm', pos: ['SG'], v: [85, 78, 58, 35, 90, 76], hab: ['運球急停跳投', '灌籃／空中終結'], tag: '爆發得分後衛' },
  { n: 'Anthony Edwards', dk: true, g: 'm', pos: ['SG'], v: [82, 70, 72, 50, 97, 72], hab: ['灌籃／空中終結', '運球急停跳投'], tag: '空中得分後衛' },
  { n: 'Marcus Smart', g: 'm', pos: ['SG', 'PG'], v: [60, 72, 92, 35, 75, 90], hab: [], tag: '防守型後衛' },
  { n: 'Scottie Pippen', g: 'm', pos: ['SF'], v: [75, 88, 96, 65, 86, 95], hab: ['突破上籃', '灌籃／空中終結'], tag: '防守全能前鋒' },
  { n: 'Paul Pierce', g: 'm', pos: ['SF'], v: [88, 70, 65, 50, 60, 92], hab: ['後仰跳投', '後撤步三分'], tag: '關鍵球殺手' },
  { n: 'Carmelo Anthony', g: 'm', pos: ['SF', 'PF'], v: [90, 60, 50, 60, 70, 70], hab: ['後仰跳投', '運球急停跳投', '罰球線跳投'], tag: '純得分型前鋒' },
  { n: 'Dennis Rodman', g: 'm', pos: ['PF', 'SF'], v: [20, 40, 95, 99, 80, 85], hab: [], tag: '籃板怪傑' },
  { n: 'Charles Barkley', g: 'm', pos: ['PF'], v: [75, 60, 65, 92, 75, 80], hab: ['突破上籃', '後仰跳投'], tag: '小號大前鋒籃板王' },
  { n: 'Karl Malone', g: 'm', pos: ['PF'], v: [80, 60, 75, 86, 72, 85], hab: ['罰球線跳投', '拋投／小勾射'], tag: '擋拆終結者' },
  { n: 'Kevin Garnett', g: 'm', pos: ['PF', 'C'], v: [82, 72, 95, 88, 82, 96], hab: ['罰球線跳投'], tag: '防守全能大前鋒' },
  /* 中鋒 */
  { n: "Shaquille O'Neal", dk: true, g: 'm', pos: ['C'], v: [40, 40, 85, 96, 90, 72], hab: ['灌籃／空中終結'], tag: '禁區統治者' },
  { n: 'Hakeem Olajuwon', g: 'm', pos: ['C'], v: [86, 55, 96, 95, 85, 92], hab: ['翻身後仰', '拋投／小勾射'], sig: ['翻身後仰'], tag: '夢幻腳步' },
  { n: 'Yao Ming', g: 'm', pos: ['C'], v: [76, 48, 80, 86, 50, 86], hab: ['罰球線跳投', '拋投／小勾射'], tag: '高大溫柔型中鋒' },
  { n: 'Dikembe Mutombo', g: 'm', pos: ['C'], v: [25, 20, 99, 92, 72, 82], hab: [], tag: '護框之神' },
  { n: 'Ben Wallace', g: 'm', pos: ['C'], v: [15, 25, 96, 96, 80, 85], hab: [], tag: '防守籃板怪' },
  { n: 'Steven Adams', g: 'm', pos: ['C'], v: [40, 50, 76, 93, 55, 75], hab: [], tag: '卡位肉盾' },
  /* 女子 */
  { n: 'Sylvia Fowles', g: 'f', pos: ['C'], v: [55, 40, 95, 92, 80, 85], hab: ['灌籃／空中終結'], tag: '護框籃板型中鋒' },
  { n: 'Maya Moore', g: 'f', pos: ['SF'], v: [88, 72, 78, 65, 75, 90], hab: ['接球投籃', '運球急停跳投'], tag: '全能得分前鋒' },
  { n: 'Tamika Catchings', g: 'f', pos: ['SF', 'PF'], v: [76, 70, 97, 82, 80, 96], hab: [], tag: '防守型全能前鋒' },
  { n: 'Aliyah Boston', g: 'f', pos: ['C'], v: [72, 58, 85, 85, 66, 80], hab: ['拋投／小勾射'], tag: '穩健全能中鋒' },
  { n: 'Courtney Vandersloot', g: 'f', pos: ['PG'], v: [75, 97, 55, 35, 60, 95], hab: ['運球急停跳投'], tag: '助攻型控衛' },
  { n: 'Skylar Diggins-Smith', g: 'f', pos: ['PG', 'SG'], v: [82, 86, 60, 40, 70, 86], hab: ['運球急停跳投'], tag: '得分型控衛' }
];

/* ---------- 角色建立選項（像素球員） ---------- */
const PALETTE = ['#c8102e', '#1d428a', '#fdb927', '#552583', '#007a33', '#111827', '#ffffff', '#f58426', '#5bc0eb', '#ff4fa3', '#9ca3af', '#8b5a2b'];
const PALETTE_NAMES = ['紅', '寶藍', '金', '紫', '綠', '黑', '白', '橘', '天藍', '粉', '銀灰', '棕'];
const HAIR_STYLES = ['光頭', '平頭', '油頭', '爆炸頭', '髒辮', '玉米辮', '丸子頭', '中分長髮'];
const HAIR_COLORS = ['#1b1b1f', '#4a2f1b', '#e6c04a', '#c62828', '#2f6fe0', '#d9dde3', '#ff7eb6', '#3dc46a'];
const HAIR_COLOR_NAMES = ['黑', '深棕', '金', '紅', '藍', '銀白', '粉', '綠'];
const SKIN_TONES = ['#ffd9b8', '#f1c08e', '#d9a066', '#a8703a', '#6b4226'];
const SKIN_NAMES = ['白皙', '自然', '小麥', '古銅', '深棕'];
const JERSEY_STYLES = ['經典純色', '側邊條紋', '胸前橫條', '斜肩帶', '雙色拼接', '肩部雙色', '垂直細紋', '閃電', '星星', '橫向條紋', 'V 領滾邊', '漸層'];
const HEIGHT_NAMES = ['矮', '中', '高'];
const BUILD_NAMES = ['瘦', '標準', '壯'];
const SOCK_NAMES = ['無', '短襪', '中筒', '長襪'];
const WRIST_NAMES = ['無', '腕帶', '護臂套'];
const GLASS_NAMES = ['無', '黑框眼鏡', '運動護目鏡'];

function defaultChar() {
  return { hair: 1, hairColor: 0, skin: 1, height: 1, heightSet: false, build: 1, jersey: 0, c1: 1, c2: 6, shorts: 0,
    headband: -1, wrist: 0, wristColor: 6, socks: 2, sockColor: 6, shoes: 6, glasses: 0 };
}
