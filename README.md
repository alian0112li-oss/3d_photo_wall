# 3D 照片墙 · Three.js Photo Wall

一个用 [Three.js](https://threejs.org/) 制作的 3D 圆柱照片墙网页。照片沿圆柱面环绕排布，支持自动旋转、拖拽环视、滚轮缩放，点击任意照片可平滑聚焦查看。占位图片由 Python 脚本生成，替换 `images/` 目录即可换成真实照片。

> 纯静态页面，无需构建工具。Three.js 通过 CDN + import map 加载。

## ✨ 特性

- **圆柱照片墙**：30 张照片，10 列 × 3 层环绕排布
- **交互**：拖拽旋转 · 滚轮缩放 · 悬停放大 · 点击聚焦 · `Esc` 复位
- **自动旋转**：可通过底部按钮暂停 / 继续
- **视觉效果**：反射地面（Reflector）、体积雾、粒子氛围、多光源、ACES 色调映射
- **响应式**：自适应窗口尺寸，兼容移动端
- **健壮性**：图片加载失败时自动回退为 Canvas 生成的占位纹理

## 🚀 在线预览

启用 GitHub Pages 后即可访问：

```
https://alian0112li-oss.github.io/3d_photo_wall/
```

> 在仓库 **Settings → Pages** 中，将 Source 设为 `Deploy from a branch`，分支选 `main`、目录选 `/ (root)`，保存后稍等片刻即可。

## 🖥️ 本地运行

由于浏览器对 `file://` 下的 WebGL 纹理有跨域限制，请通过本地 HTTP 服务器打开（不要直接双击 `index.html`）：

```bash
# 在项目根目录执行
python -m http.server 8000
```

然后浏览器访问 <http://localhost:8000/> 即可。

## 🐍 生成 / 替换占位图片

占位图片由 `generate_images.py`（依赖 [Pillow](https://python-pillow.org/)）生成：

```bash
pip install pillow
python generate_images.py                 # 生成默认 30 张 600x750 图片
python generate_images.py --count 40 --size 600 800   # 自定义数量与尺寸
```

**换成真实照片**：把自己的图片按 `photo_01.png`、`photo_02.png` … 的命名放进 `images/` 目录即可。若数量不是 30，请同步修改 `index.html` 顶部的 `TOTAL`（以及需要时的 `COLS` / `ROWS`）。

## 📁 目录结构

```
3d_photo_wall/
├── index.html          # Three.js 照片墙主页面（含全部逻辑与样式）
├── generate_images.py  # Python 占位图片生成脚本（Pillow）
├── images/             # 占位 / 真实照片
│   ├── photo_01.png
│   └── … photo_30.png
└── README.md
```

## 🔧 可调参数

`index.html` 顶部的 **Config** 区块可快速调整效果：

| 参数 | 含义 | 默认 |
| --- | --- | --- |
| `TOTAL` | 照片总数 | `30` |
| `COLS` | 每层照片数（列） | `10` |
| `ROWS` | 层数（行） | `3` |
| `RADIUS` | 圆柱半径 | `8.2` |
| `PW` / `PH` | 单张照片宽 / 高 | `2.4` / `3.0` |

## 🛠️ 技术栈

- Three.js `r160`（ES Modules + import map，via unpkg CDN）
- OrbitControls / Reflector（three/addons）
- Python 3 + Pillow（占位图片生成）
