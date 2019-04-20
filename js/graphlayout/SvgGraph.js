/***

Svggraph is released under the GPL 3.0 or higher, (c) Schuyler Duveen

A SvgNode has x,y,dx,dy,obj,content
Nodes are <g> tags
Edges are <line> tags

***/

if (typeof(dojo) != 'undefined') {
    dojo.provide("MochiKit.DOM");
    dojo.require("MochiKit.Iter");
}
if (typeof(JSAN) != 'undefined') {
    JSAN.use("MochiKit.Iter", []);
}

try {
    if (typeof(GraphNode) == 'undefined') {
        throw "";
    }
    if (typeof(SvgDOM) == 'undefined') {
        throw "";
    }
} catch (e) {
    throw "SvgGraph depends on GraphElements and SvgDOM!";
}

if (typeof(SvgGraph) == 'undefined') {
    SvgGraph = {
	NAME:"SvgGraph",
	VERSION:"0.2",
	Elements:{}
    };
}


if (typeof(SvgNode) == 'undefined') {
    SvgNode = function () {
	this.NAME="SvgNode";
	this.VERSION="0.2";
    };
}

SvgNode.prototype= new EdgeableNode();
SvgNode.prototype.parent = EdgeableNode.prototype;

SvgNode.prototype.NAME="SvgNode";
SvgNode.prototype.VERSION="0.2";

SvgNode.prototype.init=function(n,id) {
    this.parent.init(n);
    if (!n.content) {
	n.content={};
    }
    logDebug('SvgNode.init');
    if (!n.content.svgobj) {
	var attrs = (id) ? {id:id} : null;
	n.content.svgobj=G(attrs,null);
    } else if (id) {
	n.content.svgobj.setAttribute('id',id);
    }
    //add to svgdoc

}

SvgNode.prototype.applyDxy = function (n,factor) {
    this.parent.applyDxy(n,factor);
    //this.updateViewCoords(n);
}

SvgNode.prototype.getShift=function(n) {
    //shift based on node width or the like;
    return {x:0,y:0};
}

SvgNode.prototype.updateViewCoords=function(n) {
    //this is assumed to be the svgView (i.e. myGraphVC)
    if (! ('p' in n)) {
	var shift = this.nodeModel.getShift.call(this,n);
	SvgDOM.placeXY(n.content.svgobj, n.x+shift.x, n.y+shift.y);
    }
}



if (typeof(SvgEdge) == 'undefined') {
    SvgEdge = function (nodeModel) {
	this.NAME="SvgEdge";
	this.VERSION="0.1";
	this.updateViewCoords=partial(this._updateViewCoords,nodeModel);
	//this.length=arguments[2]; //if we want to make weight a fundamental
    };
}

SvgEdge.prototype= new GraphEdge();
SvgEdge.prototype.parent = GraphEdge.prototype;

SvgEdge.prototype.NAME="SvgEdge";
SvgEdge.prototype.VERSION="0.2";

SvgEdge.prototype.init=function(self, e, id) {
    if (!e.content) {
	e.content={};
    }
    if (!e.content.svgobj) {
	var attrs = (id) ? {id:id} : null;
	e.content.svgobj=LINE(attrs);
    } else if (id) {
	e.content.svgobj.setAttribute('id',id);
    }
    self.updateViewCoords(e);
}

SvgEdge.prototype.remove=function(e) {
    var svgE = e.content.svgobj;
    var p = svgE.parentNode;
    p.removeChild(svgE);
}

SvgEdge.prototype._updateViewCoords=function(nodeModel,e) {
    var p = nodeModel.getXY(e.p);
    var q = nodeModel.getXY(e.q);
    SvgDOM.placeXY(e.content.svgobj,p.x,p.y,0);
    SvgDOM.placeXY(e.content.svgobj,q.x,q.y,1);
}


if (typeof(SvgGraph.Elements) == 'undefined') {
    SvgGraph.Elements = {
	NAME:"SvgGraph.Elements",
	VERSION:"0.2"
    };
}

/* 
 *   Elements should have:
 *     nodeModel={getXY(n), 
       getDxy(n), 
       setDxy(n,d), 
       applyDxy(n,factor),
       updateViewCoords(n)
       }
 *     nodeModel.init()
 *     edgeModel
 *     addGraph(graph)
 */
var dragEdges = null;
var dragView = null;

