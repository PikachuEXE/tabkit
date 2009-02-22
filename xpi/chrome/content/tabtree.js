/*
 * Tab Tree
 * http://jomel.me.uk/software/firefox/tabtree/
 * 
 * Copyright (C) 2006 John Mellor (see license.txt)
 */

/**
 * Constants
 * n.b. a copy of some of these constants is in settings.js, remember to update them if you make any changes
 */
const TABTREE_OPEN_RELATED_TABBAR_END = 0; // e.g. A A1 B A2 B1 B2 A2i A3 A2ii (Fx default)
const TABTREE_OPEN_RELATED_END_OF_CHILDREN = 1; // A:{1 2:{i ii} 3} B:{1 2} (recommended)
const TABTREE_OPEN_RELATED_START_OF_CHILDREN = 2; // A:{3 2:{ii i} 1} B:{2 1}

const TABTREE_OPEN_UNRELATED_TABBAR_END = 0; // Fx default (recommended)
const TABTREE_OPEN_UNRELATED_NEXT = 1;

const TABTREE_SELECT_ON_CLOSE_LEFT = -1;
const TABTREE_SELECT_ON_CLOSE_AUTO = 0; // (recommended)
const TABTREE_SELECT_ON_CLOSE_RIGHT = 1; // Fx default

const TABTREE_POSITION_TOP = 0; // Fx default for tab bar
const TABTREE_POSITION_RIGHT = 1; // (recommended for sidebar)
const TABTREE_POSITION_BOTTOM = 2;
const TABTREE_POSITION_LEFT = 3; // Fx default for sidebar (recommended for tab bar)

const TABTREE_COLOR_NOTHING = 0; // Fx default
const TABTREE_COLOR_GROUPS = 1; // (recommended)
const TABTREE_COLOR_EACH_TAB = 2;

/**
 * Globals
 */
var tabtree_prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService).getBranch("extensions.tabtree.");

var tabtree_colors = tabtree_prefs.getCharPref("style.colors").split(","); // Not really much point having a variable for this.
var tabtree_groupid = 0;

var tabtree_tempParent = null;
var tabtree_currentParent = null;

var tabtree_moveTabTo_plain = false;

// Useful shortcuts
var tabtree_tabsStack = document.getAnonymousElementByAttribute(gBrowser.mTabContainer, "class", "tabs-stack");
var tabtree_tabsVbox = tabtree_tabsStack.childNodes[1];
var tabtree_tabsHbox = tabtree_tabsVbox.firstChild;
var tabtree_tabsArrowScrollBox = document.getAnonymousElementByAttribute(gBrowser.mTabContainer, "anonid", "arrowscrollbox");
var tabtree_tabsScrollBox = document.getAnonymousElementByAttribute(tabtree_tabsArrowScrollBox, "anonid", "scrollbox");
var tabtree_tabsBox = document.getAnonymousNodes(tabtree_tabsScrollBox)[0];

const TABTREE_ROOT = {
	/*_tPos: -1,*/
	getAttribute: function getAttribute(name) {
		if (name == "level") return -1;
		throw "TABTREE_ROOT is not a tab! [getAttribute]";
	},
	hasAttribute: function hasAttribute(name) {
		return name == "level";
	},
	removeAttribute: function removeAttribute(name) {
		//throw "TABTREE_ROOT is not a tab! [removeAttribute]";
	},
	setAttribute: function setAttribute(name, value) {
		// TODO: sort out which TABTREE_ROOT methods should be allowed
		//throw "TABTREE_ROOT is not a tab! [setAttribute]";
	},
	children: []
}

/**
 * React to pref changes at runtime, rather than requiring a restart
 */
