/**
 Copyright 2014 Gordon Williams (gw@pur3.co.uk)

 This Source Code is subject to the terms of the Mozilla Public
 License, v2.0. If a copy of the MPL was not distributed with this
 file, You can obtain one at http://mozilla.org/MPL/2.0/.

 ------------------------------------------------------------------
 File Load/Save
 ------------------------------------------------------------------
 **/
"use strict";
(function () {

    $.fn.exists = function () {
        return this.length !== 0;
    };
    
    var currentJSFileName = "code.js";
    var currentXMLFileName = "code_blocks.xml";
    var loadFileCallback;

    // Tabs and files array to keep track of tabs and files
    var tabs = [];
    var files = [];

    // Getting tabs from Storage
    chrome.storage.sync.get('tabs', function(data) {
        if(data.tabs != undefined){
            tabs = data.tabs;
        }
    });

    // Getting files from Storage
    chrome.storage.sync.get('files', function(data) {
        if(data.files != undefined){
            files = data.files;
        }
    });

    var previousTab = "";
    var tabHtml, fileHtml, code;

    function init() {
        // Configuration

        // Add stuff we need
        Espruino.Core.App.addIcon({
            id: "openFile",
            icon: "folder-open",
            title: "Open File",
            order: 100,
            area: {
                name: "code",
                position: "top"
            },
            click: function () {
                if (Espruino.Core.Code.isInBlockly())
                    loadFile(Espruino.Core.EditorBlockly.setXML, currentXMLFileName);
                else
                    loadFile(Espruino.Core.EditorJavaScript.setCode, currentJSFileName);
            }
        });

        Espruino.Core.App.addIcon({
            id: "saveFile",
            icon: "save",
            title: "Save File",
            order: 200,
            area: {
                name: "code",
                position: "top"
            },
            click: function () {
                if (Espruino.Core.Code.isInBlockly())
                    saveFile(Espruino.Core.EditorBlockly.getXML(), currentXMLFileName);
                else
                    saveFile(Espruino.Core.EditorJavaScript.getCode(), currentJSFileName);
            }
        });

        Espruino.Core.App.addIcon({
            id: "saveAll",
            icon: "saveAll",
            title: "Save Items",
            order: 300,
            area: {
                name: "code",
                position: "top"
            },
            click: function () {
                saveItems();
            }
        });

        addTabsOnInit();
        addHandlers();
    }

    function addHandlers() {
        // register handlers
        $('.tab').on('click',function(){
            console.log("handlers opencode");
            openCode($(this).data('name'));
        });
        $('.file').on('click',function(){
            console.log("handlers addtotabs");
            addToTabs($(this).data('name'));
        });
        $('.closeButton').on('click',function(){
            var t = $(this);
            var name = t.data('name');
            if(t.data('type') === 'tab'){
                removeItem(name, tabs);
            }
            else{
                removeItem(name, tabs, 'tabs');
                removeItem(name, files, 'files');
            }
        });
    }

    // Add tabs and project files on start
    function addTabsOnInit(){
        if(tabs.length !== 0){
            previousTab = tabs[0][0];
        }

        var parent = $(".editor--code .editor__canvas");
        
        // Add the tabs layout and loop through Tabs array
        var tTabs = $('<div id="tabs" class="tabs-container">\n').appendTo(parent);
        // populate tabs row
        for (var i = 0; i < tabs.length; i++)
        {
            tabHtml = createTabHTML(tabs[i][0]);
            $(tabHtml).appendTo(".tabs-container");
        }

        // Add the files layout and loop through Files array
        var pf = $('<div class="projectFiles">\n').html('Files').prependTo(tTabs);
        var file = $('<ul id="files" class="files-container">\n').appendTo(pf);
        // populate files menu
        for (var j = 0; j < files.length; j++)
        {
            fileHtml = createFileHTML(files[j][0]);
            $(fileHtml).appendTo(".files-container");
        }
        $('</ul>\n').appendTo(file);
        $('</div></div>').appendTo(parent);
    }

    function saveItems(){
        var index = findItemInArray(tabs, previousTab);
        var indexFile = findItemInArray(files, previousTab);

        if (!Espruino.Core.Code.isInBlockly()) {
            tabs[index][1] = Espruino.Core.EditorJavaScript.getCodeMirror().getValue();
            files[indexFile][1] = Espruino.Core.EditorJavaScript.getCodeMirror().getValue();
        } else {
            tabs[index][1] = Espruino.Core.EditorBlockly.getXML();
            files[index][1] = Espruino.Core.EditorBlockly.getXML();
        }
        setTabStorage();
        setFileStorage();
    }

    // Check if file is already opened
    function isItemInArray(array, item) {
        for (var i = 0; i < array.length; i++) {
            if (array[i][0] === item) {
                return true;
            }
        }
    }

    // Check if file is already opened and return index
    function findItemInArray(array, item) {
        for (var index = 0; index < array.length; index++) {
            if (array[index][0] === item) {
                return index;
            }
        }
    }

    // Remove item
    function removeItem(item, array){
        for (var i = 0; i < array.length; i++) {
            // Check which item to remove
            if (array[i][0] === item) {
                // Remove item from array
                array.splice(i, 1);

                if (array === files) {
                    // Remove file from visible items
                    document.getElementById('files').removeChild(document.getElementById('fullFile' + item));
                    setFileStorage();
                }

                // Remove tab from visible items
                document.getElementById('tabs').removeChild(document.getElementById('fullTab' + item));
                setTabStorage();
            }
        }
    }

    // Open code in editor
    function openCode(tab){
        var index = findItemInArray(tabs, previousTab);
        var indexFile = findItemInArray(files, previousTab);

        // Check if js or xml file
        if (previousTab.split('.').pop() === 'js') {
            code = Espruino.Core.EditorJavaScript.getCodeMirror().getValue();
        } else {
            code = Espruino.Core.EditorBlockly.getXML();
        }

        // Check if tab is inactive
        if (!isActive(tab)){

            console.log(index);

            if (index !== undefined) {
                if(tabs[index][1] !== code) {
                    console.log("works");
                    tabs[index][1] = code;
                    files[indexFile][1] = code;
                    setTabStorage();
                    setFileStorage();
                }
            } else {
                index = 0;
            }

            for (var i = 0; i < tabs.length; i++) {
                // Check which tab to set code
                if (tabs[i][0] === tab) {
                    if (tab.split('.').pop() === 'js') {
                        Espruino.Core.Code.switchToCode();
                        Espruino.Core.EditorJavaScript.setCode(tabs[i][1]);
                    } else {
                        Espruino.Core.Code.switchToBlockly();
                        Espruino.Core.EditorBlockly.setXML(tabs[i][1]);
                    }
                    break;
                }
            }
            // Set the right tab active
            setActive(tab);
            previousTab = tab;
        }
    }

    // Tab set active logic
    function setActive(tab){
        // Get all elements with class="tablinks" and remove the class "active"
        var previousElement = $('.tablinks.active');
        $('.tablinks').removeClass('active');
        var element = $('.tablinks').find('.tab[data-name="' + tab + '"]');
        // Check if element isn't null
        if (element.exists()) {
            element.parent().addClass("active");
        } else {
            previousElement.parent().addClass("active");
        }
    }

    // Check if tab is already active
    function isActive(tab) {
        var tablinks = document.getElementsByClassName("tablinks");

        if (tablinks[findItemInArray(tabs, tab)] !== undefined) {
            if (tablinks[findItemInArray(tabs, tab)].className === "tablinks active") {
                return true;
            }
        } else {
            return false;
        }
    }

    // Adding tab to Storage and add it to the bar
    function setTabsArray(fileName, code){
        console.log("setTabsArray");

        if (!isItemInArray(tabs, fileName)) {

            tabs.push([fileName, code]);

            // Check if the file isn't already in the Files array
            if(!isItemInArray(files, fileName)) {
                files.push([fileName, code]);

                fileHtml = createFileHTML(fileName);
                $(fileHtml).appendTo(".files-container");
            }

            tabHtml = createTabHTML(fileName);
            $(tabHtml).appendTo(".tabs-container");

            addHandlers();
            openCode(fileName);

            setTabStorage();
            setFileStorage();
        }
    }

    function setTabStorage(){
        // Save tabs in Storage
        chrome.storage.sync.set({'tabs': tabs}, function() {
            console.log(tabs);
        });
    }

    function setFileStorage(){
        // Save files in Storage
        chrome.storage.sync.set({'files': files}, function() {
            console.log(files);
        });
    }

    // Add tab to bar
    function addToTabs(tab) {
        var index;
        if (!isItemInArray(tabs, tab)) {
            for (var i = 0; i < files.length; i++) {
                if (files[i][0] === tab) {
                    index = i;
                }
            }
            setTabsArray(files[index][0], files[index][1]);
        }
        openCode(tab);
    }

    function setCurrentFileName(filename) {
        if (Espruino.Core.Code.isInBlockly()) {
            currentXMLFileName = filename;
        } else {
            currentJSFileName = filename;
        }
    }

    /**  Handle newline conversions - Windows expects newlines as /r/n when we're saving/loading files */
    function convertFromOS(chars) {
        if (!Espruino.Core.Utils.isWindows()) return chars;
        return chars.replace(/\r\n/g, "\n");
    }

    /**  Handle newline conversions - Windows expects newlines as /r/n when we're saving/loading files */
    function convertToOS(chars) {
        if (!Espruino.Core.Utils.isWindows()) return chars;
        return chars.replace(/\r\n/g, "\n").replace(/\n/g, "\r\n");
    }


    function loadFile(callback, filename) {
        if (chrome.fileSystem) {
            // Chrome Web App / NW.js
            chrome.fileSystem.chooseEntry({type: 'openFile', suggestedName: filename}, function (fileEntry) {
                if (!fileEntry) return;
                if (fileEntry.name) setCurrentFileName(fileEntry.name);

                fileEntry.file(function (file) {
                    var reader = new FileReader();
                    reader.onload = function (e) {
                        callback(convertFromOS(e.target.result));
                        // Get the name and code of the file and add it to the Tabs array
                        setTabsArray(fileEntry.name, e.target.result);
                        openCode(fileEntry.name);
                    };
                    reader.onerror = function () {
                        Espruino.Core.Notifications.error("Error Loading", true);
                    };
                    reader.readAsText(file);
                });
            });
        } else {
            Espruino.Core.Utils.fileOpenDialog("code", "text", function (data) {
                callback(convertFromOS(data));
            });
        }
    }

    function saveFile(data, filename) {
        //saveAs(new Blob([convertToOS(data)], { type: "text/plain" }), filename); // using FileSaver.min.js

        function errorHandler() {
            Espruino.Core.Notifications.error("Error Saving", true);
        }

        if (chrome.fileSystem) {
            // Chrome Web App / NW.js
            chrome.fileSystem.chooseEntry({type: 'saveFile', suggestedName: filename}, function (writableFileEntry) {
                if (writableFileEntry.name)
                    setCurrentFileName(writableFileEntry.name);
                writableFileEntry.createWriter(function (writer) {
                    var blob = new Blob([convertToOS(data)], {type: "text/plain"});
                    writer.onerror = errorHandler;
                    // when truncation has finished, write
                    writer.onwriteend = function (e) {
                        writer.onwriteend = function (e) {
                            console.log('FileWriter: complete');
                        };
                        console.log('FileWriter: writing');
                        writer.write(blob);
                    };
                    // truncate
                    console.log('FileWriter: truncating');
                    writer.truncate(blob.size);
                }, errorHandler);
            });
        } else {
            var a = document.createElement("a"),
                file = new Blob([data], {type: "text/plain"});
            var url = URL.createObjectURL(file);
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            setTimeout(function () {
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
            }, 0);
        }
    }

    /* private functions */
    function createFileHTML(fileName){
        return  '<li id="fullFile' + fileName + '">' +
                '<div class="tablinks">' +
                '<span class="file" data-name="' + fileName + '" title="' + fileName + '">' + fileName + '</span>' +
                '<span class="closeButton" data-type="file" data-name="' + fileName + '">x</span>' +
                '</div>' +
                '</li>\n';
    }
    
    function createTabHTML(fileName){
        return  '<div id="fullTab' + fileName + '" class="tablinks">' +
                '<span class="tab" data-name="' + fileName + '" title="' + fileName + '">' + fileName + '</span>' +
                '<span class="closeButton" data-type="tab" data-name="' + fileName + '">x</span>' +
                '</div>\n';
    }
    
    Espruino.Core.File = {
        init: init,
        setTabsArray : setTabsArray,
        removeItem : removeItem,
        setActive : setActive
    };
}());
