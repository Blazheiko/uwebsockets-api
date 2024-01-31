import 'dotenv/config'
import configApp from "./config/app.js";
import * as server from "./start/server.js"
console.log({configApp})

server.init()


