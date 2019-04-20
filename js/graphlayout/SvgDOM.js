try {
    if (typeof(MochiKit.DOM) == 'undefined') {
        throw "";
    }
} catch (e) {
    throw "SvgDOM depends on MochiKit.DOM!";
}

if (typeof(SvgDOM) == 'undefined') {
    SvgDOM = {};
}


SvgDOM.NAME = "SvgDOM";
SvgDOM.VERSION = "0.1";
SvgDOM.__repr__ = function () {
    return "[" + this.NAME + " " + this.VERSION + "]";
};
SvgDOM.toString = function () {
    return this.__repr__();
};

SvgDOM.EXPORT = [
    "labelBox",
    "placeXY",
    "CIRCLE",
    "G",
    "LINE",
    "PATH",
    "RECT",
    "TEXT",
    "USE",
    "DragAndDrop"
];

SvgDOM.EXPORT_OK = [];


SvgDOM.getViewportDimensions = function() {
    var svgdoc=SvgDOM._document;
    var w = svgdoc.documentElement.getAttribute('width');
    var h = svgdoc.documentElement.getAttribute('height');
    if (!w || !h) {
	try {
	    w = svgdoc.documentElement.width.baseVal.value;
	    h = svgdoc.documentElement.height.baseVal.value;
	}
	catch (err) {
	    //must be IE
	}
    }
    return {w:w,h:h};
}

SvgDOM.createSvgDOM = function (name, attrs/*, nodes... */) {
    /*
        Create a DOM fragment in a really convenient manner, much like
        Nevow's <http://nevow.com> stan.
    */

    var elem;
    var svgdoc=SvgDOM._document;
    var mDOM=MochiKit.DOM;
    if (typeof(name) == 'string') {
        elem = svgdoc.createElementNS("http://www.w3.org/2000/svg",name);
    } else {
        elem = name;
    }
    if (attrs) {
        mDOM.updateNodeAttributes(elem, attrs);
    }
    if (arguments.length <= 2) {
        return elem;
    } else {
        var args = MochiKit.Base.extend([elem], arguments, 2);
	
	//this is so MochKit.DOM.coerceToDOM creates TextNodes on the correct document
	//I couldn't make this work with withDocument, so this is the hack.
	//NOT THREAD SAFE
	var oldDoc = mDOM._document;
	mDOM._document=svgdoc;
	var rval=mDOM.appendChildNodes.apply(this,args);
	mDOM._document=oldDoc;
	return rval;
    }
};

SvgDOM.createSvgDOMFunc = function (/* tag, attrs, *nodes */) {
    /***

        Convenience function to create a partially applied createDOM

        @param tag: The name of the tag

        @param attrs: Optionally specify the attributes to apply

        @param *notes: Optionally specify any children nodes it should have

        @rtype: function

    ***/
    return MochiKit.Base.partial.apply(
        this,
        MochiKit.Base.extend([SvgDOM.createSvgDOM], arguments)
    );
};

SvgDOM.scale=function(elem,sx,sy) {
    sy = (sy) ? sy : sx;
    var x = elem.getAttribute('transform');
    var t =null;
    if (x) t = elem.transform.baseVal.consolidate();
    if (t == null) {
	trans = "scale("+sx+","+sy+")";
    } else {
	var m=t.matrix;
	m=m.scaleNonUniform(sx,sy);
	//logDebug(m.e,m.f,x,y);
	var trans="matrix("+m.a+" "+m.b+" "+m.c+" "+m.d+" "+m.e+" "+m.f+")";
    }
    elem.setAttribute('transform', trans);
}

SvgDOM.translate=function(elem,dx,dy) {
    var t = elem.transform.baseVal.consolidate();
    if (t == null) {
	trans = "translate("+dx+","+dy+")";
    } else {
	var m=t.matrix;
	m=m.translate(dx,dy);
	var trans="matrix("+m.a+" "+m.b+" "+m.c+" "+m.d+" "+m.e+" "+m.f+")";
    }
    elem.setAttribute('transform', trans);
}


