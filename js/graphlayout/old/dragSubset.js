	nodeUp=null;
	DNodes={};
	DEdges={};
	dCount=4;
	edgesUp=new Object();
	nodeListener=null;
	nodeSelected=null;
	dummynode={x:0,y:0};
	rigidity=1;
	console=null;
	damper=1.0;
	damping=true;
	motionRatio=0.0;
	maxMotion=0.0;


	function pickNode(evt) {
		if (evt.target.getAttribute('xlink:href')) {
			if (evt.target.getAttribute('xlink:href') == '#voteY') {
				alert('yes!');
			}
			else if (evt.target.getAttribute('xlink:href') == '#voteN') {
				alert('no!');
			}
		}
	   	else {
			nodeUp = DNodes[evt.target.parentNode.id];
//			evt.target.parentNode.childNodes.item(2).style.setProperty('display','block','important');  //crashes Firefox 1.5 Beta 1
			if (!nodeListener) {
				edgesUp=getEdges(nodeUp);
				document.documentElement.addEventListener("mousemove",dragNode,false);
				document.documentElement.addEventListener("mouseout",dragNode,false);
				document.documentElement.addEventListener("mouseup",dropNode,false);
				if (nodeSelected && nodeSelected != nodeUp) {
					nodeSelected.obj.childNodes.item(0).style.setProperty('fill','white','important');
				}
				nodeSelected=nodeUp;
			}
			else {
				nodeListener(nodeUp);
			}
		}
}

function ontoNode(nodeId) {
}

function getEdges(node) {
		edges=new Object();
		edges.to=new Array();
		edges.from=new Array();

		sumEdges = function (e) {
			if (e.q == node) {
			   edges.to.push(e);
			}
			else 
			if (e.p == node) {
			   edges.from.push(e);
			}  
			}
		forEachEdge(sumEdges);
		return edges;
}

function updateEdges(edges, x, y) {
		for(i=0; i<edges.to.length; i++) {
			edges.to[i].obj.setAttribute("x2",x);
			edges.to[i].obj.setAttribute("y2",y);
		}
		for(i=0; i<edges.from.length; i++) {
			edges.from[i].obj.setAttribute("x1",x);
			edges.from[i].obj.setAttribute("y1",y);
		}
}

function tempEdge(evt) {
		if (nodeSelected) {
			nodeSelected.obj.childNodes.item(0).style.setProperty('fill','white','important');
			nodeSelected=null;
		}
		nodeUp=dummynode;
		e=makeEdge(DNodes[evt.target.parentNode.id],nodeUp,"temp",false);
		edgesUp={to:[e],from:[]};
		document.documentElement.addEventListener("mousemove",drawEdge,false);
		document.documentElement.addEventListener("mouseup",dropEdge,false);
		drawEdge(evt);
		e.obj.style.setProperty('display','inline','important');
		document.getElementById('addEdge').style.setProperty('display','none','important');
}

function drawEdge(evt) {
		updateEdges(edgesUp, evt.clientX, evt.clientY);
		nodeUp.x=evt.clientX;
		nodeUp.y=evt.clientY;
}

function dropEdge(evt) {
		document.documentElement.removeEventListener("mousemove",drawEdge,false);
		document.documentElement.removeEventListener("mouseup",dropEdge,false);
		
		if (evt.target.id != 'canvas' && evt.target.parentNode.getAttribute("class") == "node" && evt.target.parentNode.id != edgesUp.to[0].p.obj.id) {
			edgesUp.to[0].q=DNodes[evt.target.parentNode.id];
			console.update('edge',edgesUp.to[0]);
		}
		else {
			removeEdge(edgesUp.to[0].obj.id);
			document.getElementById('addEdge').style.setProperty('display','inline','important');	
		}
		edgesUp={to:[],from:[]};
		nodeUp=null;
		
}

function updateNodeCoords(n) {
	n.dx*=damper;
	n.dy*=damper;
	n.x=n.x*1 + n.dx*1;  //multiply by 1 so javascript knows they're numbers
	n.y=n.y*1 + n.dy*1;
	text="translate("+n.x+","+n.y+")";
	n.obj.setAttribute("transform", text);
}

function updateEdgeCoords(e) {
	to=e.q;
	from=e.p;
	e.obj.setAttribute("x2",to.x);
	e.obj.setAttribute("y2",to.y);
	e.obj.setAttribute("x1",from.x);
	e.obj.setAttribute("y1",from.y);
}

function dragNode(evt) {
		if (nodeUp) {
			updateEdges(edgesUp, evt.clientX-20, evt.clientY+10);
			nodeUp.x=evt.clientX-20;
			nodeUp.y=evt.clientY+10;
			updateNodeCoords(nodeUp);
		}
	}

function dropNode(evt) {
		if (nodeUp) {
			document.documentElement.removeEventListener("mousemove",dragNode,false);
			document.documentElement.removeEventListener("mouseout",dragNode,false);
			document.documentElement.removeEventListener("mouseup",dropNode,false);
		}
//		document.onmousemove=null;
//		document.onmouseup=null;
		if (nodeSelected) {
			nodeSelected.obj.childNodes.item(0).style.setProperty('fill','yellow','important');
		}
		nodeUp=null;
		damper=RESET_DAMPER;
	} //dropNode

function nodeSelected (nv) {
		if (nv && (nodeSelected != nv)) {
			if (nodeSelected) {
				nodeSelected.obj.childNodes.item(0).style.setProperty('fill','white','important');
			}
			nodeSelected=nv;
			nodeSelected.obj.childNodes.item(0).style.setProperty('fill','yellow','important');
		}
		return nodeSelected;
	}

	function drawEdge(evt) {
		updateEdges(edgesUp, evt.clientX, evt.clientY);
		nodeUp.x=evt.clientX;
		nodeUp.y=evt.clientY;
	}

	function dropEdge(evt) {
		document.documentElement.removeEventListener("mousemove",drawEdge,false);
		document.documentElement.removeEventListener("mouseup",dropEdge,false);
		
		if (evt.target.id != 'canvas' && evt.target.parentNode.getAttribute("class") == "node" && evt.target.parentNode.id != edgesUp.to[0].p.obj.id) {
			edgesUp.to[0].q=DNodes[evt.target.parentNode.id];
			console.update('edge',edgesUp.to[0]);
		}
		else {
			removeEdge(edgesUp.to[0].obj.id);
			document.getElementById('addEdge').style.setProperty('display','inline','important');	
		}
		edgesUp={to:[],from:[]};
		nodeUp=null;
		
	}

function removeEdge(eID) {
	document.getElementById('edges').removeChild(document.getElementById(eID));
	delete DEdges[eID];
}
