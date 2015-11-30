function mm$(id){
	var el = null;
	var _var = "mm_div_" + id;
	if(typeof window[_var] !== "undefined"){
		el = window[_var];
	}else{
		el = document.getElementById(id);
		window[_var] = el;
	}
	return el;
}
function getCurrentStyle(_e, _s){
	var _v = null;
	if(typeof window.getComputedStyle !== "undefined"){
		_v = parseInt(window.getComputedStyle(_e).getPropertyValue(_s),10);
	}else{
		_v = parseInt(_e.currentStyle[_s],10);
	}
	return _v;
}
function getEquivalentDeviceInputFromTouch(typ){
	if(!window.Modernizr.touch){
		var msp = (window.navigator.msPointerEnabled === true)?true:false;
		if(typ==="touchstart"){typ=(msp)?"MSPointerDown":"mousedown";
		}else if(typ==="touchmove"){typ=(msp)?"MSPointerMove":"mousemove";
		}else if(typ==="touchend"){typ=(msp)?"MSPointerUp":"mouseup";}
	}
	return typ;
}
function convertPointerEventToTouch(evtName){
	evtName = evtName.toLowerCase();
	if(evtName.indexOf("touch")>=0){return evtName;}
	if(evtName.indexOf("down")>=0){return "touchstart";}
	if(evtName.indexOf("move")>=0){return "touchmove";}
	if(evtName.indexOf("up")>=0){return "touchend";}
	return evtName;
}
function addTouchListener(tg, tp, h, b){
	if(!b){ b = false; }
	tp = getEquivalentDeviceInputFromTouch(tp);
	if(typeof tg.addEventListener !== "undefined"){
		tg.addEventListener(tp, h, b);
	}else if(typeof tg.attachEvent !== "undefined"){
		if(tg === window){tg = document.body;}
		var self = this;
		tg.attachEvent("on"+tp,  h);
	}
}
function removeTouchListener(tg, tp, h){
	tp = getEquivalentDeviceInputFromTouch(tp);
	if(typeof tg.removeEventListener !== "undefined"){
		tg.removeEventListener(tp, h);
	}
}

function getPointerPosition( e ) {
	var p = {x:0,y:0};
	if(window.Modernizr.touch && e.targetTouches && e.targetTouches.length > 0){
		p.x = e.targetTouches[0].clientX;
		p.y = e.targetTouches[0].clientY;
	}else{
		p.x = e.clientX;
		p.y = e.clientY;
	}
	return p;
}

function setClass(e, c){
	var cc = null;
	if(typeof e.className === "undefined"){
		cc = e.getAttribute("class");
		if(cc.indexOf(c) < 0){
			if(c.length > 0){ c = cc + " " + c; }
			e.setAttribute("class", c);
		}
	}else{
		cc = e.className;
		if(cc.indexOf(c) < 0){
			if(c.length > 0){ c = cc + " " + c; }
			e.className = c;
		}
	}
}

function removeClass(e, c){
	var nc = null;
	var reg = new RegExp('(\\s|^)+'+c.replace("-","\\-")+'(\\s|$)+');
	if(typeof e.className === "undefined"){
		nc = e.getAttribute("class").replace( reg , ' ');
		e.setAttribute("class", nc);

	}else{
		e.className = e.className.replace(reg, ' ' );
	}
}

function sortObjectsInArrayByProperty(u, pN){
	var s = [];
	var t = u.length;
	for(var _i = 0;_i<t;_i++){
		var _low = null;
		for(var _j = 0; _j < u.length; _j++){
			if(typeof u[_j][pN] !== "undefined" && (_low === null || parseFloat(u[_j][pN]) < parseFloat(u[_low][pN]))){
				_low = _j;
			}
		}
		s.push(u.splice(_low,1)[0]);
	}
	if(u.length > 0){
		s.concat(s, u);
	}
	return s;
}

function getComponent(l, h, tg){
	if (l > tg){
			return l;
		}else if (tg > h){
			return h;
		}else{
			return tg;
		}
		return 0;
}
var _mmCSSBrowserPrefix = null;
function getCSSBrowserPrefix(){
	if(_mmCSSBrowserPrefix !== null){
		return _mmCSSBrowserPrefix;
	}
	var t;
	var el = document.createElement('div');
	var prefixes = {
		'WC':'',
		'O':'o',
		'MS':'ms',
		'Moz':'Moz',
		'Webkit':'webkit'
	};
	for(t in prefixes){
		if( el.style[prefixes[t] + "Transition"] !== undefined ){
			_mmCSSBrowserPrefix = prefixes[t];
			return _mmCSSBrowserPrefix;
		}
	}
}


