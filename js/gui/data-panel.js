class DataPanel {
    /**
     * Data panel consists of a header object and associated tabs object that holds all data/labels for each header
     * Each header/tab has an organize method that handles drawing and mouse handlers/over methods
     * To add another header/tab, update string lists and add organize/draw/over methods
     */
    constructor(sketch, timelineBottom) {
        this.sk = sketch;
        this.xPos = 10;
        this.spacing = this.sk.height / 50;
        this.headers = {
            mode: ["Movement", "Speakers", "Floor Plan", "Select", "Codes"],
            curMode: 0,
            height: timelineBottom,
        }
        this.tabs = {
            height: timelineBottom + this.spacing * 2,
            selectTabs: ["none", "region", "slice", "moving", "stopped"],
            curSelectTab: 0, // matches selectTabs list
            rotateTabs: ["rotate left", "rotate right"]
        }
    }

    /**
     * Passed values allow for dynamic display/updating
     */
    organize(mode, pathList, speakerList, codeList) {
        this.organizeHeaders(mode); // Draws or tests if over headers
        switch (this.headers.curMode) { // Draws or tests if over tabs
            case 0:
                this.organizeList(mode, pathList);
                break;
            case 1:
                this.organizeList(mode, speakerList);
                break;
            case 2:
                this.organizeRotateKeys(mode);
                break;
            case 3:
                this.organizeSelectors(mode, this.tabs.curSelectTab);
                break;
            case 4:
                this.organizeList(mode, codeList);
                break;
        }
    }

    organizeHeaders(mode) {
        let curXPos = this.xPos;
        for (let i = 0; i < this.headers.mode.length; i++) {
            const pixelWidth = this.sk.textWidth(this.headers.mode[i]) + this.spacing;
            if (mode === this.sk.DRAWGUI) this.drawHeader(curXPos, i);
            else this.overHeader(curXPos, pixelWidth, i);
            curXPos += pixelWidth;
        }
    }

    organizeList(mode, list) {
        let curXPos = this.xPos;
        for (const person of list) {
            if (mode === this.sk.DRAWGUI) this.drawPerson(person, curXPos);
            else this.overPerson(person, curXPos);
            curXPos += (2 * this.spacing) + this.sk.textWidth(person.name);
        }
    }

    organizeSelectors(mode) {
        let curXPos = this.xPos;
        for (let i = 0; i < this.tabs.selectTabs.length; i++) {
            const pixelWidth = this.sk.textWidth(this.tabs.selectTabs[i]) + this.spacing;
            if (mode === this.sk.DRAWGUI) this.drawSelector(curXPos, this.tabs.curSelectTab, i);
            else this.overSelector(curXPos, pixelWidth, i);
            curXPos += pixelWidth;
        }
    }

    organizeRotateKeys(mode) {
        let curXPos = this.xPos;
        for (const direction of this.tabs.rotateTabs) {
            const pixelWidth = this.sk.textWidth(direction) + this.spacing;
            if (mode === this.sk.DRAWGUI) this.drawRotateKey(direction, curXPos);
            else this.overRotateKey(direction, curXPos, pixelWidth);
            curXPos += pixelWidth;
        }
    }

    drawHeader(xPos, header) {
        this.sk.noStroke();
        if (this.headers.curMode === header) this.sk.fill(0);
        else this.sk.fill(150);
        this.sk.text(this.headers.mode[header], xPos, this.headers.height);
    }

    drawPerson(person, curXPos) {
        this.sk.strokeWeight(5);
        this.sk.stroke(person.color);
        this.sk.noFill();
        this.sk.rect(curXPos, this.tabs.height, this.spacing, this.spacing);
        if (person.isShowing) {
            this.sk.fill(person.color);
            this.sk.rect(curXPos, this.tabs.height, this.spacing, this.spacing);
        }
        this.sk.fill(0);
        this.sk.noStroke();
        this.sk.text(person.name, curXPos + 1.3 * this.spacing, this.tabs.height - 5);
    }

    drawSelector(curXPos, curSelectTab, tab) {
        if (curSelectTab === tab) this.sk.fill(0);
        else this.sk.fill(150);
        this.sk.text(this.tabs.selectTabs[tab], curXPos, this.tabs.height);
    }

    drawRotateKey(direction, curXPos) {
        this.sk.noStroke();
        this.sk.fill(0);
        this.sk.text(direction, curXPos, this.tabs.height);
    }

    overHeader(xPos, pixelWidth, header) {
        if (this.sk.overRect(xPos, this.headers.height, xPos + pixelWidth, this.spacing)) this.headers.curMode = header;
    }

    overPerson(person, curXPos) {
        if (this.sk.overRect(curXPos, this.tabs.height, this.spacing, this.spacing)) this.sk.sketchController.setCoreData(person);
    }

    overSelector(curXPos, pixelWidth, tab) {
        if (this.sk.overRect(curXPos, this.tabs.height, curXPos + pixelWidth, this.spacing)) this.tabs.curSelectTab = tab;
    }

    overRotateKey(direction, curXPos, pixelWidth) {
        if (this.sk.overRect(curXPos, this.tabs.height, curXPos + pixelWidth, this.spacing)) {
            if (direction === this.tabs.rotateTabs[0]) this.sk.sketchController.setRotateLeft();
            else this.sk.sketchController.setRotateRight();
        }
    }

    getCurSelectTab() {
        return this.tabs.curSelectTab;
    }
}