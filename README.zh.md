# halluciguard

[English](README.md)

![halluciguard：输出后做一致性、依据和引用校验](docs/assets/hero.png)

LLM 输出幻觉检测库。`halluciguard` 不改变你调用模型的方式，只在输出后做检测：自一致性采样、claim 级 grounding、引用验证，最后融合成信任分。

> 状态：beta。检测器已用 mock provider 单测覆盖；生产前请用真实模型、业务领域和风险阈值做标定。

## 特性

- **自一致性**：同一 prompt 多次采样，衡量回答是否一致；词汇相似度处于不确定区间时可启用 LLM judge。
- **Grounding**：抽取原子声明、检索证据句，并默认批量做 entailment；批量失败自动回退逐条判断。
- **引用验证**：把引用样式文本匹配到提供的 sources，并标记数字不一致。
- **信任报告**：加权总分，输出 `low` / `moderate` / `high`。
- **Provider 无关**：实现很小的 `GuardProvider` 接口即可接入；内置 OpenAI chat、OpenAI Responses、OpenAI-compatible、Anthropic。
- **韧性**：`withResilience` 给任意 provider 加传输重试和单次调用超时。

## 安装

```sh
npm install halluciguard
# 按需安装 provider SDK
npm install openai                 # OpenAI / OpenAI-compatible / Responses
npm install @anthropic-ai/sdk      # Anthropic
```

## 快速开始

```ts
import { HallucGuard, OpenAIProvider, withResilience } from 'halluciguard'

const provider = withResilience(new OpenAIProvider({ apiKey: process.env.OPENAI_API_KEY }), {
  retries: 2,
  timeoutMs: 10_000,
})

const guard = new HallucGuard(provider, {
  consistencyJudge: true,
  groundingBatch: true,
})

const report = await guard.evaluate({
  prompt: '介绍一下张三的履历',
  context: sourceDocument,
  response: llmOutput,
  options: {
    consistency: true,
    grounding: true,
    citations: true,
    samples: 3,
    sources: [{ id: 'resume', content: sourceDocument }],
  },
})
```

## 信号

| 信号 | 回答的问题 | 默认权重 |
| --- | --- | --- |
| Grounding | 每条原子声明是否有上下文依据 | 存在时 0.7 |
| Consistency | 多次采样语义是否一致 | 存在时 0.3 |
| Citations | 引用是否存在、数字是否一致 | 未验证时乘性惩罚 |

`overall.score` 范围 `[0, 1]`；`>=0.8` 为 high，`>=0.5` 为 moderate，否则 low。

## 文档

- [模块文档](docs/README.md)
- [设计说明](DESIGN.md)
- [English README](README.md)

## 开发

```sh
npm install
npm run check
npm test
npm run build
```

## 许可证

MIT © zuoanCo。见 [LICENSE](LICENSE)。
