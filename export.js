var editor;


var updateView = function (text) {
    editor.setValue(text);
    var lineCount = editor.lineCount();
    editor.autoFormatRange({line:0,ch:0}, {line:lineCount+1, ch:0});
};


onload = function () {

    editor = CodeMirror(
        document.getElementById("export-xml-area"), {
            mode: "xml",
            lineNumbers: true,
            fixedGutter: true,
            readOnly: true
        });

    onresize();
    initEditor();
};


onresize = function () {
    var container = document.getElementById('export-xml-area');
    var containerWidth = container.offsetWidth;
    var containerHeight = container.offsetHeight;

    var scrollerElement = editor.getScrollerElement();
    scrollerElement.style.width = containerWidth + 'px';
    scrollerElement.style.height = containerHeight + 'px';

    editor.refresh();
};


initEditor = function() {

    window.addEventListener('message', function (e) {
        updateView(e.data);
    });
};

