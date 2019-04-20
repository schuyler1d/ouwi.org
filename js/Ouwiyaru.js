/* Vowel: the actual edge object stored
 * VowelEdge: the edge functions which will be called 
 *            to manipulate Vowel objects
 * Ouwiyaru.Labels: Model (M in MVC)
 * Ouwiyaru.SvgFonts.Simple: factory for making svg objects 
 *                           for each vowel, and (re)draw functions
 * Ouwiyaru.Elements.Simple: View (abstracted Svg View in MVC)
 */
Vowel=function(vowel_type_index) {
    /* @param vowel_type_index is int 0-9 on which vowel to create
     *             (-10)->(-1) make a backwards vowel?
     */
    this.vowel=vowel_type_index; //(-10..9)
    /* vowels >6 have 2-3 edges
       VOWEL EDGES:          LEGS
       0  -- (third edge)   1
       -1 -o    1 o-        1
       -2 ),    2 ,(        1 
       -3 )     3 (         1
       -4 /\    4 /\        2
       -5 o<    5 o<        2
       -6 (J    6 J)        2
       -7 -o<   7 -o<       2
       -8 \/\   8 /\/       3
       -9 \/\.  9 ./\/      3
       -10 \/\, 10 ,/\/     3
       -11 J)/  11 /J       3
    */
    this.head=null;
    /*head: which link dominates this vowel.  If this is not 
         null: it's independent
	 >=0 : references a link in the links array
	 -1: references right chain neighbor (add 2 for relative index)
	 -3: references left chain neighbor (add 2 for relative index)
    */

    //EDGE SPECIFIC
    this.nodes=[]; 
    /*nodes: list of nodes.  They are always in the 
      same order for a particular vowel.  Currently, the only 
      thing assumed about the number of nodes is in addLink() where
      only certain nodes are moved in the function.  If there are
      other helper nodes, perhaps they should be expressed as functions
      of the 'fundamental' nodes.
    */

    //EDGE SPECIFIC
    this.neighborSlaves = null;
    /*neighborSlaves: if any neighbors have this edge as its head (-1,-3)
      then this will be set to -1,0,1 depending on which directions have
      slaves, -1 for just left, 1 for just right, and 0 for both.
    */

    //EDGE SPECIFIC
    this.links=[];
    /*links: an array of objects where 
      {edge: related edge,
       relation: how the leg is connected
       dtheta: NOT IMPLEMENTED, but will be the pressure to move
               from its current forced orientation.  This will be relaxed
	       within the restrictions of movement allowed (see 1W65).
	       before being applied, dx and dy avg'd on each point will
	       be applied to dtheta and zero'd
       -maxtheta: NOT IMPLEMENTED, but how much |theta| can swing before
                 it's unjoined/gone too far
		 !OR is this derived/looked up from $relation?--why store
		 the same number over and over again?
      }
      RELATIONS:
       negative=passive
       di 11 0
       di 12 1
       mi 11 2
       mi 12 3
       i  11 4
       i  12 5
       r  11 6 //'passive' part in radiation is radiating from the 'active'
       r  12 7
       r  21 8
       r  22 9
       i  21 10
       i  22 11
       mi 21 12
       mi 22 13
       di 21 14
       di 22 15

       INTSXN = 1;
       DBL_INTRSXN = 2;
       MIDDLE_INTRSXN = 3;

    */
    this.chain=0;
    this.chainpos=0;
    /*chain: which chain the vowel belongs to chains are other objects
      representing a serial string of vowels
      maybe the end points should be on the chain */
    return this;
};

VowelEdge=function(nodeModel,painter,chains) {
    this.nodeModel = nodeModel;
    this.painter = painter;
    this.LENGTH = 20;
    this.chains = chains;
    this.NAME='VowelEdge';
    this.VERSION = '0.3';
    this.damper = 0.85;
    return this;
}

VowelEdge.prototype.__repr__ = function () {
    return "[" + this.NAME + " " + this.VERSION + "]";
};
VowelEdge.prototype.toString = function () {
    return this.__repr__();
};

VowelEdge.prototype.json=function(v,minimal,chains) {
    
}

VowelEdge.prototype.updateViewCoords=function(self,v,chains) {
    /* update a dependent neighbor's opposite-side node
     */
    //logDebug('updateViewCoords v',v.vowel,'c',v.chain,v.chainpos);

    return; /*CURRENTLY DO NOTHING!!!*/

    /* right now, this is redundant with the conditions in Chains.js
       _relax testing for head == -1|-3. In the future, this should
       be doing vector-stress adjustments
     */
    var n;
    if (v.head == -1) {
	n=chains[v.chain].nodes[v.chainpos];
    } else if (v.head == -3) {
	n=chains[v.chain].nodes[v.chainpos+1];
    } else {
	return;
    }
    var dn = self.nodeModel.getDxy(n);
    dn.dx *= self.damper;
    dn.dy *= self.damper;
    //self.maxMotion = Math.max(self.maxMotion, dn.dx);
    //logDebug('TGGraphLayout.prototype.__updateNodeCoords', self.maxMotion, dn.dx,dn.dy);
    self.nodeModel.setDxy(n,dn);
    self.nodeModel.applyDxy(n, 1);
}

