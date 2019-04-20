/***
    Chains is a graph storing nodes in 'chains' which are
    serial chains of nodes connected by edges.

    Here, other chains can be connected to each other by
    two edges linked to each other so that one edge goes
    wherever the other does (master-slave).  This is done
    with two structures on the edge:
    e.links is an array of edges connected to the edge
       (so the pointers are bi-directional)
       and
    e.head is the index of the e.links array that the
       edge is a slave to.  If the edge is not a slave
       then it's -1 (or '< 0' in any case)
***/

try {
    if (typeof(GraphNode) == 'undefined') {
        throw "Chains depends on GraphLayout. Include GraphElements.js";
    }
    if (typeof(TGGraphLayout) == 'undefined') {
        throw "Must include TGGraphLayout.js";
    }
} catch (e) {
    throw "SvgGraph depends on GraphElements and TGGraphLayout!";
}

if (typeof(Chains) == 'undefined') {
    Chains = function (model) {
	this.NAME = "Chains";
	this.VERSION = "0.1";

	this.chains = [];
	this.domEdges = [];
	this.domChains = []; //dom Chains and the chains they dominate
	
	this.nodeModel = model.nodeModel;
	this.edgeModel = model.edgeModel;
	this.dampMgr = new RelativeDamper(this.nodeModel);

	this.tgLayout = new TGGraphLayout(this.nodeModel, this.dampMgr);

	this.relax = partial(this._relax,this);
	
	/* Keyboard/Interactive variables 
	   Why have a current chain/chainpos, when we can just
	   select a vowel and get that info from there.

	   Best if the  'current.vowel' marks the vowel
	   _preceding_ the cursor.
	*/
	this.currentEdge = null;
    };
}

Chains.prototype.addNodes = function(nArray) {
    var self = this;
    MochiKit.Base.extend(self.chains[0].nodes,nArray);
}
Chains.prototype.addLink = function(e1,e2,relation) {
    //logDebug('addLink',relation,'e1',e1.chain,e1.chainpos,'e2',e2.chain,e2.chainpos);
    var self = this;
    /* 1. if at least one (ex) does not have a head edge
            then check is the other (ey)'s domEdge (ex)?
	      yes?--NOT SURE WHAT TO DO HERE
		   -throw exception for now.
		   -when links are flexible this can be revisited
              no? then make the other the head of the former
	         and remove the former as a domEdge if it is one.
       2. else if both have different head edges, then choose an
             arbitrary one of the two, and make it the head
	     edge of the other.  Then flip the head/slave
	     relations all the way up to the domEdge
       3. else if both have the same head edge,
	     then also throw exception for now
       4. force all dependent neighbors to be dependent on new head
    */
    var dom = e1;
    if (e2.head == null) { /* 1a */
	//logDebug('head2',e1.head);
	if (e1.head == null) {
	    //logDebug('e1 head is null',self.domEdges.length);
	    self.domEdges.push(e1);
	} else if (e2==self.getDomEdge(e1)) {
	    throw "Looped links not yet supported (1)";
	}
	//logDebug('domedge length',self.domEdges.length);
	e2.head = e2.links.push( {edge:e1,relation:-relation} ) -1;
	e1.links.push( {edge:e2,relation:relation} );
	//logDebug('head2 end');
    }
    else if (e1.head == null) { /* 1b */
	//logDebug('head1');
	//we know head2 isn't null
	if (e1==self.getDomEdge(e2)) {
	    throw "Looped links not yet supported (2)";
	}
	e1.head = e1.links.push( {edge:e2,relation:relation} ) -1;
	e2.links.push( {edge:e1,relation:-relation} );
	dom = e2;
    }
    else { /* 2 ; 3 is covered inside subjugate*/
	//logDebug('heads',head1,head2);
	e1.links.push( {edge:e2,relation:relation} );
	e2.links.push( {edge:e1,relation:-relation} );
	self._subjugate(e2,e1);
    }

    /*add link to view
      we do this before the neighbors, because we
      need to update the neighbors' view too,
      preferably within the iteration.
     */
    self.edgeModel.addLink(e1,e2,relation,self.chains);

    //logDebug('subjugate neighbors');
    /*4: subjugate neighbors 

         If the edge is a domEdge though, it doesn't have
	 to jerk around its neighbors, but it does have to
	 make sure that its neighbors won't jerk it around.
	 This test is in _subjugate()
     */

    forEach(iter(self.getNeighbors(e1)), function(n) {
	//logDebug('subjugate vals before',n.rel,n.edge);
	self._subjugate(n.edge,e1,n.rel-2);
	//logDebug('subjugate calls updateview; vals after',n.rel,e1.vowel);
    }, self);
    //logDebug('mid subjugate');
    forEach(iter(self.getNeighbors(e2)), function(n) {
	self._subjugate(n.edge,e2,n.rel-2);
	//logDebug('subjugate calls updateview',n.rel,e2.vowel);
    }, self);
    //logDebug('subjugate neighbors end');

    self.edgeModel.updateView(self.edgeModel,dom,self.chains);

    //fix for double-updating of tips
    self.edgeModel.backupChainTips(self.chains[e1.chain]);
    self.edgeModel.backupChainTips(self.chains[e2.chain]);

    //logDebug('addLink end');
}

