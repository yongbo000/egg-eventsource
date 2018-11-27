const uuidv4 = require('uuid/v4');

class EventStream {
  constructor(opts = {}) {
    this.clients = {};
    this.idGroups = {};
    this.heartbeat = opts.heartbeat || 2000;
    this.logger = opts.logger;
    this.defaultDataId = opts.defaultDataId;
    this.dataIdSeparator = opts.dataIdSeparator || '#';
    this.startHeartbeat();
  }

  get count() {
    return Object.keys(this.clients).length;
  }

  destroy() {
    Object.values(this.clients).forEach(client => {
      try {
        client.end();
      } catch (e) {
        this.logger.error(e);
      }
    });
    this.clients = null;
    this.idGroups = null;
    clearInterval(this.iTimer);
  }

  startHeartbeat() {
    this.iTimer = setInterval(() => {
      // 保持心跳
      this.broadcast((client, clientId) => {
        const data = JSON.stringify({ aliveClients: this.count, clientId, message: 'this is a heartbeat message' });
        client.write('event: heartbeat\n');
        client.write(`data: ${data}\n\n`);
      });
    }, this.heartbeat).unref();
  }

  deleteClient(clientId) {
    const client = this.clients[clientId];
    if (client) {
      // 从groups里删除
      const dataId = client.__eventsource_dataId;
      const ids = this.idGroups[dataId];
      if (ids) {
        const index = ids.indexOf(clientId);
        if (index !== -1) {
          ids.splice(index, 1);
        }
      }
      // 断开链接，并删除
      try {
        client.end();
      } catch (e) {
        this.logger.error(e);
      }
      delete this.clients[clientId];
    }
  }

  handler(ctx) {
    ctx.req.socket.setKeepAlive(true);
    ctx.set({
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'text/event-stream;charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      // While behind nginx, event stream should not be buffered:
      // http://nginx.org/docs/http/ngx_http_proxy_module.html#proxy_buffering
      'X-Accel-Buffering': 'no',
    });

    ctx.status = 200;
    ctx.respond = false;
    ctx.res.write('\n');

    const clientId = ctx.ip + '#' + uuidv4();
    const dataId = ctx.query.dataId || this.defaultDataId;
    const group = this.idGroups[dataId] || (this.idGroups[dataId] = []);
    if (group.indexOf(clientId) === -1) {
      group.push(clientId);
    }
    this.clients[clientId] = ctx.res;
    this.clients[clientId].__eventsource_dataId = dataId;

    ctx.logger.info('[egg-eventsource] there is a new client joined, clientId:%s, count:%s', clientId, this.count);
    const closeCallback = () => {
      this.deleteClient(clientId);
      ctx.logger.info('[egg-eventsource] client closed, clientId:%s, count:%s', clientId, this.count);
    };
    ctx.req.on('close', closeCallback);
    ctx.res.on('close', closeCallback);
  }

  broadcast(event, data) {
    let fn;
    if (typeof event === 'function') {
      fn = event;
    } else if (arguments.length === 1) {
      data = event;
      event = 'message';
    }

    let clientIds = [];
    const separator = this.dataIdSeparator;
    if (typeof event === 'string' && event.indexOf(separator) !== -1) {
      const sp = event.split(separator);
      event = sp[0];
      clientIds = this.idGroups[sp[1]];
    } else {
      // 默认空间下的clientId
      clientIds = this.idGroups[this.defaultDataId];
    }

    if (clientIds && clientIds.length) {
      for (const clientId of clientIds) {
        const client = this.clients[clientId];
        try {
          if (fn) {
            fn(client, clientId);
          } else {
            client.write(`event: ${event}\n`);
            client.write(`data: ${typeof data === 'string' ? data : JSON.stringify(data)}\n\n`);
          }
        } catch (e) {
          this.logger.info('clientId:%s, some exception happend, error: %j', clientId, e);
          // 发生异常的话，直接断开，等客户端自己发起重连
          this.deleteClient(clientId);
        }
      }
    }
  }
}

module.exports = EventStream;