VowelEdge.prototype.updateView=function(self,v,chains,transform) {
    var p = chains[v.chain].nodes;
    //logDebug('updateView: v',v.vowel,'chn',v.chain,'pos',v.chainpos,'h',v.head,'n',v.neighborSlaves,'args',arguments.length);
    if (arguments.length < 4) {//no transform
	//this will have to get more sophisticated when vowels span multiple edges
	transform=self.calculateTransform(p[v.chainpos],
					  p[v.chainpos+1]);
	
    }
    else { //i need to adjust the nodes.
	self.applyTransform(p[v.chainpos],transform);
	self.applyTransform(p[v.chainpos+1],transform);
    }
    //logDebug('updateView transform:',transform);

    //move satellite nodes
    var i=v.nodes.length;
    while (--i >= 0) {
	//logDebug('updateView nodes before xy:',v.nodes[i].x,v.nodes[i].y);
	self.applyTransform(v.nodes[i],transform);
	//logDebug('updateView nodes after xy:',v.nodes[i].x,v.nodes[i].y);
    }
    //logDebug('(updateView)drawing vowel',v.vowel,'chn',v.chain,'pos',v.chainpos);

    //update dependent linked vowels
    i=v.links.length;
    while (--i >=0) {
	if (i != v.head) {//don't do head node
	    //logDebug('updatingView recursively for',v.links[i].edge.vowel);
	    self.updateView(self,v.links[i].edge,chains,transform);
	}
    }
    //update dependent neighbors
    var e =chains[v.chain].edgeContents;
    //logDebug('test2 Problem vowel p',p[v.chainpos].x,p[v.chainpos+1].x,p[v.chainpos].oldX,p[v.chainpos+1].oldX);

    /*FUTURE: updateViewCoords calls will eventually be in the
      relaxing side of the separation between painting and relax
      functions.
     */

    //left chain slaves
    if (v.neighborSlaves<=0 && v.neighborSlaves!=null) {
	/*don't include transform, since the neighbor's dependent node
	  has already been moved and the vector will be different.
	  This causes an issue of always moving the neighbors when they've
	  just been 'stretched' but it will do the right thing
	  perhaps we need to consider updating stresses within this
	  function as well?
	*/
	//logDebug('adjust left neighbor',e.length,v.chainpos);
	if (v.chainpos < 2 //it's an end
	    || e[v.chainpos-2].head == null //or not a slave
	    || e[v.chainpos-2].head == -3 //or n is chn-dep the other way
	    ) {
	    //logDebug('adjusting left');
	    self.updateViewCoords(self,e[v.chainpos-1],chains);
	}
	self.updateView(self,e[v.chainpos-1],chains);
    }

    //right chain slaves
    if (v.neighborSlaves >= 0 && v.neighborSlaves!=null) {
	if (v.chainpos > e.length-3 //it's an end
	    || e[v.chainpos+2].head == null //or neighbor is independent
	    || e[v.chainpos+2].head == -1 ) {
	    //or neighbor is also chain-dep the other way
	    self.updateViewCoords(self,e[v.chainpos+1],chains);
	}
	self.updateView(self,e[v.chainpos+1],chains);
    }
    /*This used to be an inline paint, because I was scared that
      updating asynchronously with the movement would disturb
      the vowel slave adjustment, but it doesn't look like much of a 
      problem
    */
    //self.painter.drawVowel(v,chains); //paint
   //logDebug('end updateView');
}

VowelEdge.prototype.backupChainTips = function(c) {
    /*test2 and test10 demonstrate an error of a flipped subjugation
      on the end of a node double updateView-ing and thus
      incorrectly placing itself.  This is the fix.  Need more
      examples to see if it's a true fix.  I don't entirely
      understand why it happens.
    */
    var self = this;
    var ns=c.nodes;
    self.xyBackup(ns[0]);
    self.xyBackup(ns[1]);
    if (ns.length > 2) {
	self.xyBackup(ns[ns.length-2]);
	self.xyBackup(ns[ns.length-1]);
    }
}

VowelEdge.prototype.xyBackup = function(p) {
    rv = {x:p.oldX,y:p.oldY};
    p.oldX=p.x;
    p.oldY=p.y;
    //logDebug('xyBackup reporting',p.oldX,p.oldY);
    return rv;
}

VowelEdge.prototype.newXY = function(p,newp) {
    //preserves XY coords in .oldX, .oldY
    p.oldX=p.x;
    p.oldY=p.y;
    p.x=newp.x;
    p.y=newp.y;
}

VowelEdge.prototype.newXYs = function(p_arr, new_arr) {
    var self=this;
    var i;
    for (i=0; i <p_arr.length; i++) {
	self.newXY(p_arr[i], new_arr[i]);
    }
}

VowelEdge.prototype.calculateTransform=function(p,q) {
    /* transform with p as the pivot calculate cos@ and sin@
     * | cos@ sin@| |a| = |x|
     * |-sin@ cos@| |b| = |y|
     * returns transform array:
     * [ -translate.x, -translate.y, pivot.x, pivot.y, cos@, sin@]
     */
    //logDebug('XY p',p.x,p.y,'q',q.x,q.y,'oldXY p',p.oldX, p.oldY,'q',q.oldX, q.oldY);
    var t=[p.oldX, p.oldY, p.x, p.y];

    var a = q.oldX-p.oldX;
    var b = q.oldY-p.oldY;
    var x = q.x-p.x;
    var y = q.y-p.y;

    var sq=a*a+b*b;
    //logDebug('abxy, sq',a,b,x,y,sq);
    t.push( (a*x+b*y)/sq );
    t.push( (b*x-a*y)/sq );
    //logDebug('transform: ',t[0],t[1],t[2],t[3],t[4],t[5]); 
    return t;
}

VowelEdge.prototype.applyTransform=function(p,t) {
    var a=p.x-t[0];
    var b=p.y-t[1];
    //logDebug('AT xy',p.x,p.y,'ab',a,b);
    p.x = t[4]*a+t[5]*b;
    p.y = t[4]*b-t[5]*a;
    //logDebug('   xy',p.x,p.y);
    p.x += t[2];
    p.y += t[3];
    //logDebug('   xy',p.x,p.y);
    return p;
}

VowelEdge.prototype.extendCoords=function(p, q, d/*= *1  */) {
    /*  With p-----q-----r, returns r
	@param d if not present, d(QR)==d(PQ), otherwise
	d is the constant distance l\sub1 of QR
     */
    if (arguments.length < 3) {
	return {
	    x:2*q.x-p.x,
	    y:2*q.y-p.y
	};
    } else {
	var a=q.x-p.x;
	var b=q.y-p.y;
	return {
	    x:q.x+a*d,
	    y:q.y+b*d
	};
    }
}

