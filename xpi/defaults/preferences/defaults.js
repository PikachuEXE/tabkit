//{ ### Tab Bar ###
//--- Panels---
pref("extensions.tabkit.tabbarPosition", 0); // 0: Top, 1: Left, 2: Right, 3: Bottom
pref("extensions.tabkit.sidebarPosition", 1); // 0: Top, 1: Left, 2: Right, 3: Bottom

//--- Horizontal Tab Bar --- (disable as appropriate)
pref("extensions.tabkit.tabRows", 3); // 1 to disable

//--- Vertical Tab Bar --- (disable as appropriate)
pref("extensions.tabkit.indentedTree", true);
    pref("extensions.tabkit.maxTreeLevel", 3);
    pref("extensions.tabkit.indentAmount", 19);
//}


//{ ### Tabs ###
//--- Tabs ---
//pref("browser.tabs.tabMinWidth", 100);
//pref("browser.tabs.closeButtons", 1); // 0: Active tab only, 1: All tabs, 2: None, 3: Button at end of tab strip

//--- Appearance ---
pref("extensions.tabkit.highlightUnreadTabs", true);
pref("extensions.tabkit.emphasizeCurrentTab", true);

//--- Advanced ---
pref("extensions.tabkit.colorTabNotLabel", -1); // -1: Auto, 0: Don't, 1: Do
//}


//{ ### Controls ###
//--- Mouse Gestures ---
pref("extensions.tabkit.gestures.tabWheelTabSwitch", true);
pref("extensions.tabkit.gestures.rmbWheelTabSwitch", false);

pref("extensions.tabkit.gestures.lmbRmbBackForward", false);

pref("extensions.tabkit.doubleClickShortcuts", true);

//--- Scrolling ---
pref("extensions.tabkit.scrollbarsNotArrows", true);
pref("extensions.tabkit.scrollOneExtra", true);
//}


//{ ### Sorting & Grouping ###
//--- Grouping Tabs ---
pref("extensions.tabkit.autoGroupNewTabs", true);
    pref("extensions.tabkit.lastActiveGrouping", "opener"); // domain or opener

//--- Positioning Tabs ---
pref("extensions.tabkit.newTabPosition", 2); // 2: By last sort, 1: Next to current, 0: At far right
    pref("extensions.tabkit.lastActiveSort", "origin"); // uri, lastLoaded, lastViewed, creation, origin or title
    pref("extensions.tabkit.openRelativePosition", "rightOfRecent"); // left, right, rightOfRecent or rightOfConsecutive

//--- Closing Tabs ---
pref("extensions.tabkit.customCloseOrder", 2); // 0: Auto, 1: Group left, 2: Group right, 3: left, 4: right
//pref("browser.tabs.selectOwnerOnClose", true);
//}


//{ ### Advanced Grouping ###
//--- Tab Order ---
pref("extensions.tabkit.autoSortDomainGroups", true);
pref("extensions.tabkit.autoSortOpenerGroups", true);

//--- Types of Tab ---
pref("extensions.tabkit.bookmarkTabsAreRelated", false);
pref("extensions.tabkit.historyTabsAreRelated", false);
pref("extensions.tabkit.newTabsAreRelated", false);

//--- Reset ---
//}


//{ ### (Hidden) ###
pref("extensions.tabkit.debug", false); // Enables error and warning messages
pref("extensions.tabkit.debugMinorToo", false); // Enables debugging messages

pref("extensions.tabkit.tabSidebarWidth", 200); // Auto-set (by dragging splitter)

pref("extensions.tabkit@jomel.me.uk.description", "chrome://tabkit/locale/tabkit.properties"); // For localization of description
//}


//// Max no. of recent windows to keep (0 to disable completely, -1 for unlimited)
//pref("extensions.tabkit.maxRecentWindows", 10);

//// ! Purge Recently Closed Windows on restart
//pref("extensions.tabkit.keepClosedWindows", true);