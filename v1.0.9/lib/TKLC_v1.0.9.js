/*!
 * Version: TKLC_151119_v1.0.9
 * Date: 2015-11-19
 * Updates and docs at: https://github.com/Tastenkunst/TKLC
 *
 * Copyright (c) 2015, Tastenkunst GmbH. All rights reserved.
 *
 * Includes support for the following Local Connection APIs:
 * + postMessage
 * + postMessage bridge (for test embedding of LC ads in one html file )
 * + sessionStorage (works well, but Google does not allow it)
 * + FlashTalking talk Method (based on postMessage)
 * + FlashTalking Talk class (based on local storage)
 * + Adform (based on postMessage)
 * + IQ Digital (+ their postMessage Message Brigde)
 *
 * @author: Marcel Klammer, m.klammer@tastenkunst.com
 **/

/**
 * Adding a namespace for the library.
 */
var tklib = tklib || {};

(function() {
	"use strict";

	tklib.VERSION = "TKLC_151119_v1.0.9";

	/* GET params as Dictionary */
	tklib.PARAMS = (function() {
		var params = {};
		var query = window.location.search.substring(1);
		var paramsArray = query.split("&");
		for(var i = 0; i < paramsArray.length; i++) {
			var pair = paramsArray[i].split("=");
			var val = decodeURIComponent(pair[1]);
			if (val != "" && pair[0] != "") params[pair[0]] = val;
		}
		return params;
	})();

	/* Utility function to set a default value if no other value is given. */
	tklib.defaultValue = function (arg, val) {
		return typeof arg !== 'undefined' ? arg : val;
	};

	/*	Tracing communication can be confusing, if it's not clear which ad did what.
		That's why we add the DISPLAY_NAME in front of traces.

		Overwrite tklib.DISPLAY_NAME in your html before loading this script,
		otherwise it will read "ad". */
	tklib.DISPLAY_NAME = tklib.defaultValue(tklib.DISPLAY_NAME, "ad");
	tklib.trace = function(msg) {
		if(tklib.traceEnabled) {
			console.log(tklib.DISPLAY_NAME + " ::: " + msg);
		}
	};
	/*	Also make trace() available to the rest of javascript. */
	window.trace = tklib.trace;

	/*	The enviroment an ad is running on might be development, a live
		server or the local file system (e.g. if a project manager gets
		all ads of a campaign as a zip file, unzips and double clicks
		the index.html)

		If the ads were opened in the local file system, no Local Connection
		won't be used at all. The ads will simply start playing. The loading
		delay should be quite minimal, so a simple syncing won't be necessary
		in most cases. Please consider to upload your ads to a test server,
		eg. a Amazon AWS, and send those links to your clients for review.

		In a live environment we don't do any debugging, so traces (if not
		explicitely turned on with a GET param "trace=1") won't pollute the console.
		Also in live: the set Local Connection API will be used and won't be overwritten
		like it's the case in development.

		In a development environment we want to see what's going on, so traces are
		on on localhost and test servers (if not explicitely turned off with a
		GET param "trace=0"). Also in a development environment we use our
		own index.html files to test the ads. These html files include a
		postMessage bridge functionality to let the ads communicate with each
		other. So the Local Connection API will be overwritten with
	 	TKLocalConnection.API__POST_MESSAGE if tklib.ENV == tklib.ENV__DEVELOPMENT.

	 	To set your own test servers just overwrite tklib.ENV__TEST_HOSTS (Array of Strings)
	 	eg. ["localhost", "tmp5258.s3.amazonaws.com"] before loading this script.

	*/
	tklib.ENV__LIVE			= 0;
	tklib.ENV__DEVELOPMENT	= 1;
	tklib.ENV__FILE			= 2;
	tklib.ENV__NAMES		= ["live", "development", "file"];

	tklib.ENV__HOST			= window.location.host;
	tklib.ENV__TEST_HOSTS	= tklib.defaultValue(tklib.ENV__TEST_HOSTS, []);

	tklib.ENV				= tklib.defaultValue(tklib.ENV, null);
	if(tklib.ENV == null) {
		tklib.ENV = (function() {
			var env = tklib.ENV__LIVE;

			if (window.location.protocol == "file:") {
				env = tklib.ENV__FILE;
			} else {
				for (var i = 0, l = tklib.ENV__TEST_HOSTS.length; i < l; i++) {
					if (tklib.ENV__HOST.lastIndexOf(tklib.ENV__TEST_HOSTS[i], 0) === 0) {
						env = tklib.ENV__DEVELOPMENT;
						break;
					}
				}
			}

			return env;
		})();
	}

	// Enable traces only if we are in a development environment.
	// This assures that ads don't polute the console once deployed on the live ad server.
	tklib.traceEnabled = tklib.defaultValue(tklib.traceEnabled, false);
	tklib.traceEnabled = tklib.traceEnabled || (("trace" in tklib.PARAMS) ? tklib.PARAMS["trace"] : (tklib.ENV == tklib.ENV__DEVELOPMENT));
	tklib.trace("host: " + tklib.ENV__HOST + " env: " + tklib.ENV__NAMES[tklib.ENV] + " version: " + tklib.VERSION);

	/* A custom addEventListener that takes attachEvent into account. */
	tklib.addEventListener = function(win, event, handler) {
		if (typeof win.addEventListener !== "undefined") {
			win.addEventListener(event, handler, false);
		} else {
			if (typeof win.attachEvent !== "undefined") {
				win.attachEvent("on" + event, handler);
			} else {
				if (typeof win["on" + event] !== "undefined") {
					var currentFunction = win["on" + event];
					win["on" + event] = function(e) {
						currentFunction(e);
						handler(e);
					}
				}
			}
		}
	};
})();

