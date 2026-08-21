# halluciguard — 设计文档

> AI 输出幻觉检测 & 事实校验库。让 LLM 输出可信赖。

---

## 1. 背景与问题

LLM 最大的已知缺陷是**幻觉（Hallucination）**——输出看似流畅、实则编造的内容。

**现状痛点：**
- RAG 应用中，LLM 可能"发明"不存在于源文档的引用
- 客服/医疗/法律等高风险场景，幻觉可能造成实际损失
- 开发者没有轻量工具来检测和控制幻觉

**现有方案的不足：**

| 方案 | 问题 |
|------|------|
| Patronus AI / Galileo | SaaS 产品，不开源，vendor lock-in |
| SelfCheckGPT | 仅一篇论文的参考实现，不是生产工具 |
| G-Eval / FActScore | 学术代码，不可直接集成 |
| LangChain + 自定义 | 需要大量自建，没有标准方案 |

**机会：** 开源社区没有一个被广泛采用的幻觉检测工具。

---

## 2. 目标用户

- RAG 应用开发者（最核心）
- AI 客服/问答系统开发者
- 需要 AI 输出可信度评分的团队
- AI 产品质检/监控场景

---

## 3. 核心设计原则

| 原则 | 说明 |
|------|------|
| **后置检测** | 不改变用户的 LLM 调用流程，只在输出后做检测 |
| **多信号融合** | 不依赖单一检测方法，综合多个信号给出分数 |
| **可配置阈值** | 用户根据业务场景决定"可接受"的幻觉程度 |
| **轻量集成** | 一个函数调用，不强制依赖特定框架 |

---

## 4. API 设计

### 4.1 基础用法：自一致性检测

```typescript
import { HallucGuard } from 'halluciguard'

const guard = new HallucGuard({
  provider: new OpenAIProvider({ apiKey: '...' }),
  model: 'gpt-4o-mini',
})

// 自一致性检测：多次采样同一 prompt，检查输出是否矛盾
const result = await guard.checkConsistency({
  prompt: '法国的首都是哪里？',
  samples: 3,             // 采样 3 次
  temperature: 0.7,       // 有随机性才能检测矛盾
})

console.log(result)
// {
//   consistent: true,
//   confidence: 0.95,      // 一致性置信度
//   responses: ['巴黎', '巴黎', '法国首都巴黎'],
// }
```

### 4.2 Grounding 检测：输出是否基于源文档

```typescript
const result = await guard.checkGrounding({
  context: `
    张三，男，1990年出生，现任ABC公司技术总监。
    2015年毕业于清华大学计算机科学专业。
  `,
  response: '张三于2015年从清华大学毕业，之后在ABC公司担任技术总监，年薪百万。',
  //                     ^^^^^^^^^^^^^^^^  ^^^^^^^^^^^^^^^^  ^^^^^^^^^^^^
  //                     ✅ 有依据          ✅ 有依据          ❌ 幻觉（无来源）
})

console.log(result)
// {
//   grounded: false,
//   score: 0.65,           // 整体依据度评分（0-1）
//   claims: [
//     { text: '张三于2015年从清华大学毕业', grounded: true, evidence: '...' },
//     { text: '担任技术总监', grounded: true, evidence: '...' },
//     { text: '年薪百万', grounded: false, evidence: null },
//   ],
// }
```

### 4.3 引用验证：引用是否真实存在

```typescript
const result = await guard.verifyCitations({
  response: `
    根据Smith et al. (2023)的研究，AI的准确率达到了98%。
    另外，最新报告（来源：WHO 2024）指出...
  `,
  sources: [
    { id: 'paper1', content: 'Smith et al. (2023) report 95% accuracy...' },
    { id: 'who2024', content: '...' },
  ],
})

console.log(result)
// {
//   citations: [
//     { claim: 'Smith et al. (2023) 准确率98%', found: true, sourceId: 'paper1',
//       note: '源文档记载为95%，数字不一致' },
//     { claim: 'WHO 2024', found: false, sourceId: null },
//   ],
// }
```

### 4.4 综合评分（一站式）

```typescript
const report = await guard.evaluate({
  prompt: '介绍一下张三的履历',
  context: sourceDocument,
  response: llmOutput,
  options: {
    consistency: true,     // 开启自一致性检测
    grounding: true,       // 开启依据度检测
    samples: 3,            // 一致性采样次数
  },
})

console.log(report)
// {
//   overall: { score: 0.78, level: 'moderate' },  // low | moderate | high
//   consistency: { ... },
//   grounding: { ... },
//   claims: [...],
// }
```

---

## 5. 架构设计

