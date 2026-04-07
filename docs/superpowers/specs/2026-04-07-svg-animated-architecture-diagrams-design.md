# SVG 动画架构图设计文档

## 概述

将 `docs/presentation.html` 中 Part 02 和 Part 03 的所有 HTML div 架构/流程图替换为内联 SVG + 持续流动动画，并在 Part 02 "生态全景" slide 之后新增一页引用 `home_archi.jpg`。

## 决策记录

| 决策         | 选项                                            | 结论                                              |
| ------------ | ----------------------------------------------- | ------------------------------------------------- |
| 动画范围     | 仅生态全景页 / 所有架构图 / 独立页面            | 替换 PPT 中所有架构图页（Part 02 + Part 03）      |
| 动画风格     | 入场动画 / 持续流动 / 两者结合                  | 持续流动动画（虚线/粒子沿路径流动，节点脉冲呼吸） |
| JPG 引用方式 | SVG 重绘替代 / 保留 JPG + 新增 SVG / 仅引用 JPG | 仅引用 JPG 图片                                   |
| 实现方案     | 纯 CSS / CSS + JS / 动画库                      | CSS 动画为主体 + JS 控制 slide 切换时动画启停     |

## 任务 1：引用 home_archi.jpg

### 位置

在 Part 02 "OpenTiny NEXT 生态全景"（三列卡片 slide）**之后**，新增一个 slide。

**理由**：先看三个组件的概念卡片，再看完整生态鸟瞰图，形成由局部到全局的认知递进。

### HTML

```html
<section>
  <h3>生态全景图</h3>
  <p style="font-size: 0.7em; color: #666; margin-bottom: 12px">
    OpenTiny NEXT 生态中 WebAgent 与 NEXT-SDKs 的位置关系
  </p>
  <img
    src="imgs/home_archi.jpg"
    alt="OpenTiny NEXT 生态与 WebAgent 位置"
    style="max-width: 85%; max-height: 480px; border-radius: 10px;
              box-shadow: 0 4px 20px rgba(0,0,0,0.08);"
  />
</section>
```

## 任务 2：SVG + 持续流动动画

### 公共基础设施

#### CSS 动画定义

新增 `<style>` 区块，包含以下核心动画：

```css
/* 虚线流动 */
@keyframes flowDash {
  to {
    stroke-dashoffset: -20;
  }
}

/* 反向虚线流动 */
@keyframes flowDashReverse {
  to {
    stroke-dashoffset: 20;
  }
}

/* 节点脉冲呼吸 */
@keyframes pulse {
  0%,
  100% {
    opacity: 0.7;
    transform: scale(1);
  }
  50% {
    opacity: 1;
    transform: scale(1.03);
  }
}

/* 高亮节点脉冲 */
@keyframes pulseHighlight {
  0%,
  100% {
    filter: drop-shadow(0 0 6px rgba(20, 118, 255, 0.3));
  }
  50% {
    filter: drop-shadow(0 0 12px rgba(20, 118, 255, 0.6));
  }
}

/* 粒子沿路径移动 */
@keyframes moveAlongPath {
  0% {
    offset-distance: 0%;
    opacity: 0;
  }
  10% {
    opacity: 1;
  }
  90% {
    opacity: 1;
  }
  100% {
    offset-distance: 100%;
    opacity: 0;
  }
}
```

#### JS 控制逻辑

在 `Reveal.initialize()` 之后添加 slide 切换监听：

```js
Reveal.on('slidechanged', (event) => {
  document.querySelectorAll('section .svg-animated').forEach((svg) => {
    svg.classList.remove('svg-playing');
  });
  event.currentSlide.querySelectorAll('.svg-animated').forEach((svg) => {
    svg.classList.add('svg-playing');
  });
});

// 初始化：激活首屏
document.querySelector('.present .svg-animated')?.classList.add('svg-playing');
```

配合 CSS 控制播放状态：

```css
.svg-animated * {
  animation-play-state: paused;
}
.svg-animated.svg-playing * {
  animation-play-state: running;
}
```

#### SVG 设计规范

- **画布**：统一 `viewBox="0 0 900 500"`（适配 1280x720 slide，留 margin）
- **配色**：复用 PPT CSS 变量
  - `#1476ff`（蓝，--accent）：WebAgent / MCP Client / Transport
  - `#7c4dff`（紫，--accent2）：AI 控制端 / Remoter
  - `#00c853`（绿，--accent3）：业务应用 / Client
  - `#ffab40`（橙）：Inspector