SvgGraph.Elements.Base=function() {
    this.__init__=function(svgdoc,target) {
        this.svgdoc=svgdoc;
	SvgDOM._document=svgdoc;
	if (target) {
	    if (typeof(target) == 'string') {
		this.target=this.svgdoc.getElementById(target);
	    }
	    else {
		this.target=target;
	    }
	}
	else {
	    x=G({id:'simpleTarget'});
	    svgdoc.documentElement.appendChild(x);
	    this.target=x;
	}
	this.nodeModel=new SvgNode();
	this.edgeModel=new SvgEdge(this.nodeModel);
	this.drags=new this.nodeDragger(); //eventually per graph
	this.drags.startDrag=bind(this.drags._startDrag,this);
	this.center={x:0,y:0};
	this.background = svgdoc.getElementById('background');
	if (this.background){
	    connect(this.background,'onmousedown',this,this.pan);
	}

	this.nodeModel.init=partial(function(myGraphVC, n) {
	    this.parent.init(n);
	    if (!n.content) {
		n.content={};
	    }
	    if (typeof(myGraphVC.addNodeView) != 'undefined') {
		myGraphVC.addNodeView.apply(myGraphVC,arguments);
	    }
	    if (typeof(myGraphVC.addNodeController) != 'undefined') {
		myGraphVC.addNodeController.apply(myGraphVC,arguments);
	    }
	},this);
	this.edgeModel.init=partial(function(myGraphVC, e) {
	    //this.parent.init(e); //not working. don't know why, but doesn't matter now
	    if (!e.content) {
		e.content={};
	    }
	    if (typeof(myGraphVC.addEdgeView) != 'undefined') {
		myGraphVC.addEdgeView.apply(myGraphVC,arguments);
	    }
	    if (typeof(myGraphVC.addEdgeController) != 'undefined') {
		myGraphVC.addEdgeController.apply(myGraphVC,arguments);
	    }
	},this);
    }
    this.graphs=[];
}

var sky;
SvgGraph.Elements.Base.prototype.pan=function(evt){
    var t = this.target.transform.baseVal.consolidate();
    var m = (t != null) ? t.matrix : this.target.ownerDocument.documentElement.createSVGMatrix();
    var p= evt.mouse().client;
    var discon = function() {
	disconnect(this.panner);
	this.panner = false;		
    }
    if (this.panner) {
	discon();
	return;
    }
    this.panner = connect(this.svgdoc.documentElement,'onmousemove',this,function(evt) {
	var q = evt.mouse().client;
	m=m.translate(q.x-p.x,q.y-p.y);
	p = q;
	var trans="matrix("+m.a+" "+m.b+" "+m.c+" "+m.d+" "+m.e+" "+m.f+")";
	this.target.setAttribute('transform', trans);
    });
    connect(this.svgdoc.documentElement,'onmouseup',this,discon);
}


SvgGraph.Elements.Base.prototype.nodeDragger= function() {
    this.dragElement = null;
    this.lastSelectedDraggable = null;
    this.endDrag=false;
    this.cancelDrag=false;
    this.posUpdate=SvgDOM.placeXY;
}

SvgGraph.Elements.Base.prototype.nodeDragger.prototype= new SvgDOM.DragAndDrop();
SvgGraph.Elements.Base.prototype.nodeDragger.prototype.getTarget=function(obj){return obj.content.svgobj;};

SvgGraph.Elements.Base.prototype.nodeDragger.prototype._startDrag=function(obj,evt) {
	    dragEdges={p:[],q:[]}; //is it bad to make this a global var?
	    dragView=this;
	    this.graphs[0].getNodeEdges.visible.apply(this.graphs[0],[obj,dragEdges]);
	}

SvgGraph.Elements.Base.prototype.nodeDragger.prototype.mouseLens=function(obj,x,y){  //i.e. ondrag
	    m = obj.content.svgobj.parentNode.getScreenCTM().inverse();
	    x = m.a*x+m.c*y+m.e*1;
	    y = m.b*x+m.d*y+m.f*1;
	    obj.x=x;
	    obj.y=y;
	    var i = dragEdges.p.length;
	    while (--i >=0) {
		SvgDOM.placeXY(dragEdges.p[i].content.svgobj,x,y,0);
	    }
	    i = dragEdges.q.length;
	    while (--i >=0) {
		SvgDOM.placeXY(dragEdges.q[i].content.svgobj,x,y,1);
	    }
	    if ('extra' in dragEdges) {
		forEach(iter(dragEdges.extra), dragView.edgeModel.updateViewCoords);
	    }
	    var shift = dragView.nodeModel.getShift.call(dragView,obj);
	    return {x:x+shift.x,y:y+shift.y};
	};


SvgGraph.Elements.Base.prototype.removeEdge=function(e) {

}

SvgGraph.Elements.Base.prototype.updateView=function() {
    var self = this;
    var g = self.graphs[0];
    forEach(g.getEdges(), self.edgeModel.updateViewCoords, self);
    forEach(g.getNodes(), self.nodeModel.updateViewCoords, self);
}

