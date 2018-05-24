/**
 Copyright 2014 Gordon Williams (gw@pur3.co.uk)

 This Source Code is subject to the terms of the Mozilla Public
 License, v2.0. If a copy of the MPL was not distributed with this
 file, You can obtain one at http://mozilla.org/MPL/2.0/.

 ------------------------------------------------------------------
 Handling the getting and setting of code
 ------------------------------------------------------------------
 **/
"use strict";
(function () {

    /*
    // Set tabs for testing
    var files = [
        ["code.js", "var  on = false;\nsetInterval(function() {\n  on = !on;\n  LED1.write(on);\n}, 500);"],
        ["test.js", "var  on = true;\nsetInterval(function() {\n  on = !on;\n  LED1.write(on);\n}, 500);"],
        ["robot.js", ""],
        ["penguin.js", ""],
        ["idk.js", ""],
        ["whatever.js", ""]
    ];

    chrome.storage.sync.set({'tabs': files}, function() {
        console.log('Set tabs');
    });
    */

    // Getting tabs from Storage
    var tabs = [];
    var files = [];
    chrome.storage.sync.get('tabs', function(data) {
        tabs = data.tabs;
    });

    chrome.storage.sync.get('files', function(data) {
        files = data.files;
    });

    // Popup
    var popup, html;

    function init() {
        // Configuration
        Espruino.Core.Config.add("AUTO_SAVE_CODE", {
            section: "Communications",
            name: "Auto Save",
            description: "Save code to Chrome's cloud storage when clicking 'Send to Espruino'?",
            type: "boolean",
            defaultValue: true
        });

        // Setup add JavaScript file button
        Espruino.Core.App.addIcon({
            id: "codeAdd",
            icon: "addJS",
            title: "Add new JavaScript file",
            order: 0,
            area: {
                name: "code",
                position: "bottom"
            },
            click: function () {
                var name = "JavaScript";
                var code = "";
                var extension = "js";
                addNewFilePopup(name, code, extension);
            }
        });

        // Setup add Blockly file button
        Espruino.Core.App.addIcon({
            id: "blockAdd",
            icon: "addXML",
            title: "Add new Blockly file",
            order: 100,
            area: {
                name: "code",
                position: "bottom"
            },
            click: function () {
                var name = "Blockly";
                var code = '<xml xmlns="http://www.w3.org/1999/xhtml"></xml>';
                var extension = "xml";
                addNewFilePopup(name, code, extension);
            }
        });

        // get code from our config area at bootup
        Espruino.addProcessor("initialised", function (data, callback) {
            var code;
            if (Espruino.Config.CODE) {
                code = Espruino.Config.CODE;
                console.log("Loaded code from storage.");
            } else if(tabs.length != 0){
                code = tabs[0][1];
                console.log("No code in storage. Try to load from tabs");
            }else{
                code = "var  on = false;\nsetInterval(function() {\n  on = !on;\n  LED1.write(on);\n}, 500);";
                console.log("No code anywhere. Use dummy default code.");
            }
            Espruino.Core.EditorJavaScript.setCode(code);
            callback(data);
        });

        Espruino.addProcessor("sending", function (data, callback) {
            if (Espruino.Config.AUTO_SAVE_CODE)
                Espruino.Config.set("CODE", Espruino.Core.EditorJavaScript.getCode()); // save the code
            callback(data);
        });
    }

    // Open popup to name new file
    function addNewFilePopup(name, code, extension) {
        var fileName;
        html =
            '<div class="addNewFile">' +
            '<input id="name' + name + 'File" type="text" />' +
            '<button id="add' + name + 'File">Add ' + name + ' file</button>' +
            '</div>';

        // Initializing popup
        popup = Espruino.Core.App.openPopup({
            title: "Open new " + name + " file",
            contents: html,
            position: "center"
        });

        // Add onClick logic to add file and close popup
        document.getElementById("add" + name + "File").addEventListener('click', function() {
            fileName = document.getElementById("name" + name + "File").value.toLowerCase();

            if (fileName.split('.').pop().toLowerCase() !== extension) {
                fileName = fileName.split('.')[0].toLowerCase() + "." + extension;
            }

            // file.js function
            Espruino.Core.File.setTabsArray(fileName, code);
            popup.close();
            console.log(fileName);
        });
    }

    function isInBlockly() { // TODO: we should really enumerate views - we might want another view?
        return $("#divblockly").is(":visible");
    }

    function switchToBlockly() {
        $("#divcode").hide();
        $("#divblockly").show();
        // Hack around issues Blockly have if we initialise when the window isn't visible
        Espruino.Core.EditorBlockly.setVisible();
    }

    function switchToCode() {
        $("#divblockly").hide();
        $("#divcode").show();
    }

    function getEspruinoCode(callback) {
        Espruino.callProcessor("transformForEspruino", getCurrentCode(), callback);
    }

    function getCurrentCode() {
        if (isInBlockly()) {
            return Espruino.Core.EditorBlockly.getCode();
        } else {
            return Espruino.Core.EditorJavaScript.getCode();
        }
    }

    Espruino.Core.Code = {
        init: init,
        getEspruinoCode: getEspruinoCode, // get the currently selected bit of code ready to send to Espruino (including Modules)
        getCurrentCode: getCurrentCode, // get the currently selected bit of code (either blockly or javascript editor)
        isInBlockly: isInBlockly,
        switchToCode: switchToCode,
        switchToBlockly: switchToBlockly
    };
}());
