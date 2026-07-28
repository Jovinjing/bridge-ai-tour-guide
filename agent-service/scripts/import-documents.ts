/**
 * 赵州桥知识文档导入脚本
 *
 * 将 10 篇核心知识文档分割、向量化并存入 pgvector。
 *
 * 用法：
 *   npx tsx scripts/import-documents.ts
 *
 * 前置条件：
 *   - PostgreSQL + pgvector 扩展已启用
 *   - .env 中 OPENAI_API_KEY 已配置（或代理地址）
 *   - Prisma 迁移已执行（document_chunks 表已创建）
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { OpenAIEmbeddings } from '@langchain/openai';
import { splitIntoChunks } from '../src/db/vector';

const prisma = new PrismaClient();

// ======== 10 篇赵州桥知识文档 ========
// 来源：旧项目 ZhaoZhouBridgeKnowledge.java

const DOCUMENTS = [
  {
    title: '赵州桥总体介绍',
    category: 'overview',
    metadata: {
      source: 'ZhaoZhouBridgeKnowledge.java',
      keywords: ['赵州桥', '安济桥', '李春', '天下第一桥'],
      imageUrl: '/构建特写/赵州桥全景.jpg',
      order: 1,
    },
    content: `赵州桥，又名安济桥，位于河北省赵县城南的洨河之上，建于隋代开皇至大业年间（595-605年），由著名匠师李春设计建造，距今已有1400多年历史，是世界上现存年代最久远、跨度最大、保存最完整的单孔坦弧敞肩石拱桥。

赵州桥全长64.4米，桥面宽9.6米，主拱净跨37.02米，拱矢高度7.23米，矢跨比约为1:5，属于坦拱结构。桥体造型雄伟壮观，结构精巧绝伦，是中国古代建筑史上的伟大创举，被誉为"天下第一桥"。

1961年被国务院列为第一批全国重点文物保护单位。1991年，美国土木工程师学会将赵州桥选定为第12个国际历史土木工程里程碑，与埃及金字塔、巴拿马运河、巴黎埃菲尔铁塔等齐名。`,
  },
  {
    title: '主拱结构',
    category: 'structure',
    metadata: {
      source: 'ZhaoZhouBridgeKnowledge.java',
      keywords: ['主拱', '坦弧', '矢跨比', '拱券', '并列砌筑'],
      imageUrl: '/构建特写/主拱.jpg',
      order: 2,
    },
    content: `主拱是赵州桥最核心的结构构件，采用单孔坦弧敞肩式设计。

【基本参数】
- 净跨度：37.02米（当时世界之最）
- 拱矢高度：7.23米
- 矢跨比：约1:5（属于坦拱，坡度平缓，便于通行）
- 拱圈宽度：9.6米

【结构特点】
主拱由28道独立拱券并列组成，每道拱券由43块拱石砌筑而成。拱石之间使用腰铁（铁拉杆）横向连接，增强了整体性。这种并列砌筑法是赵州桥的一大创新，既便于施工，又能在单道拱券损坏时独立修复。

【力学原理】
坦弧设计使桥面坡度平缓，方便车马通行。拱形结构将桥面荷载转化为拱轴压力，沿拱圈传递至桥台，充分利用了石材抗压强度高的特性。矢跨比1:5的设计在保证通行便利的同时，也确保了结构的稳定性。

【历史意义】
赵州桥主拱跨度在当时世界桥梁中首屈一指，比欧洲同类桥梁早了800多年。敞肩设计（主拱两侧各设两道小拱）更是世界桥梁史上的首创，既减轻了桥身自重，又增加了泄洪能力。`,
  },
  {
    title: '腹拱（小拱）',
    category: 'structure',
    metadata: {
      source: 'ZhaoZhouBridgeKnowledge.java',
      keywords: ['腹拱', '敞肩', '小拱', '泄洪', '减轻自重'],
      imageUrl: '/构建特写/敞肩拱.jpg',
      order: 3,
    },
    content: `腹拱（小拱）是赵州桥最具创新性的结构特征，位于主拱两侧，各设两道。

【基本参数】
- 净跨：东侧小拱3.81米，西侧小拱2.85米
- 拱形：半圆形
- 数量：共4个（主拱每侧各2个）

【结构功能】
1. 减轻自重：腹拱挖空部分节省石料约700吨，减轻桥身荷载约15.3%
2. 泄洪导流：洪水期水流可从腹拱通过，减少水流对桥身的冲击力
3. 美观造型：虚实相间，轻盈优美，"如初月出云，长虹饮涧"

【历史意义】
敞肩拱设计是世界桥梁史上的重大创新。在欧洲，类似的敞肩拱桥直到14世纪才出现，比赵州桥晚了700多年。法国的赛耶桥（1338年）被认为是欧洲最早的敞肩拱桥，但其跨度和工艺都远不及赵州桥。

腹拱的四个洞口在洪水期间可以大幅增加过水面积，使桥梁在汛期更加安全稳固。这一设计充分体现了李春对洨河水文特征的深刻理解。`,
  },
  {
    title: '桥台结构',
    category: 'structure',
    metadata: {
      source: 'ZhaoZhouBridgeKnowledge.java',
      keywords: ['桥台', '浅基础', '地基', '承载力', '水平推力'],
      imageUrl: '/构建特写/桥台设计图.jpg',
      order: 4,
    },
    content: `桥台是赵州桥的承重基础，承载着主拱传递的巨大水平推力和垂直荷载。

【结构特点】
赵州桥采用浅基础设计，桥台直接坐落在洨河两岸的粗砂层上。桥台为低矮的半地下式结构，与两岸地基紧密连接。由于主拱产生巨大的水平推力，桥台必须具备足够的自重和地基承载力来抵抗这一推力。

【地基处理】
赵州桥桥台基础深度仅约2米，却支撑了1400多年的使用。这得益于：
1. 桥址选择：建桥处河床为密实的粗砂砾石层，承载力高
2. 基础形式：采用扩大基础，将荷载分散到更大面积的地基上
3. 排水良好：洨河为季节性河流，地下水位变化对基础影响较小

【历史意义】
赵州桥浅基础设计的成功，证明了中国古代工匠对地质条件的精准判断。在现代桥梁工程中，类似地质条件下的浅基础设计仍然被广泛采用。`,
  },
  {
    title: '栏板雕刻艺术',
    category: 'art',
    metadata: {
      source: 'ZhaoZhouBridgeKnowledge.java',
      keywords: ['栏板', '雕刻', '龙纹', '双龙交尾', '石雕'],
      imageUrl: '/构建特写/栏板.jpg',
      order: 5,
    },
    content: `栏板是赵州桥两侧的防护构件，同时也是精美的艺术品载体。

【基本参数】
- 材质：青灰色石灰岩
- 高度：约1.03米
- 每侧栏板数量：原设各有21块

【雕刻艺术】
栏板是赵州桥雕刻最集中的部位，题材丰富多样：
1. 龙形图案：双龙戏珠、双龙交尾、游龙戏水等
2. 兽面纹：饕餮纹、瑞兽图案
3. 花卉纹：莲花、卷草等
4. 几何纹：回纹、云纹等

其中最著名的是"双龙交尾"雕刻，两条龙身交缠，姿态灵动，被誉为中国古代石雕艺术的杰作。宋代诗人描述其"龙兽腾渊，若飞若动"。

【历史变迁】
历代修缮中，栏板多次更换。现存栏板中，隋代原物极少，多数为后代补刻。1955年大修时，将各代栏板集中展示，并按原貌复制了隋代风格的栏板。`,
  },
  {
    title: '望柱雕刻艺术',
    category: 'art',
    metadata: {
      source: 'ZhaoZhouBridgeKnowledge.java',
      keywords: ['望柱', '柱头', '龙首', '龙口含珠', '石狮'],
      imageUrl: '/构建特写/梁柱.jpg',
      order: 6,
    },
    content: `望柱是栏板之间的立柱，顶部多有精美雕刻。

【基本参数】
- 材质：石灰岩
- 截面：方形或八角形
- 高度：约1.2米

【柱头雕刻】
望柱顶部雕刻是赵州桥最具艺术价值的部分：
1. 龙首：部分望柱顶部雕刻龙首，龙口含珠，栩栩如生
2. 狮子：部分柱头雕刻蹲狮，形态各异
3. 莲花：部分柱头雕刻莲花，花瓣饱满

其中"龙口含珠"是最具代表性的雕刻，龙首造型威严，口中所含石珠可在龙口中滚动但无法取出，工艺极其精湛。

【文化寓意】
龙在中国传统文化中是镇水神兽，桥上雕刻龙形既有装饰功能，也寄托了古人祈求桥梁免遭水患的美好愿望。`,
  },
  {
    title: '拱石（券石）',
    category: 'structure',
    metadata: {
      source: 'ZhaoZhouBridgeKnowledge.java',
      keywords: ['拱石', '券石', '并列砌筑', '腰铁', '石灰岩'],
      imageUrl: '/构建特写/腰铁.jpg',
      order: 7,
    },
    content: `拱石（券石）是构成拱圈的基本单元，赵州桥的拱石砌筑技术堪称一绝。

【基本参数】
- 材质：青灰色石灰岩（当地称"青石"）
- 拱石总数：约28×43=1204块
- 单块重量：约1吨
- 砌筑方式：纵向并列砌筑法

【并列砌筑法】
赵州桥采用28道独立拱券并列的砌筑方式，每道拱券宽约34厘米。这种方法的优点：
1. 施工便利：可逐道砌筑，无需全桥满搭脚手架
2. 独立承载：单道拱券损坏不影响相邻拱券
3. 便于修复：可单独抽换损坏的拱券

【连接方式】
为增强28道拱券的整体性，采用了多种连接措施：
1. 腰铁：在拱石之间嵌入铁质拉杆，横向连接相邻拱券
2. 铁拉杆：在拱背和拱底设置9道铁拉杆，横向拉结
3. 护拱石：在拱背上铺设护拱石层，压住各道拱券

【工艺水平】
拱石加工精度极高，接缝紧密，最薄处仅1-2毫米，充分体现了隋代石工的高超技艺。`,
  },
  {
    title: '铁件连接系统',
    category: 'structure',
    metadata: {
      source: 'ZhaoZhouBridgeKnowledge.java',
      keywords: ['铁件', '腰铁', '铁拉杆', '银锭榫', '刚柔并济'],
      imageUrl: '/构建特写/腰铁.jpg',
      order: 8,
    },
    content: `铁件是赵州桥结构体系中不可或缺的连接构件。

【类型】
1. 腰铁（横向拉杆）：嵌入相邻拱石的槽口中，将28道独立拱券横向连接为整体，每道拱券之间有多处腰铁连接。
2. 铁拉杆（横向拉索）：共9道，横贯桥宽。5道位于拱背，4道位于拱底，两端锚固在桥台或拱石中。
3. 银锭榫（铁质榫卯）：用于拱石之间的定位和连接，形似银锭，嵌入石材预留孔中。

【功能分析】
铁件的核心作用是增强拱桥的整体性：
- 没有铁件时，28道拱券各自独立，容易侧向失稳
- 铁件将各道拱券连为一体，共同受力
- 在地震等外力作用下，铁件可限制拱券的相对位移

【历史评价】
铁件的使用体现了中国古代"刚柔并济"的工程哲学：石材承担压力（刚），铁件承受拉力（柔），两者配合使桥梁兼具强度和韧性。`,
  },
  {
    title: '桥面结构',
    category: 'structure',
    metadata: {
      source: 'ZhaoZhouBridgeKnowledge.java',
      keywords: ['桥面', '拱背填层', '排水', '坦弧', '通行'],
      imageUrl: '/构建特写/桥面.jpg',
      order: 9,
    },
    content: `桥面是赵州桥供人车通行的部分。

【基本参数】
- 宽度：9.6米
- 长度：约64.4米（含两端引桥）
- 纵坡：较为平缓（得益于坦弧设计）

【结构层次】
1. 拱背填层：在主拱和腹拱上方填筑夯土碎石
2. 面层：铺设大型石板作为路面
3. 两侧设栏板和望柱

【通行设计】
坦弧设计使桥面纵坡平缓，古代车马可轻松上下。桥面宽度9.6米，在当时可并行三辆马车，充分考虑了交通需求。

【排水系统】
桥面设有横向坡度，雨水可向两侧排出。栏板底部留有排水孔，防止积水侵蚀桥体。`,
  },
  {
    title: '基础设计',
    category: 'structure',
    metadata: {
      source: 'ZhaoZhouBridgeKnowledge.java',
      keywords: ['基础', '浅埋', '抗震', '地质', '因地制宜'],
      imageUrl: '/构建特写/桥台设计图.jpg',
      order: 10,
    },
    content: `赵州桥的基础设计是桥梁能够存续1400多年的关键因素之一。

【地质条件】
桥址位于洨河出山口处，河床为密实的粗砂砾石层，承载力高，压缩性低，是理想的天然地基。

【基础形式】
采用浅埋扩大基础：埋深仅约2米，基础面积大于桥台底面积，直接坐落在密实砂层上。

【抗震性能】
赵州桥经历了多次地震仍屹立不倒，包括1966年邢台7.2级地震（距震中仅40公里），基础的稳定性是抗震性能的重要保障。

【工程智慧】
李春选择在洨河出山口建桥，此处河床稳定、基岩浅，避开了河道游移和冲刷的风险。浅基础设计减少了施工难度，同时保证了足够的承载力，体现了"因地制宜"的工程智慧。`,
  },
];

// ======== 主流程 ========

async function importDocuments() {
  console.log('📚 开始导入赵州桥知识文档...\n');

  // 1. 初始化 Embedding 模型
  const embeddingModel = new OpenAIEmbeddings({
    model: process.env.EMBEDDING_MODEL || 'text-embedding-3-small',
    apiKey: process.env.OPENAI_API_KEY,
    configuration: {
      baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com',
    },
    dimensions: 1536,
  });

  let totalChunks = 0;

  for (const doc of DOCUMENTS) {
    console.log(`📄 ${doc.title} (${doc.category})`);

    // 2. 检查是否已导入（幂等）
    const existing = await prisma.document.findFirst({
      where: { title: doc.title },
    });
    if (existing) {
      console.log(`   ⏭  已存在，跳过`);
      continue;
    }

    // 3. 分割文档为 chunks
    const chunks = splitIntoChunks(doc.content);
    console.log(`   ✂️  分割为 ${chunks.length} 个块`);

    // 4. 创建文档记录
    const document = await prisma.document.create({
      data: {
        title: doc.title,
        content: doc.content,
        category: doc.category,
        metadata: doc.metadata,
      },
    });

    // 5. 逐块生成 embedding 并存储
    for (let i = 0; i < chunks.length; i++) {
      const chunkText = chunks[i];

      try {
        const embedding = await embeddingModel.embedQuery(chunkText);

        await prisma.documentChunk.create({
          data: {
            documentId: document.id,
            chunkIndex: i,
            chunkText,
            // 向量存储为 JSON 数组字符串，后续可用 ::vector 转换
            embedding: JSON.stringify(embedding),
          },
        });

        totalChunks++;
        process.stdout.write(`   ✅ 块 ${i + 1}/${chunks.length} 已向量化\r`);
      } catch (err: any) {
        console.error(`   ❌ 块 ${i + 1} 向量化失败:`, err.message);
        throw err;
      }
    }

    console.log(''); // 换行
  }

  console.log(`\n🎉 导入完成！共 ${DOCUMENTS.length} 篇文档，${totalChunks} 个向量块`);
  console.log('   可通过 searchSimilar() 进行向量检索验证\n');
}

importDocuments()
  .catch((err) => {
    console.error('导入失败:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
