import {IDLE_VARIANTS} from './idle-director.mjs';
// v0.90 莓香碰／槓：原片碰停在雙手垂下、槓從那裡開始，接回待機會疊影。用使用者拍的接回片（19格）補在碰結尾、倒放補在槓開頭；
// 碰槓原本的動作速度不變（碰 56 格 850ms、槓 88 格 850ms 的速率），所以總長變成 1138／1034ms。
export const CHARACTER_CLIPS=Object.freeze({idle:{frames:96},call:{frames:72},pon:{frames:75},kan:{frames:107},ready:{frames:60},look:{frames:30,fps:12},apron:{frames:36,fps:12},tap:{frames:40,fps:12},poke:{frames:42,fps:12},hair:{frames:41,fps:12},cake:{frames:66,fps:12}});
// tap: player pokes the character (easter egg). Natural speed, voice cut from the same window for lip sync.
export const CHARACTER_ACTIONS=Object.freeze({chi:{clip:'call',duration:650,first:16},pon:{clip:'pon',duration:1138,first:0},kan:{clip:'kan',duration:1034,first:0},ready:{clip:'ready',duration:1000,first:8},tap:{clip:'tap',duration:3333,first:0},poke:{clip:'poke',duration:3500,first:0}});
export const ICHIKA_PROFILE=Object.freeze({clips:CHARACTER_CLIPS,actions:CHARACTER_ACTIONS,idleVariants:IDLE_VARIANTS,notes:{chi:'吃：保留原本輕快招手的動作。',pon:'碰：單手握拳、俐落點頭。',kan:'槓：雙手抬起，表情更得意。',ready:'聽：保留已認可的聽牌反應。'},idleNote:'自然待機以安靜呼吸為主，間隔隨機眨眼；每 12–20 秒輪替歪頭微笑、低頭看牌、整理圍裙、撥頭髮、拿出蛋糕，避免連續重複。'});
export const MIMI_PROFILE=Object.freeze({
 clips:{idle:{frames:1,fps:1},call:{frames:36},pon:{frames:42},kan:{frames:48},ready:{frames:54},look:{frames:36,fps:12},hat:{frames:36,fps:12},blink:{frames:6},tap:{frames:32,fps:12},poke:{frames:36,fps:12},snack:{frames:58,fps:12}},
 actions:{chi:{clip:'call',duration:650,first:0},pon:{clip:'pon',duration:850,first:0},kan:{clip:'kan',duration:850,first:0},ready:{clip:'ready',duration:1000,first:0},tap:{clip:'tap',duration:2667,first:0},poke:{clip:'poke',duration:3000,first:0}},
 idleVariants:{blink:{label:'眨眼',clip:'blink',duration:250,first:0,last:5,lead:0,tail:0},look:{label:'低頭看牌',clip:'look',duration:3000,first:0,last:35,lead:150,tail:200},hat:{label:'輕扶廚師帽',clip:'hat',duration:3000,first:0,last:35,lead:150,tail:200},snack:{label:'大口吃飯糰',clip:'snack',duration:4833,first:0,last:57,lead:150,tail:200}},
 notes:{chi:'吃：眼睛一亮，張掌示意。',pon:'碰：雙手握小拳往胸前一收。',kan:'槓：單拳抬到肩旁；語音已去除多餘尾音。',ready:'聽：一手叉腰、另一手舉指；採用第二支影片的聽牌語音。'},
 idleNote:'自然待機以安靜呼吸為主，3.5–7秒隨機眨眼（取自吃／碰原片動作前的自然眨眼，只換眼部）；輪替低頭看牌、輕扶廚師帽、大口吃飯糰。'
});
export const HARUMI_PROFILE=Object.freeze({
 clips:{idle:{frames:1,fps:1},call:{frames:36,fps:12},pon:{frames:30,fps:12},kan:{frames:36,fps:12},ready:{frames:36,fps:12},look:{frames:36,fps:12},cuff:{frames:42,fps:12},blink:{frames:8},tap:{frames:39,fps:12},poke:{frames:38,fps:12},earring:{frames:41,fps:12}},
 actions:{chi:{clip:'call',duration:750,first:0},pon:{clip:'pon',duration:850,first:0},kan:{clip:'kan',duration:950,first:0},ready:{clip:'ready',duration:1000,first:0},tap:{clip:'tap',duration:3250,first:0},poke:{clip:'poke',duration:3167,first:0}},
 idleVariants:{blink:{label:'眨眼',clip:'blink',duration:300,first:0,last:7,lead:0,tail:0},look:{label:'掃視牌面',clip:'look',duration:3000,first:0,last:35,lead:150,tail:200},cuff:{label:'整理袖口',clip:'cuff',duration:3500,first:0,last:41,lead:150,tail:200},earring:{label:'撥弄金耳環',clip:'earring',duration:3417,first:0,last:40,lead:150,tail:320}},
 notes:{chi:'吃：採用四秒補拍版的張掌動作與正確發音。',pon:'碰：單手向前示意，俐落而篤定。',kan:'槓：張掌抬到肩前，自信宣告。',ready:'聽：指尖靠近下巴，帶著胸有成竹的微笑。'},
 idleNote:'自然待機以安靜呼吸為主，3.5–7秒隨機眨眼（原片慢閉眼的前後段接成，只換眼部）；輪替掃視牌面、整理袖口、撥弄金耳環；待機片段全程靜音。'
});
export const GONDO_PROFILE=Object.freeze({
 clips:{idle:{frames:1,fps:1},call:{frames:21,fps:12},pon:{frames:21,fps:12},kan:{frames:24,fps:12},ready:{frames:24,fps:12},look:{frames:36,fps:12},haori:{frames:36,fps:12},blink:{frames:10},tap:{frames:36,fps:12},poke:{frames:45,fps:12},fan:{frames:40,fps:12}},
 actions:{chi:{clip:'call',duration:700,first:0},pon:{clip:'pon',duration:800,first:0},kan:{clip:'kan',duration:850,first:0},ready:{clip:'ready',duration:1000,first:0},tap:{clip:'tap',duration:3000,first:0},poke:{clip:'poke',duration:3750,first:0}},
 idleVariants:{blink:{label:'眨眼',clip:'blink',duration:400,first:0,last:9,lead:0,tail:0},look:{label:'垂眼看牌',clip:'look',duration:3000,first:0,last:35,lead:150,tail:200},haori:{label:'輕整羽織',clip:'haori',duration:3000,first:0,last:35,lead:150,tail:200},fan:{label:'甩開摺扇',clip:'fan',duration:3333,first:0,last:39,lead:150,tail:320}},
 notes:{chi:'吃：單手張掌，簡短示意。',pon:'碰：豎掌宣告，配一下乾脆點頭。',kan:'槓：提拳宣告；語音已剪除接上的多餘台詞。',ready:'聽：抬下巴、微微挺身，自信而沉穩。'},
 idleNote:'自然待機以安靜呼吸為主，3.5–7秒隨機用力閉眼一下（取自待機原片，只換眼部）；輪替垂眼看牌、輕整羽織、甩開摺扇；待機片段全程靜音。'
});
// v1.53 · 金田珍英 (user, 2026-10-21): five Flow clips cut into the usual set — 吃+碰, 槓+聽, a tap, a poke and a silent
// idle (beret, then a glance at the tiles). Each clip's first frame is registered onto her idle chibi.
export const JINYING_PROFILE=Object.freeze({
 clips:{idle:{frames:1,fps:1},call:{frames:39,fps:12},pon:{frames:37,fps:12},kan:{frames:35,fps:12},ready:{frames:39,fps:12},tap:{frames:46,fps:12},poke:{frames:43,fps:12},hat:{frames:46,fps:12},look:{frames:46,fps:12},noodle:{frames:65,fps:12},blink:{frames:6}},
 actions:{chi:{clip:'call',duration:800,first:0},pon:{clip:'pon',duration:950,first:0},kan:{clip:'kan',duration:900,first:0},ready:{clip:'ready',duration:1100,first:0},tap:{clip:'tap',duration:3833,first:0},poke:{clip:'poke',duration:3583,first:0}},
 idleVariants:{/* v1.58 · blink drawn on the chibi itself (ChatGPT half/closed eyes, only the eye area swapped) */blink:{label:'眨眼',clip:'blink',duration:250,first:0,last:5,lead:0,tail:0},hat:{label:'整理軟帽',clip:'hat',duration:3833,first:0,last:45,lead:150,tail:200},look:{label:'低頭看牌',clip:'look',duration:3833,first:0,last:45,lead:150,tail:200},/* v1.72 · 招牌待機：端出湯麵大口吸，Flow 起訖同圖 */noodle:{label:'大口吸麵',clip:'noodle',duration:5417,first:0,last:64,lead:150,tail:200}},
 notes:{chi:'吃：掌心朝上往旁邊一比。',pon:'碰：手往前一伸、輕輕點頭。',kan:'槓：雙手往兩旁攤開，帶點得意；語音已剪掉多餘尾音。',ready:'聽（リーチ）：手掌朝上往牌桌一比。'},
 idleNote:'v1.61 · 各動作都以站姿當首尾幀重做（一支一個動作），收尾不再有殘影；眨眼用 Q 版本身的半閉、全閉圖；輪替整理軟帽、低頭看牌、大口吸麵（v1.72 招牌動作）；待機片段全程靜音。'
});
