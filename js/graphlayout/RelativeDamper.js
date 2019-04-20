/* Damper which damps based on relative movement between nodes
 *
 */

function RelativeDamper(nodeModel) {
    this.nodeModel = nodeModel;
    this.noderefs = {};
    this.origpoints = {};
    this.round = 0;
    this.threshold = 1;
    this.damping = true;
    this.origDamper = 0.85;
    this.reset();
}
RelativeDamper.prototype.reset = function() {
    this.damper = this.origDamper;
    this.lastMaxMotion=0.0;
    this.maxMotion=0.0;
    this.motionRatio=0.0;
    this.damping=true;
    this.dampPhase=0;
    this.round = 0;

    return this.damper;
}

/* @nIter is a node Iterator for points that are
 * good to determine the stability of the graph
 * Good candidates are chain ends
 * We will randomize our selection, so being more inclusive is better
 */
RelativeDamper.prototype.startRound = function(nIter) {
    var self = this;
    var round = ++this.round;
    this.noderefs[round] = [];
    this.origpoints[round] = [];
    this.lastMaxMotion = this.maxMotion;
    this.maxMotion = 0.0;

    var th = this.threshold;
    forEach(nIter, function(n) {
	if (Math.random() > th) return;
	self.noderefs[round].push(n);
	var p = self.nodeModel.getXY(n);
	self.origpoints[round].push(p);
    });
    return round;
}

RelativeDamper.prototype.finishRound = function(round) {
    var points_final = list(map(this.nodeModel.getXY,this.noderefs[round]));

    var dist_orig = this.distance_norm(this.origpoints[round]);
    var dist_final = this.distance_norm(points_final);

    this.maxMotion = Math.abs(dist_final-dist_orig);
    this.motionRatio =(this.maxMotion>0)?this.lastMaxMotion/this.maxMotion-1:0;
    this.dropRound(round);
}

RelativeDamper.prototype.dropRound = function(round) {
    delete this.noderefs[round];    
    delete this.origpoints[round];
}

RelativeDamper.prototype.distance_norm = function(points) {
    var pairs = Math.floor(points.length/2);
    var dist =0;
    while (--pairs>0) {
	var p1 = points[pairs*2+1];
	var p2 = points[pairs*2];
	var dx = p2.x-p1.x;
	var dy = p2.y-p1.y;
	dist += (dx*dx + dy*dy);//max() seems to behave similarly
    }
    return dist;
}

RelativeDamper.prototype.damp = function() {
    ///We divide by 10 because some letters get more
    ///affected by the damping than others, and so
    ///slowing down irregularly increases the difference
    this.damper = Math.min(0.87,this.maxMotion/10);
    return this.damper;
}

RelativeDamper.prototype.startDamper = TGDamper.prototype.startDamper;
RelativeDamper.prototype.stopDamper = TGDamper.prototype.stopDamper;
