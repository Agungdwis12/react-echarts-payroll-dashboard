# React ECharts Dashboard Template

[![项目检查](https://github.com/kryoncode/react-echarts-dashboard-template/actions/workflows/ci.yml/badge.svg)](https://github.com/kryoncode/react-echarts-dashboard-template/actions/workflows/ci.yml)

一套面向 UI 设计师的 React 数据大屏通用模板，也是《UI 设计师的第一套 AI 实现 React 数据大屏》系列教程的配套项目。它是一张可以直接运行、构建和部署的**单页前端模板**，你可以继续让 AI 替换品牌、数据和视觉样式。

![React ECharts 数据大屏最终效果](https://typora-macos.oss-cn-qingdao.aliyuncs.com/05-%E7%AC%AC%E4%B9%9D%E7%AF%87%E6%9C%80%E7%BB%88%E6%95%88%E6%9E%9C-1440x900.png)

## 模板包含什么

- 1600 × 1000 设计画布，以及不同窗口下的等比例缩放。
- 一张完整的销售总览页面；用户、商品、订单和财务导航保留为后续扩展的视觉入口。
- 总览指标、趋势折线图、渠道环形图、TOP5 排名和关键指标卡片。
- 今日、近 7 天、近 30 天、自定义四组联动 Mock 数据。
- 加载、空数据、错误和成功四种数据状态，便于验收异常场景。
- 环境变量品牌配置、浏览器全屏、生产构建、代码检查和 GitHub Actions。
- ECharts 按需注册，并将 React、ECharts、ZRender 拆分为独立生产资源。

![日期筛选联动演示](https://typora-macos.oss-cn-qingdao.aliyuncs.com/33-Chrome%E7%AC%AC%E5%85%AB%E7%AF%87%E6%97%A5%E6%9C%9F%E8%81%94%E5%8A%A8%E6%BC%94%E7%A4%BA.gif)

## 开始使用

请先安装符合项目要求的 Node.js：`^20.19.0` 或 `>=22.12.0`。第一次使用时，在终端执行：

```bash
git clone https://github.com/kryoncode/react-echarts-dashboard-template.git
cd react-echarts-dashboard-template
npm install
npm run dev
```

打开终端显示的本地地址即可。修改代码后，Vite 会自动刷新浏览器页面。

## 替换品牌名称

复制环境变量示例文件，并把等号右侧内容改成自己的品牌名称：

```bash
cp .env.example .env.local
```

```dotenv
VITE_DASHBOARD_TITLE=品牌运营数据大屏
VITE_DASHBOARD_SUBTITLE=BRAND OPERATION DASHBOARD
VITE_DASHBOARD_PAGE_TITLE=品牌运营数据大屏
```

`.env.local` 已被 Git 忽略，不会覆盖其他使用者的品牌配置。`VITE_` 开头的值会进入浏览器代码，只能填写公开信息，不能保存密码、令牌或其他密钥。

## 调试数据状态

以下地址只在 `npm run dev` 的开发环境生效，用来检查不同状态下的 UI 是否完整。为了不干扰像素级视觉验收，视口尺寸、缩放比例和 Mock 状态只有在地址中增加 `debug` 参数时才显示；生产页面不会渲染这些信息：

```text
正常数据：http://localhost:5173/
持续加载：http://localhost:5173/?mock=loading
空数据：http://localhost:5173/?mock=empty
请求失败：http://localhost:5173/?mock=error
显示调试信息：http://localhost:5173/?debug=1
```

生产构建会固定使用正常数据，访问线上地址时不能通过查询参数强制显示错误页。

## 常用命令

| 命令 | 用途 |
| --- | --- |
| `npm run dev` | 启动本地开发环境 |
| `npm run lint` | 检查代码中的常见问题 |
| `npm run build` | 完成 TypeScript 检查并生成生产文件 |
| `npm run preview` | 本地预览 `dist` 中的生产文件 |
| `npm run check` | 依次执行代码检查和生产构建 |

准备交付前建议执行：

```bash
npm run check
npm audit --audit-level=high
```

## 项目结构

```text
src/
├── components/
│   ├── charts/              # ECharts 的 React 容器
│   └── dashboard/           # 大屏业务组件、卡片和图表
├── config/                  # 可替换的品牌配置
├── constants/               # 设计画布尺寸等常量
├── hooks/                   # 缩放、数据和全屏能力
├── lib/                     # ECharts 按需注册
├── mocks/                   # 四组日期范围的演示数据
├── services/                # 数据请求边界
├── styles/                  # 颜色、间距和圆角变量
├── types/                   # 数据结构类型
├── utils/                   # 数值格式化工具
├── App.css                  # 大屏布局与组件样式
└── App.tsx                  # 页面入口
```

修改大屏时，优先让 AI 在对应目录中工作，不要把数据、图表配置和页面结构重新塞回一个文件。

## 构建与部署

```bash
npm run build
npm run preview
```

构建结果位于 `dist/`。项目使用相对资源路径，可以部署到站点根目录，也可以放到静态站点的子目录中；部署平台只需发布 `dist` 文件夹。

## 章节版本

每篇教程结束都有对应 Git 标签，可以随时回到当时的代码状态：

| 标签 | 完成内容 |
| --- | --- |
| `chapter-01` | 初始化项目、创建固定设计画布和等比例缩放 |
| `chapter-02` | 技术选型、基础布局和组件拆分 |
| `chapter-03` | 视觉令牌、公共面板和深色视觉系统 |
| `chapter-04` | 总览指标卡、关键指标卡和 SVG 迷你趋势线 |
| `chapter-05` | ECharts 折线图、环形图和自适应容器 |
| `chapter-06` | 日期筛选、轮播控制和交互细节 |
| `chapter-07` | 统一 Mock 数据层和四类数据状态 |
| `chapter-08` | 品牌配置、全屏、生产边界、构建优化和 CI |
| `chapter-09` | 对照设计稿完成几何、页头、组件、图表和多视口视觉校准 |

例如，下面的命令会临时查看第 4 篇完成时的项目：

```bash
git switch --detach chapter-04
```

查看结束后执行 `git switch main`，即可返回最新版本。

## 技术栈

- React 19 + TypeScript 6
- Vite 8
- ECharts 6
- Lucide React
- Oxlint
- GitHub Actions

## 产品定位与边界

这是一个**可运行的单页前端模板**，不是已经包含五个业务页面的完整后台系统。当前只实现“销售”页面；用户、商品、订单和财务导航用于保留视觉结构，底部轮播用于演示页码、暂停、间隔和切换效果状态，二者都没有对应的四张业务页面与路由。

模板默认数据来自本地 Mock 文件，不包含登录、数据库、后端接口和线上部署账号。接入真实业务时，请保持 `services` 层的数据结构稳定，再将 Mock 请求替换为真实接口；要扩展多页面轮播，应先补齐页面数据合同和真实页面组件，再把导航与 `currentPage` 接入页面切换。

## License

本项目用于教程学习和个人项目实践。若要用于团队或商业项目，请先核对素材、字体、数据和品牌内容的授权范围。
