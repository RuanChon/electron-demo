// 开发环境的插件, 主要为了在启动 dev 时顺便把 electron 跑起来，不用多开一个 shell 了
import type { Plugin } from "vue"
import type { AddressInfo } from "net"
import type { ViteDevServer } from "vite"
import { spawn } from "child_process" // 子进程
import fs from "node:fs"

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

// Plugin 类型报错是因为 vite 插件要求导出是一个对象并包含 name 属性
export const ElectronDevPlugin = (): Plugin | any => {
  return {
    name: "electron-dev",
    // 执行 vite 钩子，用于配置开发服务器的钩子。最常见的用例是在内部 connect 应用程序中添加自定义中间件
    configureServer(server: ViteDevServer) {
      buildBackground()
      server?.httpServer?.once("listening", () => {
        // 读取 vite 服务的信息
        const addressInfo: AddressInfo = server?.httpServer?.address() as AddressInfo
        // 拼接IP地址，给 electron 启动服务用的
        const IP = `http://localhost:${addressInfo.port}`
        // console.log("监听地址为", IP)
        // 启动 electron，第一个参数是 electron的入口文件，第二个参数就是 background 主进程配置
        // 注意 electron 不认识 ts，需要先编译成 js
        let ElectronProcess = spawn(require("electron"), ["dist/background.js", IP])
        fs.watchFile("src/background.ts", () => {
          ElectronProcess.kill()
          buildBackground()
          ElectronProcess = spawn(require("electron"), ["dist/background.js", IP])
        })
        ElectronProcess.stderr.on("data", data => {
          console.log("监听日志", data)
        })
      })
    },
  }
}
