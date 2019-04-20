<?xml version='1.0'?>

<xsl:stylesheet version="1.0" 
		xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
		>

  <xsl:output method="xhtml" 
	      doctype-system="http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd" 
	      doctype-public="-//W3C//DTD XHTML 1.0 Transitional//EN"
	      indent="yes"
	      encoding="us-ascii"
	      /> 

<xsl:template match="/">

  <xsl:apply-templates/>

</xsl:template>

<xsl:template match="vowel">    <xsl:variable name="refid" select="@ref" />
<html xmlns="http://www.w3.org/1999/xhtml" lang="en" xml:lang="en">
  <head>
    <title>
      <xsl:value-of select="normalize-space(document('vowels.xml')/vowels/v[@id=$refid])" />
    </title>
    <meta name="author" content="Schuyler Duveen" />
    <meta name="copyright" content="1999-2007 Schuyler Duveen" />

    <link href="style.css" rel="stylesheet" type="text/css" />

    <script type="text/javascript" src="js/main.js"></script>
    <script type="text/javascript" src="js/Stories.js"></script>


  </head>
  <body>
    <div id="navigate" style="width:41%;">
      <h1>
	<img src="images/icon-{@name}.jpg" border="0" alt="{@name}" />
	<xsl:value-of select="title" />
      </h1>
      <div id="storycontrols">
	<a href="#controller" id="storycontroller">[pause]</a>
        <a href="#nextline" id="storynextline">[next]</a>
	<a href="#finish" id="storyfinish">[finish]</a>
      </div>
      <ul>
	<li><a href="index.html">Ouwi Home</a>
	  <ul>
	    <li><a href="project.html" id="projectlink">Project</a></li>
	    <li><a href="writing.html" id="writinglink">Language</a></li>
	    <li><a href="#" id="storieslink">Stories <span id="storiesarrow"><xsl:text disable-output-escaping="yes">&amp;#8594;</xsl:text></span></a></li>
	  </ul>
	</li>
      </ul>
      <div id="stories" class="navstories">
	<table id="storiesblock" border="0" cellspacing="10" cellpadding="0">
	  <tr>
	    <td align="center"><a href="uum.html">The Other<br /><img src="images/icon-uu.jpg"  alt="other" /></a></td>
	    <td></td>	<td></td>	<td></td>
	  </tr>
	  <tr>
	    <td align="center"><a href="aem.html" >Love<br /><img src="images/icon-ae.jpg" alt="love" /></a></td>
	    <td align="center" ><a href="em.html">Sin<br /><img src="images/icon-e.jpg"  alt="sin" /></a></td>
	    <td></td>
	    <td></td>
	  </tr>
	  <tr>
	    <td align="center"><a href="eem.html">Color<br /><img src="images/icon-ee.jpg"  alt="color" /></a></td>
	    <td align="center"><a href="aum.html">Law<br /><img src="images/icon-au.jpg"  alt="law" /></a></td>
	    <td align="center"><a href="eym.html">Light<br /><img src="images/icon-ei.jpg"  alt="light" /></a></td>
	    <td></td>
	  </tr>
	  <tr>
	    <td align="center" valign="top">
	    Unknown<br /><img src="images/icon-u.jpg"  alt="unknown" /></td>
	    <td align="center">
	      
	    <a href="im.html">Waters<br /><img src="images/icon-i.jpg"  alt="waters" /></a></td>
	    <td align="center">
	      <a href="oum.html">
	    Volcano<br /><img src="images/icon-ou.jpg"  alt="volcano" /></a></td>
	    <td align="center">
	      <a href="om.html">
	    Darkness<br /><img src="images/icon-o.jpg"  alt="darkness" /></a></td>

	  </tr>
	</table>
      </div>
    </div>
    <div id="wordnotes" style="position:fixed;left:45%;top:0.1em;">
      <xsl:text disable-output-escaping="yes">&amp;nbsp;</xsl:text>
    </div>
    <div class="primarytext" id="primarytext" style="left:45%;">
      <object data="images/svg/{@name}m.svg" type="image/svg+xml" 
	      id="primaryimage" name="primaryimage" 
	      width="600" height="400">
	
	<img id="primaryimage-img" name="primaryimage-img" src="images/{@name}.jpg" />
	<p class="browser-warning">
	  NOTE: Your web browser does not support SVG 
	  (Scalable Vector Graphics), which means you will not be able to see what
	  symbols on the image correspond to the phrases on the left.
	  Get a browser that's not in the stone age, like 
	  <a href="http://getfirefox.com">Firefox</a> or 
	  <a href="http://www.apple.com/safari/download/">Safari</a>.
	</p>
      </object>
      <!--img src="images/au.jpg" id="primaryimage" border="0" width="300"/ -->
    </div>
    
    <div style="margin:6.5em 5px 13px 1em;padding-right:10px;width:40%;float:left;">      
      <a name="top"> </a>

      <xsl:if test="translation">
	<!--xsl:copy-of select="translation" /-->
	<div id="approximate">
	  <!--good documentation:
	      http://www.dpawson.co.uk/xsl/sect2/identity.html -->
	  <xsl:for-each select="translation[1]">
	      <xsl:apply-templates />
	  </xsl:for-each>
	  <!--xsl:copy-->
	  <!--/xsl:copy-->
	  <!--xsl:call-template name="translation" >
	    <xsl:with-param name="trans" select="translation[0]"/>
	  </xsl:call-template-->
	</div>
      </xsl:if>

      <div id="linear">
	<h2>Linear Translation</h2>
	<p>
	  <b>notation:</b> <xsl:copy-of select="notation" />
	  <br />
	  <b>pronunciation: /</b><xsl:value-of select="normalize-space(document('vowels.xml')/vowels/v[@id=$refid]/@ipa)" />/
	</p>
	<dl>
	  <xsl:for-each select="w">
	    <xsl:variable name="numid" select="@id" />	
	    <dt id="word{$numid}">
	      <xsl:value-of select="normalize-space(document('consonants.xml')/consonants/c[@id=$numid])" /><xsl:value-of select="normalize-space(document('vowels.xml')/vowels/v[@id=$refid])" />
	    </dt>
	    <dd id="literal{$numid}"><xsl:value-of select="d" /></dd>
	    <dd id="computer{$numid}"><xsl:value-of select="c" /></dd>
	    <dd id="notes{$numid}"><xsl:value-of select="n" /></dd>
	  </xsl:for-each>
	</dl>
      </div>
      <xsl:if test="historypublic">
	<a name="history"> </a><a href="#top">top</a>
	<h3>History:</h3>
	<xsl:copy-of select="history" />
      </xsl:if>

      <!--xsl:text disable-output-escaping="yes">&amp;copy; 1999-2007 Schuyler Duveen</xsl:text-->
    </div>
  </body>
</html>

</xsl:template>

<xsl:template match="translation" name="translation">
  <!--xsl:copy-->
    <xsl:apply-templates select="@* | node()"/>
  <!--/xsl:copy-->
  <xsl:comment> XXXXXXX </xsl:comment>
</xsl:template>

<xsl:template match="s" name="translation-sentence">
  <span class="storyline" 
	name="storyline{@refid}"
	>
    <xsl:apply-templates />
  </span>
</xsl:template>

<xsl:template match="w" >
    <xsl:apply-templates />
</xsl:template>

<xsl:template match="ul">
  <div class="indent">
    <xsl:apply-templates />
  </div>
</xsl:template>

<xsl:template match="node()">
  <xsl:copy>
    <xsl:apply-templates />
  </xsl:copy>
</xsl:template>


</xsl:stylesheet>