function vMidPoint(p,q,/*optional*/weight/*=.5*/) {
    //returns a point between p and q.  @weight weighs in favor of q
    if (arguments.length<3) weight = 0.5;
    return {x: p.x*(1-weight) + q.x*weight,
	    y: p.y*(1-weight) + q.y*weight};
}

VowelEdge.prototype.midPoint = vMidPoint;


VowelEdge.prototype.passiveCoords=function(p, q, r, which_points) {
    /* 'passive coords', since x,y,z are passive to p,q,r
     * @param which_points is either -1,0,1
     * For shape:
     *      q          -1 returns q,z only,  1 returns x,y only
     *      /\          0 returns all three: x,y,q,z
     * x --t--s-- y
     *    /    \          x=2t-s  y=2s-t
     *  p/  z.  \r        t=p+(q-p)*2/3  s=r+(q-r)*2/3
     *                  so after a bit of algebra:
     *                    x=(p+q)*2/3-r/3
     *                    y=(r+q)*2/3-p/3
     */
    //logDebug('passiveCoords');
    rv=[];
    if (which_points >= 0) {
	rv = [ {x:(q.x+p.x)*2/3-r.x/3, y:(q.y+p.y)*2/3-r.y/3},  
	       {x:(q.x+r.x)*2/3-p.x/3, y:(q.y+r.y)*2/3-p.y/3}  ];
    }
    if (which_points <= 0) {
	rv.push({x:q.x,y:q.y});  //useful for extending coords with z. q is first because z might be abandoned
	rv.push({x:( (p.x+r.x)/2 ),y:( (p.y+r.y)/2 )});
    }
    /*
    var sback = SvgDOM._document.getElementById('back');
    logDebug('p',p.x,'q',q.x,'r array:',rv[0].x,rv[1].x,rv[3].x);
    sback.appendChild(SvgDOM.CIRCLE({r:2,cx:p.x,cy:p.y,'class':'debug'}));
    sback.appendChild(SvgDOM.CIRCLE({r:2,cx:q.x,cy:q.y,'class':'debug'}));
    sback.appendChild(SvgDOM.CIRCLE({r:2,cx:r.x,cy:r.y,'class':'debug'}));
    
    sback.appendChild(SvgDOM.CIRCLE({r:2,cx:rv[0].x,cy:rv[0].y,'class':'debug2'}));
    sback.appendChild(SvgDOM.CIRCLE({r:2,cx:rv[1].x,cy:rv[1].y,'class':'debug3'}));
    sback.appendChild(SvgDOM.CIRCLE({r:2,cx:rv[3].x,cy:rv[3].y,'class':'debug2'}));
    // */
    return rv;
}

VowelEdge.prototype.activeCoords=function(p, q, /*optional*/ r) {
    /* @param r if present, then b is calculated by approx avg of p,q,r
     *`NOTE: orientation is 'calculated' by p-q order
     * returns [a,b,c] for shape:
     *      x b         Angles PTY and QTZ are 60 deg, so PQY is 30
     *      /\         thus we transform new points for a,c
     * p ---.t--- q
     *    /    \       
     *  y/a     \z c     
     */
    //logDebug('activeCoords');
    var self=this;
    var t;
    var b,a,c;
    //var x,y,z;
    /*
    var sback = SvgDOM._document.getElementById('back');
    sback.appendChild(SvgDOM.CIRCLE({r:2,cx:p.x,cy:p.y,'class':'blue'}));
    sback.appendChild(SvgDOM.CIRCLE({r:2,cx:q.x,cy:q.y,'class':'blue'}));
    logDebug('activeCoords2');
    */
    //not sure i have the orientation/translation points correct
    if (r) {
	//sback.appendChild(SvgDOM.CIRCLE({r:3,cx:r.x,cy:r.y,'class':'blue'}));
	//logDebug('  aC:r');
	b = {x:(2*p.x+2*q.x+1*r.x)/5,
	     y:(2*p.y+2*q.y+1*r.y)/5};
    }
    else {//untested
	b = {x:p.x,y:p.y};
	//this transform might be bullshit. cos/sin are vectors, rather than angle-derived
	t= [q.x, q.y, q.x, q.y, 0.5, 0.1];
	self.applyTransform(b,t);
    }
    //logDebug('activeCoords3');
    a = {x:p.x,y:p.y};
    t = [q.x, q.y, q.x, q.y, 0.8660254,-0.5];
    self.applyTransform(a,t);

    t = [p.x, p.y, p.x, p.y, 0.8660254, 0.5];
    var c = {x:q.x,y:q.y};
    self.applyTransform(c,t);
    /*TESTING
    b = {x:(p.x+q.x)/2,y:(p.y+q.y)/2};
    a = {x:q.x,y:q.y-20};
    c = {x:p.x,y:p.y-20};
    logDebug("X's p,q,a,b,c",p.x,q.x,a.x,b.x,c.x);
    sback.appendChild(SvgDOM.CIRCLE({r:2,cx:a.x,cy:a.y,'class':'green'}));
    sback.appendChild(SvgDOM.CIRCLE({r:2,cx:b.x,cy:b.y,'class':'green'}));
    sback.appendChild(SvgDOM.CIRCLE({r:2,cx:c.x,cy:c.y,'class':'green'}));
    */
    //return [x,y,z];
    return [a,b,c];
}

VowelEdge.prototype.splice=function(chain,index,vowel_type_index) {
    /*
      basically, we want to turn a point into a line.  but any
      satelite points will need to be referable between then, and
      not at the singularity.  so you can move the points BUT, then
      make the oldX and oldY the others.
      
      then we need to figure out when to update the satelites.
      this may not be threadsafe, so need a solution, ideally through
      process rather than locking

      also, need to decide whether append is a special case for splice
      or whether we want to abstract the calls that both share.
      
      secondly, why do we wait for Chains.addChain to update chainpos
      and .chain (refresh)?  should this function get called BY Chains.js
      or should we collapse these.  what's the real data model or 
      justification for splitting all this up?
    */
}

