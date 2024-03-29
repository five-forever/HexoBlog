/*
 * @Author: Talos--1660327787@qq.com
 * @Date: 2023-12-30 19:00:37
 * @LastEditors: Talos--1660327787@qq.com
 * @LastEditTime: 2024-02-11 00:44:38
 * @FilePath: /PoolGame-Web/NetManager.js
 * @Description: 
 * 
 * Copyright (c) 2023 by five-forever, All Rights Reserved. 
 */
class NetManager {
    constructor(game) {
        // const ws = new WebSocket('wss://101.132.70.132:8080/ws')
        this.game = game
        const ws = new WebSocket('wss://talosworld.xyz/ws')

        ws.addEventListener('open', (evt)=>{
            console.log('socket已打开')
            ws.send('Hello,server!')
        })

        ws.addEventListener('message', (evt)=>{
            console.log('从服务器收到消息：', evt.data)
        })

        ws.addEventListener('close', (evt)=>{
            console.log('socket已关闭')
        })

        ws.addEventListener('error', (evt)=>{
            console.log('socket连接错误：', evt)
        })

        this.ws = ws

        window.addEventListener('beforeunload', ()=>{
            this.ws.close()
        })
    }
}

export { NetManager } 