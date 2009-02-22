/**
 * Tab Kit
 * http://jomel.me.uk/software/firefox/tabkit/
 */

/* TODOLIST
 * -------- //TODO:URGENT
 + Fix up Session Manager, basing it on Recently Closed Windows code (& test)
 + Sort out Sorting and Grouping
 + Get permission from zeniko
 
 - Allow keeping closed windows across sessions
 - Integrate with purge history
 - Limit no. of saved closed windows
 - Ability to delete sessions
 **********************************/

var tabkit = new function _tabkit() { // Just a 'namespace' to hide our stuff in

    //|##########################
    //{### Basic Constants
    //|##########################

    /// Private globals:
    const self = this; // Functions passed as parameters lose their this, as do nested functions, so store it in 'self'

    const PREF_BRANCH = "extensions.tabkit.";

    const XUL_NS = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";

    const Cc = Components.classes;
    const Ci = Components.interfaces;

    //}##########################
    //{### Services
    //|##########################
    
    // Make sure we can use gPrefService from now on (even if this isn't a browser window!)
    if (typeof gPrefService == "undefined" || !gPrefService)
        gPrefService = Components.classes["@mozilla.org/preferences-service;1"].
                       getService(Components.interfaces.nsIPrefBranch);

    /// Private globals:
    var _console = Cc["@mozilla.org/consoleservice;1"].
                   getService(Ci.nsIConsoleService);

    var _ds = Cc["@mozilla.org/file/directory_service;1"].
              getService(Ci.nsIProperties);

    var _os = Cc["@mozilla.org/observer-service;1"].
              getService(Ci.nsIObserverService);

    var _prefs = Cc["@mozilla.org/preferences-service;1"].
                 getService(Ci.nsIPrefService).
                 getBranch(PREF_BRANCH);

    var _ss = Cc["@mozilla.org/browser/sessionstore;1"].
              getService(Ci.nsISessionStore);

    var _wm = Cc["@mozilla.org/appshell/window-mediator;1"].
              getService(Ci.nsIWindowMediator);

    //}##########################
    //{### Utility Functions
    //|##########################

    this.dump = function _dump(error, ignoreDebug) {
        try {
            if (ignoreDebug || _prefs.getBoolPref("debug")) {
                var scriptError = Cc["@mozilla.org/scripterror;1"].
                                  createInstance(Ci.nsIScriptError);

                var isError = (typeof error == "object");
                if (isError && error.stack) {
                    var stack = error.stack;
                }
                else {
                    var stack = new Error().stack; // Get call stack (could use Components.stack.caller instead)
                    stack = stack.substring(stack.indexOf("\n", stack.indexOf("\n")+1)+1); // Remove the two lines due to calling this
                }
                var message = 'TK Error: "' + error + '"\nat:\u00A0' + stack.replace("\n@:0", "").replace(/\n/g, "\n      "); // \u00A0 is a non-breaking space
                var sourceName = Components.stack.caller.filename;
                var sourceLine = Components.stack.caller.sourceLine; // Unfortunately this is probably null
                var lineNumber = Components.stack.caller.lineNumber; // error.lineNumber isn't always accurate, so ignore it
                var columnNumber = (isError && error.columnNumber) ? error.columnNumber : 0;
                var flags = isError ? scriptError.errorFlag : scriptError.warningFlag;
                var category = "JavaScript error"; // TODO: Check this
                scriptError.init(message, sourceName, sourceLine, lineNumber, columnNumber, flags, category);
                _console.logMessage(scriptError);
            }
        }
        catch (ex) {
            if ("breakpoint" in window) breakpoint(function(e){return eval(e);}, ex); // breakpoint requires QuickPrompt extension
        }
    };

    // Only use this when you don't want line numbers, call stack, etc.
    this.log = function _log(message, ignoreDebug) {
        try {
            if (ignoreDebug || _prefs.getBoolPref("debug")) {
                _console.logStringMessage("TK: " + message);
            }
        }
        catch (ex) {
            // The hidden debug pref isn't set and the ignoreDebug override
            // was off, so don't spam the Error Console with messages
        }
    };


    this.startsWith = function(str, start) {
        return str.indexOf(start) === 0;
    }

    this.endsWith = function(str, end) {
        var startPos = str.length - end.length;
        if (startPos < 0)
            return false;
        return str.lastIndexOf(end, startPos) == startPos;
    };

    
    this.hash = function _hash(str) {
        // Uses djb2 algorithm (http://www.cse.yorku.ca/~oz/hash.html#djb2) for compatibility with ChromaTabs and Fashion Tabs
		var hash = 5381;
		for (var i = 0; i < str.length; i++) {
			var charCode = str.charCodeAt(i);
			hash = (hash << 5) + hash + charCode; // hash * 33 + charCode
		}
		return hash;
	};
    

    /*this.fileToString = function _fileToString(filename, dir) {
        if (!dir) dir = Directories.PROFILE;

        // Get chosen directory
        var file = Cc["@mozilla.org/file/directory_service;1"].
                   getService(Ci.nsIProperties).
                   get(dir, Ci.nsIFile);
        // Get the file within that directory
        file.append(filename);

        // Get a nsIFileInputStream for the file
        var fis = Cc["@mozilla.org/network/file-input-stream;1"].
                  createInstance(Ci.nsIFileInputStream);
        fis.init(file, -1, 0, 0);

        // Get an intl-aware nsIConverterInputStream for the file
        const replacementChar = Ci.nsIConverterInputStream.DEFAULT_REPLACEMENT_CHARACTER;
        var is = Cc["@mozilla.org/intl/converter-input-stream;1"].
                 createInstance(Ci.nsIConverterInputStream);
        is.init(fis, "UTF-8", 1024, replacementChar);

        // Read the file into str
        var str = "";
        var tempStr = {};
        while (is.readString(4096, tempStr) != 0) {
            str += tempStr.value;
        }

        // Clean up
        is.close();
        fis.close();

        return str;
    };

    this.stringToFile = function _stringToFile(str, filename, dir) {
        if (!dir) dir = Directories.PROFILE;

        // Get chosen directory
        var file = Cc["@mozilla.org/file/directory_service;1"].
                   getService(Ci.nsIProperties).
                   get(dir, Ci.nsIFile);
        // Get the temporary file within that directory
        file.append(filename+".tmp");

        // Get a nsIFileOutputStream for the (temp) file
        var fos = Cc["@mozilla.org/network/file-output-stream;1"].
                  createInstance(Ci.nsIFileOutputStream);
        fos.init(file, 0x02 | 0x08 | 0x20, 0664, 0); // write | create | truncate

        // Get an intl-aware nsIConverterOutputStream for the (temp) file
        var os = Cc["@mozilla.org/intl/converter-output-stream;1"].
                 createInstance(Ci.nsIConverterOutputStream);
        os.init(fos, "UTF-8", 0, 0x0000);

        // Write str to the (temp) file
        os.writeString(str);

        // Clean up
        os.close();
        fos.close();

        // Now move the temporary file to the real file
        file.moveTo(null, filename);
    };*/

    this.getFile = function _getFile(filename, dir) {
        if (!dir) dir = "ProfD"; // Profile dir, other directories of note are user chrome: "UChrm" and temp: "TmpD"
        var file = _ds.get(dir, Ci.nsILocalFile);
        file.append(filename);
        return file;
    };

    // Based on http://lxr.mozilla.org/mozilla1.8/source/browser/components/sessionstore/src/nsSessionStartup.js#341
    this.readFile = function _readFile(aFile) {
        try {
            var stream = Cc["@mozilla.org/network/file-input-stream;1"].
                         createInstance(Ci.nsIFileInputStream);
            stream.init(aFile, 0x01, 0, 0);
            var cvstream = Cc["@mozilla.org/intl/converter-input-stream;1"].
                           createInstance(Ci.nsIConverterInputStream);
            cvstream.init(stream, "UTF-8", 1024, Ci.nsIConverterInputStream.DEFAULT_REPLACEMENT_CHARACTER);

            var content = "";
            var data = {};
            while (cvstream.readString(4096, data)) {
                content += data.value;
            }
            cvstream.close();

            return content.replace(/\r\n?/g, "\n");
        }
        catch (ex) {
            return null; // non-existant file?
        }
    };

    // Based on http://lxr.mozilla.org/mozilla1.8/source/browser/components/sessionstore/src/nsSessionStore.js#1988
    this.writeFile = function _writeFile(aString, aFile) {
        // init stream
        var stream = Cc["@mozilla.org/network/safe-file-output-stream;1"].
                     createInstance(Ci.nsIFileOutputStream);
        stream.init(aFile, 0x02 | 0x08 | 0x20, 0600, 0);

        // convert to UTF-8
        var converter = Cc["@mozilla.org/intl/scriptableunicodeconverter"].
                        createInstance(Ci.nsIScriptableUnicodeConverter);
        converter.charset = "UTF-8";
        var convertedData = converter.ConvertFromUnicode(aString);
        convertedData += converter.Finish();

        // write and close stream
        stream.write(convertedData, convertedData.length);
        if (stream instanceof Ci.nsISafeOutputStream) {
            stream.finish();
        } else {
            stream.close();
        }
    };


    this.getPrettyDate = function _getPrettyDate() {
        var d = new Date();
        var days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        var day = days[d.getDay()];
        var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        var month = months[d.getMonth()];
        return day+", "+d.getDate()+" "+month+" "+d.getFullYear();
    };

    this.getPrettyTime = function _getPrettyTime() {
        var d = new Date();
        var hours = d.getHours();
        if (hours < 10) hours = "0" + hours;
        var minutes = d.getMinutes();
        if (minutes < 10) minutes = "0" + minutes;
        return hours+":"+minutes;
    };

    this.getPrettyDateTime = function _getPrettyDateTime() {
        return self.getPrettyDate() + " " + self.getPrettyTime();
    };


    this.addDelayedEventListener = function _addDelayedEventListener(target, eventType, listener) {
        if (typeof listener == "object") {
            target.addEventListener(eventType, function __delayedEventListener(event) {
                window.setTimeout(function() { listener.handleEvent(event); }, 0);
            }, false);
        }
        else {
            target.addEventListener(eventType, function __delayedEventListener(event) {
                window.setTimeout(function() { listener(event); }, 0);
            }, false);
        }
    };


    this.scrollToElement = function _scrollToElement(overflowPane, element) {
        // TODO: cleanup code [based on toomanytabs]:
        var scrollbar = overflowPane.mVerticalScrollbar;
        if (!scrollbar)
            return;

        var container = element.parentNode;

        var curpos = parseInt(scrollbar.getAttribute("curpos"));
        var firstY = container.firstChild.boxObject.y
        var elemY = element.boxObject.y;
        var lastY = container.lastChild.boxObject.y;
        var height = element.boxObject.height;
        var relY = elemY - firstY;

        // Make sure overflowPane is never scrolled halfway across an element
        if ((lastY - firstY) % height == 0 && curpos % height != 0) {
            curpos = height * Math.round(curpos / height);
        }

        var minpos = relY;
        if (_prefs.getBoolPref("scrollOneExtra") && minpos > 0 && lastY - firstY > height) {
            minpos -= height;
        }
        if (minpos < curpos) {
            curpos = minpos; // Set it to minpos
        }
        else {
            var maxpos = relY + height - overflowPane.boxObject.height;
            if (_prefs.getBoolPref("scrollOneExtra") && lastY > elemY && lastY - firstY > height) {
                maxpos += height;
            }
            if (maxpos > curpos) {
                curpos = maxpos; // Set it to maxpos
            }
        }

        scrollbar.setAttribute("curpos", curpos);
    };

    this.closeWindowIfHomeOrBlank = function _closeWindowIfHomeOrBlank() {
        var uris = gHomeButton.getHomePage().split("|");
        for (var i = 0; i < gBrowser.browsers.length; i++) {
            var uri = gBrowser.browsers[i].webNavigation.currentURI.spec;
            if (!uri || uri == "about:blank") continue;
            var matched = false;
            for each (var u in uris) {
                if (u == uri) {
                    matched = true;
                    break;
                }
            }
            if (!matched) return;
        }

        window.close();
    }

    
    this.moveBefore = function _moveBefore(tabToMove, target) {
        var newIndex = target._tPos;
        if (newIndex > tabToMove._tPos)
            newIndex--;
        if (newIndex != tabToMove._tPos)
            gBrowser.moveTabTo(tabToMove, newIndex);
    };
    
    this.moveAfter = function _moveAfter(tabToMove, target) {
        var newIndex = target._tPos + 1;
        if (newIndex > tabToMove._tPos)
            newIndex--;
        if (newIndex != tabToMove._tPos)
            gBrowser.moveTabTo(tabToMove, newIndex);
    };
    
    //}##########################
    //{### Initialisation
    //|##########################

    // USAGE: this.*InitListeners.push(this.*Init*);

    /// Globals:
    this.globalPreInitListeners = [
    ];

    this.preInitListeners = [
    ];

    this.initListeners = [
    ];

    this.postInitListeners = [
    ];

    /// Event Listeners:
    /* This gets called from:
     * chrome://browser/content/bookmarks/bookmarksManager.xul,
     * chrome://browser/content/bookmarks/bookmarksPanel.xul and
     * chrome://browser/content/history/history-panel.xul
     */
    this.onDOMContentLoaded_global = function _onDOMContentLoaded_global(event) {
        window.removeEventListener("DOMContentLoaded", self.onDOMContentLoaded_global, false);

        // Run module global early initialisation code (before any init* listeners, and before most extensions):
        for each (var listener in self.globalPreInitListeners) {
            listener(event);
        }
    };

    // This gets called for new browser windows, once the DOM tree is loaded
    this.onDOMContentLoaded = function _onDOMContentLoaded(event) {
        window.removeEventListener("DOMContentLoaded", self.onDOMContentLoaded, false);

        // Run module early initialisation code (before any init* listeners, and before most extensions):
        for each (var listener in self.preInitListeners) {
            listener(event);
        }
    };

    // This gets called for new browser windows, once they've finished loading
    this.onLoad = function _onLoad(event) {
        window.removeEventListener("load", self.onLoad, false);

        // Run module specific initialisation code, such as registering event listeners:
        for each (var listener in self.initListeners) {
            listener(event);
        }

        window.setTimeout(function __runPostInitListeners() {
            // Run module specific late initialisation code (after all init* listeners, and after most extensions):
            for each (var listener in self.postInitListeners) {
                listener(event);
            }
        }, 0);
    };

    //}##########################
    //{### Useful shortcuts
    //|##########################

    // Make sure we can use gBrowser from now on if this is a browser window
    if (typeof gBrowser != "undefined" && !gBrowser)
        getBrowser();
    
    /// Private Globals:
    var _tabContainer = gBrowser.mTabContainer; // Arguably should get this in the listener too, but seems to work...
    var _tabstrip;
    var _tabInnerBox;
    var _tabs = gBrowser.mTabs; // Arguably should get this in the listener too, but seems to work...

    /// Initialisation:
    this.preInitShortcuts = function _preInitShortcuts(event) {
        _tabstrip = _tabContainer.mTabstrip;
        _tabInnerBox = document.getAnonymousElementByAttribute(_tabstrip._scrollbox, "class", "box-inherit scrollbox-innerbox");
    };
    this.preInitListeners.push(this.preInitShortcuts);

    //}##########################
    //{### Prefs Observers
    //|##########################

    /// Private globals:
    var _globalPrefObservers = {};

    var _localPrefListeners = {};

    /// Initialisation:
    this.preInitPrefsObservers = function _preInitPrefsObservers(event) {
        // Make sure we can use addObserver on this
        gPrefService.QueryInterface(Ci.nsIPrefBranch2);

        // Do this in preInit just in case something expects their init prefListener to work instantly (TODO: check it works!)
        self.addGlobalPrefListener(PREF_BRANCH, self.localPrefsListener);
    };
    this.preInitListeners.push(this.preInitPrefsObservers);

    /// Pref Listeners:
    // This listener checks all changes to the extension's pref branch, and delegates them to their registered listeners
    // Presumeably more efficient than simply adding a global observer for each one...
    this.localPrefsListener = function _localPrefsListener(changedPref) {
        changedPref = changedPref.substring(PREF_BRANCH.length); // Remove prefix for these local prefs
        for (var pref in _localPrefListeners) {
            if (changedPref.substring(0, pref.length) == pref) {
                for each (var listener in _localPrefListeners[pref]) {
                    listener(changedPref);
                }
            }
        }
    };

    /// Methods:
    this.addGlobalPrefListener = function _addGlobalPrefListener(prefString, prefListener) {
        if (!_globalPrefObservers[prefString]) {
            _globalPrefObservers[prefString] = {
                listeners: [],

                register: function() {
                    gPrefService.addObserver(prefString, this, false);
                },

                unregister: function() {
                    gPrefService.removeObserver(prefString, this);
                },

                observe: function(aSubject, aTopic, aData) {
                    if (aTopic != "nsPref:changed") return;
                    // aSubject is the nsIPrefBranch we're observing (after appropriate QI)
                    // aData is the name of the pref that's been changed (relative to aSubject)
                    for each (var listener in this.listeners) {
                        listener(aData);
                    }
                }
            };

            window.addEventListener("unload", function() { _globalPrefObservers[prefString].unregister(); }, false);
            _globalPrefObservers[prefString].register();
        }

        _globalPrefObservers[prefString].listeners.push(prefListener);
    };

    this.addPrefListener = function _addPrefListener(pref, listener) {
        if (!_localPrefListeners[pref]) {
            _localPrefListeners[pref] = [];
        }
        _localPrefListeners[pref].push(listener);
    };

    //}##########################
    //{### Pref-attribute Mapping
    //|##########################

    this.mapPrefsToAttribute = function _mapPrefsToAttribute(prefs, test, node, attribute) {
        var listener = function() {
            var value = test();
            if (value !== undefined) {
                node.setAttribute(attribute, value);
            }
            else {
                node.removeAttribute(attribute);
            }
        }

        for each (var pref in prefs) {
            self.addPrefListener(pref, listener);
        }

        listener();
    };

    this.mapBoolPrefToAttribute = function _mapBoolPrefToAttribute(pref, node, attribute) {
        self.mapPrefsToAttribute([pref], function() { return _prefs.getBoolPref(pref) ? "true" : undefined; }, node, attribute);
    };

    //}##########################
    //{### Method Hooks
    //|##########################

    // USAGE: this.*MethodHooks.push([<original method>, <where to backup>, <search>, <replacement>]);
    // e.g. this.lateMethodHooks.push(['gBrowser.addTab', 'gBrowser._doAddTab', 't._tPos = position;', 't._tPos = position; alert("hi!");']);
    // Warning: if you make a backup of the original method and wish to call it, you must save it onto the same object as the original!
    // Warning: if you replace methods that deal with private variables they won't be able to access them anymore!

    /// Global
    this.earlyMethodHooks = [];
    this.lateMethodHooks = [];

    /// Initialisation:
    this.preInitMethodHooks = function _preInitMethodHooks(event) {
        for each (var hook in self.earlyMethodHooks)
            self.addMethodHook(hook);
    };
    this.preInitListeners.push(this.preInitMethodHooks);

    this.postInitMethodHooks = function _postInitMethodHooks(event) {
        for each (var hook in self.lateMethodHooks)
            self.addMethodHook(hook);
    };
    this.postInitListeners.push(this.postInitMethodHooks);

    /// Methods:
    this.addMethodHook = function _addMethodHook(hook) {
        try {
            if (hook[1])
                eval(hook[1] + "=" + hook[0]);

            var code = eval(hook[0] + ".toString()");
            
            for (var i = 2; i < hook.length; )
                code = code.replace(hook[i++], hook[i++]);
            
            eval(hook[0] + "=" + code);
        }
        catch (ex) {
            self.dump("Method hook failed (" + hook + ") with exception:\n" + ex);
        }
    };

    this.prependMethodCode = function _prependMethodCode(methodname, codestring) {
        self.addMethodHook([methodname, null, '{', '{' + codestring]);
    };

    this.appendMethodCode = function _appendMethodCode(methodname, codestring) {
        self.addMethodHook([methodname, null, /\}$/, codestring + '}']);
    };

    this.wrapMethodCode = function _wrapMethodCode(methodname, startcode, endcode) {
        //self.addMethodHook([methodname, null, /\{([^]*)\}$/, '{' + startcode + '$&' + endcode + '}']);
        self.addMethodHook([methodname, null, '{', '{' + startcode, /\}$/, endcode + '}']);
    }

    //}##########################
    //{### Menus
    //|##########################

    /// Initialisation:
    this.postInitMenus = function _postInitMenus() {
        // Do anything that needs doing for the menus
    };
    this.postInitListeners.push(this.postInitMenus);

    //}##########################
    //{>>> Sessions/Closed Windows
    //|##########################//TODO:URGENT

    /// Globals:
    var _sessionFile;

    this.sessionData = null;

    /// Initialisation:
    this.initSessionManager = function _initSessionManager(event) {
        _sessionFile = self.getFile("tabkitsessions.json");

        self.sessionData = eval(self.readFile(_sessionFile));
        if (!self.sessionData) {
            self.log("Note: failed to read tabkitsessions.json (this is *normal* if this is the first time you use Tab Kit)");
            self.sessionData = {
                sessions: {},
                windows: []
            };
        }
        else if (!prefs.getBoolPref("keepClosedWindows")) {
            self.sessionData.windows = [];
        }

        //self.sessionObserver.register();
        //window.addEventListener("unload", function() { self.sessionObserver.unregister(); }, false);

        /*
        if (_prefs.prefHasUserValue("log")) _prefs.setCharPref("log", "\n\n\n" + _prefs.getCharPref("log"));

        var observer = {
            observe: function(aSubject, aTopic, aData) {
                var winType = (typeof aSubject == "object" && aSubject && "document" in aSubject) ? aSubject.document.documentElement.getAttribute("windowtype") : "";
                var log = aSubject + ":" + winType + "; " + aTopic + "; " + aData;
                try { log += "\n" + _prefs.getCharPref("log"); } catch(ex) {}
                _prefs.setCharPref("log", log);
                self.log(log);
            }
        };

        window.addEventListener("DOMWindowClose", function(event) { observer.observe("<event>", "DOMWindowClose", prettyPrint(event.target)); }, false);
        window.addEventListener("DOMWindowClosed", function(event) { observer.observe("<event>", "DOMWindowClosed", prettyPrint(event.target)); }, false);
        window.addEventListener("unload", function(event) { observer.observe("<event>", "unload", prettyPrint(event.target)); }, false);
        window.addEventListener("beforeunload", function(event) { observer.observe("<event>", "beforeunload", prettyPrint(event.target)); }, false);

        _os.addObserver(observer, "domwindowopened", false);
        _os.addObserver(observer, "domwindowclosed", false);
        _os.addObserver(observer, "quit-application-requested", false);
        _os.addObserver(observer, "quit-application-granted", false);
        _os.addObserver(observer, "quit-application", false);
        _os.addObserver(observer, "xpcom-shutdown", false);*/

        /*window.addEventListener("unload", function() {
            _os.removeObserver(observer, "domwindowopened");
            _os.removeObserver(observer, "domwindowclosed");
            _os.removeObserver(observer, "quit-application-requested");
            _os.removeObserver(observer, "quit-application-granted");
            _os.removeObserver(observer, "quit-application");
            _os.removeObserver(observer, "xpcom-shutdown");
        }, false);

        /*
        case "domwindowopened":
            aSubject.addEventListener("load", onWindowLoad_window, false); //.document.documentElement.getAttribute("windowtype") == "navigator:browser"
            break;
        case "domwindowclosed":
            onWindowClose(aSubject, gQuitRequest && gQuitRequest > Date.now() - 3000);
            break;
        case "quit-application-requested":
            forEachBrowserWindow(collectWindowData);
            gDirty = {};
            gQuitRequest = Date.now();
            break;
        case "quit-application-granted":
            gLoadState = STATE_QUITTING;
            break;
        case "quit-application":
            if (aData == "restart")
            {
                gPrefBranch.setBoolPref("resume_session_once", true);
            }
            gLoadState = STATE_QUITTING;
            this.uninit();
            break;
        */
    };
    this.initListeners.push(this.initSessionManager);

    this.postInitSessionManager = function _postInitSessionManager() {
        if (_prefs.prefHasUserValue("nextwindow")) {
            _ss.setWindowState(window, _prefs.getCharPref("nextwindow"), true);
            _prefs.clearUserPref("nextwindow");
        }
    };
    this.postInitListeners.push(this.postInitSessionManager);

    /// Observer
    // Warning: there will be one of these per currently open window, don't do things several times!
    this.sessionObserver = {
        register: function() {
            _os.addObserver(this, "domwindowclosed", false);
            _os.addObserver(this, "quit-application-granted", false);
        },

        observe: function _observeSession(aSubject, aTopic, aData) {
            switch (aTopic) {
            case "domwindowclosed":
                if (aSubject.document.documentElement.getAttribute("windowtype") != "navigator:browser")
                    return;

                var title = aSubject.document.title.length > 40 ? aSubject.document.title.substring(0,37) + "..." : aSubject.document.title;
                var name = "[ " + aSubject._tabs.length + " tabs - " + self.getPrettyDateTime() + " ] " + title;

                self.recentlyClosedWindows.shift([name, _ss.getWindowState(aSubject)]);
                break;
            case "quit-application-granted":
                self.saveAllWindows("[ Closed browser: " + self.getPrettyDateTime() + " ]");
                this.unregister(); // Note: this prevents domwindowclosed calls for the closed windows
                break;
            }
        },

        unregister: function() {
            try {
                _os.removeObserver(this, "domwindowclosed");
                _os.removeObserver(this, "quit-application-granted");
            }
            catch (ex) {
                // They've already been removed
            }
        }
    };

    /// Event Handlers:
    // TODO: integrate with purge history

    // TODO: limit no. of saved closed windows
    //~ this.sessionManager_onUnload = function _sessionManager_onUnload(event) {
        //~ self.log("DOMWindowClose");
        //~ self.saveWindow("[ Closed window: " + self.getPrettyDateTime() + " ]");
    //~ };

    // TODO: ability to delete sessions
    this.updateSessionsMenu = function _updateSessionsMenu(event, popup) {
        if (event.target != event.currentTarget) return;

        //var startSeparator = document.getElementById("menu_tabkit-sessions-startList");
        var endSeparator = document.getElementById("menu_tabkit-sessions-endList");

        /*var i = 0;
        var destroy = false;
        while (i < popup.childNodes.length) {
            var item = popup.childNodes[i];
            if (item == endSeparator)
                break;

            if (destroy) {
                i--;
                goMenu.removeChild(item);
            }

            if (item == startSeparator)
                destroy = true;

            i++;
        }*/

        var oldSessions = popup.getElementsByAttribute("isSession", "true");
        for (var i = oldSessions.length - 1; i >= 0; i--) {
            popup.removeChild(oldSessions[i]);
        }

        var newSessions = self.getSortedSessionNames();

        var index = 1;
        for each (var sessionName in newSessions) {
            var menuitem = document.createElementNS(XUL_NS, "menuitem");
            if (index <= 10) {
                menuitem.setAttribute("label", (index % 10) + ") " + sessionName);
                menuitem.setAttribute("accesskey", (index % 10));
            }
            else {
                menuitem.setAttribute("label", sessionName);
            }
            //menuitem.setAttribute("statustext", url);
            menuitem.setAttribute("isSession", "true");
            menuitem.setAttribute("oncommand", "tabkit.restoreSession(\""+sessionName+"\");");
            popup.insertBefore(menuitem, endSeparator);

            index++;
        }

        endSeparator.setAttribute("hidden", index == 1);
    };

    /// Private Methods:
    function _compareSessionDates(a, b) {
        return b.date - a.date; // Note that we want most recent first
    }

    /// Methods:
    this.getSortedSessionNames = function _getSortedSessionNames() {
        var sessions = self.getSessions();

        var sessionArray = [];
        for (var sessionName in sessions) {
            sessionArray.push({ name: sessionName, date: sessions[sessionName].date });
        }
        sessionArray.sort(_compareSessionDates);

        var sessionNameArray = [];
        for each (var session in sessionArray) {
            sessionNameArray.push(session.name);
        }
        return sessionNameArray;
    };

    this.saveWindow = function _saveWindow(sessionName, aWindow) {
        if (!aWindow) {
            aWindow = window;
        }
        if (!sessionName) {
            // TODO: pretty dialog letting you replace existing sessions, a la Session Manager
            var defaultName;
            if (aWindow.document.title.length > 40) {
                defaultName = aWindow.document.title.substring(0,37) + "...";
            }
            else {
                defaultName = aWindow.document.title;
            }
            defaultName += " (" + self.getPrettyDate() + ")";
            sessionName = prompt("What do you want to call this session?", defaultName);
        }
        if (!sessionName) return; // The user must have clicked cancel

        self.addSession(sessionName, _ss.getWindowState(window));
    };

    this.saveAllWindows = function _saveAllWindows(sessionName) {
        if (!sessionName) {
            // TODO: pretty dialog letting you replace existing sessions, a la Session Manager
            var defaultName;
            if (document.title.length > 40)
                defaultName = document.title.substring(0,37) + "...";
            else
                defaultName = document.title;
            defaultName += " (" + self.getPrettyDate() + ")";
            sessionName = prompt("What do you want to call this session?", defaultName);
        }
        if (!sessionName) return; // The user must have clicked cancel

        var windows = _wm.getEnumerator("navigator:browser");
        var state = [];

        while (windows.hasMoreElements()) {
            state.push(_ss.getWindowState(windows.getNext()));
        }

        self.addSession(sessionName, state);
    };

    this.restoreSession = function _restoreSession(name) {
        var session = self.getSessions()[name];
        if (session) {
            if (typeof session.state == "string") {
                // TODO: Only open a new window if the current one isn't just gHomeButton.getHomePage() and/or blanks
                //_ss.setWindowState(window, session, true);
                _prefs.setCharPref("nextwindow", session.state);
                window.open("about:blank");
            }
            else for (var win in session.state) {
                _prefs.setCharPref("nextwindow", win);
                // TODO: test, apparently using about:blank might not work :s
                window.open("about:blank");
            }
        }
    };

    this.addSession = function _addSession(name, value) {
        var sessions = self.getSessions();

        sessions[name] = { state: value, date: Date.now() };

        self.setSessions(sessions);
    };

    this.removeSession = function _removeSession(name) {
        var sessions = self.getSessions();

        delete sessions[name];

        self.setSessions(sessions);
    };

    this.getSessionData = function _getSessionData() {
        try {
            //return eval(_prefs.getCharPref("sessions"));

            return eval(self.fileToString(SESSION_FILE));
        }
        catch (ex) {
            self.log("Note: failed to read tabkitsessions.json, this is *normal* if you have no sessions:\n" + ex);
            return {};
        }
    };

    this.setSessions = function _setSessions(sessions) {
        //_prefs.setCharPref("sessions", uneval(sessions));

        // Make sessions file slightly more human readable...
        var sessionStr = uneval(sessions).replace(/ ('(\\'|[^'])*':\{state:)/g, "\n\n$1").replace(/ ("(\\"|[^"])*":\{state:)/g, "\n\n$1");

        self.stringToFile(sessionStr, SESSION_FILE);
    };

    //}##########################
    //{>>> Recently Closed Wins
    //|##########################//TODO:URGENT

    // TODO: Add a keyboard shortcut for Undo Close Window? https://bugzilla.mozilla.org/show_bug.cgi?id=344736 https://bugzilla.mozilla.org/show_bug.cgi?id=357235 https://bugzilla.mozilla.org/show_bug.cgi?id=344140
    // TODO: Allow keeping closed windows across sessions

    /// Globals:
    this.recentWindows = [];

    /// Initialisation:
    this.initRecentWindows = function _initRecentWindows(event) {
        self.recentWindowsObserver.register();
        window.addEventListener("unload", function() { self.recentWindowsObserver.unregister(); }, false);

        window.addEventListener("beforeunload", function() { self.backupWindowState(); }, false);

        document.getElementById("goPopup").addEventListener("popupshowing", self.recentWindows_updateMenu, false);
    };
    this.initListeners.push(this.initRecentWindows);

    this.postInitRecentWindows = function _postInitRecentWindows() {
        if (_prefs.prefHasUserValue("restorerecentwindow")) {
            _ss.setWindowState(window, _prefs.getCharPref("restorerecentwindow"), true);
            _prefs.clearUserPref("restorerecentwindow");
        }
    };
    this.postInitListeners.push(this.postInitRecentWindows);

    /// Observer:
    // Keeps this.recentWindows up to date (and synchronised across windows)
    this.recentWindowsObserver = {
        register: function() {
            _os.addObserver(this, "domwindowclosed", false);
            _os.addObserver(this, "tabkit:add-recent-window", false);
            _os.addObserver(this, "tabkit:remove-recent-window", false);
            _os.addObserver(this, "browser:purge-session-history", false);
            _os.addObserver(this, "quit-application-granted", false);
        },

        observe: function _observeSession(aSubject, aTopic, aData) {
            switch (aTopic) {
                case "domwindowclosed":
                    if (aSubject.document.documentElement.getAttribute("windowtype") != "navigator:browser")
                        return;

                    // I can't just do _ss.getWindowState(aSubject); because _ss voids the window on domwindowclosed
                    // See Firefox Bug 360408: [SessionStore] Add 'Recently Closed Windows'/'Undo Close Window' (or make API easier on extensions)
                    if (!"tkt_lastSaved" in aSubject || aSubject.tkt_lastSaved === undefined) {
                        if (!"tkt_savedState" in aSubject) {
                            self.dump("No state backup for closed browser window!");
                        }
                        return;
                    }
                    if (Date.now() - aSubject.tkt_lastSaved > 3000) {
                        self.log("Whoah, this state backup is ancient: " + (Date.now() - aSubject.tkt_lastSaved) + "ms!");
                    }
                    delete aSubject.tkt_lastSaved; // Stop windows' observers from firing
                    var state = aSubject.tkt_savedState;

                    if (!aSubject.content.document.title) {
                        if (aSubject.content.location.href.length > 40) {
                            var title = aSubject.content.location.href.substring(0, 18) + "...";
                        }
                        else {
                            var title = aSubject.content.location.href;
                        }
                    }
                    else if (aSubject.content.document.title.length > 40) {
                        var title = aSubject.content.document.title.substring(0,37) + "...";
                    }
                    else {
                        var title = aSubject.content.document.title;
                    }
                    var name = "[ " + aSubject._tabs.length + " tabs - " + self.getPrettyDateTime() + " ] " + title;

                    // Now let each window add this to their list of recently closed windows
                    _os.notifyObservers(aSubject, "tabkit:add-recent-window", uneval([name, state]));
                    break;

                case "tabkit:add-recent-window":
                    self.recentWindows.unshift(eval(aData));
                    break;
                case "tabkit:remove-recent-window":
                    var recentWin = eval(aData);
                    var index = self.recentWindows.indexOf(recentWin);
                    if (index != -1) self.recentWindows.splice(index, 1);
                    else self.dump("self.recentWindows didn't contain: " + aData);
                    break;
                case "browser:purge-session-history":
                    self.recentWindows = [];
                case "quit-application-granted":
                    // Prevent domwindowclosed calls for the remaining windows
                    this.unregister();
            }
        },

        unregister: function() {
            try {
                _os.removeObserver(this, "domwindowclosed");
                _os.removeObserver(this, "tabkit:add-recent-window");
                _os.removeObserver(this, "tabkit:remove-recent-window");
                _os.removeObserver(this, "browser:purge-session-history");
                _os.removeObserver(this, "quit-application-granted");
            }
            catch (ex) {
                // They've already been removed
            }
        }
    };

    /// Event Listeners:
    this.backupWindowState = function _backupWindowState(event) {
        window.tkt_savedState = _ss.getWindowState(window);
        window.tkt_lastSaved = Date.now();
    };

    this.recentWindows_updateMenu = function _recentWindows_updateMenu(event) {
        document.getElementById("menu_tabkit-recentwindows-menu").setAttribute("disabled", self.recentWindows.length == 0);
    };

    this.updateRecentWindowsMenu = function _updateRecentWindowsMenu(event, popup) {
        if (event.target != event.currentTarget) return;

        var oldWindows = popup.getElementsByAttribute("isRecentWindow", "true");
        for (var i = oldWindows.length - 1; i >= 0; i--) {
            popup.removeChild(oldWindows[i]);
        }

        var endSeparator = document.getElementById("menu_tabkit-recentwindows-endList");

        var index = 1;
        for each (var recentWin in self.recentWindows) {
            var name = recentWin[0];
            var menuitem = document.createElementNS(XUL_NS, "menuitem");
            if (index <= 10) {
                menuitem.setAttribute("label", (index % 10) + ") " + name);
                menuitem.setAttribute("accesskey", (index % 10));
            }
            else {
                menuitem.setAttribute("label", name);
            }
            //menuitem.setAttribute("statustext", urls);
            menuitem.setAttribute("isRecentWindow", "true");
            menuitem.setAttribute("oncommand", "tabkit.restoreRecentWindow(" + uneval(recentWin) + ");");

            popup.insertBefore(menuitem, endSeparator);

            index++;
        }
    };

    /// Methods:
    this.restoreRecentWindow = function _restoreRecentWindow(recentWin, keepOpen) {
        _prefs.setCharPref("restorerecentwindow", recentWin[1]);
        window.open("about:blank"); // TODO: test, apparently using about:blank might not work :-s

        if (!keepOpen)
            self.closeWindowIfHomeOrBlank(); // TODO: prevent this from being added to recently closed windows list?

        _os.notifyObservers(null, "tabkit:remove-recent-window", uneval(recentWin));
    };

    this.openAllRecentWindows = function _openAllRecentWindows() {
        for (var i = self.recentWindows.length - 1; i >= 0; i++) {
            self.restoreRecentWindow(self.recentWindows[i], true);
        }

        self.closeWindowIfHomeOrBlank();
    };

    //}##########################
    //{>>> Sorting & Grouping
    //|##########################

    /// Constants
    //var GROUP_START_URL = "data:text/html,<style>h1{font-size:256px;margin-bottom:32px}h1,p{text-align:center}p{font-size:1.2em}</style><h1>{&nbsp;&nbsp;&nbsp;...</h1><p><b>Tab Kit:</b> This is a <i>temporary</i> tab to indicate the <b>start</b> of a tab group.<br>It will go away when you stop dragging tabs.<p>"; // TODO: use these!

    //var GROUP_END_URL = "data:text/html,<style>h1{font-size:256px;margin-bottom:32px}h1,p{text-align:center}p{font-size:1.2em}</style><h1>...&nbsp;&nbsp;&nbsp;}</h1><p><b>Tab Kit:</b> This is a <i>temporary</i> tab to indicate the <b>end</b> of a tab group.<br>It will go away when you stop dragging tabs.<p>";

    /// Enums:
    this.Sorts = {
        created:    "createdKey",    // == Firefox: new tabs to far right
        lastLoaded: "lastLoadedKey",
        lastViewed: "lastViewedKey", // == Visual Studio: last used tabs to far left
        title:      "label",
        uri:        "uriKey"
    };

    this.Groupings = {
        origin:     "originGroup",
        uri:        "uriGroup"
    };
    
    this.RelativePositions = {
        LEFT: 1,
        RIGHT: 2,
        RIGHT_OF_RECENT: 3,
        RIGHT_OF_CHILDREN: 4
    };

    // Sort keys in here will have larger items sorted to the top/left of the tabbar
    this.ReverseKeys = {};
    //this.ReverseKeys["lastLoadedKey"] = true;
    //this.ReverseKeys["lastViewedKey"] = true;

    // Sort keys listed here should be converted to numbers before comparison
    this.NumericKeys = {};
    this.NumericKeys["createdKey"] = true;
    this.NumericKeys["lastLoadedKey"] = true;
    this.NumericKeys["lastViewedKey"] = true;

    /// Globals:
    this.__defineGetter__("lastSort", function __get_lastSort() {
        return _ss.getWindowValue(window, "lastSort"); // "" if unset
    });
    this.__defineSetter__("lastSort", function __set_lastSort(keyname) {
        _ss.setWindowValue(window, "lastSort", keyname);
        return keyname;
    });

    this.groupScheme = {};

    for (var g in this.Groupings) {
        this.groupScheme.__defineGetter__(g, function _getGroupEnabled() {
            var enabled = _ss.getWindowValue(window, g + "Grouped");
            return enabled !== "" ? enabled : self.groupScheme[g] = _prefs.getBoolPref("groupBy" + g[0].toUpperCase() + g.substring(1));
        });
        this.groupScheme.__defineSetter__(g, function _setGroupEnabled(enabled) {
            _ss.setWindowValue(window, g + "Grouped", enabled);
            _prefs.setBoolPref("groupBy" + g[0].toUpperCase() + g.substring(1), enabled);
            return enabled;
        });
    }
    
    this.__defineGetter__("openRelativePosition", function __get_openRelativePosition() {
        var position = _ss.getWindowValue(window, "openRelativePosition");
        if (position !== "")
            return Number(position);
        position = _prefs.getIntPref("openRelativePosition");
        _ss.setWindowValue(window, "openRelativePosition", position);
        return position;
    });
    this.__defineSetter__("openRelativePosition", function __set_openRelativePosition(position) {
        _ss.setWindowValue(window, "openRelativePosition", position);
        _prefs.setIntPref("openRelativePosition", position);
        return position;
    });

    /// Initialisation:
    this.initSortingAndGrouping = function _initSortingAndGrouping(event) {
        var colorTabNotLabel = _prefs.getIntPref("colorTabNotLabel");
        if (colorTabNotLabel != 0 && colorTabNotLabel != 1) {
            // Note: we deliberately recalculate this, in case the user switches theme
            var currentTheme = gPrefService.getCharPref("general.skins.selectedSkin");
            if (currentTheme == "classic/1.0") {
                var minAppVersion = Cc["@mozilla.org/extensions/manager;1"].
                                    getService(Ci.nsIExtensionManager).
                                    getItemForID("{972ce4c6-7e08-4474-a285-3208198ce6fd}").
                                    minAppVersion;
                var compatibleTheme = minAppVersion == "2.0" || minAppVersion == "3.0a1" // See https://addons.mozilla.org/faq.php for valid version strings
            }
            else {
                // TODO: test and add other themes, see list at http://en.design-noir.de/mozilla/aging-tabs
                compatibleTheme = false; //currentTheme == "..." || currentTheme == "..."
            }
            colorTabNotLabel = compatibleTheme ? 1 : 0;
        }
        if (colorTabNotLabel)
            _tabContainer.setAttribute("colortabnotlabel", "true");
        
        // Add event listeners:
        _tabContainer.addEventListener("TabOpen", self.sortgroup_onTabAdded, false);
        //self.addDelayedEventListener(_tabContainer, "TabOpen", self.sortgroup_onAfterTabAdded);
        _tabContainer.addEventListener("TabSelect", self.sortgroup_onTabSelect, false);
        gBrowser.addEventListener("DOMContentLoaded", self.sortgroup_onTabLoading, true);
        gBrowser.addEventListener("load", self.sortgroup_onTabLoaded, true);
        // This is called just before the tab starts loading its content, use SSTabRestored for once that's finished
        document.addEventListener("SSTabRestoring", self.sortgroup_onSSTabRestoring, false);
        _tabContainer.addEventListener("TabMove", self.sortgroup_onTabMoved, false);
        _tabContainer.addEventListener("TabClose", self.sortgroup_onTabRemoved, false);

        gBrowser.mStrip.addEventListener("dblclick", self.sortgroup_onDblclickTab, true);

        // Persist groups
        _ss.persistTabAttribute("groupid");
        // Persist sort attrs
        for each (var attr in self.Sorts) {
            if (self.endsWith(attr, "Key"))
                _ss.persistTabAttribute(attr);
        }
        // Persist group attrs
        for each (var attr in self.Groupings) {
            if (self.endsWith(attr, "Group"))
                _ss.persistTabAttribute(attr);
        }
        
        // Move Sorting and Grouping menu to the tab context menu (from the Tools menu)
        var tabContextMenu = gBrowser.mStrip.getElementsByAttribute("anonid", "tabContextMenu")[0];
	    tabContextMenu.insertBefore(document.getElementById("menu_tabkit-sortgroup"), tabContextMenu.childNodes[1]);
    };
    this.initListeners.push(this.initSortingAndGrouping);

    this.postInitSortingAndGrouping = function _postInitSortingAndGrouping(event) {
        self.sortgroup_onTabAdded({target: _tabs[0]});
    };
    this.postInitListeners.push(this.postInitSortingAndGrouping);

    /// More globals:
    this.nextType = null;
    this.nextParent = null;
    this.ignoreOvers = 0;
    this.addedTabs = [];
    
    /// Method Hooks:
    this.relatedTabSources = [
        'gotoHistoryIndex',
        'BrowserForward',
        'BrowserBack',
        'BrowserSearch.loadSearch',
        // And nsBrowserAccess.prototype.openURI if !isExternal
        'nsContextMenu.prototype.openLinkInTab',
        'nsContextMenu.prototype.openFrameInTab',
        'nsContextMenu.prototype.viewImage',
        'nsContextMenu.prototype.viewBGImage',
        'nsContextMenu.prototype.addDictionaries',
        'handleLinkClick'
        // And <menuitem id="menu_HelpPopup_reportPhishingtoolmenu">
    ];
    
    this.newTabSources = [
        'gBrowser.removeTab',
        'BrowserOpenTab', // Covers many cases
        'delayedOpenTab',
        'BrowserLoadURL',
        'middleMousePaste',
        'BrowserSearch.getSearchBar().doSearch' // TODO: won't work if searchbar is added after opening window (tough!)
    ];
    
    this.unrelatedTabSources = [
        'gBrowser.onDrop',
        // TODO: And extensions.js -> openURL
        'newTabButtonObserver.onDrop',
        'BrowserSearch.loadAddEngines',
        'openReleaseNotes'
    ];
    
    this.preInitSortingAndGroupingMethodHooks = function _preInitSortingAndGroupingMethodHooks(event) {
        // Process all simple related tab sources:
        for (var s in self.relatedTabSources) {
            self.wrapMethodCode(s, 'tabkit.addingTab("related");', 'tabkit.addingTabOver();');
        }
        
        // And a sometimes related, sometimes unrelated tab source:
        self.addMethodHook([
            'nsBrowserAccess.prototype.openURI',
            null,
            /var newTab =/,
            'tabkit.addingTab(isExternal ? "unrelated" : "related"); $&',
            /\}$/,
            'tabkit.addingTabOver(); }'
        ]);
        
        // And an attribute based related tab source:
        var reportPhishing = document.getElementById("menu_HelpPopup_reportPhishingtoolmenu");
        if (reportPhishing)
            reportPhishing.setAttribute("oncommand", 'tabkit.addingTab("related");' + reportPhishing.getAttribute("oncommand") + 'tabkit.addingTabOver();');
        
        // Process all simple new tab sources:
        for (var s in self.newTabSources) {
            self.wrapMethodCode(s, 'tabkit.addingTab("newtab");', 'tabkit.addingTabOver();');
        }
        
        // Process all simple unrelated tab sources:
        for (var s in self.unrelatedTabSources) {
            self.wrapMethodCode(s, 'tabkit.addingTab("unrelated");', 'tabkit.addingTabOver();');
        }
        
        // And an attribute based history tab source:
        var goMenu = document.getElementById("history-menu");
        if (!goMenu)
            goMenu = document.getElementById("go-menu");
        if (goMenu)
            goMenu.setAttribute("oncommand", 'tabkit.addingTab("history");' + reportPhishing.getAttribute("oncommand") + 'tabkit.addingTabOver();');
        
        // And another
        // TODO: document.getElementById("sidebar").contentDocument.getElementById("miOpenInNewTab") [set onload and onopensidebar]
        
        // And deal with tab groups
        this.wrapMethodCode(
            'gBrowser.loadTabs',
            'tabkit.addingTabs(aReplace ? gBrowser.selectedTab : null);',
            'tabkit.addingTabsOver();'
        );
    };
    this.preInitListeners.push(this.preInitSortingAndGroupingMethodHooks);
    
    this.addingTab = function _addingTab(type, parent) {
        if (self.nextType) {
            self.ignoreOvers++; // TODO: unset after timeout?
            return;
        }
        
        self.nextType = type;
        self.nextParent = parent != undefined ? parent : gBrowser.selectedTab;
    };
    
    this.addingTabOver = function _addingTabOver() {
        if (self.ignoreOvers > 0) {
            self.ignoreOvers--;
            return;
        }
        
        if (self.addedTabs.length == 1) {
            var type = self.nextType;
            var parent = self.nextParent;
            var tab = self.addedTabs.pop();
            
            var tabNeedsPlacing = true;
            
            if (type == "newtab" && _prefs.getBoolPref("newTabsAreRelated"))
                type = "related";
            
            if (type == "history" && _prefs.getBoolPref("historyTabsAreRelated"))
                type = "related";
            
            // Group tab, if applicable
            if (type == "related") {
                self.addToGroupOf(tab, parent, "origin");
                
                // Insert it into the subtree (will move it if applicable)
                switch (self.openRelativePosition) {
                case self.RelativePositions.LEFT:
                    self.subTreeInsertBefore(tab, parent);
                    break;
                case self.RelativePositions.RIGHT:
                    self.subTreeInsertAfter(tab, parent);
                    break;
                case self.RelativePositions.RIGHT_OF_RECENT:
                    self.subTreeInsertAfterRecent(tab, parent);
                    break;
                case self.RelativePositions.RIGHT_OF_CHILDREN:
                    self.subTreeInsertAfterChildren(tab, parent);
                }
                
                if (self.groupScheme.origin && _prefs.getBoolPref("originOverridesSortOrder"))
                    tabNeedsPlacing = false;
            }
            
            // TODO: Allow tab to be sorted by "new tabs to right of current"
            
            // Sort tab, if not already positioned
            if (tabNeedsPlacing) {
                //insertTabBy...(tab);//TODO:URGENT
            }
        }
        else if (self.addedTabs.length > 1) { // Shouldn't happen
            self.addingTabsOver();
            return;
        }
        
        self.nextType = null;
        self.nextParent = null;
    };
    
    this.addingTabs = function _addingTabs(firstTab) {
        if (self.nextType) { // Unlikely
            self.ignoreOvers++; // TODO: unset after timeout?
            return;
        }
        
        if (firstTab) {
            self.addedTabs.push(firstTab);
            self.nextType = "loadOneOrMoreURIs";
        }
        else {
            self.nextType = "loadTabs";
        }
        
    };
    
    this.addingTabsOver = function _addingTabsOver() {
        if (self.ignoreOvers > 0) {
            self.ignoreOvers--;
            return;
        }
        
        // TODO: position group appropriately
        
        self.nextType = null;
        self.addedTabs.length = 0;
    };

    /// Event Handlers:
    this.sortgroup_onTabAdded = function _sortgroup_onTabAdded(event) {
        var tab = event.target;
        
        // Set keys
        tab.setAttribute(self.Sorts.created, Date.now());
        tab.setAttribute(self.Sorts.lastViewed, new Date().setYear(2030)); // Set never viewed tabs as viewed in the future!
        tab.setAttribute(self.Sorts.lastLoaded, new Date().setYear(2030)); // Set never loaded tabs as loaded in the future!
        self.setTabUriKey(tab);
        
        // Sort/group
        if (self.nextType) {
            self.addedTabs.push(tab);
        }
        else { // Shouldn't happen
            self.addedTabs = [tab];
            self.addingTabOver();
        }
    };

    /*this.sortgroup_onAfterTabAdded = function _sortgroup_onAfterTabAdded(event) {
        // We can now detect whether the tab was selected immediately after being opened
        var foreground = _tabContainer.selectedItem == event.target;
        
        //self.positionTab(event.target, foreground); // TODO
    };*/

    this.sortgroup_onTabSelect = function _sortgroup_onTabSelect(event) {
        event.target.setAttribute(self.Sorts.lastViewed, Date.now());
        
        self.recentChildren = 0; // Arguably should only apply if select outside of the last parent's children
    };

    this.sortgroup_onTabLoading = function _sortgroup_onTabLoading(event) {
        try {
            var index = gBrowser.getBrowserIndexForDocument(event.originalTarget);
            var tab = _tabs[index];
            self.setTabUriKey(tab);
        }
        catch (ex) {
            // Maybe there was a frameset or something, in which case we didn't need to update stuff anyway...
        }
    };

    this.sortgroup_onTabLoaded = function _sortgroup_onTabLoaded(event) {
        try {
            if (event.originalTarget.nodeName == "#document") { // Ignore image loads (especially favicons!)
                var index = gBrowser.getBrowserIndexForDocument(event.originalTarget);
                var tab = _tabs[index];
                tab.setAttribute(self.Sorts.lastLoaded, Date.now());
            }
        }
        catch (ex) {
            // Maybe there was a frameset or something...
        }
    };

    this.sortgroup_onSSTabRestoring = function _sortgroup_onSSTabRestoring(event) {
        var tab = event.originalTarget;

        self.insertNewTabBySortOrder(tab);
        
        if (tab.hasAttribute("groupid"))
            self.colorizeTab(tab); // Maintain tab color
    };
    
    this.sortgroup_onTabMoved = function _sortgroup_onTabMoved(event) {
        var tab = event.target;
        
        if (tab.hasAttribute("groupid"))
            self.colorizeTab(tab); // Maintain/update tab color
    };
    
    /* [Close Order]
     * 0 (auto):    Go right unless that would involve going down a level or leaving the group [right->left depending on tab order settings]
     * 1 (g-left):  Go left unless that would involve leaving the group
     * 2 (g-right): Go right unless that would involve leaving the group
     * 3 (left):    Go left
     * 4 (right):   Go right
     */
    this.sortgroup_onTabRemoved = function _sortgroup_onTabRemoved(event) {
        var tab = event.target;
        
        // Choose next tab
        if (tab.selected && tab.previousSibling && tab.nextSibling && _prefs.getBoolPref("tweakCloseOrder")) {
            var gid = tab.getAttribute("groupid");
            var nextTab;
            
            switch (_prefs.getIntPref("customCloseOrder")) {
            case 1: // Auto
                var subtree = self.groupScheme.origin ? self.getSubtree(tab) : [tab];
                if (subtree.length > 1) {
                    var index = subtree.indexOf(tab);
                    if (index == 0)
                        nextTab = tab.nextSibling; // Stay within the subtree
                    else if (index == subtree.length - 1)
                        nextTab = tab.previousSibling; // Stay within the subtree
                    else if (Number(tab.nextSibling.getAttribute("subtreelevel")) < Number(tab.getAttribute("subtreelevel")))//TODO:URGENT
                        nextTab = tab.previousSibling;
                    else
                        nextTab = tab.nextSibling;
                }
                else if (tab.nextSibling.getAttribute("groupid") != gid && tab.previousSibling.getAttribute("groupid") == gid)
                    nextTab = tab.previousSibling;
                else
                    nextTab = nextSibling;
                break;
            case 2: // G-Left
                if (tab.previousSibling.getAttribute("groupid") != gid && tab.nextSibling.getAttribute("groupid") == gid)
                    nextTab = tab.nextSibling;
                else
                    nextTab = tab.previousSibling;
                break;
            case 3: // G-Right
                if (tab.nextSibling.getAttribute("groupid") != gid && tab.previousSibling.getAttribute("groupid") == gid)
                    nextTab = tab.previousSibling;
                else
                    nextTab = nextSibling;
                break;
            case 4: // Left
                nextTab = tab.previousSibling;
                break;
            case 5: // Right
                nextTab = tab.nextSibling;
                break;
            default:
                return;
            }
            
            gBrowser.selectedTab = nextTab;
        }
        
        // Move tab's children down a level
        var stid = tab.getAttribute("subtreeid")
        if (stid) {
            var subtree = self.getSubtree(tab);
            var i = subtree.indexOf(tab) + 1;
            var level = Number(tab.getAttribute("subtreelevel"));
            while (i < subtree.length && subtree[i].getAttribute("subtreeid") == stid && Number(subtree[i].getAttribute("subtreelevel")) > level) {
                subtree[i].setAttribute("subtreelevel", Number(subtree[i].getAttribute("subtreelevel")) - 1);
                i++;
            }
        }
        
        // Keep recentChildren in sync (for originGroup subTrees)
        if (_tabContainer.selectedIndex < tab._tPos && _tabContainer.selectedIndex + self.recentChildren + 1 > tab._tPos) {
            self.recentChildren--;
        }
    }

    this.sortgroup_onDblclickTab = function _sortgroup_onDblclickTab(event) {
        var tab = event.originalTarget;
        if (tab.localName == "tab") {

        }
    };

    /// Methods Called From Menus
    this.toggleGroupByDomain = function _toggleGroupByDomain() {
        if (self.groupScheme.uri) {
            self.groupScheme.uri = false;
        }
        else {
            self.groupScheme.uri = true;
            self.groupTabsBy("uri");
            self.sortTabs("uri");
        }
    };
	this.toggleGroupByOrigin = function _toggleGroupByOrigin() {
        if (self.groupScheme.origin) {
            self.groupScheme.origin = false;
        }
        else {
            self.groupScheme.uri = true;
            self.groupTabsBy("origin");
            // TODO: move (and internally sort?) each origin group to the location of its parent node
        }
    };
    
	this.ungroupAll() {
        if (self.groupScheme.uri)
            self.toggleGroupByDomain();
        if (self.groupScheme.origin)
            self.toggleGroupByOrigin();
        
        for each (var tab in _tabs) {
            tab.removeAttribute("groupid");
            // TODO: explicitly remove manual groupings (depending on implementation)?
            colorizeTab(tab);
        }
    };
    //TODO:URGENT
	this.sortByUri() {
        self.sortTabs("uri");
    };
	this.sortByLastLoaded() {
        self.sortTabs("lastLoaded");
    };
	this.sortByLastViewed() {
        self.sortTabs("lastViewed");
    };
	this.sortByCreation() {
        self.sortTabs("created");
    };
	this.sortByTitle() {
        self.sortTabs("title");
    };
    
    // Use gBrowser.mContextTab if the right-clicked tab is relevant
    
    /// Private Methods:
    var _seed = 0; // Used to generate ids
    this.generateId = function _generateId() {
        return String(Date.now()) + String(_seed++);
    }

    /// Utility Methods:
    /* To sort domains:
     *
     * A simplistic approach is to sort by
     * domain.split(".").reverse().join("."), i.e. splitting the domain
     * up at the dots and sorting by the last part, then if these are
     * equal sorting by the part to the left, etc.
     *
     * This is a good first try, however sites which have multiple tlds,
     * e.g. google.com and google.co.uk, will have their domains spread
     * far apart, which spoils hopes of domains being grouped in
     * alphabetical order.
     *
     * So we need to treat the main part of the domain, e.g.
     * "google.com", as one entity. However how do we extract the main
     * part of the domain, when sometimes they end in a tld (e.g. .com,
     * .fr) but sometimes in a second level domain (e.g. .co.uk, .web.za)?
     *
     * Rather than match against a mammoth list of these things, I've
     * compiled a list of tlds which almost exclusively give out third
     * level domains (i.e. domain.ext.cc), and assume that anything
     * ending in one of these 'cc's will have an 'ext' as well (unless
     * there's only one dot).
     *
     * This will be accurate 99% of the time, though there will be
     * exceptions, such as the ccTLDs I left off this list, for example
     * .sy, because although forms like .gov.sy and .org.sy are common,
     * many domains also just end in .sy
     */
    this.setTabUriKey = function _setTabUriKey(aTab) {
        var uri = aTab.linkedBrowser.currentURI;
        if (!uri) return;
        var parts = /^(.*\.)?(([^.]+)\.[^.]{2,8}\.(?:a[ru]|c[kory]|do|eg|fj|gu|i[dl]|k[hr]|lb|m[moty]|n[ipz]|p[aey]|sv|t[hr]|u[gky]|ve|yu|za))$|^(.*\.)?(([^.]+)\.[^.0-9]{2,})$|^(.*)$/i.exec(uri.asciiHost);
        /* // Explanation of parts:
        parts.index => The 0-based index of the match in the string, e.g. 0
        parts.input => The original string, e.g. "www.google.co.uk"
        parts[0] => The last matched characters, e.g. "www.google.co.uk"
        // Parenthesized substrings:
        parts[1] => subdomain (4th+ level), e.g. "www"
        parts[2] => domain (3rd level), e.g. "google.co.uk"
        parts[3] => site name (3rd level), e.g. "google"
        parts[4] => subdomain (3rd+ level), e.g. "www"
        parts[5] => domain (2nd level), e.g. "google.com"
        parts[6] => site name (2rd level), e.g. "google"
        parts[7] => hostname, e.g. "localhost" or "192.0.34.166"
        */
        var key = parts[2] ? (parts[1] ? parts[2] + parts[1].split(".").reverse().join(".")
                                       : parts[2])
                           : parts[5] ? (parts[4] ? parts[5] + parts[4].split(".").reverse().join(".")
                                                  : parts[5])
                                      : parts[7];
        /* // i.e.:
        var key;
        if (parts[2]) {
            if (parts[1]) {
                key = parts[2] + parts[1].split(".").reverse().join(".");
            }
            else {
                key = parts[2];
            }
        }
        else {
            if (parts[5]) {
                if (parts[4]) {
                    key = parts[5] + parts[4].split(".").reverse().join(".");
                }
                else {
                    key = parts[5];
                }
            }
            else {
                key = parts[7];
            }
        }
        */

        // TODO: make "about:blank" go to the end
        var uriKey = key + "/" + uri.scheme + uri.path;
        var uriGroup = parts[3] ? parts [3]
                                : parts[6] ? parts[6]
                                           : parts[7] ? parts[7]
                                                      : uri.asciiSpec.replace(/^[^:]*\:(?:\/\/)?([^\/]+).*$/, "$1");
        aTab.setAttribute(self.Sorts.uri, uriKey);
        aTab.setAttribute(self.Groupings.uri, uriGroup);
    };

    this.getGroup = function _getGroup(tab) {
        var gid = tab.getAttribute("groupid");
        var group = [];
        for (var i = 0; i < _tabs.length; i++) {
            var t = _tabs[i];
            if (t.getAttribute("groupid") == gid)
                group.push(t);
        }
        return group;
    };

    this.getAllGroups = function _getAllGroups() {
        var groups = {};
        for (var i = 0; i < _tabs.length; i++) {
            var t = _tabs[i];
            var gid = t.getAttribute("groupid");
            if (!gid)
                continue;
            if (gid in groups)
                groups[gid].push(t);
            else
                groups[gid] = [t];
        }
    };

    this.colorizeTab = function _colorizeTab(tab) {
        // TODO: remember to set groupid based on domain names where applicable
        if (tab.hasAttribute("groupid")) {
            var hue = self.hash(tab.getAttribute("groupid")) % 360;
            var bgColor = "hsl(" + hue + ", 100%, 75%)"; // TODO: allow customizeable sat and lum
        }
        else {
            bgColor = "";
        }
        
        // TODO: Could color Mac tabs (amongst others) using canvas, see ChromaTabs
        // Background colors are reset on tab move (and close then restore), hence the listeners
        if (_tabContainer.hasAttribute("colortabnotlabel")) // This is set at the start of initSortingAndGrouping
            var nodes = tab.ownerDocument.getAnonymousNodes(tab);
        else
            var nodes = [ tab.ownerDocument.getAnonymousElementByAttribute(tab, "class", "tab-text") ];
        
        for each (var node in nodes) {
            node.style.backgroundColor = bgColor;
        }
    };

    // Sets colors and attributes but doesn't move tabs
    this.addToGroupOf = function _addToGroupOf(tab, grouptab, grouping,  newid) { // grouping is required, newid isn't
        if (grouptab.hasAttribute(self.Groupings[grouping])) {
            newid = grouptab.getAttribute(self.Groupings[grouping])
            tab.setAttribute(self.Groupings[grouping], newid);
            
            if (self.groupScheme[grouping]) {
                if (grouptab.hasAttribute("groupid")) {
                    tab.setAttribute("groupid", grouptab.getAttribute("groupid"));
                }
                else {
                    grouptab.setAttribute("groupid", newid);
                    tab.setAttribute("groupid", newid);
                    colorizeTab(grouptab);
                }
                colorizeTab(tab);
            }
        }
        else {
            if (!newid)
                newid = self.generateId();
            grouptab.setAttribute(self.Groupings[grouping], newid);
            tab.setAttribute(self.Groupings[grouping], newid);
            
            if (self.groupScheme[grouping]) {
                if (grouptab.hasAttribute("groupid")) { // It might be grouped by a different grouping - in which case add it to that group...
                    tab.setAttribute("groupid", grouptab.getAttribute("groupid"));
                }
                else {
                    grouptab.setAttribute("groupid", newid);
                    tab.setAttribute("groupid", newid);
                    colorizeTab(grouptab);
                }
                colorizeTab(tab);
            }
        }
    };
    
    this.groupTogether = function _groupTogether(tabs,  grouping, id) { // grouping defaults to "manual", id is optional
        if (tabs.length < 2)
            return;
        
        if (!grouping)
            grouping = "manual"; // TODO: is this a good idea?
        
        for (i = 1; i < tabs.length; i++) {
            self.addToGroupOf(tabs[i], tabs[i - 1], grouping, id);
        }
    };
    
    this.getSubtree = function _getSubtree(tab) {
        var stid = tab.getAttribute("subtreeid");
        if (!stid)
            return [tab];
        
        var subtree = [];
        for (var i = 0; i < _tabs.length; i++) {
            var t = _tabs[i];
            if (t.getAttribute("subtreeid") == stid)
                subtree.push(t);
        }
        
        subtree.sort(function(a, b) {
            return Number(a.getAttribute("subtreeindex")) - Number(b.getAttribute("subtreeindex"));
        });
        
        return subtree;
    };

    this.setSubtree = function _setSubtree(subtree, stid) {
        if (!stid)
            stid = self.generateId();

        for (var i = 0; i < subtree.length; i++) {
            var t = subtree[i];
            t.setAttribute("subtreeid", stid);
            t.setAttribute("subtreeindex", i); // TODO: preserve indices where possible to aid undo close tab - but first tab must always be 0
        }
    };
    
    this.subTreeInsertBefore = function _subTreeInsertBefore(tab, parent) {
        var stid = parent.getAttribute("subtreeid");
        
        var level = stid ? parent.getAttribute("subtreelevel") : "";
        if (level == "") {
            parent.setAttribute("subtreelevel", 0);
            tab.setAttribute("subtreelevel", 1);
        }
        else {
            tab.setAttribute("subtreelevel", Number(level) + 1);
        }
        
        var subtree = self.getSubtree(parent); // Fine if parent isn't in a subtree yet
        subtree.splice(subtree.indexOf(parent), 0, tab);
        self.setSubtree(subtree, stid); // Will generate an id if !stid
        
        if (self.groupScheme.origin && _prefs.getBoolPref("originOverridesSortOrder")) {
            self.moveBefore(tab, parent);
        }
    };
    
    this.subTreeInsertAfter = function _subTreeInsertAfter(tab, parent) {
        var stid = parent.getAttribute("subtreeid");
        
        var level = stid ? parent.getAttribute("subtreelevel") : "";
        if (level == "") {
            parent.setAttribute("subtreelevel", 0);
            tab.setAttribute("subtreelevel", 1);
        }
        else {
            tab.setAttribute("subtreelevel", Number(level) + 1);
        }
        
        var subtree = self.getSubtree(parent); // Fine if parent isn't in a subtree yet
        subtree.splice(subtree.indexOf(parent) + 1, 0, tab);
        self.setSubtree(subtree, stid); // Will generate an id if !stid
        
        if (self.groupScheme.origin && _prefs.getBoolPref("originOverridesSortOrder")) {
            self.moveAfter(tab, parent);
        }
    };
    
    this.recentChildren = 0;
    
    this.subTreeInsertAfterRecent = function _subTreeInsertAfterRecent(tab, parent) {
        var stid = parent.getAttribute("subtreeid");
        
        var level = stid ? parent.getAttribute("subtreelevel") : "";
        if (level == "") {
            parent.setAttribute("subtreelevel", 0);
            tab.setAttribute("subtreelevel", 1);
        }
        else {
            level = Number(level);
            tab.setAttribute("subtreelevel", level + 1);
        }
        
        var subtree = self.getSubtree(parent); // Fine if parent isn't in a subtree yet
        var firstIndex = subtree.indexOf(parent) + 1;
        var index = firstIndex;
        if (level != "") {
            while (index < subtree.length && (index - self.firstIndex) < self.recentChildren && level < Number(subtree[index].getAttribute(level))) {
                index++;
            }
        }
        subtree.splice(index, 0, tab);
        self.setSubtree(subtree, stid); // Will generate an id if !stid
        
        if (self.groupScheme.origin && _prefs.getBoolPref("originOverridesSortOrder")) {
            self.moveAfter(tab, subtree[index - 1]);
        }
    };
    
    this.subTreeInsertAfterChildren = function _subTreeInsertAfterChildren(tab, parent) {
        var stid = parent.getAttribute("subtreeid");
        
        var level = stid ? parent.getAttribute("subtreelevel") : "";
        if (level == "") {
            parent.setAttribute("subtreelevel", 0);
            tab.setAttribute("subtreelevel", 1);
        }
        else {
            level = Number(level);
            tab.setAttribute("subtreelevel", level + 1);
        }
        
        var subtree = self.getSubtree(parent); // Fine if parent isn't in a subtree yet
        var index = subtree.indexOf(parent) + 1;
        if (level != "") {
            while (index < subtree.length && level < Number(subtree[index].getAttribute(level))) {
                index++;
            }
        }
        subtree.splice(index, 0, tab);
        self.setSubtree(subtree, stid); // Will generate an id if !stid
        
        if (self.groupScheme.origin && _prefs.getBoolPref("originOverridesSortOrder")) {
            self.moveAfter(tab, subtree[index - 1]);
        }
    };

    /// Public Methods:
    this.clearGroups = function _clearGroups(andSubtrees) {
        for (var i = 0; i < _tabs.length; i++) {
            if (_tabs[i].hasAttribute("groupid") && (andSubtrees || !_tabs[i].hasAttribute("subtreeid"))) {
                _tabs[i].removeAttribute("groupid");
                _tabs[i].removeAttribute("subtreeid");
            }
        }
    };

    this.sortTabs = function _sortTabs(keyname) {//TODO:URGENT
        if (keyname === undefined) {
            keyname = self.lastSort; // TODO: careful!
        }
        else if (keyname != self.lastSort) {
            self.lastSort = keyname;
            if (keyname != self.groupScheme)
                self.groupScheme = "NONE";
        }

        if (keyname == "NONE")
            return;

        var isNumeric = (keyname in self.NumericKeys);
        var isReverse = (keyname in self.ReverseKeys);

        var attr = self.Sorts[keyname];

        // Presort groups and calculate medians
        var groups = self.getAllGroups();
        for (var gid in groups) {
            var g = groups[gid];

            // Sort group (by insertion sort)
            for (var i = 0; i < g.length; i++) { // i = 0 is just to set g[0].key
                var gi = g[i];
                gi.key = isNumeric ? Number(gi.getAttribute(attr)) : gi.getAttribute(attr);

                var j;
                for (j = i - 1; j >= 0; j--) {
                    if (isReverse ? g[j].key >= gi.key : g[j].key <= gi.key)
                        break;
                    g[j + 1] = g[j];
                }
                g[j + 1] = gi;
            }

            // Set keys to median
            var median = g[ Math.ceil(g.length / 2) - 1 ].key;
            for (var k = 0; k < g.length; k++)
                g[k].key = median;
        }

        // Now sort all tabs/groups (by insertion sort)
        for (var i = 0; i < _tabs.length; i++) {
            var ti = _tabs[i];
            var tig = ti.getAttribute("groupid");
            if (!tig)
                ti.key = isNumeric ? Number(ti.getAttribute(attr)) : ti.getAttribute(attr);

            var j;
            for (j = i - 1; j >= 0; j--) {
                if (isReverse ? _tabs[j].key >= ti.key : _tabs[j].key <= ti.key)
                    break;
            }

            if (!tig) {
                gBrowser.moveTabTo(ti, j + 1);
            }
            else {
                var g = groups[tig];
                for (var k = 0; k < g.length; k++)
                    gBrowser.moveTabTo(g[k], j + k + 1);
                i += g.length - 1;
            }
        }
    };

    this.groupTabs = function _groupTabs(keyname) {//TODO:URGENT
        if (keyname === undefined) {
            keyname = self.groupScheme;
        }
        else if (keyname != self.groupScheme) {
            self.groupScheme = keyname;
            if (keyname != "NONE" && keyname != self.lastSort)
                self.lastSort = keyname;
        }

        if (keyname == "NONE")
            return;

        // Set groupid attributes
        var attr = self.Groupings[keyname];
        for (var i = 0; i < _tabs.length; i++)
            if (_tabs[i].hasAttribute(attr))
                _tabs[i].setAttribute("groupid", _tabs[i].getAttribute(attr));

        // Sort tabs into groups
        if (self.lastSort != keyname)
            self.lastSort = keyname;
        self.sortTabs();
    };

    /* Binary insertion sort:
     * Probably the easiest way to do a stable sort given how moveTabTo works,
     * and reasonably efficient even for a couple of hundred tabs...
     */
    /*this.sortTabsBy = function _sortTabsBy(keyname) {
        self.lastSort = keyname;
        if (keyname == self.SortOrders.NONE) return;

        var numericSort = (keyname in self.NumericKeys);
        var reverseSort = (keyname in self.ReverseKeys);

        for (var i = 1; i < _tabs.length; i++) {
            var tab = _tabs[i];
            var tabKey = tab.getAttribute(keyname);
            if (numericSort && tabKey !== "") tabKey = Number(tabKey);

            var left = 0;
            var right = i;
            while (left < right) {
                var middle = Math.floor((left + right) / 2);

                if (tabKey === "") {
                    var comparison = true; // Whether or not middleKey is also "" (and this is independent of sort order, so reverseSort doesn't apply)
                }
                else {
                    var middleKey = _tabs[middle].getAttribute(keyname);
                    if (middleKey === "") {
                        var comparison = false;
                    }
                    else {
                        if (numericSort) middleKey = Number(middleKey);
                        var comparison = reverseSort ? tabKey <= middleKey : tabKey >= middleKey;
                    }
                }

                if (comparison) {
                    left = middle + 1;
                }
                else {
                    right = middle;
                }
            }

            gBrowser.moveTabTo(tab, left);
        }
    };*/

    // Assumes that the tab was added at the far right // TODO: remove assumption!
    this.insertNewTabBySortOrder = function _insertNewTabBySortOrder(aTab) {//TODO:URGENT
        self.dump("FIXME!");return;//TODO: FIX!
        var keyname = self.lastSort;
        if (keyname == self.SortOrders.NONE)
            return;

        var left = 0;
        var right = aTab._tPos;
        while (left < right) {
            var middle = Math.floor((left + right) / 2);
            if (tab[keyname] >= _tabs[middle][keyname]) {
                left = middle + 1;
            }
            else {
                right = middle;
            }
        }

        gBrowser.moveTabTo(tab, left);
    };

    //}##########################
    //{>>> Tab Bar position
    //|##########################

    /// Enums:
    this.Positions = {
        TOP: 0,
        LEFT: 1, // TODO: Fix tab dragging (including jitter when dragging to edges!)
        RIGHT: 2,
        BOTTOM: 3
    };

    /// Initialisation:
    this.initTabbarPosition = function _initTabbarPosition(event) {
        self.moveSidebar();
        self.addPrefListener("sidebarPosition", self.moveSidebar);
        self.moveTabbar();
        self.addPrefListener("tabbarPosition", self.moveTabbar);

        _tabContainer.addEventListener("TabSelect", self.positionedTabbar_onTabSelect, false);
        _tabContainer.addEventListener("TabMove", self.positionedTabbar_onTabSelect, false); // In case a tab is moved out of sight
    };
    this.initListeners.push(this.initTabbarPosition);

    /// Event listener:
    this.positionedTabbar_onTabSelect = function _positionedTabbar_onTabSelect(event) {
        if (gBrowser.hasAttribute("vertitabbar")) {
            var tab = gBrowser.selectedTab;

            self.scrollToElement(_tabInnerBox, tab); // TODO: fix scrolling (e.g. try selecting bottom tab then selecting the tab two above...)

            // Tabs on different rows shouldn't get before/afterselected attributes
            if (tab.previousSibling != null) {
                tab.previousSibling.removeAttribute("beforeselected");
            }
            if (tab.nextSibling != null) {
                tab.nextSibling.removeAttribute("afterselected");
            }
        }
    };

    /// Methods:
    this.moveSidebar = function _moveSidebar(pos) {
        if (typeof pos != "number") pos = _prefs.getIntPref("sidebarPosition");

        // Calculate new orient attributes
        var flipOrient = (pos == self.Positions.TOP || pos == self.Positions.BOTTOM);
        var fromHorizontal = flipOrient ? "vertical" : "horizontal";
        var fromVertical = flipOrient ? "horizontal" : "vertical";

        // Calculate new direction attribute
        var flipDirection = (pos == self.Positions.RIGHT || pos == self.Positions.BOTTOM);
        var fromNormal = flipDirection ? "reverse" : "normal";

        // Get some nodes
        var browser = document.getElementById("browser");
        var sidebarBox = document.getElementById("sidebar-box");
        var sidebarHeader = sidebarBox.getElementsByTagName("sidebarheader")[0];
        var normallyHorizontal = [
            browser,
            document.getElementById("sidebar-splitter"),
            sidebarHeader
        ];
        var normallyVertical = [
            sidebarBox,
            document.getElementById("appcontent")
        ];
        var normallyNormal = [
            browser,
            sidebarHeader
        ];

        // Set new attributes
        for each (var node in normallyNormal) node.setAttribute("dir", fromNormal);
        sidebarHeader.setAttribute("pack", flipOrient ? "end" : "start");

        // Set orient attributes last or stuff messes up
        for each (var node in normallyHorizontal) node.setAttribute("orient", fromHorizontal);
        for each (var node in normallyVertical) node.setAttribute("orient", fromVertical);

        // Now activate our css
        gBrowser.removeAttribute("horizsidebar");
        gBrowser.removeAttribute("vertisidebar");
        browser.setAttribute(fromVertical.substring(0, 5) + "sidebar", fromNormal);
    }

    this.moveTabbar = function _moveTabbarTo(pos) {
        if (typeof pos != "number") pos = _prefs.getIntPref("tabbarPosition");

        // Calculate new orient attributes
        var flipOrient = (pos == self.Positions.LEFT || pos == self.Positions.RIGHT);
        var fromHorizontal = flipOrient ? "vertical" : "horizontal";
        var fromVertical = flipOrient ? "horizontal" : "vertical";

        // Calculate new direction attribute
        var flipDirection = (pos == self.Positions.RIGHT || pos == self.Positions.BOTTOM);
        var fromNormal = flipDirection ? "reverse" : "normal";

        // Get some nodes
        var tabBox = gBrowser.mTabBox;
        var tabsStack = document.getAnonymousElementByAttribute(_tabContainer, "class", "tabs-stack");
        var tabVbox = tabsStack.getElementsByTagName("vbox")[1];
        var normallyHorizontal = [
            gBrowser,
            gBrowser.mStrip,
            _tabContainer,
            tabsStack,
            tabVbox.getElementsByTagName("hbox")[0],
            _tabstrip,
            _tabstrip._scrollbox,
            _tabInnerBox,
            tabBox.getElementsByTagName("tabpanels")[0]
        ];
        var normallyVertical = [
            tabBox,
            tabVbox
        ];
        var normallyNormal = [
            tabBox
        ];

        // Set new attributes
        for each (var node in normallyNormal) node.setAttribute("dir", fromNormal);
        //_tabInnerBox.setAttribute("pack", flipOrient ? "start" : "end");//mine
        //_tabContainer.setAttribute("align", flipOrient ? "start" : "stretch");
        //_tabInnerBox.setAttribute("align", flipOrient ? "stretch" : "start");
        _tabContainer.mAllTabsButton.parentNode.setAttribute("pack", flipOrient ? "end" : "start"); // TODO: Make All Tabs Button prettier!

        // Set orient attributes last or stuff messes up
        for each (var node in normallyHorizontal) node.setAttribute("orient", fromHorizontal);
        for each (var node in normallyVertical) node.setAttribute("orient", fromVertical);

        // Now activate our css
        gBrowser.removeAttribute("horiztabbar");
        gBrowser.removeAttribute("vertitabbar");
        gBrowser.setAttribute(fromHorizontal.substring(0, 5) + "tabbar", fromNormal);
    }

    //}##########################
    //{>>> Multi-row tabs
    //|##########################

    /// Initialisation:
    this.initMultiRowTabs = function _initMultiRowTabs(event) {
        self.updateMultiRowTabs("tabRows");
        self.addPrefListener("tabRows", self.updateMultiRowTabs);
        self.addPrefListener("tabbarPosition", self.updateMultiRowTabs);
        _tabContainer.addEventListener("TabOpen", self.updateMultiRowTabs, false);
        _tabContainer.addEventListener("TabClose", self.updateMultiRowTabs, false);
        window.addEventListener("resize", self.updateMultiRowTabs, false);

        _tabContainer.addEventListener("TabSelect", self.multiRow_onTabSelect, false);
        _tabContainer.addEventListener("TabMove", self.multiRow_onTabSelect, false); // In case a tab is moved out of sight
    };
    this.initListeners.push(this.initMultiRowTabs);

    /// Event Listeners:
    this.updateMultiRowTabs = function _updateMultiRowTabs(arg) {
        var tabbarPosition = _prefs.getIntPref("tabbarPosition");
        if ((tabbarPosition == self.Positions.TOP || tabbarPosition == self.Positions.BOTTOM) && _prefs.getIntPref("tabRows") > 1) {
            if (!gBrowser.getStripVisibility()) {
                var rows = 0;
            }
            else {
                var availWidth = _tabstrip._scrollbox.boxObject.width;
                var tabsPerRow = Math.floor(availWidth / gPrefService.getIntPref("browser.tabs.tabMinWidth"));
                var rows = Math.ceil(_tabs.length / tabsPerRow);
            }
            if (rows > 1) {
                // Enable multi-row tabs
                if (_tabContainer.getAttribute("multirow") != "true") {
                    _tabContainer.setAttribute("multirow", "true");
                    _tabstrip._scrollBoxObject.scrollTo(0,0);
                }

                var maxRows = _prefs.getIntPref("tabRows");
                if (rows > maxRows) {
                    _tabContainer.setAttribute("multirowscroll", "true");

                    _tabstrip.style.setProperty("min-height", 24 * maxRows + "px", "important");
                    _tabstrip.style.setProperty("max-height", 24 * maxRows + "px", "important");

                    self.multiRow_onTabSelect(null); // Check if we need to scroll already

                    try {
                        _tabInnerBox.mVerticalScrollbar.removeEventListener("DOMAttrModified", self.preventChangeOfAttributes, true);
                    }
                    catch (ex) {
                        // It wasn't set...
                    }
                    _tabInnerBox.mVerticalScrollbar.setAttribute("increment", 24);
                    _tabInnerBox.mVerticalScrollbar.setAttribute("pageincrement", 48);
                    _tabInnerBox.mVerticalScrollbar.addEventListener("DOMAttrModified", self.preventChangeOfAttributes, true);

                    availWidth -= _tabInnerBox.mVerticalScrollbar.boxObject.width;
                }
                else {
                    _tabContainer.removeAttribute("multirowscroll");

                    _tabstrip.style.setProperty("min-height", 24 * rows + "px", "important");
                    _tabstrip.style.setProperty("max-height", 24 * rows + "px", "important");
                }

                self.setTabMinWidth(availWidth / tabsPerRow);
            }
            else {
                // Disable multi-row tabs
                self.resetTabMinWidth();

                var needsScrolling = (_tabContainer.getAttribute("multirow") == "true");
                _tabContainer.setAttribute("multirow", "false");

                if (needsScrolling) {
                    if (gBrowser.mCurrentTab.nextSibling && _prefs.getBoolPref("scrollOneExtra")) {
                        _tabstrip._scrollBoxObject.ensureElementIsVisible(gBrowser.mCurrentTab.nextSibling);
                    }
                    _tabstrip._scrollBoxObject.ensureElementIsVisible(gBrowser.mCurrentTab);
                }

                _tabstrip.style.removeProperty("min-height");
                _tabstrip.style.removeProperty("max-height");
            }
        }
        else {
            // Turn off multi-row tabs
            self.resetTabMinWidth();

            var needsScrolling = (_tabContainer.getAttribute("multirow") == "true");
            _tabContainer.removeAttribute("multirow");

            if (needsScrolling) {
                if (gBrowser.mCurrentTab.nextSibling && _prefs.getBoolPref("scrollOneExtra")) {
                    _tabstrip._scrollBoxObject.ensureElementIsVisible(gBrowser.mCurrentTab.nextSibling);
                }
                _tabstrip._scrollBoxObject.ensureElementIsVisible(gBrowser.mCurrentTab);
            }

            _tabstrip.style.removeProperty("min-height");
            _tabstrip.style.removeProperty("max-height");
        }
    };

    this.preventChangeOfAttributes = function _preventChangeOfIncrement(event) {
        if (event.attrName == "increment") {
            //event.preventDefault(); // does not work for this event...
            _tabInnerBox.mVerticalScrollbar.setAttribute("increment", 24);
            event.stopPropagation();
        }
        else if (event.attrName == "pageincrement") {
            _tabInnerBox.mVerticalScrollbar.setAttribute("pageincrement", 48);
            event.stopPropagation();
        }
    }

    this.multiRow_onTabSelect = function _multiRow_onTabSelect(event) {
        if (_tabContainer.getAttribute("multirow") == "true") {
            var tab = gBrowser.selectedTab;

            self.scrollToElement(_tabInnerBox, tab);

            // Tabs on different rows shouldn't get before/afterselected attributes
            if (tab.previousSibling != null && tab.boxObject.y != tab.previousSibling.boxObject.y) {
                tab.previousSibling.removeAttribute("beforeselected");
            }
            if (tab.nextSibling != null && tab.boxObject.y != tab.nextSibling.boxObject.y) {
                tab.nextSibling.removeAttribute("afterselected");
            }
        }
    };

    /// Method hooks:
    // Prevent infinite recursion in _tabContainer.handleEvent
    // Note: this might still happen in _tabstrip's underflow and/or overflow event handlers
    self.earlyMethodHooks.push([
        '_tabContainer.handleEvent',
        null,
        /this\.setAttribute\("overflow", "true"\);\s*this\.mTabstrip\.scrollBoxObject\.ensureElementIsVisible\(this\.selectedItem\);/,
        'if (this.getAttribute("multirow") != "true") { \
            this.setAttribute("overflow", "true"); \
            this.mTabstrip.scrollBoxObject.ensureElementIsVisible(this.selectedItem); \
        }'
    ]);
    self.earlyMethodHooks.push([
        '_tabContainer.handleEvent',
        null,
        'this.removeAttribute("overflow");',
        'if (this.getAttribute("multirow") != "true") { \
            this.removeAttribute("overflow"); \
        }'
    ]);
    /*eval("_tabContainer.handleEvent = " + _tabContainer.handleEvent.toString().replace(
        /this\.setAttribute\("overflow", "true"\);\s*this\.mTabstrip\.scrollBoxObject\.ensureElementIsVisible\(this\.selectedItem\);/,
        'if (this.getAttribute("multirow") != "true") { \
            this.setAttribute("overflow", "true"); \
            this.mTabstrip.scrollBoxObject.ensureElementIsVisible(this.selectedItem); \
        }'
    ).replace(
        'this.removeAttribute("overflow");',
        'if (this.getAttribute("multirow") != "true") { \
            this.removeAttribute("overflow"); \
        }'
    ));*/

    //}##########################
    //{=== Highlight unread tabs
    //|##########################

    /// Initialisation:
    this.initHighlightUnreadTabs = function _initHighlightUnreadTabs(event) {
        self.mapBoolPrefToAttribute("highlightUnreadTabs", _tabContainer, "highlightunread");

        _tabContainer.addEventListener("TabSelect", self.tabRead, false);

        _ss.persistTabAttribute("read"); // So restored sessions remember which tabs have been read
    };
    this.initListeners.push(this.initHighlightUnreadTabs);

    this.postInitHighlightUnreadTabs = function _postInitHighlightUnreadTabs(event) {
        gBrowser.selectedTab.setAttribute("read", "true");
    };
    this.postInitListeners.push(this.postInitHighlightUnreadTabs);

    /// Event Listener
    this.tabRead = function _tabRead(event) {
        var tab = event.target; // Or gBrowser.selectedTab ?
        tab.setAttribute("read", "true");
    }

    //}##########################
    //{=== Tab Min Width
    //|##########################

    /// Initialisation:
    this.initTabMinWidth = function _initTabMinWidth(event) {
        self.addGlobalPrefListener("browser.tabs.tabMinWidth", self.resetTabMinWidth);
    };
    this.initListeners.push(this.initTabMinWidth);

    /// Pref Listener/method:
    // Note: this is also used by multi-row tabs
    this.resetTabMinWidth = function _resetTabMinWidth(pref) {
        self.setTabMinWidth(gPrefService.getIntPref("browser.tabs.tabMinWidth"));
    };

    /// Methods:
    // Note: this is also used by multi-row tabs
    this.setTabMinWidth = function _setTabMinWidth(minWidth) {
        _tabContainer.mTabMinWidth = minWidth;
        for (var i = 0; i < _tabs.length; i++) {
            _tabs[i].minWidth = minWidth;
        }
        _tabContainer.adjustTabstrip();
    }

    //}##########################
    //{=== Mouse Gestures
    //|##########################

    /// Private Globals:
    var _mousedown = [false, undefined, false];
    var _preventContext = false;
    var _mouseScrollWrapCounter = 0;

    /// Initialisation:
    this.initMouseGestures = function _initMouseGestures(event) {
        gBrowser.addEventListener("mouseup", self.onMouseUpGesture, true);
        gBrowser.addEventListener("mousedown", self.onMouseDownGesture, true);
        gBrowser.addEventListener("contextmenu", self.onContextMenuGesture, true);
        gBrowser.addEventListener("draggesture", self.onMouseDragGesture, true);
        gBrowser.addEventListener("mouseout", self.onMouseOutGesture, false);
        gBrowser.mPanelContainer.addEventListener("DOMMouseScroll", self.onRMBWheelGesture, true);
        _tabInnerBox.addEventListener("DOMMouseScroll", self.onTabWheelGesture, true);
        _tabContainer.addEventListener("TabSelect", function(event) { _mouseScrollWrapCounter = 0; }, false);
    };
    this.initListeners.push(this.initMouseGestures);

    /// Event Listeners:
    this.onMouseUpGesture = function _onMouseUpGesture(event) {
        if (!event.isTrusted)
            return;

        var btn = event.button;
        if (_mousedown[btn])
            _mousedown[btn] = false;
        else if (btn != 1)
            event.preventDefault(); // We've probably just done a rocker gesture
    };

    this.onMouseDownGesture = function _onMouseDownGesture(event) {
        if (!event.isTrusted)
            return;

        var btn = event.button;
        if (btn == 0)
            var opp = 2;
        else if (btn == 2)
            var opp = 0;
        else
            return;

        if (_mousedown[opp] && _prefs.getBoolPref("gestures.lmbRmbBackForward")) {
            if (btn == 0)
                BrowserBack();
            else
                BrowserForward();
            _preventContext = true;
            _mousedown[opp] = false; // Since the Firefox loses mouseup events during the page load (http://forums.mozillazine.org/viewtopic.php?p=33605#33605)
            event.preventDefault();
            event.stopPropagation();
        }
        else {
            _mousedown[btn] = true;
        }
    };

    this.onContextMenuGesture = function _onContextMenuGesture(event) {
        if (!event.isTrusted || !_preventContext)
            return;

        _preventContext = false;
        event.preventDefault();
        event.stopPropagation();
    };

    this.onMouseDragGesture = function _onMouseCancelGesture(event) {
        if (!event.isTrusted)
            return;

        _mousedown[0] = _mousedown[2] = false;
    };

    this.onMouseOutGesture = function _onMouseCancelGesture(event) {
        if (!event.isTrusted || event.target != event.currentTarget) // n.b. this refers to gBrowser, not tabkit!
            return;

        _mousedown[0] = _mousedown[2] = false;
    };

    this.onRMBWheelGesture = function _onRMBWheelGesture(event) {
        if (!event.isTrusted || !_mousedown[2] || !_prefs.getBoolPref("gestures.rmbWheelTabSwitch"))
            return;

        self.scrollwheelTabSwitch(event);
        if (event.change != 0)
            _preventContext = true;
    };

    this.onTabWheelGesture = function _onTabWheelGesture(event) {
        if (!event.isTrusted)
            return;

        var name = event.originalTarget.localName;
        if (name == "scrollbar" || name == "scrollbarbutton" || name == "slider" || name == "thumb") {
            // Scrollwheeling above an overflow scrollbar should still scroll 3 lines (whether vertical or multi-row tab bar)
            var scrollbar = _tabInnerBox.mVerticalScrollbar;
            if (!scrollbar)
                return;

            if (gBrowser.hasAttribute("vertitabbar"))
                var delta = (Math.abs(event.detail) != 1 ? event.detail : (event.detail < 0 ? -3 : 3)) * 24;
            else if (_tabContainer.getAttribute("multirow") == "true")
                var delta = event.detail < 0 ? -48 : 48; // 2*24
            else
                return;

            var curpos = scrollbar.getAttribute("curpos");
            curpos = curpos == "NaN" ? 0 : Number(curpos);
            var maxpos = Number(scrollbar.getAttribute("maxpos"));
            var newpos = Math.min(maxpos, Math.max(0, curpos + delta));
            scrollbar.setAttribute("curpos", newpos);

            event.preventDefault();
            event.stopPropagation();
        }
        else if (_prefs.getBoolPref("gestures.tabWheelTabSwitch")) {
            self.scrollwheelTabSwitch(event);
        }
    };

    /// Methods:
    this.scrollwheelTabSwitch = function _scrollwheelTabSwitch(event) {
        var change = event.detail;
        if (change > 0) {
            // Switch to next tab, but requiring 3 wheelscrolls to wrap around
            if (_tabContainer.selectedIndex + 1 < _tabContainer.childNodes.length || _mouseScrollWrapCounter >= 2) {
                _tabContainer.advanceSelectedTab(1, true);
                // Note: _mouseScrollWrapCounter is reset whenever a tab is selected
            }
            else _mouseScrollWrapCounter++;
        }
        else if (change < 0) {
            // Switch to previous tab, but requiring 3 wheelscrolls to wrap around
            if (_tabContainer.selectedIndex > 0 || _mouseScrollWrapCounter >= 2) {
                _tabContainer.advanceSelectedTab(-1, true);
                // Note: _mouseScrollWrapCounter is reset whenever a tab is selected
            }
            else _mouseScrollWrapCounter++;
        }

        event.preventDefault();
        event.stopPropagation();
    };

    //}##########################
    //{=== Scrollbars not arrows
    //|##########################

    /// Private Globals:
    var _allTabsInnerBox;

    /// Initialisation:
    this.initScrollbarsNotArrows = function _initScrollbarsNotArrows(event) {
        self.mapBoolPrefToAttribute("scrollbarsNotArrows", document.getElementById("main-window"), "scrollbarsnotarrows"); // TODO: not sure disabling this disables overflow auto
        self.addDelayedEventListener(_tabContainer.mAllTabsPopup, "popupshowing", self.scrollAllTabsMenu);
    };
    this.initListeners.push(this.initScrollbarsNotArrows);

    /// Event Listeners:
    this.scrollAllTabsMenu = function _scrollAllTabsMenu(event) {
        if (!_allTabsInnerBox) {
            var arrowScrollBox = _tabContainer.mAllTabsPopup.popupBoxObject.firstChild
            if (!arrowScrollBox) {
                self.dump("_tabContainer.mAllTabsPopup.popupBoxObject.firstChild is null");
                return;
            }
            _allTabsInnerBox = document.getAnonymousElementByAttribute(arrowScrollBox._scrollbox, "class", "box-inherit scrollbox-innerbox");
        }
        self.scrollToElement(_allTabsInnerBox, gBrowser.mCurrentTab.mCorrespondingMenuitem);
    }

    //}##########################
    //{=== zeniko: CopyDraggedTab
    //|##########################

    // TODO: Get permission from zeniko!! (from http://forums.mozillazine.org/viewtopic.php?t=372494)

    /// Initialisation, event handlers, methods...
    this.postInitCopyDraggedTab = function _postInitCopyDraggedTab(event) {
        if ("duplicateTab" in gBrowser)
            return;

        gBrowser.duplicateTab = function(aTab) { // TODO: Add menuitem
            var state = _ss.getWindowState(aTab.ownerDocument.defaultView);
            state = eval("(" + state + ")");
            state.windows[0].tabs = state.windows[0].tabs.splice(aTab._tPos, 1);
            _ss.setWindowState(window, state.toSource(), false);

            // TODO: move tab next to original tab (but don't break onDrop!)

            return document.getAnonymousElementByAttribute(this, "linkedpanel", this.mPanelContainer.lastChild.id);
        };

        gBrowser.__preCDT_onDrop = gBrowser.onDrop;
        gBrowser.onDrop = function(aEvent, aXferData, aDragSession) {
            if (aDragSession.sourceNode && aDragSession.sourceNode.localName == "tab")
            {
                var oldTab = aDragSession.sourceNode;
                if (aEvent.ctrlKey)
                {
                    var tab = this.duplicateTab(oldTab);
                    if (oldTab.parentNode != this.mTabContainer)
                    {
                        this.selectedTab = tab;
                    }
                    this.moveTabTo(tab, this.getNewIndex(aEvent));
                    return;
                }
                if (oldTab.parentNode != this.mTabContainer)
                {
                    this.selectedTab = this.duplicateTab(oldTab);
                    this.moveTabTo(this.selectedTab, this.getNewIndex(aEvent));
                    oldTab.ownerDocument.defaultView.gBrowser.removeTab(oldTab);
                    window.focus();
                    return;
                }
            }
            gBrowser.__preCDT_onDrop(aEvent, aXferData, aDragSession);
        };

        gBrowser.__preCDT_onDragOver = gBrowser.onDragOver;
        gBrowser.onDragOver = function(aEvent, aFlavour, aDragSession) {
            if (aDragSession.sourceNode && aDragSession.sourceNode.localName == "tab" && aDragSession.sourceNode.parentNode != this.mTabContainer)
            {
                aDragSession = { canDrop: aDragSession.canDrop, sourceNode: this.selectedTab };
            }
            this.__preCDT_onDragOver(aEvent, aFlavour, aDragSession);
        };
    };
    this.postInitListeners.push(this.postInitCopyDraggedTab);

    //}##########################
    //{### Debugging
    //|##########################

    // For debugging use, ignore this!
    this._eval = function __eval(exp) {
        return eval(exp);
    };

    window.tk = function _tk() {
        quickprompt(self._eval, "Tab Kit QuickPrompt", help(), "");
    };

    //}##########################
    //|##########################

}; // End of 'namespace' tt

/*** Notes ***

Variables (var x = y OR this.x = y) can only be accessed by other
variables/arrays/objects after their definition but can be refered to by
functions at any time.
*/

/*** Snippets ***

loadscript("file:///C:/Coding/Code/Firefox/Extensions/tabkit/xpi/chrome/content/tabkit.js");


var appInfo = Components.classes["@mozilla.org/xre/app-info;1"].
              getService(Components.interfaces.nsIXULAppInfo);
if (appInfo.ID == "{ec8030f7-c20a-464f-9b0e-13a3a9e97384}") {
    var versionChecker = Components.classes["@mozilla.org/xpcom/version-comparator;1"].
                         getService(Components.interfaces.nsIVersionComparator);
    var isFx2plus = versionChecker.compare(appInfo.version, "2.0") >= 0;
}
else
    var isFx2plus = false;


// Could use progress listeners instead of sortgroup_onTabLoading

for each (var tab in _tabs) {
    tab.linkedBrowser.addProgressListener(progressListener);
};

var progressListener = {
    onLocationChange: function(aProgress, aRequest, aURI) {
        var doc = aProgress.DOMWindow.document;
        var tab = gBrowser.mTabs[gBrowser.getBrowserIndexForDocument(doc)];
        
        self.colorizeTab(tab);
    },
    onProgressChange: function() { },
    onSecurityChange: function() { }
    onStateChange: function() { },
    onStatusChange: function() { },
};
*/