Chains.prototype.getDomEdge = function(e) {
    var self = this;
    return reduce(function(a,b){return b}, self.headIter(e), null);
}

Chains.prototype.headIter = function(start_edge) {
    //iterates up through each head edge upto and including the domEdge
    var e = start_edge;
    var self=this;
    var i=0;
    return {
	next: function() {
	    //logDebug(e,e.head,e.chainpos,e.chainpos+e.head+2,++i,this.chains);
	    if (e.head == null) {
		throw MochiKit.Iter.StopIteration;
	    }
	    if (e.head < 0) { //neighbors
		e = self.chains[e.chain].edgeContents[e.chainpos+e.head+2];
	    } else {
		e = e.links[e.head].edge;
	    }
	    return e;
	}
    }
}


Chains.prototype.getNeighbors = function(e) {
    var self = this;
    var rv =[];
    var chn = self.chains[e.chain];
    //logDebug(self,e.chainpos>0,e.chainpos<chn.edgeContents.length-1);
    if (e.chainpos>0) { //left neighbor
	rv.push({rel:-1,
		 edge:chn.edgeContents[e.chainpos-1]
		});
    }
    if (e.chainpos<chn.edgeContents.length-1) { //right neighbor
	rv.push({rel:1,
		 edge:chn.edgeContents[e.chainpos+1]
		});
    }
    return rv;
}

