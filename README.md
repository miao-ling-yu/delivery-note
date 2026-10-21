# DeliveryNote · 送货单统计

一个**完全本地离线**运行的送货单管理与月度账单统计工具，提供 Android App（APK 安装包）和网页版两种形态，数据全部保存在本机，不依赖任何服务器与联网服务。

适用于外协加工、五金建材等小作坊/门店场景：开送货单 → 打印三联单 → 月底按客户对账出账单，一条龙完成。

## 功能特性

- **开送货单**：客户/商品快速选择，一客一价自动记忆，单号 `SD-YYYYMMDD-###` 按天自动编号
- **三联单打印**：白联存根 / 黄红联记账客户 / 蓝联回单，A4 竖版版式，支持 **保存图片 / 打印 / 另存 PDF / 分享**
- **月度账单**：选月份自动按客户分组汇总（张数 + 金额），账单标题按模板生成（如 `2026年客户名与外协厂名10月账单`），标题与备注可**预览修改**，一键**导出 Excel（.xlsx）**，也可全部导出为一个多工作表文件
- **数据统计**：销售趋势、客户销售排行、商品销售排行、单据数/件数/销售额/客户数
- **客户与商品管理**：基础资料维护，工作台快捷入口
- **导出以 Excel 为主**：单据、商品、客户、账单均可导出 .xlsx（内置零依赖 Xlsx 生成器，完全离线生成），支持 CSV 导入导出、备份与恢复

## 技术架构

- **前端**：原生 HTML / CSS / JavaScript，无框架、无构建、无 CDN，零第三方运行时依赖，可直接在浏览器打开运行
- **Android 壳**：Java + WebView，通过 JS 桥接提供文件保存（下载/送货单统计）、打印 PDF、分享、退出等原生能力
- **数据存储**：浏览器 localStorage（键 `sd_v1_*`），导出文件保存至手机「下载/送货单统计」目录

```
app/                     前端源码（唯一真相源）
  ├─ index.html          应用入口
  ├─ css/styles.css      三联单纸张视觉样式
  └─ js/
     ├─ store.js         数据层（localStorage 读写、统计聚合、备份恢复、CSV/XLSX 导入导出）
     ├─ util.js          工具函数（金额大写、格式化）
     ├─ xlsx.js          零依赖 .xlsx 生成器（ZIP + OOXML）
     └─ views/           页面：工作台/开单/单据/统计/账单/打印/基础资料/设置
android/                 Android WebView 壳工程（Java）
送货单统计.apk            已打包安装包（Android 6.0+）
```

## 快速开始

### 方式一：安装 Android App

直接安装根目录下的 `送货单统计.apk`（Android 6.0+）。安装后从桌面打开「送货单统计」即可使用。

### 方式二：浏览器打开网页版

用浏览器打开 `app/index.html` 即可（电脑手机均可）。注意：网页版数据存在**当前浏览器**的本地存储中，换浏览器/换设备不共享。

## 打包 APK（开发指南）

环境要求：JDK 17、Android SDK、Gradle 8.13。

```bash
# 1. 将 app/ 前端同步到 android/app/src/main/assets/app/
# 2. 配置 local.properties 指向本机 SDK（sdk.dir=D:\\AndroidSdk）
# 3. 打包
set JAVA_HOME=D:\DevTools\jdk-17
set ANDROID_HOME=D:\AndroidSdk
gradle -p android assembleRelease --no-daemon
# 产物：android/app/build/outputs/apk/release/app-release.apk
```

> 注意：Android Gradle Plugin 要求**构建工程路径不含中文/非 ASCII 字符**，如遇 `project path contains non-ASCII` 报错，请将工程复制到纯英文路径（如 `D:\DevTools\songhuodan-build`）后打包。

## 数据与隐私

- 所有业务数据**只保存在本机**，无任何网络请求、无账号体系、无数据上传
- 可在设置页「备份数据」导出 JSON 备份文件，或「恢复数据」还原
- 导出的 Excel / 图片 / PDF 默认保存至手机「下载/送货单统计」目录

## 开源许可

MIT License（如需要可自行添加 LICENSE 文件）。
