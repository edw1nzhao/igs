export class ParseCodes {

    constructor(sketch, coreUtils) {
        this.sk = sketch;
        this.coreUtils = coreUtils;
        this.parsedFileArray = []; // holds CodeTable objects
    }

    /**
     * Updates parsedFileArray with new codeTable
     * @param  {PapaParse results Array} results
     * @param  {File} file
     */
    processSingleCodeFile(results, file) {
        const codeName = this.coreUtils.cleanFileName(file.name); // remove file extension
        this.parsedFileArray.push(this.createCodeTable(results.data, codeName));
        this.sk.core.updateCodes(codeName);
    }

    /**
     * Handles updating parsedFileArray with for multiCodeFile
     * @param  {PapaParse results Array} results
     */
    processMultiCodeFile(results) {
        this.clear(); // NOTE: clearing all existing code data prevents mixing single and multi code files. You can only have ONE multicode file
        this.updateParsedFileArrayForMultiCodes(results);
        for (const codeTable of this.parsedFileArray) this.sk.core.updateCodes(codeTable.codeName);
    }

    /**
     * For each row, updates either an existing codeTable in parsedFileArray or adds a new codeTable
     * @param  {PapaParse results Array} results
     */
    updateParsedFileArrayForMultiCodes(results) {
        for (const row of results.data) {
            if (this.coreUtils.codeRowForType(row)) { // IMPORTANT: in case there is partial missing data etc. 
                const curCodeName = this.coreUtils.cleanFileName(row[this.coreUtils.headersMultiCodes[0]]);
                let addNewTable = true; // to add new code table if parsedFileArray empty or no name match/existing codeTable NOT updated
                for (const codeTable of this.parsedFileArray) { // test for name match to updated existing codeTable
                    if (codeTable.codeName === curCodeName) {
                        codeTable.parsedCodeArray.push(row); // update matching parsedCodeArray with new row object
                        addNewTable = false;
                        break; // existing codeTable updated so no need to process any other code tables
                    }
                }
                if (addNewTable) this.parsedFileArray.push(this.createCodeTable([row], curCodeName)); // NOTE: make sure row is added as an array
            }
        }
    }

    createCodeTable(resultsDataArray, codeName) {
        return {
            parsedCodeArray: resultsDataArray,
            codeName: codeName
        }
    }

    /** 
     * Invoked when creating point arrays in parseMovement
     * Tests if the current time value is between any start/end code times in all loaded codeTables
     * Returns list of boolean vars indicating if value is within range for all loaded codes and
     * a single color variable, which can be gray if value is not within range for loaded codes or black if within multiple ranges
     * 
     * @param  {Number/Float} curTime
     */
    getCodeData(curTime) {
        const hasCodeArray = [];
        let color = this.sk.core.COLORGRAY;
        for (const curCodeTable of this.parsedFileArray) {
            let hasCode = false;
            for (const curRow of curCodeTable.parsedCodeArray) {
                if (this.coreUtils.codeRowForType(curRow) && this.between(curTime, this.getStartTime(curRow), this.getEndTime(curRow))) {
                    hasCode = true;
                    hasCodeArray.push(true);
                    color = this.getCodeColor(color, this.parsedFileArray.indexOf(curCodeTable));
                    break;
                }
            }
            if (!hasCode) hasCodeArray.push(false);
        }
        return {
            hasCodeArray,
            color
        }
    }

    getCodeColor(color, index) {
        if (color === this.sk.core.COLORGRAY) return this.sk.core.getNextColorInList(index);
        else return 0; // if color already assigned, make it black because there are multiple true codes for same curTime
    }

    getStartTime(row) {
        return row[this.coreUtils.headersSingleCodes[0]];
    }

    getEndTime(row) {
        return row[this.coreUtils.headersSingleCodes[1]];
    }

    between(x, min, max) {
        return x >= min && x <= max;
    }

    clear() {
        this.parsedFileArray = [];
        this.sk.core.clearCodes();
    }
}