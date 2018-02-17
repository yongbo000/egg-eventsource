# egg-eventsource

[![NPM version][npm-image]][npm-url]
[![build status][travis-image]][travis-url]
[![Test coverage][codecov-image]][codecov-url]
[![David deps][david-image]][david-url]
[![Known Vulnerabilities][snyk-image]][snyk-url]
[![npm download][download-image]][download-url]

[npm-image]: https://img.shields.io/npm/v/egg-eventsource.svg?style=flat-square
[npm-url]: https://npmjs.org/package/egg-eventsource
[travis-image]: https://img.shields.io/travis/yongbo000/egg-eventsource.svg?style=flat-square
[travis-url]: https://travis-ci.org/yongbo000/egg-eventsource
[codecov-image]: https://img.shields.io/codecov/c/github/yongbo000/egg-eventsource.svg?style=flat-square
[codecov-url]: https://codecov.io/github/yongbo000/egg-eventsource?branch=master
[david-image]: https://img.shields.io/david/yongbo000/egg-eventsource.svg?style=flat-square
[david-url]: https://david-dm.org/yongbo000/egg-eventsource
[snyk-image]: https://snyk.io/test/npm/egg-eventsource/badge.svg?style=flat-square
[snyk-url]: https://snyk.io/test/npm/egg-eventsource
[download-image]: https://img.shields.io/npm/dm/egg-eventsource.svg?style=flat-square
[download-url]: https://npmjs.org/package/egg-eventsource

## 开启插件

```js
// config/plugin.js
exports.eventsource = {
  enable: true,
  package: 'egg-eventsource',
};
```

## 使用场景

`client`

```js
// 接收服务器推送数据
const es = new EventSource('{base}/__eventsource');
es.on('message', (msgEvent) => {
  console.log(msgEvent.data);
});

es.on('customevent', (msgEvent) => {
  console.log(msgEvent.data);
});
```

`server`

```js
// broadcast向所有client推送数据
app.eventsource.broadcast('this is an test message'); // 默认message类型
app.eventsource.broadcast('customevent', 'this is an customevent message'); // 自定义接收类型
```

## 详细配置

请到 [config/config.default.js](config/config.default.js) 查看详细配置项说明。

## 提问交流

请到 [egg issues](https://github.com/yongbo000/egg/issues) 异步交流。

## License

[MIT](LICENSE)