VowelEdge.prototype.append=function(chain,vowel_type_index) {
    /* This takes vowel_type_index, creates a vowel object
     * whose points
     * Q: where does chain and chain_pos get set?  A:in addChains()
     */
    var self=this;
    var len=chain.nodes.length;
    //FIX:oldXY getting hackier and hackier. should fold into nodeModel
    var p;
    if (len==0) {
	len=chain.nodes.push(self.nodeModel.init(null));
	p=chain.nodes[0];
	p.oldX=p.x;
	p.oldY=p.y;
    }
    //multiple edges would start loop here
    p=chain.nodes[len-1];
    LENGTH=self.LENGTH;
    var q=self.nodeModel.init( {x:p.x+LENGTH,
				oldX:p.x+LENGTH,
				y:p.y,
				oldY:p.y
			       });
    var dx=q.x-p.x;
    var dy=q.y-p.y;
    //note that this is a transform where oldP=(0,0) and oldQ=(1,0)
    var transform=[-dx,-dy,p.x,p.y,dx/LENGTH,-dy/LENGTH ];
    var vedge=new Vowel(vowel_type_index);
    self.painter.init(vedge, transform, self);
    chain.nodes.push(q);
    chain.edgeContents.push(vedge);
}


FIRST_VOWEL = false;
SECOND_VOWEL = true;
VowelEdge.prototype.firstEdge=function(rel, secondVowel) {
    /* @param secondVowel: determines whether its the first/second column in RELATIONS
       returns whether it's a '1' in the right relation or not
    */
    if (secondVowel) {
	return (Math.abs(rel+1) % 2);
    }
    else {
	return (Math.abs(rel) <= 8);
    }
}

VowelEdge.prototype.countLegs=function(e) {
    //logDebug('countLegs, e.vowel=',e.vowel);
    return Math.floor(Math.abs(e.vowel/4)+1);
}

INTSXN = 1;
DBL_INTRSXN = 2;
MIDDLE_INTRSXN = 3;
VowelEdge.prototype.intersectionType = function(rel) {
    switch(Math.abs(rel)) {
	case 0:
	case 1:
	case 14:
	case 15: return DBL_INTRSXN;
	break;
	case 2:
	case 3:
	case 12:
	case 13: return MIDDLE_INTRSXN;
	break;
	case 4:
	case 5:
	case 10:
	case 11: return INTRSXN;
	break;
    }
    return False;
}

VowelEdge.prototype.isPassiveIntersection = function(rel) {
    //4,5 10,11
    return ( (rel == -4) 
	     || (rel == -5)
	     || (rel == -10)
	     || (rel == -11) );
}
VowelEdge.prototype.isRadiation=function(rel) {
    return ( 9 >= Math.abs(rel) && Math.abs(rel) >= 6);
}

