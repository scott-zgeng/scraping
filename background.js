/* See license.txt for terms of usage */

// *************************************************************************************************

//var bookmarlet = "javascript:(typeof Firebug!='undefined')?Firebug.chrome.toggle():(function(F,i,r,e,b,u,g,L,I,T,E){if(F.getElementById(b))return;E=F.documentElement.namespaceURI;E=E?F[i+'NS'](E,'script'):F[i]('script');E=F[i]('script');E[r]('id',b);E[r]('src',I+g+T);E[r](b,u);(F[e]('head')[0]||F[e]('body')[0]).appendChild(E);E=new Image;E[r]('src',I+L);})(document,'createElement','setAttribute','getElementsByTagName','FirebugLiteBookmarlet','1.3.0.1','firebug.jgz','skin/xp/sprite.png','https://getfirebug.com/releases/lite/beta/','#startOpened,showIconWhenHidden=false');";
var firebugVersion = "Firebug Lite 1.3.2";
var extensionURL = chrome.extension.getURL("");
var isActive = false;

// *************************************************************************************************

function handleIconClick(tab) {
    if (tab.url.indexOf("https://chrome.google.com/extensions") == 0 ||
        tab.url.indexOf("chrome://") == 0) {
        alert("For security reasons extensions cannot run content scripts at this page, and therefore, Firebug Lite can't work here.");

        return;
    }

    var isContentScriptActive = false;

    chrome.tabs.sendMessage(tab.id, {name: "FB_isActive"},

        function (response) {
            isContentScriptActive = true;

            if (response.value == "true") {
                chrome.tabs.update(tab.id, {url: "javascript:Firebug.chrome.toggle()"});
            }
            else {
                setActivationStorage(tab);
                chrome.tabs.sendMessage(tab.id, {name: "FB_loadFirebug"});
            }
        }
    );
    /*
     setTimeout(function(){

     if (!isContentScriptActive)
     {
     //chrome.tabs.update(tab.id, {url: bookmarlet});
     //enableBrowserActionIcon();
     //setActivationStorage(tab);

     //alert("Firebug Lite can't open because this page was open before it was installed. Please reload this page.");

     setActivationStorage(tab);
     if (confirm("Firebug Lite can't complete its activation because this page was open before the extension itself was enabled. The process will complete when you reload the page.\n\nPress ok to reload the page now, or cancel to reload it later."))
     {
     chrome.tabs.update(tab.id, {url: "javascript:window.location.reload()"});
     }
     }

     },500);/**/
}
chrome.browserAction.onClicked.addListener(handleIconClick);

// *************************************************************************************************

function handleTabChange(tabId, selectInfo) {
    var isUpdated = false;

    chrome.tabs.sendMessage(tabId, {name: "FB_isActive"},

        function (response) {
            isUpdated = true;

            if (response.value == "true") {
                enableBrowserActionIcon();
                isActive = true;
            }
            else {
                disableBrowserActionIcon();
                isActive = false;
            }
        }
    );

    setTimeout(function () {

        chrome.tabs.get(tabId, function (tab) {

            var title = tab.title || "";
            if (!isUpdated && !title.indexOf("Firebug Lite") == 0) {
                disableBrowserActionIcon();
                isActive = false;
            }

        });

    }, 100);
}
// *************************************************************************************************

chrome.tabs.onSelectionChanged.addListener(handleTabChange);

// *************************************************************************************************

function handleUpdateTab(tabId, updateInfo, tab) {
    if (updateInfo.status == "complete") return;

    handleTabChange(tabId, updateInfo);
}

// memory leaking here
//chrome.tabs.onUpdated.addListener(handleUpdateTab);

// *************************************************************************************************

chrome.runtime.onMessage.addListener
(
    function (request, sender, sendResponse) {
        if (request.name == "FB_enableIcon")
            enableBrowserActionIcon();

        else if (request.name == "FB_disableIcon")
            disableBrowserActionIcon();

        else if (request.name == "FB_deactivate") {
            disableBrowserActionIcon();
            chrome.tabs.query({currentWindow: true}, function (tab) {
                unsetActivationStorage(tab[0].id);

                chrome.tabs.sendMessage(tab[0].id, {name: "FB_deactivate"});
            });
        }

        sendResponse({}); // snub them.
    }
);

// *************************************************************************************************

chrome.contextMenus.create({
    title: "Inspect with Firebug Lite",
    "contexts": ["all"],
    onclick: function (info, tab) {
        chrome.tabs.query({currentWindow: true}, function (tabs) {
            chrome.tabs.sendMessage(tabs[0].id, {name: "FB_contextMenuClick"});
        });
    }
});

// *************************************************************************************************

function enableBrowserActionIcon() {
    chrome.browserAction.setTitle({title: firebugVersion + " (On)"});
    chrome.browserAction.setIcon({path: "firebug24.png"});
}
function disableBrowserActionIcon() {
    chrome.browserAction.setTitle({title: firebugVersion + " (Off)"});
    chrome.browserAction.setIcon({path: "firebug24_disabled.png"});
}
// *************************************************************************************************

function setActivationStorage(tab) {
    chrome.tabs.update(tab.id, {url: "javascript:localStorage.setItem('Firebug','1,1," + extensionURL + "')"});
    isActive = true;
}
function unsetActivationStorage(tab) {
    chrome.tabs.update(tab.id, {url: "javascript:localStorage.removeItem('Firebug')"});
    isActive = false;
}
// *************************************************************************************************