```
halluciguard/
├── src/
│   ├── index.ts                    # 统一导出
│   ├── core/
│   │   ├── types.ts                # 类型定义
│   │   └── guard.ts                # HallucGuard 主类
│   ├── detectors/
│   │   ├── consistency.ts          # 自一致性检测
│   │   ├── grounding.ts            # 依据度检测（Claim + 覆盖率）
│   │   ├── citation.ts             # 引用验证
│   │   └── index.ts
│   ├── extractors/
│   │   ├── claims.ts               # 声明提取（Claim Extraction）
│   │   └── index.ts
│   ├── scoring/
│   │   ├── aggregator.ts           # 多信号聚合评分
│   │   └── index.ts
│   ├── providers/
│   │   ├── base.ts                 # 抽象基类
│   │   ├── openai.ts
│   │   ├── anthropic.ts
│   │   └── index.ts
│   └── utils/
│       ├── similarity.ts           # 文本相似度计算
│       └── text.ts                 # 文本处理工具
├── tests/
├── package.json
├── tsconfig.json
├── tsup.config.ts
├── vitest.config.ts
├── DESIGN.md
└── README.md
```

---

## 6. 核心检测算法

### 6.1 自一致性检测（Self-Consistency Check）

**原理：** 如果 LLM 对同一个问题多次回答内容一致，说明它"真的知道"；如果每次都不同，说明它在"编造"。

**步骤：**
1. 用相同 prompt、不同温度采样 N 次（默认 3-5 次）
2. 先用本地词汇相似度得到 cheap confidence；处于不确定区间时可启用 LLM-as-Judge 做语义一致性融合
3. 一致性分数 = 一致的回答对数 / 总回答对数；启用 judge 时为 lexical 与 judge confidence 的平均

```
采样1: "巴黎"
采样2: "巴黎"
采样3: "法国首都巴黎"
       ↓
相似度矩阵 → 一致性分数 ≈ 1.0 ✅
```

### 6.2 依据度检测（Grounding Check）

**原理：** 将 LLM 输出拆解为独立声明，逐条检查是否能从源文档中找到依据。

**步骤：**
1. **Claim Extraction** — 用 LLM 将输出拆解为独立事实声明
2. **Evidence Retrieval** — 对每条声明，在源文档中搜索最相关的段落
3. **Entailment Check** — 默认批量让 LLM 判断多条声明是否被证据"蕴含"（entailed），解析失败自动回退逐条判断
4. 依据度分数 = 有依据的声明数 / 总声明数

```
输出: "张三2015年毕业，年薪百万"
  ↓ 提取
声明1: "张三2015年毕业"     → 在文档中找到 → ✅ grounded
声明2: "年薪百万"           → 文档无此信息 → ❌ hallucination
  ↓
依据度 = 0.5
```

### 6.3 引用验证（Citation Verification）

**原理：** 检查 LLM 输出中提到的引用、来源、数据点是否真实存在于提供的源文档中。

**步骤：**
1. 提取输出中的引用标记（如论文名、来源名、数据点）
2. 在源文档列表中搜索匹配
3. 对找到的引用，验证具体数字/内容是否一致

---

## 7. 依赖设计

```
dependencies:     (核心检测逻辑全部自研)
peerDependencies:  openai (optional) | @anthropic-ai/sdk (optional)
devDependencies:   tsup, typescript, vitest（本地类型检查再按需安装 provider SDK）

运行期可用 `withResilience(provider, { retries, timeoutMs })` 给任意 GuardProvider 加传输重试与单次调用超时。
```

不依赖 LangChain / LlamaIndex 等重型框架。

---

## 8. 与其他方案的对比

| 特性 | halluciguard | Patronus AI | SelfCheckGPT | GPTCache |
|------|-------------|-------------|--------------|----------|
| 开源 | ✅ | ❌ SaaS | ✅ 但仅论文代码 | ✅ |
| 自一致性检测 | ✅ | ✅ | ✅ | ❌ |
| Grounding 检测 | ✅ | ✅ | ❌ | ❌ |
| 引用验证 | ✅ | ❌ | ❌ | ❌ |
| 综合评分 | ✅ | ✅ | ❌ | ❌ |
| 轻量集成 | ✅ 一个函数 | ❌ SDK 集成 | ❌ 需自建 | ⚠️ |
| 多 Provider | ✅ | ❌ | ❌ | ❌ |
| TypeScript 原生 | ✅ | ❌ | ❌ | ❌ |

---

## 9. 发布计划

- **v0.1.0** — 自一致性检测 + Claim Extraction + 基础 Grounding 检测
- **v0.2.0** — 引用验证 + 综合评分 + Anthropic provider
- **v0.3.0** — 向量嵌入加速（本地 embedding） + 缓存优化
- **v1.0.0** — 稳定 API、完整文档、生产就绪
