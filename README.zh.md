# dsh-client-ui-android

[DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) Web GUI（`dsh web`）的安卓端 / 移动端适配插件。

当从安卓手机（或任意窄屏触屏设备）打开 GUI 时，本插件会自动识别并把桌面端界面改造成手机可用形态：

- 侧边栏变为**抽屉**（浮动汉堡按钮唤出），
- 设置界面**全屏化** + 导航横排，
- 聊天栏下方工具栏**单行排列**（+ / 权限 / 模型名 / 发送）互不遮挡，
- 安全区适配、去掉双击缩放、触控点击优化。

[English](README.md) | 中文

## 截图

| 手机首页（抽屉收起） | 抽屉展开 | 设置-模型列表 | 聊天工具栏 |
| --- | --- | --- | --- |
| ![home](docs/screenshots/android-home.png) | ![drawer](docs/screenshots/android-drawer.png) | ![settings](docs/screenshots/settings-models.png) | ![composer](docs/screenshots/composer-toolbar.png) |

## 功能

### 1. 安卓识别

页面加载时读取 UA + UA-Client-Hints，在 `<html>` 上打标记：

- `data-platform="android"`、`data-android="true"`（+ `data-android-version`）
- `data-device-type="mobile|tablet|desktop"`、`data-touch`
- `data-dsh-mobile` / `data-dsh-tablet` 及 `dsh-mobile`、`dsh-android` class
- 调试快照：`window.__DSH_DEVICE__`

### 2. 触屏基础优化（手机 & 平板）

- viewport 升级：`viewport-fit=cover` + `interactive-widget=resizes-content`
  （输入框不被软键盘顶掉、内容避开刘海/手势区）
- 应用框架安全区内边距（`env(safe-area-inset-*)`）
- `touch-action: manipulation`（去掉双击缩放/300ms 点击延迟）、输入框 16px 防聚焦放大、阻止误触下拉刷新

### 3. 手机布局（`data-dsh-mobile`）

- AppFrame 变为单栏布局
- 侧边栏变成**离屏抽屉**（汉堡按钮唤出、遮罩点按关闭）；详情栏变为滑入抽屉；隐藏拖拽手柄
- 抽屉用 `left`/`right` 位移 —— **绝不用 `transform`** —— 否则 `position: fixed`
  的弹层（设置弹窗渲染在侧边栏内部）会被困在 transform 包含块里

### 4. 设置弹窗（手机）

全屏页面 + 横向导航行（桌面双栏布局会把内容列挤爆）；长模型名省略号截断、权限行文本与选择器不溢出。

### 5. 聊天栏下方工具栏

手机上「+ / 权限按钮 / 模型名称 / 发送」**保持在同一行**：权限按钮压缩为纯图标
（点按后在选择器里显示名称），模型名仅在极窄屏下省略号收缩 —— 任何宽度都不互相遮挡。

### 6. 桌面端完全无感

非安卓 / 非窄屏触屏设备不产生任何变化。

## 安装

需要 DeepSeek Harness `>= 0.1.0-rc.6`（带 client bundle 的 Web 界面）。

### 方式 A — npm

```sh
dsh plugin --profile web add dsh-client-ui-android
```

### 方式 B — GitHub

```sh
dsh plugin --profile web add github:LeMonXi-i/dsh-client-ui-android
```

### 方式 C — 手动（无需 pnpm）

1. 把 `dsh-client-ui-android` 文件夹放入 `~/.dsh/profiles/web/node_modules/`；
2. 在 `~/.dsh/profiles/web/package.json` 的 `dsh.profile.bundles` 里加入：

```json
"dsh": {
  "profile": {
    "bundles": [
      "@deepseek-ai/dsh-base",
      "@deepseek-ai/dsh-web-app",
      "dsh-client-ui-android"
    ]
  }
}
```

然后重启 `dsh web` 并**刷新页面**（手机上建议强刷）。用安卓手机打开 GUI 即自动生效，桌面端无变化。

## 工作原理

- **宿主端**（`lib/index.js`）—— 极简 cordis 加载条目，让 profile loader 能挂载该包、
  client-modules 扫描器能下发浏览器 bundle；本身不做任何事。
- **浏览器端**（`lib/client.js`）—— 通过 `package.json` 的 `dsh.client` 声明
  （platform `web`、启动即加载）。以 `/plugins/dsh-client-ui-android/client.js` 下发，
  出现在 `window.__DSH_BOOT__` 中。负责：识别、注入作用域样式表、给 AppFrame/设置弹窗
  打稳定的 `data-*` 标记、把汉堡按钮+遮罩挂到 `shell.overlay` 插槽。
- **补丁**（`cordis.patch.yml`）—— 激活 bundle 的 profile 补丁行。

`lib/*.js` 即源码 —— 纯 JS，无需构建步骤。

## 兼容性

- 安卓 Chrome / WebView（现代版本），以及任意窄屏触屏浏览器（iOS 也享受触屏基础优化）。
- 使用 `:has()`（Chrome 105+/Safari 15.4+）、`100dvh`、`interactive-widget=resizes-content`
  （Chrome 108+），均带优雅降级。

## 开发

```sh
# 修改 lib/client.js 后，把文件夹拷入 profile 并重启
# 或使用 HMR 流程：在 deepseek-harness 检出目录运行 pnpm run dev:web
```

## License

MIT
