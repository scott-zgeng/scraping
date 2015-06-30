var refreshButton;
var saveButton;
var editor;
var fileEntry;
var hasWriteAccess;

var myDoc;
var serializer;
var parser;


function errorHandler(e) {
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
}


function setFile(theFileEntry, isWritable) {
    fileEntry = theFileEntry;
    hasWriteAccess = isWritable;
}

function readFileIntoEditor(theFileEntry) {
    if (!theFileEntry)
        return;

    theFileEntry.file(function (file) {
        var fileReader = new FileReader();

        fileReader.onload = function (e) {
            handleDocumentChange(theFileEntry.fullPath);
            editor.setValue(e.target.result);

            myDoc = parser.parseFromString(e.target.result, "text/xml");

            updateView();
        };

        fileReader.onerror = function (e) {
            console.log("Read failed: " + e.toString());
        };

        fileReader.readAsText(file);
    }, errorHandler);

}

function writeEditorToFile(theFileEntry) {
    theFileEntry.createWriter(function (fileWriter) {
        fileWriter.onerror = function (e) {
            console.log("Write failed: " + e.toString());
        };

        var blob = new Blob([editor.getValue()]);
        fileWriter.truncate(blob.size);
        fileWriter.onwriteend = function () {
            fileWriter.onwriteend = function (e) {
                handleDocumentChange(theFileEntry.fullPath);
                console.log("Write completed.");
            };

            fileWriter.write(blob);
        }
    }, errorHandler);
}



var onChosenFileToSave = function (theFileEntry) {
    setFile(theFileEntry, true);
    writeEditorToFile(theFileEntry);
};


var updateView = function () {
    var text = serializer.serializeToString(myDoc);
    editor.setValue(text);
    var lineCount = editor.lineCount();
    editor.autoFormatRange({line:0,ch:0}, {line:lineCount+1, ch:0});
};



function handleRefreshButton() {
    //chrome.fileSystem.chooseEntry({type: 'openWritableFile'}, onWritableFileToOpen);
}

function handleSaveButton() {
    if (fileEntry && hasWriteAccess) {
        writeEditorToFile(fileEntry);
    } else {
        chrome.fileSystem.chooseEntry({type: 'saveFile'}, onChosenFileToSave);
    }
}

onload = function () {

    refreshButton = document.getElementById("refresh");
    saveButton = document.getElementById("save");

    refreshButton.addEventListener("click", handleRefreshButton);
    saveButton.addEventListener("click", handleSaveButton);

    editor = CodeMirror(
        document.getElementById("editor"),
        {
            mode: "xml",
            lineNumbers: true,
            fixedGutter: true,
            extraKeys: {
                "Cmd-S": function (instance) {
                    handleSaveButton();
                },
                "Ctrl-S": function (instance) {
                    handleSaveButton();
                }
            }
        });

    onresize();
    initEditor();
};

onresize = function () {
    var container = document.getElementById('editor');
    var containerWidth = container.offsetWidth;
    var containerHeight = container.offsetHeight;

    var scrollerElement = editor.getScrollerElement();
    scrollerElement.style.width = containerWidth + 'px';
    scrollerElement.style.height = containerHeight + 'px';

    editor.refresh();
};


processMsg = function(message) {

    var module = myDoc.querySelector("#"+message.catalog);
    if (!module) {
        module = myDoc.createElement("module");
        module.id = message.catalog;
    }

    var accept = myDoc.createElement("accept");
    module.appendChild(accept);

    var field = myDoc.createElement("field");
    field.setAttribute("name", message.name);
    module.appendChild(field);

    var extractor = myDoc.createElement("extractor");
    extractor.setAttribute("name", message.extractor);
    field.appendChild(extractor);

    var type = myDoc.createElement("type");
    type.innerHTML = message.type;
    extractor.appendChild(type);

    var selector = myDoc.createElement("selector");
    selector.innerHTML = message.selector;
    extractor.appendChild(selector);

    myDoc.querySelector("site").appendChild(module);

    updateView();
};


initEditor = function() {
    serializer = new XMLSerializer;
    parser = new DOMParser;


    myDoc = document.implementation.createDocument("", "", null);
    //myDoc.xmlEncoding("UTF-8");
    //myDoc.xmlVersion(1);
    //myDoc.

    var site = myDoc.createElement("site");
    site.setAttribute("name", "www.sohu.com");
    myDoc.appendChild(site);

    updateView();

    // note(zhanggeng):
    chrome.runtime.onMessage.addListener(processMsg);
};

onload();