/***


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

if (typeof(EfficientGraph) == 'undefined') {
    EfficientGraph = function (model) {
	//	this.loneNodes=[];

	this.throttle = 10; //this is used by the GraphVC.  We can make it low, since it's a linear algorithm
	this.nodes=[];
	this.nodeP=[]; // same index as nodes with each an array of edges
	this.nodeQ=[]; //? duplicate of nodeP, except backwards
	this.seconds=[]; //also same index.  this is the unduplicated set of 2nd-neighbor relations (should be <2m)

	this.edges=[]; /*  {p, q, content, head (only for chain edges) } */
	this.chains=[ {'nodes':[], 'seconds':[], 'p':[], 'q':[], 'edgeContents':[]} ] /* chains[0] are unchained loneNodes */
	//'edgeContents' corresponds to the 'q' edges
	/* {x, y, content, chain_index (ref to array index), chain_member  } */
	this.nodeModel=model.nodeModel;
	this.edgeModel=model.edgeModel;
	this.tgLayout=new TGGraphLayout(this.nodeModel, 0.83);
	this.chainLayout=new ChainLayout(this.nodeModel);
	this.NAME="EfficientGraph";
	this.VERSION="0.1";
	//needs to know who they are
	this.relax=partial(this._relax,this);
	this.tempNodeDict = {};
    };
}

EfficientGraph.prototype.constructSeconds=function() {

}
EfficientGraph.prototype.addNodes=function(nArray) {
    var self=this;
    var nlen = 0;
    forEach(nArray, function(n_i) {
	/*should be done elsewhere in a function passed to the graph
	  giving it the dict from getNodeDict in GraphElements
	 */
	self.tempNodeDict[n_i.id] = self.chains[0].nodes.push(n_i.node) -1;
	++nlen;
    });
    //extend(self.chains[0].nodes,nArray);
    var i;
    for (i=0; i<nlen; i++) {
	self.chains[0].p.push([]);
	self.chains[0].q.push([]);
	self.chains[0].seconds.push([]);
	self.chains[0].edgeContents.push([]);
    }
    //if (nDict) self.tempNodeDict = nDict;
}

EfficientGraph.prototype.addEdges=function(eArray) {
    logDebug('addEdges');
    var self=this;
    var c = self.chains[0];
    /*
    if (typeof(eRefs) == 'undefined' || typeof(self.tempNodeDict) == 'undefined') {
	throw "References needed to correlate Nodes and Edges";
    }//*/
    var p;
    var q;
    forEach(eArray, function(e_i) {
	p = self.tempNodeDict[e_i.p];
	q = self.tempNodeDict[e_i.q];
	c.edgeContents[q].push(e_i.edge.content);
	c.q[q].push(p);
	c.p[p].push(q);
    });
    logDebug('end addEdges');
}

EfficientGraph.prototype.addNodeEdges=function(nIndex, nArray, eContentArr) {
    var self=this;
    var c = self.chains[0];
    //logDebug('addnodeedges');
    var start = c.q[nIndex].length;

    MochiKit.Base.extend(c.q[nIndex],nArray);

    MochiKit.Base.extend(c.edgeContents[nIndex],eContentArr);
    var i;
    var p=c.p;
    var q=c.q;
    for (i=q[nIndex].length-1; i >= start; --i) {
	var pInd=q[nIndex][i];
	p[ pInd ].push(nIndex);
    }
}

EfficientGraph.prototype.initData=function() {
    var self=this;
    var c = self.chains[0];
    c.ends=[];
    var i;
    var j;
    var k;
    for (i = 0; i <c.nodes.length; i++) { 
	var seconds = [];
	var firsts = extend(null, c.p[i]);
	extend(firsts, c.q[i]);
	for (j = 0; j <firsts.length; j++) {
	    extend(seconds, c.p[firsts[j]]);
	    extend(seconds, c.q[firsts[j]]);
	}
	if (firsts.length < 2) {
	    c.ends.push(i);
	}
	firsts.sort();
	seconds.sort();

	j = seconds.length;
	k = firsts.length;
	//logDebug('after sort',seconds);
	while (--j >0 && seconds[j] > i ) { //remove non duplicates and loop-backs
	    //logDebug('seconds round1',seconds[j],firsts[k],seconds[j],seconds[-1]);
	    if (seconds[j] == seconds[j-1]) continue; //duplicates
	    //logDebug('seconds roundA',seconds[j],firsts[k],seconds[j],seconds[-1]);
	    while (--k >= 0 && firsts[k] >= seconds[j]) {
		//logDebug('seconds round2',seconds[j],firsts[k]);
		while (firsts[k] == seconds[j]) {
		    //logDebug('seconds round3',seconds[j],firsts[k]);
		    --j;
		}
	    }
	    if (j >= 0) {
		//logDebug('seconds round4',seconds[j],firsts[k]);
		c.seconds[i].push(seconds[j]);
	    }
	}
	//logDebug('SECONDS',c.seconds[i]);

    }
	//logDebug('SECONDS',c.seconds,'ALL P', c.p, 'ALL Q', c.q);
    

}

EfficientGraph.prototype.addChains=function(cArray) {
    var self=this;
    MochiKit.Base.extend(self.chains,cArray);
}

