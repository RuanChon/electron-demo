// 正式环境的插件
import type { Plugin } from "vue"
import * as electronBuilder from "electron-builder"
import fs from "node:fs"
import path from "node:path"

// electron 不认识 ts，需要先编译成 js
const buildBackground = () => {
  require("esbuild").buildSync({
    entryPoints: ["src/background.ts"],
    bundle: true,
    outfile: "dist/background.js",
    // platfrom: "node",
    target: "node12",
    external: ["electron"],
  })
}

// 打包需要等 vite 先打包完成再来 electron 打包
export const ElectronBuildPlugin = (): Plugin | any => {
  return {
    name: "electron-build",
    // 执行 vite/rollup 钩子, 在服务器关闭时被调用
    closeBundle() {
      buildBackground()
      // electron-builder 需要指定 package.json main 属性
      const packageJson = JSON.parse(fs.readFileSync("/package.json", "utf-8"))
      packageJson.main = "background.js"
      fs.writeFileSync("dist/package.json", JSON.stringify(packageJson, null, 4))
      // bug electron-builder 会下载垃圾文件，还下不动，解决这个bug
      fs.mkdirSync("dist/node_modules")

      // 打包配置
      electronBuilder.build({
        config: {
          directories: {
            output: path.resolve(process.cwd(), "release"),
            app: path.resolve(process.cwd(), "dist"),
          },
          files: ["**/*"],
          asar: true,
          appId: "chon.app",
          productName: "chon-electron-demo",
          nsis: {
            oneClick: false, // 取消一键安装
            allowToChangeInstallationDirectory: true, // 允许用户选择安装目录
          },
        },
      })
    },
  }
}
