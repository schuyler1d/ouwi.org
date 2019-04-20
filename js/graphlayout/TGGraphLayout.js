/***

Graph Layout adapted from Alex Shapiro's ToughGraph TGGraphLayout
	See <http://www.touchgraph.com/>
Anything new is released under the GPL 3.0 or higher, (c) Schuyler Duveen

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
    throw "GraphLayout depends on MochiKit.Iter!";
}

function TGDamper(nodeModel,damper) {
    this.nodeModel = nodeModel;
    this.origDamper = (damper) ? damper :0.85;
    this.reset();
}

TGDamper.prototype.reset = function () {
    this.damper = this.origDamper;
    this.lastMaxMotion=0.0;
    this.maxMotion=0.0;
    this.motionRatio=0.0;
    this.damping=true;
    this.dampPhase=0;

    this.nodes = [];

    return this.damper;
}


TGDamper.prototype.startRound = function(nIter) {
    this.nodes = list(nIter);

    this.lastMaxMotion = self.maxMotion;
    this.maxMotion = 0.0;
    return 666; //name of round is always the same
}

TGDamper.prototype.finishRound = function(round) {
    var self = this;
    forEach(this.nodes,function(n) {
	var dn = self.nodeModel.getDxy(n);
	self.maxMotion = Math.max(self.maxMotion, dn.dx);
    });
    //subtract 1 to make a positive value mean that things move faster
    self.motionRatio =(self.maxMotion>0)?self.lastMaxMotion/self.maxMotion-1:0;
    
}

if (typeof(TGGraphLayout) == 'undefined') {
    TGGraphLayout = function(/*optional*/ nodeModel, damper, range) {
	this.nodeModel= (nodeModel) ? nodeModel : null;
	this.rigidity=1;
	switch (typeof(damper)) {
	case 'number':
	case 'undefined':
	    this.DampMgr = new TGDamper(nodeModel, damper);
	    break;
	case 'function':
	case 'object':
	    this.DampMgr = damper;
	    break;
	}

	//x//this.origDamper = (damper) ? damper :0.85;
	this.damper = this.DampMgr.reset();
	this.range = (range) ? range : 90000; //when nodes go out of range of influence

	this.NAME= "TGGraphLayout";
	this.VERSION = "0.2";

	this._relaxEdge=bind(this.__relaxEdge, this,this);
	this._repelNodes=bind(this.__repelNodes, this,this);
	this._updateNodeCoords=bind(this.__updateNodeCoords, this,this);
    };
}

TGGraphLayout.prototype.__repr__ = function () {
    return "[" + this.NAME + " " + this.VERSION + "]";
};
TGGraphLayout.prototype.toString = function () {
    return this.__repr__();
};

TGGraphLayout.prototype.EXPORT = [
    "relaxEdges",
    "repelNodes",
    "updateNodeCoords",
    //x//"startDamper",
    //x//"stopDamper",
    //x//"damp",
    "stress",
    "relax"
];

TGGraphLayout.prototype.EXPORT_OK = [
];
/*//xx
TGGraphLayout.prototype.resetDamper = function () {
    this.damper = this.origDamper;
    this.lastMaxMotion=0.0;
    this.maxMotion=0.0;
    this.motionRatio=0.0;
    this.damping=true;
    this.dampPhase=0;
}
*/

TGGraphLayout.prototype.__relaxEdge = function (self, e) {
    var p=self.nodeModel.getXY(e.p);
    var q=self.nodeModel.getXY(e.q);
    
    var dx = q.x - p.x;
    var dy = q.y - p.y;
    var len = Math.sqrt(dx * dx + dy * dy);
    
    dx *= self.rigidity;
    dy *= self.rigidity;

    var elength=(e.length) ? e.length : 40;
    dx /=(elength*100);
    dy /=(elength*100);
    
    //current dXY
    var dp=self.nodeModel.getDxy(e.p);
    var dq=self.nodeModel.getDxy(e.q);

    //change dXY
    dq.dx -= dx*len;
    dq.dy -= dy*len;
    dp.dx += dx*len;
    dp.dy += dy*len;

    //final setting
    self.nodeModel.setDxy( e.q, dq );
    self.nodeModel.setDxy( e.p, dp );
}
TGGraphLayout.prototype.__repelNodes = function (self, v /*node Array(2)*/, range) {
    //logDebug('entering __repelNodes',v[0].content.label,v[1].content.label);
    range = (range) ? range*range : self.range;
    var v0 = self.nodeModel.getXY(v[0]);
    var v1 = self.nodeModel.getXY(v[1]);
    var dx = v0.x - v1.x;
    var dy = v0.y - v1.y;
    var len = dx * dx + dy * dy;  /* length squared */
    //logDebug('len',len);
    if (len == 0) {
	//If two nodes are right on top of each other, randomly separate
	dx = Math.random()*5; 
	dy = Math.random()*5;
    } else if (len < range) { /* RANGE=300 */
	dx *= range/len/self.range; 
	dy *= range/len/self.range; 
    } else { return; }
    //logDebug('dx',dx);

    var repSum = 100;  //future: repSum = m.repulsion * n.repulsion/100;
    
    var dm=self.nodeModel.getDxy(v[0]);
    var dn=self.nodeModel.getDxy(v[1]);
    
    dm.dx += dx*repSum*self.rigidity;
    dm.dy += dy*repSum*self.rigidity;
    dn.dx -= dx*repSum*self.rigidity;
    dn.dy -= dy*repSum*self.rigidity;
    
    self.nodeModel.setDxy( v[0], dm );
    self.nodeModel.setDxy( v[1], dn );
}
TGGraphLayout.prototype.__updateNodeCoords = function (self, n) {
    //logDebug('updateNodeCoords for:',n.content.label);
    var dn = self.nodeModel.getDxy(n);
    dn.dx *= self.damper;
    dn.dy *= self.damper;
    //x//self.maxMotion = Math.max(self.maxMotion, dn.dx);
    //logDebug('TGGraphLayout.prototype.__updateNodeCoords', self.maxMotion, dn.dx,dn.dy);
    self.nodeModel.setDxy(n,dn);
    self.nodeModel.applyDxy(n, 1);
}
TGGraphLayout.prototype.relaxEdges = function (iedges /*iterator*/) {
    var self = this;
    MochiKit.Iter.forEach(iedges, self._relaxEdge);
}
TGGraphLayout.prototype.repelNodes = function (inodepairs /*iterator*/) {
    var self = this;
    MochiKit.Iter.forEach(inodepairs, self._repelNodes);
}