Chains.prototype._subjugate = function(victim_edge,subjugator_edge,/*optional*/relation) {
    /* @param relation: optional argument which is used to 'simulate' the 
                        subjugator's head attribute for pointing to victim_edge 
			without editing its actual head value
       0. if both heads are null and relation is -1|-3 then DO NOTHING
       1. check that victim_edge's domedge is not subjugator
       2. go up chain of victim and flip heads
       3. delete domedge in domedge array
       ASSUMES the edges have already been linked (at least, preliminarily)
    */
    //logDebug('_subjugate',this,victim_edge,subjugator_edge);
    var self = this;

    /* 0: if both heads are null and 
          relation is -1|-3 then DO NOTHING 
	  BREAKS: test3
     */
    if (victim_edge.head==null 
	&& subjugator_edge.head==null
	&& (relation==-1 ||relation==-3)) {
	return;
    }

    v_heads = list(self.headIter(victim_edge));
    sDomEdge = self.getDomEdge(subjugator_edge);
    v_heads.unshift(subjugator_edge,victim_edge);

    /* 1: check that victim's domedge is not subjugator domedge */
    //logDebug('_subjugate 1',v_heads.length);
    if (v_heads[v_heads.length-1] == sDomEdge) {
	throw "Looped links not yet supported (_subjugate)";
    }
    /* 2: go up chain of victim and flip heads */
    //logDebug('_subjugate 2',v_heads.length);
    var i = v_heads.length;
    var newshead;
    while (--i >= 1) {
	var new_s = v_heads[i-1];
	var new_v = v_heads[i];
	//logDebug('_subjugate 2.4: i',i,'s',new_s.vowel,'v',new_v.vowel,arguments.length,relation,new_s.head,(i==1 && arguments.length>2));
	if (arguments.length>2 && i==1) {
	    //logDebug('_subjugate use argument');
	    newshead=relation;
	} else {
	    //logDebug('_subjugate use news_s.head');
	    newshead=new_s.head;
	}
	//logDebug('_subjugate 2.5 = newshead', newshead);
	if (newshead < 0) { //neighbor
	    new_v.head = -newshead-4;//-1=>-3,-3=>-1
	    //if neighborSlaves is null, then just this side, 
	    //else, must be dom of other side already
	    //logDebug('neighborSlaves Before new_v',new_v.neighborSlaves,'new_s',new_s.neighborSlaves);
	    var other_direction = -(new_v.head+2); //direction from new_s to new_v
	    new_s.neighborSlaves = (new_s.neighborSlaves==null)? other_direction:0;
	    new_v.neighborSlaves = (  new_v.neighborSlaves==0
				    ||new_v.neighborSlaves==other_direction
				    ) ? other_direction : null;
	    //logDebug('neighborSlaves After new_v',new_v.neighborSlaves,'new_s',new_s.neighborSlaves);
	} else { //link
	//logDebug('_subjugate 2.6 else', new_v.links.length);
	    for (var j=new_v.links.length-1; j>=0; --j) {
		//logDebug('_subjugate 2.7 in for loop',new_s,'x',new_v.links.length,'x',j);
		if (new_s==new_v.links[j].edge) {
		    new_v.head=j;
		    //logDebug('_subjugate 2.8:found edge',new_v.head);
		    break;
		}
	    }
	}
    }
    //logDebug('_subjugate 3',v_heads.length);
    /* 3: remove victim domEdge from domEdges array */
    if (v_heads.length > 2) {
	//logDebug('_subjugate 3.1',v_heads.length,self.domEdges.length);
	var vDomEdgeInd = findIdentical(self.domEdges,v_heads[v_heads.length-1]);
	//logDebug('_subjugate 3.2',v_heads.length,self.domEdges.length,vDomEdgeInd);
	if (vDomEdgeInd >=0) self.domEdges.splice(vDomEdgeInd,1);

    }
    //logDebug('_subjugate end',self.domEdges.length);
}

Chains.prototype.addChains = function(cArray) {
    var self = this;
    var c = self.chains;
    var clen = c.length;
    //i = cArray.length-1;
    for (var i=0;i<cArray.length;i++) {
	/*
	ec = cArray[i].edgeContents;
	var j = ec.length-1;
	do {
	    if (typeof(ec[j].chain) != 'undefined') {
		ec[j].chain = clen+i;
		ec[j].chainpos = j;
	    }
	} while (--j >=0);
	*/
	/*NOT THREAD SAFE!
	  probably need to implement chain.lock if we expect relaxing
	  simultaneously
	 */
	self._refreshChainInfo(c.push(cArray[i])-1);
    }
}

Chains.prototype.spliceChain = function(newChain, /*optional*/currentEdge, deleteCount) {
    var self = this;
    if (!deleteCount) {
	deleteCount = 0;
    }

    if (arguments.length > 1) {
	self.currentEdge = currentEdge;
    }
    else if (self.currentEdge === null) {
	self.currentEdge = self.chains[0].edgeContents[0];
    }
    var e = self.currentEdge;
    var c = self.chains[e.chain];
    var eArray = newChain.edgeContents;
    var nArray = newChain.nodes;
    eArray.unshift(e.chainpos,deleteCount);
    nArray.unshift(e.chainpos,deleteCount);

    var choppingBlock = c.edgeContents.splice.apply(c.edgeContents,eArray);
    c.nodes.splice.apply(c.nodes,nArray);

    //should choppingBlock become its own chain or be deleted?
    //should any links be deleted or attached to the new string?
    //possibly we should do it however meta-Ouwi works

    //TODO: FIX neighborSlaves
    //TODO: FIX neighbor.head for neighbors
    /* heads of -1,-3:
       a. remove current head
       b. old vowel with head -1,-3 may need to be added to domEdges
       c. add head=-1,-3 to new vowel in position.
    */
    

}

Chains.prototype._refreshChainInfo=function(cint) {
    var self = this;
    var ec = self.chains[cint].edgeContents;
    var j = ec.length-1;
    do {
	ec[j].chain = cint;
	ec[j].chainpos = j;
    } while (--j >=0);
}

