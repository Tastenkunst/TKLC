/*!
 * Version: TKLC_151129_v1.1.0
 * Date: 2015-11-29
 * Docs, examples, updates at: https://github.com/Tastenkunst/TKLC
 *
 * Copyright (c) 2015, Tastenkunst GmbH. All rights reserved.
 *
 * Includes support for the following Local Connection APIs:
 * + postMessage
 * + postMessage bridge (for test embedding of LC ads in one html file )
 * + sessionStorage (not allowed on all Google Ad platforms, will also fail with Third-Party-Cookies disabled in browser settings)
 * + DirectMessage (TKLC implementation of direct javascript access of same origin iframes)
 * + FlashTalking talk Method (based on postMessage)
 * + FlashTalking Talk class (based on a DirectMessage approach)
 * + Adform (based on postMessage)
 * + IQ Digital (+ their postMessage Message Bridge)
 *
 * @author: Marcel Klammer, m.klammer@tastenkunst.com
 **/

/**
 * Always refer to the examples on github for the implementation details.
 * Happy coding!
 * Cheers
 * Marcel
 */

/**
 * Adding a namespace for this library, so we don't pollute the window object.
 * The name must be tklib for DirectMessage to work properly.
 *
 * You should create this object in your html js before loading the actual script
 * and set some default vars to make your development time easier, like this:
 *
 * var tklib = {};
 * tklib.traceEnabled = true;
 * tklib.DISPLAY_NAME = "728x90";
 * tklib.ENV__TEST_HOSTS = ["localhost", "tmp5258.s3.amazonaws.com"]; //tmp5258... TK's AWS Preview Link server.
 *
 * traces to the console are disabled in live environments by default.
 * Setting tklib.traceEnabled true will disable that behaviour (eg. you upload your ads to FlashTalking
 * and want to debug yout Local Connection functions in that "live" environment).
 *
 * Setting tklib.DISPLAY_NAME before loading the script will prevent the first few traces to read: ad ::: ...
 *
 * tklib.ENV__TEST_HOSTS should include your development/local and online testing hosts.
 * On those hosts DirectMessage will be used as LC api. This is useful for eg. testing FlashTalking ads
 * locally, you don't need to upload the ads to test the LC functionality.
 */
var tklib = tklib || {};

/**
 * The TK_Utils.js portion of the library. This adds a trace method and checks the environment.
 */
