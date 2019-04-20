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

	function damp() {
		//ripped from touchgraph, copyright Alex Shapiro
        if (damping) {
            if(motionRatio<=0.001) {  //This is important.  Only damp when the graph starts to move faster
                                      //When there is noise, you damp roughly half the time. (Which is a lot)
                                      //
                                      //If things are slowing down, then you can let them do so on their own,
                                      //without damping.

                //If max motion<0.2, damp away
                //If by the time the damper has ticked down to 0.9, maxMotion is still>1, damp away
                //We never want the damper to be negative though
                if ((maxMotion<0.2 || (maxMotion>1 && damper<0.9)) && damper > 0.01) damper -= 0.01;
                //If we've slowed down significanly, damp more aggresively (then the line two below)
                else if (maxMotion<0.4 && damper > 0.003) damper -= 0.003;
                //If max motion is pretty high, and we just started damping, then only damp slightly
                else if(damper>0.0001) damper -=0.0001;
            }
        }
        if(maxMotion<0.001 && damping) {
            damper=0;
        }
    }


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

function removeEdge(eID) {
	document.getElementById('edges').removeChild(document.getElementById(eID));
	delete DEdges[eID];
}

function relaxEdge(e) {
	to=e.q;
	from=e.p;

//	tlocal=(to.getAttribute("status") == "local");
//	flocal=(from.getAttribute("status") == "local");
	tlocal=false;
	flocal=false;
        vx = to.x - from.x;
        vy = to.y - from.y;
        len = Math.sqrt(vx * vx + vy * vy);

         dx=vx*rigidity;
         dy=vy*rigidity;
	elength=(e.length) ? e.length : 40;
        dx /=(elength*100);
        dy /=(elength*100);

	tdx=to.dx;
	tdy=to.dy;
	fdx=from.dx;
	fdy=from.dy;

        if(tlocal || !flocal) {
            tdx -= dx*len;
            tdy -= dy*len;
        }
        else {
            tdx -= dx*len/10;
            tdy -= dy*len/10;
        }
        if(flocal || !tlocal) {
            fdx =fdx*1+ dx*len;
            fdy =fdy*1+ dy*len;
        }
        else {
            fdx =fdx*1+ dx*len/10;
            fdy =fdy*1+ dy*len/10;
        }

	to.dx=tdx;
	to.dy=tdy;
	from.dx=fdx;
	from.dy=fdy;
}

function repelNodes(m,n) {
 	dx=0;
        dy=0;
        vx = m.x - n.x;
        vy = m.y - n.y;
        len = vx * vx + vy * vy; //so it's length squared
        if (len == 0) {
            dx = Math.random()*5; //If two nodes are right on top of each other, randomly separate
            dy = Math.random()*5;
        } else if (len <300*300) {
            dx = vx / len; 
            dy = vy / len; 
        }

//        int repSum = m.repulsion * n.repulsion/100;

	repSum = 100;

//+++	mlocal=(m.getAttribute("status") == "local");
//+++	nlocal=(n.getAttribute("status") == "local");
	mlocal=false;
	nlocal=false;
	mdx=m.dx;
	mdy=m.dy;
	ndx=n.dx;
	ndy=n.dy;

        if(mlocal || !nlocal) {
            mdx = mdx*1+ dx*repSum*rigidity;
            mdy = mdy*1+ dy*repSum*rigidity;
        }
        else {
            mdx = mdx*1+ dx*repSum*rigidity/10;
            mdy = mdy*1+ dy*repSum*rigidity/10;
        }
        if (nlocal || !mlocal) {
            ndx -= dx*repSum*rigidity;
            ndy -= dy*repSum*rigidity;
        }
        else {
            ndx -= dx*repSum*rigidity/10;
            ndy -= dy*repSum*rigidity/10;
        }
	m.dx=mdx;
	m.dy=mdy;
	n.dx=ndx;
	n.dy=ndy;
}

function relax(edgeSet) {
    fee=function(e) {relaxEdge(e);}
    forEachEdge(fee);
    fenp=function(n1,n2) {repelNodes(n1,n2);}
    forEachNodePair(fenp);
    fen=function(n) {updateNodeCoords(n);}
    forEachNode(fen);
    fee=function(e) {updateEdgeCoords(e);}
    forEachEdge(fee);
    damp();
}