SvgDOM.setCoords=function (elem,pArray,start/*=0*/) {
    /* Like placeXY except for more than one point at a time
       param @start +/- value on where to start setting the elements.  
              negative values count from the end.
    */
    switch (elem.nodeName)
    {
	case 'polyline':
	   var keep = '';
	   if (typeof(start) != 'undefined') {
	       var currP = elem.getAttribute('points').toString().split(/\s+/);
	       start = (start < 0) ? keep.length+start : start;
	       keep = currP.slice(0,start).join(' ');
	   }
	   elem.setAttribute('points', keep+map(function(p) {
	       return p.x+','+p.y;
	   },pArray).join(' '));
	   break;
    }
}

SvgDOM.placeXY=function (elem,x,y,whichpoint) {
    /* this is now done ?correctly in mouse dragging
       if uncommenting args should be xOrig,yOrig
    var x;
    var y;
    try {//either no parentNode or no getScreenCTM
	throw 'hi';
	var m = elem.parentNode.getScreenCTM().inverse();
	x = m.a*xOrig+m.c*yOrig+m.e*1;
	y = m.b*xOrig+m.d*yOrig+m.f*1;
    } catch(err) {
	x = xOrig;
	y = yOrig;
    }*/
    switch (elem.nodeName)
    {
	case 'g'://G element must be done by transform
	   if (elem.transform) {//leave other transforms alone, if possible
	       var t = elem.transform.baseVal.consolidate();
	       var m = (t == null) ? {a:1,b:0,c:0,d:1} : t.matrix;
	       //var m=elem.transform.baseVal.getConsolidationMatrix();
	       //m=m.translate(x-m.e,y-m.f);
		//logDebug(m.e,m.f,x,y);
		var trans="matrix("+m.a+" "+m.b+" "+m.c+" "+m.d+" "+x+" "+y+")";
		elem.setAttribute('transform', trans);
	    } else {
		var trans="translate("+x+","+y+")";
		elem.setAttribute("transform", trans);
	    }
	    break;
	case 'line'://LINE 0,1 for whichpoint
	    //logDebug('placing line point ',whichpoint);
	    if (whichpoint==0) {
		SvgDOM.placeXYattrs(elem,x,y,"x1","y1");
	    }
	    else {
		SvgDOM.placeXYattrs(elem,x,y,"x2","y2");
	    }
	    break;
	case 'circle'://CIRCLE
	    //	logDebug('placing circle with',SvgDOM.placeXYattrs);
	    SvgDOM.placeXYattrs(elem,x,y,"cx","cy");
	    break;
    default:
	SvgDOM.placeXYattrs(elem,x,y,"x","y");
    }
};

SvgDOM.setElementPosition=SvgDOM.placeXY;

SvgDOM.placeXYattrs=function (elem,x,y,xattr,yattr) {
    elem.setAttribute(xattr,x);
    elem.setAttribute(yattr,y);
}
SvgDOM.getComputedTextLength=function(str) {
    /*for Firefox which doesn't have this function 
     only an approximation, of course*/
    hints={f:6,i:4,j:5,k:9,l:5,m:13,
	   r:6,t:6,v:9,w:13,y:9,'4':9,
	   A:11,B:11,C:12,D:12,E:11,F:10,G:12,
	   H:11,I:3,K:11,L:9,M:13,N:11,
	   O:12,P:11,Q:12,R:9,S:9,V:10,W:14,X:9,Y:9
    };
    len=0;
    for(i=0;i<str.length;i++) {
	len+= (hints[str.charAt(i)]) ? hints[str.charAt(i)] : 9;
    }
    return len;
};