(function() {
	"use strict";

	/*	TKLC - the Tastenkunst Local Connection class. */
	function TKLC() {

		this.name					= null;
		this.others					= null;
		this.othersConnectedStatus	= null;
		this.othersConnected		= false;
		this.initialized 			= false;
		this.validAPI	 			= false;
		this.isMaster				= false;

		this.api					= tklib.TKLC.API__NONE;

		// A connection API object eg. for Adform or FT
		this.connection				= null;

		// AdForm specific:
		this.adformChannel			= null;

		// set before init
		this.traceTestConnection 	= true;
		this.traceEventListeners	= true;
		this.forceAPI				= false;

		// listeners
		this._listeners = {};
	}

	TKLC.prototype.on = function(type, listener){
		if(typeof this._listeners[type] == "undefined") {
			this._listeners[type] = [];
		}
		this._listeners[type].push(listener);

		if(this.traceEventListeners) {
			tklib.trace("TKLC ::: on ::: event.type ::: " + type);
		}
	};

	TKLC.prototype.dispatch = function(event){
		if(typeof event == "string") {
			event = { type: event };
		}
		if(!event.target) {
			event.target = this;
		}

		if(!event.type) {
			throw new Error("TKLC ::: dispatch ::: event.type ::: ERROR ::: object missing 'type' property");
		}

		if(this._listeners[event.type] instanceof Array) {
			var listeners = this._listeners[event.type];
			var i = 0;
			var l = listeners.length;

			if(l > 0) {
				if(this.traceEventListeners) {
					tklib.trace("TKLC ::: dispatch ::: event.type ::: " + event.type);
				}
			}

			for(; i < l; i++){
				listeners[i].call(this, event);
			}
		}
	};

	TKLC.prototype.off = function(type, listener) {
		if(this.traceEventListeners) {
			tklib.trace("TKLC ::: off ::: event.type ::: " + type);
		}

		if(this._listeners[type] instanceof Array){
			var listeners = this._listeners[type];
			for (var i = 0, len = listeners.length; i < len; i++){
				if (listeners[i] === listener){
					listeners.splice(i, 1);
					break;
				}
			}
		}
	};

	TKLC.prototype.init = function(name, others, isMaster, api) {

		var _this = this;

		tklib.DISPLAY_NAME			= name;

		this.isMaster				= isMaster;
		this.name					= name;
		this.others					= others;
		this.othersConnectedStatus	= [];

		this.initialized			= false;
		this.validAPI				= false;

		var i = 0;
		var l = this.others.length;

		for(; i < l; i++) {
			this.othersConnectedStatus[i] = false;
		}

		this.othersConnected = false;

		if(!this.forceAPI) {
			if(tklib.ENV == tklib.ENV__FILE) {
				api = tklib.TKLC.API__NONE;
			} else if(tklib.ENV == tklib.ENV__DEVELOPMENT &&
					api != tklib.TKLC.API__NONE &&
					api != tklib.TKLC.API__POST_MESSAGE_BRIDGE) {
				api = tklib.TKLC.API__POST_MESSAGE;
			}
		}

		switch(api) {
			case tklib.TKLC.API__NONE:
			case tklib.TKLC.API__POST_MESSAGE_BRIDGE:
			case tklib.TKLC.API__POST_MESSAGE:
			case tklib.TKLC.API__FLASHTALKING_PM:
			case tklib.TKLC.API__FLASHTALKING_LS:
			case tklib.TKLC.API__ADFORM:
			case tklib.TKLC.API__IQ_DIGITAL:
				this.api = api;
				break;
			case tklib.TKLC.API__SESSION_STORAGE:
				tklib.trace("TKLC ::: init ::: API ::: Session Storage is not permitted on DoubleClick, don't use it there.");
				this.api = api;
				break;
		}

		tklib.trace("TKLC ::: init ::: API ::: " + tklib.TKLC.API__NAMES[this.api] + " ::: isMaster ::: " + this.isMaster);

		switch (this.api) {
			case tklib.TKLC.API__SESSION_STORAGE:
				tklib.addEventListener(window, ["s","t","o","r","a","g","e"].join(""), function(event) {
					_this.handleMessage(event.key);
				});
				_this.initialized = true;
				_this.validAPI = true;
				break;
			case tklib.TKLC.API__POST_MESSAGE:
			case tklib.TKLC.API__POST_MESSAGE_BRIDGE:
				tklib.addEventListener(window, "message", function(messageEvent) {
					_this.handleMessage(messageEvent.data);
				});
				_this.initialized = true;
				_this.validAPI = true;
				break;
			case tklib.TKLC.API__FLASHTALKING_PM:
				_this.connection = myFT;
				_this.connection.on("talk", function(talkEvent) {
					_this.handleMessage(talkEvent.msg);
				});
				_this.initialized = true;
				_this.validAPI = true;
				break;
			case tklib.TKLC.API__FLASHTALKING_LS:
				myFT.require([ 'talk' ], function (talk) {
					talk.on('linkready', function () {
						_this.connection = talk;
						_this.initialized = true;
					});
					talk.on('message', function (msg, source) {
						_this.handleMessage(msg);
					});
				});
				_this.validAPI = true;
				break;
			case tklib.TKLC.API__ADFORM:
				_this.connection = dhtml.connect(this.adformChannel);
				_this.connection.on("tklc_msg", function(msg) {
					_this.handleMessage(msg);
				});
				_this.initialized = true;
				_this.validAPI = true;
				break;
			case tklib.TKLC.API__IQ_DIGITAL:
				tklib.iqdNS = {};
				tklib.iqdNS.postOrigin = (function() {
					var origin = ("iqdurl" in tklib.PARAMS) ? tklib.PARAMS["iqdurl"] : "*";
					return decodeURIComponent(origin.toLowerCase());
				})();
				tklib.addEventListener(window, "message", function(messageEvent) {
					_this.handleMessage(messageEvent.data);
				});
				_this.initialized = true;
				_this.validAPI = true;
				break;
		}

		_this.checkInitialized(_this);
	};

	TKLC.checkInitializedId = -1;
	TKLC.prototype.checkInitialized = function(lc) {
		var _this = lc;
		clearTimeout(TKLC.checkInitializedId);
		if(!_this.validAPI) {
			_this.dispatch(tklib.TKLC.EVENT__START_WITHOUT_LC);
		} else {

			if(!_this.initialized) {
				TKLC.checkInitializedId = setTimeout(_this.checkInitialized.bind(_this), 250, _this);
			} else {
				if(_this.isMaster) {
					_this.sendTestConnection(_this);
				} else {
					_this.dispatch(tklib.TKLC.EVENT__START_WITH_LC);
				}
			}
		}
	};

	TKLC.sendTestConnectionId = -1;
	TKLC.prototype.sendTestConnection = function(lc) {

		var _this = lc;

		clearTimeout(TKLC.sendTestConnectionId);
		TKLC.sendTestConnectionId = setTimeout(_this.sendTestConnection.bind(_this), 250, _this);

		var i = 0;
		var l = _this.others.length;

		for(; i < l; i++) {
			_this.sendMessage("TEST_CONNECTION__" + _this.others[i], "");
		}
	};

	TKLC.prototype.sendMessage = function(event, msgData) {
		if (this.api != tklib.TKLC.API__POST_MESSAGE_BRIDGE) {
			if(!(event.lastIndexOf("TEST_CONNECTION_", 0) === 0 && !this.traceTestConnection)) {
				tklib.trace("TKLC ::: sendMessage ::: event ::: " + event + " ::: msgData ::: " + msgData);
			}
		} else {
			if(!(event.lastIndexOf("TEST_CONNECTION_", 0) === 0 && !this.traceTestConnection)) {
				tklib.trace("TKLC ::: sendMessage (bridge) ::: event ::: " + event + " ::: msgData ::: " + msgData);
			}
		}

		var i = 0;
		var l = this.others.length;

		switch (this.api) {
			case tklib.TKLC.API__SESSION_STORAGE:
				// Deprecated, because Google doesn't allow it.
				// Use PostMessage instead.
				var s = ["s","e","s","s","i","o","n","S","t","o","r","a","g","e"].join("");
				window[s].clear();
				window[s].setItem(event, msgData);
				break;
			case tklib.TKLC.API__POST_MESSAGE_BRIDGE:
				for(; i < l; i++) {
					document.getElementById(this.others[i]).contentWindow.postMessage(event, '*');
				}
				break;
			case tklib.TKLC.API__POST_MESSAGE:
				window.parent.postMessage(event, "*");
				break;
			case tklib.TKLC.API__FLASHTALKING_PM:
				if(this.connection) {
					for (; i < l; i++) {
						this.connection.talk(this.others[i], event);
					}
				}
				break;
			case tklib.TKLC.API__FLASHTALKING_LS:
				if(this.connection) {
					this.connection.send(event);
				}
				break;
			case tklib.TKLC.API__ADFORM:
				if(this.connection) {
					this.connection.emit("tklc_msg", event);
				}
				break;
			case tklib.TKLC.API__IQ_DIGITAL:
				tklib.trace("TKLC ::: sendMessage ::: postOrigin :::  " + tklib.iqdNS.postOrigin);
				window.parent.postMessage(event, tklib.iqdNS.postOrigin);
				break;
		}

		if(tklib.TKLC.API__DISPATCH_FOR_SENDER[this.api]) {
			this.handleMessage(event);
		}
	};

	TKLC.prototype.handleMessage = function(key) {

		if(key == null) {
			return;
		}

		if(this.api == tklib.TKLC.API__POST_MESSAGE_BRIDGE) {
			this.sendMessage(key);
			return;
		}

		if(key.lastIndexOf("TEST_CONNECTION__", 0) === 0) {
			if(key == "TEST_CONNECTION__" + this.name) {
				if(this.traceTestConnection) {
					tklib.trace("TKLC ::: handleMessage ::: key ::: " + key);
				}
				this.sendMessage("TEST_CONNECTION_SUCCESS__" + this.name);
			}
		} else if((key.lastIndexOf("TEST_CONNECTION_SUCCESS__", 0) === 0)) {

			if(this.isMaster && !this.othersConnected) {

				if(this.traceTestConnection) {
					tklib.trace("TKLC ::: handleMessage ::: key ::: " + key);
				}

				var succeededId = key.substr("TEST_CONNECTION_SUCCESS__".length);
				var indexSuccededId = this.others.indexOf(succeededId);

				if(indexSuccededId >= 0) {
					this.othersConnectedStatus[indexSuccededId] = true;
				}

				var i = 0;
				var l = this.othersConnectedStatus.length;
				var allAdsConnected = true;

				for(; i < l; i++) {
					if(!this.othersConnectedStatus[i]) {
						allAdsConnected = false;
					}
				}

				if(allAdsConnected) {
					if(this.traceTestConnection) {
						tklib.trace("TKLC ::: othersConnected");
					}
					this.othersConnected = true;
					clearTimeout(TKLC.sendTestConnectionId);
					this.dispatch(tklib.TKLC.EVENT__START_WITH_LC);
				}
			}
		} else {
			tklib.trace("TKLC ::: handleMessage ::: key ::: " + key);
			this.dispatch(key);
		}
	};

	tklib.TKLC = TKLC;

	/*	Apis and their names. */
	tklib.TKLC.API__NONE				= 0;
	tklib.TKLC.API__POST_MESSAGE_BRIDGE	= 1;
	tklib.TKLC.API__SESSION_STORAGE		= 2;
	tklib.TKLC.API__POST_MESSAGE		= 3;
	tklib.TKLC.API__FLASHTALKING_PM		= 4;
	tklib.TKLC.API__FLASHTALKING_LS		= 5;
	tklib.TKLC.API__ADFORM				= 6;
	tklib.TKLC.API__IQ_DIGITAL			= 7;
	tklib.TKLC.API__NAMES				= [
		"none",
		"postMessage bridge for local testing",
		"session storage",
		"postMessage",
		"FlashTalking (postMessage)",
		"FlashTalking (storage)",
		"Adform",
		"IQ Digital"
	];
	tklib.TKLC.API__DISPATCH_FOR_SENDER	= [
		0, //"none",
		0, //postMessage bridge for local testing",
		1, //"session storage",
		0, //"postMessage",
		1, //"FlashTalking (postMessage)",
		1, //"FlashTalking (storage)",
		0, //"Adform",
		0  //"IQ Digital"
	];

	/*	Dispatched events for starting the ads with or without the Local Connection functionality. */
	tklib.TKLC.EVENT__START_WITH_LC		= "EVENT__START_WITH_LC";
	tklib.TKLC.EVENT__START_WITHOUT_LC	= "EVENT__START_WITHOUT_LC";

})();