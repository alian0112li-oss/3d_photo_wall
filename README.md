# 3D 照片墙 · Three.js

基于 **Three.js + Vite** 的全屏 3D 照片墙。照片以真正的 3D 立体卡片沿圆柱面环绕排布 —— 金属质感厚度边框，**正反两面都显示照片正像**（背面旋转放置而非镜像），任何角度看到的都是端正的照片。墙体以恒定速度自转陈列；**唯一的交互是鼠标滚轮**，通过阻尼缓动插值驱动墙体上下穿行，逐层浏览。

## ✨ 特性

| 能力 | 说明 |
| --- | --- |
| 开屏入场动画（K95 式） | 纯白背景，照片卡从屏幕正中央**逐张"绽放"长大**（宽度 0→目标、强 ease-out、纵横比锁定），目标宽度 84%→100% 逐张递增、一张压一张，最后一张 100% 的**纯黑卡**盖顶；右上角 `[0..100]` 计数器与发牌同钟。随后整叠虚化退场，白幕上只留一个卡片形状的"洞"（透明矩形 + 巨型白色 box-shadow 反向遮罩），洞里已是实时 3D 墙——洞以 expo.inOut 用 1s **从中心扩张**吞掉整个视口完成揭示 |
| 双面照片卡片 | BoxGeometry 厚度边框，正反两面都是照片正像（旋转非镜像），没有"背面" |
| 三档动态自转 | 正常 0.14 · 悬停照片减速 0.05 · 滚动中微加速 0.19（rad/s），滚动档方向跟随滚动方向（向上滚则反转），档位间用阻尼平滑混合，无生硬跳变 |
| 滚轮逐层浏览 | 自然滚动方向：滚轮向下，墙体向上攀升（顶层 → 中层 → 底层逐层居中），边界带橡皮筋回弹 |
| 指针不动墙 | 鼠标移动与点击不改变墙体位置与姿态；指针仅用于悬停测速；移动端竖向滑动等价于滚轮 |
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
- 自转是独立的时间积分，滚轮位置不影响转角；只有**转速档位**会随状态切换

## 🎚️ 自转速度记录（当前版本，src/config.js 的 `SPIN` 区块）

| 档位 | 触发条件 | 当前值 (rad/s) | 大约转一圈 |
| --- | --- | --- | --- |
| `SPIN.BASE` | 默认陈列 | `0.14` | ≈ 45s |
| `SPIN.HOVER` | 指针悬停在任意照片上 | `0.05` | ≈ 126s |
| `SPIN.SCROLL` | 滚轮滚动中（比正常快一点点；**方向随滚动方向**，向上滚为 −0.19 反转） | `0.19` | ≈ 33s |
| `SPIN.DAMP` | 档位切换阻尼（越大切换越干脆） | `3.5` | — |
| `SPIN.SCROLL_HOLD` | 最后一次滚轮输入后仍算"滚动中"的时长 | `300ms` | — |

优先级：**滚动中 > 悬停 > 默认**。切换全程用 `damp` 平滑过渡，没有硬阈值——调速只需改上表数值。

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
    ├── intro/Intro.js          # 开屏（K95 式）：中心绽放堆叠 -> 白幕打孔揭示
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
| `SPIN.BASE / HOVER / SCROLL` | 三档自转速度（rad/s） | `0.14 / 0.05 / 0.19` |

## 🛠️ 技术栈

- [Three.js](https://threejs.org/) `r166` — WebGL 渲染与 `MathUtils.damp` 阻尼插值
- [Vite](https://vitejs.dev/) `5` — 构建与开发服务器
- Python 3 + Pillow — 占位素材生成
- GitHub Actions — CI/CD 自动部署