Chains.prototype._relax = function(self) {
    //logDebug('_relax');
    /*
     * For Ouwiyaru:
     * -all these nodes are part of chains
     * -edges are the links
     * -satelites are managed by vChainLayout.js
     * 
     * Ouwiyaru procedure:
     * 1. repel all nodes (now:just chain neighbors)
     * 2. relax chain-edges (?combined with 4 crawl?)
     * 3. save old points (combined with 4. crawl)
     * 4. over all chains, if chain-edge dependent, skip node
     *                     else applyDxy
     * 5. if last/first edge not dependent applyDxy to last/first node
     * 6. parse dom link tree: -move satelites
     *                         -draw these vowels
     * 7. over all chains, if chain-edge has no links: -move satelites
     *                                                 -draw vowel
     */
    /*new thoughts:
      if we do the update views first and they go as far as
      moving the heads except the neighbors, and then as
      the chains go across and update everyone else
      they can update the neighbors?
    */

    // 1. repel nodes
    var i = self.chains.length;
    if (!i) return; //no chains, so nothing to relax

    var round = self.dampMgr.startRound(self._domsAndTipsNodePairs(true));
    self.tgLayout.repelNodes(self._sameChainNodePairs());
    self.tgLayout.repelNodes(self._domNeighborNeighborsLocal());
    //self.tgLayout.repelNodes(self._domsAndTipsNodePairs());

    var j,c;
    //For Each Chain
    while (--i >= 0) {
	c = self.chains[i];
	// 2. relax chain-edges
	self.tgLayout.relaxEdges(self._chainEdgeIter(c) );
	j = c.nodes.length-1;
	
	/* 3. save old points on every single node
	   4. applyDxy on nodes where both edges are free
	      or when one edge is dep on the other 
	 */
	do {//ASSUME at least 2 nodes on each chain (from ouwiyaru)
	    //logDebug('j in _relax',j);
	    c.nodes[j].oldX = c.nodes[j].x;
	    c.nodes[j].oldY = c.nodes[j].y;
	    //logDebug(c.nodes[j].oldX,c.nodes[j].oldY);
	    var left_edge_head = c.edgeContents[j-1].head;
	    if (left_edge_head == null
		/* checking for nbr head==null is certainly 
		   redundant to updateViewCoords' adjustment.
		   in some situations.  in the future
		   updateViewCoords will be more about
		   vector forces
		 */
		|| (left_edge_head == -1 //right dep
		    && (c.edgeContents[j].head==null
			|| c.edgeContents[j].head==-1)
		    )
		|| (left_edge_head == -3 //left dep
		    /*redundant since 
		      left_edge_head ===c.edgeContents[j-1].head
		    && (c.edgeContents[j-1].head==null
		      || c.edgeContents[j-1].head==-3)
		    */
		    )
		) {//it's free
		//logDebug('updateNodeCoords call',c.nodes[j].x);
		self.tgLayout.__updateNodeCoords(self.tgLayout,c.nodes[j]);
	    } 
	    if (left_edge_head != null 
		&& left_edge_head != -3
		&& --j > 0) {//skip ahead a node
		/*skip ahead if the left edge is dependent
		  but if it's dep on its left nbr, then
		  the left nbr might be a dom edge.
		  if left nbr is not a dom edge, it's ok
		  not to skip because the left edge test above will
		  fail.
		 */
		//logDebug('j neighbor in _relax',j);
		c.nodes[j].oldX = c.nodes[j].x;
		c.nodes[j].oldY = c.nodes[j].y;
	    }
	} while (--j > 0); //last point done outside loop
	//5. first edge/node: get oldpoints; if not dep, applyDxy
	c.nodes[0].oldX = c.nodes[0].x;
	c.nodes[0].oldY = c.nodes[0].y;
	if (c.edgeContents[0].head == null 
	    || c.edgeContents[0].head == -1) {
	    self.tgLayout.__updateNodeCoords(self.tgLayout,c.nodes[0]);
	}
    }

    // 6. parse dom link tree
    i = self.domEdges.length;
    var t;
    while (--i >= 0) {
	//logDebug('relax calls updateView (1)');
	self.edgeModel.updateView(self.edgeModel,
				  self.domEdges[i],
				  self.chains);
    }
    // 7. over all chains, if chain-edge has no links 
    //    then updateVowelCoords (getTransform,move Sats,drawVowel)
    //?can we merge this into step 4?
    //-probably not, because old[XY] need updating
    i = self.chains.length;
    while (--i >= 0) {
	c = self.chains[i];
	j = c.edgeContents.length-1;
	do {//ASSUME at least one edge on each chain (from ouwiyaru)
	    j_edge = c.edgeContents[j];
	    if (j_edge.links.length == 0
		&& j_edge.head == null) {
		//logDebug('relax calls updateView (2)');
		self.edgeModel.updateView(self.edgeModel,
					  j_edge,
					  self.chains);
	    }
	} while (--j >= 0); 
    } 
    //logDebug('finished relaxing');
    self.dampMgr.finishRound(round);
    self.tgLayout.damp();
}