var tabtree_prefsObserver = {
	observe: function(subject, topic, data) {
		if (topic != "nsPref:changed") return;
		switch (data) {
		case "tabbar.horizontal.width":
			try {
				var tabBarWidth = tabtree_prefs.getCharPref("tabbar.horizontal.width");
				if (/^[0-9]+$/.test(tabBarWidth)) tabBarWidth += "px";
				gBrowser.mTabContainer.style.width = tabBarWidth;
			}
			catch (ex) {
				tabtree_dump("\"" + tabBarWidth + "\" is not a valid value for the tab bar width - please correct this in the Tab Tree settings dialog (or extensions.tabtree.tabbar.horizontal.width in about:config)", true);
			}
			break;
		case "tabbar.showtwistys":
			if (tabtree_prefs.getBoolPref("tabbar.showtwistys"))
				gBrowser.setAttribute("showtwistys", "true");
			else
				gBrowser.removeAttribute("showtwistys");
			break;
		case "tabbar.sidebarposition":
			var browser = document.getElementById("browser");
			switch (tabtree_prefs.getIntPref("tabbar.sidebarposition")) {
			case TABTREE_POSITION_TOP:
				browser.setAttribute("horizontalsidebar", "top");
				document.getElementById("sidebar-splitter").setAttribute("orient", "vertical");
				document.getElementById("sidebar-box").setAttribute("orient", "horizontal");
				document.getElementById("sidebar-box").setAttribute("dir", "reverse");
				browser.removeAttribute("verticalsidebar");
				browser.setAttribute("orient", "vertical");
				browser.setAttribute("dir", "normal");
				break;
			case TABTREE_POSITION_RIGHT:
				browser.setAttribute("verticalsidebar", "right");
				document.getElementById("sidebar-splitter").setAttribute("orient", "horizontal");
				document.getElementById("sidebar-box").setAttribute("orient", "vertical");
				document.getElementById("sidebar-box").setAttribute("dir", "normal");
				browser.removeAttribute("horizontalsidebar");
				browser.setAttribute("orient", "horizontal");
				browser.setAttribute("dir", "reverse");
				break;
			case TABTREE_POSITION_BOTTOM:
				browser.setAttribute("horizontalsidebar", "bottom");
				document.getElementById("sidebar-splitter").setAttribute("orient", "vertical");
				document.getElementById("sidebar-box").setAttribute("orient", "horizontal");
				document.getElementById("sidebar-box").setAttribute("dir", "reverse");
				browser.removeAttribute("verticalsidebar");
				browser.setAttribute("orient", "vertical");
				browser.setAttribute("dir", "reverse");
				break;
			case TABTREE_POSITION_LEFT:
				browser.setAttribute("verticalsidebar", "left");
				document.getElementById("sidebar-splitter").setAttribute("orient", "horizontal");
				document.getElementById("sidebar-box").setAttribute("orient", "vertical");
				document.getElementById("sidebar-box").setAttribute("dir", "normal");
				browser.removeAttribute("horizontalsidebar");
				browser.setAttribute("orient", "horizontal");
				browser.setAttribute("dir", "normal");
				break;
			}
			break;
		case "tabbar.position":
			switch (tabtree_prefs.getIntPref("tabbar.position")) {
			case TABTREE_POSITION_TOP:
				gBrowser.setAttribute("horizontaltabbar", "top");
				gBrowser.removeAttribute("verticaltabbar");
				gBrowser.mTabBox.setAttribute("orient", "vertical");
				gBrowser.mTabBox.setAttribute("dir", "normal");
				gBrowser.mStrip.setAttribute("orient", "horizontal");
				gBrowser.mTabContainer.setAttribute("orient", "horizontal");
				tabtree_tabsStack.setAttribute("orient", "horizontal");
				tabtree_tabsVbox.setAttribute("orient", "vertical");
				tabtree_tabsHbox.setAttribute("orient", "horizontal");
				tabtree_tabsArrowScrollBox.setAttribute("orient", "horizontal");
				tabtree_tabsScrollBox.setAttribute("orient", "horizontal");
				tabtree_tabsBox.setAttribute("orient", "horizontal");
				break;
			case TABTREE_POSITION_RIGHT:
				gBrowser.setAttribute("verticaltabbar", "right");
				gBrowser.removeAttribute("horizontaltabbar");
				gBrowser.mTabBox.setAttribute("orient", "horizontal");
				gBrowser.mTabBox.setAttribute("dir", "reverse");
				gBrowser.mStrip.setAttribute("orient", "vertical");
				gBrowser.mTabContainer.setAttribute("orient", "vertical");
				tabtree_tabsStack.setAttribute("orient", "vertical");
				tabtree_tabsVbox.setAttribute("orient", "horizontal");
				tabtree_tabsHbox.setAttribute("orient", "vertical");
				tabtree_tabsArrowScrollBox.setAttribute("orient", "vertical");
				tabtree_tabsScrollBox.setAttribute("orient", "vertical");
				tabtree_tabsBox.setAttribute("orient", "vertical");
				break;
			case TABTREE_POSITION_BOTTOM:
				gBrowser.setAttribute("horizontaltabbar", "bottom");
				gBrowser.removeAttribute("verticaltabbar");
				gBrowser.mTabBox.setAttribute("orient", "vertical");
				gBrowser.mTabBox.setAttribute("dir", "reverse");
				gBrowser.mStrip.setAttribute("orient", "horizontal");
				gBrowser.mTabContainer.setAttribute("orient", "horizontal");
				tabtree_tabsStack.setAttribute("orient", "horizontal");
				tabtree_tabsVbox.setAttribute("orient", "vertical");
				tabtree_tabsHbox.setAttribute("orient", "horizontal");
				tabtree_tabsArrowScrollBox.setAttribute("orient", "horizontal");
				tabtree_tabsScrollBox.setAttribute("orient", "horizontal");
				tabtree_tabsBox.setAttribute("orient", "horizontal");
				break;
			case TABTREE_POSITION_LEFT:
				gBrowser.setAttribute("verticaltabbar", "left");
				gBrowser.removeAttribute("horizontaltabbar");
				gBrowser.mTabBox.setAttribute("orient", "horizontal");
				gBrowser.mTabBox.setAttribute("dir", "normal");
				gBrowser.mStrip.setAttribute("orient", "vertical");
				gBrowser.mTabContainer.setAttribute("orient", "vertical");
				tabtree_tabsStack.setAttribute("orient", "vertical");
				tabtree_tabsVbox.setAttribute("orient", "horizontal");
				tabtree_tabsHbox.setAttribute("orient", "vertical");
				tabtree_tabsArrowScrollBox.setAttribute("orient", "vertical");
				tabtree_tabsScrollBox.setAttribute("orient", "vertical");
				tabtree_tabsBox.setAttribute("orient", "vertical");
				break;
			}
			//We deliberately don't break to share the code for setting the colors on each tab below
		case "style.colors":
			if (data == "style.colors") tabtree_colors = tabtree_prefs.getCharPref("style.colors").split(",");
			//We deliberately don't break to share the code for setting the colors on each tab below
		case "style.emphasizegroups":
			if (data == "style.emphasizegroups") {
				if (tabtree_prefs.getBoolPref("style.emphasizegroups"))
					gBrowser.setAttribute("emphasizegroups", "true");
				else
					gBrowser.removeAttribute("emphasizegroups");
			}
			//We deliberately don't break to share the code for setting the colors on each tab below
		case "style.color":
			//We deliberately don't break to share the code for setting the colors on each tab below
		case "style.darkenchildren":
			if (tabtree_prefs.getIntPref("style.color") != TABTREE_COLOR_NOTHING || tabtree_prefs.getBoolPref("style.darkenchildren") || tabtree_prefs.getBoolPref("style.emphasizegroups") || tabtree_prefs.getIntPref("tabbar.position") == TABTREE_POSITION_RIGHT || tabtree_prefs.getIntPref("tabbar.position") == TABTREE_POSITION_LEFT) {
				gBrowser.setAttribute("customtabs", "true");
			}
			else {
				gBrowser.removeAttribute("customtabs");
			}
			if (tabtree_prefs.getIntPref("style.color") != TABTREE_COLOR_NOTHING || tabtree_prefs.getBoolPref("style.darkenchildren")) {
				gBrowser.setAttribute("colortabs", tabtree_prefs.getBoolPref("style.darkenchildren") ? "darkenchildren" : "desaturated");
				for (var i = 0; i < gBrowser.mTabs.length; i++) {
					tabtree_colorTab(gBrowser.mTabs[i]);
				}
			}
			else {
				for (var i = 0; i < gBrowser.mTabs.length; i++) {
					gBrowser.mTabs[i].style.backgroundColor = null;
				}
				gBrowser.removeAttribute("colortabs");
			}
			break;
		case "style.darktheme":
			if (tabtree_prefs.getBoolPref("style.darktheme"))
				gBrowser.setAttribute("darktheme", "true");
			else
				gBrowser.removeAttribute("darktheme");
			break;
		}
	}
};

/**
 * Log messages to the Javascript Console when in debug mode
 */
function tabtree_dump(aMessage, ignoreDebug) {
	try {
		if (ignoreDebug || tabtree_prefs.getBoolPref("debug")) {
			var consoleService = Components.classes["@mozilla.org/consoleservice;1"].getService(Components.interfaces.nsIConsoleService);
			consoleService.logStringMessage("Tab Tree: " + aMessage);
			// Could get call stack using arguments.callee.caller
		}
	}
	catch (ex) {
		// This (hidden) pref isn't set, so don't spam the Javascript Console with messages
	}
}

/**
 * What it says on the box: sets the right "background-color: hsl(...) !important" on aTab
 */
function tabtree_colorTab(aTab) {
	var hue;
	var grayscale = false;
	switch (tabtree_prefs.getIntPref("style.color")) {
	case TABTREE_COLOR_NOTHING:
		hue = 0;
		grayscale = true;
		break;
	case TABTREE_COLOR_GROUPS:
		hue = tabtree_colors[aTab.groupid % tabtree_colors.length];
		break;
	case TABTREE_COLOR_EACH_TAB:
		hue = tabtree_colors[parseInt(aTab.getAttribute("linkedpanel")) % tabtree_colors.length]; // TODO: would be better to maintain some kind of counter
		break;
	}
	
	if (tabtree_prefs.getBoolPref("style.darkenchildren")) {
		var luminosity = grayscale ? 100 : 80;
		var tab = aTab;
		while ("ancestor" in tab && tab.ancestor) {
			tab = tab.ancestor;
			luminosity -= 20;
		}
		// wrap luminosity round if necessary
		if (grayscale) while (luminosity < 0) luminosity += 120; // 120 not 100 as we want both 0 and 100
		else while (luminosity < 20) luminosity += 80; // 80 not 60 as we want both 20 and 80
	}
	else var luminosity = 50;
	
	var color = "hsl(" + hue +", " + (grayscale ? 0 : 100) + "%, " + luminosity + "%)";
	aTab.style.setProperty("background-color", color, "important");
}

