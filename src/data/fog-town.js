/* 示例剧情：雾镇 · 第一夜 */
import {E,N,O} from '../core/story.js';

export const SAMPLE={
  name:'雾镇 · 第一夜', start:'arrive', currency:'铜币', startMoney:2,
  items:{candle:'蜡烛',key:'铜钥匙'},
  clues:{bell:'第一声钟响是假的',notpriest:'神父不是敲钟人',name:'修女的名字：艾格尼丝'},
  nodes:{
    arrive:N('镇口','story',40,'你在雾中醒来。镇口的钟敲了一下，又一下。口袋里只有两枚铜币。你只知道，午夜之前必须找到敲钟的人。',[O('去酒馆打听消息','tavern'),O('去教堂','church'),O('直奔钟楼','gate')]),
    tavern:N('酒馆','rest',50,'炉火很暗。老板在擦杯子，角落里一个醉汉在自言自语。柜台上摆着一排蜡烛。',[O('请他喝一杯','drunk',{costMoney:2,obj:'醉汉'}),O('帮忙擦杯子，赚点钱','tavern',{gainMoney:3,obj:'老板'}),O('买两支蜡烛','tavern',{costMoney:3,gainItem:'candle',gainQty:2,obj:'老板'}),O('讨一支蜡烛，然后离开','square',{gainItem:'candle',obj:'老板'}),O('离开酒馆','square')]),
    drunk:N('醉汉','story',60,'醉汉一口喝干，抓住你的袖子：“钟……钟会响两次。第一次，是骗人的……”',[O('耐心听他说完','square',{gainClue:'bell',obj:'醉汉'}),O('甩开他离开','square',{obj:'醉汉'})]),
    square:N('广场','story',25,'雾浓得看不见脚下。干涸的喷泉底下好像有东西在反光。教堂和钟楼的方向都有一点微弱的光。',[O('在喷泉底摸硬币','square',{gainMoney:1,once:true,obj:'喷泉'}),O('去教堂','church'),O('去钟楼','gate')]),
    church:N('教堂','story',45,'神父跪在祭坛前祷告。一本祷告书摊开在长椅上，书页间露出一截铜色。',[O('翻看祷告书','priest',{gainItem:'key'}),O('直接走向神父','priest')]),
    priest:N('神父','choice',50,'神父慢慢转过身：“迷途的人，你来找什么？”',[O('“敲钟的人就是你！”','d_priest',{obj:'神父'}),O('“我知道敲钟的不是你。”','ally',{needClue:'notpriest',obj:'神父'}),O('什么也不说，离开','gate',{obj:'神父'})],[E('神父就是凶手，当面揭穿他',0,false)]),
    ally:N('神父的托付','story',40,'神父松了一口气：“她每晚都从地窖走上钟楼。拿着这些，地窖里很黑。”他把两支蜡烛塞进你手里。',[O('前往钟楼','gate',{gainItem:'candle',gainQty:2})]),
    gate:N('钟楼门前','choice',35,'门锁着。一个守夜人缩在门边打盹，门后传来缓慢的脚步声。',[O('用铜钥匙开门','stairs',{needItem:'key',obj:'钟楼大门'}),O('塞给守夜人 5 枚铜币','stairs',{costMoney:5,obj:'守夜人'}),O('绕到钟楼后面','cellar'),O('用力撞门','d_door',{obj:'钟楼大门'})],[E('钟楼里的人不是神父',-1,true,'go','notpriest'),E('守夜人收钱就放行',1,true),E('从后面走，多带几支蜡烛',2,true),E('门是朽木做的，撞开它',3,false)]),
    cellar:N('地窖','choice',30,'地窖里一片漆黑，潮湿的石阶一直往下延伸。',[O('点燃一支蜡烛','lit',{needItem:'candle',useItem:true}),O('摸黑前进','d_dark')],[E('别浪费蜡烛，摸黑也能走',1,false)]),
    lit:N('刻满名字的墙','story',45,'烛光照亮了整面墙：密密麻麻刻满了名字。最新的一个，刻痕还很新——“艾格尼丝”。蜡烛快烧完了。',[O('记下名字，沿楼梯上去','stairs',{gainClue:'name',obj:'墙上的名字'}),O('记下名字，再点一支蜡烛走向深处','passage',{gainClue:'name',needItem:'candle',useItem:true,obj:'墙上的名字'}),O('摸黑往深处走','d_deep')]),
    passage:N('密道','story',35,'第二支蜡烛照出一条向上的窄道，绕开了螺旋楼梯。墙缝里卡着几枚旧铜币。',[O('捡起铜币，沿密道上去','bell',{gainMoney:3})]),
    stairs:N('螺旋楼梯','check',40,'楼梯尽头就是钟房。你听见钟绳一点点绷紧的声音。',[O('钟一响就冲上去','d_stairs',{obj:'楼梯口'}),O('等第二声钟响再上去','bell',{hintClue:'bell',obj:'楼梯口'})],[E('钟一响就冲，别犹豫',0,false),E('第一声是骗人的',1,true)]),
    bell:N('钟房','choice',50,'一个穿修女服的人握着钟绳，背对着你。',[O('叫出她的名字','e_true',{needClue:'name',obj:'修女'}),O('夺下钟绳','e_loop',{obj:'修女'}),O('求她停下','d_bell',{obj:'修女'})],[E('抢过钟绳就结束了',1,false)]),
    d_priest:N('告解室','death',25,'神父叹了口气，把你锁进告解室。午夜的钟声响起时，你听见他在门外低声说：“不是我……”',[],[],{deathClue:'notpriest'}),
    d_door:N('门后','death',25,'门开了一条缝，一根钟绳勒住了你的脖子。'),
    d_dark:N('深井','death',25,'你一脚踩空，坠进了地窖深处的井里。'),
    d_deep:N('合上的门','death',25,'身后的石门缓缓合上。墙上，又多了一个名字。'),
    d_stairs:N('被发现','death',25,'第一声钟响是假的。你冲进钟房时，她正转身等着你。',[],[],{deathClue:'bell'}),
    d_bell:N('冰冷的回答','death',25,'她没有回头：“我叫艾格尼丝。下一次，记得叫我的名字。”',[],[],{deathClue:'name'}),
    e_true:N('钟声停止','ending',60,'你叫出了她的名字。钟绳从她手中滑落，雾开始散去。',[],[],{ending:'true'}),
    e_loop:N('新的敲钟人','ending',60,'你夺过钟绳。钟声在你手中响起，你再也松不开手。',[],[],{ending:'bad'})
  }
};