VowelEdge.prototype.addLink=function(e1, e2, rel, chains) {
    /* connects e2, subordinate edge, to e1 with relation
     */
    var self=this;
    var e1_refpoints;

    var e1p = chains[e1.chain].nodes[e1.chainpos];
    var e1q = chains[e1.chain].nodes[e1.chainpos+1];
    var e2p = chains[e2.chain].nodes[e2.chainpos];
    var e2q = chains[e2.chain].nodes[e2.chainpos+1];
    /* going to try implementing without a special area
    if ( self.isRadiation(rel) ) {
	if (rel >= 0) { //e1 is active
	    e1_refpoints = self.passiveCoords(e1p,pt,e1q,-1);
	} else {

	}
	//FINISH
    }
    else {
    */
    /******
	   addLink Step 1: get e1_refpoints
    ******/
	switch (self.countLegs(e1)) {
	    case 1: /* */
	    //logDebug('addlink e1',1);
	    e1_refpoints = self.activeCoords(e1p,e1q);
	    break;
	    
	    case 2: /* passive? 1st/2nd leg? */
	    //logDebug('addlink e1',2);
	    if (rel >= 0) { //e1 is active
		e1_refpoints = self.passiveCoords(e1p, e1.nodes[0], e1q, 0);
	    }
	    else { //e1 is passive
		//logDebug('  firstEdge',self,self.firstEdge(rel, FIRST_VOWEL));
		e1_refpoints = (self.firstEdge(rel, FIRST_VOWEL)) ?
		     self.activeCoords(e1p, e1.nodes[0], e1q)
	            :self.activeCoords(e1.nodes[0], e1q, e1p);
	    }
	    break;

	    case 3: /* totally passive? 1st/2nd? */
	    //logDebug('addlink e1',3);
	    if (self.isPassiveIntersection(rel)) {
		//logDebug('  passive');
		e1_refpoints = (self.firstEdge(rel, FIRST_VOWEL)) ?
		    self.activeCoords(e1p, e1.nodes[0])
		    :self.activeCoords(e1q, e1.nodes[1]);
	    }
	    else {
		var weight =(self.firstEdge(rel, FIRST_VOWEL))? 2/3:1/3;

		var midpoint = self.midPoint(e1.nodes[0],e1.nodes[1],weight);

		e1_refpoints = (self.firstEdge(rel, FIRST_VOWEL)) ?
		    self.passiveCoords(e1p,e1.nodes[0],midpoint,0)
		    :self.passiveCoords(e1q,e1.nodes[1],midpoint,0);
	    }
	    break;
	    default: throw "unsupported number of legs on edge 1";
	}
	//logDebug('Now that we got the refpoints we can set them. rel:',rel);
    /******
	   addLink Step 2: move e2's points
    ******/
	switch(self.countLegs(e2)) {
	case 1: /* */
	{
	    //logDebug('addLink e2', 1, self.isRadiation(rel), rel);
	    if (!self.isRadiation(rel)) {
		self.newXYs([e2p, e2q], e1_refpoints);
	    } else {
		//logDebug('radiation!');
		if (Math.abs(e1.vowel) == 7) {
		    //hack for -o< 
		    //rel will be radiating space2
		    e1_refpoints[0] = e1_refpoints[2];
		    e1_refpoints[1] = self.extendCoords(e1_refpoints[3],e1_refpoints[2]);
		    
		} else {
		    e1_refpoints[0] = self.midPoint(e1_refpoints[2],e1_refpoints[3],0.75);
		    e1_refpoints[1] = self.extendCoords(e1_refpoints[2],e1_refpoints[3]);
		}
		self.newXYs([e2p, e2q], e1_refpoints);
	    }
	}
	break;
	case 2: /* */
	{
	    //logDebug('addLink e2', 2);
	    if (self.isRadiation(rel)) {
		if (rel >= 0) { //e2 is radiating (passive)
		    e1_refpoints.push(self.extendCoords(e1_refpoints[0],e1_refpoints[3]));
		    e1_refpoints[0] = self.midPoint(e1_refpoints[2],e1_refpoints[3],0.75);
		    e1_refpoints[1] = self.extendCoords(e1_refpoints[2],e1_refpoints[3]);
		    e1_refpoints[2] = e1_refpoints.pop();

		    self.newXYs([e2p,e2.nodes[0],e2q], e1_refpoints);
		} else {
		}
	    }
	    else if (self.isPassiveIntersection(rel)) { //e2 is active
		//logDebug('  e2 is active',e2.chain,e2.chainpos);
		//self.newXYs( [e2.nodes[0],e2p,e2q], e1_refpoints);
		self.newXYs( [e2p,e2.nodes[0],e2q], e1_refpoints);
	    }
	    else if (self.isPassiveIntersection(-rel)) { //e2 is passive
		//logDebug('  e2 is passive',e2.nodes[0].x,e1_refpoints[1].x);
		e1_refpoints[2] = self.extendCoords(e1_refpoints[3], e1_refpoints[2]);
		//logDebug('firstEdge?', self.firstEdge(rel, SECOND_VOWEL));
		if (self.firstEdge(rel, SECOND_VOWEL)) {
		    self.newXYs( [e2q,e2.nodes[0],e2p], e1_refpoints);
		} else {
		    self.newXYs( [e2p,e2.nodes[0],e2q], e1_refpoints);
		    //logDebug('ending 2',e2.nodes[0].x);
		}
	    }
	    else { //double/middle intersection
		/*refpoints are already for the right space
		  refpoints are always relative to the interior
		  so firstEdge determines which points are set
		 AND mi/di determines how the points are assigned
		*/
		//put z a little farther out for better symmetry
		e1_refpoints[3] = self.extendCoords(e1_refpoints[2], e1_refpoints[3],0.2);
		e1_refpoints.splice(2,1) //drop q

		var movpoints = [e2p,e2.nodes[0],e2q];
		if (self.intersectionType(rel)==DBL_INTRSXN) {
		    e1_refpoints.unshift(e1_refpoints.pop());
		}

		if (self.firstEdge(rel, SECOND_VOWEL) //XOR
		    ^ self.intersectionType(rel)==MIDDLE_INTRSXN) {
		    self.newXYs( movpoints, e1_refpoints);
		} else {
		    self.newXYs( movpoints.reverse(), e1_refpoints);
		}
	    }
	}
	break;
	case 3: /* */
	{   /*
	      1. based on first or second, make newXY array
	      2. based on passive or active, update newXY array
	      3. based on first or second edge applytransform
	         to the other side
	    */
	    var midpoint = {x: (e2.nodes[0].x+e2.nodes[1].x)/2,
			    y: (e2.nodes[0].y+e2.nodes[1].y)/2 
	    };
	    // 1.
	    var mv_side = (self.firstEdge(rel, SECOND_VOWEL)) ?
		  [e2p,e2.nodes[0],e2.nodes[1]]
		: [e2q,e2.nodes[1],e2.nodes[0]];
	    /*not sure if this is the kind of thing we should
	      put here, but this keeps the thrid edge out of
	      the hair of possible e1 neighbors. so it always
	      points to e1's point. Future logic can make this later
	      based on stresses, but it seems like it would
	      make sense to start it off on a less intrusive foot
	     */
	    if (!self.firstEdge(rel, FIRST_VOWEL)
		&& self.isPassiveIntersection(rel))
		mv_side.reverse();
		/*
	    var mv_side = (self.firstEdge(rel, SECOND_VOWEL)) ?
		  [e2p,e2.nodes[0],midpoint]
		: [e2q,e2.nodes[1],midpoint];
		*/
	    //logDebug('addlink e2-3',midpoint.x,mv_side.length);
	    // 2.
	    if (self.isPassiveIntersection(rel)) { //e2 is active
		self.newXYs(mv_side,e1_refpoints);
	    }
	    else if (self.isPassiveIntersection(-rel)) { //e2 is passive
		e1_refpoints[2] = self.extendCoords(e1_refpoints[3], e1_refpoints[2]);
		self.newXYs(mv_side,e1_refpoints);

	    }
	    else { //double/middle intersection
		//note:copied straight from two-leg code
		//put z a little farther out for better symmetry
		e1_refpoints[3] = self.extendCoords(e1_refpoints[2], e1_refpoints[3],0.5);

		e1_refpoints.splice(2,1); //drop q
		
		if (self.intersectionType(rel)==DBL_INTRSXN) {
		    e1_refpoints.unshift(e1_refpoints.pop());
		}

		if (self.firstEdge(rel, SECOND_VOWEL) //XOR
		    ^ self.intersectionType(rel)==MIDDLE_INTRSXN) {
		    self.newXYs( mv_side, e1_refpoints);
		} else {
		    self.newXYs( mv_side.reverse(), e1_refpoints);
		}

		
	    }
	    // 3. apply transform was unreliable, so we extendcoords
	    if (self.firstEdge(rel, SECOND_VOWEL)) {
		self.newXY(e2q,self.extendCoords(e2p,e2.nodes[1]));
	    } else {
		self.newXY(e2p,self.extendCoords(e2q,e2.nodes[0]));
	    }
	    //logDebug('addlink e2-3 end',midpoint.oldX,midpoint.x,trnsfrm);

	}
	break;
	default: throw "unsupported number of legs on edge 2";
	}
	//logDebug('about to updateView');
    //} //if ( self.isRadiation(rel) ) 
}