/**
 * This function is used to initialise a tab, or whenever it's position needs changing
 */
function tabtree_setupTab(aTab, parent, move) {
	if (!parent) {
		if (tabtree_prefs.getBoolPref("debug") && "stacktrace" in window) tabtree_dump(stacktrace());
		return;
	}
	if (move === undefined) move = true;
	
	if (aTab.parent) {
		aTab.parent.children.splice(aTab.parent.children.indexOf(aTab), 1);
		if (aTab.parent.children.length == 0 && aTab.parent != parent) aTab.parent.removeAttribute("children");
	}
	if (!("children" in aTab)) aTab.children = [];
	aTab.parent = parent;
	aTab.setAttribute("level", parseInt(parent.getAttribute("level")) + 1);
	parent.children.push(aTab);
	if (!parent.hasAttribute("children")) parent.setAttribute("children", "visible");
	
	if (parent == TABTREE_ROOT) {
		aTab.groupid = tabtree_groupid++;
		if (move && tabtree_prefs.getIntPref("unrelatedtabsopen") == TABTREE_OPEN_UNRELATED_NEXT) {
			var newIndex = tabtree_nextRootIndex(); // TODO: check that (implicitly) using the current tab here is right
			tabtree_moveTabBefore(aTab, newIndex); // TODO: check for Farmer Giles!
		} // else leave it where it is
	}
	else {
		aTab.groupid = tabtree_rootNode(aTab).groupid;
		if (move) switch (tabtree_prefs.getIntPref("tabsopen")) {
			case TABTREE_OPEN_RELATED_END_OF_CHILDREN:
				// Find last *connected* child node (i.e. it hasn't been separated from this group)
				var lastChild = parent._tPos;
				for (var i = lastChild + 1; i < gBrowser.mTabs.length; i++) {
					if (gBrowser.mTabs[i].groupid != parent.groupid) break;
					if (gBrowser.mTabs[i].parent == parent) lastChild = i;
				}
				tabtree_moveTabBefore(aTab, lastChild + 1); // TODO: check for Farmer Giles!
				break;
			case TABTREE_OPEN_RELATED_START_OF_CHILDREN:
				tabtree_moveTabBefore(aTab, parent._tPos + 1);
				break;
			default: /* i.e. TABTREE_OPEN_RELATED_TABBAR_END */
				// leave is where it is
		}
	}
	
	if (gBrowser.hasAttribute("colortabs") && gBrowser.getAttribute("colortabs"))
		tabtree_colorTab(aTab);
}

function tabtree_moveTabBefore(aTab, newIndex) {
	if (aTab._tPos < newIndex) newIndex--;
	tabtree_moveTabTo_plain = true;
	gBrowser.moveTabTo(aTab, newIndex); // TODO: make sure my changes to moveTabTo don't mess with this!
}

/**
 * This function is primarily used to perform all our modifications to other functions before they get run
 */
