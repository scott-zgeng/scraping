var browser = (function (configModule, tabsModule) {
    var dce = function (str) {
        return document.createElement(str);
    };

    var Browser = function (controlsContainer,
                            openProfile,
                            saveProfile,
                            refreshExport,
                            saveExport,
                            inspect,
                            addModule,
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

        this.inspect = inspect;
        this.addModule = addModule;
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
        this.fileEntry = null;
        this.exportDoc = document.implementation.createDocument("", "", null);
        this.profileEntry = null;

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

            browser.inspect.addEventListener('click', function (e) {
                browser.tabs.getSelected().inspect();
            });

            browser.addModule.addEventListener('click', function (e) {
                browser.doAddModule();
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


            browser.initDialog();

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


        // add by zhanggeng 增加大小设置
        var profilePanel = document.getElementById('main-nav-profile');
        profilePanel.style.height = windowHeight + 'px';


        var exportArea = document.getElementById('main-nav-export-code');
        exportArea.style.width = windowWidth + 'px';
        exportArea.style.height = windowHeight + 'px';


        var logArea = document.getElementById('main-nav-log-table');
        var logAreaHeight = windowHeight - 80;
        logArea.style.height = logAreaHeight  + 'px';

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


    Browser.prototype.handleRefreshExport = function() {

        var doc = this.exportDoc.empty();
        var site = doc.createElement("site");
        doc.appendChild(site);

        var module = doc.createElement("module");
        site.appendChild(module);

        $("#main-nav-profile tbody").each(function () {
            var rows = $(this).children();
            rows.each(function () {
                var items = $(this).children();

                console.log(items.first().text());
                console.log(items.last().text());
            });
        });
    };



    Browser.prototype.handleSaveExport = function() {
        var fileData = null;

        if (this.fileEntry && this.hasWriteAccess) {
            this.writeEditorToFile(this.fileEntry, fileData);
        } else {
            chrome.fileSystem.chooseEntry({type: 'saveFile'}, this.onChosenFileToSave);
        }
    };


    Browser.prototype.onChosenFileToSave = function(theFileEntry) {
        this.fileEntry = theFileEntry;
        this.hasWriteAccess = true;

        this.writeEditorToFile(theFileEntry);
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


    Browser.prototype.writeEditorToFile = function(theFileEntry, fileData) {
        theFileEntry.createWriter(function (fileWriter) {
            fileWriter.onerror = function (e) {
                console.log("Write failed: " + e.toString());
            };

            var blob = new Blob([fileData]);
            fileWriter.truncate(blob.size);
            fileWriter.onwriteend = function () {
                fileWriter.onwriteend = function (e) {
                    handleDocumentChange(theFileEntry.fullPath);
                    console.log("Write completed.");
                };

                fileWriter.write(blob);
            }
        }, this.errorHandler);
    };




    Browser.prototype.initDialog = function() {
        browser = this;

        $('#inspect-dlg-btn').on('click', function () {

            var newItem = {};

            newItem.module = $("#inspect-module option:selected").val();
            if (!newItem.module) return;

            newItem.type = $("#inspect-type option:selected").val();
            newItem.selectorType = $("#inspect-select-type option:selected").val();
            newItem.selectorValue = $("#inspect-selector option:selected").val();

            $('#inspect-dlg').modal('hide');

            browser.createNewItem(newItem);
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



    Browser.prototype.createNewItem = function(newItem) {

        var frame = dce("div");
        frame.setAttribute("class", "profile-item-frame");

        var i=0;
        var frameData = [];
        frameData[i++] ='<button type="button" class="close btn-del-profile" aria-label="Close"><span aria-hidden="true">×<span></button>';
        frameData[i++] ='<h4>scraping item</h4>';
        frameData[i++] = '<table class="table table-hover">';
        frameData[i++] = ' <thead><tr> <th width="200px">property</th> <th>value</th> </tr></thead> <tbody>';


        for (var key in newItem) {
            frameData[i++] = ' <tr class="item-property"> <td>' + key  + '</td> <td>' + newItem[key] + '</td> </tr>';
        }

        frameData[i++] = '</tbody>';

        frame.innerHTML = frameData.join('');

        var module = $('.profile-module-frame[data-name="' + newItem.module + '"]');
        if (!module) return;

        module.append(frame);

        $('.btn-del-profile').on('click', function () {
            var node = $(this).parent(".profile-item-frame");
            node.remove();
        });
    };


    Browser.prototype.doAddModule = function() {
        $('#add-module-dlg').modal();
    };


    Browser.prototype.createNewModule = function(newItem) {

        console.log(newItem);

        var frame = dce("div");
        frame.setAttribute("class", "profile-module-frame");
        frame.setAttribute("data-name", newItem.name);

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
        });
    };



    Browser.prototype.reloadProfile = function(file, e) {
        var panel = $("#main-profile-panel");
        panel.empty();
        panel.html(e.target.result);

        $("#profile-pathname").html("filename: " + file.name);
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

            var profile = $("#main-profile-panel").html();

            console.log(profile);

            var blob = new Blob([profile], {type: 'text/plain'});

            fileWriter.truncate(blob.size);
            fileWriter.onwriteend = function() {
                fileWriter.onwriteend = function(e) {
                    console.log("Write completed.");
                    $("#profile-pathname").html("filename: " + file.name);
                };
                fileWriter.write(blob);
            };
        }, browser.errorHandler);
    };


    Browser.prototype.handleSaveProfile = function() {
        var browser = this;

        if (browser.profileEntry) {
            browser.writeProfileToFile(browser.profileEntry);
            return;
        }

        chrome.fileSystem.chooseEntry({ type: 'saveFile' }, function(file) {
            browser.profileEntry = file;
            browser.writeProfileToFile(browser.profileEntry);
        });

    };


    //  instance
    return {'Browser': Browser};

})(config, tabs);


