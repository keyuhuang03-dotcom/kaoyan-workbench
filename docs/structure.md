# 文件分类说明

| 目录 | 存放内容 |
| --- | --- |
| `docs/prd/` | 主 PRD 的 Markdown 和基础 Word 文档 |
| `docs/prd/versions/` | Word 格式整理版及作品集版本 |
| `docs/prototypes/` | 知识库、数学、极限三张原型图 |
| `assets/icons/source/` | 原根目录中的图标素材 |
| `assets/icons/legacy/` | 当前代码未引用的旧版图标 |
| `assets/template/` | 当前代码未引用的 Next.js 模板图片 |
| `tools/debug/` | 手工排查问题使用的独立 HTML 页面 |
| `app/src/app/` | 页面、布局和 API 路由 |
| `app/src/components/` | 按业务分类的组件 |
| `app/src/lib/` | 公共逻辑、AI 和数据库客户端 |
| `app/prisma/` | 数据模型、迁移、初始化脚本及本地数据库 |
| `app/public/` | 应用实际使用的公开静态资源 |

## 顶层分类

最外层可见内容全部为文件夹：

```text
app/       完整应用：代码、配置、依赖、数据库和运行资源
assets/    设计素材、旧图标和模板图片
docs/      需求文档、原型图、开发说明
tools/    调试工具
```

Next.js、TypeScript、npm 的配置文件与代码一起放入 `app/`，这里是新的应用根目录。Git 仓库及忽略规则仍位于最外层隐藏文件中。

开发方法见 [开发说明](development.md)。在仓库根目录使用 `npm --prefix app run dev`，或进入 `app/` 后执行 `npm run dev`。部署平台的 Root Directory 需设为 `app`。

## 后续文件放置规则

- 新原型图放入 `docs/prototypes/`。
- 主需求内容在 `docs/prd/PRD.md` 中维护；额外导出版本放入 `docs/prd/versions/`。
- 非运行时的设计素材放入 `assets/`；需要通过网站地址访问的资源放入 `app/public/`。
- 临时验证页面放入 `tools/debug/`。原 `/test.html` 已移出公开目录，可直接用浏览器打开本地 HTML 文件。