function tabtree_DOMContentLoaded(event) {
	window.removeEventListener("DOMContentLoaded", tabtree_DOMContentLoaded, false);
	
	// Setup default tab
	tabtree_setupTab(getBrowser().mTabContainer.firstChild, TABTREE_ROOT, false);
	
	/*
	 * The rest of this function consists of modifying many of the built-in functions.
	 * All line numbers are from Firefox 1.5 (indeed a significant number of the changes are likely to be incompatible with versions later than 1.5.0.*)
	 */
	
	/*===== browser.js changes =====*/
	
	eval("BrowserStartup = " + BrowserStartup.toString().replace(
	'loadOneOrMoreURIs(uriToLoad);', // line 553
	'tabtree_currentParent = TABTREE_ROOT; \
	loadOneOrMoreURIs(uriToLoad); \
	tabtree_currentParent = null;'
	));
	
	// gBrowser.addEventListener("NewTab", BrowserOpenTab, false); opens tabs relatively as expected (~line 642)
	
	eval("gotoHistoryIndex = " + gotoHistoryIndex.toString().replace(
	'openUILinkIn(url, where);', // line 1154
	'if (where == "tab" || where == "tabshifted") tabtree_tempParent = gBrowser.mCurrentTab; \
	openUILinkIn(url, where);'
	));
	
	eval("BrowserBack = " + BrowserBack.toString().replace(
	'openUILinkIn(url, where);', // line 1175
	'if (where == "tab" || where == "tabshifted") tabtree_tempParent = gBrowser.mCurrentTab; \
	openUILinkIn(url, where);'
	));
	
	eval("BrowserBack = " + BrowserBack.toString().replace(
	'openUILinkIn(url, where);', // line 1195
	'if (where == "tab" || where == "tabshifted") tabtree_tempParent = gBrowser.mCurrentTab; \
	openUILinkIn(url, where);'
	));
	
	// function BrowserHome() is dealt with by the changes to loadOneOrMoreURIs (~line 1237)
	
	// Note that the code below only affects ctrl/middle-clicking on the home button, left clicks are left to loadOneOrMoreURIs
	eval("BrowserHomeClick = " + BrowserHomeClick.toString().replace(
	/case "tab"(.|\n)*?break;/, // line 1262-1271
	'case "tab": \
	tabtree_tempParent = TABTREE_ROOT; \
	tabtree_currentParent = gBrowser.addTab("about:blank"); \
	loadOneOrMoreURIs(homePage); \
	if ((where == "tab") ^ getBoolPref("browser.tabs.loadBookmarksInBackground", false)) { \
	    gBrowser.selectedTab = tabtree_currentParent; \
	    content.focus(); \
	} \
	tabtree_currentParent = null; \
	break;'
	/*'case "tab": \
	var previousSelectedTab = gBrowser.mCurrentTab; \
	tabtree_tempParent = TABTREE_ROOT; \
	gBrowser.selectedTab = gBrowser.addTab("about:blank"); \
	loadOneOrMoreURIs(homePage); \
	if ((where == "tab") ^ !getBoolPref("browser.tabs.loadBookmarksInBackground", false)) { \
	    gBrowser.selectedTab = previousSelectedTab; \
	} \
	else { \
	    content.focus(); \
	} \
	break;'*/
	));
	
	// TODO FIX loadOneOrMoreURIs!!!
	/*eval("loadOneOrMoreURIs = " + loadOneOrMoreURIs.toString().replace(
	'loadURI(urls[0]);', // line 1282
	'if (!tabtree_currentParent) tabtree_currentParent = gBrowser.mCurrentTab; \
	var oldPref = tabtree_prefs.getIntPref("tabsopen"); \
	tabtree_prefs.setIntPref("tabsopen", TABTREE_OPEN_RELATED_END_OF_CHILDREN); \
	loadURI(urls[0]);'
	).replace(
	'gBrowser.addTab(urls[i]);', // line 1287
	'if (urls[i] == ">" && "parent" in tabtree_currentParent) \
	    tabtree_currentParent = tabtree_currentParent.parent; \
	else if (urls[i] == "<" && tabtree_currentParent.children.length > 0) \
	    tabtree_currentParent = tabtree_currentParent.children[tabtree_currentParent.children.length-1]; \
	else \
	    gBrowser.addTab(urls[i]);'
	).replace(
	/}$/, // line 1292
	'tabtree_prefs.setIntPref("tabsopen", oldPref); \
	tabtree_currentParent = null; \
	}'
	));*/
	
	// BrowserOpenTab should make no assumptions, as code in tabtree.xul and my replacement to gBrowser.onTabBarDblClick control its behaviour (~line 1476)
	
	//This is only used from the Open Location dialog, which should generally open a new tab group, though a pref would be nice
	eval("delayedOpenTab = " + delayedOpenTab.toString().replace(
	'{', // line 1500
	'{ \
	tabtree_tempParent = TABTREE_ROOT;'
	));
	
	// TODO: add pref for new tabs opened from the location bar (BrowserLoadURL already uses all common modifiers, so it's hard to offer a choice, hence currently it always opens as a root tab)
	eval("BrowserLoadURL = " + BrowserLoadURL.toString().replace(
	'var t = gBrowser.addTab', // line 1582
	'tabtree_tempParent = TABTREE_ROOT; \
	var t = gBrowser.addTab'
	));
	
	// TODO: add pref (The same goes for SearchLoadURL, though I could offer the choice by hacking it's calling function to listen for modifier keys)
	eval("SearchLoadURL = " + SearchLoadURL.toString().replace(
	'var t = gBrowser.addTab', // line 1606
	'tabtree_tempParent = TABTREE_ROOT; \
	var t = gBrowser.addTab'
	));
	
	// newTabButtonObserver.onDrop should open as related, but fortunately that is the default (~line 2374)
	
	// TODO: OpenSearch uses loadOneTab, but it should be possible to tell it to open searches as a new tab group (~line 2576)
	
	// openURI deals both with pages opened by external applications and with diverted window.opens, so these should open as unrelated and related respectively
	eval("nsBrowserAccess.prototype.openURI = " + nsBrowserAccess.prototype.openURI.toString().replace(
	'var newTab = gBrowser.addTab("about:blank");', // line 3398
	'if (isExternal) tabtree_tempParent = TABTREE_ROOT; \
	var newTab = gBrowser.addTab("about:blank");'
	));
	
	// As part of allowing |<| and |>| to denote levels in the homepage string
	eval("gHomeButton.updateTooltip = " + gHomeButton.updateTooltip.toString().replace(
	'var homePage = this.getHomePage();', // line 3712
	'var homePage = this.getHomePage(); \
	homePage = homePage.replace(/\\|<\\|/g, "::{").replace(/\\|>\\|/g, "}; ");'
	));
	
	// openLinkInTab, openFrameInTab and handleLinkClick should open as related, but fortunately that is the default (~lines 4140, 4144, 4724)
	
	eval("nsContextMenu.prototype.viewImage = " + nsContextMenu.prototype.viewImage.toString().replace(
	'openUILink(this.imageURL, e);', // line 4196
	'var where = whereToOpenLink(e); \
	if (where == "tab" || where == "tabshifted") tabtree_tempParent = gBrowser.mCurrentTab; \
	openUILinkIn(this.imageURL, where);'
	));
	
	eval("nsContextMenu.prototype.viewBGImage = " + nsContextMenu.prototype.viewBGImage.toString().replace(
	'openUILink(this.bgImageURL, e);', // line 4201
	'var where = whereToOpenLink(e); \
	if (where == "tab" || where == "tabshifted") tabtree_tempParent = gBrowser.mCurrentTab; \
	openUILinkIn(this.bgImageURL, where);'
	));
	
	// TODO: decide or offer choice of what to do for middleMousePaste (~line 4785)
	
	
	/*===== [browser.xul changes are in tabtree.xul] =====*/
	
	
	/*===== openLocation.js changes =====*/
	
	// open should probably open as unrelated, but we do this by modifying delayedOpenTab in browser.js (~line 74)
	
	
	/*===== searchDialog.js changes =====*/
	
	// onDialogAccept should probably open as unrelated, but we do this by modifying SearchLoadURL in browser.js (~line 137)
	
	
	/*===== utilityOverlay.js changes =====*/
	
	// openUILinkIn is changed in tabtree_global_DOMContentLoaded (~line 194)
	
	
	/*===== bookmarks.js changes (and bookmarksManager.xul and bookmarksPanel.xul) =====*/
	
	// done by tabtree_global_DOMContentLoaded
	
	
	/*===== history.js changes (and history-panel.xul) =====*/
	
	// done by tabtree_global_DOMContentLoaded
	
	
	/*===== contentAreaUtils.js changes =====*/
	
	// openNewTabWith should generally open as related, but fortunately that is the default (~line 47)
	
	
	/*===== tabbrowser.xml changes =====*/
	
	/* Catch tabs as soon as they're created so we can initialise them. From here we work out where they open, as well as setting their group, color etc. */
	eval("gBrowser.addTab = " + gBrowser.addTab.toString().replace(
	    't._tPos = position;', // line 1082
	    't._tPos = position; \
	    var parent; \
	    if (tabtree_tempParent) { \
		parent = tabtree_tempParent; \
		tabtree_tempParent = null; \
		tabtree_dump("tempParent was " + (parent == TABTREE_ROOT ? "root" : parent._tPos) + ", this is " + position); \
	    } \
	    else if (tabtree_currentParent) { \
		parent = tabtree_currentParent; \
		tabtree_dump("currentParent is " + (parent == TABTREE_ROOT ? "root" : parent._tPos) + ", this is " + position); \
	    } \
	    else { \
		parent = gBrowser.mCurrentTab; \
		tabtree_dump("gBrowser.mCurrentTab is " + parent._tPos + ", this is " + position); \
	    } \
	    try { \
		tabtree_setupTab(t, parent); \
	    } \
	    catch (ex) { \
		if (tabtree_prefs.getBoolPref("debug") && "quickprompt" in window) breakpoint(function(e){return eval(e);}, "setupTab failed:\\n" + ex); \
		tabtree_dump(ex); \
	    }'
	));
	
	// loadOneTab has a variety of uses, and is probably best left alone (~line 987)
	
	/*
	 * Go right unless that would involve going up a level
	 * Also move the tab's children up a level
	 */
	eval("gBrowser.removeTab = " + gBrowser.removeTab.toString().replace(
	'const filter = this.mTabFilters[index];', // line 1219
	'while (aTab.children.length > 0) { \
	    var child = aTab.children.pop(); \
	    child.parent = aTab.parent; \
	    aTab.parent.children.push(child); \
	} \
	aTab.parent.children.splice(aTab.parent.children.indexOf(aTab), 1); \
	aTab.parent = null; \
	const filter = this.mTabFilters[index];'
	).replace(
	/else {\s*newIndex = index;\s*}/, // line 1242-1243
	//'else if (!this.mTabs[index].hasAttribute("parent") && this.mTabs[index+1].hasAttribute("parent") && index > 0 && this.mTabs[index-1].groupid == this.mTabs[index].groupid) { \
	//'else if (index > 0 && (tabtree_prefs.getBoolPref("alwaysclosetoleft") || (this.mTabs[index+1].groupid != this.mTabs[index].groupid && this.mTabs[index-1].groupid == this.mTabs[index].groupid))) { \
	//    newIndex = index - 1; \
	//} \
	//else { \
	//    newIndex = index; \
	//}'
	'else switch (tabtree_prefs.getIntPref("selectonclose")) { \
	    case TABTREE_SELECT_ON_CLOSE_LEFT: \
		newIndex = index - 1; \
		break; \
	    case TABTREE_SELECT_ON_CLOSE_RIGHT: \
		newIndex = index; \
		break; \
	    default: /* TABTREE_SELECT_ON_CLOSE_AUTO */ \
		newIndex = this.mTabs[index+1].getAttribute("level") >= aTab.getAttribute("level") ? index : index - 1; \
	}'
	));
	
	eval("gBrowser.moveTabTo = " + gBrowser.moveTabTo.toString().replace(
	'{', // ~line 1570
	'{ \
	if (tabtree_moveTabTo_plain && aTab.hasAttribute("parent") && aTab._tPos+1 < this.mTabs.length) { \
	    this.mTabs[aTab._tPos+1].setAttribute("parent", "true"); \
	}'
	).replace( // line 1576 (this one's purely to prevent the warning that otherwise gets (wrongly!) attributed to us)
	'this.mTabContainer.insertBefore(aTab, this.mTabContainer.childNodes[aIndex]);',
	'this.mTabContainer.insertBefore(aTab, aIndex < this.mTabContainer.childNodes.length ? this.mTabContainer.childNodes[aIndex] : null);'
	).replace(
	'return aTab;',
	'if (tabtree_moveTabTo_plain) { \
	    tabtree_moveTabTo_plain = false; \
	    return aTab; \
	} \
	if (aTab._tPos == 0) { \
	    aTab.setAttribute("parent", "true"); \
	    if (this.mTabs.length > 1 && this.mTabs[1].groupid == aTab.groupid) this.mTabs[1].removeAttribute("parent"); /* This is actually a bit inconsistent */ \
	} \
	/*else if (this.mTabs[aTab._tPos-1].groupid == aTab.groupid) { \
	    aTab.removeAttribute("parent"); \
	} \
	else if (aTab._tPos+1 < this.mTabs.length && this.mTabs[aTab._tPos+1].groupid == aTab.groupid) { \
	    aTab.setAttribute("parent", "true"); \
	    this.mTabs[aTab._tPos+1].removeAttribute("parent"); \
	}*/ \
	else { \
	    aTab.removeAttribute("parent"); \
	    tabtree_setupTab(aTab, this.mTabs[aTab._tPos-1].groupid); \
	} \
	return aTab;'
	));
	
	eval("gBrowser.onTabBarDblClick = " + gBrowser.onTabBarDblClick.toString().replace(
	// Apply fix from bug 312896, as otherwise double-clicks between tabs were generating events, e.g. creating new tabs
	/aEvent.originalTarget.localName != "tab" &&\s*aEvent.originalTarget.localName != "toolbarbutton"/, // lines 1314-1317
	'aEvent.originalTarget.localName == "spacer"'
	).replace(
	// If the user double-clicks on the xul:spacer at the far right of the tabbar, they will naturally expect the new tab to appear there, regardless of their settings
	'e.initEvent("NewTab", false, true);', // line 1319
	'var oldPref = tabtree_prefs.getIntPref("unrelatedtabsopen"); \
	tabtree_prefs.setIntPref("unrelatedtabsopen", TABTREE_OPEN_UNRELATED_TABBAR_END); \
	tabtree_tempParent = TABTREE_ROOT; \
	e.initEvent("NewTab", false, true); \
	tabtree_prefs.setIntPref("unrelatedtabsopen", oldPref);'
	));
	
	// TODO: recolor group if it would be the same color as a neighbouring group (see splitGroup)
	eval("gBrowser.onDrop = " + gBrowser.onDrop.toString().replace(
	/if \(newIndex > oldIndex\) {\s*newIndex--;\s*}\s*if \(newIndex != oldIndex\) {\s*this\.moveTabTo\(this.mTabs\[oldIndex\], newIndex\);\s*}/, // lines 1503-1506
	//n.b. newIndex is the effectively tab before which we want to insert the tab (this could be gBrowser.mTabs.length)
	'if ((!tabtree_prefs.getBoolPref("groupdragmodifiers.alt") ^ aEvent.altKey) && (!tabtree_prefs.getBoolPref("groupdragmodifiers.ctrl") ^ aEvent.ctrlKey) && (!tabtree_prefs.getBoolPref("groupdragmodifiers.meta") ^ aEvent.metaKey) && (!tabtree_prefs.getBoolPref("groupdragmodifiers.shift") ^ aEvent.shiftKey)) { \
	    var keepGroup = (newIndex == this.mTabs.length || this.mTabs[newIndex].hasAttribute("parent")); \
	    if (newIndex > oldIndex) { \
		newIndex--; \
	    } \
	    var groupid = this.mTabs[oldIndex].groupid; \
	    var nextParent = tabtree_nextRootIndex(oldIndex); \
	    oldIndex = tabtree_rootIndex(oldIndex); \
	    if (newIndex < oldIndex) { \
		for (var n=oldIndex; n < nextParent; n++) { \
		    this.moveTabTo(this.mTabs[nextParent-1], newIndex); \
		    if (keepGroup) { \
			if (n == nextParent-1) this.mTabs[newIndex].setAttribute("parent", "true"); \
			tabtree_setupTab(this.mTabs[newIndex], groupid); \
		    } \
		} \
	    } \
	    else if (newIndex >= nextParent) { \
		for (var n=oldIndex; n < nextParent; n++) { \
		    this.moveTabTo(this.mTabs[oldIndex], newIndex); \
		    if (keepGroup) { \
			if (n == oldIndex) this.mTabs[newIndex].setAttribute("parent", "true"); \
			tabtree_setupTab(this.mTabs[newIndex], groupid); \
		    } \
		} \
	    } \
	} \
	else { \
	    if (newIndex > oldIndex) { \
		newIndex--; \
	    } \
	    if (newIndex != oldIndex) { \
		this.moveTabTo(this.mTabs[oldIndex], newIndex); \
	    } \
	}'
	).replace( // This happens when the user drags a url onto the xul:spacer at the far right of the tab bar, so whatever they have set the tab should be added at the far right
	'this.loadOneTab(getShortcutOrURI(url), null, null, null, bgLoad);', // line 1529
	'var oldPref = tabtree_prefs.getIntPref("unrelatedtabsopen"); \
	tabtree_prefs.setIntPref("unrelatedtabsopen", TABTREE_OPEN_UNRELATED_TABBAR_END); \
	tabtree_tempParent = TABTREE_ROOT; \
	this.loadOneTab(getShortcutOrURI(url), null, null, null, bgLoad); \
	tabtree_prefs.setIntPref("unrelatedtabsopen", oldPref);'
	));
	
	
	// This init should also be called for browser.xul
	tabtree_global_DOMContentLoaded(event);
}

