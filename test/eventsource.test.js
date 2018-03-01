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
    'this is a test message 3',
    'this is a test message 2',
    'this is a test message 1',
  ];

  describe('path match /__eventsource', () => {
    beforeEach(() => {
      // hack的方式拿到server url
      const url = app.httpRequest().connect('/__eventsource').url;
      client1 = new EventSource(url);
      client2 = new EventSource(url);
    });

    it('should eventsource work well', done => {
      const msgQueue1 = Array.from(msgQueue);
      const msgQueue2 = Array.from(msgQueue);

      client1.on('heartbeat', msgEvent => {
        assert(msgEvent.type === 'heartbeat');
        const data = JSON.parse(msgEvent.data);
        assert(data.aliveClients === 2);
        assert(data.message === 'this is a heartbeat message');
        ep.emit('client1_heartbeat_work');
      });

      client1.on('message', msgEvent => {
        assert(msgEvent.type === 'message');
        assert(msgEvent.data === msgQueue1.pop());
        ep.emit('client1_message_work');
      });

      client2.on('heartbeat', msgEvent => {
        assert(msgEvent.type === 'heartbeat');
        const data = JSON.parse(msgEvent.data);
        assert(data.aliveClients === 2);
        assert(data.message === 'this is a heartbeat message');
        ep.emit('client2_heartbeat_work');
      });

      client2.on('message', msgEvent => {
        assert(msgEvent.type === 'message');
        assert(msgEvent.data === msgQueue2.pop());
        ep.emit('client2_message_work');
      });

      ep.all('client1_heartbeat_work', 'client1_message_work', () => {
        ep.emit('client1_done');
      });
      ep.all('client2_heartbeat_work', 'client2_message_work', () => {
        ep.emit('client2_done');
      });
      ep.all('client1_done', 'client2_done', done);

      client1.on('open', () => ep.emit('client1_open'));
      client2.on('open', () => ep.emit('client2_open'));
      ep.all('client1_open', 'client2_open', () => {
        app.eventsource.broadcast('this is a test message 1');
        app.eventsource.broadcast('message', 'this is a test message 2');
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
