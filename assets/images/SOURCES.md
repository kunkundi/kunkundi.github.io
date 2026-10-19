# 官网图片来源

更新日期：2026-10-19。

## 赞助平台图标

`sponsors/afdian.png`、`sponsors/kofi.png` 和 `sponsors/github.svg` 原样复用 CrossDesk PC 客户端 `apps/desktop/src/gui/ui/icons/sponsors/` 的资源。各平台官方来源与归属保留在 [sponsors/SOURCES.md](sponsors/SOURCES.md)。官网使用与 PC 客户端相同的三个赞助链接及语言排列顺序。

## 多平台展示图

`cross-platform-current-{zh,en}.webp` 展示 Windows 显示器、MacBook、Ubuntu 笔记本和一台横屏 iPhone。电脑外观以及 Windows、Ubuntu 桌面背景来自原有 `cross-platform-iPhone.webp`；Windows 应用窗口使用当前项目的主界面截图进行确定性合成；MacBook 显示真实 macOS 被控桌面；Ubuntu 笔记本显示当日采集的 Web 客户端，保留周围的系统顶栏和启动栏；iPhone 使用下述真实连接后的原生 iOS 横屏截图，悬浮控制窗处于展开状态。没有使用 AI 生成图片。

这是产品界面合成示意，并非分别在各操作系统上重新拍摄的运行现场。Windows 的桌面窗口使用共享 UI 的中英文渲染图，ID、密码、设备和连接状态均为演示数据。Linux 屏幕使用真实 Web 页面截图合成，并非在 Linux 浏览器上另行拍摄。页面图注和替代文本标注了合成展示与 iOS 模拟器来源。

首屏只保留一台移动设备。旧手机由当前 iPhone 模拟器外框替换；其遮挡的 MacBook 底座边缘使用同一设备可见的左侧边缘镜像补齐。移动客户端预览同样仅展示横屏 iPhone 设备图；原有 iOS 与 Android 首页素材保留归档。

首屏加载 `cross-platform-current-{640,1280,1920}-{zh,en}.webp`，由上述 3721 × 1969 原图等比缩小并采用有损 WebP 压缩生成，保留完整构图。使用 `cwebp` 1.6.0，参数为 `-q 82 -m 6 -sharp_yuv -resize <宽度> 0`。三个尺寸分别约为 15、40、70 KB，通过 `srcset` 和与首屏布局对应的 `sizes` 按显示宽度及像素密度选择；默认图宽为 1280，保留高加载优先级。原图保留用于后续生成及分享元数据，首页不再直接加载原图。英文页面生成脚本同步转换 `src` 和 `srcset` 的语言后缀。

## iOS 横屏远程会话

`ios-native-connected-landscape.webp` 采集于 2026-10-19 16:05（Asia/Shanghai），来自重新签名构建的 iPhone 17 Pro / iOS 26.5 模拟器，在用户已连接远端、清理隐私信息并展开悬浮控制窗后，通过 Xcode Device Hub 导出。原图为 2622 × 1206，以无损 WebP 保存；保留原生「已连接」状态、远程 macOS 桌面及控制窗，不做模糊、遮挡或界面重绘。

`ios-native-connected-device.webp` 使用同次采集的实际模拟器外框，屏幕嵌入上述完整截图；只移除设备外侧背景并等比缩放。首屏组图和移动客户端预览使用此设备图。此前被用户指出含隐私信息的截图已弃用并清理本地文件，不用于官网素材。

## 桌面截图

`macos-controlled-desktop.webp` 采集于 2026-10-19 16:20（Asia/Shanghai），来自同一真实 iOS 远控会话中接收到的 macOS 桌面，保留远端已展开的「被控中」状态面板。先收起移动端控制窗，再上下移动移动端悬浮按钮各采集一张；使用两张截图中各自未被按钮遮挡的桌面像素拼合，裁去手机黑边，得到 1930 × 1206 的桌面画面。未生成或重绘桌面内容。MacBook 屏幕以此图等比缩放并微量裁切适配。

`desktop-main-{zh,en}.webp`、`desktop-deskhub-{zh,en}.webp` 和 `desktop-settings-deskhub-{zh,en}.webp` 来自 CrossDesk 工程 `docs/images/` 中的同名 PNG，以无损 WebP 保存，未重绘界面。

源图于 2026-10-19 从 UI 源代码 `1ef372d2` 的 Slint 组件渲染，使用演示数据。桌面墙及近期设备中的网页缩略图属于源图自带演示素材，不代表实时远程连接；其中网页内容不应理解为最新发布信息。

来源说明：https://github.com/kunkundi/crossdesk/blob/deskhub/docs/images/README.md

## Web 客户端

`web-client-current.webp` 于 2026-10-19 从 https://web.crossdesk.cn/ 的真实 1280 × 720 浏览器视口采集，页面显示版本 `2026.10.17.1`，设备 ID 和密码均为空，未建立远程连接。首屏将完整截图原尺寸嵌入 Ubuntu 笔记本显示区域，保留屏幕周围的系统顶栏与启动栏，不拉伸控件。

Web 页面当前显示中文，因此官网切换至英文时保留该真实截图；其替代文本随语言切换。

## 历史文件

旧版图片保留以兼容既有外链，但首页、分享元数据和结构化截图列表已改用本次更新的文件。

## iOS 与 Android 原生客户端

`ios-native-home.webp` 和 `android-native-home.webp` 均于 2026-10-19 从原生应用实际运行画面导出，以无损 WebP 保存。不是 Web 页面，也没有重绘控件、添加连接记录或伪造在线状态。两端保持未授权联网状态，设备 ID 为空，未建立远程连接。截图中的中文来自原生应用，官网英文模式保留该实际界面。

- iOS：使用 `/Users/dijunkun/crossdesk/apps/ios` 当前源码重新构建 Debug 模拟器应用，在独立的 iPhone 17 Pro / iOS 26.5 模拟器运行。原始截图为 1206 × 2622；`ios-native-device.webp` 从 Xcode Device Hub 的实际显示画面裁切，保留模拟器设备外框，只去除外侧背景。
- Android：使用 2026-10-18 22:15 构建的原生 Debug APK（`apps/android/app/build/outputs/apk/debug/app-debug.apk`），在独立的 Pixel 7 / Android 15（API 35、arm64）模拟器运行。原始截图为 1080 × 2400。`android-native-device.webp` 按 Android Studio 自带 Pixel 7 device art 的 `layout` 坐标合成，外框与相机遮罩来自 `device-art-resources/pixel_7/{back,mask}.webp`，没有生成手机外观。

设备图只做裁切、等比缩放、外框合成及轻微投影。这些是模拟器运行画面，不代表实机拍摄或远程连接性能验证；原有两端首页截图现已从页面预览中移除，保留素材文件用于归档。
