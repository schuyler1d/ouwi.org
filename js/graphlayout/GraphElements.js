/***

Graph Elements adapted from Alex Shapiro's ToughGraph TGGraphLayout
	See <http://www.touchgraph.com/>
Anything new is released under the GPL 3.0 or higher, (c) Schuyler Duveen

A Node has x,y,dx,dy

***/

if (typeof(dojo) != 'undefined') {
    dojo.provide("MochiKit.DOM");
    dojo.require("MochiKit.Iter");
}
if (typeof(JSAN) != 'undefined') {
    JSAN.use("MochiKit.Iter", []);
}

try {
    if (typeof(MochiKit.Iter) == 'undefined') {
        throw "";
    }
} catch (e) {
    throw "GraphElements depends on MochiKit.Iter!";
}

if (typeof(GraphNode) == 'undefined') {
    GraphNode = function () {
    };
}

GraphNode.prototype.NAME="GraphNode";
GraphNode.prototype.VERSION="0.2";

GraphNode.prototype.__repr__ = function () {
    return "[" + this.NAME + " " + this.VERSION + "]";
};
GraphNode.prototype.toString = function () {
    return this.__repr__();
};

GraphNode.prototype.init = function(n) {
    if (!n) {
	n={};
    }
    n.x=(n.x) ? n.x*1 : Math.random()*100;
    n.y=(n.y) ? n.y*1 : Math.random()*100;
    n.dx=0;
    n.dy=0;
    return n;
}

GraphNode.prototype.getXY = function (n) {
   /* Called by implementations processing coords e.g. updateSvgCoords*/
	return { x:n.x, y:n.y };
}

GraphNode.prototype.getDxy = function (n) {
   /* Called by RelaxEdges and UpdateNodeCoords */
    return { dx:n.dx, dy:n.dy };
}

GraphNode.prototype.setDxy = function (n, d) {
   /* Called by RelaxEdges and all those that do the same */
	n.dx= d.dx;
	n.dy= d.dy;
}
GraphNode.prototype.applyDxy = function (n, factor) {
   /* Called by UpdateNodeCoords and all those that do the same */
	n.x+= n.dx*factor;
	n.y+= n.dy*factor;
}

GraphNode.prototype.updateViewCoords = function (n) {
}

if (typeof(EdgeableNode) == 'undefined') {
    EdgeableNode = function () {
    };
}

EdgeableNode.prototype.NAME="EdgeableNode";
EdgeableNode.prototype.VERSION="0.2";

EdgeableNode.prototype.__repr__ = function () {
    return "[" + this.NAME + " " + this.VERSION + "]";
};
EdgeableNode.prototype.toString = function () {
    return this.__repr__();
};
EdgeableNode.prototype.init = GraphNode.prototype.init;
EdgeableNode.prototype.applyDxy = GraphNode.prototype.applyDxy;
EdgeableNode.prototype.updateViewCoords = GraphNode.prototype.updateViewCoords;

EdgeableNode.prototype.getXY = function(n) {
    var self = this;
    if ('p' in n) {
	var p = self.getXY(n.p);
	var q = self.getXY(n.q);
	return {x:(p.x+q.x)/2, y:(p.y+q.y)/2 };
    }
    else {
	return { x:n.x, y:n.y };
    }
}
EdgeableNode.prototype.getDxy = function(n) {
    var self = this;
    if ('p' in n) {
	var p = self.getDxy(n.p);
	var q = self.getDxy(n.q);
	n.dx = (p.dx+q.dx)/2;
	n.dy = (p.dy+q.dy)/2;
	return {dx:n.dx, dy:n.dy };
    }
    else {
	return { dx:n.dx, dy:n.dy };
    }
}
EdgeableNode.prototype.setDxy = function(n,d) {
    var self = this;
    if ('p' in n) {
	var p = self.getDxy(n.p);
	var q = self.getDxy(n.q);
	n.dx -= d.dx;
	n.dy -= d.dy;
	self.setDxy(n.p, {dx:p.dx-n.dx , dy:p.dy-n.dy});
	self.setDxy(n.p, {dx:p.dx-n.dx , dy:p.dy-n.dy});
    }
    n.dx = d.dx;
    n.dy = d.dy;
}

if (typeof(GraphEdge) == 'undefined') {
    GraphEdge = function () {
	//this.length=arguments[2]; //if we want to make weight a fundamental
    };
}

GraphEdge.prototype.init=function(e) {
}

if (typeof(GraphUtils) == 'undefined') {
    GraphUtils = {};
}

GraphUtils.NAME = "GraphUtils";
GraphUtils.VERSION = "0.1";
MochiKit.Base.update(GraphUtils, {
    __repr__: function () {
        return "[" + this.NAME + " " + this.VERSION + "]";
    },
    toString: function () {
        return this.__repr__();
    },
    nodePairIter: function (nodeArray) {
    /* this is generally for repelling nodes in an array */
	var i=0;
	var j=0;
        return {
            repr: function () { return "nodePairIter(...)"; },
            toString: MochiKit.Base.forward("repr"),
            next: function () {
		if (j >= nodeArray.length-1) {
                    if (i >= nodeArray.length-2) {
                    	throw MochiKit.Iter.StopIteration;
                    }
		    i++;
		    return [nodeArray[i], nodeArray[j=i+1] ]
		}
                return [nodeArray[i], nodeArray[j++] ]
            }
        };
    }
});

