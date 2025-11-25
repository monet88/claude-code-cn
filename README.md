<h2 align="center">
	<img src="https://claudecodecn-1253302184.cos.ap-beijing.myqcloud.com/vscode/claude-logo.png" height="64">
	<br>Claude Code 中文版
</h2>
<p align="center"><strong>本项目无广告，无商业，只为用极客精神实现更好的VibeCoding

</strong></p>

本项目产生背景：我在长期使用代码辅助编程之后，遇到了很多痛点，我觉得你也可能会遇到这些问题，于是我将问题解决，封装为产品，来为大家节省时间；本项目开源社区贡献最大，我只是一个站在大佬肩膀上的整合者，并非大佬~

## 项目来源
本项目主要基于 [Claudix](https://github.com/Haleclipse/Claudix) 进行修改，集成了cc-switch，未来还会集成 ccr 和 spec-kit 功能

基于AGPL 3.0许可证进行开发和分发

欢迎大家也 Star原作者项目：[Claudix](https://github.com/Haleclipse/Claudix) 感谢大家

---

更新日志

> [最新包：claude-code-cn-1.0.4.vsix 下载链接](https://claudecodecn-1253302184.cos.ap-beijing.myqcloud.com/vscode/v1.0.4/claude-code-cn-1.0.4.vsix)

- 2025年11月25日（v1.0.4）
  - [x] 增加简易MCP功能（切换不需要重启终端，正常需要重启，但是我适配了一下，不用重启）
  - [x] 优化输入框 @文件 功能
  - [x] 解决Windows系统下 用量统计无效问题
<img width="350px" src="https://claudecodecn-1253302184.cos.ap-beijing.myqcloud.com/vscode/v1.0.4/2.png" />
- 2025年11月24日（v1.0.3）
  - [x] 增加claude-opus-4-5 入口
  - [x] 实现切换供应商不用重启功能，现在切换供应商终于不用重启编辑器了
<img width="350px" src="https://claudecodecn-1253302184.cos.ap-beijing.myqcloud.com/vscode/v1.0.3/1.png" />
- 2025年11月18日（v1.0.2）
  - 增加 README 内容 解释，避免语言产生歧义误解
- 2025年11月18日（v1.0.1）
  - 【功能】新增使用统计功能
  - 【优化】设置侧边栏小屏幕状态下的展示
  - 【优化】其他细节问题
<img width="350px" src="https://claudecodecn-1253302184.cos.ap-beijing.myqcloud.com/vscode/8.png" />
- v1.0.0（2025年11月18日）
  - 正式发布

---

## 核心功能展示

首页

<img width="300px" src="https://claudecodecn-1253302184.cos.ap-beijing.myqcloud.com/vscode/1.png" />

交互过程

<img width="350px" src="https://claudecodecn-1253302184.cos.ap-beijing.myqcloud.com/vscode/2.png" />

权限控制

<img width="350px" src="https://claudecodecn-1253302184.cos.ap-beijing.myqcloud.com/vscode/3.png" />

源切换

<img width="500px" src="https://claudecodecn-1253302184.cos.ap-beijing.myqcloud.com/vscode/4.png" />

历史对话

<img width="500px" src="https://claudecodecn-1253302184.cos.ap-beijing.myqcloud.com/vscode/5.png" />

使用统计

<img width="350px" src="https://claudecodecn-1253302184.cos.ap-beijing.myqcloud.com/vscode/7.png" />

<img width="350px" src="https://claudecodecn-1253302184.cos.ap-beijing.myqcloud.com/vscode/8.png" />

MCP功能

<img width="350px" src="https://claudecodecn-1253302184.cos.ap-beijing.myqcloud.com/vscode/v1.0.4/2.png" />

<img width="350px" src="https://claudecodecn-1253302184.cos.ap-beijing.myqcloud.com/vscode/v1.0.4/1.png" />


---

## 本项目解决的痛点

### 1.完全中文化

目前已经实现完全中文化，更多的国际化也在进行中了

### 2.Claude Code 命令行窗口不好用

Claude Code 虽然也在vscode里面除了可以交互的窗口，我使用起来非常的不好用，于是我借鉴Cursor，Augment，Trae，Copilot ，[Claudia](https://claudia.so/)，[Opcode](https://opcode.sh/)
等产品交互和自己理解，缝合了一版我认为交互与UI还能看到过去的产品，本项目对话交互使用的是 [Claudia](https://claudia.so/) 主要逻辑，这个项目很好，欢迎Star，另外 Trae 国际版 也提供了很多UI细节参考，也欢迎大家支持 Trae

### 3.无法便捷的切换源

目前官方的源，我们也可以使用第三方的claude源，也可以使用国内模型的源，例如智普GLM 等方式，传统的通过命令行修改本地文件的方式不太优雅

GitHub开源仓库：[cc-switch](https://github.com/farion1231/cc-switch) 给出一个好的解决方案，我将这个项目的核心功能，集成到本项目中了，[cc-switch](https://github.com/farion1231/cc-switch) 项目也非常棒，欢迎Star

<img width="500px" src="https://claudecodecn-1253302184.cos.ap-beijing.myqcloud.com/vscode/6.png" />

### 4.无法清晰的感知到Claude Code 消耗的金额

解决办法：借鉴 [Opcode](https://opcode.sh/) 搞了一套 使用使用统计（[Opcode](https://opcode.sh/) 项目也非常棒，欢迎 star）

<img width="350px" src="https://claudecodecn-1253302184.cos.ap-beijing.myqcloud.com/vscode/7.png" />


### 5.其他解决的痛点

后续会不断解决一些痛点.....

---

## 使用方法

```sh
# 安装依赖
pnpm i

# 构建 并 打包.vsix
pnpm run pack
```

[claude-code-cn-1.0.2.vsix](https://claudecodecn-1253302184.cos.ap-beijing.myqcloud.com/vscode/claude-code-cn-1.0.2.vsix)

---
## 鸣谢

站在前人肩膀上可以看的更远，本项目参考项目和网站如下，希望也能对你有所启发：
> 以下排名不分先后

- [LINUX DO 社区](https://linux.do/)
- [Claude Code for VS Code](https://marketplace.visualstudio.com/items?itemName=anthropic.claude-code)
- [Cursor](https://cursor.com/cn/features)
- [Augment](https://www.augmentcode.com/)
- [Windsurf](https://windsurf.com/)
- [Claudia](https://claudia.so/)
- [Opcode](https://opcode.sh/)
- [Claudix](https://github.com/Haleclipse/Claudix)
- [Trae](https://www.trae.cn/)
- [Copilot Chat](https://github.com/microsoft/vscode-copilot-chat)
- [Codex Cli](https://developers.openai.com/codex/cli/)
- [cc-switch](https://github.com/farion1231/cc-switch)