if (typeof(Ouwiyaru) == 'undefined') {
    Ouwiyaru = {};
}

Ouwiyaru.NAME = "Ouwiyaru";
Ouwiyaru.VERSION = "0.2";
MochiKit.Base.update(Ouwiyaru, {
    __repr__: function () {
        return "[" + this.NAME + " " + this.VERSION + "]";
    },
    toString: function () {
        return this.__repr__();
    }
});

Ouwiyaru.Labels=function(graph, graphVC) {
    this.graph=graph;
    this.graphVC=graphVC;
    //logDebug('labels');
    graphVC.addGraph(graph);
    //logDebug('labels added graph');
}

Ouwiyaru.Labels.prototype.loadJSONdef=function(deferred) {
    var self=this;
    deferred.addCallbacks(bind(self.loadJSON,self), logError);
}

Ouwiyaru.Labels.prototype.loadJSON=function(gob /*graph object*/) { 
    var self = this;
    /*
      chains:[[%v, %v], ... ],
      links:[[e1_chain, e1_chainpos, e2_chain, e2_chainpos, relation], ... ]
    */
    var c;
    var i;
    //logDebug('_loadJSON',gob.chains);
    for (i=0;i<gob.chains.length;i++) {
	//logDebug('_loadJSON',i);
	c={nodes:[],edgeContents:[]};
	for (j=0;j<gob.chains[i].length;j++) {
	    //logDebug(j,c.nodes.length,i);
	    self.graphVC.edgeModel.append(c,gob.chains[i][j]);
	}
	//logDebug('about to addChains',c.nodes.length,i);
	self.graph.addChains([c]);
	//logDebug('added Chains',c.nodes.length,gob.chains.length,i);
    }
    var link;
    for (i=0;i<gob.links.length;i++) {
	link=gob.links[i];
	c=self.graph.chains;
	//logDebug('_loadJSON:addlinks',i);
	self.graph.addLink(c[link[0]].edgeContents[link[1]], 
			   c[link[2]].edgeContents[link[3]], link[4]);
    }
}

function dist(p,q) {
    var a=q.x-p.x;
    var b=q.y-p.y;
    return Math.sqrt(a*a+b*b);
}