GraphUtils.loadJSON=function(gob) {
    /* gob should be something like:
       {nodes:[{id:'1',node:{content:{label:'blah'}}},{id:'2',node...}],
        edges:[{id:'a',p:'1',q:'2',edge:{content:{type:'good'}}}, ...]
       }
       This is a format that makes it easy to iterate over the nodes and metadata on them.
    */
    var nDict={};
    var n_i = gob.nodes.length;
    //only go through enough nodes to find the one we want.
    var _getNode = function(nid, all_the_way) {
	if (nid in nDict) return nDict[nid];
	while (--n_i >= 0) {
	    var nn=gob.nodes[n_i];
	    nDict[nn.id] = nn.node;
	    if (!all_the_way && nn.id ==nid) return nn.node;
	}
	//if (all_the_way) return; //is this right?
	//support for edges pointing to edges
	n_i = gob.edges.length;
	while (--n_i >= 0) {
	    var ee=gob.edges[n_i];
	    nDict[ee.id] = ee.edge;
	    if (!all_the_way && ee.id ==nid) return ee.edge;
	}
    }
    var _getNdict = function() {
	_getNode('',true);
	return nDict;
    }
    var edgeMap = function(ee) {
	if (typeof(ee.edge) == 'undefined') ee.edge = {};
	ee.edge.p = _getNode(ee.p);
	ee.edge.q = _getNode(ee.q);
	return ee;
    }
    update(gob,{nodeIter:iter(gob.nodes),edgeIter:imap(edgeMap,gob.edges),getNodeDict:_getNdict});
    return gob;
}

GraphUtils.Labels=function() {
    this.NAME = "GraphUtils.Labels";
    this.VERSION = "0.3";
    bindMethods(this);
}
GraphUtils.PersistantLabels=function() {
    this.NAME = "GraphUtils.PersistantLabels";
    this.VERSION = "0.3";
    this.nodes = {};
    this.edges = {};
    bindMethods(this);

    //pass graph to graphVC (for relax, getNodeEdges, setXY)
    //
    //set hooks for select, addEdge, nonDragging events
    
}
GraphUtils.PersistantLabels.prototype = new GraphUtils.Labels();


GraphUtils.Labels.prototype.newGraph=function(graphVC, graphClass) {
    var self = this;
    var g = new graphClass(graphVC);
    graphVC.addGraph(g);
    self.graph = g;
    self.graphVC = graphVC;
    return g;
}

GraphUtils.Labels.prototype.loadJSON=function(deferred, graph, graphVC) {
    //assumes the deferred object will return an eval'd JSON object
    var self=this;
    deferred.addCallback(GraphUtils.loadJSON);
    self.initLoader.apply(self,arguments);

}

GraphUtils.Labels.prototype.initLoader=function(def) {
    var self = this;
    //graphVC.addGraph(graph);

    def.addCallback(self.graphAdder);
    def.addCallback(bind(self.graph.initData, self.graph));
    def.addCallback(bind(self.graphVC.relax,self.graphVC));
}

GraphUtils.Labels.prototype.graphAdder=function(gob) {
    var self = this;
    self.graph.addNodes(ifilter(partial(self.nodeAdder,self), gob.nodeIter));
    self.graph.addEdges(ifilter(partial(self.edgeAdder,self), gob.edgeIter));
}

GraphUtils.Labels.prototype.nodeAdder=function(self, n_i) {
    self.graphVC.nodeModel.init(n_i.node, n_i.id);
    return true;
}
GraphUtils.Labels.prototype.edgeAdder=function(self, e_i) {
    self.graphVC.edgeModel.init(e_i.edge, ((typeof(e_i.id)!='undefined')?e_i.id:undefined) );
    return true;
}

GraphUtils.PersistantLabels.prototype.nodeAdder=function(self, n_i) {
    if (typeof(n_i.ref) != 'undefined' && n_i['ref'] in self.nodes) {
	self.nodes[n_i.id] = self.nodes[n_i.ref];
	delete self.nodes[n_i.ref];
	//updatetree fails with DOM nodes, but do we need this anyway?
	//updatetree(self.nodes[n_i.id], n_i.node);
	self.graphVC.nodeModel.init(self.nodes[n_i.id], n_i.id);
	return false;
    } else if (n_i.id in self.nodes) {
	//updatetree(self.nodes[n_i.id], n_i.node);
	return false;
    }
    self.graphVC.nodeModel.init(n_i.node, n_i.id);
    self.nodes[n_i.id] = n_i.node;
    return true;
}

