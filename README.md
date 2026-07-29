# 3D 照片墙 · Three.js

基于 **Three.js + Vite** 的全屏 3D 照片墙。照片以真正的 3D 立体卡片沿圆柱面环绕排布 —— 金属质感厚度边框，**正反两面都显示照片正像**（背面旋转放置而非镜像），任何角度看到的都是端正的照片。墙体以恒定速度自转陈列；**唯一的交互是鼠标滚轮**，通过阻尼缓动插值驱动墙体上下穿行，逐层浏览。

## ✨ 特性

| 能力 | 说明 |
| --- | --- |
| 开屏入场动画 | 扑克牌式发牌：照片逐张掉落到屏幕中央、一张压一张堆叠，最后落下一张黑卡；随后黑卡经 **FLIP**（First → Last → Invert → Play）瞬间转化为全屏"视口遮罩层"，盖屏同时同步切换底层排版，再淡出揭示 3D 墙 |
| 双面照片卡片 | BoxGeometry 厚度边框，正反两面都是照片正像（旋转非镜像），没有"背面" |
| 恒速自转 | 墙体持续匀速旋转陈列，转速与滚轮完全解耦，滚动不改变转速 |
| 滚轮逐层浏览 | 自然滚动方向：滚轮向下，墙体向上攀升（顶层 → 中层 → 底层逐层居中），边界带橡皮筋回弹 |
| 仅滚轮交互 | 鼠标移动与点击对墙体零影响；移动端竖向滑动等价于滚轮 |
| 呼吸浮动 | 每张卡片按独立相位轻微浮动，整墙缓慢起伏 |
| 氛围渲染 | 反射地面（Reflector）、指数雾、粒子星尘、多彩轮廓光、ACES 色调映射 |
| 工程化 | Vite 构建、模块化分层、集中配置、CI 自动部署 GitHub Pages |
| 可访问性 | 遵循 `prefers-reduced-motion`：跳过入场动画，自转 / 浮动自动关闭 |
| 健壮性 | 入场动画每一阶段都有超时兜底，标签页失焦 / 事件丢失也不会卡死 |

## 🧲 运动系统（丝滑手感的来源）

**核心原则：输入永远不直接改变画面 —— 滚轮只写目标值（target），帧循环用指数阻尼追赶（damped chase）。**

```
输入层（事件）                运动层（每帧）
─────────────                ─────────────────────────────────
wheel ──► wheel.target ──►   wheel.value = damp(value, target)  ← 粘滞攀升
                             wall.position.y = (value − ½)·TRAVEL
                             wall.rotation.y = ∫ AUTO_SPEED dt   ← 恒速自转（与滚轮无关）
```

- 阻尼函数使用 `THREE.MathUtils.damp`（帧率无关的指数缓动），系数集中在 [src/config.js](src/config.js) 的 `MOTION` 区块 —— `WHEEL_DAMP` 越小越沉重，越大越跟手
- 滚轮越界时目标值可短暂超出 `[0,1]`，随后被橡皮筋弹簧拉回，形成边界"回弹"
- 自转是独立的时间积分，滚动、越界、回弹都不会改变转速

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
├── index.html                  # 极简骨架：画布 + 提示 + 加载遮罩
├── vite.config.js
├── package.json
├── .github/workflows/deploy.yml  # CI：构建 + 部署 GitHub Pages
├── scripts/
│   └── generate_images.py      # Pillow 占位图生成脚本
├── public/
│   └── images/                 # 照片资源（构建时原样拷贝）
└── src/
    ├── main.js                 # 入口（挂载 App 与开屏动画）
    ├── config.js               # ★ 布局 / 运动手感参数集中于此
    ├── styles/main.css
    ├── core/App.js             # 编排器：渲染循环、自转积分、行程合成
    ├── intro/Intro.js          # 开屏：发牌堆叠 -> FLIP 视口遮罩 -> 揭示
    ├── scene/
    │   ├── PhotoWall.js        # 圆柱阵列双面照片卡片 + 呼吸浮动
    │   ├── environment.js      # 灯光、反射地面、网格、粒子
    │   └── textures.js         # 程序化纹理：加载失败回退图
    └── controls/
        └── WheelScroller.js    # 滚轮虚拟滚动 + 橡皮筋回弹（唯一输入）
```

## 🔧 核心参数（src/config.js）

| 参数 | 含义 | 默认 |
| --- | --- | --- |
| `WALL.TOTAL / COLS / ROWS` | 照片数 / 每层列数 / 层数 | `36 / 12 / 3` |
| `WALL.RADIUS` | 圆柱半径（越大水平间隔越宽） | `12` |
| `WALL.ROW_GAP` | 层距（越大垂直间隔越宽） | `6.0` |
| `WHEEL.TRAVEL` | 滚轮全程垂直行程（= 2 × 层距） | `12` |
| `CAMERA.POSITION` | 相机位置（z 越小离墙越近） | `[0, 1.4, 19.5]` |
| `MOTION.WHEEL_DAMP` | 攀升阻尼（越小越沉重） | `5.5` |
| `SCENE.AUTO_ROTATE_SPEED` | 自转角速度（rad/s，与滚轮无关） | `0.08` |

## 🛠️ 技术栈

- [Three.js](https://threejs.org/) `r166` — WebGL 渲染与 `MathUtils.damp` 阻尼插值
- [Vite](https://vitejs.dev/) `5` — 构建与开发服务器
- Python 3 + Pillow — 占位素材生成
- GitHub Actions — CI/CD 自动部署