/**
 * This function contains all our initialisation stuff, like setting attributes based on prefs and registering event listeners
 * (while it could legitimately be run as part of DOMContentLoaded, there is no need - and it also gives other extensions a chance to replace stuff)
 */
function tabtree_onLoad(event) {
	window.removeEventListener("load", tabtree_onLoad, false);
	
	/*
	 * Set attributes based on the preferences
	 * (defaults are commented out)
	 */
	switch (tabtree_prefs.getIntPref("tabbar.position")) {
	case TABTREE_POSITION_TOP:
		gBrowser.setAttribute("horizontaltabbar", "top");
		//gBrowser.mTabBox.setAttribute("orient", "vertical");
		//gBrowser.mTabBox.setAttribute("dir", "normal");
		//gBrowser.mStrip.setAttribute("orient", "horizontal");
		//gBrowser.mTabContainer.setAttribute("orient", "horizontal");
		//tabtree_tabsStack.setAttribute("orient", "horizontal");
		//tabtree_tabsVbox.setAttribute("orient", "vertical");
		//tabtree_tabsHbox.setAttribute("orient", "horizontal");
		//tabtree_tabsArrowScrollBox.setAttribute("orient", "horizontal");
		//tabtree_tabsScrollBox.setAttribute("orient", "horizontal");
		//tabtree_tabsBox.setAttribute("orient", "horizontal");
		break;
	case TABTREE_POSITION_RIGHT:
		gBrowser.setAttribute("verticaltabbar", "right");
		gBrowser.mTabBox.setAttribute("orient", "horizontal");
		gBrowser.mTabBox.setAttribute("dir", "reverse");
		gBrowser.mStrip.setAttribute("orient", "vertical");
		gBrowser.mTabContainer.setAttribute("orient", "vertical");
		tabtree_tabsStack.setAttribute("orient", "vertical");
		tabtree_tabsVbox.setAttribute("orient", "horizontal");
		tabtree_tabsHbox.setAttribute("orient", "vertical");
		tabtree_tabsArrowScrollBox.setAttribute("orient", "vertical");
		tabtree_tabsScrollBox.setAttribute("orient", "vertical");
		tabtree_tabsBox.setAttribute("orient", "vertical");
		break;
	case TABTREE_POSITION_BOTTOM:
		gBrowser.setAttribute("horizontaltabbar", "bottom");
		//gBrowser.mTabBox.setAttribute("orient", "vertical");
		gBrowser.mTabBox.setAttribute("dir", "reverse");
		//gBrowser.mStrip.setAttribute("orient", "horizontal");
		//gBrowser.mTabContainer.setAttribute("orient", "horizontal");
		//tabtree_tabsStack.setAttribute("orient", "horizontal");
		//tabtree_tabsVbox.setAttribute("orient", "vertical");
		//tabtree_tabsHbox.setAttribute("orient", "horizontal");
		//tabtree_tabsArrowScrollBox.setAttribute("orient", "horizontal");
		//tabtree_tabsScrollBox.setAttribute("orient", "horizontal");
		//tabtree_tabsBox.setAttribute("orient", "horizontal");
		break;
	case TABTREE_POSITION_LEFT:
		gBrowser.setAttribute("verticaltabbar", "left");
		gBrowser.mTabBox.setAttribute("orient", "horizontal");
		//gBrowser.mTabBox.setAttribute("dir", "normal");
		gBrowser.mStrip.setAttribute("orient", "vertical");
		gBrowser.mTabContainer.setAttribute("orient", "vertical");
		tabtree_tabsStack.setAttribute("orient", "vertical");
		tabtree_tabsVbox.setAttribute("orient", "horizontal");
		tabtree_tabsHbox.setAttribute("orient", "vertical");
		tabtree_tabsArrowScrollBox.setAttribute("orient", "vertical");
		tabtree_tabsScrollBox.setAttribute("orient", "vertical");
		tabtree_tabsBox.setAttribute("orient", "vertical");
		break;
	}
	var browser = document.getElementById("browser");
	switch (tabtree_prefs.getIntPref("tabbar.sidebarposition")) {
	case TABTREE_POSITION_TOP:
		browser.setAttribute("horizontalsidebar", "top");
		document.getElementById("sidebar-splitter").setAttribute("orient", "vertical");
		document.getElementById("sidebar-box").setAttribute("orient", "horizontal");
		document.getElementById("sidebar-box").setAttribute("dir", "reverse");
		browser.setAttribute("orient", "vertical");
		//browser.setAttribute("dir", "normal");
		break;
	case TABTREE_POSITION_RIGHT:
		browser.setAttribute("verticalsidebar", "right");
		//document.getElementById("sidebar-splitter").setAttribute("orient", "horizontal");
		//document.getElementById("sidebar-box").setAttribute("orient", "vertical");
		//document.getElementById("sidebar-box").setAttribute("dir", "normal");
		//browser.setAttribute("orient", "horizontal");
		browser.setAttribute("dir", "reverse");
		break;
	case TABTREE_POSITION_BOTTOM:
		browser.setAttribute("horizontalsidebar", "bottom");
		document.getElementById("sidebar-splitter").setAttribute("orient", "vertical");
		document.getElementById("sidebar-box").setAttribute("orient", "horizontal");
		document.getElementById("sidebar-box").setAttribute("dir", "reverse");
		browser.setAttribute("orient", "vertical");
		browser.setAttribute("dir", "reverse");
		break;
	case TABTREE_POSITION_LEFT:
		browser.setAttribute("verticalsidebar", "left");
		//document.getElementById("sidebar-splitter").setAttribute("orient", "horizontal");
		//document.getElementById("sidebar-box").setAttribute("orient", "vertical");
		//document.getElementById("sidebar-box").setAttribute("dir", "normal");
		//browser.setAttribute("orient", "horizontal");
		//browser.setAttribute("dir", "normal");
		break;
	}
	try {
		var tabBarWidth = tabtree_prefs.getCharPref("tabbar.horizontal.width");
		if (/^[0-9]+$/.test(tabBarWidth)) tabBarWidth += "px";
		gBrowser.mTabContainer.style.width = tabBarWidth;
	}
	catch (ex) {
		tabtree_dump("\"" + tabBarWidth + "\" is not a valid value for the tab bar width - please correct this in the Tab Tree settings dialog (or extensions.tabtree.tabbar.horizontal.width in about:config)", true);
		gBrowser.mTabContainer.style.width = Components.classes["@mozilla.org/preferences-service;1"]
		                                               .getService(Components.interfaces.nsIPrefService)
		                                               .getDefaultBranch("extensions.tabtree.")
		                                               .getCharPref("tabbar.horizontal.width");
	}
	if (tabtree_prefs.getBoolPref("tabbar.showtwistys")) {
		gBrowser.setAttribute("showtwistys", "true");
	}
	
	if (tabtree_prefs.getIntPref("style.color") != TABTREE_COLOR_NOTHING || tabtree_prefs.getBoolPref("style.darkenchildren") || tabtree_prefs.getBoolPref("style.emphasizegroups") || tabtree_prefs.getIntPref("tabbar.position") == TABTREE_POSITION_RIGHT || tabtree_prefs.getIntPref("tabbar.position") == TABTREE_POSITION_LEFT) {
		gBrowser.setAttribute("customtabs", "true");
	}
	if (tabtree_prefs.getIntPref("style.color") != TABTREE_COLOR_NOTHING || tabtree_prefs.getBoolPref("style.darkenchildren")) {
		gBrowser.setAttribute("colortabs", tabtree_prefs.getBoolPref("style.darkenchildren") ? "darkenchildren" : "desaturated");
	}
	if (tabtree_prefs.getBoolPref("style.darktheme")) {
		gBrowser.setAttribute("darktheme", "true");
	}
	if (tabtree_prefs.getBoolPref("style.emphasizegroups")) {
		gBrowser.setAttribute("emphasizegroups", "true");
	}
	
	/*
	 * Event Listeners
	 */
	gBrowser.mStrip.addEventListener("dblclick", tabtree_onDblclick, true);
	tabtree_prefs.QueryInterface(Components.interfaces.nsIPrefBranchInternal).addObserver("", tabtree_prefsObserver, false);
	addEventListener("unload", function(){ tabtree_prefs.QueryInterface(Components.interfaces.nsIPrefBranchInternal).removeObserver("", tabtree_prefsObserver); }, false);
	
	/*
	 * Hacks ;)
	 */
	// Apply fix from bug 196438 if necessary, else it looks even uglier than usual when tabs overflow as their background shines through behind the close button
	// TODO: check with Too Many Tabs!, and review this when bug 221684 is fixed
	for each (var elem in document.getAnonymousNodes(gBrowser.mTabContainer)) {
		if (elem.localName == "hbox" && elem.getAttribute("style") == "min-width: 1px;") {
			elem.setAttribute("style", "min-width: 1px; overflow-x: hidden;");
			break;
		}
	}
	
	var tabContextMenu = getBrowser().mStrip.getElementsByAttribute("anonid", "tabContextMenu")[0];
	tabContextMenu.insertBefore(document.getElementById("tabtree-menu"), tabContextMenu.childNodes[1]);
	
	/*
	 * Undo changes made by either version of tabs open relative (next time I'll use named functions so I can edit them before they come into action!)
	 * use the setTimeout to make sure this is run after tabs open relative loads
	 */
	//Components.classes["@mozilla.org/extensions/manager;1"].getService(Components.interfaces.nsIExtensionManager).disableItem("tabsopenrelative@jomel.me.uk");
	window.setTimeout(function() {
		// Version 0.1
		eval("gBrowser.addTab = " + gBrowser.addTab.toString().replace(
		/this\.moveTabTo\(t, this\.mCurrentTab\._tPos \+ tabsopenrelative_nextTab\);\s*tabsopenrelative_nextTab\+\+;/,
		''
		));
		
		// Version 0.2
		eval("gBrowser.addTab = " + gBrowser.addTab.toString().replace( // Note that two lines of the insides of the if clause were already removed by the above code to remove version 0.1
		/if \(tabsopenrelative_nextTab < 0 \|\| aURI != "about:blank"\) \{\s*if \(tabsopenrelative_nextTab < 0\) \{\s*tabsopenrelative_nextTab \*= -1;\s*\}\s*\}/,
		''
		));
		eval("BrowserOpenTab = " + BrowserOpenTab.toString().replace(
		/if \(gBrowser\.mPrefs\.getBoolPref\("extensions\.tabsopenrelative\.includenewtabs"\)\) \{\s*tabsopenrelative_nextTab \*= -1;\s*\}/,
		''
		));
	}, 0);
	
	// Prevent problems with Tab Mix Plus (TODO: prevent user re-enabling the feature, and/or let them know?)
	try {
		if (tabtree_prefs.getBoolPref("extensions.tabmix.openTabNext")) tabtree_prefs.setBoolPref("extensions.tabmix.openTabNext", false);
	}
	catch (ex) {
	}
}

