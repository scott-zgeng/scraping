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


    Browser.prototype.onProcessStyle = function (styles) {
        if (!styles || styles.length == 0) return;

        // process the get selector operation
        $("#inspect-selector").empty();
        for (var i = 0;  i < styles.length; i++) {
            $("#inspect-selector").append("<option>" + styles[i] + "</option>");
        }

        $('#inspectModal').modal();
    };

    //
    //Browser.prototype.onNewRule = function () {
    //    var message = {};
    //    message.catalog = "news";
    //    message.name = "test";
    //    message.extractor = "css";
    //    message.type = "text";
    //    message.selector = $("#selectedStyle").text();
    //
    //    chrome.runtime.sendMessage(message);
    //};

    Browser.prototype.initBtnAction = function () {
        // 动态设置删除按钮的响应
        $('.btn-del-profile').on('click', function () {
            var node = $(this).parent(".profile-item-frame");
            node.remove();
        });
    };

    Browser.prototype.createNewItem =function(newItem) {

        var frame = dce("div");
        frame.setAttribute("class", "profile-item-frame");

        var i=0;
        var frameData = [];
        frameData[i++] ='<button type="button" class="btn btn-danger btn-xs pull-right btn-del-profile">delete</button>';
        frameData[i++] ='<h2>scraping item</h2>';
        frameData[i++] = '<table class="table table-hover">';
        frameData[i++] = ' <thead><tr> <th width="30%">property</th> <th>value</th> </tr></thead> <tbody>';


        for (var key in newItem) {
            frameData[i++] = ' <tr> <td>' + key  + '</td> <td>' + newItem[key] + '</td> </tr>';
        }

        frameData[i++] = '</tbody>';

        frame.innerHTML = frameData.join('');

        $('#main-nav-profile').append(frame);

        this.initBtnAction();

    };

    Browser.prototype.initDialog = function() {
        browser = this;

        $('#inspectModalBtn').on('click', function () {

            var newItem = {};

            var type = $("#inspect-type option:selected").val();
            newItem.type = type;

            var selectorType = $("#inspect-select-type option:selected").val();
            newItem.selectorType = selectorType;

            var selectorValue = $("#inspect-selector option:selected").val();
            console.log("selectorValue = " + selectorValue);
            newItem.selectorValue = selectorValue;

            $('#inspectModal').modal('hide');



            browser.createNewItem(newItem);
        });


        this.initBtnAction();
    };


    Browser.prototype.init = function () {
        (function (browser) {

            var current_window = chrome.app.window.current();
            document.querySelector("#close-curr-win").onclick = function() {
                current_window.close();
            };

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
                var url = browser.locationBar.value.toLowerCase();
                if (url.substring(0, 4) != 'http')
                    url = 'http://' +  url;

                browser.tabs.getSelected().navigateTo(url);
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
                        browser.onProcessStyle(data.styles);
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




    Browser.prototype.doLayout = function (e) {
        var systemBarHeight = 40;
        var controlsHeight = this.controlsContainer.offsetHeight + systemBarHeight;

        var windowWidth = this.controlsContainer.clientWidth;
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


        // 增加大小设置
        $("#main-nav-profile").css('height', document.documentElement.clientHeight + 'px');

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