- **节点**：圆角矩形 `rx="10"`，半透明填充 + 1px 描边，`drop-shadow` 微阴影
- **连线**：`stroke-dasharray: 6 4` + `flowDash` 动画（0.8s linear infinite）
- **粒子**：`<circle r="3">`（普通连线）或 `<circle r="4">`（主路径），沿 `<path>` 用 CSS `offset-path` 移动，周期 2.5s
- **文字**：简短标签用 `<text>`，中文多行内容用 `<foreignObject>`
- **间距**：节点最小间距 40px，连线长度 60~100px

### 各 Slide 详细设计

#### Slide 1：MCP 协议概览

**位置**：Part 02 第 2 页
**当前**：5 个 `flow-step` div + 箭头文字
**替换为**：水平 4 节点 SVG

```
┌─────────┐  ─·→  ┌───────────┐  ←·→  ┌───────────┐  ─·→  ┌─────────────────┐
│ AI / LLM │       │ MCP Client │       │ MCP Server │       │ Tools/Resources  │
└─────────┘       └───────────┘       └───────────┘       └─────────────────┘
```

- 单向箭头：单向粒子流
- 双向箭头（Client ⇄ Server）：对向双粒子流
- 底部保留说明文字："MCP 解决了 AI 怎么调用外部能力 的问题"

#### Slide 2：WebAgent 的定位

**位置**：Part 02 第 3 页
**当前**：三个 `arch-box` div + "↕ MCP 协议" 文字
**替换为**：垂直三层 SVG

```
┌──────────────────────────┐
│    AI 控制端 (Remoter)    │  紫色填充
└────────────┬─────────────┘
             │ 双向粒子流 + "MCP 协议" 标签
┌────────────┴─────────────┐
│    WebAgent 枢纽服务      │  蓝色高亮 + pulseHighlight
└────────────┬─────────────┘
             │ 双向粒子流 + "MCP 协议" 标签
┌────────────┴─────────────┐
│    业务应用 (Client)      │  绿色填充
└──────────────────────────┘
```

- WebAgent 节点应用 `pulseHighlight` 动画突出核心地位
- 顶部保留说明："WebAgent = MCP 代理枢纽，连接 AI 控制端与业务应用"

#### Slide 3：生态全景

**位置**：Part 02 第 4 页
**当前**：三列 card + 底部 flow 步骤条
**替换为**：水平三节点 SVG

```
┌──────────────┐          ┌──────────┐          ┌──────────────────┐
│ @opentiny/   │  ──·→    │ WebAgent │    ←·──  │ @opentiny/       │
│ next-sdk     │          │          │          │ next-remoter     │
│ (业务应用)    │          │ (代理枢纽) │          │ (操控端)          │
└──────────────┘          └──────────┘          └──────────────────┘
```

- 左→中：绿色粒子流（应用注册工具）
- 右→中：紫色粒子流（AI 发起操控）
- 各节点内保留简要描述文字

#### Slide 4：四层会话模型

**位置**：Part 03 第 2 页
**当前**：四个 `arch-box` 的 2x2 grid
**替换为**：菱形布局 SVG

```
              Transports (蓝)
             ╱            ╲
       Clients (绿)    Inspectors (橙)
             ╲            ╱
              Remoters (紫)
```

- 中心半透明 "WebAgent" 标识
- 四条辐射线上虚线流动
- 各节点各自颜色脉冲
- 底部说明："每个连接的业务应用和控制端分别拥有独立的 Session"

#### Slide 5：Twin Client 模式

**位置**：Part 03 第 3 页
**当前**：业务应用 → arch-arrow → Twin Client / Transport 并排 + 绑定
**替换为**：垂直 + 水平组合 SVG

```
       ┌──────────────┐
       │   业务应用     │  绿色
       └──────┬───────┘
              │ 粒子下行
       ┌──────┴──────────────────────┐
       │  ┌─────────────┐ ⟷ ┌──────────┐ │  虚线框 = WebAgent 内部
       │  │ Twin Client  │   │Transport │ │
       │  └─────────────┘   └──────────┘ │
       └─────────────────────────────┘
```

- Twin Client 和 Transport 之间的 "绑定" 用脉冲发光连线
- 底部说明保留

#### Slide 6：Twin Client 初始化过程

**位置**：Part 03 第 4 页
**当前**：三个编号圆 + arch-box 两列布局
**替换为**：垂直时间线 SVG

```
    ① 清空原有处理器        (蓝色圆)
    │  虚线下行粒子
    ② 注入自定义 initialize  (紫色圆)
    │  虚线下行粒子
    ③ 挂载监听器系统         (绿色圆)
```

- 三个编号圆保持原配色
- 粒子从 ① → ② → ③ 依次下行流动
- 各步骤描述文字在右侧用 `<foreignObject>`

#### Slide 7：双向消息转发桥

**位置**：Part 03 第 5 页
**当前**：上行请求 + 下行响应两行五列 grid + 中间 tag
**替换为**：双层水平 SVG

