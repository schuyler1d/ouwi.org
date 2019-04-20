var story;
var svgdoc;

function InitializeStory() {
    story = new Story();
}
addLoadEvent(InitializeStory);

function Story() {
    this.NAME = 'Story';
    this.VERSION = '0.1';
    this.highlighted_word = false;
    this.highlighted_line = false;
    this.story_telling = false;
    this.timeout = null;
    window.name="ouwiyaruStory";

    svgdoc = this.svgdoc = this.getSVGDocument();
    if (svgdoc != null) {
	this.basewidth = 1*getNodeAttribute(svgdoc.documentElement,'width').replace(/[a-zA-Z]/g,'');
	this.baseheight = 1*getNodeAttribute(svgdoc.documentElement,'height').replace(/[a-zA-Z]/g,'');
    } else {//IE SUCKS AGAIN!
	this.basewidth = $('primaryimage-img').width;
	this.baseheight = $('primaryimage-img').height;
    }
    this.onResize();
    connect(window, 'onresize', this, this.onResize);

    this.tellStory();

    this.storiesmenu=connect('storieslink','onmousedown',this,this.openStoriesMenu);
    this.finish=connect('storyfinish','onmousedown',this,this.finishStory);
    this.nextline=connect('storynextline','onmousedown',this,this.tellStoryLine);
}

Story.prototype.getSVGDocument = function() {
    var svg_object = document.getElementById('primaryimage');
    if (typeof svg_object.getSVGDocument == 'function') {
	try {
	    return svg_object.getSVGDocument();
	} catch(e) {
	    logError('NO SVG SUPPORT');
	    return null;	    
	}
    } else if (svg_object.contentDocument) {
	//for firefox <= 3.0
	return svg_object.contentDocument;
    }
    else {
	logError('NO SVG SUPPORT');
	return null;
    }
}

Story.prototype.highlightLine = function(line_int,line_obj) {
    var self = this;
    var cls;
    if (self.highlighted_line) { //html
	removeElementClass(self.highlighted_line,'highlight');
    }
    if (self.highlighted_word) { //SVG
	cls = getNodeAttribute(self.highlighted_word,'class');
	setNodeAttribute(self.highlighted_word,'class',cls.replace(' highlight',''));
	
	//removeElementClass(self.highlighted_word,'highlight');
    }
    if (line_obj) {
	addElementClass(line_obj,'highlight');
	self.highlighted_line = line_obj;
    }

    if (self.svgdoc != null) {
	// color SVG word
	var svg_word = self.svgdoc.getElementById('w'+line_int);
	cls = getNodeAttribute(svg_word,'class');
	setNodeAttribute(svg_word,'class',cls+' highlight');

	//addElementClass(svg_word,'highlight');
	self.highlighted_word = svg_word;
    }
}

Story.prototype.pauseStory = function() {
    var self = this;
    window.clearInterval(self.timeout);
    self.timeout = null;
    logDebug('pauseStory');
    //replace 'pause' with 'continue'
    disconnect(this.storycontroller);
    this.storycontroller=connect('storycontroller','onmousedown',this,this.continueStory);
    $('storycontroller').innerHTML = '[continue]';
    setDisplayForElement('inline','storynextline');
}

Story.prototype.continueStory = function() {
    var delay = 3000;
    var self = this;    
    logDebug('continueStory');
    if (self.storycontroller) {
	disconnect(self.storycontroller);
    }
    self.storycontroller=connect('storycontroller','onmousedown',this,this.pauseStory);
    $('storycontroller').innerHTML = '[pause]';

    self.timeout = window.setInterval(function(){
	self.tellStoryLine();
    },delay);
    hideElement('storynextline');
}

Story.prototype.finishStory = function() {
    var self = this;
    if (self.timeout === null) {
	self.continueStory();
    }
    exhaust(self.story_telling);
}

Story.prototype.getVindex = function(line) {
    return getNodeAttribute(line,'name').substr(9);
}

Story.prototype.tellStoryLine = function() {
    var self = this;
    try {
	//logDebug('still going');
	var line = self.story_telling.next();
	self.highlightLine(self.getVindex(line),line);
    } catch(e) {
	logDebug('error',e);
	window.clearInterval(self.timeout);
	if (e === MochiKit.Iter.StopIteration) {
	    self.browseStoryMode();
	    fade('storycontrols');
	}
    }
}

Story.prototype.tellStory = function() {
    var self = this;
    self.story_telling = self.storyTellerIterator();
    var timeout = null;
    self.tellStoryLine();
    self.continueStory();
}

Story.prototype.storyTellerIterator = function() {
    var storylines = iter(getElementsByTagAndClassName(null,'storyline'));
    return {
	next: function() {
	    var line = storylines.next();
	    if (line.style.display !== 'block') {
		appear(line);
	    }
	    return line;
	}
    }

}