function tabtree_onDblclick(event) { // Set/unset tab[children="collapsed"] (and (un)collapse the tabs...)
	if (tabtree_prefs.getBoolPref("doubleclickmodifiers.alt") ^ event.altKey) return;
	if (tabtree_prefs.getBoolPref("doubleclickmodifiers.ctrl") ^ event.ctrlKey) return;
	if (tabtree_prefs.getBoolPref("doubleclickmodifiers.meta") ^ event.metaKey) return;
	if (tabtree_prefs.getBoolPref("doubleclickmodifiers.shift") ^ event.shiftKey) return;
	
	if (event.target.localName == "tab" && event.originalTarget.localName != "toolbarbutton") {
		if (event.target.hasAttribute("parent")) tabtree_mergeWithPrevious(event.target); //mergeWithPrevious is clever enough not to do anything to the first tab
		else tabtree_splitGroup(event.target);
		
		// I think these two are the ones I need
		event.preventDefault();
		event.stopPropagation();
		//event.preventBubble();
	}
}

/*function tabtree_previousParentIndex(index) {
	if (index === undefined) {
		index = gBrowser.mTabContainer.selectedIndex;
	}
	else if (typeof index == "object") {
		if (index.localName == "tab") index = index._tPos;
		else index = gBrowser.mTabContainer.selectedIndex;
	}
	
	while (index >= 0 && !gBrowser.mTabs[index].hasAttribute("parent")) {
		index--;
	}
	index--;
	while (index >= 0 && !gBrowser.mTabs[index].hasAttribute("parent")) {
		index--;
	}
	return index; // warning: returns -1 if the start index is in the first tab group
}*/
function tabtree_rootIndex(tab) {
	return tabtree_rootNode(tab)._tPos;
}
function tabtree_rootNode(tab) {
	if (!tab)
		tab = gBrowser.mCurrentTab;
	else if (typeof tab == "number")
		tab = gBrowser.mTabs[tab];
	
	while (tab.parent != TABTREE_ROOT) tab = tab.parent;
	
	return tab;
}
function tabtree_nextRootIndex(index) {
	if (index === undefined) {
		index = gBrowser.mTabContainer.selectedIndex;
	}
	else if (typeof index == "object") {
		index = index._tPos;
	}
	
	index++;
	while (index < gBrowser.mTabs.length && gBrowser.mTabs[index].parent != TABTREE_ROOT) {
		index++;
	}
	return index; // warning: returns gBrowser.mTabs.length if the start index is in the last tab group
}

