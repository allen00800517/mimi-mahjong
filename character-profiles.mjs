import {IDLE_VARIANTS} from './idle-director.mjs';
export const CHARACTER_CLIPS=Object.freeze({idle:{frames:96},call:{frames:72},pon:{frames:72},kan:{frames:96},ready:{frames:60},look:{frames:30,fps:12},apron:{frames:36,fps:12}});
export const CHARACTER_ACTIONS=Object.freeze({chi:{clip:'call',duration:650,first:16},pon:{clip:'pon',duration:850,first:16},kan:{clip:'kan',duration:850,first:8},ready:{clip:'ready',duration:1000,first:8}});
export const ICHIKA_PROFILE=Object.freeze({clips:CHARACTER_CLIPS,actions:CHARACTER_ACTIONS,idleVariants:IDLE_VARIANTS,notes:{chi:'吃：保留原本輕快招手的動作。',pon:'碰：單手握拳、俐落點頭。',kan:'槓：雙手抬起，表情更得意。',ready:'聽：保留已認可的聽牌反應。'},idleNote:'自然待機以安靜呼吸為主，間隔隨機眨眼；隔久一點才輪替歪頭微笑、低頭看牌、整理圍裙，避免連續重複。'});
export const MIMI_PROFILE=Object.freeze({
 clips:{idle:{frames:1,fps:1},call:{frames:36},pon:{frames:42},kan:{frames:48},ready:{frames:54},look:{frames:36,fps:12},hat:{frames:36,fps:12}},
 actions:{chi:{clip:'call',duration:650,first:0},pon:{clip:'pon',duration:850,first:0},kan:{clip:'kan',duration:850,first:0},ready:{clip:'ready',duration:1000,first:0}},
 idleVariants:{look:{label:'低頭看牌',clip:'look',duration:3000,first:0,last:35,lead:150,tail:200},hat:{label:'輕扶廚師帽',clip:'hat',duration:3000,first:0,last:35,lead:150,tail:200}},
 notes:{chi:'吃：眼睛一亮，張掌示意。',pon:'碰：雙手握小拳往胸前一收。',kan:'槓：單拳抬到肩旁；語音已去除多餘尾音。',ready:'聽：一手叉腰、另一手舉指；採用第二支影片的聽牌語音。'},
 idleNote:'自然待機以安靜呼吸為主，低頻輪替低頭看牌與輕扶廚師帽；眨眼保留在原片小動作裡。'
});
export const HARUMI_PROFILE=Object.freeze({
 clips:{idle:{frames:1,fps:1},call:{frames:36,fps:12},pon:{frames:30,fps:12},kan:{frames:36,fps:12},ready:{frames:36,fps:12},look:{frames:36,fps:12},cuff:{frames:42,fps:12}},
 actions:{chi:{clip:'call',duration:750,first:0},pon:{clip:'pon',duration:850,first:0},kan:{clip:'kan',duration:950,first:0},ready:{clip:'ready',duration:1000,first:0}},
 idleVariants:{look:{label:'掃視牌面',clip:'look',duration:3000,first:0,last:35,lead:150,tail:200},cuff:{label:'整理袖口',clip:'cuff',duration:3500,first:0,last:41,lead:150,tail:200}},
 notes:{chi:'吃：採用四秒補拍版的張掌動作與正確發音。',pon:'碰：單手向前示意，俐落而篤定。',kan:'槓：張掌抬到肩前，自信宣告。',ready:'聽：指尖靠近下巴，帶著胸有成竹的微笑。'},
 idleNote:'自然待機以安靜呼吸為主，低頻輪替掃視牌面與整理袖口；待機片段全程靜音。'
});
export const GONDO_PROFILE=Object.freeze({
 clips:{idle:{frames:1,fps:1},call:{frames:21,fps:12},pon:{frames:21,fps:12},kan:{frames:24,fps:12},ready:{frames:24,fps:12},look:{frames:36,fps:12},haori:{frames:36,fps:12}},
 actions:{chi:{clip:'call',duration:700,first:0},pon:{clip:'pon',duration:800,first:0},kan:{clip:'kan',duration:850,first:0},ready:{clip:'ready',duration:1000,first:0}},
 idleVariants:{look:{label:'垂眼看牌',clip:'look',duration:3000,first:0,last:35,lead:150,tail:200},haori:{label:'輕整羽織',clip:'haori',duration:3000,first:0,last:35,lead:150,tail:200}},
 notes:{chi:'吃：單手張掌，簡短示意。',pon:'碰：豎掌宣告，配一下乾脆點頭。',kan:'槓：提拳宣告；語音已剪除接上的多餘台詞。',ready:'聽：抬下巴、微微挺身，自信而沉穩。'},
 idleNote:'自然待機以安靜呼吸為主，低頻輪替垂眼看牌與輕整羽織；待機片段全程靜音。'
});
