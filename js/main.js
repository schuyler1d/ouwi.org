/*

*/
var mp = '';
var storiesmenu;

//temporary (re)definition but also defined in MochiPlus.js
function require_js(arr) { var x;while(x=arr.shift()) { 
    document.write('<script type="text/javascript" src="'+x+'"></script>');
}}

require_js([mp+'js/graphlayout/MochiKit/Base.js' /* Our favorite JS library */
	    ,mp+'js/graphlayout/MochiKit/Iter.js' /* Our favorite JS library */
	    ,mp+'js/graphlayout/MochiKit/Logging.js' /* Our favorite JS library */
	    ,mp+'js/graphlayout/MochiKit/LoggingPane.js' /* Our favorite JS library */
	    ,mp+'js/graphlayout/MochiKit/Async.js' /* Our favorite JS library */
	    ,mp+'js/graphlayout/MochiKit/DOM.js' /* Our favorite JS library */
	    ,mp+'js/graphlayout/MochiKit/Style.js' /* Our favorite JS library */
	    ,mp+'js/graphlayout/MochiKit/Color.js' /* Our favorite JS library */
	    ,mp+'js/graphlayout/MochiKit/Position.js' /* Our favorite JS library */
	    ,mp+'js/graphlayout/MochiKit/Signal.js' /* Our favorite JS library */
	    ,mp+'js/graphlayout/MochiKit/Visual.js' /* Our favorite JS library */
	    ,mp+'js/MochiPlus.js' /* What MochiKit should (and someday might) include */
]);

function fillNav() {
    var nav = $('navigate');
    if (nav && nav.getElementsByTagName('a').length == 0) {
	var def = doSimpleXMLHttpRequest('nav.xml');
	def.addCallback(swapFromHttp, 'navigate');
	def.addCallback(selectNav);
    }
}


if (document.addEventListener) {
    document.addEventListener('DOMContentLoaded', fillNav, false);
} else {
    window.attachEvent('onload',fillNav);
}


function selectNav() {
    var p = document.location.pathname;
    if ( /project.html$/.test(p))
	addElementClass('navProject' ,'selected');
    if ( /grammar.html$/.test(p)) {
	addElementClass('navWriting' ,'selected');
	addElementClass('navGrammar' ,'selected');
    }
    if ( /glossary.html$/.test(p))
	addElementClass('navWriting' ,'selected');
    if ( /apology.html$/.test(p)) {
	addElementClass('navWriting' ,'selected');
	addElementClass('navApology' ,'selected');
    }
    if ( /writing.html$/.test(p)) {
	addElementClass('navWriting' ,'selected');
	addElementClass('navIntro' ,'selected');
	addElementClass('navIntermediate' ,'unselected');
	//addElementClass('navAdvanced' ,'selected');
    }
    if ( /intermediate.html$/.test(p)) {
	addElementClass('navWriting' ,'selected');
	addElementClass('navIntro' ,'selected');
	addElementClass('navIntermediate' ,'selected');
	//addElementClass('navAdvanced' ,'selected');
    }
    if ( /advanced.html$/.test(p)) {
	addElementClass('navWriting' ,'selected');
	//addElementClass('navAdvanced' ,'selected');
    }
    storiesmenu = connect('storieslink','onmousedown',openStoriesMenu);

}

function openStoriesMenu(evt) {
    removeElementClass('navProject' ,'selected');
    removeElementClass('navWriting' ,'selected');
    appear('storiesblock',{'afterFinish':function() {
	storiesmenu = connect('storieslink','onmousedown',closeStoriesMenu);
    }
    });
    disconnect(storiesmenu);
    $('storiesarrow').innerHTML='&#8592;';    
}

function closeStoriesMenu(evt) {
    disconnect(storiesmenu);
    fade('storiesblock',{'afterFinish':function() {
	selectNav();
    }
    });
    $('storiesarrow').innerHTML='';    
}
