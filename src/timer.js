'use strict';

class RequestTimer {
  constructor() {
    this._start = null;
    this._dns = null;
    this._connect = null;
    this._tls = null;
    this._response = null;
    this._firstByte = null;
    this._end = null;
  }

  start() { this._start = process.hrtime.bigint(); }
  onDNS() { this._dns = process.hrtime.bigint(); }
  onConnect() { this._connect = process.hrtime.bigint(); }
  onTLS() { this._tls = process.hrtime.bigint(); }
  onResponse() { this._response = process.hrtime.bigint(); }
  onData() { if (!this._firstByte) this._firstByte = process.hrtime.bigint(); }
  end() { this._end = process.hrtime.bigint(); }

  getTimings() {
    const ms = (a, b) => a && b ? Number(b - a) / 1e6 : 0;
    const s = this._start;
    return {
      dnsLookup: ms(s, this._dns),
      tcpConnection: ms(this._dns || s, this._connect),
      tlsHandshake: ms(this._connect, this._tls),
      serverProcessing: ms(this._tls || this._connect || s, this._response),
      contentTransfer: ms(this._response, this._end),
      total: ms(s, this._end),
      namelookup: ms(s, this._dns),
      connect: ms(s, this._connect),
      pretransfer: ms(s, this._tls || this._connect),
      starttransfer: ms(s, this._response),
    };
  }
}

module.exports = { RequestTimer };
