var browser = (function (configModule, tabsModule) {
    var dce = function (str) {
        return document.createElement(str);
    };

    var Browser = function (controlsContainer,

                            openProfile,
                            saveProfile,
                            refreshExport,
                            saveExport,
                            cleanLog,

                            devTools,
                            inspect,
                            addModule,
                            viewEffect,

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

        this.openProfile = openProfile;
        this.saveProfile = saveProfile;
        this.refreshExport = refreshExport;
        this.saveExport = saveExport;
        this.cleanLog = cleanLog;

        this.devTools = devTools;
        this.inspect = inspect;
        this.addModule = addModule;
        this.viewEffect = viewEffect;

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


        // add by zhanggeng
        this.exportEntry = null;
        this.profileEntry = null;
        this.serializer = new XMLSerializer;
        this.exportXML = null;

        this.init();
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

            browser.devTools.addEventListener('click', function (e) {
                browser.tabs.getSelected().devTools();
            });


            browser.inspect.addEventListener('click', function (e) {
                browser.tabs.getSelected().inspect();
            });

            browser.addModule.addEventListener('click', function (e) {
                browser.doAddModule();
            });

            browser.viewEffect.addEventListener('click', function (e) {
                browser.tabs.getSelected().viewEffect();
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

            browser.openProfile.addEventListener("click", function (e) {
                browser.handleOpenProfile();
            });

            browser.saveProfile.addEventListener("click", function (e) {
                browser.handleSaveProfile();
            });

            browser.refreshExport.addEventListener("click", function (e) {
                browser.handleRefreshExport();
            });

            browser.saveExport.addEventListener("click", function(e) {
                browser.handleSaveExport();
            });

            browser.cleanLog.addEventListener("click", function(e) {
                browser.handleCleanLog();
            });

            browser.initDialog();


            writeLog("browser startup");

        }(this));
    };



    Browser.prototype.doLayout = function (e) {
        var systemBarHeight = 40;
        var controlsHeight = this.controlsContainer.offsetHeight + systemBarHeight;

        var windowWidth = document.getElementById('scraping-main').clientWidth;
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


        var profileCtrl = document.getElementById('profile-controls-bar')
        windowHeight = windowHeight - 80;

        // add by zhanggeng 增加大小设置

        var profilePanel = document.getElementById('main-profile-panel');
        profilePanel.style.height = windowHeight + 'px';


        var exportArea = document.getElementById('main-nav-export-area');
        exportArea.style.width = windowWidth + 'px';
        exportArea.style.height = windowHeight + 'px';


        var logArea = document.getElementById('main-nav-log-table');
        logArea.style.height = windowHeight  + 'px';

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




    Browser.prototype.errorHandler = function(e) {
        var msg = "";

        switch (e.code) {
            case FileError.QUOTA_EXCEEDED_ERR:
                msg = "QUOTA_EXCEEDED_ERR";
                break;
            case FileError.NOT_FOUND_ERR:
                msg = "NOT_FOUND_ERR";
                break;
            case FileError.SECURITY_ERR:
                msg = "SECURITY_ERR";
                break;
            case FileError.INVALID_MODIFICATION_ERR:
                msg = "INVALID_MODIFICATION_ERR";
                break;
            case FileError.INVALID_STATE_ERR:
                msg = "INVALID_STATE_ERR";
                break;
            default:
                msg = "Unknown Error";
                break;
        }
        console.log("Error: " + msg);
    };



    Browser.prototype.initDialog = function() {
        var browser = this;

        $('#inspect-dlg-btn').on('click', function () {

            var newItem = {};

            var module = $("#inspect-module option:selected").val();
            if (!module) return;

            newItem.type = $("#inspect-type option:selected").val();
            newItem.selectorType = $("#inspect-select-type option:selected").val();
            newItem.selectorValue = $("#inspect-selector option:selected").val();

            $('#inspect-dlg').modal('hide');

            browser.createNewItem(module, newItem);

        });


        $('#inspect-dlg').on('hide.bs.modal', function() {
            $(this).find('form')[0].reset();
        });


        $('#add-new-module-btn').on('click', function () {

            var newItem = {};

            newItem.name = $("#dlg-module-name").val();
            newItem.rule = $("#dlg-module-rule").val();

            if (!newItem.name || !newItem.rule) return;

            $('#add-module-dlg').modal('hide');

            browser.createNewModule(newItem);
        });


        $('#add-module-dlg').on('hide.bs.modal', function() {
            $(this).find('form')[0].reset();
        });

    };


    Browser.prototype.onProcessStyle = function (styles) {
        if (!styles || styles.length == 0) return;

        // generate the module list
        $("#inspect-module").empty();

        $(".profile-module-frame").each(function (idx) {
            var dataName = $(this).attr("data-name")
            $("#inspect-module").append("<option>" + dataName + "</option>");
        });

        // process the get selector operation
        $("#inspect-selector").empty();
        for (var i = 0;  i < styles.length; i++) {
            $("#inspect-selector").append("<option>" + styles[i] + "</option>");
        }

        $('#inspect-dlg').modal();
    };



    Browser.prototype.createNewItem = function(module, newItem) {

        var frame = dce("div");
        frame.setAttribute("class", "profile-item-frame");

        var i=0;
        var frameData = [];
        frameData[i++] ='<button type="button" class="close btn-del-profile" aria-label="Close"><span aria-hidden="true">×<span></button>';
        frameData[i++] ='<h4>scraping item</h4>';
        frameData[i++] = '<table class="table table-hover">';
        frameData[i++] = ' <thead><tr> <th width="200px">property</th> <th>value</th> </tr></thead> <tbody>';


        for (var key in newItem) {
            frameData[i++] = ' <tr class="item-property" key="' + key  +'" value="' + newItem[key] + '">';
            frameData[i++] = ' <td>' + key  + '</td> <td>' + newItem[key] + '</td> </tr>';
        }

        frameData[i++] = '</tbody>';

        frame.innerHTML = frameData.join('');

        var moduleNode = $('.profile-module-frame[data-name="' + module + '"]');
        if (!moduleNode) return;

        moduleNode.append(frame);

        $('.btn-del-profile').on('click', function () {
            var node = $(this).parent(".profile-item-frame");
            node.remove();
            writeLog("remove item");
        });

        writeLog("create new item: type = " + newItem.type + ", selector = " + newItem.selectorValue);
    };


    Browser.prototype.doAddModule = function() {
        $('#add-module-dlg').modal();
    };


    Browser.prototype.createNewModule = function(newItem) {

        console.log(newItem);

        var frame = dce("div");
        frame.setAttribute("class", "profile-module-frame");
        frame.setAttribute("data-name", newItem.name);
        frame.setAttribute("rule", newItem.rule);

        var i=0;
        var frameData = [];
        frameData[i++] ='<button type="button" class="close btn-del-module" aria-label="Close"><span aria-hidden="true">×<span></button>';
        frameData[i++] ='<h2>' + newItem.name + '</h2>';
        frameData[i++] ='<h5>' + "pattern: " + newItem.rule + '</h5>';

        frame.innerHTML = frameData.join('');

        $('#main-profile-panel').append(frame);

        $('.btn-del-module').on('click', function () {
            var node = $(this).parent(".profile-module-frame");
            node.remove();
            writeLog("remove module");
        });

        writeLog("create new module: " + newItem.name);
    };



    Browser.prototype.reloadProfile = function(file, e) {
        var panel = $("#main-profile-panel");
        panel.empty();
        panel.html(e.target.result);

        $("#profile-pathname").html("filename: " + file.name);


        // load 完成后需要增加按钮动作
        $('.btn-del-profile').on('click', function () {
            var node = $(this).parent(".profile-item-frame");
            node.remove();
        });


        $('.btn-del-module').on('click', function () {
            var node = $(this).parent(".profile-module-frame");
            node.remove();
        });

        writeLog("open profile from: " + file.name);
    };

    Browser.prototype.handleOpenProfile = function() {

        var browser = this;

        chrome.fileSystem.chooseEntry({type: 'openWritableFile'}, function(file) {

            if (!file) return;
            browser.profileEntry = file;

            browser.profileEntry.file(function (file) {

                var fileReader = new FileReader();

                fileReader.onload = function (e) {
                    browser.reloadProfile(file, e);
                };

                fileReader.onerror = function (e) {
                    console.log("Read failed: " + e.toString());
                };

                fileReader.readAsText(file);
            }, browser.errorHandler);
        });
    };


    Browser.prototype.writeProfileToFile = function (file) {
        var browser = this;

        file.createWriter(function(fileWriter) {

            fileWriter.onerror = function(e) {
                console.log("Write failed: " + e.toString());
            };

            var text = $("#main-profile-panel").html();

            var blob = new Blob([text], {type: 'text/plain'});

            fileWriter.truncate(blob.size);
            fileWriter.onwriteend = function() {
                fileWriter.onwriteend = function(e) {
                    console.log("Write profile completed.");
                    $("#profile-pathname").html("filename: " + file.name);
                    writeLog("write profile to: " + file.name);
                };
                fileWriter.write(blob);
            };
        }, browser.errorHandler);
    };


    Browser.prototype.handleSaveProfile = function() {
        var browser = this;

        try {
            if (browser.profileEntry) {
                browser.writeProfileToFile(browser.profileEntry);
                return;
            }

            chrome.fileSystem.chooseEntry({ type: 'saveFile' }, function(file) {
                if (!file) return;

                browser.profileEntry = file;
                browser.writeProfileToFile(browser.profileEntry);
            });
        } catch (e) {
            console.log("catch exception: " + e);
        }
    };


    Browser.prototype.handleRefreshExport = function() {


        this.exportXML  = document.implementation.createDocument("", "", null);
        var xml = this.exportXML;

        var site = xml.createElement("site");
        xml.appendChild(site);


        $(".profile-module-frame").each(function () {
            var frame = $(this);

            var module = xml.createElement("module");
            site.appendChild(module);

            var accept = xml.createElement("accept");
            accept.innerHTML = frame.attr("rule");
            module.appendChild(accept);

            var items = $(this).find(".profile-item-frame");
            items.each(function () {
                var item = $(this);
                var type = item.find("tr[key=type]");
                var field = xml.createElement("field");
                field.setAttribute("name", type.attr("value"));
                module.appendChild(field);


                var selectorType = item.find("tr[key=selectorType]");
                var extractor = xml.createElement("extractor");
                extractor.setAttribute("type", selectorType.attr("value"));
                field.appendChild(extractor);

                var selectorValue = item.find("tr[key=selectorValue]");
                var selector = xml.createElement("selector");

                selector.innerHTML = selectorValue.attr("value");
                extractor.appendChild(selector);
            });
        });



        var text = this.serializer.serializeToString(xml);
        text = vkbeautify.xml(text);
        var exportView = document.getElementById("main-nav-export-area");
        exportView.contentWindow.postMessage(text, '*');

        writeLog("refresh export xml");
    };



    Browser.prototype.handleSaveExport = function() {
        var browser = this;

        try {
            if (this.exportEntry) {
                this.writeExportToFile(this.exportEntry);
                return;
            }

            chrome.fileSystem.chooseEntry({type: 'saveFile'}, function (file) {
                if (!file) return;

                browser.exportEntry = file;
                browser.writeExportToFile(browser.exportEntry);
            });

        } catch (e) {
            console.log("catch exception: " + e);
        }
    };


    Browser.prototype.writeExportToFile = function(file) {
        var browser = this;

        file.createWriter(function(fileWriter) {

            fileWriter.onerror = function(e) {
                console.log("Write failed: " + e.toString());
            };

            var text = browser.serializer.serializeToString(browser.exportXML);
            text = vkbeautify.xml(text);
            var blob = new Blob([text], {type: 'text/plain'});

            fileWriter.truncate(blob.size);
            fileWriter.onwriteend = function() {
                fileWriter.onwriteend = function(e) {
                    console.log("Write export file completed.");
                    $("#export-pathname").html("filename: " + file.name);
                    writeLog("write export xml to: " + file.name);
                };
                fileWriter.write(blob);

            };
        }, browser.errorHandler);
    };


    Browser.prototype.handleCleanLog = function() {
        $("#main-nav-log-table tbody").empty();
    };


    //  instance
    return {'Browser': Browser};

})(config, tabs);


function writeLog(logData) {

    var currDate = new Date();
    var log =
        '<tr>' +
        '<td width="180px">' + currDate.toLocaleString() + '</td>' +
        '<td>' + logData + '</td>' +
        '</tr>';

    $("#main-nav-log-table tbody").append(log);

};