(function() {
	"use strict";

	tklib.VERSION = "TKLC_151129_v1.1.0";

	/** GET params as Dictionary */
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

	/** Utility function to set a default value if no other value is given. */
	tklib.defaultValue = function (arg, val) {
		return typeof arg !== 'undefined' ? arg : val;
	};

	/** Retrieves a property of an object or null, if the property can't be read. */
	tklib.getProperty = function(object, property) {
		try { return object[property]; } catch (e) { return null; }
	};

	/**
	 * Tracing communication can be confusing, if it's not clear which ad did what.
	 * That's why we add the DISPLAY_NAME in front of traces.
	 *
	 * Overwrite tklib.DISPLAY_NAME in your html before loading this script,
	 * otherwise it will read "ad ::: ...".
	 */
	tklib.DISPLAY_NAME = tklib.defaultValue(tklib.DISPLAY_NAME, "ad");
	tklib.trace = function(msg, error) {
		if(tklib.traceEnabled) {
			if(error) {	console.error(tklib.DISPLAY_NAME + " ::: " + msg); }
			else {		console.log(  tklib.DISPLAY_NAME + " ::: " + msg); }
		}
	};

	/** Also make trace() available to the rest of javascript. */
	window.trace = tklib.trace;

	/**
	 * The environment an ad is running on might be development, a live server or
	 * the local file system (e.g. if a project manager gets all ads of a campaign
	 * as a zip file, unzips and double clicks the index.html)
	 *
	 * If the ads were opened in the local file system, no Local Connection
	 * will be used at all. The ads will simply start playing. The loading
	 * delay should be quite minimal, so syncing won't be necessary in most cases.
	 * Please consider to upload your ads to a test server, eg. an Amazon AWS,
	 * and send those links to your clients for review.
	 *
	 * In a live environment we usually don't do any debugging, so traces (if not
	 * explicitly turned on by a GET param "trace=1") won't pollute the console.
	 * Also in live: the API won't be overwritten like it's the case in development.
	 *
	 * In a development environment we want to see what's going on, so traces are on
	 * on localhost and test servers (if not explicitely turned off with a GET param "trace=0").
	 * Also in a development environment we use our own index.html files to test the ads.
	 * The API will be overwritten by tklib.TKLC.API__DIRECT_MESSAGE if tklib.ENV == tklib.ENV__DEVELOPMENT.
	 * So you don't need to care about handling postMessage bridges etc.
	 *
	 * To set your own test servers just overwrite tklib.ENV__TEST_HOSTS (Array of Strings)
	 * eg. ["localhost", "tmp5258.s3.amazonaws.com"] before loading this script.
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

	/**
	 * Enable traces only if we are in a development environment.
	 * This assures that ads don't pollute the console once deployed on the live ad server.
	 */
	tklib.traceEnabled = tklib.defaultValue(tklib.traceEnabled, false);
	tklib.traceEnabled = tklib.traceEnabled || (("trace" in tklib.PARAMS) ? tklib.PARAMS["trace"] : (tklib.ENV == tklib.ENV__DEVELOPMENT));
	tklib.trace("host: " + tklib.ENV__HOST + " env: " + tklib.ENV__NAMES[tklib.ENV] + " version: " + tklib.VERSION);

	/**
	 * A custom addEventListener that takes IE's attachEvent into account.
	 */
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

/**
 * The TKLC.js portion of the library.
 */
(function() {
	"use strict";

	/**
	 * The Tastenkunst Local Connection class.
	 *
	 * Find the supported APIs at the end of this document.
	 * The constructor doesn't do much. init() does all the work.
	 * @constructor
	 */
	function TKLC() {

		this.name					= null;
		this.others					= null;
		this.othersConnectedStatus	= null;
		this.othersConnected		= false;
		this.isInitialized 			= false;

		this.api					= tklib.TKLC.API__NONE;
		this.isValidAPI	 			= false;
		this.isMaster				= false;

		// A connection API object eg. for Adform or FT
		this.connection				= null;

		// set these before init

		// false hides test connection traces
		this.traceTestConnection 	= true;
		// false hides event listener traces
		this.traceEventListeners	= true;
		// true prevents overwriting the api in a development environment
		this.forceAPI				= false;
		// false prevents rewriting document.domain
		this.rewriteDomain			= true;
		// delay of startup once all is ready in milliseconds
		this.initialSyncDelay		= 500;
		// delay after which a LC automatically failed to init
		// and the ad starts without LC
		this.initFailedDelay		= 10000;

		// internal stuff

		// event listeners
		this._listeners = {};

		// direct message handler references
		this._directMessageObjects	= [];
		this._strings				= null;
		this._masterContactedSlave	= false;

		// AdForm specific channel
		this.adformChannel			= null;
	}
	// Immediately setting the timestamp on script load for failed init checking.
	TKLC._timestamp = (new Date()).getTime();

	/**
	 * Initializes the Local Connection. Either dispatches
	 *
	 * tklib.TKLC.EVENT__START_WITH_LC (if init was successful)
	 * tklib.TKLC.EVENT__START_WITHOUT_LC (if init failed)
	 *
	 * For a wallpaper (two ad elements/iframes) this could look like this:
	 *
	 * ad 1 (eg. a 728x90 leaderboard) shall be the master:
	 * tklib.tklc.init("728x90", ["200x600"], true, tklib.TKLC.API__DIRECT_MESSAGE);
	 *
	 * ad 2 (eg. a 200x600 skyscraper) shall be a slave:
	 * tklib.tklc.init("200x600", ["728x90"], false, tklib.TKLC.API__DIRECT_MESSAGE);
	 *
	 * Both ads need to use the same api and only one element must be the master that
	 * checks whether all slaves are available.
	 *
	 * Before calling this function you might want to add the event listeners and
	 * set default values, e.g.:
	 *
	 * // true prevents overwriting the api in a development environment
	 * tklib.tklc.forceAPI = true;
	 * // false hides test connection traces
	 * this.traceTestConnection = false;
	 * // false hides event listener traces
	 * this.traceEventListeners	= false;
	 * // false prevents rewriting document.domain
	 * this.rewriteDomain = false;
	 *
	 * @param name - The name of this ad.
	 * @param others - The names of all other ads
	 * @param isMaster - Whether or not this ad shall be the master
	 * @param api - one of the tklib.TKLC.API__ apis
	 */
	TKLC.prototype.init = function(name, others, isMaster, api) {

		var _this = this;

		/**
		 * This is the name the DirectMessage api will look for in foreign iframes.
		 */
		TKLC["tklc_" + name]			= this;

		tklib.DISPLAY_NAME				= name;

		this.isMaster					= isMaster;
		this.name						= name;
		this.others						= others;
		this.othersConnectedStatus		= [];

		this.isInitialized				= false;
		this.isValidAPI					= false;
		this._masterContactedSlave		= false;

		/**
		 * session storage is not allowed on any Google Ad Platform. To prevent a
		 * failed upload, even if you don't use this api, we need to hide that it's
		 * even possible to use it. So it's up to you as a developer to not use
		 * session storage on any Google Ad Platform.
		 */
		this._strings					= [
			["s","t","o","r","a","g","e"].join(""),
			["s","e","s","s","i","o","n","S","t","o","r","a","g","e"].join(""),
			"message"
		];

		var i = 0;
		var l = this.others.length;

		for(; i < l; i++) {
			this.othersConnectedStatus[i] = false;
		}

		this.othersConnected = false;

		/**
		 * Rewriting (or shorten) the current document.domain used by the browser to perform
		 * the same origin check might help to establish communication between ads.
		 *
		 * See this example:
		 *
		 * ad1 document.domain: s0.cdn.example.com
		 * ad2 document.domain: s1.cdn.example.com
		 *
		 * Both ads technically reside on the same domain, but the same origin check
		 * would fail, since it takes into account:
		 *
		 * window.location.protocol
		 * window.location.port
		 * document.domain
		 *
		 * Shorten the document.domain property of our iframe will help to
		 * pass the same origin check. New values of document.domain can't be
		 * TLDs, this fails in a SecurityError. So we start by trying this:
		 *
		 * document.domain = "example.com" which eg. fails for
		 *
		 * https://xxxxxxxxxxxxxx.cloudfront.net (where cloudfront.net is a TLD), but works for
		 * https://tastenkunst.s3.amazonaws.com (where s3.amazonaws.com is a TLD)
		 *
		 * If it fails, we add another part etc. trying to make it as short
		 * as the browser or DNS settings will allow us.
		 *
		 * For our example the new values would be:
		 *
		 * ad1 document.domain: cdn.example.com (missing s0)
		 * ad2 document.domain: cdn.example.com (missing s1)
		 *
		 * This will give access to the other iframe's javascript
		 * as the same origin check wouldn't fail anymore.
		 *
		 * You can turn this behaviour off by setting:
		 *
		 * tklib.tklc.rewriteDomain = false;
		 *
		 * before calling tklib.tklc.init(...);
		 *
		 * session storage might not work, if document.domain was changed.
		 */
		if(this.rewriteDomain) {
			var domain = document.domain;

			tklib.trace("same origin check domain: " + domain);

			if(domain) {

				var splitted = domain.split(".");
				i = splitted.length;

				var newDomain = "";

				//Rewriting only makes sense for subdomains
				if(i > 2) {
					newDomain = splitted[--i];

					//Rewriting to the same domain makes no sense, so: i > 1
					while(i > 1) {
						newDomain = splitted[--i] + "." + newDomain;

						try {
							document.domain = newDomain;
							tklib.trace("Rewrite succeeded: " + newDomain);
							break;
						} catch(e) {
							tklib.trace("Rewrite failed: " + newDomain + " " + e);
						}
					}
				}
			}
		}

		// In a file or development environment we overwrite the set api
		// unless forceAPI is set to true.
		if(!this.forceAPI) {
			if(tklib.ENV == tklib.ENV__FILE) {
				api = tklib.TKLC.API__NONE;
			} else if(tklib.ENV == tklib.ENV__DEVELOPMENT &&
					api != tklib.TKLC.API__NONE &&
					api != tklib.TKLC.API__POST_MESSAGE_BRIDGE) {
				// Using DirectMessage on development hosts.
				api = tklib.TKLC.API__DIRECT_MESSAGE;
			}
		}

		switch(api) {
			case tklib.TKLC.API__NONE:
			case tklib.TKLC.API__POST_MESSAGE_BRIDGE:
			case tklib.TKLC.API__POST_MESSAGE:
			case tklib.TKLC.API__DIRECT_MESSAGE:
			case tklib.TKLC.API__FLASHTALKING_PM:
			case tklib.TKLC.API__FLASHTALKING_DM:
			case tklib.TKLC.API__ADFORM:
			case tklib.TKLC.API__IQ_DIGITAL:
				this.api = api;
				break;
			case tklib.TKLC.API__SESSION_STORAGE:
				tklib.trace("TKLC ::: init ::: API ::: Session Storage is not allowed on any Google Ad Platforms (e.g. DoubleClick), don't use it there!");
				this.api = api;
				break;
		}

		tklib.trace("TKLC ::: init ::: API ::: " + tklib.TKLC.API__NAMES[this.api] + " ::: isMaster ::: " + this.isMaster);

		// Setting up the Listeners for the chosen API.
		switch (this.api) {
			case tklib.TKLC.API__SESSION_STORAGE:
				/**
				 * This call might fail when Third-Party-Cookies are not allowed by the users browser settings.
				 * So we can't initialize the LC with this API and need to start the ads without LC.
				 *
				 * Btw. We don't recommend using session storage because of this possible failure.
				 */
				try {
					window[_this._strings[1]].clear();
					tklib.addEventListener(window, _this._strings[0], function(event) {
						_this.handleMessage(event.key);
					});
					_this.isInitialized = true;
					_this.isValidAPI = true;
				} catch(e) {
					tklib.trace("Can't init LC with api: " + tklib.TKLC.API__NAMES[this.api] + " starting without LC.", true);
				}
				break;
			case tklib.TKLC.API__POST_MESSAGE_BRIDGE:
				this._masterContactedSlave = true;
			case tklib.TKLC.API__POST_MESSAGE:
				tklib.addEventListener(window, this._strings[2], function(messageEvent) {
					_this.handleMessage(messageEvent.data);
				});
				_this.isInitialized = true;
				_this.isValidAPI = true;
				break;
			case tklib.TKLC.API__DIRECT_MESSAGE:
				_this.isValidAPI = true;
				if(_this.isMaster) {
					_this.connectDirectMessage(_this, window.top);
				}
				break;
			case tklib.TKLC.API__FLASHTALKING_PM:
				_this.connection = myFT;
				_this.connection.on("talk", function(talkEvent) {
					_this.handleMessage(talkEvent.msg);
				});
				_this.isInitialized = true;
				_this.isValidAPI = true;
				break;
			case tklib.TKLC.API__FLASHTALKING_DM:
				myFT.require([ 'talk' ], function (talk) {
					talk.on('linkready', function () {
						_this.connection = talk;
						_this.isInitialized = true;
					});
					talk.on('message', function (msg, source) {
						_this.handleMessage(msg);
					});
				});
				_this.isValidAPI = true;
				break;
			case tklib.TKLC.API__ADFORM:
				_this.connection = dhtml.connect(this.adformChannel);
				_this.connection.on("tklc_msg", function(msg) {
					_this.handleMessage(msg);
				});
				_this.isInitialized = true;
				_this.isValidAPI = true;
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
				_this.isInitialized = true;
				_this.isValidAPI = true;
				break;
		}

		if(!_this.isValidAPI) {
			// If the API is not valid, we start the ads without LC.
			_this.api = tklib.TKLC.API__NONE;
		}

		// Some APIs are not initialized immediately. So we perform
		// a check whether all ads are set up every 250 ms.
		_this.checkInitialized(_this);
	};

	/**
	 * Sends a message to all other LC ads and dispatches that message to
	 * itself, if sending the message does not include this ad.
	 *
	 * All ads are able to send messages to all other ads given in the array,
	 * that you put into init();
	 *
	 * @param event - the message that shall be send to the other ads
	 * @param msgData - not used, maybe used later
	 */
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

		// This is how the different APIs send messages.
		switch (this.api) {
			case tklib.TKLC.API__SESSION_STORAGE:
				/**
				 * This call might fail when Third-Party-Cookies are not allowed by the users browser settings.
				 * LC should not have been started with this api, if these calls would fail.
				 */
				try {
					window[this._strings[1]].clear();
					window[this._strings[1]].setItem(event, msgData);
				} catch(e) {
					tklib.trace("Failed sending message using api: " + tklib.TKLC.API__NAMES[this.api], true);
				}
				break;
			case tklib.TKLC.API__POST_MESSAGE_BRIDGE:
				for(; i < l; i++) {
					document.getElementById(this.others[i]).contentWindow.postMessage(event, '*');
				}
				break;
			case tklib.TKLC.API__POST_MESSAGE:
				window.parent.postMessage(event, "*");
				break;
			case tklib.TKLC.API__DIRECT_MESSAGE:
				if(this._directMessageObjects && this._directMessageObjects.length > 0) {
					for(i = 0, l = this._directMessageObjects.length; i < l; i++) {
						setTimeout(
							function(_tklc) {
								if(_tklc && _tklc.handleMessage) {
									_tklc.handleMessage(event);
								}
							}, 0, this._directMessageObjects[i]
						);
					}
				}
				break;
			case tklib.TKLC.API__FLASHTALKING_PM:
				if(this.connection) {
					for (i = 0, l = this.others.length; i < l; i++) {
						this.connection.talk(this.others[i], event);
					}
				}
				break;
			case tklib.TKLC.API__FLASHTALKING_DM:
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

		// Some APIs don't send the messages to the sending ad again.
		// So we need to dispatch the message to the sending ad.
		// See tklib.TKLC.API__DISPATCH_FOR_SENDER at the end of this document.
		if(tklib.TKLC.API__DISPATCH_FOR_SENDER[this.api]) {
			this.handleMessage(event);
		}
	};

	/**
	 * This method handles all incoming messages.
	 *
	 * This might be test messages to establish the actual connections.
	 * Or this might be developer generated messages for syncing ads.
	 * The developer generated messages will be dispatched to your ad,
	 * just add listeners for those messages before calling init();
	 *
	 * @param key - the received message
	 */
	TKLC.prototype.handleMessage = function(key) {

		if(key == null) {
			return;
		}

		if(this.api == tklib.TKLC.API__POST_MESSAGE_BRIDGE) {
			// A bridge just relays messages.
			this.sendMessage(key);
			return;
		}

		if(key.lastIndexOf("TEST_CONNECTION__", 0) === 0) {
			if(key == "TEST_CONNECTION__" + this.name) {
				if(this.traceTestConnection) {
					tklib.trace("TKLC ::: handleMessage ::: key ::: " + key);
				}
				// Master is contacting this ad. The Slave will tell
				// the master that it is ready so connect.
				// It's also save now to remove the fail check and start
				// with LC support.
				if(!this._masterContactedSlave) {
					this._masterContactedSlave = true;
					this.checkInitialized(this);
				}
				this.sendMessage("TEST_CONNECTION_SUCCESS__" + this.name);
			}
		} else if((key.lastIndexOf("TEST_CONNECTION_SUCCESS__", 0) === 0)) {

			// Still looking for slaves. And one of them just pinged.
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
						break;
					}
				}

				if(allAdsConnected) {
					if(this.traceTestConnection) {
						tklib.trace("TKLC ::: othersConnected");
					}
					this.othersConnected = true;
					clearTimeout(TKLC.sendTestConnectionId);
					var _this = this;
					setTimeout(function(){ _this.startWithLC() }, _this.initialSyncDelay);
				}
			}
		} else {
			tklib.trace("TKLC ::: handleMessage ::: key ::: " + key);
			this.dispatch(key);
		}
	};

	/**
	 * Checks whether the init process was successful.
	 *
	 * If it was, it dispatches:
	 * tklib.TKLC.EVENT__START_WITH_LC
	 *
	 * if not it dispatches:
	 * tklib.TKLC.EVENT__START_WITHOUT_LC
	 *
	 * Some APIs are not initialized immediately. So we perform
	 * a check whether all ads are set up every 250 ms.
	 */
	TKLC.checkInitializedId = -1;
	TKLC.prototype.checkInitialized = function(lc) {

		var _this = lc;
		clearTimeout(TKLC.checkInitializedId);

		if(_this.checkInitFailed()) {
			tklib.trace("checkInitialized failed", true);
			_this.startWithoutLC();
			return;
		}

		if(!_this.isValidAPI) {
			tklib.trace("API not valid: set to NONE.");
			_this.startWithoutLC();
		} else {

			if(!_this.isInitialized) {
				// LC not initialized yet. Waiting for this to happen.
				TKLC.checkInitializedId = setTimeout(_this.checkInitialized.bind(_this), 250, _this);
			} else {
				// LC initialized.
				if(_this.isMaster) {
					// Ad is Master, start sending out pings to slaves.
					TKLC.sendTestConnectionId = setTimeout(_this.sendTestConnection.bind(_this), 50, _this);
				} else {
					// Ad is slave.
					if(this._masterContactedSlave) {
						// Master finally pinged this slave.
						_this.startWithLC();
					} else {
						// Master did not ping this ad yet. Still waiting.
						TKLC.checkInitializedId = setTimeout(_this.checkInitialized.bind(_this), 250, _this);
					}
				}
			}
		}
	};

	/**
	 * Ads always load in an asynchronous way. If the master was loaded first and the slave
	 * ads are not yet available, the master needs to wait for the slaves to be ready.
	 *
	 * Every 250ms we send out a "ping" to check whether the slaves are ready.
	 */
	TKLC.sendTestConnectionId = -1;
	TKLC.prototype.sendTestConnection = function(lc) {

		var _this = lc;

		clearTimeout(TKLC.sendTestConnectionId);

		if(_this.checkInitFailed()) {
			tklib.trace("sendTestConnection failed", true);
			_this.startWithoutLC();
			return;
		}

		TKLC.sendTestConnectionId = setTimeout(_this.sendTestConnection.bind(_this), 250, _this);

		var i = 0;
		var l = _this.others.length;

		for(; i < l; i++) {
			_this.sendMessage("TEST_CONNECTION__" + _this.others[i], "");
		}
	};

	/**
	 * Adds an event listener. You can specify any string/message, that you want to
	 * send to other ads and listen to those messages in those other ads.
	 *
	 * @param type - a message, e.g. MSG__SYNC_TIMELINE__FULL_LOOP or MSG__SYNC_TIMELINE__LAST_LOOP or simply "pause" or any other string
	 * @param listener - a callback function that is called once a certain message was received
	 */
	TKLC.prototype.on = function(type, listener){
		if(typeof this._listeners[type] == "undefined") {
			this._listeners[type] = [];
		}

		this._listeners[type].push(listener);

		if(this.traceEventListeners) {
			tklib.trace("TKLC ::: on ::: event.type ::: " + type);
		}
	};

	/**
	 * Dispatches a message to all listeners (which is usually this one ad).
	 */
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

			for(; i < l; i++) {
				listeners[i].call(this, event);
			}
		}
	};

	/**
	 * Removes an event listener.
	 * @param type - the message that you don't want to listen anymore.
	 * @param listener - the callback function that you initially added.
	 */
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

	/**
	 * Returns true, if the initFailedDelay passed without the init of the LC
	 * being successful.
	 */
	TKLC.prototype.checkInitFailed = function() {
		return ((new Date()).getTime() - TKLC._timestamp > this.initFailedDelay);
	};

	/** Tells the ad to start with LC support. */
	TKLC.prototype.startWithLC = function() {
		this.dispatch(tklib.TKLC.EVENT__START_WITH_LC);
	};

	/** Tells the ad to start without LC support. */
	TKLC.prototype.startWithoutLC = function() {
		this.api = tklib.TKLC.API__NONE;
		this.isValidAPI = false;
		this.dispatch(tklib.TKLC.EVENT__START_WITHOUT_LC);
	};

	/**
	 * DirectMessage needs a successful same origin check. It will not work on
	 * cross domain connections. See the init method for a rewrite document.domain
	 * description.
	 *
	 * This method will travers (recursive) all window objects beginning with window.top.
	 * If a window resides in the same origin (document.domain), this javascript
	 * is allowed to access the other windows javascript. It will then look for
	 * tklib.TKLC.tklc_"OTHER_NAME" and store a reference once such a TKLC
	 * object was found.
	 *
	 * This library is made for online ads. If more than one ad is involved
	 * ad servers / publishers should ne encouraged to host all ads of the
	 * same placement on the same subdomain, e.g.
	 *
	 * s0.cdn.example.com
	 * s0.cdn.example.com
	 *
	 * instead of
	 *
	 * s0.cdn.example.com
	 * s1.cdn.example.com
	 *
	 * This will make lives of ad developers and ad publishers much
	 * easier when it comes to Local Connection.
	 */
	TKLC.connectDirectMessageId = -1;
	TKLC.prototype.connectDirectMessage = function(_lc, _target) {

		var _this = _lc;

		if(_target == window.top) {
			tklib.trace("connectDirectMessage");

			if(_this.checkInitFailed()) {
				tklib.trace("connectDirectMessage failed.", true);
				_this.startWithoutLC();
				return;
			}
		}

		clearTimeout(TKLC.connectDirectMessageId);

		var _tklib	= null; // namespace
		var _TKLC	= null; // class
		var _tklc	= null; // instance

		var numWindows = tklib.getProperty(_target, "length") || 0;
		var i = 0;
		var l = 0;

		while(numWindows--) {

			var win = tklib.getProperty(_target, numWindows);

			if (!win || win === window || win === _target ) {
				continue;
			}

			// Looking for the tklib namespace in the other window.
			_tklib = tklib.getProperty(win, "tklib");
			if(_tklib) {
				// Found the namespace, find the TKLC class.
				_TKLC = tklib.getProperty(_tklib, "TKLC");
				if(_TKLC) {
					// Found the TKLC class, find all slaves.
					for(i = 0, l = _this.others.length; i < l; i++) {
						_tklc = tklib.getProperty(_TKLC, "tklc_" + _this.others[i]);
						if(_tklc && _this._directMessageObjects.indexOf(_tklc) < 0) {
							_this._directMessageObjects.push(_tklc);

							var version = tklib.getProperty(_tklib, "VERSION");
							if(version && version != tklib.VERSION) {
								tklib.trace("[Error: tklib.VERSION mismatch between Master and Slaves: " + version + " != " + tklib.VERSION + "]", true);
							}
						}
					}
				}
			}

			// Check all nesting windows
			_this.connectDirectMessage(_this, win);
		}

		if(_target == window.top && _this._directMessageObjects.length < _this.others.length) {
			// Did not find all of the slaves, try again in 250 ms.
			TKLC.connectDirectMessageId = setTimeout(_this.connectDirectMessage.bind(_this), 250, _this, _target);
		} else if(_target == window.top && _this._directMessageObjects.length == _this.others.length) {
			//Found all of them. Tell them about each other.
			_this._directMessageObjects.push(_this);
			for(i = 0, l = _this._directMessageObjects.length; i < l; i++) {
				_this._directMessageObjects[i].onDirectMessageConnected(_this._directMessageObjects);
			}
		}
	};

	/**
	 * Tell every ad about every other ad
	 * @param _tklcs reference to all other TKLC instances in other windows.
	 */
	TKLC.prototype.onDirectMessageConnected = function(_tklcs) {
		tklib.trace("onDirectMessageConnected: references: " + _tklcs);
		this._directMessageObjects = _tklcs;
		this.isInitialized = true;
		// Calling it explicitly to avoid timing problems.
		this.checkInitialized(this);
	};

	tklib.TKLC = TKLC;

	/** APIs and their names. */
	tklib.TKLC.API__NONE				= 0;
	tklib.TKLC.API__POST_MESSAGE		= 1;
	tklib.TKLC.API__POST_MESSAGE_BRIDGE	= 2;
	tklib.TKLC.API__SESSION_STORAGE		= 3;
	tklib.TKLC.API__DIRECT_MESSAGE		= 4;
	tklib.TKLC.API__FLASHTALKING_PM		= 5;
	tklib.TKLC.API__FLASHTALKING_DM		= 6;
	tklib.TKLC.API__ADFORM				= 7;
	tklib.TKLC.API__IQ_DIGITAL			= 8;
	tklib.TKLC.API__NAMES				= [
		"none",
		"postMessage",
		"postMessage bridge for local testing",
		"session storage",
		"DirectMessage",
		"FlashTalking (postMessage)",
		"FlashTalking (DirectMessage)",
		"Adform",
		"IQ Digital"
	];
	/** Whether or not to dispatch a sendMessage to the sender itself. */
	tklib.TKLC.API__DISPATCH_FOR_SENDER	= [
		0, //"none",
		0, //"postMessage",
		0, //"postMessage bridge for local testing",
		1, //"session storage",
		0, //"DirectMessage",
		1, //"FlashTalking (postMessage)",
		1, //"FlashTalking (DirectMessage)",
		0, //"Adform",
		0  //"IQ Digital"
	];

	/** Dispatched events for starting the ads with or without the Local Connection functionality. */
	tklib.TKLC.EVENT__START_WITH_LC		= "EVENT__START_WITH_LC";
	tklib.TKLC.EVENT__START_WITHOUT_LC	= "EVENT__START_WITHOUT_LC";

})();