function tabtree_mergeWithPrevious(index) {
	parentIndex = tabtree_rootIndex(index);
	if (parentIndex <= 0) return false; //mustn't remove the first tab's parent attribute
	gBrowser.mTabs[parentIndex].removeAttribute("parent");
	
	//var previousParent = gBrowser.mTabs[ tabtree_rootIndex(parentIndex - 1) ];
	//var ancestor = "ancestor" in previousParent ? previousParent.ancestor : null;
	
	var newGroupid = tabtree_rootNode(parentIndex - 1);
	for (var i = parentIndex; i < gBrowser.mTabs.length && !gBrowser.mTabs[i].hasAttribute("parent"); i++) {
		tabtree_setupTab(gBrowser.mTabs[i], newGroupid);
		//if (gBrowser.mTabs[i].ancestor == null) gBrowser.mTabs[i].ancestor = ancestor;
	}
	
	return true;
}
function tabtree_mergeWithNext(index) {
	parentIndex = tabtree_nextRootIndex(index);
	if (parentIndex < gBrowser.mTabs.length) {
		gBrowser.mTabs[parentIndex].removeAttribute("parent");
		
		//var previousParent = gBrowser.mTabs[ tabtree_rootIndex(index) ];
		//var ancestor = "ancestor" in previousParent ? previousParent.ancestor : null;
		
		var newGroupid = tabtree_rootNode(index);
		for (var i = parentIndex; i < gBrowser.mTabs.length && !gBrowser.mTabs[i].hasAttribute("parent"); i++) {
			tabtree_setupTab(gBrowser.mTabs[i], newGroupid);
			//if (gBrowser.mTabs[i].ancestor == null) gBrowser.mTabs[i].ancestor = ancestor;
		}
		
		return true;
	}
	else return false;
}
function tabtree_mergeAll() {
	var newGroupid = gBrowser.mTabs[0].groupid;
	//var ancestor = "ancestor" in gBrowser.mTabs[0] ? gBrowser.mTabs[0].ancestor : null;
	for (var i = 1; i < gBrowser.mTabs.length; i++) {
		gBrowser.mTabs[i].removeAttribute("parent");
		tabtree_setupTab(gBrowser.mTabs[i], newGroupid);
		//if (gBrowser.mTabs[i].ancestor == null) gBrowser.mTabs[i].ancestor = ancestor;
	}
	return true;
}
function tabtree__getDomain(aTab) {
	try {
		return aTab.linkedBrowser.webNavigation.currentURI.host;
	}
	catch (ex) {
		return aTab.linkedBrowser.webNavigation.currentURI.prePath;
	}
}
function tabtree__compareDomains(a, b) {
	var hostA = tabtree__getDomain(a).split(".").reverse().join(".");
	var hostB = tabtree__getDomain(b).split(".").reverse().join(".");
	if (hostA > hostB) return 1;
	else if (hostA < hostB) return -1;
	else return 0;
}
function tabtree_groupByDomain() {
	var temp = new Array();
	for (var i = 0; i < gBrowser.mTabs.length; i++) {
		temp.push(gBrowser.mTabs[i]);
	}
	temp.sort(tabtree__compareDomains);
	for (var i = 0; i < temp.length; i++) {
		gBrowser.moveTabTo(temp[i], i);
	}
	tabtree_groupid = 0;
	for (var i = 0; i < temp.length; i++) {
		if (i > 0 && tabtree__getDomain(temp[i]) != tabtree__getDomain(temp[i-1])) {
			temp[i].setAttribute("parent", "true");
			tabtree_groupid++;
		}
		else temp[i].removeAttribute("parent");
		tabtree_setupTab(temp[i]); // uses tabtree_groupid
	}
	temp[0].setAttribute("parent", "true");
	return true;
}
function tabtree_splitGroup(index) {
	if (index === undefined) {
		index = gBrowser.mTabContainer.selectedIndex;
	}
	else if (typeof index == "object") {
		if (index.localName == "tab") index = index._tPos;
		else index = gBrowser.mTabContainer.selectedIndex;
	}
	else if (index >= gBrowser.mTabs.length) {
		return false;
	}
	
	if (gBrowser.mTabs[index].hasAttribute("parent")) {
		return false;
	}
	
	tabtree_groupid++;
	if (tabtree_colors.length >= 3) while (tabtree_groupid % tabtree_colors.length == tabtree_rootNode(index) % tabtree_colors.length || (tabtree_nextRootIndex(index) < gBrowser.mTabs.length && tabtree_groupid % tabtree_colors.length == tabtree_rootNode(tabtree_nextRootIndex(index)) % tabtree_colors.length)) { // tabtree_colors.length must be >= 3 to prevent an infinite loop occuring
		tabtree_groupid++;
	}
	
	for (var i = index; i < gBrowser.mTabs.length && !gBrowser.mTabs[i].hasAttribute("parent"); i++) {
		tabtree_setupTab(gBrowser.mTabs[i]); // uses tabtree_groupid
	}
	
	gBrowser.mTabs[index].setAttribute("parent", "true");
	return true;
}