Chains.prototype.json = function(minimal) {
    var i = this.chains.length;
    var rv_graph = {chains:Array(i),
		    links:[],
		    hooks:[]
		   };
    while (--i >= 0) {
	c = this.chains[i];
	var j = c.length;
	rv_graph.chains[i] = Array(j);
	while (--j >=0) {
	    //TODO: implement edgeModel.json
	    rv_graph.chains[i][j] = this.edgeModel.json(c[j],minimal,this.chains);
	}
    }
    ///TODO:do links too
    return rv_graph;
}


Chains.prototype.getNodes = function() {
    /* copied straight from RayChainHybrid
     */
    var c=this.chains;
    var i=c.length+c[0].nodes.length-1;
    return {
	next: function () {
	    --i;
	    if (i < c[0].nodes.length) {
		if (i < 0) {
		    throw MochiKit.Iter.StopIteration;
		}
		return c[0].nodes[i];
	    }
	    return c[i-c[0].nodes.length+1].nodes[0];
	}
    }
}

function getNodePairs(node_array) {
    //returns an array of all 2-Combinations from a node array
    var nodepairs = [];
    var i = node_array.length;
    var j;
    while (--i > 0) {
	j = i;
	while (--j >=0) {
	    nodepairs.push([node_array[i],node_array[j]]);
	}
    }
    return nodepairs;
}

/* Repels domEdge neighbors with their links' neighbors.
 * This is worth studying more.  It doesn't solve the
 * case for when there are no neighbors (and overlaps still happen).
 * It also doesn't always untangle, and the whole graph
 * often never settles.
 * Maybe a vector solution will turn out better. (and have
 * more general uses)
 */
Chains.prototype._domNeighborNeighborsLocal = function() {
    var self = this;
    var chains = self.chains;
    var nodepairs = [];

    var i;
    //DOM Edges 
    i = self.domEdges.length;
    while (--i >= 0) {
	var dE = self.domEdges[i];
	forEach(iter(self.getNeighbors(dE)),function(dEn) {
	    var d = (dEn.rel + 1)*3/2 -1; //-1 or +2
	    dEnode = chains[dE.chain].nodes[dE.chainpos+d]
	    var j=dE.links.length;
	    while (--j >=0) {
		//maybe necessary for recursive repelling
		//if (j != v.head) {//don't do head node
		forEach(iter(self.getNeighbors(dE.links[j].edge)),
			function(n) {
		    var delta = (n.rel+1)/2; //0 or +1
		    nodepairs.push([dEnode,
				    chains[n.edge.chain].nodes[n.edge.chainpos+delta]
				    ]);
		    
		});

	    }
	});
    }

    //extend(nodepairs,getNodePairs(nodes));
    return iter(nodepairs);
    
}

Chains.prototype._domsAndTipsNodePairs = function(just_nodes) {
    //nodes from ends of chains and dom nodes paired
    //coded lazily by just constructing the big array
    var self = this;
    var chains = self.chains;
    var nodes = [];
    var nodepairs = [];
    var i;

    //DOM Edges 
    i = self.domEdges.length;
    while (--i >= 0) {
	var dE = self.domEdges[i];
	var chnns = chains[dE.chain].nodes;
	//conditions assume that heads/tails are covered below
	//if (dE.chainpos != 0)
	nodes.push(chnns[dE.chainpos]);
	//if (dE.chainpos != chnns.length-2)
	nodes.push(chnns[dE.chainpos+1]);
    } 
    /*Repelling chain tips destabilizes too many graphs
      and doesn't successfully organize the graph very
      often anyway.
    */
    //Heads and Tails
    nodes = [];
    i = chains.length;
    while (--i >= 0) {
	var chnns = chains[i].nodes;
	nodes.push(chnns[0], chnns[chnns.length-1]);
    }

    if (just_nodes) {
	return iter(nodes);
    }
    extend(nodepairs,getNodePairs(nodes));
    return iter(nodepairs);
}