SvgGraph.Elements.Base.prototype.centerGraph=function(myGraphVC) {
    /* this version of centergraph would actually work for non-SVG
       I wanted to use SVG's transforms but this didn't update the 
       actual x,y coords, so then when it was dragged, edges were
       sometimes confused.
    */
    myGraphVC = (myGraphVC) ? myGraphVC : this;
    var avg_data=reduce(
			function(a,b){
			    //for (q in b) {logDebug(q,':',b[q]);}
			    a[0]+=b.x;
			    a[1]+=b.y;
			    a[2]++;
			    return a;
			},
			myGraphVC.graphs[0].getNodes(),
			[0,0,0]
			);
    //logDebug('average data:',avg_data[0],avg_data[1],avg_data[2])
    var wd = SvgDOM.getViewportDimensions();
    myGraphVC.center.x = avg_data[0]/avg_data[2];
    myGraphVC.center.y = avg_data[1]/avg_data[2];
    var cx=wd.w/2 - myGraphVC.center.x;
    var cy=wd.h/2 - myGraphVC.center.y;
    //logDebug('center',cx,cy);
    //logDebug('width/height',wd.w,wd.h,wd.w/2,wd.h/2);
    SvgDOM.placeXY(myGraphVC.target,cx,cy);
}

SvgGraph.Elements.Base.prototype.addGraph=function(graph){
    var self=this;
    var last=self.graphs.push(graph)-1;
    if (typeof(graph.throttle) != 'undefined') {self.throttle = graph.throttle;}
    if (typeof(self.onAddGraph) != 'undefined') {
	self.onAddGraph(graph);
    }
}

function pulseWhile(func, val, msec) {
    //runs [func] every [msec] milliseconds until func returns something other than [va]
    var d = new Deferred();
    var timeID;
    var pulser = function() {
	if (d.fired<0) {
	    var v = func();
	    if (v != val) {
		window.clearInterval(timeID);
		d.callback(v);
	    }
	}
	else {
	    window.clearInterval(timeID);
	}
    };
    timeID=window.setInterval(pulser,msec);
    return d;
}
var endRelaxing;
SvgGraph.Elements.Base.prototype.relax=function(){
    var self=this;
    /*
    var e = {p:self.graphs[0].chains[0].nodes[0],q:self.graphs[0].edges[3]};
    self.edgeModel.init(e);
    logDebug('SvgGraph.Elements.Base.prototype.relax breaks Efficient graph by temporarily making an edge to an edge for testing');
    self.graphs[0].addEdges([e]);
    */
    self.centerGraph(self);
    endRelaxing = pulseWhile(self.graphs[0].relax, true, self.throttle);
    pulseWhile(function() {
	self.updateView();
	return (endRelaxing.fired < 0);
    }, true,self.throttle*10);
    //endRelaxing.addCallback(partial(self.centerGraph,self));
}

function giveup() {
    endRelaxing.errback();
}

if (typeof(SvgGraph.Elements.Simple) == 'undefined') {
        SvgGraph.Elements.Simple = function(svgdoc, target) {
	    this.NAME="SvgGraph.Elements.Simple";
	    this.VERSION="0.2";
	    this.throttle = 30; //'conservative' default
	    this.__init__(svgdoc,target);
	}
	SvgGraph.Elements.Simple.prototype= new SvgGraph.Elements.Base();

	SvgGraph.Elements.Simple.prototype.addNodeView=function(myGraphVC, n, id){
	    if (!n.content.svgobj) {
		//if n.content.imgurl then make it an image
		//if n.content.label then make it a label
		//else just a circle/dot
		var attrs = (id) ? {id:id} : null;
		if (n.content.imgurl) {
		    logDebug('oops, img nodes not implemented yet!');
		}
		else if (n.content.label) {
		    n.content.svgobj=labelBox(attrs,n.content.label);
		}
		else {
		    update(attrs,{cx:n.x,cy:n.y,r:1});
		    n.content.svgobj=CIRCLE(attrs);
		}
	    }
	    myGraphVC.target.appendChild(n.content.svgobj);
	}
	SvgGraph.Elements.Simple.prototype.addNodeController=function(myGraphVC,n){
	    myGraphVC.drags.registerDraggable(n);
	    if (typeof(myGraphVC.graphs[0].toggleNodeView) == 'function') {
		n.content.svgobj.addEventListener(
		    "mousedown",
		    partial(function(n,g,evt) {	if (evt.shiftKey) g.toggleNodeView(n,g);}, n,myGraphVC.graphs[0]),false );
	    }
	}
	SvgGraph.Elements.Simple.prototype.addEdgeView=function(myGraphVC, e, id){
	    if (!e.content.svgobj) {
		var attrs = (id) ? {id:id} : null;
		e.content.svgobj=LINE(attrs);
	    }
	    myGraphVC.target.appendChild(e.content.svgobj);
	    myGraphVC.edgeModel.updateViewCoords(e);
	}
	SvgGraph.Elements.Simple.prototype.onAddGraph=function(graph){
	    var self = this;
	    //animId=window.setInterval(myGraphVC.graphs[last].relax,20);
	    //myGraphVC.graphs[last].relax();
	    var TIMEOUT=10000;
	    //window.setTimeout('window.clearInterval("'+animId+'");',TIMEOUT);
	    SvgDOM.scale(self.target, 0.6);
	    //window.setTimeout(partial(self.centerGraph,self),TIMEOUT/100);
	    //return null;//animId;
	    //add an interval where i'm also updating applyDxy
	}
}
	
