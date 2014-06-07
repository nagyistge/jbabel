
/*jslint browser: true, node: true */
/*global $, bind, PAPAYA_MENU_HOVERING_CSS, PAPAYA_MENU_UNSELECTABLE, PAPAYA_MENU_COLORTABLE_CSS */

"use strict";

var papaya = papaya || {};
papaya.ui = papaya.ui || {};



papaya.ui.MenuItemCheckBox = papaya.ui.MenuItemCheckBox || function (viewer, label, action, callback, dataSource, method,
                                                                     modifier) {
    this.viewer = viewer;
    this.label = label;

    this.modifier = "";
    if ((modifier !== undefined) && (modifier !== null)) {
        this.modifier = "-" + modifier;
    }

    this.action = action + this.modifier;
    this.method = method;
    this.id = this.action.replace(/ /g, "_").replace(/\(/g, "").replace(/\)/g, "") + this.viewer.container.containerIndex;
    this.callback = callback;
    this.dataSource = dataSource;
};



papaya.ui.MenuItemCheckBox.CHECKBOX_UNSELECTED_CODE = "&#9744;";
papaya.ui.MenuItemCheckBox.CHECKBOX_SELECTED_CODE = "&#9745;";



papaya.ui.MenuItemCheckBox.prototype.buildHTML = function (parentId) {
    var selected, checked, html, thisHtml;

    selected = this.dataSource[this.method](this.label);
    checked = "";

    if (selected) {
        checked = "checked='checked'";
    }

    html = "<li id='" + this.id + "'><input type='radio' class='" + PAPAYA_MENU_COLORTABLE_CSS + "' name='" + PAPAYA_MENU_COLORTABLE_CSS + "' id='" + this.id
        + "' value='" + this.id  + "' " + checked + "><span class='" + PAPAYA_MENU_UNSELECTABLE + "'>&nbsp;" + this.label + "</span></li>";
    $("#" + parentId).append(html);
    thisHtml = $("#" + this.id);
    thisHtml.click(bind(this, this.doAction));
    thisHtml.hover(function () { $(this).toggleClass(PAPAYA_MENU_HOVERING_CSS); });
};



papaya.ui.MenuItemCheckBox.prototype.doAction = function () {
    $("." + PAPAYA_MENU_COLORTABLE_CSS).removeAttr('checked');
    $("#" + this.id + " > input")[0].checked = true;
    this.callback(this.action, null, true);
};
