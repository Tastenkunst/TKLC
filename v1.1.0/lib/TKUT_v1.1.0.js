/*!
 * Version: TKLC_151129_v1.1.0
 * Date: 2015-11-29
 * Docs, examples, updates at: https://github.com/Tastenkunst/TKLC
 *
 * Copyright (c) 2015, Tastenkunst GmbH. All rights reserved.
 *
 * @author: Marcel Klammer, m.klammer@tastenkunst.com
 **/

/**
 * Adding a namespace for this library, so we don't pollute the window object.
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
