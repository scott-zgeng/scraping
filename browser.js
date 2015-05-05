var browser = (function (configModule, tabsModule) {
    var dce = function (str) {
        return document.createElement(str);
    };

    var Browser = function (controlsContainer,
                            inspect,
                            back,
                            forward,
                            home,
                            reload,
                            locationForm,
                            locationBar,
                            tabContainer,
                            contentContainer,
                            newTabElement) {
        this.controlsContainer = controlsContainer;
        this.inspect = inspect;
        this.back = back;
        this.forward = forward;
        this.reload = reload;
        this.home = home;
        this.locationForm = locationForm;
        this.locationBar = locationBar;
        this.tabContainer = tabContainer;
        this.contentContainer = contentContainer;
        this.newTabElement = newTabElement;
        this.tabs = new tabsModule.TabList(
            'tabs',
            this,
            tabContainer,
            contentContainer,
            newTabElement);

        this.init();
    };

    Browser.prototype.init = function () {
        (function (browser) {
            window.addEventListener('resize', function (e) {
                browser.doLayout(e);
            });

            window.addEventListener('keydown', function (e) {
                browser.doKeyDown(e);
            });

            browser.inspect.addEventListener('click', function (e) {
                browser.tabs.getSelected().inspect();
            });


            browser.back.addEventListener('click', function (e) {
                browser.tabs.getSelected().goBack();
            });

            browser.forward.addEventListener('click', function () {
                browser.tabs.getSelected().goForward();
            });

            browser.home.addEventListener('click', function () {
                browser.tabs.getSelected().navigateTo(configModule.homepage);
            });

            browser.reload.addEventListener('click', function () {
                var tab = browser.tabs.getSelected();
                if (tab.isLoading()) {
                    tab.stopNavigation();
                } else {
                    tab.doReload();
                }
            });
            browser.reload.addEventListener(
                'webkitAnimationIteration',
                function () {
                    // Between animation iterations: If loading is done, then stop spinning
                    if (!browser.tabs.getSelected().isLoading()) {
                        document.body.classList.remove('loading');
                    }
                }
            );

            browser.locationForm.addEventListener('submit', function (e) {
                e.preventDefault();
                browser.tabs.getSelected().navigateTo(browser.locationBar.value);
            });

            browser.newTabElement.addEventListener(
                'click',
                function (e) {
                    return browser.doNewTab(e);
                });


            window.top.addEventListener('message', function (e) {

                if (!e.data) {
                    console.warn('Warning: Message from guest contains no data');
                    return;
                }

                console.log("has message " + e.data);
                var data = JSON.parse(e.data);
                if (!data.type) {
                    console.warn('Warning: Message from guest contains no type');
                    return;
                }

                switch (data.type) {
                    case 'getTitle':
                        if (data.name && data.title) {
                            browser.tabs.setLabelByName(data.name, data.title);
                        }
                        break;
                    case 'getStyle':

                        // process the get selector operation
                        $("#selectedStyle").text(data.style);
                        $("#insertDialog").dialog("open");

                        //event.preventDefault();
                        console.log("selected style: " + data.style);

                        var newNode = "<selector>" + data.style + "</selector>";

                        var parser=new DOMParser();
                        var xmlDoc = parser.parseFromString(newNode,"text/xml");

                        //append_editer_text(data.style);
                        break;
                    default:
                        console.warn('Warning: invalid type' + data.type);
                        return;
                }
            });

            var webview = dce('webview');
            webview.setAttribute('partition', 'static');
            var tab = browser.tabs.append(webview);
            // Global window.newWindowEvent may be injected by opener
            if (window.newWindowEvent) {
                window.newWindowEvent.window.attach(webview);
            } else {
                tab.navigateTo(configModule.homepage);
            }
            browser.tabs.selectTab(tab);

            browser.initDialog();

        }(this));
    };

    Browser.prototype.initDialog = function() {
        var browser = this;
        $("#insertDialog").dialog({
            autoOpen: false,
            width: 400,
            buttons: [
                {
                    text: "Ok",
                    click: browser.onDialogOK
                },
                {
                    text: "Cancel",
                    click: function() {
                        $(this).dialog( "close" );
                    }
                }
            ]
        });
    };

    Browser.prototype.onDialogOK = function () {
        var message = {};
        message.catalog = "news";
        message.name = "test";
        message.extractor = "css";
        message.type = "text";
        message.selector = $("#selectedStyle").text();

        chrome.runtime.sendMessage(message);
        $(this).dialog( "close" );
    };

    Browser.prototype.doLayout = function (e) {
        var controlsHeight = this.controlsContainer.offsetHeight;
        var windowWidth = document.documentElement.clientWidth;
        var windowHeight = document.documentElement.clientHeight;
        var contentWidth = windowWidth;
        var contentHeight = windowHeight - controlsHeight;

        var tab = this.tabs.getSelected();
        var webview = tab.getWebview();
        var webviewContainer = tab.getWebviewContainer();

        var layoutElements = [
            this.contentContainer,
            webviewContainer,
            webview];
        for (var i = 0; i < layoutElements.length; ++i) {
            layoutElements[i].style.width = contentWidth + 'px';
            layoutElements[i].style.height = contentHeight + 'px';
        }
    };

    // New window that is NOT triggered by existing window
    Browser.prototype.doNewTab = function (e) {
        var webview = dce('webview');
        webview.setAttribute('partition', 'static');
        var tab = this.tabs.append(webview);
        tab.navigateTo(configModule.homepage);
        this.tabs.selectTab(tab);
        return tab;
    };


    Browser.prototype.doKeyDown = function (e) {
        if (e.ctrlKey) {
            switch (e.keyCode) {
                // Ctrl+T
                case 84:
                    this.doNewTab();
                    break;
                // Ctrl+W
                case 87:
                    e.preventDefault();
                    this.tabs.removeTab(this.tabs.getSelected());
                    break;
            }
            // Ctrl + [1-9]
            if (e.keyCode >= 49 && e.keyCode <= 57) {
                var idx = e.keyCode - 49;
                if (idx < this.tabs.getNumTabs()) {
                    this.tabs.selectIdx(idx);
                }
            }
        }
    };

    Browser.prototype.doTabNavigating = function (tab, url) {
        if (tab.selected) {
            document.body.classList.add('loading');
            this.locationBar.value = url;
        }
    };

    Browser.prototype.doTabNavigated = function (tab, url) {
        this.updateControls();
    };

    Browser.prototype.doTabSwitch = function (oldTab, newTab) {
        this.updateControls();
    };

    Browser.prototype.updateControls = function () {
        var selectedTab = this.tabs.getSelected();
        if (selectedTab.isLoading()) {
            document.body.classList.add('loading');
        }
        var selectedWebview = selectedTab.getWebview();
        this.back.disabled = !selectedWebview.canGoBack();
        this.forward.disabled = !selectedWebview.canGoForward();
        if (this.locationBar.value != selectedTab.url) {
            this.locationBar.value = selectedTab.url;
        }
    };

    return {'Browser': Browser};
})(config, tabs);