GraphUtils.PersistantLabels.prototype.edgeAdder=function(self, e_i) {
    //nodes were constructed anew, so get rid of them
    if (e_i.p in self.nodes) e_i.edge.p = self.nodes[e_i.p];
    if (e_i.q in self.nodes) e_i.edge.q = self.nodes[e_i.q]; 

    if (typeof(e_i.ref) != 'undefined' && e_i['ref'] in self.edges) {
	self.edges[e_i.id] = self.edges[e_i.ref];
	delete self.edges[e_i.ref];
	//updatetree(self.edges[e_i.id], e_i.edge);
	self.graphVC.edgeModel.init(self.edges[e_i.id], e_i.id);
	return false;
    } else if (e_i.id in self.edges) {
	//updatetree(self.edges[e_i.id], e_i.edge);
	return false;
    }
    self.edges[e_i.id] = e_i.edge;
    self.graphVC.edgeModel.init(e_i.edge, ((typeof(e_i.id)!='undefined')?e_i.id:undefined) );
    return true;
}

GraphUtils.Labels.prototype.loadTouchGraph=function(deferred) {
    //@param deferred returning XMLHttpRequest obj
    var self=this;
    deferred.addCallback(partial(self._loadTouchGraph,self));
    deferred.addErrback(function(err){
	logError(err.message);
	logError(err.number);
	logError(err.description);
	logError(err.name);
	logError(err.toString());
    });
    
}
/*
    rdf:function(rdfxml) {
    }
*/
GraphUtils.Labels.prototype._loadJSON=function(self,gob /*graph object*/) { 
    //assumes objects in form:
    //{nodes:{'n1':{x:1,y:2},'n2':{x:3,y:4}},edges:{'e1':{p:'n1',q:'n2'},...}

    var i=gob.edges.length-1;
    gob.nedges = {};
    for (i in gob.edges) {
	p = gob.edges[i].p;
	q = gob.edges[i].q;
	gob.nedges[i] = {p:p , q:q};
	gob.edges[i].p = gob.nodes[p];
	//support for edges pointing to edges
	gob.edges[i].q = (q in gob.nodes) ? gob.nodes[q] : gob.edges[q];
    }
    return self._initData(self,gob);
}

GraphUtils.Labels.prototype._loadTouchGraph=function(self,resXML /*response XML*/) { 
    var gob={nodes:{},edges:{},nedges:{}};

    var tgxml=resXML.responseXML;

    var edges=tgxml.getElementsByTagName("EDGE");
    var nodes=tgxml.getElementsByTagName("NODE");
    for (i=0;i<nodes.length;i++) {
	id= nodes.item(i).getAttribute("nodeID");
	xy=nodes.item(i).getElementsByTagName('NODE_LOCATION');
	label=nodes.item(i).getElementsByTagName('NODE_LABEL');
	//url=nodes.item(i).getElementsByTagName('NODE_URL');
	//description=nodes.item(i).getElementsByTagName('NODE_HINT');
	gob.nodes[id]={content:{label:label.item(0).getAttribute('label')}, 
		       x:xy.item(0).getAttribute('x'),
		       y:xy.item(0).getAttribute('y') }
    }
    for (i=0;i<edges.length;i++) {
	from = edges.item(i).getAttribute("fromID");
	to = edges.item(i).getAttribute("toID");
	gob.nedges[i] = {p:from, q:to};
	gob.edges[i] = {p:gob.nodes[from],q:gob.nodes[to]};
    }
    return self._initData(self,gob);
}	


GraphUtils.Labels.prototype._initData=function(self,gob /*graph object*/) { 
    var nDict={};
    var nArray=[];
    //logDebug('initData edges:',gob.edges.length);
    for (a in gob.nodes) {
	n = gob.nodes[a];
	self.graphVC.nodeModel.init(n,a);  //init nodes
	nDict[a]=nArray.push(n)-1;
    }
    //init edges:
    var eArray=[];
    var eRefs=[];
    for (a in gob.edges) {
	e = gob.edges[a];
	if (self.checkEdge(e,a)) {
	    self.graphVC.edgeModel.init(e,a);
	    eArray.push(e);
	    eRefs.push(gob.nedges[a]);
	}
    }

    self.graph.addNodes(nArray, nDict);
    self.graph.addEdges(eArray, eRefs);

    //toggle chain nodes if they both exist and are supported
    if (gob.chain_nodes && self.graph.toggleNodeView) {
	//logDebug('found chain_nodes');
	var i=gob.chain_nodes.length;
	while (i--) {
	    //logDebug('toggle chain_node loop');
	    self.graph.toggleNodeView(gob.nodes[gob.chain_nodes[i]]);
	}
    }
    self.graph.initData();
    /* //consider: this way no one is obligated to remember the information
    delete nDict; 
    delete gob.nedges;
    */

    //logDebug('start relaxing');
    self.graphVC.relax();
    //logDebug('finish initData');
    return gob;
}

GraphNode.prototype.EXPORT = [
    "getXY",
    "getDxy",
    "setDxy"
];

GraphNode.EXPORT_OK = [
];

GraphNode.EXPORT_TAGS = {
        ":common": GraphNode.EXPORT,
        ":all": MochiKit.Base.concat(GraphNode.EXPORT, GraphNode.EXPORT_OK)
};

MochiKit.Base._exportSymbols(this, GraphNode);