function forEachNodePair(fenp) {
	allNodes={};
	var j;
	for(var i in DNodes) {
	   if(!j) {j=i;}
	   else {
		fenp(DNodes[j],DNodes[i]);
		allNodes[i]=DNodes[i];
           }
	}
	for(var i in allNodes) {
	    for(var j in allNodes) {
		if (i==j) { delete allNodes[j]; 	} 
		else      { fenp(DNodes[i],DNodes[j]);  }
	    }
	}
}

function forEachNode(fen) {
	for(var i in DNodes) {
	   fen(DNodes[i]);
	}
}

function forEachEdge(fee) {
	for(var i in DEdges) {
		fee(DEdges[i]);
	}
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

	function makeNode(message,id,x,y) {
		n=document.createElementNS("http://www.w3.org/2000/svg","g");
		dCount++;
		if (!id) {id="n"+dCount;}
		n.id=id;
		if (!x) {x=document.documentElement.getAttribute("width")*Math.random();}
		if (!y) {y=document.documentElement.getAttribute("height")*Math.random();}

		DNodes[id]={x:x,y:y,dx:0,dy:0,obj:n,summary:message};

		n.setAttribute("x", x);
		n.setAttribute("y", y);
		updateNodeCoords(DNodes[id]);
		n.setAttribute("onmousedown", "pickNode(evt)");
		n.setAttribute("onmouseup", "ontoNode('"+id+"')");
		n.setAttribute("class","node");
		r=document.createElementNS("http://www.w3.org/2000/svg","rect");
		font=7; //hack the font for now;
		r.setAttribute("x",-font);
		r.setAttribute("y",-15);
		r.setAttribute("width",font*(message.length+3));
		r.setAttribute("height",20);
		t=document.createElementNS("http://www.w3.org/2000/svg","text");
		text=document.createTextNode(message);
		t.appendChild(text);
//		v=document.createElementNS("http://www.w3.org/2000/svg","use");
//		v.setAttribute("xlink:href","#votingbox");
//		v.setAttribute("x",-font);
//		v.setAttribute("y",5);
		v=document.getElementById('origVote').cloneNode(true);
		a=document.getElementById('origAddEdge').cloneNode(true);

		n.appendChild(r);
		n.appendChild(t);
		n.appendChild(v);
		n.appendChild(a);

		document.getElementById('nodes').appendChild(n);
//		document.documentElement.appendChild(n);
//		n.addEventListener("mousedown",pickNode,false);
		return DNodes[id];
	} //makeNode

	function makeEdge(from, to, type, id) {
		e=document.createElementNS("http://www.w3.org/2000/svg","line");
		dCount++;
		if (!id) { id='e'+dCount;}
		if (typeof(from) == 'string') {	from=DNodes[from];	}
		if (typeof(to)   == 'string') {	  to=DNodes[to];	}

		DEdges[id]={p:from,q:to,length:0,implies:type,obj:e};

		e.id=id;

		e.setAttribute("class", type);

		e.setAttribute("x1",from.x);
		e.setAttribute("y1",from.y);

		e.setAttribute("x2",to.x);
		e.setAttribute("y2",to.y);
		document.getElementById('edges').appendChild(e);

		return DEdges[id];
	} // makeEdge

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
	function updateFromConsole(command,obj) {
		if (command =='register') {
			console=obj;
		}
		else if (command =='cancelEdge') {
			removeEdge(obj);
		}
	}

	function main() {
		document.makeEdge = function (from, to, type,id) {
			rv=makeEdge(from,to,type,id);
			return rv;
		} 
		document.makeNode = function (message,id,x,y) {
			rv=makeNode(message,id,x,y);
			return rv;
		}
		document.update = function (command, obj) {
			updateFromConsole(command,obj);
		}

//		document.nodeSelected = function (nv) {	rv=nodeSelected(nv);return rv;	}


//		document.relax = function (edgeSet) {relax(edgeSet);}
		window.setInterval("relax()",10)

	}