SvgDOM.labelBox= function (attrs, label) {
    font=7;
    txt=TEXT({x:0,y:font*2,style:"pointer-events:none;"},label);
    w=(txt.getComputedTextLength() > 0) ? txt.getComputedTextLength()+2*font : SvgDOM.getComputedTextLength(label)+2*font;
    h=font*3;
    elem=G(attrs,RECT({x:-font,y:-2,width:w,height:h}),txt);
    if (!attrs) { //nice default
	elem.firstChild.setAttribute('style',"fill:white;stroke:black;stroke-width:1px");
    }
    return elem;
};

SvgDOM.DragAndDrop = function () {
    //this.dropZones = new Array();
    //this.draggables = new Array();
    //this.currentDragObjects = new Array();
    this.dragElement = null;
    this.lastSelectedDraggable = null;
    //this.currentDragObjectVisible = false;
    //this.interestedInMotionEvents = false;
    this.startDrag=false;
    this.endDrag=false;
    this.cancelDrag=false;
    /*** ADDED VARS BELOW ***/
    // function called each time the dragged elt is updated to map mouse coords to obj coords
    this.mouseLens=function(obj,x,y){return {x:x,y:y};};
    this.posUpdate=SvgDOM.placeXY;
    this.getTarget=function(obj){return obj;};
};

SvgDOM.DragAndDrop.prototype.registerDraggable=function(obj) {
    var self=this;
    var target=self.getTarget(obj);
    var md=function(evt){self._mousedown(obj,evt);};
    target.addEventListener('mousedown',md,false);
};

SvgDOM.DragAndDrop.prototype._mousedown=function(obj,evt) {
    if (evt.altKey || evt.shiftKey || evt.ctrlKey) return;
    var self=this;
    if (self.dragElement) {
	self.dragElement.mu(obj,evt);
    }
    var target= SvgDOM._document.documentElement; // (obj.obj) ? obj.obj : obj;
    var mm=function(evt){self._drag(obj,evt);};
    var mo=function(evt){self._drag(obj,evt);};
    var mu=function(evt){self._mouseup(obj,evt);};
    self.dragElement={mm:mm,mu:mu,mo:mo,target:target};

    target.addEventListener('mousemove',mm,false);
    target.addEventListener('mouseup',mu,false);
    target.addEventListener('mouseout',mo,false);
    if (self.startDrag) {
	self.startDrag(obj,evt);
    }
};

SvgDOM.DragAndDrop.prototype._drag=function(obj,evt) {
    var self=this;
    if (self.dragElement) {
	var pos=self.mouseLens(obj, evt.clientX, evt.clientY);
	self.posUpdate(self.getTarget(obj), pos.x, pos.y);
    }
};

SvgDOM.DragAndDrop.prototype._mouseup=function(obj,evt) {
    var self=this;
    if (self.dragElement) {
	var t=self.dragElement.target;
	t.removeEventListener('mousemove',self.dragElement.mm,false);
	t.removeEventListener('mouseup',self.dragElement.mu,false);
	t.removeEventListener('mouseout',self.dragElement.mo,false);
	self.lastSelectedDraggable=self.dragElement;
	self.dragElement=null;
	if (self.endDrag) {
	    self.endDrag(obj,evt);
	}
    }
};



/* INIT SvgDOM */
SvgDOM.__new__ = function () {
    this._document=document;
    this.EXPORT_TAGS = {
        ":common": this.EXPORT,
        ":all": MochiKit.Base.concat(this.EXPORT, this.EXPORT_OK)
    };
    var cSDf = this.createSvgDOMFunc;
    this.TEXT = cSDf("text");
    this.G    = cSDf("g");
    this.RECT = cSDf("rect");
    this.CIRCLE = cSDf("circle");
    this.LINE = cSDf("line");
    this.USE  = cSDf("use");
    this.PATH  = cSDf("path");
    MochiKit.Base.nameFunctions(this);
};

SvgDOM.__new__();

MochiKit.Base._exportSymbols(this, SvgDOM);