```
    上层（请求）：
    Remoter ──蓝色粒子→ 代理McpServer ──蓝色粒子→ Twin Client

    中间 tag 区：tools/call · tools/list · resources/read · prompts/get · ...

    下层（响应）：
    Remoter ←绿色粒子── 代理McpServer ←绿色粒子── Twin Client
```

- 上下两条平行路径，粒子方向相反（蓝色右行、绿色左行）
- tag 标签用 `<foreignObject>` 保持原样式
- 底部说明保留

#### Slide 8：tools/call 的完整旅程

**位置**：Part 03 第 6 页
**当前**：两行 flow（STEP 1-4 左→右，STEP 5-8 右→左）
**替换为**：U 型路径 SVG

```
    STEP1 → STEP2 → STEP3 → STEP4
                                │
    STEP8 ← STEP7 ← STEP6 ← STEP5
```

- 一个粒子沿 U 型完整路径持续循环流动
- 8 个步骤节点使用原来的配色（紫/蓝/蓝/绿/绿/蓝/蓝/紫）
- 粒子经过时节点微亮

#### Slide 9：两种连接模式

**位置**：Part 03 第 7 页
**当前**：左右两列，各 5 个下行 arch-box
**替换为**：并排双流程 SVG

```
    Proxy 模式 (左)              Inspector 模式 (右)
    ┌────────────┐               ┌──────────────────┐
    │ 业务应用连入  │               │ Remoter+sessionId │
    └─────┬──────┘               └────────┬─────────┘
          ↓ 绿色粒子                       ↓ 紫色粒子
    ┌─────┴──────┐               ┌────────┴─────────┐
    │ 创建Transport│               │ 查找 Twin Client  │
    └─────┬──────┘               └────────┬─────────┘
          ↓                               ↓
    ┌─────┴──────┐               ┌────────┴─────────┐
    │创建Twin Client│              │创建代理 McpServer │
    └─────┬──────┘               └────────┬─────────┘
          ↓                               ↓
    ┌─────┴──────┐               ┌────────┴─────────┐
    │注入处理器+连接│              │ 建立双向消息桥    │
    └─────┬──────┘               └────────┬─────────┘
          ↓                               ↓
    ┌─────┴──────┐               ┌────────┴─────────┐
    │存入 clients │               │ 存入 remoters    │
    └────────────┘               └──────────────────┘
```

- 左列绿色粒子下行，右列紫色粒子下行
- 顶部保留 card 标题（Proxy 模式 / Inspector 模式）

#### Slide 10：全局流程总览

**位置**：Part 03 第 8 页（最复杂）
**当前**：三栏嵌套布局
**替换为**：三区域 + 6 条连线 SVG

```
    ┌─────────┐                                    ┌──────────┐
    │ 业务应用A │ ──绿色粒子→ ┌────────────────┐ ←紫色粒子── │ AI Agent X│
    └─────────┘              │    WebAgent     │              └──────────┘
    ┌─────────┐              │ ┌─────┐┌──────┐│              ┌──────────┐
    │ 业务应用B │ ──绿色粒子→ │ │TwinA││McpS X││ ←紫色粒子── │ AI Agent Y│
    └─────────┘              │ ├─────┤├──────┤│              └──────────┘
    ┌─────────┐              │ │TwinB││McpS Y││              ┌──────────┐
    │ 业务应用C │ ──绿色粒子→ │ ├─────┤├──────┤│ ←紫色粒子── │ Inspector │
    └─────────┘              │ │TwinC││ 路由层 ││              └──────────┘
                             │ └─────┘└──────┘│
                             └────────────────┘
```

- 左侧 3 条绿色粒子流入
- 右侧 3 条紫色粒子流入
- WebAgent 中心区域 `pulseHighlight` 脉冲
- 底部标注保留

## 实现约束

- 所有修改在 `docs/presentation.html` 单文件中完成
- SVG 内联在 HTML 中，不创建独立 .svg 文件
- CSS 动画新增在现有 `<style>` 区块末尾
- JS 新增在 `Reveal.initialize()` 之后
- 保留所有 slide 的原有文字说明（`quote-box`、`dim`、底部备注等）
- 不改动非架构图 slide（封面、目录、定义、核心能力、技术栈、对比表、适用场景、快速上手、总结等）

## 验证方式

- 浏览器打开 `docs/presentation.html`，逐页检查：
  1. JPG 图片正常显示且居中
  2. 每个 SVG 在进入 slide 时动画启动、离开时暂停
  3. 粒子流动方向正确、颜色匹配设计
  4. 文字可读、布局适配 1280x720 画布
  5. Reveal.js 翻页和哈希路由正常工作