TGGraphLayout.prototype.repelNodesFarRange = function (inodepairs /*iterator*/, range) {
    var self = this;
    MochiKit.Iter.forEach(inodepairs, function(v) {self.__repelNodes(self,v,range); });
}

TGGraphLayout.prototype.updateNodeCoords = function (inodes /*iterator*/) {
    var self = this;
    var nIters = tee(inodes, 2);

    var round = self.DampMgr.startRound(nIters[0]);

    MochiKit.Iter.forEach(nIters[1], self._updateNodeCoords);

    self.DampMgr.finishRound(round);

    self.damp();
    //logDebug('TGGraphLayout.prototype.updateNodeCoords damper=',self.damper, self.maxMotion, self.motionRatio);
    return (self.damper > 0); //returns whether damping has not yet obliterated movement
}

TGGraphLayout.prototype.startDamper = function () {
    this.damper = this.DampMgr.startDamper();
}
TGGraphLayout.prototype.stopDamper = function () {
    this.damper = this.DampMgr.stopDamper();
}
TGGraphLayout.prototype.damp = function () {
    this.damper = this.DampMgr.damp();
}

TGDamper.prototype.startDamper = function () {
    this.damping = true;
    return this.damper;
}

TGDamper.prototype.stopDamper = function () {
    this.damping = false;
    this.damper = 1.0;
    return this.damper;
}
TGDamper.prototype.damp = function () {
    var self = this;
    if (self.damping) {
	if(self.motionRatio<=0.001) {  
	    /* This is important.  Only damp when the graph starts to move faster
	     * When there is noise, you damp roughly half the time. (Which is a lot)
	     * If things are slowing down, then you can let them do so on their own,
	     * without damping.
	     * If maxMotion<0.2, damp away
	     * If by the time the damper has ticked down to 0.9, maxMotion is still>1, damp away
	     * We never want the damper to be negative though
	     */
	    if ((self.maxMotion<0.5 || (self.maxMotion>1 && self.damper<0.6)) && self.damper > 0.01) {
		self.damper -= 0.001;
		self.dampPhase = 1;
	    }
	    else if (self.maxMotion<0.6 && self.damper > 0.003) {
		//If we've slowed down significanly, damp more aggresively (then the line two below)
		self.damper -= 0.003; //used to be .003
		self.dampPhase = 2;
	    }
	    else if(self.damper>0.0001) {
		//If max motion is pretty high, and we just started damping, then only damp slightly
		self.damper -=0.0001; //used to be .0001
		self.dampPhase = 3;
	    }
	}
	if(self.maxMotion<0.4) {
	    self.dampPhase = 0;
	    self.damper=0;
	}
    }
    return self.damper;
}

TGGraphLayout.prototype.stress = function (iedges,inodepairs) {
    var self = this;
    var forEach = MochiKit.Iter.forEach;
    forEach(iedges, self._relaxEdge);
    forEach(inodepairs, self._repelNodes);
}
TGGraphLayout.prototype.relax = function (iedges,inodepairs,inodes) {
    var self = this;
    var forEach = MochiKit.Iter.forEach;

    forEach(iedges, self._relaxEdge);
    forEach(inodepairs, self._repelNodes);

    return self.updateNodeCoords(inodes); //returns whether damping has not yet obliterated movement
}


TGGraphLayout.prototype.__new__= function () {
    this.EXPORT_TAGS = {
        ":common": this.EXPORT,
        ":all": MochiKit.Base.concat(this.EXPORT, this.EXPORT_OK)
    };
    this.damper=1.0;
    //this.nodeModel= null;
}

//TGGraphLayout.__new__();

//MochiKit.Base._exportSymbols(this, TGGraphLayout);