if (typeof(Ouwiyaru.SvgFonts) == 'undefined') {
    Ouwiyaru.SvgFonts={};
    Ouwiyaru.SvgFonts.Simple=function(svgdoc,target) {
	this.NAME="Ouwiyaru.SvgFonts.Simple";
	this.VERSION="0.2";
	this.svgdoc=svgdoc;
	this.target=target;
	this.targetback=target.appendChild(SvgDOM.G({id:'back'}));
	this.targetfront=target.appendChild(SvgDOM.G({id:'front'}));
    }
    Ouwiyaru.SvgFonts.Simple.prototype.init=function(v,transform,edgeModel) {
	if (typeof(v.svgobj) == 'undefined') {
	    var self=this;
	    self.initVowel(v);
	    var i;
	    //logDebug(v.nodes);
	    for (i=0;i<v.nodes.length;i++) {
		//logDebug(i);
		edgeModel.applyTransform(v.nodes[i],transform);
	    }		
	    //logDebug('SvgFonts.Simple.init',v.vowel);
	}
    }

    Ouwiyaru.SvgFonts.Simple.prototype.initVowel=function(v) {
	var self = this;
	self.vowels[Math.abs(v.vowel)].init(v,self)
    }

    

    Ouwiyaru.SvgFonts.Simple.prototype.drawVowel=function(v,chains) {
	//logDebug('drawVowel from SvgFonts',v.vowel);
	var vint;
	var p;
	var q;
	if (v.vowel < 0) {  //backwards
	    vint=Math.abs(v.vowel);
	    p=chains[v.chain].nodes[v.chainpos+1];
	    q=chains[v.chain].nodes[v.chainpos];
	    nodes=v.nodes.slice(0).reverse();//copy the array backwards
	}
	else  {  //normal
	    vint=v.vowel;
	    p=chains[v.chain].nodes[v.chainpos];
	    q=chains[v.chain].nodes[v.chainpos+1];
	    nodes=v.nodes.slice(0);
	}
	this.vowels[vint].draw(v,p,q,nodes,chains);
	//logDebug('end drawVowel from SvgFonts');
    } 

    Ouwiyaru.SvgFonts.Simple.prototype.vowels=
	/* all assumes LENGTH=20 for now */
	[ { /* 0  -- */
	     init:function(v,self) {
		 v.svgobj=SvgDOM.LINE(); //d TAG will be set on drawVowel
		 //logDebug(self);
		 self.targetback.appendChild(v.svgobj);
	     }
	     ,draw:function(v,p,q,nodes) {
		 plc=SvgDOM.placeXY;
		 plc(v.svgobj,p.x,p.y, 0);
		 plc(v.svgobj,q.x,q.y, 1);
	     }
	  }
	  ,{ /* 1  o- */
	     init:function(v,self) {
		 v.svgobj=SvgDOM.LINE(); //d TAG will be set on drawVowel
		 v.svgobj1=SvgDOM.CIRCLE({r:5});
		 //logDebug(self);
		 self.targetback.appendChild(v.svgobj);
		 self.targetfront.appendChild(v.svgobj1);
	     }
	     ,draw:function(v,p,q,nodes) {
		 plc=SvgDOM.placeXY;
		 plc(v.svgobj,p.x,p.y, 0);
		 plc(v.svgobj,q.x,q.y, 1);
		 var a=q.x-p.x;
		 var b=q.y-p.y;
		 var rad = Math.sqrt(a*a+b*b);
		 plc(v.svgobj1, p.x+5*a/rad, p.y+5*b/rad);
	     }
	  }
	  ,{ /* 2  ,( --curvy w/ triangle)*/
	     init:function(v,self) {
		 v.nodes = (v.vowel >= 0) ? [{x:0,y:-5},{x:-5,y:-3}]  
		 : [{x:-15,y:3},{x:-20,y:5}]

		 v.svgobj=SvgDOM.PATH(); //d TAG will be set on drawVowel
		 self.targetback.appendChild(v.svgobj);
	     }
	     ,draw:function(v,p,q,nodes) {
		 var rad=dist(p,q)*4/5;
		 v.svgobj.setAttribute('d',"M"+nodes[1].x+","+nodes[1].y+" L"+nodes[0].x+","+nodes[0].y+" L"+q.x+","+q.y+" A"+rad+","+rad+" 60 0,0 "+p.x+","+p.y);
	     }
	  }
	  ,{ /* 3  (  --curvy line) */
	     init:function(v,self) {
		 v.svgobj=SvgDOM.PATH(); //d TAG will be set on drawVowel
		 self.targetback.appendChild(v.svgobj);
	     }
	     ,draw:function(v,p,q,nodes,chains) {
		 var oneIfNeg = v.vowel/(-6) + 0.5;
		 var love = chains[v.chain].edgeContents[v.chainpos+(oneIfNeg*-2 +1)].nodes.slice(0);
		 if (v.vowel < 0) {
		     love.reverse();
		 }
		 var t1 = vMidPoint(q,love[1],0.2);
		 var t2 = vMidPoint(q,love[0],0.25);
		 var rad=dist(p,q)*4/5;
		 v.svgobj.setAttribute('d',"M"+p.x+","+p.y+" A"+rad+","+rad+" 60 0,"+oneIfNeg+" "+q.x+","+q.y+" T"+t1.x+","+t1.y+" L"+t2.x+","+t2.y);
	     }
	  }
	  ,{ /* 4  /\ */
	      init:function(v,self) {
		  v.nodes=[{x:-10,y:-15}];
		  
		  v.svgobj=SvgDOM.PATH(); //d TAG will be set on drawVowel
		  //logDebug(self);
		  self.targetback.appendChild(v.svgobj);
	      }
	      ,draw:function(v,p,q,nodes) {
		  v.svgobj.setAttribute('d',"M"+p.x+","+p.y+" L"+nodes[0].x+","+nodes[0].y+" L"+q.x+","+q.y);
	      }
	  }
	  ,{ /* 5  \o/ */
	      init:function(v,self) {
		  v.nodes=[{x:-10,y:-15}];
		  
		  v.svgobj=SvgDOM.PATH(); //d TAG will be set on drawVowel
		  v.svgobj1=SvgDOM.CIRCLE({r:5}); //d TAG will be set on drawVowel
		  //logDebug(self);
		  self.targetback.appendChild(v.svgobj);
		  self.targetfront.appendChild(v.svgobj1);
	      }
	      ,draw:function(v,p,q,nodes) {
		  v.svgobj.setAttribute('d',"M"+p.x+","+p.y+" L"+nodes[0].x+","+nodes[0].y+" L"+q.x+","+q.y);
		  SvgDOM.placeXY(v.svgobj1,nodes[0].x,nodes[0].y);
	      }
	  }
	  ,{ /* 6  J) */
	      init:function(v,self) {
		  v.nodes=[{x:-10,y:-15}];
		  
		  v.svgobj=SvgDOM.PATH(); //d TAG will be set on drawVowel
		  //logDebug(self);
		  self.targetback.appendChild(v.svgobj);
	      }
	      ,draw:function(v,p,q,nodes) {
		  //eliptic coords method 
		  //var rad=dist(p,q)*1.1;
		  //v.svgobj.setAttribute('d',"M"+p.x+","+p.y+" A"+rad+","+rad+" 0 0,1 "+nodes[0].x+","+nodes[0].y+" A"+rad+","+rad+" 0 0,0 "+q.x+","+q.y);
		  //Quadratic bezier curve method
		  var xy = VowelEdge.prototype.passiveCoords(p,nodes[0],q,1);
		  //var mid = {x:(xy[0].x+xy[1].x)/2 , y:(xy[0].y+xy[1].y)/2 };
		  var mid = {x:(xy[0].x+2*xy[1].x)/3 , y:(xy[0].y+2*xy[1].y)/3 };
		  //v.svgobj.setAttribute('d',"M"+p.x+","+p.y+" Q"+mid.x+","+mid.y+" "+nodes[0].x+","+nodes[0].y+" Q"+xy[1].x+","+xy[1].y+" "+q.x+","+q.y);
		  v.svgobj.setAttribute('d',"M"+p.x+","+p.y+" Q"+mid.x+","+mid.y+" "+nodes[0].x+","+nodes[0].y+" Q"+xy[1].x+","+xy[1].y+" "+q.x+","+q.y);
	      }
	  }
	  ,{ /* 7  >o- */
	      init:function(v,self) {
		  v.nodes=[{x:-10,y:-15}];
		  
		  v.svgobj=SvgDOM.PATH(); //d TAG will be set on drawVowel
		  v.svgobj1=SvgDOM.CIRCLE({r:5}); //d TAG will be set on drawVowel
		  //logDebug(self);
		  self.targetback.appendChild(v.svgobj);
		  self.targetfront.appendChild(v.svgobj1);
	      }
	      ,draw:function(v,p,q,nodes) {
		  v.svgobj.setAttribute('d',"M"+p.x+","+p.y+" L"+nodes[0].x+","+nodes[0].y+" L"+q.x+","+q.y);
		  SvgDOM.placeXY(v.svgobj1,nodes[0].x,nodes[0].y);
	      }
	  }
	  ,{ /* 8  /\/ */
	     init:function(v,self) {
		 //ASSUMING \/\ vowel for starters
		 v.nodes=(v.vowel >= 0) ? [{x:-15,y:-10},{x:-10,y:5}]:[{x:-10,y:5},{x:-5,y:-10}];
		 //v.nodes=[{x:-15,y:-10},{x:-10,y:5}];
		 
		 v.svgobj=SvgDOM.PATH(); //d TAG will be set on drawVowel
		 //logDebug(self);
		 self.targetback.appendChild(v.svgobj);
	     }
	     ,draw:function(v,p,q,nodes) {
		 v.svgobj.setAttribute('d',"M"+p.x+","+p.y+" L"+nodes[0].x+","+nodes[0].y+" L"+nodes[1].x+","+nodes[1].y+" L"+q.x+","+q.y);
	     }
	}
	 ,{ /* 9  o/\/ */
	     init:function(v,self) {
		 //ASSUMING \/\ vowel for starters
		 v.nodes=(v.vowel >= 0) ? [{x:-15,y:-9},{x:-10,y:5}]:[{x:-10,y:5},{x:-5,y:-9}];
		 //v.nodes=[{x:-15,y:-10},{x:-10,y:5}];
		 
		 v.svgobj=SvgDOM.PATH(); //d TAG will be set on drawVowel
		 v.svgobj1=SvgDOM.CIRCLE({r:5});

		 self.targetback.appendChild(v.svgobj);
		 self.targetfront.appendChild(v.svgobj1);
	     }
	     ,draw:function(v,p,q,nodes) {
		 var a = 0.2;
		 //var b = 1.2;
		 //if (v.vowel >= 0) {b*=2;} else {a*=2;}
		 var leg1= VowelEdge.prototype.extendCoords(p,nodes[0],a);
		 var leg2= VowelEdge.prototype.extendCoords(nodes[1],nodes[0],a);
		 v.svgobj.setAttribute('d',"M"+p.x+","+p.y+" L"+leg1.x+","+leg1.y+" M"+leg2.x+","+leg2.y+" L"+nodes[1].x+","+nodes[1].y+" L"+q.x+","+q.y);
		 SvgDOM.placeXY(v.svgobj1, p.x, p.y);
	     }
	 }
	  ,{ /* 10  ,/\/ */
	     init:function(v,self) {
		 //ASSUMING \/\ vowel for starters
		 v.nodes=(v.vowel >= 0) ? [{x:-10,y:5},{x:-5,y:-10}]
		         : [{x:-15,y:-10},{x:-10,y:5}];
		 
		 v.svgobj=SvgDOM.PATH(); //d TAG will be set on drawVowel
		 self.targetback.appendChild(v.svgobj);
	     }
	     ,draw:function(v,p,q,nodes) {
		 v.svgobj.setAttribute('d',"M"+p.x+","+p.y+" L"+nodes[0].x+","+nodes[0].y+" L"+nodes[1].x+","+nodes[1].y+" L"+q.x+","+q.y);
	     }
	 }
	  ,{ /*( 11  J)/o */
	     init:function(v,self) {
		 //ASSUMING \/\ vowel for starters
		 v.nodes = (v.vowel >= 0) ? [{x:-13,y:5},{x:-10,y:-20}]
		           : [{x:-10,y:10},{x:-10,y:-5}];
		 
		 //v.nodes=[{x:-15,y:20},{x:-10,y:-10}];

		 v.svgobj=SvgDOM.PATH(); //d TAG will be set on drawVowel
		 v.svgobj1=SvgDOM.CIRCLE({r:5});

		 self.targetback.appendChild(v.svgobj);
		 self.targetfront.appendChild(v.svgobj1);
	     }
	     ,draw:function(v,p,q,nodes) {
		 //obviously borrowed from J) vowel
		 //FIX: still needs work
		 var xy = VowelEdge.prototype.passiveCoords(p,nodes[0],q,1);
		 //var mid = {x:(xy[0].x+xy[1].x)/2 , y:(xy[0].y+xy[1].y)/2 };
		 var mid = {x:(xy[0].x+2*xy[1].x)/3 , y:(xy[0].y+2*xy[1].y)/3 };
		 //v.svgobj.setAttribute('d',"M"+p.x+","+p.y+" Q"+mid.x+","+mid.y+" "+nodes[0].x+","+nodes[0].y+" Q"+xy[1].x+","+xy[1].y+" "+q.x+","+q.y);
		 v.svgobj.setAttribute('d',"M"+p.x+","+p.y+" Q"+mid.x+","+mid.y+" "+nodes[0].x+","+nodes[0].y+" Q"+xy[1].x+","+xy[1].y+" "+nodes[1].x+","+nodes[1].y+" L"+q.x+","+q.y);
		 SvgDOM.placeXY(v.svgobj1, q.x, q.y);	     }
	  }
	  ]; /* end of .vowels */
}

