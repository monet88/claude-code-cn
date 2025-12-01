# Webview 动画方案（草案）

## 目标
- 在不显著增大 bundle 的前提下，为 Webview 关键交互提供流畅、可控、可降级的动画体验。
- 尊重用户可访问性（`prefers-reduced-motion`），提供清晰的动效分层与关停策略。
- 保持与现有 Vue3 + Vite 架构兼容，可渐进式落地。

## 范围（首批）
- 按钮/提交区：悬浮与点击反馈、发送成功/失败短暂提示。
- 拖拽上传：遮罩出现/消失、文件卡片进入动画。
- Toast/提示：进场、停留、退场过渡统一化。
- 空状态/加载：轻量骨架或淡入，不做重型插画动画。

## 选型
- **Motion One（首选）**：~11KB，可 Tree-Shake，API 贴近 Web Animations，适合组件内小动效与时间线。
- **anime.js（备选）**：~17KB，通用补间，若 Motion One 不能覆盖路径/数值需求时考虑。
- 继续保留 **纯 CSS keyframes + `prefers-reduced-motion`** 作为基础与降级方案。
- 暂不引入 GSAP/Lottie/Framer Motion（体积与复杂度更高，当前需求不必）。

## 实施策略
1) **基础层（CSS）**：
   - 统一过渡时长/曲线变量：`--motion-fast (160ms)`, `--motion-normal (220ms)`, `--motion-ease (cubic-bezier(0.4,0,0.2,1))`。
   - 提供 `.motion-reduced` 覆盖，或通过 `@media (prefers-reduced-motion: reduce)` 自动降级为无位移/无缩放。

2) **库接入（Motion One）**：
   - 在 `src/webview/src/plugins` 下封装 `motion.ts`：导出 `animate`, `timeline`, `inView` 等二次封装，集中配置默认 easing/duration。
   - 按需引入：仅在使用组件内 `import { animate } from '@/plugins/motion'`，避免全局注册。

3) **组件落地（优先顺序）**：
   - ToastContainer：统一进出场（y 轴位移 + 透明度），可选队列延时。
   - Drag overlay：出现/消失淡入淡出 + 轻微缩放；文件卡片进入使用 stagger。
   - ButtonArea 提交按钮：hover/active 轻微缩放；发送中添加旋转过渡。
   - Dropdown/Modal：简单的 scale+fade 过渡，兼容 ESC/点击空白关闭。

4) **性能与可访问性**：
   - 所有 transform 类动效优先使用 `transform/opacity`，避免 layout thrash。
   - 为 Motion One 提供全局开关（例如 `window.__cc_disable_motion`），便于诊断或问题兜底。

5) **测试与验证**：
   - 快速自测脚本：在 Webview 启动后注入 `prefers-reduced-motion` mock，验证降级。
   - 手测场景：拖拽上传、发送消息、打开下拉/弹窗、Toast 进出。

## 任务拆分（建议）
1. 引入 Motion One 依赖与 `plugins/motion.ts` 封装，添加全局动效变量与 `prefers-reduced-motion` 兜底。
2. ToastContainer 动画统一；ButtonArea 基本交互动效；Drag overlay 进出与文件卡片进入动画。
3. Dropdown/Modal 统一过渡；残留 CSS 动效整理到变量化。
4. 体验回归与性能检查（Chrome DevTools Performance + `prefers-reduced-motion`）。

## 风险与回退
- 若发现体积或兼容性问题，可快速移除 Motion One，仅保留 CSS 动效；动画开关可通过环境变量或运行时 flag 关闭。