Story.prototype.browseStoryMode = function() {
    var self = this;
    var done_vowels = new Array(27);
    forEach(self.storyTellerIterator(), function(line) {
	var vint = self.getVindex(line);
	connect(line,
		'onmouseover',
		self, 
		partial(self.browseStoryLine,
			vint,
			line,false)
		);
	try { //IE sux
	    if (done_vowels[vint-1] !== 1) {
		connect(self.svgdoc.getElementById('w'+vint),
			'onmouseover',
			self, 
			partial(self.browseStoryLine,
				vint,
				line,true)
			);
		done_vowels[vint-1] = 1;
	    }
	} catch(e) {/*pass*/}

    });
    $('wordnotes').innerHTML = 'Browse the story and its words by moving your mouse over the symbols in the image or the translation.';
    

}

Story.prototype.browseStoryLine = function(line_int,line_obj,browse_to,evt) {
    var self = this;
    self.highlightLine(line_int,line_obj);
    if (browse_to) {
	ScrollTo(line_obj,{offset:-100});
    }
    // show literal translation at top of page
    $('wordnotes').innerHTML = line_int+':"'+$('word'+line_int).innerHTML+'" literally: '+$('literal'+line_int).innerHTML;
}

Story.prototype.onResize = function(event) {
    var self = this;
    var wd = getViewportDimensions();
    //wd.w -= 300;
    if (self.basewidth > self.baseheight) {
	wd.w = Math.floor(wd.w*0.50);
	wd.h = Math.floor(self.baseheight*wd.w/self.basewidth);
    } else {
	wd.h = Math.floor(Math.min(wd.h*0.90,wd.h-60));
	wd.w = Math.floor(self.basewidth*wd.h/self.baseheight);
    }

    setElementDimensions('primarytext',wd);
    //$('resultsFrame').height = $('qResults').offsetHeight;
    var emb = $('primaryimage');
    emb.width = wd.w;
    emb.height = wd.h;
    emb = $('primaryimage-img');//IE fallback
    emb.height = wd.h - ((wd.h>wd.w)?100:0);//enough room for the IE-sucks message
    //SVG
    if (self.svgdoc != null) {
	var svgdoc = self.svgdoc;
	//var wd = getViewportDimensions();
	//wd.w -= 300;
	//wd.h -= 40;
	var svgsvg = svgdoc.documentElement;
	svgsvg.setAttribute('width',wd.w);
	svgsvg.setAttribute('height',wd.h);
	/*
	  var bg = svgdoc.getElementById('background');
	  bg.setAttribute('width',wd.w);
	  bg.setAttribute('height',wd.h);
	*/
    }
}

Story.prototype.openStoriesMenu = function(event) {
    var self = this;
    appear('storiesblock',{'afterFinish':function() {
	self.storiesmenu = connect('storieslink','onmousedown',self,self.closeStoriesMenu);
    }
    });
    disconnect(self.storiesmenu);
    $('storiesarrow').innerHTML='&#8592;';
    
}
Story.prototype.closeStoriesMenu = function(event) {
    var self = this;
    fade('storiesblock',{'afterFinish':function() {
	self.storiesmenu = connect('storieslink','onmousedown',self,self.openStoriesMenu);
    }
    });
    disconnect(self.storiesmenu);
    $('storiesarrow').innerHTML='&#8594;';
    
}
/*
DiaHTML.prototype.showNodeDetails = function(n, g, evt) {
    $('nTitle').innerHTML = n.content.label;
    $('nBody').innerHTML = n.content.body;
    $('nAgree').innerHTML = 'X';
    $('nDisagree').innerHTML = 'Y';
    $('nUserVote').innerHTML = 'Agreed';
}

DiaHTML.prototype.edgeForm = function(metaE) {
    var self = this;
    
    document.getElementById('edgeSummaryP').childNodes.item(0).data=metaE.edge.p.content.label;
    document.getElementById('edgeSummaryQ').childNodes.item(0).data=metaE.edge.q.content.label;
    self.switchDisplay('edgeDetails');
    //document.forms['newEdgeForm'].elements['edgeID'].value=obj.obj.id;
    document.forms['newEdgeForm'].elements['pID'].value=metaE.p;
    document.forms['newEdgeForm'].elements['qID'].value=metaE.q;
}

DiaHTML.prototype.switchDisplay = function(visible) {
    document.getElementById('newNode').style.display="none";
    document.getElementById('edgeDetails').style.display="none";
    if (visible) {
	document.getElementById('qResults').style.display="none";
	document.getElementById(visible).style.display="block";
    }
    else {
	document.getElementById('qResults').style.display="block";
    }
}
*/