var times = 0;
EfficientGraph.prototype._relax=function(self) {
    //t=[new Date().getTime()];
    var done;
    var c=self.chains[0];
    //logDebug('_relax EG');
    done = self.tgLayout.relax( self._chainEdgeIter(c) , self._unRelatedNodePairs(), iter(c.nodes) );
    //t.push(new Date().getTime());
    self.tgLayout.repelNodes(self._getRelatedNodes(c));
    //t.push(new Date().getTime());
    self.tgLayout.repelNodesFarRange(self._endNodePairs(c), 350);

    //t.push(new Date().getTime());

    var rand1 = Math.floor(Math.random()*c.nodes.length);
    var rand2 = (rand1 != 0) ? Math.floor(Math.random()*rand1) : Math.floor(Math.random()*(c.nodes.length-1))+1;
    self.tgLayout.repelNodes(iter([ [c.nodes[rand1],c.nodes[rand2]] ]));

    //t.push(new Date().getTime());
    //forEach(self._chainEdgeIter(c), self.edgeModel.updateViewCoords);
    //t.push(new Date().getTime());
    //logDebug('Times:',++times, t[t.length-1]-t[0],t[1]-t[0],t[2]-t[1],t[3]-t[2],t[4]-t[3]);
    return done;
}

EfficientGraph.prototype.getNodes=function() {
    var c=this.chains;
    return iter(c[0].nodes);
}

EfficientGraph.prototype.getEdges=function() {
    var self = this;
    var c=self.chains;
    return self._chainEdgeIter(c[0]);
}

EfficientGraph.prototype._endNodePairs=function(c) {
    var i=c.ends.length;
    var j=0;
    return {
	next: function () {
	    if (j <= 0) {
		--i;
		j=i-1;
		if (i <= 0) {
		    throw MochiKit.Iter.StopIteration;
		}
	    }
	    else {
		--j;
	    }
	    return [ c.nodes[c.ends[i]],c.nodes[c.ends[j]] ];
	}
    }
}

EfficientGraph.prototype._unRelatedNodePairs=function() {
    var c = this.chains[0];
    var i=0;
    var j=-1;
    return {
	next: function () {
	    if (++j < c.seconds[i].length) {
		//logDebug('_unRelatedNodePairs',i,c.seconds[i][j]);
		return [c.nodes[i], c.nodes[c.seconds[i][j]] ];
	    }
	    while (++i < c.nodes.length) {
		if (c.seconds[i].length > 0) {
		    j=0;
		    //logDebug('_unRelatedNodePairs',i, c.seconds[i][j]);
		    return [c.nodes[i], c.nodes[c.seconds[i][j]] ];
		}
	    }
	    throw MochiKit.Iter.StopIteration;
	}
    }
}

EfficientGraph.prototype._getRelatedNodes=function (chain) {
    var eIter = this._chainEdgeIter(chain);
    return {
	next: function () {
	    var x = eIter.next();
	    return [x.p,x.q];
	}
    }
}

EfficientGraph.prototype._getEdge=function (c,i,j, i_is_q) {
    if (i_is_q) {
	return  {q:c.nodes[i], p:c.nodes[c.q[i][j]],content:c.edgeContents[i][j]};
    } else {
	var p_i = c.p[i][j];
	return {p:c.nodes[i], q:c.nodes[p_i],content:c.edgeContents[p_i][findValue(c.q[p_i],i)]};
    }
}

EfficientGraph.prototype._chainEdgeIter=function (chain) {
    var i=0;
    var j=-1;
    return {
	next: function () {
	    //logDebug('_chainEdgeIter',i,j+1, chain.q.length);
	    if (++j < chain.q[i].length) return {p:chain.nodes[i], q:chain.nodes[chain.q[i][j]],content:chain.edgeContents[i][j]};
	    
	    while (++i < chain.nodes.length) {
		if (chain.q[i].length > 0) {
		    j=0;
		    return {p:chain.nodes[i], q:chain.nodes[chain.q[i][j]],content:chain.edgeContents[i][j]};
		}
	    }
	    throw MochiKit.Iter.StopIteration;
	}
    }
}


EfficientGraph.prototype.getNodeEdges={
    relax:function(n,r){ return this._getNodeEdges(n,r,'relax'); },
    model:function(n,r){ return []; },
    visible:function(n,r){ return this._getNodeEdges(n,r,'visible'); }
};

EfficientGraph.prototype._getNodeEdges=function(n, relations, ntype) {
    /** relations: e.g. if you want the p's and q's then send { p:[] , q:[] }
	ntype: 'relax', 'model', 'visible'     
	returns array
    **/
    var self=this;
    var c = self.chains[0];
    var n_i = findIdentical(c.nodes,n);

    for (a in relations) {
	//note that we want the opposite of a, since it's the edges that n IS q
	var opp = (a=='q') ? 'p' : 'q';
	var i = c[opp][n_i].length;
	while (--i >= 0) {
	    var n_j = c[opp][n_i][i];
	    relations[a].push(self._getEdge(c,n_i,i,(opp == 'q')));
	}
    }
    return relations;
}
