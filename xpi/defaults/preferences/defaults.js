//{ Tabbar
// Show the tab bar on the |Top|Left|Right|Bottom|
pref("extensions.tabkit.tabbarPosition", 0);

// Show tabs on [3] rows (1 to disable)
pref("extensions.tabkit.tabRows", 3);

// Show the sidebar on the |Top|Left|Right|Bottom|
pref("extensions.tabkit.sidebarPosition", 1);
//}

//{ Grouping
pref("extensions.tabkit.groupByUri", false);
pref("extensions.tabkit.groupByOrigin", true);
//}

//{ Appearance
// Highlight unread tabs
pref("extensions.tabkit.highlightUnreadTabs", true);
//}

//{ Advanced
/*
Scrollwheel tab switch...
[x] while mouse is over tab bar
[ ] while holding down right mouse button

[ ] Click left while holding right to go back, and vice versa
*/
pref("extensions.tabkit.gestures.tabWheelTabSwitch", true);
pref("extensions.tabkit.gestures.rmbWheelTabSwitch", false);
pref("extensions.tabkit.gestures.lmbRmbBackForward", false);

// Use scrollbars instead of arrows on Bookmarks and All Tabs menus
pref("extensions.tabkit.scrollbarsNotArrows", true);

// ! Purge Recently Closed Windows on restart
pref("extensions.tabkit.keepClosedWindows", false);
//}

//{ (Hidden)
pref("extensions.tabkit.colorTabNotLabel", -1); // -1 to Auto-set, or 0 or 1
pref("extensions.tabkit.debug", false);
pref("extensions.tabkit.scrollOneExtra", true);
//}

//~ /* General */
//~ pref("extensions.tabtree.tabsopen", 1); // TABTREE_OPEN_RELATED_END_OF_CHILDREN
//~ pref("extensions.tabtree.unrelatedtabsopen", 0); // TABTREE_OPEN_UNRELATED_TABBAR_END
//~ pref("extensions.tabtree.selectonclose", 0); // TABTREE_SELECT_ON_CLOSE_AUTO
//~ /* Tab bar*/
//~ pref("extensions.tabtree.tabbar.position", 0); // TABTREE_POSITION_TOP
//~ pref("extensions.tabtree.tabbar.sidebarposition", 3); // TABTREE_POSITION_LEFT
//~ pref("extensions.tabtree.tabbar.horizontal.width", "15em");
//~ pref("extensions.tabtree.tabbar.showtwistys", true);
//~ /* Style */
//~ pref("extensions.tabtree.style.color", 1); // TABTREE_COLOR_GROUPS
//~ pref("extensions.tabtree.style.darkenchildren", true);
//~ pref("extensions.tabtree.style.emphasizegroups", true);
//~ pref("extensions.tabtree.style.darktheme", false);
//~ /* Advanced */
//~ pref("extensions.tabtree.doubleclickmodifiers.alt", false);
//~ pref("extensions.tabtree.doubleclickmodifiers.ctrl", false);
//~ pref("extensions.tabtree.doubleclickmodifiers.meta", false);
//~ pref("extensions.tabtree.doubleclickmodifiers.shift", false);
//~ pref("extensions.tabtree.groupdragmodifiers.alt", false);
//~ pref("extensions.tabtree.groupdragmodifiers.ctrl", true); // shift is already used by Duplicate Tab, even though it would be more logical here and ctrl would be more logical there
//~ pref("extensions.tabtree.groupdragmodifiers.meta", false);
//~ pref("extensions.tabtree.groupdragmodifiers.shift", false);
//~ /* Hidden */
//~ pref("extensions.tabtree.style.colors", "150, 180, 210, 240, 270, 300, 330, 0, 30, 60, 90, 120");
//~ //pref("extensions.tabtree.style.colors", "160,200,240,280,320,20,60,100,140,180,220,260,300,340,0,40,80,120");
//~ //pref("extensions.tabtree.style.colors", "hsl(0, 100%, 50%);hsl(40, 100%, 50%);hsl(80, 100%, 50%);hsl(120, 100%, 50%);hsl(160, 100%, 50%);hsl(200, 100%, 50%);hsl(240, 100%, 50%);hsl(280, 100%, 50%);hsl(320, 100%, 50%);hsl(20, 100%, 50%);hsl(60, 100%, 50%);hsl(100, 100%, 50%);hsl(140, 100%, 50%);hsl(180, 100%, 50%);hsl(220, 100%, 50%);hsl(260, 100%, 50%);hsl(300, 100%, 50%);hsl(340, 100%, 50%)");
//~ //pref("extensions.tabtree.style.colors", "hsl(240, 100%, 50%);hsl(320, 100%, 50%);hsl(180, 100%, 50%);hsl(140, 100%, 50%);hsl(40, 100%, 50%);hsl(160, 100%, 50%);hsl(220, 100%, 50%);hsl(80, 100%, 50%);hsl(200, 100%, 50%);hsl(100, 100%, 50%);hsl(20, 100%, 50%);hsl(300, 100%, 50%);hsl(260, 100%, 50%);hsl(0, 100%, 50%);hsl(280, 100%, 50%);hsl(60, 100%, 50%);hsl(340, 100%, 50%);hsl(120, 100%, 50%)");