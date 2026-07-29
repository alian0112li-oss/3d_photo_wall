# 3D 照片墙 · 企业级官网开屏 Demo

基于 **Three.js + GSAP ScrollTrigger + Vite** 的 3D 照片墙开屏（Hero Section）。
照片以真正的 3D 立体卡片沿圆柱面环绕排布 —— 正面是照片、背面是品牌化背板、四周是金属质感边框，任何角度观看都完整可信。**向下滚动鼠标滚轮，整面照片墙随滚动进度旋转下沉**，Hero 文案淡出，页面内容随之浮现，构成完整的官网开屏叙事。

## ✨ 特性

| 能力 | 说明 |
| --- | --- |
| 真 3D 卡片 | BoxGeometry 厚度边框 + 正面照片 + 背面品牌背板，背面不再镂空 |
| 滚动叙事 | GSAP ScrollTrigger 将滚轮/滚动条映射为墙体旋转 + 下沉 + 画面淡出 |
| 拖拽环视 | 水平拖拽旋转（带惯性），滚轮完全保留给页面滚动，移动端竖滑滚页、横滑转墙 |
| 点击聚焦 | 点击照片镜头平滑飞至正前方，`Esc` / 点空白 / 滚动即释放 |
| 视差跟随 | 相机随鼠标位置轻微偏移，增强空间感 |
| 氛围渲染 | 反射地面（Reflector）、指数雾、粒子星尘、多彩轮廓光、ACES 色调映射 |
| 工程化 | Vite 构建、模块化分层、集中配置、CI 自动部署 GitHub Pages |
| 可访问性 | 遵循 `prefers-reduced-motion`：自动旋转 / 视差 / 浮动动画自动关闭 |
| 容错 | 图片加载失败自动回退为 Canvas 生成的占位纹理；加载遮罩带超时保护 |

## 🚀 在线预览

CI 会在每次 push 到 `main` 后自动构建并部署：

```
https://alian0112li-oss.github.io/3d_photo_wall/
```

> **首次需手动开启一次**：仓库 **Settings → Pages → Build and deployment → Source** 选择 **GitHub Actions**，之后每次推送全自动。

## 🖥️ 本地开发

```bash
npm install
npm run dev        # 开发服务器 http://localhost:5173
npm run build      # 生产构建 -> dist/
npm run preview    # 预览生产构建 http://localhost:4173
```

## 🐍 生成 / 替换照片

占位图由 `scripts/generate_images.py`（依赖 [Pillow](https://python-pillow.org/)）生成：

```bash
pip install pillow
npm run images                                        # 默认 30 张 600x750
python scripts/generate_images.py --count 40 --size 600 800
```

**换成真实照片**：将图片按 `photo_01.png`、`photo_02.png` … 命名放入 `public/images/`。
数量或排布变化时，只需修改 [src/config.js](src/config.js) 中的 `WALL.TOTAL` / `COLS` / `ROWS`。

## 📁 项目结构

```
3d_photo_wall/
├── index.html                  # 页面骨架：Header / Hero / 滚动驱动区 / 内容区
├── vite.config.js
├── package.json
├── .github/workflows/deploy.yml  # CI：构建 + 部署 GitHub Pages
├── scripts/
│   └── generate_images.py      # Pillow 占位图生成脚本
├── public/
│   └── images/                 # 照片资源（构建时原样拷贝）
└── src/
    ├── main.js                 # 入口
    ├── config.js               # ★ 全部可调参数集中于此
    ├── styles/main.css         # 全局样式（Hero / 内容区 / 加载遮罩）
    ├── core/App.js             # 编排器：渲染循环、相机跟随、模块组装
    ├── scene/
    │   ├── PhotoWall.js        # 圆柱阵列 3D 照片卡片（正面/背面/边框）
    │   ├── environment.js      # 灯光、反射地面、网格、粒子
    │   └── textures.js         # 程序化纹理：品牌背板、加载失败回退图
    ├── controls/
    │   ├── DragRotator.js      # 拖拽旋转 + 惯性（不占用滚轮）
    │   └── FocusController.js  # 悬停高亮 + 点击聚焦镜头飞行
    └── scroll/
        └── scrollAnimation.js  # ScrollTrigger：下沉/旋转/淡出/内容渐入
```

## 🔧 核心参数（src/config.js）

| 参数 | 含义 | 默认 |
| --- | --- | --- |
| `WALL.TOTAL / COLS / ROWS` | 照片数 / 每层列数 / 层数 | `30 / 10 / 3` |
| `WALL.RADIUS` | 圆柱半径 | `8.2` |
| `WALL.CARD_DEPTH` | 卡片厚度（3D 立体感） | `0.14` |
| `SCROLL.LENGTH_VH` | 滚动叙事总长度（vh，与 CSS `#scroll-driver` 同步） | `280` |
| `SCROLL.TURNS` | 滚动全程墙体旋转圈数 | `1.25` |
| `SCROLL.DESCEND` | 滚动全程下沉深度 | `30` |
| `CAMERA.FOCUS_DISTANCE` | 聚焦时相机与照片距离 | `4.8` |

## 🧭 滚动交互设计

```
scroll 0% ──────────────── 100% (280vh)
   │ Hero 文案淡出 (0~20%)
   │ 照片墙旋转 1.25 圈 + 下沉 30 单位 (0~100%, 平滑插值)
   │ 画布淡出至 12% (50%~86%)
   └ 内容区 .reveal 元素进入视口时渐入 (once)
```

滚轮不被 3D 场景拦截 —— 交互约定为：**滚轮 = 叙事进度，拖拽 = 环视，点击 = 聚焦**。

## 🛠️ 技术栈

- [Three.js](https://threejs.org/) `r166` — WebGL 渲染
- [GSAP](https://gsap.com/) `3.12` + ScrollTrigger — 滚动驱动与镜头动画
- [Vite](https://vitejs.dev/) `5` — 构建与开发服务器
- Python 3 + Pillow — 占位素材生成
- GitHub Actions — CI/CD 自动部署