Chains.prototype._sameChainNodePairs = function() {
    /* really sameChainNeighboringNodePairs with neighbors' neighbors
       included
    */
    var self = this;
    var chains = self.chains;
    var c=0;
    var i=0; //index on c
    var j=1; // diff between i and pair: 1, then 2
    var done = false;
    return {
	next: function() {
	    if (done) {throw MochiKit.Iter.StopIteration;}
	    //logDebug('chains.samechainnodepairs',c,i,j);
	    var chn = chains[c];
	    var n1=chn.nodes[i];
	    var n2=chn.nodes[i+j];
	    if ( i+j >= chn.nodes.length-1) {
		if (j >= 2 || chn.nodes.length <= 2) {
		    if (c >= chains.length-1) {
			done = true;
		    }
		    ++c;
		    i=0;
		    j=1;
		} else {
		    i=0
		    ++j;
		}
	    } else {
		++i;
	    }
	    return [n1,n2];
	    //return [chains[c].nodes[i], chains[d].nodes[i+j] ];
	}
    }

}

Chains.prototype._allNodePairs = function() {
    var self = this;
    var chains = self.chains;
    var c = 0;
    var d = 0;
    var i = 0
    var j = 0;
    return {
	next: function () {
	    //c=d=0 is the base i/j case
	    if (j >= chains[d].nodes.length-1) {  //-2 because it will get inc'd at bottom
		if (d >= chains.length-1) {
		    if (i >= chains[c].nodes.length-2) {
			if (c >= chains.length-1) {
			    throw MochiKit.Iter.StopIteration;
			}
			if (i == chains[c].nodes.length-1) {
			    ++i; 
			    j=i+1;
			    d=c+1;
			} else {
			    ++c;
			    i=0;
			    j=1; 
			    d=c;
			}
		    } else {
			++i;
			j=i+1;
			d=c;
		    }
		}
		else {
		    ++d;
		    j=0;
		}
	    }
	    else {
		++j;
	    }
	    if (c==0 && (i==1 || i==2) && d==1 && (j==0 || j==1)) {
		return [{x:0,dx:0,y:0,dy:0}, {x:1,dx:1,y:1,dy:1}];
	    }
	    return [chains[c].nodes[i], chains[d].nodes[j] ];
	}   
    }
}

Chains.prototype._chainEdgeIter = function (chain) {
    var i = 0;
    return {
	next: function () {
	    if (++i >= chain.nodes.length) {
		throw MochiKit.Iter.StopIteration;
	    }
	    return {p:chain.nodes[i-1],q:chain.nodes[i],content:chain.edgeContents[i-1]};
	}
    }
}

Chains.prototype.getEdges = function () {
    var chain_edges = []
    var i = this.chains.length;
    while (--i >=0) {
	chain_edges.push(this._chainEdgeIter(this.chains[i]));
    } 
    return chain.apply(null,chain_edges);
}

Chains.prototype.getNodeEdges = {
    relax:function(n,r){ return this._getNodeEdges(n,r,'relax'); },
    model:function(n,r){ return []; },
    visible:function(n,r){ return this._getNodeEdges(n,r,'visible'); }
};



Chains.prototype._getNodeEdges = function(n, relations, ntype) {
    /** relations: e.g. if you want the p's and q's then send { p:[] , q:[] }
	ntype: 'relax', 'model', 'visible'     
	returns array
    **/
    var self = this;
    var nedges = [];
    var i = self.edges.length-1;
    do {
	for (a in relations) {
	    if (n ==self.edges[i][a]) {
		relations[a].push(self.edges[i]);
	    }
	}
    } while (i--);

    i=self.chains.length -1;
    do {
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
    } while (--i);
    return relations;
}
