var mainBrowser = null;
(function (browserModule) {
    var query = function (str) {
        return document.querySelector(str);
    };

    window.addEventListener('load', function (e) {
        mainBrowser = new browserModule.Browser(
            query('#browser-frame-controls'),
            query('#inspect'),
            query('#add-module'),
            query('#back'),
            query('#forward'),
            query('#home'),
            query('#reload'),
            query('#location-form'),
            query('#location'),
            query('#browser-tab-container'),
            query('#browser-content-container'),
            query('#new-tab'));
    });
})(browser);
