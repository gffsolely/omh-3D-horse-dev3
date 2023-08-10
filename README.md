# Next.js + Tailwind CSS + TypeScript Starter and Boilerplate

## Features

This repository is 🔋 battery packed with:

- ⚡️ Next.js 13
- ⚛️ React 18
- ✨ TypeScript
- 💨 Tailwind CSS 3 — Configured with CSS Variables to extend the **primary** color
- 💎 Pre-built Components — Components that will **automatically adapt** with your brand color, [check here for the demo](https://tsnext-tw.thcl.dev/components)
- 🃏 Jest — Configured for unit testing
- 📈 Absolute Import and Path Alias — Import components using `@/` prefix
- 📏 ESLint — Find and fix problems in your code, also will **auto sort** your imports
- 💖 Prettier — Format your code consistently
- 🐶 Husky & Lint Staged — Run scripts on your staged files before they are committed
- 🤖 Conventional Commit Lint — Make sure you & your teammates follow conventional commit
- ⏰ Release Please — Generate your changelog by activating the `release-please` workflow
- 👷 Github Actions — Lint your code on PR
- 🚘 Automatic Branch and Issue Autolink — Branch will be automatically created on issue **assign**, and auto linked on PR
- 🔥 Snippets — A collection of useful snippets
- 👀 Default Open Graph — Awesome open graph generated using [og](https://github.com/theodorusclarence/og), fork it and deploy!
- 🗺 Site Map — Automatically generate sitemap.xml
- 📦 Expansion Pack — Easily install common libraries, additional components, and configs

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `pages/index.tsx`. The page auto-updates as you edit the file.

## 本地调试开启 https

- 1.启动 npm run dev
- 2.新建终端，执行 npm run dev:https

## 在 VSCode 中统一团队代码格式化规范

- 1.安装 Prettier 插件。在 VSCode 中按下 Ctrl+Shift+X 打开扩展面板，搜索并安装 Prettier - Code formatter 插件
- 2.在 VSCode 的设置中搜索 Editor: Default Formatter 选项，并将其设置为 esbenp.prettier-vscode，这样每次保存文件时，Prettier 插件就会自动格式化代码

## 项目目录结构说明

```
omnihorse-website-v3-nextjs
├─ .babelrc
├─ .eslintrc.js
├─ .git
├─ .gitignore
├─ .npmrc
├─ .prettierignore
├─ .prettierrc.js              //代码格式统一配置，配合Prettier 插件
├─ commitlint.config.js
├─ jest.config.js
├─ jest.setup.js
├─ next-sitemap.config.js
├─ next.config.js
├─ package.json
├─ postcss.config.js
├─ public
│  ├─ favicon
│  │  ├─ browserconfig.xml
│  │  ├─ favicon.ico
│  │  ├─ favicon.png
│  │  └─ site.webmanifest
│  ├─ favicon.ico
│  ├─ fonts
│  │  └─ inter-var-latin.woff2
│  ├─ images       //图片目录
│  │  ├─ example   //示例中用到的图片
│  │  └─ home      //网站首页部分的图片
│  └─ svg
│     ├─ example
│     ├─ home
│     └─ Vercel.svg
├─ README.md
├─ src
│  ├─ components   //公共组件
│  │  ├─ buttons
│  │  ├─ cards
│  │  ├─ layout
│  │  ├─ links
│  │  ├─ Seo.tsx
│  │  ├─ Skeleton.tsx
│  │  └─ texts
│  ├─ config      //基础配置
│  ├─ constant    //定制化配置
│  ├─ pages       //所有页面目录
│  │  ├─ 404.tsx
│  │  ├─ api
│  │  ├─ example      //示例页面
│  │  │  └─ horse
│  │  │     ├─ index.tsx
│  │  │     └─ [id].tsx
│  │  ├─ example.tsx     //示例页面
│  │  ├─ index.tsx       //网站首页
│  │  ├─ _app.tsx
│  │  └─ _document.tsx
│  ├─ services            //所有接口配置
│  │  ├─ example          //示例接口
│  │  └─ home             //网站首页接口
│  ├─ styles              //所有样式目录
│  ├─ utils               //工具方法目录
│  └─ views               //所有视图组件（最小单一板块）
│     ├─ example          //示例视图组件
│     ├─ home             //网站首页视图组件
│     └─ market           //网站市场视图组件
├─ tailwind.config.js
├─ tsconfig.json
└─ vercel.json

```
