/***
    RayChainHybrid is a graph has two modes for a node:
    1) where it's edges are rays from the node, -OR-
    2) where its edges are a chain with the node as its head

***/

try {
    if (typeof(GraphNode) == 'undefined') {
        throw "";
    }
    if (typeof(TGGraphLayout) == 'undefined') {
        throw "";
    }
} catch (e) {
    throw "SvgGraph depends on GraphElements and TGGraphLayout!";
}

if (typeof(RayChainHybrid) == 'undefined') {
    RayChainHybrid = function (model, options) {
	//	this.loneNodes=[];
	options = (options) ? options : {};
	this.edges=[]; /*  {p, q, content, head (only for chain edges) } */
	this.chains=[ {'nodes':[]} ] /* chains[0] are unchained loneNodes */
 /* {x, y, content, chain_index (ref to array index), chain_member  } */
	this.nodeModel=model.nodeModel;
	this.edgeModel=model.edgeModel;
	var range = ('range' in options) ? options.range: undefined;
	this.tgLayout=new TGGraphLayout(this.nodeModel, 0.7, range);
	this.chainLayout=new ChainLayout(this.nodeModel);
	this.NAME="RayChainHybrid";
	this.VERSION="0.1";
	//needs to know who they are
	this.relax=partial(this._relax,this);
    };
}

RayChainHybrid.prototype.constructSeconds=function() {
xf
}
RayChainHybrid.prototype.addNodes=function(nArray/*, nDict*/) {
    var self = this;
    //var start = self.chains[0].nodes.length;
    MochiKit.Base.extend(self.chains[0].nodes,imap(itemgetter('node'),nArray));
    //why do we need this?  DEPRECATE!!!
    /*
    if (arguments > 1) {
        for (a in nDict) {
	    nDict[a] += start;
	}
    }
    */
}
RayChainHybrid.prototype.addEdges=function(eArray) {
    var self=this;
    MochiKit.Base.extend(self.edges,imap(itemgetter('edge'),eArray));
}
RayChainHybrid.prototype.addChains=function(cArray) {
    var self=this;
    MochiKit.Base.extend(self.chains,cArray);
}
RayChainHybrid.prototype.initData=function() {
}
RayChainHybrid.prototype.removeEdge=function(metaE) {
    var self=this;
    var i = self.edges.length;
    while (--i >= 0) {
	if (self.edges[i]==metaE.edge) {
	    self.edges.splice(i,1);
	    return;
	}
    }
    //TODO: ALSO SEARCH CHAINS
    logDebug('raychainhyprid.removeEdge todo: also search chains');
}
var times = 0;
RayChainHybrid.prototype._relax=function(self) {
    //var t=[new Date().getTime()];
    var done;

    self.tgLayout.stress( iter(self.edges), self._unRelatedNodePairs());
    //t.push(new Date().getTime()); //1
    var i=self.chains.length;
    var c;
    while (--i > 0) {
	c=self.chains[i];
	self.chainLayout.relax(c, self.tgLayout);
	if (self.tgLayout.maxMotion < 500 ) 
	    self.tgLayout.relaxEdges(self._chainEdgeIter(c) );
    } 
    //t.push(new Date().getTime()); //2
    var notdone = self.tgLayout.updateNodeCoords(self.getNodes() );
    if (!notdone) {
	self.tgLayout.resetDamper();
    }
    //t.push(new Date().getTime()); //3
    //logDebug('Times:',++times,t[t.length-1]-t[0],t[1]-t[0],t[2]-t[1],t[3]-t[2]);
    return notdone;
}

RayChainHybrid.prototype.toggleNodeView=function(n,self) {
    if (!self) {
	self=this;
    }
    var suspendrelax=self.relax;
    self.relax=function(){return true};
    var i;
    if ('chain_index' in n && n['chain_index'] > 0) {
	//logDebug('toggleNodeView to rays. current chains:',self.chains.length,n.content.label);
	//node is a chain
	var c=self.chains[n.chain_index];
	i=c.nodes.length-1;
	do {
	    self.edges.push({p:n,q:c.nodes[i],content:c.edgeContents[i-1]});
	} while (--i);
	self.chains.splice(n.chain_index,1);
	for(i=n.chain_index; i<self.chains.length; i++) {
	    --self.chains[i].nodes[0].chain_index;
	}
	delete n['chain_index'];
	self.chains[0].nodes.push(n);
    }
    else {
	//logDebug('toggleNodeView to chain. current chains:',self.chains.length,n.content.label);
	i=self.chains[0].nodes.length;
	do {
	    if (--i < 0) {return;}
	} while (n!=self.chains[0].nodes[i]);
	self.chains[0].nodes.splice(i,1);
	n.chain_index=self.chains.push({nodes:[n],edgeContents:[]}) -1;
	var c=self.chains[n.chain_index];
	i=self.edges.length-1;
	var e;
	do {
	    if (n==self.edges[i].p) {
		se=self.edges.splice(i,1);
		e=se[0];  //splice returns an array
		c.nodes.push(e.q);
		c.edgeContents.push(e.content);
		//if we were worrying about memory mgmt, how to delete e, without content,p,q?
	    }
	    else if (n==self.edges[i].q) {
		se=self.edges.splice(i,1);
		e=se[0];
		c.nodes.push(e.p);
		c.edgeContents.push(e.content);
	    }
	} while (i--);
    }
    self.relax=suspendrelax;
    //logDebug('end toggleNodeView current chains:',self.chains.length);
}

