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

if (typeof(TGGraphLayout) == 'undefined') {
    TGGraphLayout = {};
}

TGGraphLayout.NAME = "TGGraphLayout";
TGGraphLayout.VERSION = "0.1";
TGGraphLayout.__repr__ = function () {
    return "[" + this.NAME + " " + this.VERSION + "]";
};
TGGraphLayout.toString = function () {
    return this.__repr__();
};

TGGraphLayout.EXPORT = [
    "relaxEdges",
    "repelNodes",
    "updateNodeCoords",
    "startDamper",
    "stopDamper",
    "damp",
    "stress",
    "relax"
];

TGGraphLayout.EXPORT_OK = [
];

TGGraphLayout._relaxEdge = function (e) {

}
TGGraphLayout._repelNodes = function (m,n) {

}
TGGraphLayout._updateNodeCoords = function (n) {

}
TGGraphLayout.relaxEdges = function (iedges /*iterator*/) {

}
TGGraphLayout.repelNodes = function (inodepairs /*iterator*/) {

}
TGGraphLayout.updateNodeCoords = function (inodes /*iterator*/) {

}
TGGraphLayout.startDamper = function () {

}
TGGraphLayout.stopDamper = function () {

}
TGGraphLayout.damp = function () {

}
TGGraphLayout.stress = function (iedges,inodepairs) {

}
TGGraphLayout.relax = function (iedges,inodepairs,inodes) {

}


MochiKit.Base._exportSymbols(this, TGGraphLayout);