function scaleDownToSize(_media, _w, _h){
	var _wFactor = 1;
	var _hFactor = 1;
	var msg = "video: " + _media.videoWidth + "x" + _media.videoHeight + "\nnatural: " + _media.naturalWidth + "x" + _media.naturalHeight + "\ndefault: " + _media.width + "x" + _media.height;
	var _mediaWidth = (_media.videoWidth)?_media.videoWidth:(_media.naturalWidth)?_media.naturalWidth:_media.width;
	var _mediaHeight = (_media.videoHeight)?_media.videoHeight:(_media.naturalHeight)?_media.naturalHeight:_media.height;
	if(_mediaWidth === 0|| _mediaHeight===0){
		_mediaWidth =  _media.offsetWidth;
		_mediaHeight = _media.offsetHeight;
	}
	var _origWidth = _mediaWidth;
	var _origHeight = _mediaHeight;
	_media.style.position = "absolute";
	if(_mediaWidth > _w){
		_wFactor = _w/_mediaWidth;
	}
	if(_mediaHeight > _h){
		_hFactor = _h/_mediaHeight;
	}
	if((_mediaWidth === 0||_mediaHeight === 0)||(_wFactor === _hFactor && _wFactor !==1)){
		_media.style.width = _w + "px";
		_media.style.height = _h + "px";
		_media.style.left = "0px";
		_media.style.top = "0px";
	}else if(_wFactor <= _hFactor && _wFactor !== 1){
		_media.style.height = "auto";
		_media.style.width = _w+"px";
		_media.style.top = (_h/2 - (_origHeight*_wFactor)/2) + "px";
		_media.style.left = "0px";
	}else if(_wFactor > _hFactor && _hFactor !== 1){
		_media.style.height = _h+"px";
		_media.style.width = "auto";
		_media.style.left = (_w/2 - (_origWidth*_hFactor)/2) + "px";
		_media.style.top = "0px";
	}else{
		_media.style.width = _mediaWidth + "px";
		_media.style.height = _mediaHeight + "px";
		_media.style.left = (_w/2 - (_origWidth*_hFactor)/2) + "px";
		_media.style.top = (_h/2 - (_origHeight*_wFactor)/2) + "px";
	}
}

function MMTouchClick(target, callback, params, scope){
	this.isAndroid3or4_0_4 = (navigator.userAgent.match(/android (3|4\.0\.4)/i) !== null);
	this.scope = (typeof scope !== "undefined")?scope:window;
	this.params = (typeof params !== "undefined")?params:[];
	this.params.unshift("");
	this.target = target;
	this.callback = callback;
	this.touchData = {
		startTime:null,
		startPos:{x:0,y:0},
		endPos:{x:0,y:0},
		threshold:3,
		timeout:300
	};
	this.handleEvent = function(e){
		if(e.currentTarget === this.target){
			var evtName = convertPointerEventToTouch(e.type);
			switch(evtName){
				case "click":
					e.touchClick = this;
					this.params[0] = e;
					this.touchData.startPos.x = this.touchData.endPos.x = getPointerPosition(e).x;
					this.touchData.startPos.y = this.touchData.endPos.y = getPointerPosition(e).y;
					this.scope[callback].apply(this.scope,this.params);
					break;
				case "touchstart":
					this.touchData.startPos.x = this.touchData.endPos.x = getPointerPosition(e).x;
					this.touchData.startPos.y = this.touchData.endPos.y = getPointerPosition(e).y;
					this.touchData.startTime = new Date();
					break;
				case "touchmove":
					this.touchData.endPos.x = getPointerPosition(e).x;
					this.touchData.endPos.y = getPointerPosition(e).y;
					break;
				case "touchend":
					var endTime = new Date();
					var elapsedTime = parseInt(this.touchData.startTime.getTime(),10) - parseInt(endTime.getTime(),10);
					var totalXOffset = Math.abs(this.touchData.startPos.x - this.touchData.endPos.x);
					var totalYOffset = Math.abs(this.touchData.startPos.y - this.touchData.endPos.y);

					if(Math.max(totalXOffset, totalYOffset) <= this.touchData.threshold && elapsedTime < this.touchData.timeout){
						e.touchClick = this;
						this.params[0] = e;
						this.scope[callback].apply(this.scope,this.params);
					}
					break;
			}
		}
	};
	this.addListeners = function(){
		var self = this;
		if(this.isAndroid3or4_0_4){
			addTouchListener(self.target, "click", self, false);
		}
		else {
			addTouchListener(self.target, "touchstart", self, false);
			addTouchListener(self.target, "touchmove", self, false);
			addTouchListener(self.target, "touchend", self, false);
		}
	};
	this.removeListeners = function(){
		var self = this;
		if(this.isAndroid3or4_0_4){
			removeTouchListener(self.target, "click", self, false);
		}
		else {
			removeTouchListener(self.target, "touchstart", self, false);
			removeTouchListener(self.target, "touchmove", self, false);
			removeTouchListener(self.target, "touchend", self, false);
		}
	};
	this.addListeners();
}
var mm_traceEnabled = true;
function trace(_msg){
	if(typeof window.console !== "undefined" && mm_traceEnabled){
		window.console.log(_msg);
	}
}