const EventSource = require('eventsource');
const assert = require('assert');
const mock = require('egg-mock');
const EventProxy = require('eventproxy');

const ep = new EventProxy();

describe('test/eventsource.test.js', () => {
  let app;
  before(done => {
    app = mock.app({
      baseDir: 'apps/eventsource',
    });
    app.ready(() => {
      done();
    });
  });

  after(() => app.close());
  afterEach(mock.restore);

  let client1;
  let client2;

  const msgQueue = [
    'this is a test message 1',
    'this is a test message 2',
    'this is a test message 3',
    JSON.stringify({ msg: 'this is a test message 4' }),
  ];
  const len = msgQueue.length;

  describe('path match /__eventsource', () => {
    beforeEach(() => {
      // hack的方式拿到server url
      const url = app.httpRequest().connect('/__eventsource').url;
      client1 = new EventSource(url);
      client2 = new EventSource(url);
    });

    it.only('should eventsource work well', done => {
      const msgQueue1 = Array.from(msgQueue);
      const msgQueue2 = Array.from(msgQueue);

      client1.on('heartbeat', msgEvent => {
        assert(msgEvent.type === 'heartbeat');
        const data = JSON.parse(msgEvent.data);
        assert(data.aliveClients === 2);
        assert(data.hasOwnProperty('clientId'));
        assert(data.message === 'this is a heartbeat message');
        ep.emit('client1_heartbeat_work');
      });

      client1.on('message', msgEvent => {
        assert(msgEvent.type === 'message');
        assert(msgEvent.data === msgQueue1.shift());
        ep.emit(`client1_message_${len - msgQueue1.length}_work`);
      });

      client2.on('heartbeat', msgEvent => {
        assert(msgEvent.type === 'heartbeat');
        const data = JSON.parse(msgEvent.data);
        assert(data.aliveClients === 2);
        assert(data.hasOwnProperty('clientId'));
        assert(data.message === 'this is a heartbeat message');
        ep.emit('client2_heartbeat_work');
      });

      client2.on('message', msgEvent => {
        assert(msgEvent.type === 'message');
        assert(msgEvent.data === msgQueue2.shift());
        ep.emit(`client2_message_${len - msgQueue2.length}_work`);
      });

      const evtList1 = [ 1, 2, 3, 4 ].map(v => `client1_message_${v}_work`);
      const evtList2 = [ 1, 2, 3, 4 ].map(v => `client2_message_${v}_work`);

      ep.all('client1_heartbeat_work', ...evtList1, () => {
        ep.emit('client1_done');
      });
      ep.all('client2_heartbeat_work', ...evtList2, () => {
        ep.emit('client2_done');
      });
      ep.all('client1_done', 'client2_done', done);

      client1.on('open', () => ep.emit('client1_open'));
      client2.on('open', () => ep.emit('client2_open'));
      ep.all('client1_open', 'client2_open', () => {
        app.eventsource.broadcast('message', 'this is a test message 1');
        app.eventsource.broadcast('this is a test message 2');
        app.eventsource.broadcast(client => {
          client.write('event: message\n');
          client.write('data: this is a test message 3\n\n');
        });
        app.eventsource.sendToAllWorkers('message', { msg: 'this is a test message 4' });
      });
    });
  });

  it('path not match /__eventsource', () => {
    return app
      .httpRequest()
      .get('/xxxx')
      .expect(404);
  });
});
