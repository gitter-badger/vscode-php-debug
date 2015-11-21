/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

import * as ee from 'events';

export class Message implements DebugProtocol.DBGMessage {
	seq: number;
	type: string;

	public constructor(type: string) {
		this.seq = 0;
		this.type = type;
	}
}

export class Response extends Message implements DebugProtocol.Response {
	request_seq: number;
	success: boolean;
	command: string;

	public constructor(request: DebugProtocol.Request, message?: string) {
		super('response');
		this.request_seq = request.seq;
		this.command = request.command;
		if (message) {
			this.success = false;
			(<any>this).message = message;
		} else {
			this.success = true;
		}
	}
}

export class Event extends Message implements DebugProtocol.Event {
	event: string;

	public constructor(event: string, body?: any) {
		super('event');
		this.event = event;
		if (body) {
			(<any>this).body = body;
		}
	}
}

export class DBGProtocol extends ee.EventEmitter {

	private static TIMEOUT = 3000;

	private _contentLength: number;
	private _bodyStartByteIndex: number;
	private _res: any;
	private _sequence: number;
	private _writableStream: NodeJS.WritableStream;
private _pendingRequests = new Map<number, DebugProtocol.Response>();

	constructor() {
		super();
	}

	protected start(inStream: NodeJS.ReadableStream, outStream: NodeJS.WritableStream): void {
		this._sequence = 1;
		this._writableStream = outStream;
		this._newRes(null);

		inStream.setEncoding('utf8');

		inStream.on('data', (data) => this._handleData(data));
		inStream.on('close', () => {
			this._emitEvent(new Event('close'));
		});
		inStream.on('error', (error) => {
			this._emitEvent(new Event('error'));
		});

		outStream.on('error', (error) => {
			this._emitEvent(new Event('error'));
		});

		inStream.resume();
	}

	public stop(): void {
		if (this._writableStream) {
			this._writableStream.end();
		}
	}

	protected send(command: string, args: any, timeout: number = DBGProtocol.TIMEOUT): Promise<DebugProtocol.Response> {
		return new Promise((completeDispatch, errorDispatch) => {
			this._sendRequest(command, args, timeout, (result: DebugProtocol.Response) => {
				if (result.success) {
					completeDispatch(result);
				} else {
					errorDispatch(result);
				}
			});
		});
	}

	public sendEvent(event: DebugProtocol.Event): void {
		this._send('event', event);
	}

	public sendResponse(response: DebugProtocol.Response): void {
		if (response.seq > 0) {
			console.error('attempt to send more than one response for command {0}', response.command);
		} else {
			this._send('response', response);
		}
	}

	// ---- protected ----------------------------------------------------------

	protected dispatchRequest(request: DebugProtocol.Request): void {
	}

	// ---- private ------------------------------------------------------------

	private _sendRequest(command: string, args: any, timeout: number, cb: (response: DebugProtocol.Response) => void): void {

		const request: any = {
			command: command
		};
		if (args && Object.keys(args).length > 0) {
			request.arguments = args;
		}

		this._send('request', request);

		if (cb) {
			this._pendingRequests[request.seq] = cb;

			const timer = setTimeout(() => {
				clearTimeout(timer);
				const clb = this._pendingRequests[request.seq];
				if (clb) {
					delete this._pendingRequests[request.seq];
					clb(new Response(request, 'timeout after ' + timeout + 'ms'));

					this._emitEvent(new Event('diagnostic', { reason: 'unresponsive ' + command }));
				}
			}, timeout);
		}
	}

	private _emitEvent(event: DebugProtocol.Event) {
		this.emit(event.event, event);
	}

	private _send(typ: string, message: string): void {
		if (message && this._writableStream) {
			this._writableStream.write(message);
		}
	}

	private _newRes(raw: string): void {
		this._res = {
			raw: raw || '',
			headers: {}
		};
	}

	private _handleData(d): void {
		var self = this;
		const res = this._res;
		res.raw += d;
		var parseString = require('xml2js').parseString;
		var xml = d.replace(/^[^<]+/, ''); // strip unwanted chars
		parseString(xml, function(err, result) {
			if (err !== null) {
				console.log(err);
			}
			if (result === null) {
				// Nothing to do
                return;
            }
			Object.keys(result).forEach(function(key) {
				switch (key) {
					case 'init':
						console.dir(result);
						// Respond to init
						/*
						self._dispatch(res.body);
						self._newRes(buf.slice(self._bodyStartByteIndex + self._contentLength).toString('utf8'));
						*/
						break;
					default:
						// do nothing
						break;
				}
			});
		});
	}

	private _dispatch(message: DebugProtocol.DBGMessage): void {
		switch (message.type) {
		case 'event':
			this._emitEvent(<DebugProtocol.Event> message);
			break;
		case 'response':
			const response = <DebugProtocol.Response> message;
			const clb = this._pendingRequests[response.request_seq];
			if (clb) {
				delete this._pendingRequests[response.request_seq];
				clb(response);
			}
			break;
		case 'request':
			this.dispatchRequest(<DebugProtocol.Request> message);
			break;
		default:
			break;
		}
	}
}
