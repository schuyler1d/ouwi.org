/***

HtmlGraph is released under the GPL 3.0 or higher, (c) Schuyler Duveen

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
    if (typeof(SvgGraph) == 'undefined') {
        throw "";
    }
} catch (e) {
    throw "HtmlGraph depends on GraphElements and SvgGraph!";
}

if (typeof(HtmlGraph) == 'undefined') {
    HtmlGraph = {
	NAME:"HtmlGraph",
	VERSION:"0.2",
	Elements:{}
    };
}


if (typeof(HtmlNode) == 'undefined') {
    HtmlNode = function () {
	this.NAME="HtmlNode";
	this.VERSION="0.2";
    };
}

HtmlNode.prototype= new GraphNode();
HtmlNode.prototype.parent = GraphNode.prototype;

HtmlNode.prototype.NAME="HtmlNode";
HtmlNode.prototype.VERSION="0.2";

HtmlNode.prototype.init=function(n) {
    this.parent.init(n);
    if (!n.content) {
	n.content={};
    }
    if (!n.content.htmlobj) {
	n.content.htmlobj=DIV();
    }
    //add to svgdoc

}

HtmlNode.prototype.applyDxy = function (n,factor) {
    this.parent.applyDxy(n,factor);
    this.updateViewCoords(n);
}

HtmlNode.prototype.updateViewCoords=function(n) {
    setElementPosition(n.content.htmlobj,n.x,n.y);
}


if (typeof(SvgEdge) == 'undefined') {
    SvgEdge = function (target) {
	this.NAME="SvgEdge";
	this.VERSION="0.1";
	this.init=partial(this._init,this,target);
	//this.length=arguments[2]; //if we want to make weight a fundamental
    };
}

SvgEdge.prototype._init=function(self,target, e) {
    if (!e.content) {
	e.content={};
    }
    if (!e.content.svgobj) {
	e.content.svgobj=LINE(null);
    }
    self.updateViewCoords(e);
    target.appendChild(e.content.svgobj);
}

SvgEdge.prototype.updateViewCoords=function(e) {
    SvgDOM.placeXY(e.content.svgobj,e.p.x,e.p.y,0);
    SvgDOM.placeXY(e.content.svgobj,e.q.x,e.q.y,1);
}


if (typeof(HtmlGraph.Elements) == 'undefined') {
    HtmlGraph.Elements = {
	NAME:"HtmlGraph.Elements",
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

HtmlGraph.Elements.Base=function() {
    this.__init__=function(svgdoc,ntarget,etarget) {
        this.svgdoc=svgdoc;
	SvgDOM._document=svgdoc;
	if (etarget) {
	    if (typeof(etarget) == 'string') {
		this.target=this.svgdoc.getElementById(etarget);
	    }
	    else {
		this.target=etarget;
	    }
	}
	else {
	    x=G({id:'simpleTarget'});
	    svgdoc.documentElement.appendChild(x);
	    this.target=x;
	}
	this.nodetarget=ntarget;
	this.nodeModel=new HtmlNode();
	this.edgeModel=new SvgEdge(this.target);
	this.drags=new SvgDOM.DragAndDrop(); //eventually per graph
	this.drags.getTarget=function(obj){return obj.content.svgobj;};
	this.drags.startDrag=partial(function(myGraphVC,obj,evt) {
	    dragEdges={p:[],q:[]}; //is it bad to make this a global var?
	    myGraphVC.graphs[0].getNodeEdges.visible.apply(myGraphVC.graphs[0],[obj,dragEdges]);
	},this);
	this.drags.mouseLens=function(obj,x,y){  //i.e. ondrag
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
	    return {x:x,y:y};
	};
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
    }
    this.graphs=[];
}

HtmlGraph.Elements.Base.prototype.centerGraph=function(myGraphVC) {
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
    x_avg=avg_data[0]/avg_data[2];
    y_avg=avg_data[1]/avg_data[2];
    SvgDOM.placeXY(myGraphVC.target,x_avg,y_avg);
}

HtmlGraph.Elements.Base.prototype.addGraph=function(graph){
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

HtmlGraph.Elements.Base.prototype.relax=function(){
    var self=this;
    var d = pulseWhile(self.graphs[0].relax, true, self.throttle);
}


if (typeof(HtmlGraph.Elements.Simple) == 'undefined') {
        HtmlGraph.Elements.Simple = function(svgdoc, ntarget, etarget) {
	    this.NAME="HtmlGraph.Elements.Simple";
	    this.VERSION="0.2";
	    this.throttle = 300; //'conservative' default
	    this.__init__(svgdoc, ntarget, etarget);
	}
	HtmlGraph.Elements.Simple.prototype= new HtmlGraph.Elements.Base();

	HtmlGraph.Elements.Simple.prototype.addNodeView=function(myGraphVC, n, label){
	    if (!n.content.htmlobj) {
		//if n.content.imgurl then make it an image
		//if n.content.label then make it a label
		//else just a circle/dot
		if (n.content.imgurl) {
		    logDebug('oops, img nodes not implemented yet!');
		}
		else if (label || n.content.label) {
		    label = (label) ? label : n.content.label;
		    n.content.htmlobj=DIV(null,label);
		}
		else {
		    n.content.htmlobj=DIV(null,'o');
		}
	    }
	    myGraphVC.nodetarget.appendChild(n.content.htmlobj);
	}
	HtmlGraph.Elements.Simple.prototype.addNodeController=function(myGraphVC,n){
	    myGraphVC.drags.registerDraggable(n);
	    if (typeof(myGraphVC.graphs[0].toggleNodeView) == 'function') {
		n.content.htmlobj.addEventListener(
		    "mousedown",
		    partial(function(n,g,evt) {	if (evt.shiftKey) g.toggleNodeView(n,g);}, n,myGraphVC.graphs[0]),false );
	    }
	}
	HtmlGraph.Elements.Simple.prototype.onAddGraph=function(graph){
	    var self = this;
	    //animId=window.setInterval(myGraphVC.graphs[last].relax,20);
	    //myGraphVC.graphs[last].relax();
	    var TIMEOUT=10000;
	    //window.setTimeout('window.clearInterval("'+animId+'");',TIMEOUT);
	    SvgDOM.scale(self.target, 0.6);
	    window.setTimeout(partial(self.centerGraph,self),TIMEOUT/100);
	    //return null;//animId;
	    //add an interval where i'm also updating applyDxy
	}
}
	