if (typeof(Ouwiyaru.Elements) == 'undefined') {
    Ouwiyaru.Elements={};
    Ouwiyaru.Elements.Simple=function(svgdoc,target) {
	this.NAME="Ouwiyaru.Elements.Simple";
	this.VERSION="0.2";
	this.__init__(svgdoc,target);
	this.nodeModel=new GraphNode();
	this.painter=new Ouwiyaru.SvgFonts.Simple(this.svgdoc,this.target);
	this.edgeModel=new VowelEdge(this.nodeModel,this.painter);
    }
    Ouwiyaru.Elements.Simple.prototype= new SvgGraph.Elements.Base();

    Ouwiyaru.Elements.Simple.prototype.addGraph=function(graph){
	var self=this;
	var last=self.graphs.push(graph)-1;
	SvgDOM.scale(self.target, 0.6);
	//animId = 0;
	//window.setTimeout(self.graphs[last].relax, 200);
	var graph = self.graphs[last];
	animId=window.setInterval(graph.relax,100);
	paintId = window.setInterval(function(){
	    forEach(graph.getEdges(), function(edge) {
		self.painter.drawVowel(edge.content,graph.chains); //paint
	    });
	},100);
	var TIMEOUT=6000;
	//window.setTimeout('window.clearInterval("'+animId+'");',TIMEOUT);
	// /*
	//window.setTimeout(partial(self.centerGraph,self),TIMEOUT/1000);
		return animId;
		//add an interval where i'm also updating applyDxy
		//*/
    }



}
