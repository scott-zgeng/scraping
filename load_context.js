var firebug = (function () {

    var FirebugContext = function() {
        this.isActive = false;
        this.isOpen = false;
        this.extensionURL = chrome.runtime.getURL("");
    };

    FirebugContext.prototype.init = function () {
        this.load("1,1,");
    };

    // by the keyboard activation.
    FirebugContext.prototype.load = function (stateData) {

        this.isActive = false;
        this.isOpen = false;

        if (stateData) {
            stateData = stateData.split(",");
            this.isActive = stateData[0] == "1";
            this.isOpen = stateData[1] == "1";
        }

        this.inject();
    };

    FirebugContext.prototype.inject = function () {
        var doc = document;

        var scriptElement = doc.getElementById("FirebugLite");
        if (scriptElement) {
            //firebugDispatch("FB_toggle");
            return;
        }

        doc.documentElement.setAttribute("debug", this.isOpen);

        var script = doc.createElement("script");
        //var script = this.doc.createElement("div");
        script.setAttribute("src", "firebug-lite-beta.js");
        script.setAttribute("id", "FirebugLite");
        script.setAttribute("firebugIgnore", "true");
        script.setAttribute("extension", "Chrome");
        script.setAttribute("url", this.extensionURL);
        doc.documentElement.appendChild(script);
    };

    return {
        'FirebugContext': FirebugContext
    };
}());


// startup Firebug Lite if it is active for the current page
console.log("running load_context.js");

var fbContext = new firebug.FirebugContext();
fbContext.init();