RayChainHybrid.prototype.getEdges=function() {
    var self=this;
    var e_iter = iter(self.edges);
    var i=self.chains.length;
    var c;
    while (--i > 0) {
	c=self.chains[i];
	//logDebug(self.tgLayout.dampPhase, self.tgLayout.maxMotion);
	e_iter = chain(e_iter, self._chainEdgeIter(c) );
    }
    return e_iter;
}

RayChainHybrid.prototype.getNodes=function() {
    /* see comment in _unRelatedNodePairs to see why we just need the left wall and chains[0].nodes
     */
    var c=this.chains;
    var i=c.length+c[0].nodes.length-1;
    return {
	next: function () {
	    --i;
	    //logDebug('XXX getNodes',i);
	    if (i < c[0].nodes.length) {
		//logDebug(c[0].nodes.length,c.length,i,c[0].nodes.length + c.length -1);
		
		if (i < 0) {
		    //logDebug('   all done');
		    throw MochiKit.Iter.StopIteration;
		}
		//logDebug('   on the left wall ',i);
		return c[0].nodes[i];
	    }
	    //logDebug('   first chain');
	    return c[i-c[0].nodes.length+1].nodes[0];
	}
    }
}

RayChainHybrid.prototype._unRelatedNodePairs=function() {
    /*  Chains is sort of a 2d array (w/ a .nodes thrown in there) where chains[0].nodes 
     *     are the unrelated nodes and chains[1..].nodes are the chains.
     *  But a non-head node can be on multiple chains, so we need to 
     *     get all 2-combinations by climbing down the _left_ wall 
     *     of the 2d array without going into each chain and then
     *     along the chains[0] row
     *  Thus, we only need two vars, since i,j will just mean 
     *     chains[i-chains[0].nodes.length+1] 
     *     before it goes through chains[0].nodes.length
     */
    var c=this.chains;
    var xlen=c[0].nodes.length;
    //logDebug('init for unrelataednodepairs:',xlen,ylen);
    var i=xlen+c.length-1;
    var j=0;
    return {
	next: function () {
	    if (j <= 0) {
		--i;
		j=i-1;
		//logDebug('j done with this i',i,j);
		if (i <= 0 ) {
		    //logDebug('all done');
		    throw MochiKit.Iter.StopIteration;
		}
	    }
	    else {
		--j;
	    }
	    if (i < xlen) {
		return [ c[0].nodes[i],c[0].nodes[j] ];
	    }
	    if (j < xlen) {
		return [ c[i-xlen+1].nodes[0],c[0].nodes[j] ];
	    }
	    return [ c[i-xlen+1].nodes[0],c[j-xlen+1].nodes[0] ];
	}
    }
}

	    /******************
            HOW TO PARSE THE WHOLE 2D ARRAY IF WE ACTUALLY HAD TO (BUT THIS IS WRONG)
	    //c=d=0 is the base i/j case
	    if (j >= self.chains[d].nodes.length-1) {  //-1 because it will get inc'd at bottom
		if (i >= self.chains[c].nodes.length-2) {
		    if (d >= self.chains.length-1) {
			if (c >= self.chains.length-2) {
			    throw MochiKit.Iter.StopIteration;
			}
			c++;
			i=j=0;
			return [ self.chains[c].nodes[i], self.chains[d=c+1].nodes[j] ];
		    }
		    i=j=0;
		    ++d;
		    return [ self.chains[c].nodes[i], self.chains[d].nodes[j] ];
		}
		i++;
		if (d==0) {
		    return [self.chains[c].nodes[i], self.chains[d].nodes[j=i+1] ];
		}
		return [self.chains[c].nodes[i], self.chains[d].nodes[j=0] ];
	    }
	    ++j;
	    return [self.chains[c].nodes[i], self.chains[d].nodes[j] ]
	    ***********************************/

RayChainHybrid.prototype._chainEdgeIter=function (chain) {
    var i=0;
    return {
	next: function () {
	    if (++i >= chain.nodes.length) {
		throw MochiKit.Iter.StopIteration;
	    }
	    return {p:chain.nodes[i-1],q:chain.nodes[i],content:chain.edgeContents[i-1]};
	}
    }
}


RayChainHybrid.prototype.getNodeEdges={
    relax:function(n,r){ return this._getNodeEdges(n,r,'relax'); },
    model:function(n,r){ return []; },
    visible:function(n,r){ return this._getNodeEdges(n,r,'visible'); }
};



RayChainHybrid.prototype._getNodeEdges=function(n, relations, ntype) {
    /** relations: e.g. if you want the p's and q's then send { p:[] , q:[] }
	ntype: 'relax', 'model', 'visible'     
	returns array
    **/
    var self=this;
    var nedges=[];
    var i=self.edges.length;
    while (--i >= 0) {
	for (a in relations) {
	    if (n==self.edges[i][a]) {
		relations[a].push(self.edges[i]);
	    }
	    else if ('p' in self.edges[i].q) {
		//for edgeable nodes
		if ('extra' in relations) {
		    relations.extra.push(self.edges[i]);
		} else {
		    relations.extra = [ self.edges[i] ];
		}
	    }

	}
    } 

    i=self.chains.length;
    while (--i > 0) {
	logDebug('getNodeEdges',i);
	var c=self.chains[i];
	var j=c.nodes.length -1;
	do {
	    if ( n==c.nodes[j] ) {
		if ('p' in relations && c.nodes.length > j+1) {
		    relations['p'].push({p:n,q:c.nodes[j+1],content:c.edgeContents[j]});
		}
		if ('q' in relations && j > 0) {
		    relations['q'].push({p:c.nodes[j-1],q:n,content:c.edgeContents[j-1]});
		}
	    }
	}
	while (j--);
    } 
    return relations;
}
