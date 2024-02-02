import 'dotenv/config'
import configApp from "./config/app.js"
import logger from './logger.js'
import * as server from "./start/server.js"

logger.info( configApp )
// console.log({ configApp })

server.init()


