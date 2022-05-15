class DomController {

    constructor(sketch) {
        this.sk = sketch;
    }

    updateColorMode() {
        this.updateColorModeLabel();
        this.sk.sketchController.toggleIsPathColorMode();
        this.toggleColorChangeButtons();
        this.updateAllCheckboxes();
    }

    resetColorMode() {
        document.getElementById('sub-tab8-1').checked = false; // reset color code button
        this.updateColorModeLabel();
        this.sk.domController.toggleColorChangeButtons();
    }

    updateColorModeLabel() {
        const element = document.getElementById('sub-tab8-1');
        if (element.checked) element.labels[0].innerHTML = 'Color By Paths';
        else element.labels[0].innerHTML = 'Color By Codes';
    }

    /**
     * Resets text, display and checked properties for each color change button
     * NOTE: .labels returns nodeList so access first element to update label for each input
     */
    toggleColorChangeButtons() {
        const elementList = document.querySelectorAll(".js-color-change"); // get all input elements for each button
        elementList.forEach(function (element) {
            element.checked = false; // reset input element checked value
            element.labels[0].innerHTML = 'Change Color'; // reset text for label of input
            if (element.labels[0].style.display === 'none') { // toggle display
                element.labels[0].style.display = 'block';
                element.labels[0].style.cssFloat = 'right';
            } else {
                element.labels[0].style.display = 'none';
            }
        });
    }

    updateCheckboxes(subTab) {
        switch (subTab) {
            case "movement":
                this.clearCheckboxes("sub-tab1-1", "checkbox-movement");
                for (const coreDataItem of this.sk.core.pathList) this.createCheckbox(coreDataItem, "movement-main-tab", "checkbox-movement");
                break;
            case "talk":
                this.clearCheckboxes("sub-tab3-3", "checkbox-conversation");
                for (const coreDataItem of this.sk.core.speakerList) this.createCheckbox(coreDataItem, "talk-main-tab", "checkbox-conversation");
                break;
            case "codes":
                this.clearCheckboxes("sub-tab8-2", "checkbox-code");
                for (const coreDataItem of this.sk.core.codeList) this.createCheckbox(coreDataItem, "codes-main-tab", "checkbox-code");
                break;
        }
    }

    // TODO: consider updating checkboxClass name
    updateColorPickers(subTab) {
        switch (subTab) {
            case "movement":
                this.clearColorPickers("sub-tab1-1", "checkbox-movement");
                for (const coreDataItem of this.sk.core.pathList) this.createColorPicker(coreDataItem, "movement-main-tab", "checkbox-movement");
                break;
            case "talk":
                this.clearColorPickers("sub-tab3-3", "checkbox-conversation");
                for (const coreDataItem of this.sk.core.speakerList) this.createColorPicker(coreDataItem, "talk-main-tab", "checkbox-conversation");
                break;
            case "codes":
                this.clearColorPickers("sub-tab8-2", "checkbox-code");
                for (const coreDataItem of this.sk.core.codeList) this.createColorPicker(coreDataItem, "codes-main-tab", "checkbox-code");
                break;
        }
    }

    updateAllCheckboxes() {
        this.updateCheckboxes("movement");
        this.updateCheckboxes("talk");
        this.updateCheckboxes("codes");
    }

    clearAllCheckboxes() {
        this.clearCheckboxes("sub-tab1-1", "checkbox-movement");
        this.clearCheckboxes("sub-tab3-3", "checkbox-conversation");
        this.clearCheckboxes("sub-tab8-2", "checkbox-code");
    }

    clearCheckboxes(inputID, checkboxClass) {
        const element = document.getElementById(inputID);
        element.checked = false; // reset input checkbox checked attribute
        element.labels[0].innerHTML = 'Change Color'; // reset text for label of input
        this.removeAllElements(checkboxClass);
    }

    clearColorPickers(inputID, colorPickerClass) {
        const element = document.getElementById(inputID);
        element.checked = true; // reset input checkbox checked attribute
        element.labels[0].innerHTML = 'Set Color'; // reset text for label of input
        this.removeAllElements(colorPickerClass);
    }

    createSubTabElement(mainTabClass, coreDataItem, checkboxClass, divType) {
        let parent = document.getElementById(mainTabClass); // Get parent tab to append new div and label to
        let label = document.createElement('label'); //  Make label
        let div = document.createElement('input'); // Make checkbox div
        let span = document.createElement('span'); // Make span to hold new checkbox styles
        label.textContent = coreDataItem.name; // set name to text of path
        label.classList.add("tab-checkbox", checkboxClass); // TODO: update
        div.setAttribute("type", divType);
        div.classList.add(checkboxClass);
        label.appendChild(div);
        label.appendChild(span);
        parent.appendChild(label);
        return [div, span];
    }

    createCheckbox(coreDataItem, mainTabClass, checkboxClass) {
        let [div, span] = this.createSubTabElement(mainTabClass, coreDataItem, checkboxClass, "checkbox");
        let curColor;
        if (this.sk.sketchController.getIsPathColorMode()) curColor = coreDataItem.color.pathMode;
        else curColor = coreDataItem.color.codeMode;
        span.classList.add("checkmark", checkboxClass);
        span.style.border = "medium solid" + curColor;
        if (coreDataItem.isShowing) {
            span.style.backgroundColor = curColor;
            div.checked = true;
        } else {
            span.style.backgroundColor = "";
            div.checked = false;
        }
        div.addEventListener('change', () => this.toggleCheckboxAndData(coreDataItem, span));
    }

    toggleCheckboxAndData(coreDataItem, span) {
        coreDataItem.isShowing = !coreDataItem.isShowing; // update isShowing for path
        if (coreDataItem.isShowing) {
            if (this.sk.sketchController.getIsPathColorMode()) span.style.backgroundColor = coreDataItem.color.pathMode;
            else span.style.backgroundColor = coreDataItem.color.codeMode;
        } else span.style.backgroundColor = "";
        this.sk.loop();
    }

    createColorPicker(coreDataItem, mainTabClass, checkboxClass) {
        let [div, span] = this.createSubTabElement(mainTabClass, coreDataItem, checkboxClass, "color");
        if (this.sk.sketchController.getIsPathColorMode()) div.value = coreDataItem.color.pathMode;
        else div.value = coreDataItem.color.codeMode;
        span.classList.add("colorpicker", checkboxClass);
        span.style.border = "medium solid" + div.value;
        span.style.backgroundColor = div.value;
        div.addEventListener('input', () => this.toggleColorPickerAndData(coreDataItem, div, span));
    }

    toggleColorPickerAndData(coreDataItem, div, span) {
        if (this.sk.sketchController.getIsPathColorMode()) coreDataItem.color.pathMode = div.value;
        else {
            // TODO: update code color for all movement points in each path corresponding to code being updated in GUI
            for (const path of this.sk.core.pathList) {
                for (const point of path.movement) {
                    if (point.codes.color === coreDataItem.color.codeMode) point.codes.color = div.value;
                }
            }
            coreDataItem.color.codeMode = div.value; // update codeMode to show properly in GUI
        }
        span.style.backgroundColor = div.value;
        span.style.border = "medium solid" + div.value;
        this.sk.loop();
    }

    removeAllElements(elementId) {
        let elementList = document.querySelectorAll("." + elementId);
        elementList.forEach(function (userItem) {
            userItem.remove();
        });
    }
}