/***

ChainLayout  - rearranges the nodes in a chain based on other 
               stresses on the nodes, keeping the chain as
	       linear as possible
Released under the GPL 3.0 or higher, (c) Schuyler Duveen

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

if (typeof(ChainLayout) == 'undefined') {
    ChainLayout = function(nodeModel){
	this.nodeModel= (nodeModel) ? nodeModel : null;
	this.rigidity=1;
	this.NAME= "ChainLayout";
	this.VERSION = "0.2";
    };
}

ChainLayout.prototype.__repr__ = function () {
    return "[" + this.NAME + " " + this.VERSION + "]";
};
ChainLayout.prototype.toString = function () {
    return this.__repr__();
};

ChainLayout.prototype.flip = function (chain, i, j) {
    var c={n:chain.nodes[i],e:chain.edgeContents[i]};
    chain.nodes[i]=chain.nodes[j];
    chain.edgeContents[i]=chain.edgeContents[j];
    //logDebug(i,c.e, chain.edgeContents[i]);
    chain.nodes[j]=c.n;
    chain.edgeContents[j]=c.e;

    //and now the true coordinates flip:
    /*
      var x = c.n.x;
      var y = c.n.y;
      c.n.x = chain.nodes[i].x;
      c.n.y = chain.nodes[i].y;
      chain.nodes[i].x = x;
      chain.nodes[i].y = y;
    */
}

ChainLayout.prototype.sqdist = function (n1, n2) {
    /* distance squared between nodes */    
    var p=this.nodeModel.getXY(n1);
    var q=this.nodeModel.getXY(n2);
    var dx= q.x -p.x;
    var dy= q.y -q.x;
    return (dx * dx + dy * dy);
}

ChainLayout.prototype.relaxEdge = function (i) {

}

ChainLayout.prototype.relax = function (chain, dmp) {
    motion = dmp.maxMotion;
    var self = this;
    var n=chain.nodes;
    var i=n.length - 2;  //-2 because the loop refers to i+1
    if (motion < 50) {
	/* Rearrange Chain
	   shouldn't happen when motion is too volatile--waste time switching
	   shouldn't matter at end, when straightening forces will make it unlikely
	*/
	var near;
	var far;
	while (--i > 0) {
	    near=self.sqdist(n[i],n[i+1]); //dist of neighbor
	    far=self.sqdist(n[i-1],n[i+1]); //dist of neighbor's neighbor
	    if (far < near-250) {
		self.flip(chain, i, i+1);
	    }
	    dp=self.nodeModel.getDxy(n[i]);
	    self.nodeModel.setDxy(n[i],{dx:dp.dx/10 ,dy:dp.dy/10});
	}
	dp=self.nodeModel.getDxy(n[n.length-1]);
	self.nodeModel.setDxy(n[n.length-1],{dx:dp.dx/10 ,dy:dp.dy/10});
	dp=self.nodeModel.getDxy(n[0]);
	self.nodeModel.setDxy(n[0],{dx:dp.dx/10 ,dy:dp.dy/10});
    }
    if (motion < 5) {
	/* Straighten Chain
	   should damp enough (fast and long) to stop it
	   running toward head node off screen
	 */
	var n0 = self.nodeModel.getXY(n[0]);
	var nLast = self.nodeModel.getXY(n[n.length-1]);
	var dx = nLast.x - n0.x;
	var dy = nLast.y - n0.y;
	i = n.length -1;
	var p;
	var dp;
	var dq;
	do {
	    p = self.nodeModel.getXY(n[i]);
	    dq = {dx:(n0.x+dx*i/(n.length-1)-p.x),
		  dy:(n0.y+dy*i/(n.length-1)-p.y)};
	    dpOld = self.nodeModel.getDxy(n[i]);
	    
	    self.nodeModel.setDxy( n[i], dq );
	    self.nodeModel.applyDxy(n[i], 1);
 
	    self.nodeModel.setDxy( n[i], {dx:dpOld.dx/1000,dy:dpOld.dy/1000} );
	} while (--i);
	/* Decelerate: the smaller damper gets the more it damps
	   graph basically stops when damper is .6, so -.5 is safe
	*/
	dmp.damper = dmp.damper - .001;
    }
    /*
    n[0].x=200;
    n[0].y=200;
    n[n.length-1].x=600;
    n[n.length-1].y=300;
    */
}