function tabtree_updateMenu(event) {
	var tab = gBrowser.mContextTab.localName == "tab" ? gBrowser.mContextTab : gBrowser.mCurrentTab;
	
	document.getElementById("tabtree-merge-left").setAttribute("disabled", tabtree_rootIndex(tab) == 0);
	document.getElementById("tabtree-merge-right").setAttribute("disabled", tabtree_nextRootIndex(tab) == gBrowser.mTabs.length);
	document.getElementById("tabtree-merge-all").setAttribute("disabled", tabtree_rootIndex(tab) == 0 && tabtree_nextRootIndex(tab) == gBrowser.mTabs.length);
	document.getElementById("tabtree-split-here").setAttribute("disabled", tab.hasAttribute("parent"));
	tabtree_dump(tab._tPos);
}

function tabtree_global_DOMContentLoaded(event) {
	try {
		window.removeEventListener("DOMContentLoaded", tabtree_global_DOMContentLoaded, false);
	}
	catch (ex) {
	}
	
	/* ALL LINE NUMBERS ARE FROM FIREFOX 1.5 */
	
	/*===== utilityOverlay.js changes =====*/
		
	// links which open in the foreground should generally be tab groups, and vice versa
	// this is particularly relevant for bookmarks and history
	// TODO: neither tabtree_openRelative nor TABTREE_AUTO exist!
	eval("openUILinkIn = " + openUILinkIn.toString().replace(
	'var tab = browser.addTab(url);', // line 194
	'if (tabtree_openRelative == TABTREE_AUTO && (where == "tab") ^ getBoolPref("browser.tabs.loadBookmarksInBackground", false)) \
	    tabtree_tempParent = TABTREE_ROOT; \
	var tab = browser.addTab(url);'
	));
	
	/*===== bookmarks.js changes =====*/
	
	// TODO: deal with BookmarksCommand.openGroupBookmark
	if (BookmarksCommand && BookmarksCommand.openGroupBookmark) {
		eval("BookmarksCommand.openGroupBookmark = " + BookmarksCommand.openGroupBookmark.toString().replace(
		'index0 = 0;', // line 672
		'index0 = 0; \
		var oldPref = tabtree_prefs.getIntPref("tabsopen"); \
		tabtree_prefs.setIntPref("tabsopen", TABTREE_OPEN_RELATED_TABBAR_END);'
		).replace(
		'tabPanels[index].loadURI(uri);', // line 687
		'if (browser.mTabs[index].hasAttribute("parent")) w.tabtree_mergeWithPrevious(index); \
		newTab = browser.mTabs[index]; \
		tabPanels[index].loadURI(uri);'
		).replace(
		'browser.addTab(uri);',
		'newTab = browser.addTab(uri);'
		).replace(
		'++index;',
		'if (index == index0) { \
		    var ancestor = "ancestor" in newTab ? newTab.ancestor : null; \
		} \
		else newTab.ancestor = ancestor; \
		++index;'
		).replace(
		/if \(index == index0\)\s*return;/, // lines 695-696
		'tabtree_prefs.setIntPref("tabsopen", oldPref); \
		if (index == index0) { \
		    return; \
		} \
		w.tabtree_splitGroup(index0);'
		));
	}
}
