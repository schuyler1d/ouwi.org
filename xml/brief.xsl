<?xml version='1.0'?>

<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">

<xsl:template match="/">

  <xsl:apply-templates/>

</xsl:template>

<xsl:template match="vowel">    <xsl:variable name="refid" select="@ref" />	

<div class="vowel">
<table border="0" cellpadding="1" cellspacing="0">
   <tr>
     <td valign="top">
	<xsl:if test="image">
	  <xsl:choose>
	    <xsl:when test="image='au-tilt.jpg'">
	      <img src="/ouwiyaru/images/au.jpg" border="0" height="435" />
	    </xsl:when>
	    <xsl:otherwise>
	      <img src="/ouwiyaru/images/{image}" border="0" height="435" />
	    </xsl:otherwise>
	  </xsl:choose>
	</xsl:if>
     </td>
     <td valign="top">
	<table border="1" cellpadding="1" cellspacing="0" class="compact">
	 	  <xsl:for-each select="w">
		  <xsl:variable name="numid" select="@id" />	
		  <tr>
			<td>
			<xsl:value-of select="$numid" />
			</td><td>
			<xsl:value-of select="normalize-space(document('consonants.xml')/consonants/c[@id=$numid])" /><xsl:value-of select="normalize-space(document('vowels.xml')/vowels/v[@id=$refid])" />
			</td><td>
			<xsl:value-of select="d" />
			</td>
		  </tr>
		  </xsl:for-each>
	</table>	  
     </td>
</tr>
</table>

</div>

</xsl:template>


</xsl:stylesheet>

