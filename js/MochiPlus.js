/*
  What MochiKit should have, but doesn't:
   swapFromHttp(id, xmlhttprequest)
   keepTrying(func, msec, self) 
   getQueryArguments() 
   showTableCell(elt) //works in FF for show/hide functionality
   hasattr(obj,key) //just like python
   getattr(obj,key,default) //just like python
   fillForm(elem,obj) //inverse of formContents(elem), except obj is the name:value pairs form
   redefines addLoadEvent() to be compatible with MochiKit Signal.js
*/

addLoadEvent = partial(connect,window,'onload');

function getQueryArguments() {
    return parseQueryString(document.location.search.substr(1));
}


function hasattr(obj,key) {
    try {
	return (typeof(obj[key]) != 'undefined');
    } catch(e) {return false;}
}

function getattr(obj,key,_default) {
    if (hasattr(obj,key)) {
	if (typeof(obj[key]) == 'unknown') {
	    try{return obj[key]}
	    catch(e){return _default}
	}
	return obj[key];
    }
    if (arguments.length > 2) return  _default;
    throw "AttributeError";
}

function require_js(js_file) {
    document.write('<script type="text/javascript" src="'+js_file+'"></script>');
}

function showTableCell(elt) {
    //we're using this in the first place because FF does display:block literally
    elt = $(elt);
    try {
	elt.style.display = "table-cell";
    }
    catch(err) {//must be IE
	showElement(elt);
    }
}
/*
  Use this in contexts like:
  def = doSimpleXMLHttpRequest('myxmlfile.xml');
  def.addCallback(swapFromHttp, 'myId');
  where $('myId') is the DOM that you want replaced with content
  with the same id="myId" DOM element in the xml request
  caveats:
     IE 6 needs the Content-type: text/xml
     Firefox wants  xmlns="http://www.w3.org/1999/xhtml" in html tag
     IE and Safari don't handle named entities like &nbsp; well in this context
       and should be numeric (e.g. &#160;)

*/
function swapFromHttpOLD(myId, xmlhttp) {
    var resXML=xmlhttp.responseXML;
    var curr=$(myId);
    var scrollPos=curr.scrollTop; //save scroll position
    var newDOM = null;
    try {
	if (typeof(resXML.getElementById) == 'undefined') {
	    //IE HACK
	    //IE doesn't work because XML DOM isn't as rich as HTML DOM
	    var findID = function(node) {
		if (newDOM) {return null;} //don't waste time after we've found it
		if (node.nodeType != 1) {
		    //document node gets us going
		    return (node.nodeType == 9) ? node.childNodes : null; 
		}
		if (node.getAttribute('id') == myId) {
		    newDOM = node;
		    return null;
		}
		return node.childNodes;
	    };
	    nodeWalk(resXML, findID); //walk the html tag
	    curr.outerHTML=newDOM.xml;
	}
	else {
	    newDOM=resXML.getElementById(myId);
	    if (newDOM.outerHTML) {
		//SAFARI HACK
		//SAFARI fails because XML dom node can't be added into a replaceChild HTML function
		curr.innerHTML=newDOM.innerHTML;
	    }
	    else {
		//probably Firefox
		swapDOM(curr,newDOM);
	    }
	}
	$(myId).scrollTop = scrollPos;
    } catch(err) {
	//we might be catching an XML parsing error
	logError(err);
	logError(err.message);
	if (resXML.parseError) {
	    logDebug('xml error:', resXML.parseError.errorCode);
	    logDebug(resXML.parseError.reason);
	    logDebug(resXML.parseError.line);
	}
    }
}

function swapFromHttp(myId, xmlhttp) {
    var resXML=xmlhttp.responseXML;
    var curr=$(myId);
    var newDOM = safeGetElement(resXML,myId);
    var scrollPos=curr.scrollTop; //save scroll position
    
    if (hasattr(resXML,'getElementById')) {
	if (hasattr(newDOM,'outerHTML')) {//safari
	    curr.innerHTML = newDOM.innerHTML;
	} else {
	    swapDOM(curr,newDOM);
	}
    } else {//IE
	curr.outerHTML=newDOM.xml;
    }
    $(myId).scrollTop = scrollPos;    
    return xmlhttp; //so another deferred can also handle the request;
}

function safeGetElement(resXML,myId) {
    var newDOM = null;
    if (typeof(resXML.getElementById) == 'undefined') {
	//IE HACK
	//IE doesn't work because XML DOM isn't as rich as HTML DOM
	var findID = function(node) {
	    if (newDOM) {return null;} //don't waste time after we've found it
	    if (node.nodeType != 1) {
		//document node gets us going
		return (node.nodeType == 9) ? node.childNodes : null; 
	    }
	    if (node.getAttribute('id') == myId) {
		newDOM = node;
		return null;
	    }
	    return node.childNodes;
	};
	nodeWalk(resXML, findID); //walk the html tag
	//curr.outerHTML=newDOM.xml;
    }
    else {
	newDOM=resXML.getElementById(myId);
    }
    return newDOM;

}


function keepTrying(func, msec, self) {
    self = (self) ? self : this;
    var d = new Deferred();
    var timeID;
    //blahblah++;
    //var myBlah=blahblah;
    var pulser = function() {
	//logDebug('pulse',timeID,myBlah,d.fired);
	if (d.fired<0) {
	    try {
		var v = func.call(self);
		d.callback(v);
	    }
	    catch(err) {
		logDebug('function failed on',err);
		timeID = window.setTimeout(arguments.callee,msec);
	    }
	}
	else {
	    //logDebug('already fired',timeID,myBlah);
	    window.clearTimeout(timeID);
	}
    };
    timeID = window.setTimeout(pulser,0);
    return d;
}


function fillForm(elem/* = document */, obj) {
        var m = MochiKit.Base;
        var self = MochiKit.DOM;
        if (typeof(elem) == "undefined" || elem === null) {
            elem = self._document;
        } else {
            elem = self.getElement(elem);
        }
        m.nodeWalk(elem, function (elem) {
            var name = elem.name;
            if (m.isNotEmpty(name)) {
                var tagName = elem.tagName.toUpperCase();
                if (tagName === "INPUT"
                    && (elem.type == "radio" || elem.type == "checkbox")
                ) {
		    elem.checked = (getattr(obj,name,null) === elem.value);
                    return null;
                }
                if (tagName === "SELECT") {
		    var opts = elem.options;
		    var chosens = (typeof(obj[name]) == 'string') ? [ obj[name] ] : getattr(obj,name,[]);
		    for (var i = 0; i < opts.length; i++) { 
			var opt = elem.options[i];
			opt.selected = (findValue(chosens, opt.value) >= 0 );
		    }
		    return null;
                }
                if (tagName === "FORM" || tagName === "P" || tagName === "SPAN"
                    || tagName === "DIV"
                ) {
                    return elem.childNodes;
                }
		elem.value = getattr(obj,name,'');
                return null;
            }
            return elem.childNodes;
        });
    }
